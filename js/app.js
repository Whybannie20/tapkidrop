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
  window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  console.log("[FB] Инициализация завершена");
} catch (e) { console.error("[FB] Ошибка инициализации:", e); }

// === 2. GLOBALS ===
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

// === 3. SEED TEST PRODUCT (IF EMPTY) ===
function seedTestProduct() {
  window.db.collection('products').get().then(snap => {
    if(snap.empty) {
      console.log("[DB] База пуста, добавляем тестовый товар...");
      window.db.collection('products').add({
        name: "Nike Air Max 97 Silver",
        price: 14990,
        category: "designer",
        sizes: ["39","40","41","42","43","44"],
        desc: "Легендарная модель с системой амортизации Air. Идеальное состояние, полная комплектация.",
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"],
        rating: 4.9, reviews: 128,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
}

// === 4. DB & RENDER ===
function loadProducts() {
  try {
    window.db.collection('products').get().then(snap => {
      products = [];
      snap.forEach(d => { const data = d.data(); data.id = d.id; products.push(data); });
      renderGrid('home-grid', products.slice(0,4));
      renderGrid('catalog-grid', products);
      console.log("[DB] Загружено товаров:", products.length);
    });
  } catch(e) { console.error("[DB] Ошибка загрузки:", e); }
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

// === 6. PRODUCT PAGE ===
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
  if(!selectedSize) return alert('Пожалуйста, выберите размер');
  const p = products.find(x => x.id === currentProductId);
  window.cart.push({...p, size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart();
  alert('✅ Товар добавлен в корзину');
};
window.addToCart = id => {
  const p = products.find(x => x.id === id);
  const ex = window.cart.find(x => x.id === id);
  if(ex) ex.qty++; else window.cart.push({...p, qty:1});
  localStorage.setItem('cart',JSON.stringify(window.cart)); updateCart();
};

// === 7. CART ===
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
        <div class="cart-item-meta">${(i.price||0).toLocaleString('ru')} ₽ • Размер ${i.size||'?'}</div>
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

// === 8. ADDRESS / PVZ ===
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
  alert('✅ Адрес успешно сохранён');
  window.closePVZModal();
};

// === 9. CHECKOUT (FIRESTORE ORDERS) ===
window.checkout = () => {
  const user = window.auth.currentUser;
  if(!user) { window.navigate('profile'); return alert('Для оформления заказа необходимо войти в аккаунт'); }
  if(!window.cart.length) return;
  
  const fullAddress = `${window.selectedPVZ.city || 'Город не указан'}, ${window.selectedPVZ.address || 'Адрес не указан'} ${window.selectedPVZ.details || ''}`.replace(/,\s*,/g,',').trim();
  const total = window.cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  
  const orderData = {
    userId: user.email,
    userName: user.displayName || user.email.split('@')[0],
    items: window.cart.map(i=>`${i.name} (${i.size||'?'})`).join(', '),
    total: total.toLocaleString('ru'), 
    address: fullAddress, 
    status: 'new', 
    qrImage: '', 
    date: new Date().toISOString(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  window.db.collection('orders').add(orderData).then(() => {
    window.cart.forEach(it => { 
      if(!window.purchasedProducts.some(p=>p.id===it.id && p.user===user.email)) 
        window.purchasedProducts.push({id:it.id, user:user.email, date:new Date().toISOString()}); 
    });
    localStorage.setItem('purchasedProducts', JSON.stringify(window.purchasedProducts));
    orderCount++; localStorage.setItem('orderCount', orderCount);
    alert('✅ Заказ успешно оформлен!\nАдрес: ' + fullAddress);
    window.cart=[]; localStorage.setItem('cart','[]'); updateCart();
  }).catch(err => alert('❌ Ошибка оформления: ' + err.message));
};

// === 10. ORDERS (REAL-TIME FIRESTORE) ===
let ordersListener = null;
window.renderOrders = () => {
  const c = document.getElementById('my-orders-list'); if(!c) return;
  const user = window.auth.currentUser;
  if(!user) { c.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">Войдите в аккаунт, чтобы видеть заказы</p>'; return; }
  
  if(ordersListener) ordersListener(); // Отписываемся от предыдущего
  
  ordersListener = window.db.collection('orders')
    .where('userId', '==', user.email)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      if(snap.empty) {
        c.innerHTML = '<p style="text-align:center;color:var(--muted);padding:30px">У вас пока нет заказов</p>';
        return;
      }
      c.innerHTML = snap.docs.map(doc => {
        const o = doc.data(); o.id = doc.id;
        const statusMap = {new:'Ожидает',assembling:'В сборке',shipping:'В пути',delivered:'Доставлен'};
        const statusClass = `status-${o.status}`;
        const statusLabel = statusMap[o.status] || o.status;
        
        let qrHtml = '';
        if(o.status === 'delivered' && o.qrImage) {
          qrHtml = `<div class="qr-section">
            <div class="qr-label">📱 Код для получения на пункте выдачи:</div>
            <img src="${o.qrImage}" alt="Код получения" onerror="this.style.display='none'">
            <p style="font-size:0.75rem;color:var(--muted);margin-top:6px">Покажите это фото сотруднику ПВЗ</p>
          </div>`;
        }
        
        return `<div class="order-card ${statusClass}">
          <div class="order-head">
            <span class="order-id">Заказ #${String(o.id).slice(-6).toUpperCase()}</span>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
          <div class="order-body">
            <div class="order-items">🛍️ ${o.items}</div>
            <div>📍 ${o.address}</div>
            <div style="font-size:0.8rem;color:var(--muted);margin-top:4px">📅 ${new Date(o.date).toLocaleDateString('ru-RU')}</div>
          </div>
          <div class="order-price">${o.total} ₽</div>
          ${qrHtml}
        </div>`;
      }).join('');
    }, err => {
      console.error("Orders error:", err);
      c.innerHTML = '<p style="color:var(--danger);text-align:center;padding:20px">Ошибка загрузки заказов</p>';
    });
};

// === 11. ADMIN DASHBOARD (UI BASED) ===
function renderAdmin() {
  const usersListEl = document.getElementById('admin-users-list');
  const logsEl = document.getElementById('admin-logs');
  
  // 1. Fetch Stats
  window.db.collection('orders').get().then(snap => {
    let revenue = 0;
    const users = new Set();
    let count = 0;
    snap.forEach(doc => {
      const o = doc.data();
      revenue += parseFloat(o.total.replace(/\s|₽/g, '')) || 0;
      users.add(o.userId);
      count++;
    });
    document.getElementById('stat-orders').textContent = count;
    document.getElementById('stat-revenue').textContent = revenue.toLocaleString('ru') + ' ₽';
    document.getElementById('stat-users').textContent = users.size;
    
    // Render Users
    if(usersListEl) usersListEl.innerHTML = Array.from(users).map(u => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:0.9rem">${u}</div>`).join('');
  });

  // 2. Fetch Products Count
  window.db.collection('products').get().then(snap => {
    document.getElementById('stat-products').textContent = snap.size;
  });

  // 3. Render Orders List (Admin View)
  const c = document.getElementById('orders-list-admin'); if(!c) return;
  if(window.adminOrdersListener) window.adminOrdersListener();
  
  window.adminOrdersListener = window.db.collection('orders').orderBy('createdAt','desc').onSnapshot(snap => {
    if(snap.empty) { c.innerHTML = '<p style="color:var(--muted);text-align:center;padding:20px">Заказов пока нет</p>'; return; }
    c.innerHTML = snap.docs.map(doc => {
      const o = doc.data(); o.id = doc.id;
      return `<div class="order-row">
        <div style="flex:1;min-width:0">
          <b>#${String(o.id).slice(-6).toUpperCase()} | ${o.userName||o.userId?.split('@')[0]}</b><br>
          <small style="word-break:break-word;color:var(--muted)">${o.items}</small><br>
          <small style="color:var(--muted)">📍 ${o.address}</small>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">
            ${['new','assembling','shipping','delivered'].map(s=>`<button style="padding:5px 10px;border:1px solid var(--border);background:${o.status===s?'var(--primary)':'transparent'};color:${o.status===s?'#fff':'var(--text)'};border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:500" onclick="window.updateStatus('${o.id}','${s}')">${s==='new'?'Новый':s==='assembling'?'Сборка':s==='shipping'?'Отправлен':'Доставлен'}</button>`).join('')}
          </div>
          ${o.status==='delivered'?`<div style="margin-top:10px"><input type="file" id="qr-${o.id}" accept="image/*" style="display:none" onchange="window.uploadQR('${o.id}',this)"><label for="qr-${o.id}" style="padding:6px 12px;background:var(--success);color:#fff;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:500;display:inline-flex;align-items:center;gap:6px">📷 Загрузить фото/QR</label>${o.qrImage?'<span style="margin-left:8px;color:var(--success);font-size:0.8rem">✅ Загружено</span>':''}</div>`:''}
        </div>
        <div style="text-align:right;min-width:85px;font-weight:700">${o.total} ₽</div>
      </div>`;
    }).join('');
  });
}

window.updateStatus = (id, status) => {
  window.db.collection('orders').doc(id).update({ status })
    .then(() => {
      console.log(`Статус ${id} обновлён`);
      const logs = document.getElementById('admin-logs');
      if(logs) logs.innerHTML += `<div style="color:var(--success)">✅ Заказ #${id.slice(-4)} переведен в "${status}"</div>`;
    })
    .catch(err => alert('Ошибка обновления: ' + err.message));
};

window.uploadQR = (id, input) => {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    window.db.collection('orders').doc(id).update({ qrImage: e.target.result })
      .then(() => {
        alert('✅ Фото/QR успешно сохранено. Клиент увидит его мгновенно.');
        const logs = document.getElementById('admin-logs');
        if(logs) logs.innerHTML += `<div style="color:var(--primary)">📷 QR загружен для #${id.slice(-4)}</div>`;
      })
      .catch(err => alert('Ошибка загрузки: ' + err.message));
  };
  reader.readAsDataURL(file);
};

// === 12. ADD PRODUCT FROM UI ===
window.addProductFromUI = () => {
  const name = document.getElementById('new-prod-name').value;
  const price = document.getElementById('new-prod-price').value;
  const cat = document.getElementById('new-prod-cat').value;
  const sizes = document.getElementById('new-prod-sizes').value;
  const img = document.getElementById('new-prod-img').value;
  const desc = document.getElementById('new-prod-desc').value;

  if(!name || !price) return alert('Заполните название и цену');

  const newProd = {
    name, price: Number(price), category: cat, 
    sizes: sizes.split(',').map(s=>s.trim()), 
    images: img ? [img] : ['👟'],
    desc, rating: 5.0, reviews: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  window.db.collection('products').add(newProd).then(() => {
    alert('✅ Товар успешно опубликован!');
    document.getElementById('new-prod-name').value = '';
    document.getElementById('new-prod-price').value = '';
    document.getElementById('new-prod-sizes').value = '';
    document.getElementById('new-prod-img').value = '';
    document.getElementById('new-prod-desc').value = '';
    loadProducts(); // Refresh grid
    const logs = document.getElementById('admin-logs');
    if(logs) logs.innerHTML += `<div style="color:var(--primary)">📦 Товар "${name}" добавлен</div>`;
  }).catch(err => alert('Ошибка: ' + err.message));
};

// === 13. SUPPORT CHAT (CLIENT FAQ) ===
const faqDB = {
  'доставк|сроки|когда придет|где мой': '🚚 Доставка по России занимает 1-3 рабочих дня. Бесплатно при заказе от 5000 ₽. Трек-номер придёт в SMS сразу после отправки.',
  'возврат|вернуть|деньги назад|отказ|не понравился': '↩️ Возврат возможен в течение 14 дней, если товар не носился и сохранены бирки. Курьер заберёт заказ бесплатно.',
  'размер|маломерит|большемерит|таблица|нога|полнота': '📏 Все размеры соответствуют европейской сетке. Если ваша стопа между размерами, рекомендуем взять на 0.5 размера больше.',
  'оплат|карт|сбер|тинькофф|сбп|наложенный|рассрочка': '💳 Принимаем карты МИР, Visa, Mastercard и СБП. Доступна рассрочка от банков-партнёров на 3-6 месяцев без переплат.',
  'промокод|скидк|купон|акци|бонус|баллы': '🎁 Введите код TAPKI2026 при оформлении для скидки -15%. Бонусы начисляются за отзывы и повторные заказы.',
  'качество|брак|материал|оригинал|подделка': '👟 Мы работаем только с проверенными поставщиками. Все партии проходят контроль качества. При обнаружении брака заменим пару за наш счёт.',
  'обмен|другой размер|цвет|подобрать|не подошел': '🔄 Обмен размера или цвета возможен в течение 7 дней. Просто оформите возврат и создайте новый заказ.',
  'оператор|человек|живой|связ|жалоб|проблем|не работает': '👨‍ Оператор подключится к чату в течение 5 минут. Оставьте номер телефона, и мы перезвоним.',
  'грязь|чистка|уход|подошва|стирк|вода|пятн': '🧼 Рекомендуем использовать специальную пену для кроссовок. Не стирайте обувь в машинке. Сушите при комнатной температуре.',
  'подарок|упаковк|коробк|состояни|нов|следы носк': '🎁 Доставка осуществляется в фирменной коробке. По запросу добавим подарочный пакет (+199 ₽). Все пары новые.'
};

window.openSupportChat = () => {
  document.getElementById('support-modal').style.display = 'flex';
  // Show quick questions initially
  document.getElementById('quick-questions').style.display = 'flex';
};
window.closeSupportChat = () => document.getElementById('support-modal').style.display = 'none';

window.sendChatMessageDirect = (txt) => {
  const inp = document.getElementById('chat-input'); 
  inp.value = txt;
  window.sendChatMessage();
};

window.sendChatMessage = () => {
  const inp = document.getElementById('chat-input'); const txt = inp.value.trim(); if(!txt) return;
  
  // Hide quick questions after first message
  document.getElementById('quick-questions').style.display = 'none';

  const box = document.getElementById('chat-messages');
  box.innerHTML += `<div class="msg user">${txt}</div>`; inp.value=''; box.scrollTop=box.scrollHeight;

  // Client FAQ Response
  setTimeout(() => {
    const lower = txt.toLowerCase();
    let reply = null;
    for(const [keys, ans] of Object.entries(faqDB)) {
      if(keys.split('|').some(k => lower.includes(k))) { reply = ans; break; }
    }
    box.innerHTML += `<div class="msg bot">${reply || '🤔 Я пока не понял ваш вопрос. Попробуйте переформулировать или нажмите "Связаться с оператором".'}</div>`;
    box.scrollTop=box.scrollHeight;
  }, 500);
};

// === 14. AUTH ===
const authForm = document.getElementById('auth-form');
if(authForm) {
  let isLogin = true;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); isLogin = t.dataset.tab==='login';
    document.getElementById('auth-submit').textContent = isLogin ? 'Войти' : 'Зарегистрироваться';
    document.getElementById('auth-error').style.display='none';
  });

  authForm.onsubmit = async e => {
    e.preventDefault();
    const em = document.getElementById('email-input').value.trim();
    const pw = document.getElementById('pass-input').value;
    const btn = document.getElementById('auth-submit');
    const err = document.getElementById('auth-error');
    
    err.style.display='none'; btn.disabled=true; btn.textContent='Подождите...';
    
    try {
      if(isLogin) await window.auth.signInWithEmailAndPassword(em, pw);
      else await window.auth.createUserWithEmailAndPassword(em, pw);
    } catch(e) {
      const msgs = {
        'auth/user-not-found': 'Пользователь с таким email не найден. Проверьте адрес или зарегистрируйтесь.',
        'auth/wrong-password': 'Неверный пароль. Попробуйте снова или восстановите доступ.',
        'auth/invalid-email': 'Некорректный формат email адреса.',
        'auth/weak-password': 'Пароль должен содержать минимум 6 символов.'
      };
      err.textContent = msgs[e.code] || e.message;
      err.style.display='block';
    } finally {
      btn.disabled=false; btn.textContent=isLogin?'Войти':'Зарегистрироваться';
    }
  };

  window.auth.onAuthStateChanged(user => {
    if(user) {
      document.getElementById('auth-flow').style.display='none';
      document.getElementById('profile-actions').style.display='block';
      document.getElementById('profile-email').textContent = user.email;
      document.getElementById('profile-display-name').textContent = user.displayName || user.email.split('@')[0];
      if(ADMIN_EMAILS.includes(user.email) && !document.getElementById('admin-link')) {
        document.querySelector('.menu-grid').innerHTML += `<div class="menu-item" id="admin-link" onclick="window.navigate('admin')"><i class="fa-solid fa-lock"></i><span>Панель управления</span><i class="fa-solid fa-chevron-right"></i></div>`;
      }
    } else {
      document.getElementById('auth-flow').style.display='block';
      document.getElementById('profile-actions').style.display='none';
      document.getElementById('profile-display-name').textContent='Гость';
      document.getElementById('profile-email').textContent='Войдите в аккаунт';
      document.getElementById('admin-link')?.remove();
    }
  });
  
  document.getElementById('logout-btn').onclick = () => {
    window.auth.signOut();
    alert('✅ Вы успешно вышли из аккаунта');
  };
}

// === 15. INIT ===
seedTestProduct(); // Ensure we have at least one item
loadProducts();
updateCart();
