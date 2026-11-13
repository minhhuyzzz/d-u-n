/* gmaps-adapter.js
 * Dùng Google Maps (vệ tinh) làm bản đồ nền, giữ nguyên các lời gọi kiểu MapLibre
 * (Map, Marker, Popup, LngLatBounds…) có sẵn trong ban-do.html và index.html.
 * Cấu hình trước khi nạp file này:
 *   window.GMAPS_KEY   = 'khóa Google Maps JavaScript API';
 *   window.GMAPS_MAPID = 'Map ID vector của bạn' (tùy chọn, mặc định DEMO_MAP_ID)
 */
(function () {
  var KEY = window.GMAPS_KEY || '', MAPID = window.GMAPS_MAPID || 'DEMO_MAP_ID';
  document.write('<script src="https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(KEY) + '&v=weekly&language=vi&region=VN"><\/script>');
  window.gm_authFailure = function () {
    document.querySelectorAll('#map,#homeMap,#tlMap').forEach(function (e) {
      e.insertAdjacentHTML('afterbegin', '<div style="position:absolute;z-index:9;left:12px;right:12px;top:12px;padding:10px 14px;background:#fff3cd;color:#5c3b00;border-radius:10px;font:600 .85rem system-ui">Google Maps chưa hoạt động: kiểm tra khóa API (GMAPS_KEY), bật Maps JavaScript API và thanh toán.</div>');
    });
  };

  var ll = function (v) { return Array.isArray(v) ? { lng: v[0], lat: v[1] } : { lng: v.lng != null ? v.lng : v.lon, lat: v.lat }; };
  var RM = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var OVC;
  function overlay(g, el, pane, pos) {
    if (!OVC) { OVC = function () {}; OVC.prototype = new google.maps.OverlayView(); }
    var o = new OVC();
    o.onAdd = function () { this.getPanes()[pane].appendChild(el); };
    o.onRemove = function () { el.remove(); };
    o.draw = function () { var p = this.getProjection(); if (p) pos(p); };
    o.setMap(g); return o;
  }
  function px(pr, p) { return pr.fromLatLngToDivPixel(new google.maps.LatLng(p.lat, p.lng)); }

  function LB() { this.p = []; }
  LB.prototype.extend = function (v) { if (v instanceof LB) this.p = this.p.concat(v.p); else this.p.push(ll(v)); return this; };
  LB.prototype.isEmpty = function () { return !this.p.length; };
  function toB(b) {
    var g = new google.maps.LatLngBounds();
    if (b instanceof LB) b.p.forEach(function (p) { g.extend(p); });
    else b.forEach(function (v) { g.extend(ll(v)); });
    return g;
  }

  function Map(o) {
    if (!window.google || !google.maps) throw new Error('Google Maps chưa tải được');
    var self = this, el = typeof o.container === 'string' ? document.getElementById(o.container) : o.container;
    this.el = el; this.ev = {}; this.src = {}; this.layers = { 'building-3d': 1 }; this.loaded = false;
    var types = ['roadmap', 'satellite', 'hybrid', 'terrain'];
    var c = o.center ? ll(o.center) : { lat: 10.8447, lng: 106.6829 };
    this.g = new google.maps.Map(el, {
      center: c, zoom: o.zoom || 14, mapId: MAPID,
      mapTypeId: types.indexOf(o.style) >= 0 ? o.style : 'satellite',
      minZoom: o.minZoom, maxZoom: o.maxZoom, clickableIcons: false,
      gestureHandling: o.cooperativeGestures ? 'cooperative' : 'greedy',
      mapTypeControl: !document.getElementById('basemap'), streetViewControl: true, fullscreenControl: true, rotateControl: true
    });
    if (o.bounds) this.fitBounds(o.bounds, o.fitBoundsOptions || {});
    google.maps.event.addListenerOnce(this.g, 'idle', function () { self.loaded = true; self.fire('load'); self.fire('style.load'); });
  }
  var P = Map.prototype;
  P.fire = function (t, e) { (this.ev[t] || []).forEach(function (f) { f(e || {}); }); };
  P.on = function (t, a, b) {
    var self = this, layer = typeof a === 'string' ? a : null, fn = layer ? b : a, g = this.g;
    if (layer) {
      var map = { click: 'click', mouseenter: 'mouseover', mouseleave: 'mouseout' }[t];
      if (map) g.data.addListener(map, function (e) {
        var props = {}; e.feature.forEachProperty(function (v, k) { props[k] = v; });
        fn({ features: [{ properties: props }], lngLat: { lng: e.latLng.lng(), lat: e.latLng.lat() } });
      });
    } else if (t === 'mousedown' || t === 'touchstart' || t === 'wheel') {
      this.el.addEventListener(t, fn, { passive: true });
    } else if (t === 'click') {
      g.addListener('click', function (e) { fn({ lngLat: { lng: e.latLng.lng(), lat: e.latLng.lat() } }); });
    } else if (t === 'load' || t === 'style.load') {
      (this.ev[t] = this.ev[t] || []).push(fn);
      if (this.loaded) setTimeout(function () { fn({}); }, 0);
    }
    return this;
  };
  P.addControl = function () { return this; };
  P.getContainer = function () { return this.el; };
  P.getCanvas = function () { var g = this.g; return { style: { set cursor(v) { g.setOptions({ draggableCursor: v || null }); } } }; };
  P.resize = function () { google.maps.event.trigger(this.g, 'resize'); };
  P.getCenter = function () { var c = this.g.getCenter(); return { lng: c.lng(), lat: c.lat() }; };
  P.getBearing = function () { return this.g.getHeading() || 0; };
  P.getPitch = function () { return this.g.getTilt() || 0; };
  P.setBearing = function (b) { this.g.setHeading(b); };
  P.setStyle = function (s) { this.g.setMapTypeId(s); var self = this; setTimeout(function () { self.fire('style.load'); }, 0); };
  /* lớp dữ liệu (tuyến đường) → Google Data layer */
  P.addSource = function (id, s) {
    var g = this.g;
    if (s.type !== 'geojson') { this.src[id] = { setData: function () {} }; return; }
    var set = function (d) { g.data.forEach(function (f) { g.data.remove(f); }); if (d && d.features && d.features.length) g.data.addGeoJson(d); };
    set(s.data); this.src[id] = { setData: set };
  };
  P.getSource = function (id) { return this.src[id]; };
  P.addLayer = function (l) {
    this.layers[l.id] = 1;
    if (l.id === 'st-line') this.g.data.setStyle(function (f) { return { strokeColor: f.getProperty('color') || '#d32f2f', strokeWeight: 6, strokeOpacity: .95, clickable: true }; });
  };
  P.getLayer = function (id) { return !!this.layers[id]; };
  P.setLayoutProperty = function () {};
  P.fitBounds = function (b, o) {
    o = o || {}; var g = this.g, mz = o.maxZoom;
    g.fitBounds(toB(b), o.padding != null ? o.padding : 0);
    if (mz) google.maps.event.addListenerOnce(g, 'bounds_changed', function () { if (g.getZoom() > mz) g.setZoom(mz); });
  };
  P.jumpTo = function (o) { o.duration = 0; this.easeTo(o); };
  P.flyTo = function (o) { this.easeTo(o); };
  P.easeTo = function (o) {
    var g = this.g, c0 = g.getCenter(), self = this;
    var s = { la: c0.lat(), lo: c0.lng(), z: g.getZoom(), t: g.getTilt() || 0, h: g.getHeading() || 0 };
    var c = o.center ? ll(o.center) : { lat: s.la, lng: s.lo };
    var e = { la: c.lat, lo: c.lng, z: o.zoom != null ? o.zoom : s.z, t: o.pitch != null ? Math.min(o.pitch, 67.5) : s.t, h: o.bearing != null ? o.bearing : s.h };
    var d = RM() ? 0 : (o.duration || 0), t0 = performance.now();
    cancelAnimationFrame(this.raf);
    (function step(now) {
      var k = d ? Math.min((now - t0) / d, 1) : 1, f = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      var cam = { center: { lat: s.la + (e.la - s.la) * f, lng: s.lo + (e.lo - s.lo) * f }, zoom: s.z + (e.z - s.z) * f, tilt: s.t + (e.t - s.t) * f, heading: s.h + (e.h - s.h) * f };
      if (g.moveCamera) g.moveCamera(cam); else { g.setCenter(cam.center); g.setZoom(cam.zoom); }
      if (k < 1) self.raf = requestAnimationFrame(step);
    })(t0);
  };

  function Marker(o) {
    this.el = o.element; this.anchor = o.anchor || 'center'; this.p = null; this.pop = null;
    this.w = document.createElement('div'); this.w.style.cssText = 'position:absolute;left:0;top:0;will-change:transform';
    this.w.appendChild(this.el);
  }
  Marker.prototype.setLngLat = function (v) { this.p = ll(v); if (this.ov) this.ov.draw(); return this; };
  Marker.prototype.getLngLat = function () { return this.p; };
  Marker.prototype.getElement = function () { return this.el; };
  Marker.prototype.setPopup = function (p) {
    var self = this; this.pop = p;
    if (!this._c) { this._c = 1; this.el.addEventListener('click', function () { if (self.pop) { if (self.pop.isOpen()) self.pop.remove(); else self.pop.setLngLat(self.p).addTo(self.map); } }); }
    return this;
  };
  Marker.prototype.addTo = function (m) {
    var self = this; this.map = m;
    this.ov = overlay(m.g, this.w, 'overlayMouseTarget', function (pr) {
      var q = px(pr, self.p); self.w.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px) translate(-50%,' + (self.anchor === 'bottom' ? '-100%' : '-50%') + ')';
    });
    return this;
  };
  Marker.prototype.remove = function () { if (this.ov) { this.ov.setMap(null); this.ov = null; } return this; };

  function Popup(o) {
    o = this.o = o || {}; this.ev = {}; this.p = null; this.off = typeof o.offset === 'number' ? o.offset : 0;
    this.root = document.createElement('div');
    this.root.className = 'maplibregl-popup maplibregl-popup-anchor-bottom ' + (o.className || '');
    this.root.style.cssText = 'position:absolute;left:0;top:0;max-width:' + (o.maxWidth || '240px');
    this.tip = document.createElement('div'); this.tip.className = 'maplibregl-popup-tip';
    this.content = document.createElement('div'); this.content.className = 'maplibregl-popup-content';
    this.root.appendChild(this.tip); this.root.appendChild(this.content);
    if (o.closeButton !== false) {
      var self = this; this.cb = document.createElement('button');
      this.cb.type = 'button'; this.cb.className = 'maplibregl-popup-close-button'; this.cb.setAttribute('aria-label', 'Đóng'); this.cb.innerHTML = '&times;';
      this.cb.addEventListener('click', function () { self.remove(); });
    }
  }
  Popup.prototype.on = function (t, f) { (this.ev[t] = this.ev[t] || []).push(f); return this; };
  Popup.prototype.fire = function (t) { (this.ev[t] || []).forEach(function (f) { f({}); }); };
  Popup.prototype.setHTML = function (h) { this.content.innerHTML = h; if (this.cb) this.content.appendChild(this.cb); return this; };
  Popup.prototype.setDOMContent = function (n) { this.content.innerHTML = ''; this.content.appendChild(n); if (this.cb) this.content.appendChild(this.cb); return this; };
  Popup.prototype.setLngLat = function (v) { this.p = ll(v); if (this.ov) this.ov.draw(); return this; };
  Popup.prototype.isOpen = function () { return !!this.ov; };
  Popup.prototype.addTo = function (m) {
    var self = this; if (this.ov) this.remove();
    this.map = m;
    this.ov = overlay(m.g, this.root, 'floatPane', function (pr) {
      var q = px(pr, self.p); self.root.style.transform = 'translate(-50%,-100%) translate(' + q.x + 'px,' + (q.y - self.off) + 'px)';
    });
    if (this.o.closeOnClick !== false) this.cl = m.g.addListener('click', function () { self.remove(); });
    this.fire('open'); return this;
  };
  Popup.prototype.remove = function () {
    if (!this.ov) return this;
    this.ov.setMap(null); this.ov = null; if (this.cl) { this.cl.remove(); this.cl = null; }
    this.fire('close'); return this;
  };

  var Ctl = function () {};
  window.maplibregl = { Map: Map, Marker: Marker, Popup: Popup, LngLatBounds: LB, NavigationControl: Ctl, FullscreenControl: Ctl, GeolocateControl: Ctl, ScaleControl: Ctl };
})();
