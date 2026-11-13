/* DẤU ẤN – Tài khoản & chế độ khách (dùng chung với trang chủ). Cần phần tử #acctBtn, #acctDlg trong HTML. */
(function(){
/* ===== Đăng ký / tài khoản =====
   3 cấp đăng ký: Quản trị viên (admin), Sinh viên, Người dân + Chế độ khách (không cần đăng ký).
   - Dữ liệu lưu ở localStorage của trình duyệt (khóa dauan_accounts, dauan_active); KHÔNG lưu mật khẩu.
   - Đây là bản giao diện (chưa có máy chủ): mã quản trị bên dưới chỉ là rào chắn nhẹ, ai xem mã nguồn cũng thấy.
     Muốn phân quyền thật cần có backend. Hãy đổi ADMIN_CODE trước khi đưa lên web.
   - Muốn phân quyền nội dung: dùng window.DAUAN_USER() -> {id,name,email,role,level}; sự kiện 'dauan:userchange'. */
var ADMIN_CODE='DAUAN-ADMIN';
var ROLES={admin:{label:'Quản trị viên',level:1,icon:'fa-user-shield'},student:{label:'Sinh viên',level:2,icon:'fa-user-graduate'},citizen:{label:'Người dân',level:3,icon:'fa-user'},guest:{label:'Khách',level:0,icon:'fa-user'}};
var GUEST={id:'guest',name:'Khách',email:'Chế độ khách',role:'guest'};
var MAX_ACC=8,accts=[],activeId='guest';
function aesc(t){return String(t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function accLoad(){
  try{var a=JSON.parse(localStorage.getItem('dauan_accounts')||'[]');
    accts=(Array.isArray(a)?a:[]).filter(function(x){return x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.email==='string'&&ROLES[x.role]&&x.role!=='guest'}).slice(0,MAX_ACC);
    activeId=localStorage.getItem('dauan_active')||'guest'}catch(e){accts=[];activeId='guest'}
  if(activeId!=='guest'&&!accts.some(function(x){return x.id===activeId}))activeId='guest';
}
function accSave(){try{localStorage.setItem('dauan_accounts',JSON.stringify(accts));localStorage.setItem('dauan_active',activeId)}catch(e){}}
function accCur(){return activeId==='guest'?GUEST:accts.filter(function(x){return x.id===activeId})[0]||GUEST}
window.DAUAN_USER=function(){var u=accCur();return{id:u.id,name:u.name,email:u.email,role:u.role,level:ROLES[u.role].level}};
var acctBtn=document.getElementById('acctBtn'),acctDlg=document.getElementById('acctDlg'),acctList=document.getElementById('acctList'),
    acctForm=document.getElementById('acctForm'),acctMsg=document.getElementById('acctMsg'),rgErr=document.getElementById('rgErr');
function accNav(){
  var u=accCur(),g=u.id==='guest';
  document.getElementById('acctLbl').textContent=g?'Đăng ký':u.name;
  acctBtn.querySelector('i').className='fas '+(g?'fa-user-plus':ROLES[u.role].icon);
  acctBtn.title=g?'Đăng ký / quản lý tài khoản':u.name+' • '+ROLES[u.role].label;
  document.documentElement.setAttribute('data-role',u.role);
  document.dispatchEvent(new CustomEvent('dauan:userchange',{detail:window.DAUAN_USER()}));
}
function accRender(){
  var all=[GUEST].concat(accts);
  acctList.innerHTML=all.map(function(u){
    var on=u.id===activeId,r=ROLES[u.role];
    return '<div class="acc'+(on?' on':'')+'" data-id="'+aesc(u.id)+'" tabindex="0" role="button" aria-label="'+aesc(u.name)+', '+aesc(r.label)+(on?', đang dùng':'')+'">'
      +'<div class="av"><i class="fas '+r.icon+'"></i></div>'
      +'<div class="inf"><div class="nm">'+aesc(u.name)+(on?'<span class="acc-on">ĐANG DÙNG</span>':'')+'</div>'
      +'<div class="em">'+(u.id==='guest'?'Không cần đăng ký • Chế độ khách':aesc(u.email)+' • '+r.label)+'</div></div>'
      +'<div class="acc-act">'+(on?'':'<button type="button" class="acc-mini" data-use="'+aesc(u.id)+'">Nhấp đúp</button>')
      +(u.id!=='guest'?'<button type="button" class="acc-mini" data-del="'+aesc(u.id)+'" aria-label="Xóa tài khoản '+aesc(u.name)+'" title="Xóa tài khoản"><i class="fas fa-trash"></i></button>':'')+'</div></div>';
  }).join('');
}
function accUse(id){
  activeId=id;accSave();accNav();accRender();
  var u=accCur();acctMsg.textContent='Đã chuyển sang: '+u.name+' ('+ROLES[u.role].label+').';
}
function accToggleForm(open){
  acctForm.classList.toggle('open',open);document.getElementById('acctAdd').style.display=open?'none':'flex';rgErr.textContent='';
  if(open)document.getElementById('rgName').focus();else acctForm.reset();
  document.getElementById('rgCodeWrap').hidden=true;
}
acctBtn.addEventListener('click',function(){accRender();acctMsg.textContent='';accToggleForm(false);acctDlg.showModal()});
document.getElementById('acctX').addEventListener('click',function(){acctDlg.close()});
acctDlg.addEventListener('click',function(e){if(e.target===acctDlg)acctDlg.close()});
document.getElementById('acctAdd').addEventListener('click',function(){
  if(accts.length>=MAX_ACC){acctMsg.textContent='Đã đạt tối đa '+MAX_ACC+' tài khoản. Hãy xóa bớt để thêm mới.';return}
  accToggleForm(true)});
document.getElementById('rgCancel').addEventListener('click',function(){accToggleForm(false)});
acctList.addEventListener('dblclick',function(e){var c=e.target.closest('.acc');if(c&&!e.target.closest('[data-del]'))accUse(c.dataset.id)});
acctList.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.classList.contains('acc'))accUse(e.target.dataset.id)});
acctList.addEventListener('click',function(e){
  var u=e.target.closest('[data-use]'),d=e.target.closest('[data-del]');
  if(u){accUse(u.dataset.use);return}
  if(d){var id=d.dataset.del,x=accts.filter(function(a){return a.id===id})[0];
    if(x&&confirm('Xóa tài khoản "'+x.name+'" khỏi thiết bị này?')){accts=accts.filter(function(a){return a.id!==id});if(activeId===id)activeId='guest';accSave();accNav();accRender();acctMsg.textContent='Đã xóa tài khoản.'}}
});
document.getElementById('rgRoles').addEventListener('change',function(){
  var v=acctForm.querySelector('input[name=rgRole]:checked').value;document.getElementById('rgCodeWrap').hidden=v!=='admin'});
acctForm.addEventListener('submit',function(e){
  e.preventDefault();
  var name=document.getElementById('rgName').value.replace(/\s+/g,' ').trim(),
      email=document.getElementById('rgEmail').value.trim().toLowerCase(),
      role=acctForm.querySelector('input[name=rgRole]:checked').value,code=document.getElementById('rgCode').value;
  if(name.length<2){rgErr.textContent='Vui lòng nhập họ và tên (từ 2 ký tự).';return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){rgErr.textContent='Email chưa đúng định dạng.';return}
  if(accts.some(function(a){return a.email===email})){rgErr.textContent='Email này đã đăng ký. Hãy nhấp đúp vào tài khoản trong danh sách để chuyển.';return}
  if(role==='admin'&&code!==ADMIN_CODE){rgErr.textContent='Mã xác nhận quản trị viên không đúng.';return}
  var id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  accts.push({id:id,name:name,email:email,role:role});
  activeId=id;accSave();accNav();accRender();accToggleForm(false);
  acctMsg.textContent='Đăng ký thành công. Đang dùng: '+name+' ('+ROLES[role].label+').';
});
accLoad();accNav();

})();
