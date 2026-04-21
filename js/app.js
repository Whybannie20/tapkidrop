// === 1. SUPABASE INIT (КЛЮЧИ ВСТАВЛЕНЫ) ===
const SUPABASE_URL = "https://ccskkieoldeyqrpxxpnb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
console.log("[SUPABASE] Подключено");

// === 2. TELEGRAM (НЕ БЛОКИРУЕТ UI) ===
const TG_BOT_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_ADMIN_CHAT_ID = "-1003371505343";
function sendTG(data) {
  const text = `📦 <b>НОВЫЙ ЗАКАЗ #${String(data.id).slice(0,8)}</b>
👤 <b>Клиент:</b> ${data.userName}
📧 <b>Email:</b> ${data.email}
📍 <b>Адрес:</b> ${data.address}

🛍️ <b>Состав:</b>
${data.items}

💰 <b>Итого:</b> ${data.total}
📅 <b>Дата:</b> ${data.date}`;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_ADMIN_CHAT_ID, text, parse_mode:'HTML'})
  }).then(r=>r.json()).then(d=>console.log("[TG]", d.ok?"✅ Доставлено":"❌",d.description||'')).catch(console.error);
}

// === 3. GLOBALS ===
const ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];
window.cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
window.purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let products = []; 
let currentProductId = null;
let selectedSize = null;
window.selectedPVZ = JSON.parse(localStorage.getItem('selectedPVZ')) || { city: '', address: '', details: '' };

const categories = [
  {id:'all',name:'Все'},{id:'designer',name:'Дизайнерские'},{id:'kids',name:'Детские'},
  {id:'swag',name:'Сваг'},{id:'classics',name:'Классика'},{id:'sale',name:'Распродажа'}
];

// === 4. LOAD PRODUCTS (REAL-TIME) ===
async function loadProducts() {
  console.log("[DB] Загрузка товаров...");
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if(error) return console.error("[DB] Ошибка загрузки:", error.message);
  
  products = data.map(d => ({ 
    id: d.id, name:d.name, price:d.price, category:d.category, 
    sizes: d.sizes || [], desc: d.description, 
    images: [d.image_url || '👟'], rating: d.rating || 5, reviews: d.reviews_count || 0 
  }));
  console.log(`[DB] Найдено: ${products.length}`);
  renderGrid('home-grid', products.slice(0,4));
  renderGrid('catalog-grid', products);
  renderAdminProductsList();
}

