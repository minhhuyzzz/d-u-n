/* DẤU ẤN – Module "Dòng thời gian lịch sử TP.HCM". Chạy sau js/di-tich.js; dùng map, $, esc, DAUAN, DAUAN_SITES, DAUAN_MAP. */
(function () {
  try {
  var T = window.DAUAN_TIMELINE.ERAS, P = window.DAUAN || {FIGURES: [], STREETS: []}, S = window.DAUAN_SITES, M = window.DAUAN_MAP || {pos: {}, markers: {}, go: function () {}};
  var current = null, imgCache = {};
  var find = function (a, id) { return a.filter(function (x) { return x.id === id; })[0]; };

  var st = document.createElement('style');
  st.textContent = '.tl{position:relative;margin:4px 0 12px 8px;padding-left:22px;border-left:3px solid var(--gold)}.tl-i{position:relative;display:block;width:100%;text-align:left;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:8px 12px;margin-bottom:8px;cursor:pointer;color:var(--text);font-family:inherit;transition:.2s}' +
    '.tl-i::before{content:"";position:absolute;left:-31px;top:14px;width:15px;height:15px;border-radius:50%;background:var(--surface);border:3px solid var(--gold)}.tl-i:hover,.tl-i.active{border-color:var(--red);background:var(--surface-2)}.tl-i.active::before{background:var(--red);border-color:var(--gold-l)}' +
    '.tl-i b{display:block;font-size:.9375rem}.tl-i small{color:var(--gold);font-weight:700}.tl-clear{border:0;background:none;color:var(--red);font-weight:700;cursor:pointer;font-family:inherit;font-size:.8rem;padding:0 0 8px 8px;display:none}' +
    '.tl-ev{border-left:3px solid var(--gold);padding:2px 0 2px 10px;margin:0 0 10px}.tl-ev b{color:var(--red);font-size:.875rem}.tl-ev p{margin:0;font-size:.875rem}.tl-ul{margin:0;padding-left:18px;font-size:.875rem}' +
    '.cmp{position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:10px;margin-top:6px}.cmp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.cmp input{position:absolute;left:0;right:0;bottom:6px;width:100%;z-index:2}' +
    '.cmp-t{font-size:max(.76rem,.8rem);color:var(--muted);margin-top:4px}.tl-note{font-size:.8rem;color:var(--muted);font-style:italic}' +
    '.dn-x{width:70px!important;height:70px!important;min-width:70px;display:inline-flex!important;align-items:center;justify-content:center;border-radius:50%!important;border:2px solid #fff!important;background:rgba(0,0,0,.6)!important;color:#fff!important;font-size:2.2rem!important;line-height:1;font-weight:700;cursor:pointer;z-index:5;padding:0;box-shadow:0 2px 8px rgba(0,0,0,.4)}.dn-x:hover{background:var(--red,#7a1616)!important}.dn-x:focus-visible{outline:3px solid #d99a00;outline-offset:2px}';
  document.head.appendChild(st);

  var box = document.createElement('div');
  box.innerHTML = '<div class="sec-t">Dòng thời gian TP.HCM</div><div class="tl" id="tlList"></div><button class="tl-clear" id="tlClear">✕ Bỏ chọn giai đoạn</button>';
  var side = document.querySelector('.side');
  // chèn trước khối con trực tiếp đầu tiên của nhóm dữ liệu (di tích / đường phố / địa điểm)
  side.insertBefore(box, side.querySelector(':scope > .ds-box') || side.querySelector(':scope > .dn-box') || side.querySelector(':scope > .sec-t'));
  $('tlList').innerHTML = T.map(function (e) { return '<button class="tl-i" data-id="' + e.id + '"><small>' + esc(e.period) + '</small><b>' + esc(e.name) + '</b></button>'; }).join('');
  $('tlList').addEventListener('click', function (e) { var b = e.target.closest('.tl-i'); if (b) select(b.dataset.id); });
  $('tlClear').onclick = clear;

  var panel = document.createElement('div'); panel.className = 'dn-panel'; $('map').parentNode.appendChild(panel);

  // Các địa điểm trên bản đồ thuộc giai đoạn (lấy từ liên kết của mốc sự kiện)
  function idsOf(era) { var o = {}; era.events.forEach(function (ev) { ((ev.links || {}).siteIds || []).forEach(function (i) { o[i] = 1; }); }); return Object.keys(o); }
  function dim(ids) { Object.keys(M.markers).forEach(function (k) { M.markers[k].getElement().style.opacity = (!ids || ids.indexOf(k) > -1) ? '' : '.25'; }); }
  function clear() {
    current = null; dim(null); panel.classList.remove('on'); $('tlClear').style.display = 'none';
    document.querySelectorAll('.tl-i').forEach(function (b) { b.classList.remove('active'); });
  }
  function chip(label, kind, id) { return '<button class="ds-rel" data-k="' + kind + '" data-id="' + id + '">' + esc(label) + '</button>'; }

  function select(id) {
    var era = find(T, id); if (!era) return; current = id;
    document.querySelectorAll('.tl-i').forEach(function (b) { b.classList.toggle('active', b.dataset.id === id); });
    $('tlClear').style.display = 'block';
    var ids = idsOf(era).filter(function (i) { return M.pos[i]; }); dim(ids);
    if (ids.length) { var b = new maplibregl.LngLatBounds(); ids.forEach(function (i) { b.extend(M.pos[i]); }); map.fitBounds(b, {padding: 120, maxZoom: 15.5, duration: 900}); }
    document.querySelectorAll('.dn-panel').forEach(function (p) { p.classList.remove('on'); });
    panel.innerHTML = '<button class="dn-x" aria-label="Đóng">✕</button><div class="dn-img" id="tlImg" style="background:linear-gradient(135deg,#3a0808,#c8962e)"><i class="fas fa-clock-rotate-left" style="font-size:3rem"></i></div><div class="dn-cred" id="tlCred">Hình ảnh tư liệu: đang tải…</div><div class="dn-body"><h2>' + esc(era.name) + '</h2><div class="life">' + esc(era.period) + '</div>' +
      '<h4>Giới thiệu</h4><p>' + esc(era.intro) + '</p><h4>Thay đổi nổi bật của thành phố</h4><ul class="tl-ul">' + era.changes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul>' +
      '<h4>Mốc và sự kiện tiêu biểu</h4>' + era.events.map(function (ev) {
        var l = ev.links || {}, chips = '';
        (l.siteIds || []).forEach(function (i) { var x = find(S.HERITAGE, i) || find(S.EVENTS, i); if (x) chips += chip(x.name, 'site', i); });
        (l.figureIds || []).forEach(function (i) { var x = find(P.FIGURES, i); if (x) chips += chip(x.name, 'fig', i); });
        return '<div class="tl-ev"><b>' + esc(ev.year) + '</b><p>' + esc(ev.text) + '</p>' + chips + '</div>';
      }).join('') +
      (ids.length ? '' : '<p class="tl-note">Chưa có địa điểm nào của giai đoạn này được đánh dấu trên bản đồ.</p>') +
      '<h4>So sánh hình ảnh xưa và nay</h4>' + compare(era.compare) +
      '<h4>Nguồn tham khảo</h4><div class="dn-src">' + era.sources.map(function (x) { return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + esc(x[0]) + '</a>'; }).join('') + '</div></div>';
    panel.classList.add('on'); panel.scrollTop = 0;
    panel.querySelector('.dn-x').onclick = clear;
    panel.querySelectorAll('.ds-rel').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.k === 'site') M.go(b.dataset.id);
        else { var s = P.STREETS.filter(function (x) { return x.figureId === b.dataset.id; })[0], el = s && document.querySelector('#dnList .item[data-sid="' + s.id + '"]'); if (el) el.click(); }
      };
    });
    var rg = panel.querySelector('.cmp input'); if (rg) rg.oninput = function () { panel.querySelector('.cmp .top').style.clipPath = 'inset(0 ' + (100 - rg.value) + '% 0 0)'; };
    image(era);
  }
  function compare(c) {
    if (!c) return '<p class="tl-note">Chưa có cặp ảnh xưa – nay được cấp phép và kiểm chứng nguồn cho giai đoạn này.</p>';
    return '<div class="cmp"><img src="' + esc(c.now.src) + '" alt="Hiện nay"><img class="top" src="' + esc(c.old.src) + '" alt="Xưa" style="clip-path:inset(0 50% 0 0)"><input type="range" min="0" max="100" value="50" aria-label="Kéo để so sánh"></div>' +
      '<div class="cmp-t">Xưa: ' + esc(c.old.credit) + ' · Nay: ' + esc(c.now.credit) + '</div>';
  }
  function image(era) {
    var done = function (d) {
      var im = $('tlImg'), cr = $('tlCred'); if (!im || current !== era.id) return;
      if (d && d.thumbnail) { im.insertAdjacentHTML('beforeend', '<img src="' + esc(d.thumbnail.source) + '" alt="' + esc(era.name) + '">'); cr.innerHTML = 'Ảnh: <a href="' + esc(d.content_urls.desktop.page) + '" target="_blank" rel="noopener">Wikipedia</a> – xem trang gốc để biết tác giả và giấy phép.'; }
      else cr.textContent = 'Chưa có hình ảnh tư liệu được kiểm chứng nguồn cho giai đoạn này.';
    };
    if (!era.wiki) return done(null);
    if (imgCache[era.id] !== undefined) return done(imgCache[era.id]);
    fetch('https://vi.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(era.wiki)).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) { imgCache[era.id] = d; done(d); }).catch(function () { imgCache[era.id] = null; done(null); });
  }
  } catch (err) { if (window.console) console.error('Dòng thời gian:', err); }
})();

