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
  window.auth = firebase.auth(); // Global window.auth for HTML access
  window.db = firebase.firestore();
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  console.log("[FB] OK");
} catch (e) { console.error("[FB] Init error:", e); }

// === 2. GLOBALS ===
const ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];
window.cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
window.purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let products = [];
let currentProductId = null;
let selectedSize = null;

// Address
window.selectedPVZ = JSON.parse(localStorage.getItem('selectedPVZ')) || { city: '', address: '', details: '' };

const categories = [
  {id:'all',name:'Все'},{id:'designer',name:'Дизайнерские'},{id:'kids',name:'Детские'},
  {id:'swag',name:'Сваг'},{id:'classics',name:'Классика'},{id:'sale',name:'Распродажа'}
];

// === 3. DB & RENDER ===
function loadProducts() {
  try {
    window.db.collection('products').get().then(snap => {
      products = [];
      snap.forEach(d => { const data = d.data(); data.id = d.id; products.push(data); });
      renderGrid('home-grid', products.slice(0,4));
      renderGrid('catalog-grid', products);
      console.log("[DB] Loaded", products.length);
    });
  } catch(e) { console.error("[DB] Load error", e); }
}

const renderGrid = (id, list) => {
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = list.map(p => {
    const img = p.images?.[0] || '👟';
    const imgHtml = img.startsWith('http') ? `<img src="${img}">` : img;
    return `<div class="card" onclick="window.openProduct('${p.id}')">
      <div class="card-img">${imgHtml}</div>
      <div class="card-body">
        <div class="card-brand">${categories.find(c=>c.id===p.category)?.name||p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-price"><span class="now">${(p.price||0).toLocaleString('ru')} ₽</span></div>
        <button class="btn-cart" onclick="event.stopPropagation(); window.addToCart('${p.id}')">В корзину</button>
      </div>
    </div>`;
  }).join('');
};

// === 4. NAVIGATION ===
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

