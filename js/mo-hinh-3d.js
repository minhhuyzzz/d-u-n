/* DẤU ẤN – Chế độ 3D minh họa: nghiêng bản đồ, dựng nhà 3D từ dữ liệu OpenStreetMap (nền Vector) và hiển thị mô hình minh họa di tích.
   Dùng lại map, $, esc, setStatus, DAUAN_MAP; dữ liệu mô hình ở data/mo-hinh-3d.js. */
(function () {
  var MODELS = window.DAUAN_MODELS || {}, on = false, focusId = null;
  var st = document.createElement('style');
  st.textContent = '.m3d{position:absolute;left:12px;bottom:76px;z-index:5;display:flex;border:1px solid var(--border);border-radius:999px;overflow:hidden;background:var(--surface);box-shadow:0 4px 16px rgba(0,0,0,.18)}.m3d button{border:0;background:none;color:var(--text);padding:7px 16px;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit}.m3d button.on{background:var(--red);color:#fff}' +
    '.m3d-note{position:absolute;left:12px;bottom:118px;z-index:5;max-width:min(330px,calc(100% - 24px));background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--gold);border-radius:10px;padding:8px 12px;font-size:.78rem;display:none;box-shadow:0 4px 16px rgba(0,0,0,.18)}.m3d-note.on{display:block}';
  document.head.appendChild(st);
  var box = document.createElement('div'); box.className = 'm3d';
  box.innerHTML = '<button id="m3dBtn" type="button" aria-pressed="false" title="Bật/tắt chế độ 3D minh họa">3D minh họa</button>';
  var note = document.createElement('div'); note.className = 'm3d-note'; note.id = 'm3dNote';
  var wrap = $('map').parentNode; wrap.appendChild(box); wrap.appendChild(note);

  function vecSource() { var s = map.getStyle() && map.getStyle().sources || {}, k = Object.keys(s).filter(function (x) { return s[x].type === 'vector'; })[0]; return k; }
  // mét -> độ quanh một điểm
  function rect(c, w, l) {
    var dy = l / 2 / 111320, dx = w / 2 / (111320 * Math.cos(c[1] * Math.PI / 180));
    return [[[c[0] - dx, c[1] - dy], [c[0] + dx, c[1] - dy], [c[0] + dx, c[1] + dy], [c[0] - dx, c[1] + dy], [c[0] - dx, c[1] - dy]]];
  }
  function modelData() {
    var f = [], M = window.DAUAN_MAP;
    Object.keys(MODELS).forEach(function (id) {
      var c = M && M.pos && M.pos[id]; if (!c) return;
      MODELS[id].tiers.forEach(function (t) { f.push({type: 'Feature', properties: {id: id, base: t.base, h: t.h, color: t.color}, geometry: {type: 'Polygon', coordinates: rect(c, t.w, t.l)}}); });
    });
    return {type: 'FeatureCollection', features: f};
  }
  function addLayers() {
    removeLayers();
    var src = vecSource();
    if (src) map.addLayer({id: 'dauan-3d-bld', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 14, filter: ['has', 'render_height'],
      paint: {'fill-extrusion-color': '#cdbd9b', 'fill-extrusion-height': ['get', 'render_height'], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .8}});
    map.addSource('dauan-model', {type: 'geojson', data: modelData()});
    map.addLayer({id: 'dauan-model-3d', type: 'fill-extrusion', source: 'dauan-model',
      paint: {'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'h'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-opacity': 1}});
  }
  function removeLayers() {
    ['dauan-model-3d', 'dauan-3d-bld'].forEach(function (l) { if (map.getLayer(l)) map.removeLayer(l); });
    if (map.getSource('dauan-model')) map.removeSource('dauan-model');
  }
  function describe() {
    var ids = Object.keys(MODELS).filter(function (id) { return window.DAUAN_MAP && DAUAN_MAP.pos[id]; });
    var m = ids.length ? MODELS[ids[0]] : null;
    note.innerHTML = '<b>Chế độ 3D minh họa.</b> Nhà 3D lấy chiều cao từ dữ liệu OpenStreetMap; công trình không có dữ liệu chiều cao giữ dạng phẳng.' +
      (m ? '<br>Khối vàng – kem là <b>mô hình minh họa ' + esc(m.name) + '</b> (cao tổng ' + m.totalHeight + ' m theo tư liệu). Hình khối đơn giản, không đúng kiến trúc và kích thước thực.' : '<br>Mô hình minh họa sẽ hiện khi di tích có trong bản đồ.') +
      '<br>Kéo chuột phải (hoặc dùng hai ngón) để xoay và nghiêng.';
    note.classList.add('on');
  }
  function enable() {
    on = true; $('m3dBtn').classList.add('on'); $('m3dBtn').setAttribute('aria-pressed', 'true');
    var go = function () {
      if (!on) return;
      if (!vecSource()) { setStatus('Không dựng được nhà 3D vì nền bản đồ không có dữ liệu vector. Hãy chọn nền "Vector".'); }
      addLayers(); describe();
      var M = window.DAUAN_MAP, id = focusId || Object.keys(MODELS).filter(function (k) { return M && M.pos[k]; })[0];
      var c = id && M.pos[id];
      map.easeTo({pitch: 62, bearing: -25, zoom: Math.max(map.getZoom(), 16.5), center: c || map.getCenter(), duration: 1200});
    };
    if (vecSource()) go();
    else { map.once('style.load', go); document.querySelector('#basemap button[data-s="vec"]').click(); }
  }
  function disable() {
    on = false; $('m3dBtn').classList.remove('on'); $('m3dBtn').setAttribute('aria-pressed', 'false'); note.classList.remove('on');
    removeLayers(); map.easeTo({pitch: 0, bearing: 0, duration: 800});
  }
  $('m3dBtn').addEventListener('click', function () { on ? disable() : enable(); });
  // Đổi nền bản đồ làm mất lớp: dựng lại nếu đang bật 3D và nền mới là vector; nếu nền đường thì tắt 3D
  map.on('style.load', function () { if (!on) return; if (vecSource()) { addLayers(); } else { disable(); } });
})();
