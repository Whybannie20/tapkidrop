// === 1. INIT ===
try {
  window.sb = supabase.createClient(
    "https://ccskkieoldeyqrpxxpnb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI"
  );
  console.log("[OK] Supabase подключен");
} catch(e) { console.error("Supabase init error", e); }

// === 2. CONFIG ===
const TG_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_CHAT = "-1003371505343";
window.cart = JSON.parse(localStorage.getItem('cart')) || [];
window.pvz = JSON.parse(localStorage.getItem('pvz')) || {city:'', addr:''};
let prods = [];

// === 3. NAVIGATION ===
window.go = (id) => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(id); if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[onclick*="${id}"]`); if(btn) btn.classList.add('active');
  window.scrollTo(0,0);
  if(id==='admin') loadAdmin();
  if(id==='my-orders') loadOrders();
};
document.querySelectorAll('.cat-btn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  render(document.querySelector('.cat-btn.active').dataset.cat === 'all' ? prods : prods.filter(p=>p.category===document.querySelector('.cat-btn.active').dataset.cat));
});
document.getElementById('search-input')?.addEventListener('input', e => render(prods.filter(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()))));

// === 4. PRODUCTS ===
async function loadProds() {
  const {data, error} = await window.sb.from('products').select('*').order('created_at', {ascending:false});
  if(error) { console.error(error); return; }
  prods = data || [];
  render(prods.slice(0,4));
}

function render(list) {
  const g = document.getElementById('catalog-grid') || document.getElementById('home-grid');
  if(!g) return;
  g.innerHTML = list.map(p => `
    <div class="card" onclick="window.openProd('${p.id}')">
      <div class="card-img">${p.image_url ? `<img src="${p.image_url}" onerror="this.parentElement.textContent='👟'">` : '👟'}</div>
      <div class="card-body"><div class="card-brand">${p.category}</div><div class="card-name">${p.name}</div><div class="card-price"><span class="now">${p.price.toLocaleString('ru')} ₽</span></div><button class="btn-cart" onclick="event.stopPropagation(); window.addCart('${p.id}')">В корзину</button></div>
    </div>`).join('');
}

window.openProd = (id) => {
  const p = prods.find(x=>x.id===id); if(!p) return;
  window._cur = p;
  document.getElementById('detail-img').innerHTML = p.image_url ? `<img src="${p.image_url}">` : '👟';
  document.getElementById('detail-brand').textContent = p.category;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = p.price.toLocaleString('ru') + ' ₽';
  document.getElementById('detail-desc').textContent = p.description || '';
  document.getElementById('sizes-container').innerHTML = (p.sizes||[]).map(s => `<button class="size-btn" onclick="document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active'); window._sz='${s}'">${s}</button>`).join('');
  window.go('product');
};

window.addCart = (id) => {
  const p = prods.find(x=>x.id===id);
  const ex = window.cart.find(x=>x.id===id);
  if(ex) ex.qty++; else window.cart.push({...p, qty:1});
  localStorage.setItem('cart', JSON.stringify(window.cart)); updateCart(); alert('✅ Добавлено');
};
window.addToCartFromDetail = () => { if(!window._cur || !window._sz) return alert('Выбери размер'); window.addCart(window._cur.id); };

function updateCart() {
  const b = document.getElementById('cart-badge'); if(b) b.textContent = window.cart.reduce((s,i)=>s+(i.qty||1),0);
  const emp = document.getElementById('cart-empty'), lay = document.getElementById('cart-layout');
  if(!emp || !lay) return;
  if(!window.cart.length) { emp.style.display='block'; lay.style.display='none'; return; }
  emp.style.display='none'; lay.style.display='block';
  document.getElementById('cart-items').innerHTML = window.cart.map((i,k) => `<div class="cart-item"><div class="cart-item-name">${i.name} (${i.size||'?'})</div><div class="cart-controls"><button onclick="chgQ(${k},-1)">−</button><span>${i.qty||1}</span><button onclick="chgQ(${k},1)">+</button><button style="color:red;background:none;border:none;cursor:pointer" onclick="rmQ(${k})">🗑</button></div></div>`).join('');
  document.getElementById('cart-total').textContent = window.cart.reduce((s,i)=>s+i.price*(i.qty||1),0).toLocaleString('ru')+' ₽';
}
window.chgQ = (k,d) => { window.cart[k].qty = Math.max(1, (window.cart[k].qty||1)+d); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };
window.rmQ = (k) => { window.cart.splice(k,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };

// === 5. CHECKOUT (АДРЕС ТОЛЬКО ЗДЕСЬ) ===
window.checkout = async () => {
  console.log("Checkout start");
  const btn = document.getElementById('checkout-btn');
  const { data: { user } } = await window.sb.auth.getUser();
  if(!user) return alert('Войдите в аккаунт');
  if(!window.cart.length) return alert('Корзина пуста');
  
  // ПРОВЕРКА АДРЕСА: если нет -> открываем окно и останавливаем
  if(!window.pvz.city || !window.pvz.addr) {
    window.openPVZ();
    return alert('⚠️ Сначала укажите адрес доставки');
  }

  const total = window.cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const items = window.cart.map(i=>`${i.name} (${i.size||'?'}) x${i.qty}`).join(', ');
  const addr = `${window.pvz.city}, ${window.pvz.addr}`;
  
  btn.disabled = true; btn.textContent = '⏳ Оформление...';
  try {
    const {data:o, error} = await window.sb.from('orders').insert({ user_email: user.email, user_name: user.email.split('@')[0], items, total: total.toLocaleString('ru')+' ₽', address: addr, status: 'new' }).select().single();
    if(error) throw error;
    
    // TG в фоне
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chat_id:TG_CHAT, text:`📦 <b>ЗАКАЗ</b>\n👤 ${o.user_email}\n🛍️ ${o.items}\n💰 ${o.total}\n📍 ${o.address}`, parse_mode:'HTML'}) }).catch(console.error);

    window.cart = []; localStorage.setItem('cart','[]'); updateCart();
    alert('✅ Заказ оформлен!'); window.go('my-orders');
  } catch(e) { alert('❌ '+e.message); }
  finally { btn.disabled = false; btn.textContent = 'Оформить'; }
};

// === 6. ORDERS ===
window.loadOrders = async () => {
  const c = document.getElementById('my-orders-list');
  const { data: { user } } = await window.sb.auth.getUser();
  if(!user) { c.innerHTML = 'Войдите'; return; }
  const {data} = await window.sb.from('orders').select('*').eq('user_email', user.email).order('created_at',{ascending:false});
  c.innerHTML = data?.length ? data.map(o => `<div style="background:#fff;padding:12px;margin-bottom:10px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.1)"><div style="display:flex;justify-content:space-between"><b>#${o.id.slice(0,8)}</b><span>${o.status}</span></div><div style="font-size:0.9rem;margin:4px 0">${o.items}</div><div>${o.address}</div><div style="font-weight:700">${o.total}</div>${o.qr_image_url?`<img src="${o.qr_image_url}" style="max-width:150px;margin-top:8px;border-radius:6px">`:''}</div>`).join('') : '<p style="text-align:center;color:#888">Нет заказов</p>';
};