// === 5. PRODUCT PAGE ===
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
  
  const thumbs = document.getElementById('product-thumbs');
  thumbs.innerHTML = '';
  (p.images||[]).forEach((u,i) => {
    if(!u.startsWith('http')) return;
    const b = document.createElement('button'); b.className = `thumb-btn ${i===0?'active':''}`;
    b.innerHTML = `<img src="${u}">`;
    b.onclick = () => {
      document.getElementById('detail-img').innerHTML = `<img src="${u}">`;
      document.querySelectorAll('.thumb-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
    };
    thumbs.appendChild(b);
  });
  window.navigate('product');
};
window.selectSize = (btn, size) => {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); selectedSize = size;
};
window.addToCartFromDetail = () => {
  if(!selectedSize) return alert('Выберите размер');
  const p = products.find(x => x.id === currentProductId);
  window.cart.push({...p, size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart();
  alert('Добавлено');
};
window.addToCart = id => {
  const p = products.find(x => x.id === id);
  const ex = window.cart.find(x => x.id === id);
  if(ex) ex.qty++; else window.cart.push({...p, qty:1});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart();
};

// === 6. CART ===
const updateCart = () => {
  const badge = document.getElementById('cart-badge'); if(badge) badge.textContent = window.cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty = document.getElementById('cart-empty'), layout = document.getElementById('cart-layout');
  if(!empty || !layout) return;
  if(!window.cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items').innerHTML = window.cart.map((i,idx)=>`
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-meta">${(i.price||0).toLocaleString('ru')} ₽ • ${i.size||'?'}</div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="window.changeQty(${idx},-1)">−</button><span>${i.qty||1}</span><button class="qty-btn" onclick="window.changeQty(${idx},1)">+</button>
          <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="window.removeItem(${idx})">🗑</button>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('cart-total').textContent = window.cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0).toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { window.cart[idx].qty=(window.cart[idx].qty||1)+d; if(window.cart[idx].qty<1)window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };
window.removeItem = idx => { window.cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart(); };

// === 7. ADDRESS / PVZ ===
window.openPVZModal = () => {
  document.getElementById('pvz-city').value = window.selectedPVZ.city || '';
  document.getElementById('pvz-address').value = window.selectedPVZ.address || '';
  document.getElementById('pvz-details').value = window.selectedPVZ.details || '';
  document.getElementById('pvz-modal').style.display = 'flex';
};
window.closePVZModal = () => { document.getElementById('pvz-modal').style.display = 'none'; };
window.savePVZ = () => {
  window.selectedPVZ.city = document.getElementById('pvz-city').value;
  window.selectedPVZ.address = document.getElementById('pvz-address').value;
  window.selectedPVZ.details = document.getElementById('pvz-details').value;
  localStorage.setItem('selectedPVZ', JSON.stringify(window.selectedPVZ));
  alert('✅ Адрес сохранен');
  window.closePVZModal();
};

// === 8. CHECKOUT ===
window.checkout = () => {
  const user = window.auth.currentUser;
  if(!user) { window.navigate('profile'); return alert('Войдите в аккаунт'); }
  if(!window.cart.length) return;
  
  const fullAddress = `${window.selectedPVZ.city || 'Не указан город'}, ${window.selectedPVZ.address || 'Не указан адрес'} ${window.selectedPVZ.details || ''}`;
  const total = window.cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  
  const order = {
    id: Date.now(), user: user.email,
    items: window.cart.map(i=>`${i.name} (${i.size||''})`).join(', '),
    total: total.toLocaleString('ru'), 
    address: fullAddress, 
    status: 'new', qrImage: '', date: new Date().toISOString()
  };
  
  let orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  orders.push(order); localStorage.setItem('allOrders', JSON.stringify(orders));
  window.cart.forEach(it => { if(!window.purchasedProducts.some(p=>p.id===it.id && p.user===user.email)) window.purchasedProducts.push({id:it.id, user:user.email, date:new Date().toISOString()}); });
  localStorage.setItem('purchasedProducts', JSON.stringify(window.purchasedProducts));
  orderCount++; localStorage.setItem('orderCount', orderCount);
  alert('✅ Заказ оформлен: ' + fullAddress);
  window.cart=[]; localStorage.setItem('cart','[]'); updateCart();
};

// === 9. ORDERS ===
window.renderOrders = () => {
  const c = document.getElementById('my-orders-list'); if(!c) return;
  const orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const user = window.auth.currentUser;
  const mine = user ? orders.filter(o => o.user === user.email).reverse() : [];
  c.innerHTML = mine.length ? mine.map(o => `
    <div style="background:var(--card);padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;font-weight:700"><span>#${String(o.id).slice(-4)}</span><span style="color:${o.status==='delivered'?'var(--success)':'orange'}">${o.status}</span></div>
      <div style="font-size:0.8rem;color:var(--muted);margin:4px 0">📍 ${o.address}</div>
      <div style="font-size:0.9rem;margin:6px 0">${o.items}</div>
      <div style="font-weight:600">${o.total} ₽</div>
      ${o.qrImage ? `<img src="${o.qrImage}" style="max-width:100%;margin-top:8px;border-radius:8px">` : ''}
    </div>`).join('') : '<p style="text-align:center;color:var(--muted);padding:20px">Нет заказов</p>';
};

// === 10. ADMIN ===
function renderAdmin() {
  const c = document.getElementById('orders-list-admin'); if(!c) return;
  const orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const st = document.getElementById('admin-stats');
  if(st) st.innerHTML = `<div class="stat-box"><span class="stat-num">${orders.length}</span><small>Заказов</small></div>`;
  c.innerHTML = orders.reverse().map(o => `
    <div class="order-row">
      <div style="flex:1;min-width:0"><b>#${String(o.id).slice(-4)} | ${o.user?.split('@')[0]}</b><br><small style="word-break:break-word">${o.items}</small><br><small style="color:var(--muted)">📍 ${o.address}</small>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">${['new','assembling','shipping','delivered'].map(s=>`<button style="padding:4px 8px;border:1px solid var(--border);background:${o.status===s?'var(--primary)':'transparent'};color:${o.status===s?'#fff':'var(--text)'};border-radius:4px;cursor:pointer;font-size:0.75rem" onclick="window.updateStatus(${o.id},'${s}')">${s}</button>`).join('')}</div>
        ${o.status==='delivered'?`<div style="margin-top:8px"><input type="file" id="qr-${o.id}" accept="image/*" style="display:none" onchange="window.uploadQR(${o.id},this)"><label for="qr-${o.id}" style="padding:4px 8px;background:var(--success);color:#fff;border-radius:4px;cursor:pointer;font-size:0.75rem">📷 QR</label></div>`:''}
      </div>
      <div style="text-align:right;min-width:80px"><b>${o.total} ₽</b></div>
    </div>`).join('');
}
window.updateStatus = (id, status) => {
  let orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const o = orders.find(x => x.id === id);
  if(o) { o.status = status; localStorage.setItem('allOrders', JSON.stringify(orders)); renderAdmin(); }
};
window.uploadQR = (id, input) => {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let orders = JSON.parse(localStorage.getItem('allOrders'))||[];
    const o = orders.find(x => x.id === id);
    if(o) { o.qrImage = e.target.result; localStorage.setItem('allOrders', JSON.stringify(orders)); alert('✅ QR сохранён'); renderAdmin(); }
  };
  reader.readAsDataURL(file);
};

// === 11. HYBRID CHAT (CLIENT FAQ + ADMIN COMMANDS) ===
const botCommands = {
  '/test': () => '✅ Бот работает. Вы админ: ' + (ADMIN_EMAILS.includes(window.auth.currentUser?.email) ? 'Да' : 'Нет'),
  '/stats': () => {
    if(!window.auth.currentUser || !ADMIN_EMAILS.includes(window.auth.currentUser.email)) return '🔒 Только админам';
    const orders = JSON.parse(localStorage.getItem('allOrders')||'[]');
    const rev = orders.reduce((s,o)=>s+parseFloat(o.total)||0,0);
    return `📊 Заказов: ${orders.length}\n💰 Выручка: ${rev.toLocaleString('ru')} ₽\n🛍️ Товаров: ${products.length}`;
  },
  '/add': async (args) => {
    if(!window.auth.currentUser || !ADMIN_EMAILS.includes(window.auth.currentUser.email)) return '🔒 Только админам';
    const p = args.split('|').map(x=>x.trim());
    if(p.length<5) return '❌ Формат: /add Название | Цена | Категория | Размеры | Описание | Фото1, Фото2';
    const [name, price, cat, sizes, desc, imgs] = p;
    const images = imgs ? imgs.split(',').map(u=>u.trim()).filter(u=>u.startsWith('http')) : ['👟'];
    if(images.length===0) images.push('👟');
    try {
      await window.db.collection('products').add({name, price: Number(price), category: cat, sizes: sizes.split(',').map(s=>s.trim()), desc, images, rating:5, reviews:0, createdAt:new Date().toISOString()});
      return `✅ ${name} добавлен в каталог`;
    } catch(e) { return `❌ ${e.message}`; }
  },
  '/help': () => '🤖 <b>Команды админа:</b>\n/stats — статистика\n/add Name|Price|Cat|Sizes|Desc|Img — добавить товар\n\n<b>Клиент:</b> просто напишите вопрос.'
};

const faqDB = {
  'доставк|сроки|когда': '🚚 Доставка 1-3 дня. Бесплатно от 5000₽.',
  'возврат|вернуть|деньги': '↩️ Возврат 14 дней. Курьер заберет бесплатно.',
  'размер|маломерит|нога': '📏 Размеры по евро-сетке. Если между размерами — берите больше.',
  'оплат|карт|сбер': '💳 Карты МИР, Visa, MC, СБП. Рассрочка есть.',
  'промокод|скидк|купон': '🎁 Введите TAPKI2026 для скидки -15% в корзине.',
  'качество|брак|материал': '👟 Только оригинал. Брак меняем за наш счет.',
  'оператор|человек|живой': '👨‍ Оператор ответит в течение 5 минут.',
  'адрес|пвз|где забрать': '📍 Адрес выберите в Профиле -> Адрес доставки.'
};

window.openSupportChat = () => {
  document.getElementById('support-modal').style.display = 'flex';
  const box = document.getElementById('chat-messages');
  box.innerHTML = '<div class="msg bot">👋 Привет! Я помощник ТапкиДроп. Чем помочь?</div>';
};
window.closeSupportChat = () => document.getElementById('support-modal').style.display = 'none';

window.sendChatMessage = () => {
  const inp = document.getElementById('chat-input'); const txt = inp.value.trim(); if(!txt) return;
  const box = document.getElementById('chat-messages');
  box.innerHTML += `<div class="msg user">${txt}</div>`; inp.value=''; box.scrollTop=box.scrollHeight;
  
  // Admin Commands
  if(txt.startsWith('/') && window.auth.currentUser && ADMIN_EMAILS.includes(window.auth.currentUser.email)) {
    const m = txt.match(/^\/(\w+)\s*(.*)?$/);
    if(m) {
      const cmd = '/' + m[1].toLowerCase(); const args = m[2]||'';
      setTimeout(async () => {
        const handler = botCommands[cmd];
        box.innerHTML += `<div class="msg bot">${handler ? await handler(args) : '❌ Неизвестная команда'}</div>`;
        box.scrollTop=box.scrollHeight;
      }, 300);
      return;
    }
  }

  // Client FAQ
  setTimeout(() => {
    const lower = txt.toLowerCase();
    let reply = null;
    for(const [keys, ans] of Object.entries(faqDB)) {
      if(keys.split('|').some(k => lower.includes(k))) { reply = ans; break; }
    }
    box.innerHTML += `<div class="msg bot">${reply || '🤔 Не совсем понял. Попробуйте переформулировать или нажмите "Оператор".'}</div>`;
    if(!reply) {
       box.innerHTML += `<div class="msg bot" style="background:#e0e0e0;cursor:pointer" onclick="window.sendChatMessageDirect('Хочу к оператору')">👨‍ Связаться с оператором</div>`;
    }
    box.scrollTop=box.scrollHeight;
  }, 500);
};
window.sendChatMessageDirect = (txt) => {
  const inp = document.getElementById('chat-input'); inp.value = txt;
  window.sendChatMessage();
};

// === 12. AUTH (FIXED) ===
const authForm = document.getElementById('auth-form');
if(authForm) {
  let isLogin = true;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); isLogin = t.dataset.tab==='login';
    document.getElementById('auth-submit').textContent = isLogin ? 'Войти' : 'Регистрация';
    document.getElementById('auth-error').style.display='none';
  });

  authForm.onsubmit = async e => {
    e.preventDefault();
    const em = document.getElementById('email-input').value.trim();
    const pw = document.getElementById('pass-input').value;
    const btn = document.getElementById('auth-submit');
    const err = document.getElementById('auth-error');
    
    console.log('[AUTH] Попытка:', em);
    err.style.display='none'; btn.disabled=true; btn.textContent='...';
    
    try {
      if(isLogin) await window.auth.signInWithEmailAndPassword(em, pw);
      else await window.auth.createUserWithEmailAndPassword(em, pw);
      console.log('[AUTH] Успех');
    } catch(e) {
      console.error('[AUTH] Ошибка:', e.code);
      const msgs = {
        'auth/user-not-found': 'Пользователь не найден.',
        'auth/wrong-password': 'Неверный пароль.',
        'auth/invalid-email': 'Неверный email.',
        'auth/weak-password': 'Пароль мин. 6 символов.'
      };
      err.textContent = msgs[e.code] || e.message;
      err.style.display='block';
    } finally {
      btn.disabled=false; btn.textContent=isLogin?'Войти':'Регистрация';
    }
  };

  window.auth.onAuthStateChanged(user => {
    console.log('[AUTH] Статус:', user ? user.email : 'Гость');
    if(user) {
      document.getElementById('auth-flow').style.display='none';
      document.getElementById('profile-actions').style.display='block';
      document.getElementById('profile-email').textContent = user.email;
      if(ADMIN_EMAILS.includes(user.email) && !document.getElementById('admin-link')) {
        document.querySelector('.menu-grid').innerHTML += `<div class="menu-item" id="admin-link" onclick="window.navigate('admin')"><i class="fa-solid fa-lock"></i><span>Админка</span><i class="fa-solid fa-chevron-right"></i></div>`;
      }
    } else {
      document.getElementById('auth-flow').style.display='block';
      document.getElementById('profile-actions').style.display='none';
      document.getElementById('profile-display-name').textContent='Гость';
      document.getElementById('profile-email').textContent='Войдите';
      document.getElementById('admin-link')?.remove();
    }
  });
  
  document.getElementById('logout-btn').onclick = () => {
    window.auth.signOut();
    console.log('[AUTH] Выход');
  };
}

// === 13. INIT ===
loadProducts();
updateCart();
