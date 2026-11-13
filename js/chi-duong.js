/* DẤU ẤN – Nút mũi tên chỉ đường (góc phải bản đồ): mở Google Maps dẫn đường từ vị trí hiện tại tới địa điểm đang chọn.
   Các mô-đun gọi DAUAN_DEST(tên, kinh độ, vĩ độ) khi người dùng chọn một địa điểm/tuyến đường, và DAUAN_DEST(null) khi bỏ chọn.
   Không truyền điểm xuất phát: Google Maps tự lấy vị trí hiện tại của thiết bị (sau khi người dùng cho phép). */
(function () {
  var dest = null, btn = null;
  window.DAUAN_DEST = function (name, lng, lat) {
    dest = (name == null || lng == null || lat == null || isNaN(lng) || isNaN(lat)) ? null : {name: String(name), lng: +lng, lat: +lat};
    refresh();
  };
  function refresh() {
    if (!btn) return;
    var t = dest ? 'Chỉ đường tới: ' + dest.name + ' (Google Maps)' : 'Chỉ đường bằng Google Maps – hãy chọn một địa điểm trước';
    btn.title = t; btn.setAttribute('aria-label', t); btn.classList.toggle('dis', !dest);
  }
  function notify(t) { if (typeof setStatus === 'function') { setStatus(t); setTimeout(function () { setStatus(''); }, 4500); } }
  function open() {
    if (!dest) { notify('Hãy chọn một địa điểm hoặc tuyến đường trên bản đồ, rồi bấm mũi tên để chỉ đường.'); return; }
    var url = 'https://www.google.com/maps/dir/?api=1&destination=' + dest.lat.toFixed(6) + ',' + dest.lng.toFixed(6) + '&travelmode=driving';
    window.open(url, '_blank', 'noopener');
  }
  var st = document.createElement('style');
  st.textContent = '.dd-ctrl button i{color:var(--red,#7a1616);font-size:1.05rem}.dd-ctrl button.dis{opacity:.5}.dd-ctrl button:not(.dis){background:#fff3d6}';
  document.head.appendChild(st);
  function Ctl() {}
  Ctl.prototype.onAdd = function () {
    var c = document.createElement('div'); c.className = 'maplibregl-ctrl maplibregl-ctrl-group dd-ctrl';
    btn = document.createElement('button'); btn.type = 'button'; btn.innerHTML = '<i class="fas fa-diamond-turn-right" aria-hidden="true"></i>';
    btn.addEventListener('click', open); c.appendChild(btn); refresh(); this._c = c; return c;
  };
  Ctl.prototype.onRemove = function () { if (this._c && this._c.parentNode) this._c.parentNode.removeChild(this._c); };
  map.addControl(new Ctl(), 'top-right');
})();
