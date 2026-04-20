// === 1. FIREBASE INIT ===
try {
  const firebaseConfig = {
    apiKey: "AIzaSyBv1oWzM9P_mCGIDNYpcj5SehNmtOjzaX0",
    authDomain: "tapkidrop-7550b.firebaseapp.com",
    projectId: "tapkidrop-7550b",
    storageBucket: "tapkidrop-7550b.firebasestorage.app",
    messagingSenderId: "804177130427",
    appId: "1:804177130427:web:7b78618f21590dc6c6ca9e"
  };
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = firebase.storage();
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  console.log("[FB] Инициализация завершена");
} catch (e) { console.error("[FB] Ошибка:", e); }

// === 2. TELEGRAM CONFIG & SENDER ===
const TG_BOT_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_ADMIN_CHAT_ID = "-1003371505343";

async function sendTelegramNotification(data) {
  console.log("[TG] Отправка уведомления...");
  const text = `📦 <b>НОВЫЙ ЗАКАЗ #${String(data.id).slice(-6)}</b>
👤 <b>Клиент:</b> ${data.userName}
📧 <b>Email:</b> ${data.email}
📍 <b>Адрес:</b> ${data.address}

🛍️ <b>Состав заказа:</b>
${data.items}

💰 <b>Итого к оплате:</b> ${data.total}
📅 <b>Дата:</b> ${data.date}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_ADMIN_CHAT_ID, text, parse_mode: 'HTML' })
    });
    const result = await res.json();
    if(result.ok) console.log("[TG] ✅ Уведомление доставлено");
    else console.error("[TG] ❌ Ошибка API:", result.description);
  } catch(e) {
    console.error("[TG] ❌ Сетевая ошибка:", e);
  }
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

let productsUnsub = null;
let ordersUnsub = null;

const categories = [
  {id:'all',name:'Все'},{id:'designer',name:'Дизайнерские'},{id:'kids',name:'Детские'},
  {id:'swag',name:'Сваг'},{id:'classics',name:'Классика'},{id:'sale',name:'Распродажа'}
];

// === 4. SEED TEST PRODUCT ===
function seedTestProduct() {
  window.db.collection('products').get().then(snap => {
    if(snap.empty) {
      console.log("[DB] Добавляем тестовый товар...");
      window.db.collection('products').add({
        name: "Nike Air Max 97 Silver", price: 14990, category: "designer",
        sizes: ["39","40","41","42","43","44"], desc: "Легендарная модель.",
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"],
        rating: 4.9, reviews: 128, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).catch(e => console.error("[DB] Seed error:", e));
}

// === 5. LIVE DATA LOADERS ===
function loadProducts() {
  if(productsUnsub) productsUnsub();
  productsUnsub = window.db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snap => {
    products = [];
    snap.forEach(d => { products.push({ id: d.id, ...d.data() }); });
    console.log(`[DB] Товаров: ${products.length}`);
    renderGrid('home-grid', products.slice(0,4));
    renderGrid('catalog-grid', products);
    renderAdminProductsList();
  }, e => console.error("[DB] Listener error:", e));
}

const renderGrid = (id, list) => {
  const el = document.getElementById(id); if(!el) return;
  el.innerHTML = list.map(p => {
    const img = p.images?.[0] || '👟';
    return `<div class="card" onclick="window.openProduct('${p.id}')">
      <div class="card-img">${img.startsWith('http') ? `<img src="${img}">` : img}</div>
      <div class="card-body">
        <div class="card-brand">${categories.find(c=>c.id===p.category)?.name||p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-price"><span class="now">${(p.price||0).toLocaleString('ru')} ₽</span></div>
        <button class="btn-cart" onclick="event.stopPropagation(); window.addToCart('${p.id}')">В корзину</button>
      </div>
    </div>`;
  }).join('');
};

// === 6. NAVIGATION ===
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

// === 7. PRODUCT & CART ===
window.openProduct = id => {
  const p = products.find(x => x.id === id); if(!p) return;
  currentProductId = id; selectedSize = null;
  const img = p.images?.[0] || '👟';
  document.getElementById('detail-img').innerHTML = img.startsWith('http') ? `<img src="${img}">` : img;
  document.getElementById('detail-brand').textContent = categories.find(c=>c.id===p.category)?.name || p.category;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = (p.price||0).toLocaleString('ru') + ' ₽';
  document.getElementById('detail-desc').textContent = p.desc || '';
  document.getElementById('sizes-container').innerHTML = (p.sizes||[]).map(s => `<button class="size-btn" onclick="window.selectSize(this,'${s}')">${s}</button>`).join('');
  
  const thumbs = document.getElementById('product-thumbs'); thumbs.innerHTML = '';
  (p.images||[]).forEach((u,i) => {
    if(!u.startsWith('http')) return;
    const b = document.createElement('button'); b.className = `thumb-btn ${i===0?'active':''}`;
    b.innerHTML = `<img src="${u}">`;
    b.onclick = () => { document.getElementById('detail-img').innerHTML = `<img src="${u}">`; document.querySelectorAll('.thumb-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); };
    thumbs.appendChild(b);
  });
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
    <div class="cart-item"><div class="cart-item-info"><div class="cart-item-name">${i.name}</div><div class="cart-item-meta">${(i.price||0).toLocaleString('ru')} ₽ • ${i.size||'?'}</div>
    <div class="cart-controls"><button class="qty-btn" onclick="window.changeQty(${idx},-1)">−</button><span>${i.qty||1}</span><button class="qty-btn" onclick="window.changeQty(${idx},1)">+</button>
    <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="window.removeItem(${idx})">🗑</button></div></div></div>`).join('');
  document.getElementById('cart-total').textContent = window.cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0).toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { window.cart[idx].qty=(window.cart[idx].qty||1)+d; if(window.cart[idx].qty<1)window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };
