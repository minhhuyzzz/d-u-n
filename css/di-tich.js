/* DẤU ẤN – Module "Di tích & Sự kiện lịch sử". Chạy sau js/danh-nhan.js, dùng lại map, $, esc, maplibregl. */
(function () {
  var S = window.DAUAN_SITES, P = window.DAUAN || {FIGURES: [], STREETS: []}, HCM = '10.60,106.55,10.95,106.85';
  var LAYERS = {
    heritage: {label: 'Di tích & địa điểm', icon: 'fa-landmark', color: '#c8962e', items: S.HERITAGE, shape: '8px'},
    events: {label: 'Trận chiến & sự kiện', icon: 'fa-shield-halved', color: '#a02020', items: S.EVENTS, shape: '50%'}
  };
  var pos = {}, markers = {}, imgCache = {}, active = {heritage: true, events: true};
  var plain = function (s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
  var find = function (arr, id) { return arr.filter(function (x) { return x.id === id; })[0]; };
  var all = function () { return LAYERS.heritage.items.map(function (i) { return [i, 'heritage']; }).concat(LAYERS.events.items.map(function (i) { return [i, 'events']; })); };

  var st = document.createElement('style');
  st.textContent = '.ds-box{margin-bottom:6px}.ds-tg{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.ds-tg label{display:flex;align-items:center;gap:6px;font-size:.82rem;font-weight:600;border:1px solid var(--border);border-radius:999px;padding:5px 12px;cursor:pointer;background:var(--bg)}' +
    '.ds-f{display:flex;gap:6px;margin-bottom:8px}.ds-f select,.ds-f input{flex:1;min-width:0;border:1px solid var(--border);background:var(--bg);color:var(--text);border-radius:10px;padding:7px 10px;font-family:inherit;font-size:.84rem}' +
    '.ds-mk{width:34px;height:34px;display:grid;place-items:center;color:#fff;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.45);cursor:pointer;transition:.2s}.ds-mk:hover{transform:scale(1.15)}.ds-mk.ev{transform:rotate(45deg)}.ds-mk.ev i{transform:rotate(-45deg)}' +
    '.ds-rel{display:inline-block;margin:2px 6px 2px 0;padding:3px 12px;border:1px solid var(--border);border-radius:999px;background:var(--surface-2);color:var(--red);font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit}' +
    '.ds-row{font-size:.9rem;margin:0 0 4px}.ds-row b{color:var(--red)}';
  document.head.appendChild(st);

  var box = document.createElement('div'); box.className = 'ds-box';
  box.innerHTML = '<div class="sec-t">Di tích &amp; sự kiện lịch sử</div><div class="ds-tg" id="dsTg"></div>' +
    '<input class="dn-search" id="dsQ" type="search" placeholder="Tìm di tích, trận chiến, sự kiện…" aria-label="Tìm di tích và sự kiện">' +
    '<div class="ds-f"><select id="dsKind" aria-label="Lọc theo loại"></select><select id="dsPer" aria-label="Lọc theo thời kỳ"></select></div><div id="dsList"></div>';
  var side = document.querySelector('.side'); side.insertBefore(box, document.querySelector('.dn-box') || side.querySelector('.sec-t'));
  var panel = document.createElement('div'); panel.className = 'dn-panel'; $('map').parentNode.appendChild(panel);

  // Bộ lọc loại / thời kỳ lấy từ dữ liệu
  function opts(id, first, vals) { $(id).innerHTML = '<option value="">' + first + '</option>' + vals.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join(''); }
  var uniq = function (k) { var o = {}; all().forEach(function (a) { if (a[0][k]) o[a[0][k]] = 1; }); return Object.keys(o); };
  opts('dsKind', 'Mọi loại', uniq('kind')); opts('dsPer', 'Mọi thời kỳ', uniq('period'));
  $('dsTg').innerHTML = Object.keys(LAYERS).map(function (k) { return '<label><input type="checkbox" data-l="' + k + '" checked><i class="fas ' + LAYERS[k].icon + '" style="color:' + LAYERS[k].color + '"></i>' + LAYERS[k].label + '</label>'; }).join('');

  function visible(it, k) {
    var q = plain($('dsQ').value.trim()), kd = $('dsKind').value, pr = $('dsPer').value;
    return active[k] && (!kd || it.kind === kd) && (!pr || it.period === pr) && (!q || plain(it.name + ' ' + (it.kind || '')).indexOf(q) > -1);
  }
  function refresh() {
    var rows = all().filter(function (a) { return visible(a[0], a[1]); });
    all().forEach(function (a) { var m = markers[a[0].id]; if (m) m.getElement().style.display = rows.indexOf(a) > -1 ? '' : 'none'; });
    $('dsList').innerHTML = rows.map(function (a) {
      var it = a[0], L = LAYERS[a[1]], on = !!pos[it.id];
      return '<button class="item' + (on ? '' : ' off') + '" data-id="' + it.id + '"' + (on ? '' : ' disabled') + '><span class="ic" style="background:' + L.color + '"><i class="fas ' + L.icon + '"></i></span><span><b>' + esc(it.name) + '</b><small>' + esc(it.kind) + ' · ' + esc(it.period) + (on ? '' : ' · chưa tải được vị trí') + '</small></span></button>';
    }).join('') || '<p class="lead">Không có kết quả phù hợp.</p>';
  }
  $('dsTg').addEventListener('change', function (e) { active[e.target.dataset.l] = e.target.checked; refresh(); });
  ['dsQ', 'dsKind', 'dsPer'].forEach(function (id) { $(id).addEventListener('input', refresh); });
  $('dsList').addEventListener('click', function (e) { var b = e.target.closest('.item'); if (b) go(b.dataset.id); });

  // Bảng chi tiết
  function row(l, v) { return v ? '<h4>' + l + '</h4><p>' + esc(v) + '</p>' : ''; }
  function show(it, k) {
    var L = LAYERS[k], rel = [], lk = it.links || {};
    (lk.siteIds || []).forEach(function (i) { var x = find(S.HERITAGE, i); if (x) rel.push([x.name, 'site:' + i]); });
    (lk.eventIds || []).forEach(function (i) { var x = find(S.EVENTS, i); if (x) rel.push([x.name, 'site:' + i]); });
    (lk.figureIds || []).forEach(function (i) { var x = find(P.FIGURES, i); if (x) rel.push([x.name, 'fig:' + i]); });
    (lk.streetIds || []).forEach(function (i) { var x = find(P.STREETS, i); if (x) rel.push([x.name, 'st:' + i]); });
    document.querySelectorAll('.dn-panel').forEach(function (p) { p.classList.remove('on'); });
    panel.innerHTML = '<button class="dn-x" aria-label="Đóng">✕</button><div class="dn-img" id="dsImg" style="background:linear-gradient(135deg,#3a0808,' + L.color + ')"><i class="fas ' + L.icon + '" style="font-size:3.2rem"></i></div><div class="dn-cred" id="dsCred">Ảnh tư liệu: đang tải từ Wikipedia…</div><div class="dn-body"><h2>' + esc(it.name) + '</h2><div class="life">' + esc(it.kind) + ' · ' + esc(it.period) + '</div>' +
      row('Thời gian', it.time) + row('Vị trí', it.address || it.place) + row('Quy mô', it.scale) + row('Lực lượng tham gia', it.forces) + row('Lịch sử hình thành', it.history) + row('Diễn biến', it.course) + row('Kết quả', it.result) +
      row('Giá trị văn hóa', it.value) + row('Ý nghĩa lịch sử', it.significance) +
      (it.video && it.video.length ? '<h4>Video</h4>' + it.video.map(function (v) { return '<a href="' + esc(v[1]) + '" target="_blank" rel="noopener">▶ ' + esc(v[0]) + '</a>'; }).join('<br>') : '') +
      (rel.length ? '<h4>Liên kết</h4>' + rel.map(function (r) { return '<button class="ds-rel" data-r="' + r[1] + '">' + esc(r[0]) + '</button>'; }).join('') : '') +
      '<h4>Nguồn tham khảo</h4><div class="dn-src">' + it.sources.map(function (x) { return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a>'; }).join('') + '</div></div>';
    panel.classList.add('on'); panel.scrollTop = 0;
    panel.querySelector('.dn-x').onclick = function () { panel.classList.remove('on'); };
    panel.querySelectorAll('.ds-rel').forEach(function (b) {
      b.onclick = function () { var t = b.dataset.r.split(':'); if (t[0] === 'site') go(t[1]); else if (t[0] === 'st') { var d = document.querySelector('#dnList .item[data-sid="' + t[1] + '"]'); if (d) d.click(); } else { var s = P.STREETS.filter(function (x) { return x.figureId === t[1]; })[0]; var d2 = s && document.querySelector('#dnList .item[data-sid="' + s.id + '"]'); if (d2) d2.click(); } };
    });
    var done = function (d) { var im = $('dsImg'), c = $('dsCred'); if (!im) return; if (d && d.thumbnail) { im.insertAdjacentHTML('beforeend', '<img src="' + esc(d.thumbnail.source) + '" alt="' + esc(it.name) + '">'); c.innerHTML = 'Ảnh: <a href="' + esc(d.content_urls.desktop.page) + '" target="_blank" rel="noopener">Wikipedia</a> – xem trang gốc để biết tác giả và giấy phép. Chưa có ảnh hiện trạng riêng.'; } else c.textContent = 'Chưa có hình ảnh được kiểm chứng nguồn.'; };
    if (imgCache[it.id] !== undefined) return done(imgCache[it.id]);
    fetch('https://vi.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(it.wiki)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) { imgCache[it.id] = d; done(d); }).catch(function () { imgCache[it.id] = null; done(null); });
  }
  function go(id) {
    var a = all().filter(function (x) { return x[0].id === id; })[0]; if (!a || !pos[id]) return;
    active[a[1]] = true; var cb = document.querySelector('#dsTg input[data-l="' + a[1] + '"]'); if (cb) cb.checked = true; refresh();
    map.flyTo({center: pos[id], zoom: Math.max(map.getZoom(), 16), speed: .9}); show(a[0], a[1]);
  }

  // Vị trí lấy từ OpenStreetMap (không nhập tọa độ thủ công)
  function put(it, k, ll) {
    pos[it.id] = ll; var L = LAYERS[k], el = document.createElement('div');
    el.innerHTML = '<div class="ds-mk' + (k === 'events' ? ' ev' : '') + '" style="background:' + L.color + ';border-radius:' + L.shape + '" title="' + esc(it.name) + '"><i class="fas ' + L.icon + '"></i></div>';
    el.firstChild.addEventListener('click', function (e) { e.stopPropagation(); go(it.id); });
    markers[it.id] = new maplibregl.Marker({element: el}).setLngLat(ll).addTo(map);
  }
  function load() {
    var q = '[out:json][timeout:30];(' + S.HERITAGE.map(function (h) { return 'nwr["name"~"' + h.osmRegex + '"](' + HCM + ');'; }).join('') + ');out center;';
    return fetch('https://overpass-api.de/api/interpreter', {method: 'POST', body: 'data=' + encodeURIComponent(q), headers: {'Content-Type': 'application/x-www-form-urlencoded'}})
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        S.HERITAGE.forEach(function (h) {
          var re = new RegExp(h.osmRegex), m = (d.elements || []).filter(function (e) { return e.tags && re.test(e.tags.name) && (e.center || e.lat); })[0];
          if (m) put(h, 'heritage', m.center ? [m.center.lon, m.center.lat] : [m.lon, m.lat]);
        });
        S.EVENTS.forEach(function (ev) { if (pos[ev.locRef]) put(ev, 'events', pos[ev.locRef]); });
        refresh();
      });
  }
  window.DAUAN_MAP = {pos: pos, markers: markers, go: go}; // cho module dòng thời gian dùng lại
  refresh();
  function start() { load().catch(function () { $('dsList').insertAdjacentHTML('beforeend', '<p class="lead">Không tải được vị trí. <a href="#" id="dsRetry">Thử lại</a></p>'); var r = $('dsRetry'); if (r) r.onclick = function (e) { e.preventDefault(); start(); }; }); }
  if (map.loaded()) start(); else map.once('load', start);
})();
