/* DẤU ẤN – Module "Đường phố danh nhân". Chạy sau ban-do.html, dùng lại biến toàn cục map, $, esc. */
(function () {
  var D = window.DAUAN || {FIGURES: [], STREETS: []}, HCM = '10.60,106.55,10.95,106.85';
  var COLOR = '#1f6f6b', geo = {type: 'FeatureCollection', features: []}, info = {}, imgCache = {}, selSid = '', pick = {type: 'FeatureCollection', features: []}, bound = false;
  var byId = function (arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; };
  var plain = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };

  // ---- Giao diện (CSS riêng, dùng biến màu của website) ----
  var st = document.createElement('style');
  st.textContent = '.dn-box{margin-bottom:6px}.dn-grp{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-weight:700;margin:12px 0 6px}.dn-more{font-size:.8rem;color:var(--muted);margin:6px 2px}.dn-search{width:100%;font-size:.76rem;text-overflow:ellipsis;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:999px;padding:10px 14px;font-family:inherit;margin-bottom:8px}.dn-search:focus{outline:2px solid var(--gold)}' +
    '.dn-panel{position:absolute;top:12px;right:56px;bottom:30px;width:min(380px,calc(100% - 80px));z-index:6;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.3);overflow-y:auto;display:none}.dn-panel.on{display:block}' +
    '.dn-x{position:absolute;right:10px;top:10px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;cursor:pointer;z-index:2}' +
    '.dn-img{height:200px;background:linear-gradient(135deg,#6b1212,#c8962e);display:grid;place-items:center;color:var(--gold-l);font:800 4rem var(--serif);position:relative;overflow:hidden}.dn-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}' +
    '.dn-body{padding:16px 18px 18px}.dn-body h2{font-size:1.3rem;font-weight:800;margin:0 0 2px;color:var(--red)}.dn-body .life{color:var(--gold);font-weight:700;font-size:.85rem;margin-bottom:10px}' +
    '.dn-body h4{font-family:var(--serif);font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin:14px 0 4px}.dn-body p{margin:0;font-size:.9rem}.dn-body small{color:var(--muted)}' +
    '.dn-cred{font-size:.72rem;color:var(--muted);padding:6px 10px;background:var(--surface-2)}.dn-src a{display:block;font-size:.84rem}.dn-badge{display:inline-block;font-size:.7rem;font-weight:700;background:#a02020;color:#fff;border-radius:999px;padding:2px 10px;margin-left:6px}' +
    '@media(max-width:860px){.dn-panel{position:fixed;left:0;right:0;bottom:0;top:auto;width:auto;max-height:70vh;border-radius:16px 16px 0 0;z-index:2000}}';
  document.head.appendChild(st);

  var box = document.createElement('div'); box.className = 'dn-box';
  box.innerHTML = '<input class="dn-search" id="dnQ" type="search" placeholder="Tìm tên đường/địa danh/trận chiến/nhân vật lịch sử" aria-label="Tìm tên đường, địa danh, trận chiến, nhân vật lịch sử" autocomplete="off"><div id="dnList"></div>';
  document.querySelector('.side').insertBefore(box, document.querySelector('.side .sec-t'));
  var panel = document.createElement('div'); panel.className = 'dn-panel'; $('map').parentNode.appendChild(panel);

  // ---- Danh sách + tìm kiếm chung (đường phố, nhân vật, địa danh/di tích, trận chiến/sự kiện) ----
  var MAXG = 8;
  function words(q) { return q.split(/\s+/).filter(Boolean); }
  function hit(text, ws) { var t = plain(text); return ws.every(function (w) { return t.indexOf(w) > -1; }); }
  function rank(name, ws) { var n = plain(name); return ws.every(function (w) { return n.indexOf(w) > -1; }) ? 0 : 1; }
  function itemHTML(attr, color, icon, title, sub, on) {
    return '<button class="item' + (on ? '' : ' off') + '" ' + attr + (on ? '' : ' disabled') + '><span class="ic" style="background:' + color + '"><i class="fas ' + icon + '"></i></span><span><b>' + esc(title) + '</b><small>' + esc(sub) + (on ? '' : ' · chưa có vị trí trên bản đồ') + '</small></span></button>';
  }
  function group(title, rows) {
    if (!rows.length) return '';
    return '<div class="dn-grp">' + title + ' (' + rows.length + ')</div>' + rows.slice(0, MAXG).map(function (r) { return r.html; }).join('') + (rows.length > MAXG ? '<div class="dn-more">Còn ' + (rows.length - MAXG) + ' kết quả khác, hãy nhập thêm từ khóa.</div>' : '');
  }
  function renderList() {
    try { renderListInner(); }
    catch (err) { $('dnList').innerHTML = '<p class="lead">Không hiển thị được kết quả tìm kiếm. Hãy tải lại trang.</p>'; if (window.console) console.error('DAUAN search:', err); }
  }
  function renderListInner() {
    var raw = $('dnQ').value.trim(), ws = words(plain(raw));
    var streets = D.STREETS.filter(function (s) {
      var f = byId(D.FIGURES, s.figureId) || {};
      return !ws.length || hit([s.name, s.osmName, f.name, f.life, f.hometown].concat(f.aliases || []).join(' '), ws);
    }).map(function (s) {
      var f = byId(D.FIGURES, s.figureId) || {}, on = !!info[s.id];
      return {r: rank(s.name + ' ' + (f.name || ''), ws), html: itemHTML('data-sid="' + s.id + '"', COLOR, 'fa-user-graduate', s.name, f.name || '', on)};
    });
    if (!ws.length) { $('dnList').innerHTML = ''; return; }   // chưa nhập gì: chỉ hiện ô tìm kiếm
    var S = window.DAUAN_SITES || {HERITAGE: [], EVENTS: []}, M = window.DAUAN_MAP || {pos: {}};
    function sites(arr, color, icon) {
      return (arr || []).filter(function (it) {
        return hit([it.name, it.kind, it.period, it.time, it.place, it.address, it.wiki].filter(Boolean).join(' '), ws);
      }).map(function (it) {
        return {r: rank(it.name, ws), html: itemHTML('data-site="' + it.id + '"', color, icon, it.name, [it.kind, it.period].filter(Boolean).join(' · '), !!(M.pos && M.pos[it.id]))};
      });
    }
    // Địa điểm và tuyến đường có sẵn trong danh sách bên dưới của trang bản đồ (IUH, Chợ Gò Vấp, ...)
    var pg = (typeof PLACES !== 'undefined' ? PLACES : []).filter(function (x) {
      return hit([x.name, x.short, x.type].filter(Boolean).join(' '), ws);
    }).map(function (x) {
      var on = typeof markers !== 'undefined' && !!markers[x.id];
      return {r: rank(x.short || x.name, ws), html: itemHTML('data-place="' + x.id + '"', '#7a1616', x.icon || 'fa-location-dot', x.short || x.name, x.type || '', on)};
    });
    var sg = (typeof STREETS !== 'undefined' ? STREETS : []).filter(function (x) {
      return hit([x.name, x.desc].filter(Boolean).join(' '), ws);
    }).map(function (x) {
      var on = typeof streetInfo !== 'undefined' && !!streetInfo[x.id];
      return {r: rank(x.name, ws), html: itemHTML('data-pst="' + x.id + '"', x.color || '#c8962e', 'fa-road', x.name, 'Tuyến đường lân cận', on)};
    });
    var cmp = function (a, b) { return a.r - b.r; };
    var g1 = streets.sort(cmp), g2 = sites(S.HERITAGE, '#c8962e', 'fa-landmark').sort(cmp), g3 = sites(S.EVENTS, '#a02020', 'fa-shield-halved').sort(cmp);
    $('dnList').innerHTML = group('Địa điểm', pg.sort(cmp)) + group('Tuyến đường lân cận', sg.sort(cmp)) + group('Đường phố &amp; nhân vật lịch sử', g1) + group('Địa danh &amp; di tích', g2) + group('Trận chiến &amp; sự kiện lịch sử', g3)
      || '<p class="lead">Không tìm thấy kết quả cho “' + esc(raw) + '”. Thử nhập tên đường, địa danh, trận chiến hoặc nhân vật khác.</p>';
  }
  $('dnQ').addEventListener('input', renderList);
  $('dnQ').addEventListener('focus', renderList);
  $('dnList').addEventListener('click', function (e) {
    var b = e.target.closest('.item'); if (!b) return;
    if (b.dataset.place) { if (typeof focusPlace === 'function') focusPlace(b.dataset.place); }
    else if (b.dataset.pst) { if (typeof focusStreet === 'function') focusStreet(b.dataset.pst); }
    else if (b.dataset.site) { if (window.DAUAN_MAP) DAUAN_MAP.go(b.dataset.site); }
    else focus(b.dataset.sid);
  });

  // ---- Bảng thông tin ----
  function show(sid) {
    var s = byId(D.STREETS, sid), f = byId(D.FIGURES, s.figureId); if (!s || !f) return;
    var ok = s.verified && f.verified;
    document.querySelectorAll('.dn-panel').forEach(function (p) { p.classList.remove('on'); }); setSel(sid); clearPick();
    var _a = info[sid] && info[sid].all; if (_a && _a.length && window.DAUAN_DEST) { var _c = _a[Math.floor(_a.length / 2)]; DAUAN_DEST(s.name, _c[0], _c[1]); }
    panel.innerHTML = '<button class="dn-x" aria-label="Đóng">✕</button><div class="dn-img" id="dnImg">' + esc(f.name.charAt(0)) + '</div><div class="dn-cred" id="dnCred">Ảnh chân dung: đang tải từ Wikipedia…</div><div class="dn-body">' +
      '<h2>' + esc(s.name) + (ok ? '' : '<span class="dn-badge">Chờ kiểm chứng</span>') + '</h2><div class="life">' + esc(f.name) + ' · ' + esc(f.life) + '</div>' +
      '<h4>Vị trí và khu vực</h4><p>' + esc(s.location || 'TP. Hồ Chí Minh.') + ' Hình dạng tuyến đường lấy từ OpenStreetMap; đoạn đang chọn được tô màu cam.</p>' +
      '<h4>Nguồn gốc tên gọi</h4><p>' + esc(s.origin) + '</p>' + (s.originNote ? '<small>' + esc(s.originNote) + '</small>' : '') +
      (s.meaning ? '<h4>Ý nghĩa của việc đặt tên đường</h4><p>' + esc(s.meaning) + '</p>' : '') + '<h4>Nhân vật liên quan</h4><p>' + esc(f.bio) + '</p>' +
      '<h4>Quê quán</h4><p>' + esc(f.hometown) + '</p><h4>Sự nghiệp</h4><p>' + esc(f.career) + '</p><h4>Đóng góp</h4><p>' + esc(f.contribution) + '</p>' + (f.legacy ? '<h4>Dấu ấn lịch sử nổi bật</h4><p>' + esc(f.legacy) + '</p>' : '') +
      '<h4>Nguồn tham khảo</h4><div class="dn-src">' + f.sources.map(function (x) { return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a>'; }).join('') + '</div>' + (f.video && f.video.length ? '<h4>Video và tư liệu</h4>' + f.video.map(function (v) { return '<a href="' + esc(v[1]) + '" target="_blank" rel="noopener">▶ ' + esc(v[0]) + '</a>'; }).join('<br>') : '') + (f.note ? '<p style="margin-top:10px"><small>' + esc(f.note) + '</small></p>' : '') + '</div>';
    panel.classList.add('on'); panel.scrollTop = 0;
    panel.querySelector('.dn-x').onclick = closePanel;
    loadImage(f);
  }
  function loadImage(f) {
    var done = function (d) {
      var img = $('dnImg'), c = $('dnCred'); if (!img) return;
      if (d && d.thumbnail) { img.insertAdjacentHTML('beforeend', '<img src="' + esc(d.thumbnail.source) + '" alt="' + esc(f.name) + '">'); c.innerHTML = 'Ảnh: <a href="' + esc(d.content_urls.desktop.page) + '" target="_blank" rel="noopener">Wikipedia</a> – xem trang gốc để biết tác giả và giấy phép.'; }
      else c.textContent = 'Chưa có ảnh chân dung được kiểm chứng nguồn.';
    };
    if (imgCache[f.id] !== undefined) return done(imgCache[f.id]);
    fetch('https://vi.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(f.wiki))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { imgCache[f.id] = d; done(d); }).catch(function () { imgCache[f.id] = null; done(null); });
  }

  // ---- Lớp bản đồ ----
  function addLayers() {
    if (!map.getSource('dn')) map.addSource('dn', {type: 'geojson', data: geo}); else map.getSource('dn').setData(geo);
    if (map.getLayer('dn-line')) return;
    map.addLayer({id: 'dn-casing', type: 'line', source: 'dn', layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': '#fff', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 4, 18, 14]}});
    map.addLayer({id: 'dn-line', type: 'line', source: 'dn', layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': COLOR, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 18, 8]}});
    var hl = function (id, src, color, w1, w2, filter) { var l = {id: id, type: 'line', source: src, layout: {'line-cap': 'round', 'line-join': 'round'}, paint: {'line-color': color, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, w1, 18, w2]}}; if (filter) l.filter = filter; map.addLayer(l); };
    var f = ['==', ['get', 'sid'], selSid];
    hl('dn-sel-casing', 'dn', '#fff', 8, 22, f); hl('dn-sel', 'dn', '#e8590c', 5, 14, f);
    if (!map.getSource('dn-pick')) map.addSource('dn-pick', {type: 'geojson', data: pick});
    hl('dn-pick-casing', 'dn-pick', '#fff', 8, 22); hl('dn-pick', 'dn-pick', '#e8590c', 5, 14);
    if (bound) return; bound = true;
    map.on('click', 'dn-line', function (e) { if (typeof streetPopup !== 'undefined') streetPopup.remove(); show(e.features[0].properties.sid); });
    map.on('mouseenter', 'dn-line', function () { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'dn-line', function () { map.getCanvas().style.cursor = ''; });
    map.on('click', pickStreet);
  }
  function setSel(sid) { selSid = sid || ''; ['dn-sel-casing', 'dn-sel'].forEach(function (id) { if (map.getLayer(id)) map.setFilter(id, ['==', ['get', 'sid'], selSid]); }); }
  function setPick(fs) { pick = {type: 'FeatureCollection', features: fs}; if (map.getSource('dn-pick')) map.getSource('dn-pick').setData(pick); }
  function clearPick() { setPick([]); }
  function closePanel() { panel.classList.remove('on'); setSel(''); clearPick(); if (window.DAUAN_DEST) DAUAN_DEST(null); }
  // Nhấn vào bất kỳ đường nào: tìm đường gần nhất từ OpenStreetMap, làm nổi bật và mở hồ sơ (nếu đã có dữ liệu)
  function pickStreet(e) {
    var layers = ['dn-line', 'st-line'].filter(function (l) { return map.getLayer(l); });
    if (layers.length && map.queryRenderedFeatures(e.point, {layers: layers}).length) return;
    if (map.getZoom() < 13) return;
    var q = '[out:json][timeout:15];way(around:30,' + e.lngLat.lat + ',' + e.lngLat.lng + ')["highway"]["name"];out geom;';
    fetch('https://overpass-api.de/api/interpreter', {method: 'POST', body: 'data=' + encodeURIComponent(q), headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var best = null, bd = Infinity;
        (d.elements || []).forEach(function (w) { (w.geometry || []).forEach(function (p) { var dx = p.lon - e.lngLat.lng, dy = p.lat - e.lngLat.lat, v = dx * dx + dy * dy; if (v < bd) { bd = v; best = w.tags.name; } }); });
        if (!best) return;
        var ways = d.elements.filter(function (w) { return w.tags.name === best; });
        var s = D.STREETS.filter(function (x) { return new RegExp('^(Đường |Phố )?' + x.osmName + '$').test(best); })[0];
        if (s) { show(s.id); setPick(ways.map(function (w) { return {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: w.geometry.map(function (p) { return [p.lon, p.lat]; })}}; })); return; }
        document.querySelectorAll('.dn-panel').forEach(function (p) { p.classList.remove('on'); }); setSel('');
        setPick(ways.map(function (w) { return {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: w.geometry.map(function (p) { return [p.lon, p.lat]; })}}; }));
        panel.innerHTML = '<button class="dn-x" aria-label="Đóng">✕</button><div class="dn-body" style="padding-top:44px"><h2>' + esc(best) + '</h2><div class="life">Đường phố · TP. Hồ Chí Minh</div><h4>Hồ sơ lịch sử</h4><p>Tuyến đường này chưa có hồ sơ trong cơ sở dữ liệu DẤU ẤN. Hồ sơ sẽ được bổ sung khi có nguồn tham khảo đã kiểm chứng.</p></div>';
        panel.classList.add('on'); panel.querySelector('.dn-x').onclick = closePanel; if (window.DAUAN_DEST) DAUAN_DEST(best, e.lngLat.lng, e.lngLat.lat);
      }).catch(function () {});
  }
  map.on('style.load', function () { if (geo.features.length) addLayers(); });
  function focus(sid) {
    var i = info[sid]; if (!i) return;
    var b = new maplibregl.LngLatBounds(); i.all.forEach(function (p) { b.extend(p); });
    map.fitBounds(b, {padding: 80, maxZoom: 16, duration: 900}); show(sid);
  }

  // ---- Tải hình dạng tuyến đường từ OpenStreetMap (không nhập tọa độ thủ công) ----
  function load() {
    if (!D.STREETS.length) return Promise.resolve();
    var q = '[out:json][timeout:30];(' + D.STREETS.map(function (s) { return 'way["highway"]["name"~"^(Đường |Phố )?' + s.osmName + '$"](' + HCM + ');'; }).join('') + ');out geom;';
    return fetch('https://overpass-api.de/api/interpreter', {method: 'POST', body: 'data=' + encodeURIComponent(q), headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        geo.features = []; info = {};
        D.STREETS.forEach(function (s) {
          var re = new RegExp('^(Đường |Phố )?' + s.osmName + '$'), all = [];
          (d.elements || []).filter(function (e) { return e.type === 'way' && e.tags && re.test(e.tags.name); }).forEach(function (w) {
            var c = w.geometry.map(function (p) { return [p.lon, p.lat]; }); all = all.concat(c);
            geo.features.push({type: 'Feature', properties: {sid: s.id}, geometry: {type: 'LineString', coordinates: c}});
          });
          if (all.length) info[s.id] = {all: all};
        });
        addLayers(); renderList();
      });
  }
  renderList();
  function start() { load().catch(function () { $('dnList').insertAdjacentHTML('beforeend', '<p class="lead">Không tải được vị trí tuyến đường. <a href="#" id="dnRetry">Thử lại</a></p>'); var r = $('dnRetry'); if (r) r.onclick = function (e) { e.preventDefault(); start(); }; }); }
  if (map.loaded()) start(); else map.once('load', start);
})();