window.removeItem = idx => { window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };

// === 8. CHECKOUT (IRONCLAD FLOW) ===
window.checkout = async () => {
  console.log("[CHECKOUT] Старт оформления...");
  const btn = document.getElementById('checkout-btn');
  const user = window.auth.currentUser;

  // 1. Проверки
  if (!user) { window.navigate('profile'); return alert('⚠️ Войдите в аккаунт'); }
  if (!window.cart.length) return alert('⚠️ Корзина пуста');
  
  // 2. Проверка адреса
  const addr = `${window.selectedPVZ.city||''}, ${window.selectedPVZ.address||''} ${window.selectedPVZ.details||''}`.replace(/,\s*,/g,',').trim();
  if (!addr || addr === ', ') {
    window.openPVZModal();
    return alert('⚠️ Укажите адрес доставки перед оформлением');
  }

  const total = window.cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  const itemsText = window.cart.map(i => `• ${i.name} (Размер: ${i.size||'?'}) — ${(i.price||0).toLocaleString('ru')} ₽`).join('\n');

  // 3. Блокировка UI
  btn.disabled = true; btn.textContent = '⏳ Оформление...';

  try {
    console.log("[CHECKOUT] Сохранение заказа в БД...");
    const orderRef = await window.db.collection('orders').add({
      userId: user.email, 
      userName: user.displayName || user.email.split('@')[0],
      email: user.email,
      items: itemsText,
      total: total.toLocaleString('ru') + ' ₽', 
      address: addr, 
      status: 'new', qrImage: '',
      date: new Date().toISOString(), 
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("[CHECKOUT] Заказ сохранен ID:", orderRef.id);

    // 4. Отправка в ТГ (не блокируем успех, но ждем ответа)
    await sendTelegramNotification({
      id: orderRef.id,
      userName: orderRef.userName,
      email: orderRef.email,
      items: itemsText,
      address: addr,
      total: orderRef.total,
      date: new Date().toLocaleString('ru-RU')
    });

    // 5. Обновление локальных данных
    window.cart.forEach(it=>{ if(!window.purchasedProducts.some(p=>p.id===it.id&&p.user===user.email)) window.purchasedProducts.push({id:it.id,user:user.email,date:new Date().toISOString()}); });
    localStorage.setItem('purchasedProducts',JSON.stringify(window.purchasedProducts));
    orderCount++; localStorage.setItem('orderCount',orderCount);
    window.cart=[]; localStorage.setItem('cart','[]'); updateCart();
    
    console.log("[CHECKOUT] Успех, перенаправление...");
    alert('✅ Заказ успешно оформлен!\nМенеджер свяжется с вами для подтверждения.');
    window.navigate('my-orders');
    
  } catch(e) {
    console.error("[CHECKOUT] КРИТИЧЕСКАЯ ОШИБКА:", e);
    alert('❌ Ошибка оформления: ' + e.message);
  } finally {
    // 6. Гарантия разблокировки кнопки
    console.log("[CHECKOUT] Завершено");
    btn.disabled = false; 
    btn.textContent = 'Оформить заказ';
  }
};

// === 9. ORDERS (CLIENT) ===
window.renderOrders = () => {
  const c = document.getElementById('my-orders-list'); if(!c) return;
  const user = window.auth.currentUser;
  if(!user){ c.innerHTML='<p style="text-align:center;color:var(--muted);padding:20px">Войдите в аккаунт</p>'; return; }
  
  if(ordersUnsub) ordersUnsub();
  ordersUnsub = window.db.collection('orders').where('userId','==',user.email).orderBy('createdAt','desc').onSnapshot(snap=>{
    if(snap.empty) { c.innerHTML='<p style="text-align:center;color:var(--muted);padding:30px">Нет заказов</p>'; return; }
    c.innerHTML = snap.docs.map(doc=>{
      const o=doc.data(); o.id=doc.id;
      const sm={new:'Ожидает',assembling:'В сборке',shipping:'В пути',delivered:'Доставлен'};
      const sc=`status-${o.status}`;
      return `<div class="order-card ${sc}"><div class="order-head"><span class="order-id">#${String(o.id).slice(-6)}</span><span class="status-badge ${sc}">${sm[o.status]}</span></div>
      <div class="order-body"><div class="order-items">🛍️ ${o.items}</div><div>📍 ${o.address}</div></div><div class="order-price">${o.total}</div>
      ${o.status==='delivered'&&o.qrImage?`<div class="qr-section"><div class="qr-label">📱 Код для получения:</div><img src="${o.qrImage}"><p style="font-size:0.75rem;color:var(--muted)">Покажите сотруднику ПВЗ</p></div>`:''}</div>`;
    }).join('');
  }, e => { c.innerHTML=`<p style="color:var(--danger)">Ошибка загрузки заказов. Проверьте консоль.</p>`; console.error(e); });
};

// === 10. ADMIN ===
function showToast(msg){const t=document.getElementById('level-toast');document.getElementById('toast-desc').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}

function renderAdmin() {
  window.db.collection('orders').get().then(snap=>{
    let rev=0, users=new Set(); snap.forEach(d=>{const o=d.data(); rev+=parseFloat(o.total.replace(/\s|₽/g,''))||0; users.add(o.userId);});
    document.getElementById('stat-orders').textContent=snap.size;
    document.getElementById('stat-revenue').textContent=rev.toLocaleString('ru')+' ₽';
    document.getElementById('stat-users').textContent=users.size;
  }).catch(e=>console.error(e));
  renderAdminProductsList();
}

function renderAdminProductsList() {
  const list = document.getElementById('admin-products-list'); if(!list) return;
  list.innerHTML = products.length===0 ? '<p style="color:var(--muted)">Товаров нет</p>' : products.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border)">
      <div><b>${p.name}</b><br><small>${(p.price||0).toLocaleString('ru')} ₽ • ${p.category}</small></div>
      <div style="display:flex;gap:8px">
        <button class="btn" style="padding:6px 10px;font-size:0.8rem;background:var(--bg);border:1px solid var(--border)" onclick="window.editProduct('${p.id}')">✏️ Изменить</button>
        <button class="btn" style="padding:6px 10px;font-size:0.8rem;background:rgba(220,53,69,0.1);color:var(--danger);border:1px solid rgba(220,53,69,0.2)" onclick="window.deleteProduct('${p.id}')">🗑 Удалить</button>
      </div>
    </div>`).join('');
}

window.saveProduct = async () => {
  console.log("[ADMIN] Сохранение...");
  const btn = document.getElementById('prod-submit-btn');
  const editId = document.getElementById('edit-prod-id').value;
  const name = document.getElementById('new-prod-name').value.trim();
  const price = document.getElementById('new-prod-price').value;
  if(!name || !price) return alert('❌ Заполните название и цену');
  
  btn.disabled = true; btn.textContent = '⏳ Сохранение...';
  let imgUrl = document.getElementById('new-prod-img').value.trim();
  const fileInput = document.getElementById('new-prod-file');
  
  try {
    if(fileInput.files[0]) {
      btn.textContent = '⏳ Загрузка фото...';
      const file = fileInput.files[0];
      const ref = window.storage.ref(`products/${Date.now()}_${file.name}`);
      await ref.put(file);
      imgUrl = await ref.getDownloadURL();
    }
    if(!imgUrl) imgUrl = '👟';

    btn.textContent = editId ? '⏳ Обновление...' : '⏳ Публикация...';
    const prodData = {
      name, price: Number(price), category: document.getElementById('new-prod-cat').value,
      sizes: document.getElementById('new-prod-sizes').value.split(',').map(s=>s.trim()).filter(Boolean),
      images: [imgUrl], desc: document.getElementById('new-prod-desc').value,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if(editId) await window.db.collection('products').doc(editId).set(prodData, {merge: true});
    else { prodData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); prodData.rating=5; prodData.reviews=0; await window.db.collection('products').add(prodData); }
    
    showToast(editId ? '✅ Товар обновлён' : '✅ Товар опубликован');
    window.cancelEdit();
  } catch(e) {
    console.error("[ADMIN] Ошибка:", e);
    alert('❌ Ошибка: ' + e.message);
  } finally {
    console.log("[ADMIN] Завершено");
    btn.disabled = false; btn.textContent = editId ? '💾 Сохранить изменения' : '💾 Опубликовать товар';
  }
};

window.editProduct = (id) => {
  const p = products.find(x => x.id === id); if(!p) return;
  document.getElementById('edit-prod-id').value = id;
  document.getElementById('new-prod-name').value = p.name||'';
  document.getElementById('new-prod-price').value = p.price||'';
  document.getElementById('new-prod-cat').value = p.category||'designer';
  document.getElementById('new-prod-sizes').value = (p.sizes||[]).join(',');
  document.getElementById('new-prod-img').value = (p.images?.[0]?.startsWith('http')) ? p.images[0] : '';
  document.getElementById('new-prod-desc').value = p.desc||'';
  
  const preview = document.getElementById('img-preview');
  if(p.images?.[0]?.startsWith('http')) { preview.style.display='block'; preview.innerHTML=`<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover">`; } 
  else preview.style.display='none';
  
  document.getElementById('form-title').textContent = '✏️ Редактирование';
  document.getElementById('prod-submit-btn').textContent = '💾 Сохранить изменения';
  document.getElementById('cancel-edit-btn').style.display = 'block';
  window.scrollTo({top:0, behavior:'smooth'});
};
window.cancelEdit = () => {
  document.getElementById('edit-prod-id').value = '';
  ['new-prod-name','new-prod-price','new-prod-sizes','new-prod-img','new-prod-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('new-prod-cat').value = 'designer';
  document.getElementById('new-prod-file').value = '';
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('form-title').textContent = '📦 Добавить новый товар';
  document.getElementById('prod-submit-btn').textContent = '💾 Опубликовать товар';
  document.getElementById('cancel-edit-btn').style.display = 'none';
};
window.deleteProduct = (id) => { if(confirm('🗑 Удалить?')) window.db.collection('products').doc(id).delete().then(()=>showToast('🗑 Удалено')).catch(e=>alert(e.message)); };

window.updateStatus = (id, status) => {
  console.log(`[ADMIN] Статус ${id} -> ${status}`);
  window.db.collection('orders').doc(id).update({ status })
    .then(() => showToast(`✅ Статус изменен на "${status}"`))
    .catch(e => alert('❌ ' + e.message));
};

// === 11. SUPPORT & AUTH ===
const faqDB = {
  'доставк|сроки|когда придет|где мой': '🚚 Доставка 1-3 дня. Бесплатно от 5000₽.',
  'возврат|вернуть|деньги назад|отказ|не понравился': '↩️ Возврат 14 дней. Курьер заберёт бесплатно.',
  'размер|маломерит|большемерит|таблица|нога': '📏 Размеры по евро-сетке. Если между размерами — берите больше.',
  'оплат|карт|сбер|тинькофф|сбп|рассрочка': '💳 МИР, Visa, MC, СБП. Рассрочка 3-6 мес.',
  'промокод|скидк|купон|акци': '🎁 Введите TAPKI2026 для скидки -15%.',
  'качество|брак|материал|оригинал': '👟 Только проверенные поставщики. Брак меняем.',
  'обмен|другой размер|цвет|не подошел': '🔄 Обмен в течение 7 дней.',
  'оператор|человек|живой|связ|жалоб': '👨‍ Оператор ответит в течение 5 минут.',
  'грязь|чистка|уход|стирк': '🧼 Используйте пену для кроссовок. Не стирайте в машинке.'
};
window.openSupportChat = () => { document.getElementById('support-modal').style.display='flex'; document.getElementById('quick-questions').style.display='flex'; };
window.closeSupportChat = () => document.getElementById('support-modal').style.display='none';
window.sendChatMessageDirect = txt => { document.getElementById('chat-input').value=txt; window.sendChatMessage(); };
window.sendChatMessage = () => {
  const inp=document.getElementById('chat-input'), txt=inp.value.trim(); if(!txt) return;
  document.getElementById('quick-questions').style.display='none';
  const box=document.getElementById('chat-messages');
  box.innerHTML+=`<div class="msg user">${txt}</div>`; inp.value=''; box.scrollTop=box.scrollHeight;
  setTimeout(()=>{
    const lower=txt.toLowerCase(); let reply=null;
    for(const[k,a]of Object.entries(faqDB)) if(k.split('|').some(c=>lower.includes(c))) {reply=a;break;}
    box.innerHTML+=`<div class="msg bot">${reply||'🤔 Не понял вопрос. Нажмите "Связаться с оператором".'}</div>`;
    box.scrollTop=box.scrollHeight;
  },400);
};

const authForm=document.getElementById('auth-form');
if(authForm){
  let isLogin=true;
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); isLogin=t.dataset.tab==='login';
    document.getElementById('auth-submit').textContent=isLogin?'Войти':'Зарегистрироваться';
    document.getElementById('auth-error').style.display='none';
  });
  authForm.onsubmit=async e=>{
    e.preventDefault();
    const em=document.getElementById('email-input').value.trim(), pw=document.getElementById('pass-input').value;
    const btn=document.getElementById('auth-submit'), err=document.getElementById('auth-error');
    err.style.display='none'; btn.disabled=true; btn.textContent='Подождите...';
    try{ isLogin?await window.auth.signInWithEmailAndPassword(em,pw):await window.auth.createUserWithEmailAndPassword(em,pw); }
    catch(e){
      const m={'auth/user-not-found':'Пользователь не найден.','auth/wrong-password':'Неверный пароль.','auth/invalid-email':'Неверный email.','auth/weak-password':'Пароль мин. 6 символов.'};
      err.textContent=m[e.code]||e.message; err.style.display='block';
    } finally { btn.disabled=false; btn.textContent=isLogin?'Войти':'Зарегистрироваться'; }
  };
  window.auth.onAuthStateChanged(user=>{
    if(user){
      document.getElementById('auth-flow').style.display='none';
      document.getElementById('profile-actions').style.display='block';
      document.getElementById('profile-email').textContent=user.email;
      document.getElementById('profile-display-name').textContent=user.displayName||user.email.split('@')[0];
      if(ADMIN_EMAILS.includes(user.email)&&!document.getElementById('admin-link')) document.querySelector('.menu-grid').innerHTML+=`<div class="menu-item" id="admin-link" onclick="window.navigate('admin')"><i class="fa-solid fa-lock"></i><span>Панель управления</span><i class="fa-solid fa-chevron-right"></i></div>`;
    } else {
      document.getElementById('auth-flow').style.display='block';
      document.getElementById('profile-actions').style.display='none';
      document.getElementById('profile-display-name').textContent='Гость';
      document.getElementById('profile-email').textContent='Войдите в аккаунт';
      document.getElementById('admin-link')?.remove();
    }
  });
  document.getElementById('logout-btn').onclick=()=>{window.auth.signOut();alert('✅ Вы вышли');};
}

// === 12. INIT ===
seedTestProduct(); 
loadProducts(); 
updateCart();
