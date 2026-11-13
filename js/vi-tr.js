/* DẤU ẤN – Mở bản đồ tại đúng địa danh được chọn từ các trang khác.
   Đường dẫn: ban-do.html?place=<id>&q=<tên>&addr=<địa chỉ>
   - Nếu địa danh đã có điểm đánh dấu từ lớp Di tích (cùng id) thì dùng lại điểm đó.
   - Nếu chưa, xác định vị trí bằng dịch vụ tìm địa điểm của OpenStreetMap (Nominatim); không tự đặt tọa độ.
   - Không tìm thấy thì báo rõ, không đoán vị trí. */
(function () {
  var p = new URLSearchParams(location.search), id = p.get('place'), name = (p.get('q') || '').trim(), addr = (p.get('addr') || '').trim();
  if (!id && !name) return;
  var marker = null;
  function msg(t) { if (typeof setStatus === 'function') setStatus(t); }
  function show(lng, lat, box) {
    if (marker) marker.remove();
    var el = document.createElement('div');
    el.innerHTML = '<div class="mk main" title="' + esc(name) + '"><i class="fas fa-location-dot"></i></div>';
    var pop = new maplibregl.Popup({offset: 36, maxWidth: '300px'}).setHTML(popupHTML(name, 'Địa danh lịch sử', addr, 'Vị trí được xác định theo dữ liệu OpenStreetMap.'));
    marker = new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([lng, lat]).setPopup(pop).addTo(map);
    marker.togglePopup();
    map.flyTo({center: [lng, lat], zoom: 16.3, speed: .9});
    msg('Đang hiển thị: <b>' + esc(name) + '</b>');
    if (window.DAUAN_DEST) DAUAN_DEST(name, lng, lat);
  }
  function geocode(q) {
    return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=vn&accept-language=vi&q=' + encodeURIComponent(q))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (a) { return a && a[0] ? a[0] : null; });
  }
  function fallback() {
    msg('Đang xác định vị trí của <b>' + esc(name) + '</b>…');
    geocode(name).then(function (r) { return r || (addr ? geocode(addr) : null); })
      .then(function (r) { if (r) show(parseFloat(r.lon), parseFloat(r.lat)); else msg('Chưa xác định được vị trí của <b>' + esc(name) + '</b> trên bản đồ. Hãy thử tìm trong danh sách bên trái.'); })
      .catch(function () { msg('Không tải được vị trí của <b>' + esc(name) + '</b>. Kiểm tra kết nối mạng rồi tải lại trang.'); });
  }
  function start() {
    var tries = 0, t = setInterval(function () {
      var M = window.DAUAN_MAP;
      if (M && M.pos && M.pos[id]) { clearInterval(t); M.go(id); msg(''); return; }
      if (++tries > 12) { clearInterval(t); if (name) fallback(); else msg('Chưa có vị trí cho mục này.'); }
    }, 500);
  }
  if (map.loaded()) start(); else map.once('load', start);
})();