// === 7. ADMIN ===
async function loadAdmin() {
  const {count} = await window.sb.from('orders').select('*', {count:'exact',head:true});
  document.getElementById('st-orders').textContent = count||0;
  document.getElementById('st-products').textContent = prods.length;
  const list = document.getElementById('admin-prods');
  list.innerHTML = prods.map(p => `<div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #eee"><span>${p.name} (${p.price}₽)</span><button onclick="window.delProd('${p.id}')" style="color:red;background:none;border:none;cursor:pointer">🗑</button></div>`).join('');
}

window.addProd = async () => {
  const n = document.getElementById('add-name').value; const p = Number(document.getElementById('add-price').value);
  if(!n||!p) return alert('Заполни имя и цену');
  const d = { name:n, price:p, category:document.getElementById('add-cat').value, sizes:document.getElementById('add-sizes').value.split(',').map(s=>s.trim()), image_url:document.getElementById('add-img').value, description:document.getElementById('add-desc').value };
  const btn = event.target; btn.disabled=true; btn.textContent='⏳...';
  try { await window.sb.from('products').insert(d); alert('✅ Добавлено'); ['add-name','add-price','add-img','add-desc'].forEach(id=>document.getElementById(id).value=''); loadProds(); }
  catch(e) { alert('❌ '+e.message); } finally { btn.disabled=false; btn.textContent='💾 Опубликовать'; }
};
window.delProd = async (id) => { if(confirm('Удалить?')) { await window.sb.from('products').delete().eq('id',id); loadProds(); loadAdmin(); } };

// === 8. AUTH ===
let isLogin = true;
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); isLogin = t.dataset.tab==='login'; document.getElementById('auth-btn').textContent = isLogin?'Войти':'Регистрация';
});
document.getElementById('auth-form').onsubmit = async e => {
  e.preventDefault(); const em = document.getElementById('email-in').value, pw = document.getElementById('pass-in').value;
  const err = document.getElementById('auth-err'); err.style.display='none';
  const {error} = isLogin ? await window.sb.auth.signInWithPassword({email:em,password:pw}) : await window.sb.auth.signUp({email:em,password:pw});
  if(error) { err.textContent=error.message; err.style.display='block'; }
};
window.sb.auth.onAuthStateChange((ev, sess) => {
  const u = sess?.user;
  document.getElementById('auth-flow').style.display = u?'none':'block';
  document.getElementById('profile-acts').style.display = u?'block':'none';
  document.getElementById('profile-display-name').textContent = u?.email?.split('@')[0] || 'Гость';
  document.getElementById('profile-email').textContent = u?.email || 'Войдите';
});
document.getElementById('logout-btn').onclick = () => window.sb.auth.signOut();

// === 9. MODALS & CHAT (ЧЕТКИЙ КОНТРОЛЬ) ===
window.openPVZ = () => { document.getElementById('pvz-modal').style.display = 'flex'; };
window.closePVZ = () => { document.getElementById('pvz-modal').style.display = 'none'; };
window.savePVZ = () => { window.pvz = {city:document.getElementById('pvz-city').value, addr:document.getElementById('pvz-addr').value}; localStorage.setItem('pvz',JSON.stringify(window.pvz)); window.closePVZ(); alert('✅ Адрес сохранён'); };

window.openChat = () => { 
  document.getElementById('chat-modal').style.display = 'flex'; 
  document.getElementById('chat-body').innerHTML = '<div style="background:#f0f0f0;padding:10px;border-radius:8px;align-self:flex-start">👋 Привет! Чем помочь?</div>'; 
};
window.closeChat = () => { document.getElementById('chat-modal').style.display = 'none'; };
window.sendMsg = () => {
  const inp=document.getElementById('chat-in'), txt=inp.value.trim(); if(!txt) return;
  const b=document.getElementById('chat-body');
  b.innerHTML+=`<div style="background:var(--primary);color:#fff;padding:10px;border-radius:8px;align-self:end">${txt}</div>`;
  inp.value=''; b.scrollTop=b.scrollHeight;
  setTimeout(()=>{ b.innerHTML+=`<div style="background:#f0f0f0;padding:10px;border-radius:8px;align-self:flex-start">🤔 Оператор ответит скоро.</div>`; b.scrollTop=b.scrollHeight; },500);
};

// === 10. START ===
loadProds(); updateCart();