/* ===== Ô tìm kiếm hợp nhất: đường / địa danh / trận chiến / nhân vật lịch sử =====
   - Chỉ khớp theo TÊN (và vài trường ngắn như năm, quận, vai trò), không quét cả đoạn mô tả nên kết quả đúng với từ khóa.
   - Không phân biệt hoa/thường, có dấu/không dấu ("nguyen hue" = "Nguyễn Huệ").
   - Tự chờ ô nhập do js/danh-nhan.js tạo ra, và tự gắn lại nếu ô đó bị dựng lại. */
(function () {
  var PH = 'Tìm tên đường/địa danh/trận chiến/nhân vật lịch sử';
  var NOISE = {id: 1, figureId: 1, img: 1, image: 1, thumb: 1, thumbnail: 1, wiki: 1, url: 1, src: 1, credit: 1, desc: 1, description: 1, summary: 1, intro: 1, text: 1, content: 1, bio: 1, lat: 1, lng: 1, lon: 1, coords: 1};
  var norm = function (s) { return String(s == null ? '' : s).toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  var nameOf = function (x) { return x.name || x.street || x.title || x.label || ''; };
  // gom các trường ngắn (năm, quận, vai trò, tên gọi khác…) để khớp phụ
  function extra(o) {
    var r = [];
    Object.keys(o || {}).forEach(function (k) {
      if (NOISE[k]) return; var v = o[k];
      if (typeof v === 'string') { if (v.length <= 90 && !/^(https?:|assets\/|data:)/.test(v)) r.push(v); }
      else if (typeof v === 'number') r.push(String(v));
      else if (Array.isArray(v)) v.forEach(function (e) { if (typeof e === 'string' && e.length <= 90) r.push(e); });
    });
    return r.join(' ');
  }

  var inp = null, box = null, idx = null, idxKey = '', act = -1;

  function data() {
    var P = window.DAUAN || {}, S = window.DAUAN_SITES || {};
    return {F: P.FIGURES || [], ST: P.STREETS || [], H: S.HERITAGE || [], E: S.EVENTS || []};
  }
  function index() {
    var d = data(), key = [d.F.length, d.ST.length, d.H.length, d.E.length].join('|');
    if (idx && key === idxKey) return idx;
    var fig = {}, a = [];
    d.F.forEach(function (f) { fig[f.id] = f; });
    d.ST.forEach(function (s) {
      var f = fig[s.figureId], nm = nameOf(s), sub = f ? f.name : '';
      a.push({k: 'street', t: 'Đường', id: s.id, fid: s.figureId, name: nm, sub: sub, n: norm(nm), s: norm(sub), o: norm(extra(s) + ' ' + (f ? extra(f) : ''))});
    });
    d.F.forEach(function (f) {
      var sts = d.ST.filter(function (s) { return s.figureId === f.id; }).map(nameOf), sub = sts.join(', ');
      a.push({k: 'fig', t: 'Nhân vật', id: f.id, name: f.name || '', sub: sub, n: norm(f.name), s: norm(sub), o: norm(extra(f))});
    });
    d.H.forEach(function (x) { a.push({k: 'site', t: 'Địa danh', id: x.id, name: nameOf(x), sub: '', n: norm(nameOf(x)), s: '', o: norm(extra(x))}); });
    d.E.forEach(function (x) { a.push({k: 'site', t: 'Trận chiến / Sự kiện', id: x.id, name: nameOf(x), sub: '', n: norm(nameOf(x)), s: '', o: norm(extra(x))}); });
    idx = a.filter(function (x) { return x.n; }); idxKey = key; return idx;
  }
  function score(x, q, tk) {
    var n = x.n;
    if (n === q) return 100;
    if (n.indexOf(q) === 0) return 90;
    if ((' ' + n).indexOf(' ' + q) > -1) return 80;
    if (n.indexOf(q) > -1) return 70;
    var all = function (h) { return tk.every(function (t) { return h.indexOf(t) > -1; }); };
    if (all(n)) return 60;
    if (all(n + ' ' + x.s)) return 40;
    if (all(n + ' ' + x.s + ' ' + x.o)) return 15;
    return 0;
  }

  function mark(i) {
    var items = box.querySelectorAll('.sr-i'); act = i;
    Array.prototype.forEach.call(items, function (b, j) { b.classList.toggle('act', j === i); });
    if (items[i] && items[i].scrollIntoView) items[i].scrollIntoView({block: 'nearest'});
  }
  function run() {
    var raw = inp.value, q = norm(raw);
    act = -1;
    if (!q) { box.classList.remove('on'); box.innerHTML = ''; box._r = []; return; }
    var tk = q.split(' '), out = [];
    index().forEach(function (x) { var s = score(x, q, tk); if (s) out.push({x: x, s: s}); });
    out.sort(function (a, b) { return b.s - a.s || a.x.name.localeCompare(b.x.name, 'vi'); });
    var show = out.slice(0, 40);
    box.innerHTML = show.length
      ? '<div class="sr-no" style="font-style:normal;padding:6px 12px">' + out.length + ' kết quả cho “' + esc(raw.trim()) + '”</div>' +
        show.map(function (o, i) { return '<button type="button" class="sr-i" role="option" data-i="' + i + '"><small>' + esc(o.x.t) + '</small><b>' + esc(o.x.name) + '</b>' + (o.x.sub ? '<span>' + esc(o.x.sub) + '</span>' : '') + '</button>'; }).join('')
      : '<div class="sr-no">Không tìm thấy kết quả phù hợp với “' + esc(raw.trim()) + '”.</div>';
    box._r = show; box.classList.add('on');
  }
  function pick(x) {
    var M = window.DAUAN_MAP || {};
    box.classList.remove('on'); inp.value = x.name;
    if (x.k === 'site') { if (M.go) M.go(x.id); return; }
    var sid = x.k === 'street' ? x.id : null;
    if (x.k === 'fig') { var s = data().ST.filter(function (z) { return z.figureId === x.id; })[0]; sid = s && s.id; }
    var el = sid && (document.querySelector('#dnList .item[data-sid="' + sid + '"]') || document.querySelector('.item[data-sid="' + sid + '"]'));
    if (!el && x.k === 'fig') el = document.querySelector('#dnList .item[data-fid="' + x.id + '"]') || document.querySelector('#dnList .item[data-id="' + x.id + '"]');
    if (el) { el.click(); if (el.scrollIntoView) el.scrollIntoView({block: 'nearest'}); }
  }

  function findOld(side) {
    return Array.prototype.filter.call(side.querySelectorAll('input'), function (i) {
      return !i.dataset.sr && /tim ten duong|danh nhan/.test(norm(i.placeholder));
    })[0];
  }
  function setup() {
    var side = document.querySelector('.side'); if (!side) return;
    // bỏ dòng chữ "ĐƯỜNG PHỐ DANH NHÂN"
    Array.prototype.forEach.call(side.querySelectorAll('.sec-t,h2,h3,h4,label'), function (h) {
      if (norm(h.textContent) === 'duong pho danh nhan') h.remove();
    });
    if (inp && document.contains(inp)) return;
    var old = findOld(side); if (!old) return;
    inp = old.cloneNode(false); inp.value = ''; inp.placeholder = PH; inp.dataset.sr = '1';
    inp.setAttribute('aria-label', PH); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('type', 'search');
    old.parentNode.replaceChild(inp, old);
    if (!box || !document.contains(box)) {
      box = document.createElement('div'); box.className = 'sr-box'; box.setAttribute('role', 'listbox');
      box.addEventListener('click', function (e) { var b = e.target.closest('.sr-i'); if (b && box._r) pick(box._r[+b.dataset.i].x); });
    }
    inp.parentNode.insertBefore(box, inp.nextSibling);
    inp.addEventListener('input', run);
    inp.addEventListener('focus', function () { if (inp.value.trim()) run(); });
    inp.addEventListener('keydown', function (e) {
      var n = box.querySelectorAll('.sr-i').length;
      if (e.key === 'Escape') { inp.value = ''; run(); }
      else if (e.key === 'ArrowDown' && n) { e.preventDefault(); mark((act + 1) % n); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); mark((act - 1 + n) % n); }
      else if (e.key === 'Enter') { e.preventDefault(); var r = box._r && box._r[act < 0 ? 0 : act]; if (r) pick(r.x); }
    });
  }

  if (!document.getElementById('srStyle')) {
    var st = document.createElement('style'); st.id = 'srStyle';
    st.textContent = '.sr-box{display:none;max-height:50vh;overflow:auto;margin:8px 0 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg)}.sr-box.on{display:block}' +
      '.sr-i{display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;width:100%;text-align:left;padding:8px 12px;border:0;border-bottom:1px solid var(--border);background:none;color:var(--text);font-family:inherit;font-size:.875rem;cursor:pointer}.sr-i:last-child{border-bottom:0}.sr-i:hover,.sr-i.act{background:var(--surface-2)}' +
      '.sr-i small{flex:none;min-width:74px;color:var(--gold);font-weight:700;font-size:max(.72rem,.8rem);text-transform:uppercase;letter-spacing:.05em}.sr-i span{color:var(--muted);font-size:.8rem}.sr-no{padding:10px 12px;color:var(--muted);font-size:.875rem;font-style:italic}';
    document.head.appendChild(st);
  }
  setup();
  var side = document.querySelector('.side');
  if (side && window.MutationObserver) new MutationObserver(setup).observe(side, {childList: true, subtree: true});
  addEventListener('load', setup);
})();