// Слушаем изменения в реальном времени
supabase.channel('products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts()).subscribe();

const renderGrid = (id, list) => {
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = list.map(p => {
    const img = p.images[0];
    return `<div class="card" onclick="window.openProduct('${p.id}')">
      <div class="card-img">${img.startsWith('http')?`<img src="${img}">`:img}</div>
      <div class="card-body">
        <div class="card-brand">${categories.find(c=>c.id===p.category)?.name||p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-price"><span class="now">${p.price.toLocaleString('ru')} ₽</span></div>
        <button class="btn-cart" onclick="event.stopPropagation(); window.addToCart('${p.id}')">В корзину</button>
      </div>
    </div>`;
  }).join('');
};

// === 5. NAVIGATION ===
window.navigate = target => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(target); if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-target="${target}"]`); if(btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  if(target === 'admin') renderAdmin();
  if(target === 'my-orders') renderOrders();
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => window.navigate(b.dataset.target));

// === 6. PRODUCT & CART ===
window.openProduct = id => {
  const p = products.find(x => x.id === id); if(!p) return;
  currentProductId = id; selectedSize = null;
  const img = p.images[0];
  document.getElementById('detail-img').innerHTML = img.startsWith('http') ? `<img src="${img}">` : img;
  document.getElementById('detail-brand').textContent = categories.find(c=>c.id===p.category)?.name || p.category;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = p.price.toLocaleString('ru') + ' ₽';
  document.getElementById('detail-desc').textContent = p.desc || '';
  document.getElementById('sizes-container').innerHTML = (p.sizes||[]).map(s => `<button class="size-btn" onclick="window.selectSize(this,'${s}')">${s}</button>`).join('');
  
  const thumbs = document.getElementById('product-thumbs'); thumbs.innerHTML = '';
  if(img.startsWith('http')) {
    const b = document.createElement('button'); b.className = 'thumb-btn active';
    b.innerHTML = `<img src="${img}">`; thumbs.appendChild(b);
  }
  window.navigate('product');
};
window.selectSize = (btn, size) => { document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedSize = size; };
window.addToCartFromDetail = () => {
  if(!selectedSize) return alert('Выберите размер');
  window.cart.push({...products.find(x=>x.id===currentProductId), size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); alert('✅ Добавлено');
};
window.addToCart = id => {
  const p = products.find(x=>x.id===id); const ex = window.cart.find(x=>x.id===id);
  if(ex) ex.qty++; else window.cart.push({...p, qty:1});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart();
};

const updateCart = () => {
  const badge = document.getElementById('cart-badge'); if(badge) badge.textContent = window.cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty = document.getElementById('cart-empty'), layout = document.getElementById('cart-layout');
  if(!empty||!layout) return;
  if(!window.cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items').innerHTML = window.cart.map((i,idx)=>`
    <div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${i.name}</div><div class="cart-item-meta">${i.price.toLocaleString('ru')} ₽ • ${i.size||'?'}</div>
    <div class="cart-controls"><button class="qty-btn" onclick="window.changeQty(${idx},-1)">−</button><span>${i.qty||1}</span><button class="qty-btn" onclick="window.changeQty(${idx},1)">+</button>
    <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="window.removeItem(${idx})">🗑</button></div></div></div>`).join('');
  document.getElementById('cart-total').textContent = window.cart.reduce((s,i)=>s+i.price*(i.qty||1),0).toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { window.cart[idx].qty=(window.cart[idx].qty||1)+d; if(window.cart[idx].qty<1)window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };
window.removeItem = idx => { window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };

// === 7. CHECKOUT (SUPABASE + TG) ===
window.checkout = async () => {
  console.log("=== [CHECKOUT] НАЧАЛО ===");
  const btn = document.getElementById('checkout-btn');
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) { window.navigate('profile'); return alert('⚠️ Войдите в аккаунт'); }
  if (!window.cart.length) return alert('⚠️ Корзина пуста');
  
  const addr = `${window.selectedPVZ.city||''}, ${window.selectedPVZ.address||''} ${window.selectedPVZ.details||''}`.replace(/,\s*,/g,',').trim();
  if (!addr || addr === ', ') { window.openPVZModal(); return alert('⚠️ Укажите адрес'); }

  const total = window.cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const itemsText = window.cart.map(i => `• ${i.name} (${i.size||'?'})`).join('\n');

  btn.disabled = true; btn.textContent = '⏳ Оформление...';
  console.log("[CHECKOUT] Отправка в Supabase...");

  try {
    const { data, error } = await supabase.from('orders').insert([{
      user_id: user.id, user_email: user.email, user_name: user.email.split('@')[0],
      items: itemsText, total: total.toLocaleString('ru') + ' ₽', address: addr,
      status: 'new', qr_image_url: null, created_at: new Date().toISOString()
    }]).select().single();

    if (error) throw error;
    console.log("[CHECKOUT] ✅ Заказ создан:", data.id);

    // TG в фоне (не блокирует успех)
    sendTG({ id: data.id, userName: data.user_name, email: data.user_email, items: itemsText, address: addr, total: data.total });

    window.cart=[]; localStorage.setItem('cart','[]'); updateCart();
    alert('✅ Заказ оформлен!');
    window.navigate('my-orders');
  } catch(e) {
    console.error("[CHECKOUT] ❌", e);
    alert('❌ Ошибка: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Оформить заказ';
    console.log("[CHECKOUT] Кнопка разблокирована");
  }
};

// === 8. ORDERS (CLIENT) ===
window.renderOrders = async () => {
  const c = document.getElementById('my-orders-list'); if(!c) return;
  const { data: { user } } = await supabase.auth.getUser();
  if(!user){ c.innerHTML='<p style="text-align:center;color:var(--muted);padding:20px">Войдите</p>'; return; }
  
  const { data, error } = await supabase.from('orders').select('*').eq('user_email', user.email).order('created_at', { ascending: false });
  if(error) { c.innerHTML=`<p style="color:var(--danger)">Ошибка загрузки заказов</p>`; return; }
  
  c.innerHTML = data.length ? data.map(o=>{
    const sm={new:'Ожидает',assembling:'В сборке',shipping:'В пути',delivered:'Доставлен'};
    const sc=`status-${o.status}`;
    return `<div class="order-card ${sc}"><div class="order-head"><span class="order-id">#${o.id.slice(0,8)}</span><span class="status-badge ${sc}">${sm[o.status]}</span></div>
    <div class="order-body"><div class="order-items">🛍️ ${o.items}</div><div>📍 ${o.address}</div></div><div class="order-price">${o.total}</div>
    ${o.status==='delivered'&&o.qr_image_url?`<div class="qr-section"><div class="qr-label">📱 Код для получения:</div><img src="${o.qr_image_url}"><p style="font-size:0.75rem;color:var(--muted)">Покажите сотруднику ПВЗ</p></div>`:''}</div>`;
  }).join('') : '<p style="text-align:center;color:var(--muted);padding:30px">Нет заказов</p>';
};

// === 9. ADMIN ===
function showToast(msg){const t=document.getElementById('level-toast');document.getElementById('toast-desc').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}
async function renderAdmin() {
  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  document.getElementById('stat-orders').textContent = count || 0;
  document.getElementById('stat-products').textContent = products.length;
  renderAdminProductsList();
}
function renderAdminProductsList() {
  const list = document.getElementById('admin-products-list'); if(!list) return;
  list.innerHTML = products.length===0 ? '<p style="color:var(--muted)">Нет товаров</p>' : products.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border)">
      <div><b>${p.name}</b><br><small>${p.price.toLocaleString('ru')} ₽</small></div>
      <div style="display:flex;gap:8px">
        <button class="btn" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border)" onclick="window.editProduct('${p.id}')">✏️</button>
        <button class="btn" style="padding:6px 10px;font-size:0.8rem;background:rgba(220,53,69,0.1);color:var(--danger);border:1px solid rgba(220,53,69,0.2)" onclick="window.deleteProduct('${p.id}')">🗑</button>
      </div>
    </div>`).join('');
}

