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
  const auth = firebase.auth();
  const db = firebase.firestore();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  console.log("[FB] OK");
} catch (e) { console.error("[FB] Init error:", e); }

// === 2. GLOBALS ===
const ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
let purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let products = [];
let currentProductId = null;
let selectedSize = null;

const categories = [
  {id:'all',name:'Все'},{id:'designer',name:'Дизайнерские'},{id:'kids',name:'Детские'},
  {id:'swag',name:'Сваг'},{id:'classics',name:'Классика'},{id:'sale',name:'Распродажа'}
];

// === 3. DB & RENDER ===
function loadProducts() {
  try {
    db.collection('products').get().then(snap => {
      products = [];
      snap.forEach(d => { const data = d.data(); data.id = d.id; products.push(data); });
      renderGrid('home-grid', products.slice(0,4));
      renderGrid('catalog-grid', products);
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
        <div class="card-price"><span class="now">${p.price?.toLocaleString('ru')||0} ₽</span></div>
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
  cart.push({...p, size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(cart)); updateCart();
  alert('Добавлено');
};
window.addToCart = id => {
  const p = products.find(x => x.id === id);
  const ex = cart.find(x => x.id === id);
  if(ex) ex.qty++; else cart.push({...p, qty:1});
  localStorage.setItem('cart',JSON.stringify(cart)); updateCart();
};

// === 6. CART ===
const updateCart = () => {
  const badge = document.getElementById('cart-badge'); if(badge) badge.textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty = document.getElementById('cart-empty'), layout = document.getElementById('cart-layout');
  if(!empty || !layout) return;
  if(!cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items').innerHTML = cart.map((i,idx)=>`
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-meta">${i.price?.toLocaleString('ru')||0} ₽ • ${i.size||'?'}</div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button><span>${i.qty||1}</span><button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
          <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="removeItem(${idx})">🗑</button>
        </div>
      </div>
    </div>`).join('');
  document.getElementById('cart-total').textContent = cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0).toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { cart[idx].qty=(cart[idx].qty||1)+d; if(cart[idx].qty<1)cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCart(); };
window.removeItem = idx => { cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCart(); };

// === 7. CHECKOUT ===
window.checkout = () => {
  if(!firebase.auth().currentUser) { window.navigate('profile'); return alert('Войдите'); }
  if(!cart.length) return;
  const total = cart.reduce((s,i)=>s+(i.price||0)*(i.qty||1),0);
  const order = {
    id: Date.now(), user: firebase.auth().currentUser.email,
    items: cart.map(i=>`${i.name} (${i.size||''})`).join(', '),
    total: total.toLocaleString('ru'), address: 'Не указан', status: 'new', qrImage: '', date: new Date().toISOString()
  };
  let orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  orders.push(order); localStorage.setItem('allOrders', JSON.stringify(orders));
  cart.forEach(it => { if(!purchasedProducts.some(p=>p.id===it.id && p.user===order.user)) purchasedProducts.push({id:it.id, user:order.user, date:new Date().toISOString()}); });
  localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
  orderCount++; localStorage.setItem('orderCount', orderCount);
  alert('✅ Заказ оформлен');
  cart=[]; localStorage.setItem('cart','[]'); updateCart();
};

// === 8. ORDERS ===
window.renderOrders = () => {
  const c = document.getElementById('my-orders-list'); if(!c) return;
  const orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const mine = orders.filter(o => o.user === firebase.auth().currentUser?.email).reverse();
  c.innerHTML = mine.length ? mine.map(o => `
    <div style="background:var(--card);padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;font-weight:700"><span>#${String(o.id).slice(-4)}</span><span style="color:${o.status==='delivered'?'green':'orange'}">${o.status}</span></div>
      <div style="font-size:0.9rem;margin:6px 0">${o.items}</div>
      <div style="font-weight:600">${o.total} ₽</div>
      ${o.qrImage ? `<img src="${o.qrImage}" style="max-width:100%;margin-top:8px;border-radius:8px">` : ''}
    </div>`).join('') : '<p style="text-align:center;color:var(--muted);padding:20px">Нет заказов</p>';
};

// === 9. ADMIN ===
function renderAdmin() {
  const c = document.getElementById('orders-list-admin'); if(!c) return;
  const orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const st = document.getElementById('admin-stats');
  if(st) st.innerHTML = `<div class="stat-box"><span class="stat-num">${orders.length}</span><small>Заказов</small></div>`;
  c.innerHTML = orders.reverse().map(o => `
    <div class="order-row">
      <div style="flex:1"><b>#${String(o.id).slice(-4)} | ${o.user?.split('@')[0]}</b><br><small>${o.items}</small>
        <div style="margin-top:6px">${['new','assembling','shipping','delivered'].map(s=>`<button style="padding:4px 8px;border:1px solid var(--border);background:${o.status===s?'var(--primary)':'transparent'};color:${o.status===s?'#fff':'var(--text)'};border-radius:4px;cursor:pointer;font-size:0.75rem" onclick="updateStatus(${o.id},'${s}')">${s}</button>`).join('')}</div>
      </div>
      <div style="text-align:right"><b>${o.total} ₽</b></div>
    </div>`).join('');
}
window.updateStatus = (id, status) => {
  let orders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const o = orders.find(x => x.id === id);
  if(o) { o.status = status; localStorage.setItem('allOrders', JSON.stringify(orders)); renderAdmin(); }
};

// === 10. CHAT & BOT ===
const botCommands = {
  '/test': () => '✅ Бот работает',
  '/stats': () => {
    if(!firebase.auth().currentUser || !ADMIN_EMAILS.includes(firebase.auth().currentUser.email)) return '🔒 Только админам';
    const orders = JSON.parse(localStorage.getItem('allOrders')||'[]');
    const rev = orders.reduce((s,o)=>s+parseFloat(o.total)||0,0);
    return `📊 Заказов: ${orders.length}\n💰 Выручка: ${rev.toLocaleString('ru')} ₽`;
  },
  '/add': async (args) => {
    if(!firebase.auth().currentUser || !ADMIN_EMAILS.includes(firebase.auth().currentUser.email)) return '🔒 Только админам';
    const p = args.split('|').map(x=>x.trim());
    if(p.length<5) return '❌ Формат: /add Название | Цена | Категория | Размеры | Описание | Фото1, Фото2';
    const [name, price, cat, sizes, desc, imgs] = p;
    const images = imgs ? imgs.split(',').map(u=>u.trim()).filter(u=>u.startsWith('http')) : ['👟'];
    if(images.length===0) images.push('👟');
    try {
      await db.collection('products').add({name, price: Number(price), category: cat, sizes: sizes.split(',').map(s=>s.trim()), desc, images, rating:5, reviews:0, createdAt:new Date().toISOString()});
      return `✅ ${name} добавлен`;
    } catch(e) { return `❌ ${e.message}`; }
  },
  '/help': () => '🤖 /test, /stats, /add Name|Price|Cat|Sizes|Desc|Img1,Img2'
};

window.openSupportChat = () => {
  document.getElementById('support-modal').style.display = 'flex';
  const box = document.getElementById('chat-messages');
  box.innerHTML = '<div class="msg bot">👋 Введите /help</div>';
};
window.closeSupportChat = () => document.getElementById('support-modal').style.display = 'none';

window.sendChatMessage = () => {
  const inp = document.getElementById('chat-input'); const txt = inp.value.trim(); if(!txt) return;
  const box = document.getElementById('chat-messages');
  box.innerHTML += `<div class="msg user">${txt}</div>`; inp.value=''; box.scrollTop=box.scrollHeight;
  
  if(txt.startsWith('/')) {
    const m = txt.match(/^\/(\w+)\s*(.*)?$/);
    if(m) {
      const cmd = '/' + m[1].toLowerCase(); const args = m[2]||'';
      setTimeout(async () => {
        const handler = botCommands[cmd];
        box.innerHTML += `<div class="msg bot">${handler ? await handler(args) : '❌ Неизвестная команда'}</div>`;
        box.scrollTop=box.scrollHeight;
      }, 300);
    }
  } else {
    setTimeout(() => { box.innerHTML += `<div class="msg bot">🤖 Введите /help</div>`; box.scrollTop=box.scrollHeight; }, 400);
  }
};

// === 11. AUTH ===
const authForm = document.getElementById('auth-form');
if(authForm) {
  let isLogin = true;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active'); isLogin = t.dataset.tab==='login';
    document.getElementById('auth-submit').textContent = isLogin ? 'Войти' : 'Рег';
    document.getElementById('auth-error').style.display='none';
  });

  authForm.onsubmit = async e => {
    e.preventDefault();
    const em = document.getElementById('email-input').value.trim(), pw = document.getElementById('pass-input').value;
    const btn = document.getElementById('auth-submit'), err = document.getElementById('auth-error');
    err.style.display='none'; btn.disabled=true; btn.textContent='...';
    try { isLogin ? await auth.signInWithEmailAndPassword(em,pw) : await auth.createUserWithEmailAndPassword(em,pw); }
    catch(e) { err.textContent = e.message; err.style.display='block'; }
    finally { btn.disabled=false; btn.textContent=isLogin?'Войти':'Рег'; }
  };

  auth.onAuthStateChanged(user => {
    if(user) {
      document.getElementById('auth-flow').style.display='none';
      document.getElementById('profile-actions').style.display='block';
      document.getElementById('profile-email').textContent = user.email;
      if(ADMIN_EMAILS.includes(user.email) && !document.getElementById('admin-link')) {
        document.querySelector('.menu-grid').innerHTML += `<div class="menu-item" id="admin-link" onclick="window.navigate('admin')"><i class="fa-solid fa-lock"></i><span>Админка</span></div>`;
      }
    } else {
      document.getElementById('auth-flow').style.display='block';
      document.getElementById('profile-actions').style.display='none';
      document.getElementById('profile-display-name').textContent='Гость';
      document.getElementById('profile-email').textContent='Войдите';
      document.getElementById('admin-link')?.remove();
    }
  });
  document.getElementById('logout-btn').onclick = () => auth.signOut();
}

// === 12. INIT ===
loadProducts();
updateCart();