window.saveProduct = async () => {
  const btn = document.getElementById('prod-submit-btn');
  const editId = document.getElementById('edit-prod-id').value;
  const name = document.getElementById('new-prod-name').value.trim();
  const price = document.getElementById('new-prod-price').value;
  if(!name || !price) return alert('❌ Заполни название и цену');
  
  btn.disabled = true; btn.textContent = '⏳ Сохранение...';
  let imgUrl = document.getElementById('new-prod-img').value.trim();
  const fileInput = document.getElementById('new-prod-file');
  
  try {
    if(fileInput.files[0]) {
      btn.textContent = '⏳ Загрузка фото...';
      const file = fileInput.files[0];
      const fileName = `products/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, file);
      if(error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      imgUrl = data.publicUrl;
    }
    if(!imgUrl) imgUrl = '👟';

    const prod = { name, price: Number(price), category: document.getElementById('new-prod-cat').value, sizes: document.getElementById('new-prod-sizes').value.split(',').map(s=>s.trim()), description: document.getElementById('new-prod-desc').value, image_url: imgUrl };
    
    if(editId) { const { error } = await supabase.from('products').update(prod).eq('id', editId); if(error) throw error; }
    else { const { error } = await supabase.from('products').insert(prod); if(error) throw error; }
    
    showToast('✅ Сохранено'); window.cancelEdit();
  } catch(e) { console.error(e); alert('❌ '+e.message); }
  finally { btn.disabled = false; btn.textContent = editId ? '💾 Сохранить' : '💾 Опубликовать'; }
};

window.editProduct = (id) => {
  const p = products.find(x => x.id === id); if(!p) return;
  document.getElementById('edit-prod-id').value = id;
  document.getElementById('new-prod-name').value = p.name;
  document.getElementById('new-prod-price').value = p.price;
  document.getElementById('new-prod-cat').value = p.category;
  document.getElementById('new-prod-sizes').value = p.sizes.join(',');
  document.getElementById('new-prod-desc').value = p.desc;
  document.getElementById('form-title').textContent = '✏️ Редактирование';
  document.getElementById('prod-submit-btn').textContent = '💾 Сохранить';
  document.getElementById('cancel-edit-btn').style.display = 'block';
};
window.cancelEdit = () => {
  document.getElementById('edit-prod-id').value = '';
  ['new-prod-name','new-prod-price','new-prod-sizes','new-prod-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('new-prod-cat').value = 'designer';
  document.getElementById('new-prod-file').value = '';
  document.getElementById('form-title').textContent = '📦 Добавить товар';
  document.getElementById('prod-submit-btn').textContent = '💾 Опубликовать';
  document.getElementById('cancel-edit-btn').style.display = 'none';
};
window.deleteProduct = async (id) => { if(confirm('🗑 Удалить?')) { await supabase.from('products').delete().eq('id', id); showToast('🗑 Удалено'); loadProducts(); } };

// === 10. AUTH (SUPABASE) ===
const authForm=document.getElementById('auth-form');
if(authForm){
  let isLogin=true;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); isLogin=t.dataset.tab==='login';
    document.getElementById('auth-submit').textContent=isLogin?'Войти':'Регистрация'; document.getElementById('auth-error').style.display='none';
  });
  authForm.onsubmit=async e=>{
    e.preventDefault();
    const em=document.getElementById('email-input').value.trim(), pw=document.getElementById('pass-input').value;
    const btn=document.getElementById('auth-submit'), err=document.getElementById('auth-error');
    err.style.display='none'; btn.disabled=true; btn.textContent='⏳...';
    try{
      let res = isLogin ? await supabase.auth.signInWithPassword({ email:em, password:pw }) : await supabase.auth.signUp({ email:em, password:pw });
      if(res.error) throw res.error;
    } catch(e){ err.textContent=e.message; err.style.display='block'; }
    finally { btn.disabled=false; btn.textContent=isLogin?'Войти':'Регистрация'; }
  };
  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    if(user){
      document.getElementById('auth-flow').style.display='none';
      document.getElementById('profile-actions').style.display='block';
      document.getElementById('profile-email').textContent=user.email;
      document.getElementById('profile-display-name').textContent=user.email.split('@')[0];
    } else {
      document.getElementById('auth-flow').style.display='block';
      document.getElementById('profile-actions').style.display='none';
      document.getElementById('profile-display-name').textContent='Гость';
      document.getElementById('profile-email').textContent='Войдите';
    }
  });
  document.getElementById('logout-btn').onclick=()=>{ supabase.auth.signOut(); };
}

// === 11. MISC ===
window.openPVZModal = () => { document.getElementById('pvz-city').value=window.selectedPVZ.city||''; document.getElementById('pvz-address').value=window.selectedPVZ.address||''; document.getElementById('pvz-details').value=window.selectedPVZ.details||''; document.getElementById('pvz-modal').style.display='flex'; };
window.closePVZModal = () => document.getElementById('pvz-modal').style.display='none';
window.savePVZ = () => { window.selectedPVZ = { city: document.getElementById('pvz-city').value, address: document.getElementById('pvz-address').value, details: document.getElementById('pvz-details').value }; localStorage.setItem('selectedPVZ', JSON.stringify(window.selectedPVZ)); alert('✅ Сохранено'); window.closePVZModal(); };

const faqDB = {'доставк|сроки':'🚚 1-3 дня. От 5000₽ бесплатно.','возврат':'↩️ 14 дней, бесплатно.','размер':'📏 По евро-сетке.','оплат':'💳 МИР, Visa, СБП.','оператор':'👨‍ Подключимся за 5 мин.'};
window.openSupportChat = () => { document.getElementById('support-modal').style.display='flex'; };
window.closeSupportChat = () => document.getElementById('support-modal').style.display='none';
window.sendChatMessageDirect = txt => { document.getElementById('chat-input').value=txt; window.sendChatMessage(); };
window.sendChatMessage = () => { const inp=document.getElementById('chat-input'), txt=inp.value.trim(); if(!txt) return; const box=document.getElementById('chat-messages'); box.innerHTML+=`<div class="msg user">${txt}</div>`; inp.value=''; box.scrollTop=box.scrollHeight; setTimeout(()=>{ const lower=txt.toLowerCase(); let reply=Object.entries(faqDB).find(([k])=>k.split('|').some(c=>lower.includes(c)))?.[1]; box.innerHTML+=`<div class="msg bot">${reply||'🤔 Не понял. Нажмите "Оператор".'}</div>`; box.scrollTop=box.scrollHeight; },400); };

// === 12. INIT ===
loadProducts();
updateCart();
