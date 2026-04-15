// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyBv1oWzM9P_mCGIDNYpcj5SehNmtOjzaX0",
  authDomain: "tapkidrop-7550b.firebaseapp.com",
  projectId: "tapkidrop-7550b",
  storageBucket: "tapkidrop-7550b.firebasestorage.app",
  messagingSenderId: "804177130427",
  appId: "1:804177130427:web:7b78618f21590dc6c6ca9e"
};
if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// === TELEGRAM CONFIG ===
const TG_BOT_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_ADMIN_CHAT_ID = "-1003371505343";

// === ADMIN EMAILS ===
const ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];
const isAdmin = (email) => ADMIN_EMAILS.includes(email);

// STATE
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
let purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let currentProductId = null;
let selectedSize = null;
let selectedPhotos = [];

// === PRODUCTS WITH CATEGORIES ===
const products = [
  {id:1,category:'designer',name:'Air Max 97 Silver',price:14990,desc:'Культовая модель с системой амортизации Air.',sizes:[39,40,41,42,43,44],rating:4.8,reviews:128},
  {id:2,category:'swag',name:'Ultraboost 22',price:12990,desc:'Максимальный комфорт. Технология Boost.',sizes:[40,41,42,43],rating:4.7,reviews:94},
  {id:3,category:'kids',name:'550 White Green (Kids)',price:8990,desc:'Детская версия ретро-силуэта.',sizes:[31,32,33,34,35,36],rating:4.9,reviews:215},
  {id:4,category:'classics',name:'Street Runner V3',price:4990,desc:'Локальный бренд. Легкие и дышащие.',sizes:[38,39,40,41,42],rating:4.5,reviews:42},
  {id:5,category:'designer',name:'Dunk Low Retro',price:13490,desc:'Классика стритвира.',sizes:[39,40,41,42,43],rating:4.8,reviews:156},
  {id:6,category:'sale',name:'Forum Low (Sale)',price:7990,desc:'Винтажный стиль по акции.',sizes:[40,41,42],rating:4.6,reviews:78},
  {id:7,category:'kids',name:'Junior Air Force 1',price:6990,desc:'Детские кроссовки на каждый день.',sizes:[28,29,30,31,32],rating:4.7,reviews:89},
  {id:8,category:'swag',name:'Yeezy Style 350',price:15990,desc:'Уличный стиль премиум-класса.',sizes:[40,41,42,43,44],rating:4.9,reviews:203}
];

const categories = [
  {id:'all',name:'Все',icon:'🔍'},
  {id:'designer',name:'Дизайнерские',icon:'✨'},
  {id:'kids',name:'Детские',icon:'🧒'},
  {id:'swag',name:'Сваг/Стрит',icon:'🔥'},
  {id:'classics',name:'Классика',icon:'👟'},
  {id:'sale',name:'Распродажа',icon:'🏷️'}
];

// REVIEWS & PROFILES
let allReviews = JSON.parse(localStorage.getItem('allReviews')) || {
  1: [{user:'Alex',name:'Алексей',stars:5,text:'Топ, качество огонь!',date:'10.04.2026',photos:[]}],
  2: [{user:'Max',name:'Макс',stars:4,text:'Удобные, но маломерят.',date:'09.04.2026',photos:[]}]
};
const saveReviews = () => localStorage.setItem('allReviews', JSON.stringify(allReviews));
let userProfiles = JSON.parse(localStorage.getItem('userProfiles')) || {};
const saveUserProfile = (email, name) => { userProfiles[email] = name; localStorage.setItem('userProfiles', JSON.stringify(userProfiles)); };
const getUserProfile = (email) => userProfiles[email] || email.split('@')[0];

// RANKS
const ranks = [
  { lvl: 0, title: 'Гость', discount: 0, perks: [] },
  { lvl: 1, title: 'Стритвир-фан', discount: 1, perks: [] },
  { lvl: 2, title: 'Сникерхед', discount: 2, perks: [] },
  { lvl: 3, title: 'Дроп-охотник', discount: 3, perks: [] },
  { lvl: 4, title: 'Уличный стиль', discount: 4, perks: [] },
  { lvl: 5, title: 'Гуру кроссовок', discount: 5, perks: ['Скидка на аксессуары'] },
  { lvl: 6, title: 'Коллекционер', discount: 6, perks: ['Скидка', 'Ранний доступ'] },
  { lvl: 7, title: 'Трендсеттер', discount: 7, perks: ['Скидка', 'Ранний доступ', 'Поддержка'] },
  { lvl: 8, title: 'Амбассадор', discount: 8, perks: ['Скидка', 'Ранний доступ', 'Поддержка', 'Упаковка'] },
  { lvl: 9, title: 'VIP', discount: 9, perks: ['Скидка', 'Ранний доступ', 'Поддержка', 'Упаковка', 'Менеджер'] },
  { lvl: 10, title: 'Легенда', discount: 10, perks: ['Скидка 10%', 'Бесплатная доставка', 'Эксклюзивы', 'Менеджер', 'Возврат 30 дней'] }
];
function getRankData(count) {
  const lvl = Math.min(count, 10);
  const data = ranks[lvl];
  return { lvl: count > 10 ? 10 : lvl, displayLvl: count, title: count > 10 ? 'Император' : data.title, discount: data.discount, perks: count > 10 ? [...data.perks, 'Коллаборации', 'Ивенты'] : data.perks, isMax: count >= 10 };
}

// NAV
window.navigate = target => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(target);
  if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-target="${target}"]`);
  if(btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  if(target === 'admin') renderAdmin();
  if(target === 'my-orders') renderMyOrders();
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.target));

// RENDER CARDS
const createCard = p => `
  <div class="card" onclick="openProduct(${p.id})">
    <div class="card-img">👟<button class="card-fav" onclick="event.stopPropagation(); this.innerHTML=this.innerHTML.includes('solid')?'<i class=\\'fa-regular fa-heart\\'></i>':'<i class=\\'fa-solid fa-heart\\' style=color:red></i>'"><i class="fa-regular fa-heart"></i></button></div>
    <div class="card-body">
      <div class="card-brand">${categories.find(c=>c.id===p.category)?.name || p.category}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-rating">⭐ ${p.rating} <span>(${p.reviews})</span></div>
      <div class="card-price"><span class="now">${p.price.toLocaleString('ru')} ₽</span>${p.category==='sale'?'<span class="old">'+Math.round(p.price*1.3).toLocaleString('ru')+' ₽</span>':''}</div>
      <div class="card-actions"><button class="btn-cart" onclick="event.stopPropagation(); addToCart(${p.id})">В корзину</button></div>
    </div>
  </div>`;
const renderGrid = (id, list) => { const el = document.getElementById(id); if(el) el.innerHTML = list.map(createCard).join(''); };

// INIT CATALOGS
renderGrid('home-grid', products.slice(0,4));
renderGrid('new-grid', products.slice(4,8));
renderGrid('catalog-grid', products);

// CATEGORY FILTERS
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    renderGrid('catalog-grid', cat === 'all' ? products : products.filter(p => p.category === cat));
  };
});

// SEARCH
const searchInput = document.getElementById('search-input');
if(searchInput) searchInput.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderGrid('catalog-grid', products.filter(p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)));
});

// PRODUCT DETAIL
window.openProduct = id => {
  currentProductId = id; selectedSize = null;
  const p = products.find(x => x.id === id); if(!p) return;
  document.getElementById('detail-brand').textContent = categories.find(c=>c.id===p.category)?.name || p.category;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = p.price.toLocaleString('ru') + ' ₽';
  document.getElementById('sizes-container').innerHTML = p.sizes.map(s => `<button class="size-btn" onclick="selectSize(this, ${s})">${s}</button>`).join('');
  const revs = allReviews[id] || [];
  const ratingEl = document.querySelector('#product .rating');
  if(ratingEl) ratingEl.innerHTML = `<span class="stars">⭐${'⭐'.repeat(Math.floor(p.rating))}</span><span class="count">(${revs.length || p.reviews})</span>`;
  renderReviews(id); checkReviewAvailability(id); navigate('product');
};
window.selectSize = (btn, size) => { document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedSize = size; };
window.addToCartFromDetail = () => {
  if(!selectedSize){alert('Выберите размер!');return;}
  const p = products.find(x => x.id === currentProductId);
  cart.push({...p, size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI();
  alert(`Добавлено: ${p.name} (${selectedSize})`);
};

// REVIEWS
function checkReviewAvailability(productId) {
  const box = document.getElementById('review-box'), msg = document.getElementById('no-review-msg');
  if(!box || !msg) return;
  if(!auth.currentUser) { box.style.display='none'; msg.innerHTML='<p>💡 <a href="#" onclick="navigate(\'profile\')" style="color:var(--primary)">Войдите</a> для отзыва</p>'; msg.style.display='block'; return; }
  const has = purchasedProducts.some(p => p.id === productId && p.user === auth.currentUser.email);
  const done = (allReviews[productId]||[]).some(r => r.user === auth.currentUser.email);
  if(has && !done) { box.style.display='block'; msg.style.display='none'; }
  else if(done) { box.style.display='none'; msg.innerHTML='<p>✅ Вы уже оставляли отзыв</p>'; msg.style.display='block'; }
  else { box.style.display='none'; msg.innerHTML='<p>💡 Купите товар, чтобы оставить отзыв</p>'; msg.style.display='block'; }
}
function renderReviews(id) {
  const list = document.getElementById('reviews-list'); if(!list) return;
  const revs = allReviews[id] || [];
  list.innerHTML = revs.length ? revs.map(r => `
    <div class="review-card">
      <div class="review-head"><span class="review-name">${r.name||r.user}</span><span class="review-date">${r.date}</span></div>
      <div class="stars-input" style="pointer-events:none;margin:0">${'⭐'.repeat(r.stars)}</div>
      <p class="review-text">${r.text}</p>
      ${r.photos?.length ? `<div class="review-photos">${r.photos.map(img=>`<img src="${img}" class="review-photo">`).join('')}</div>` : ''}
    </div>`).join('') : '<p style="color:var(--muted);text-align:center;padding:20px">Отзывов пока нет.</p>';
}
window.submitReview = () => {
  const txt = document.getElementById('review-text').value.trim();
  const starsEl = document.querySelector('#product .stars-input .active');
  const stars = starsEl ? starsEl.dataset.val : 5;
  if(!txt){alert('Напишите текст');return;}
  if(!auth.currentUser){alert('Войдите в аккаунт');return;}
  const rev = {user:auth.currentUser.email, name:getUserProfile(auth.currentUser.email), stars:parseInt(stars), text:txt, date:new Date().toLocaleDateString('ru'), photos:selectedPhotos};
  if(!allReviews[currentProductId]) allReviews[currentProductId]=[];
  allReviews[currentProductId].unshift(rev); saveReviews();
  document.getElementById('review-text').value=''; document.querySelectorAll('#product .stars-input i').forEach(i=>i.classList.remove('active'));
  selectedPhotos=[]; document.getElementById('photo-preview').innerHTML='';
  renderReviews(currentProductId); checkReviewAvailability(currentProductId); alert('✅ Отзыв опубликован!');
};
document.getElementById('review-photo')?.addEventListener('change', e => {
  selectedPhotos=[]; const prev=document.getElementById('photo-preview'); prev.innerHTML='';
  Array.from(e.target.files).forEach(f => {
    if(f.type.startsWith('image/')){
      const r=new FileReader(); r.onload=ev=>{selectedPhotos.push(ev.target.result); prev.innerHTML+=`<img src="${ev.target.result}" class="preview-img">`;}; r.readAsDataURL(f);
    }
  });
});

// CART
const updateCartUI = () => {
  const rank = getRankData(orderCount);
  const badge = document.getElementById('cart-badge'); if(badge) badge.textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty=document.getElementById('cart-empty'), layout=document.getElementById('cart-layout');
  if(!empty || !layout) return;
  if(!cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items').innerHTML = cart.map((i,idx)=>`
    <div class="cart-item">
      <div class="cart-item-img">👟</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-meta">${i.price.toLocaleString('ru')} ₽ • Размер ${i.size||'?'}</div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button>
          <span>${i.qty||1}</span>
          <button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
          <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="removeItem(${idx})">🗑</button>
        </div>
      </div>
    </div>`).join('');
  const sub=cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const disc=Math.floor(sub*(rank.discount/100));
  document.getElementById('cart-subtotal').textContent=sub.toLocaleString('ru')+' ₽';
  document.getElementById('discount-row').style.display=disc>0?'flex':'none';
  document.getElementById('discount-lvl').textContent=rank.discount;
  document.getElementById('discount-amount').textContent='-'+disc.toLocaleString('ru')+' ₽';
  document.getElementById('cart-total').textContent=(sub-disc).toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { cart[idx].qty=(cart[idx].qty||1)+d; if(cart[idx].qty<1)cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };
window.removeItem = idx => { cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };
window.addToCart = id => { const p=products.find(x=>x.id===id); const exist=cart.find(x=>x.id===id); if(exist)exist.qty++; else cart.push({...p,qty:1}); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };

// TELEGRAM & CHECKOUT
function sendTelegram(orderData) {
  if(!TG_BOT_TOKEN || !TG_ADMIN_CHAT_ID) return;
  const text = `📦 <b>НОВЫЙ ЗАКАЗ #${String(orderData.id).slice(-4)}</b>\n👤 ${orderData.user}\n🛍️ ${orderData.items}\n📍 ${orderData.address}\n💰 <b>${orderData.total} ₽</b>`;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_ADMIN_CHAT_ID, text, parse_mode:'HTML'})
  }).catch(e=>console.warn('TG Err:',e));
}

window.checkout = () => { 
  if(!auth.currentUser){navigate('profile');alert('Войдите в аккаунт');return;} 
  if(!cart.length) return;
  
  const sub = cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const pvzData = JSON.parse(localStorage.getItem('selectedPVZ') || '{}');
  const pvzAddress = pvzData.fullAddress || (pvzData.locality ? `${pvzData.locality}, ${pvzData.address}` : 'Не указан');
  
  const order = {
    id: Date.now(), 
    user: auth.currentUser.email,
    items: cart.map(i=>`${i.name} (${i.size||''})`).join(', '),
    total: sub.toLocaleString('ru'), 
    address: pvzAddress, 
    status: 'new',
    qrImage: '', // Base64 image data
    date: new Date().toISOString()
  };
  
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  allOrders.push(order); 
  localStorage.setItem('allOrders', JSON.stringify(allOrders));
  
  cart.forEach(item => { if(!purchasedProducts.some(p=>p.id===item.id && p.user===auth.currentUser.email)) purchasedProducts.push({id:item.id, user:auth.currentUser.email, date:new Date().toISOString()}); });
  localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
  
  sendTelegram(order);
  orderCount++; localStorage.setItem('orderCount', orderCount);
  const nr=getRankData(orderCount), pr=getRankData(orderCount-1);
  if(nr.lvl>pr.lvl) showToast(`LVL ${nr.displayLvl}`, nr.title);
  alert('✅ Заказ оформлен!');
  cart=[]; localStorage.setItem('cart','[]'); updateCartUI(); updateProfileUI();
};
function showToast(t,d){const el=document.getElementById('level-toast');document.getElementById('toast-desc').textContent=d;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}

// PROFILE & ADMIN
window.saveUsername = () => { const n=document.getElementById('username-input').value.trim(); if(!n||!auth.currentUser)return alert('Введите имя'); saveUserProfile(auth.currentUser.email,n); updateProfileUI(); document.getElementById('settings-card').style.display='none'; alert('✅ Сохранено'); };
const updateProfileUI = () => {
  const rank=getRankData(orderCount), name=auth.currentUser?getUserProfile(auth.currentUser.email):'Гость';
  document.getElementById('profile-display-name').textContent=name;
  document.getElementById('user-lvl').textContent=rank.displayLvl; document.getElementById('user-discount').textContent=rank.discount;
  document.getElementById('lvl-progress').style.width=(rank.isMax?100:((rank.displayLvl%10)/10)*100)+'%';
  document.getElementById('progress-text').textContent=rank.isMax?'🏆 Максимум!':`До след. уровня: ${10-rank.displayLvl} заказов`;
  document.getElementById('stat-orders').textContent=orderCount; document.getElementById('stat-bonus').textContent=orderCount*50;
  if(auth.currentUser) document.getElementById('username-input').value=name;
  loadSavedPVZ();
};

// === MY ORDERS (CLIENT) - SHOW UPLOADED QR IMAGE ===
window.renderMyOrders = () => {
  if(!auth.currentUser) return;
  const container = document.getElementById('my-orders-list');
  if(!container) return;
  
  const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const myOrders = allOrders.filter(o => o.user === auth.currentUser.email).reverse();
  
  if(myOrders.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">У вас пока нет заказов.</p>';
    return;
  }
  
  container.innerHTML = myOrders.map(o => {
    let statusText = '', statusColor = '', qrBlock = '';
    switch(o.status) {
      case 'new': statusText='В обработке'; statusColor='orange'; break;
      case 'assembling': statusText='В сборке'; statusColor='#005bff'; break;
      case 'shipping': statusText='В пути'; statusColor='#00b341'; break;
      case 'delivered': 
        statusText='Доставлен'; statusColor='#111';
        // Если админ загрузил фото кода, показываем его
        if(o.qrImage) {
          qrBlock = `
            <div style="margin-top:12px;padding:12px;background:#f0f7ff;border-radius:8px;text-align:center">
              <p style="font-size:0.85rem;color:var(--muted);margin-bottom:8px">📱 Код для получения на ПВЗ:</p>
              <img src="${o.qrImage}" alt="Pickup Code" style="max-width:100%;height:auto;border-radius:8px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
              <p style="font-size:0.75rem;color:var(--muted);margin-top:6px">Покажите этот код сотруднику пункта выдачи</p>
            </div>`;
        }
        break;
    }
    return `
    <div class="order-card">
      <div class="order-head"><span>Заказ #${String(o.id).slice(-4)}</span><span style="font-weight:700;color:${statusColor}">${statusText}</span></div>
      <div class="order-body">
        <div class="order-items">${o.items}</div>
        <div class="order-addr">📍 ${o.address}</div>
        <div class="order-sum">${o.total} ₽</div>
      </div>
      ${qrBlock}
    </div>`;
  }).join('');
};

// === ADMIN PANEL - IMAGE UPLOAD FOR QR ===
function renderAdmin() {
  if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return; 
  const container = document.getElementById('orders-list-admin');
  if(!container) return;
  
  const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const allUsers = [...new Set(allOrders.map(o => o.user))];
  
  const totalRevenue = allOrders.reduce((sum,o)=>sum+parseFloat(o.total.replace(/\s|₽/g,'')),0);
  const todayOrders = allOrders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length;
  
  container.innerHTML = `
    <div class="admin-stats">
      <div class="stat-box"><span class="stat-num">${allOrders.length}</span><small>Всего заказов</small></div>
      <div class="stat-box"><span class="stat-num">${totalRevenue.toLocaleString('ru')} ₽</span><small>Выручка</small></div>
      <div class="stat-box"><span class="stat-num">${allUsers.length}</span><small>Клиентов</small></div>
      <div class="stat-box"><span class="stat-num">${todayOrders}</span><small>Сегодня</small></div>
    </div>
    
    <div style="margin:16px 0;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn--outline" onclick="exportOrdersCSV()">📊 Экспорт CSV</button>
      <button class="btn btn--outline" onclick="exportOrdersJSON()">📄 Экспорт JSON</button>
      <button class="btn btn--outline" onclick="clearAllOrders()" style="color:var(--danger);border-color:var(--danger)">🗑 Очистить всё</button>
    </div>
    
    <div style="margin-bottom:12px;font-weight:600">Пользователи:</div>
    <div style="margin-bottom:16px;max-height:120px;overflow-y:auto;background:var(--surface);border-radius:8px;padding:8px">
      ${allUsers.map(u => `<div style="font-size:0.85rem;padding:4px 0;border-bottom:1px solid var(--border)">${u}</div>`).join('') || '<span style="color:var(--muted)">Нет пользователей</span>'}
    </div>
    
    <div style="margin-bottom:12px;font-weight:600">Заказы:</div>
    ${allOrders.length===0 ? '<p style="color:var(--muted)">Заказов нет</p>' : 
    allOrders.reverse().map(o => {
      const btn = (s,txt) => `<button style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:${o.status===s?'var(--primary)':'transparent'};color:${o.status===s?'#fff':'var(--text)'};cursor:pointer;font-size:0.7rem;margin-right:4px" onclick="updateOrderStatus(${o.id},'${s}')">${txt}</button>`;
      
      // Кнопка загрузки фото (видит только админ, только для доставленных)
      const qrUpload = `
        <div style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <input type="file" id="qr-file-${o.id}" accept="image/*" style="display:none" onchange="saveOrderQRImage(${o.id}, this)">
          <label for="qr-file-${o.id}" style="padding:4px 10px;background:var(--primary);color:#fff;border-radius:4px;cursor:pointer;font-size:0.75rem;display:flex;align-items:center;gap:4px">
            📷 Загрузить код
          </label>
          ${o.qrImage ? '<span style="font-size:0.75rem;color:var(--success)">✅ Код загружен</span>' : ''}
          ${o.qrImage ? `<button style="padding:2px 6px;background:var(--danger);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:0.7rem" onclick="clearOrderQR(${o.id})">✕</button>` : ''}
        </div>`;
      
      return `
      <div class="order-row">
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700">#${String(o.id).slice(-4)} | ${o.user.split('@')[0]}</div>
          <div style="font-size:0.85rem;color:var(--muted)">${o.items}</div>
          <div style="font-size:0.8rem;color:var(--muted)">📍 ${o.address}</div>
          <div style="margin-top:6px">
            ${btn('new','Новый')}${btn('assembling','Сборка')}${btn('shipping','Отправлен')}${btn('delivered','Доставлен')}
          </div>
          ${o.status === 'delivered' ? qrUpload : ''}
        </div>
        <div style="text-align:right;min-width:100px"><b>${o.total} ₽</b><br><small style="color:var(--muted)">${new Date(o.date).toLocaleDateString('ru')}</small></div>
      </div>`;
    }).join('')}
  `;
}

// Загрузка изображения как base64
window.saveOrderQRImage = (id, input) => {
  const file = input.files[0];
  if(!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Image = e.target.result;
    let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
    const order = allOrders.find(o => o.id === id);
    if(order) {
      order.qrImage = base64Image;
      localStorage.setItem('allOrders', JSON.stringify(allOrders));
      alert('✅ Фото кода сохранено! Клиент увидит его в приложении.');
      renderAdmin();
    }
  };
  reader.readAsDataURL(file);
};

// Удаление загруженного кода
window.clearOrderQR = (id) => {
  if(!confirm('Удалить код для этого заказа?')) return;
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const order = allOrders.find(o => o.id === id);
  if(order) {
    order.qrImage = '';
    localStorage.setItem('allOrders', JSON.stringify(allOrders));
    renderAdmin();
  }
};

window.updateOrderStatus = (id, status) => {
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const order = allOrders.find(o => o.id === id);
  if(order) {
    order.status = status;
    localStorage.setItem('allOrders', JSON.stringify(allOrders));
    renderAdmin();
    if(status === 'delivered') {
      sendTelegram({id, user:order.user, items:'✅ Ваш заказ доставлен! Код для получения появится в разделе "Мои заказы".', total:'', address:'', status});
    }
  }
};

window.exportOrdersCSV = () => {
  const all = JSON.parse(localStorage.getItem('allOrders'))||[];
  if(!all.length) return alert('Нет заказов');
  const csv = 'ID,User,Items,Total,Address,Status,HasQR,Date\n' + 
    all.map(o => `${o.id},"${o.user}","${o.items}",${o.total},"${o.address}",${o.status},${o.qrImage?'Yes':'No'},${o.date}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click();
};

window.exportOrdersJSON = () => {
  const all = JSON.parse(localStorage.getItem('allOrders'))||[];
  if(!all.length) return alert('Нет заказов');
  const blob = new Blob([JSON.stringify(all,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.json`; a.click();
};

window.clearAllOrders=()=>{if(confirm('Удалить ВСЮ историю заказов?')){localStorage.removeItem('allOrders');renderAdmin();}};

// === BOT COMMANDS IN CHAT (FIXED) ===
const botCommands = {
  '/stats': () => {
    if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return '🔒 Доступ только для админов';
    const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
    const allUsers = [...new Set(allOrders.map(o => o.user))];
    const totalRevenue = allOrders.reduce((sum,o)=>sum+parseFloat(o.total.replace(/\s|₽/g,'')),0);
    const todayOrders = allOrders.filter(o => new Date(o.date).toDateString() === new Date().toDateString()).length;
    const statusCounts = {};
    allOrders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status]||0) + 1; });
    return `
📊 <b>СТАТИСТИКА САЙТА</b>

👥 <b>Пользователи:</b> ${allUsers.length}
📦 <b>Всего заказов:</b> ${allOrders.length}
💰 <b>Выручка:</b> ${totalRevenue.toLocaleString('ru')} ₽
📅 <b>Заказов сегодня:</b> ${todayOrders}

📈 <b>По статусам:</b>
• Новый: ${statusCounts['new']||0}
• В сборке: ${statusCounts['assembling']||0}
• В пути: ${statusCounts['shipping']||0}
• Доставлен: ${statusCounts['delivered']||0}

🛍️ <b>Товаров в каталоге:</b> ${products.length}
⭐ <b>Отзывов:</b> ${Object.values(allReviews).flat().length}
🎁 <b>Активных промокодов:</b> 1 (TAPKI2026)

🕐 <b>Обновлено:</b> ${new Date().toLocaleString('ru')}
    `.trim();
  },
  '/users': () => {
    if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return '🔒 Доступ только для админов';
    const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
    const users = [...new Set(allOrders.map(o => o.user))];
    if(users.length === 0) return '👥 Пользователей пока нет';
    return `👥 <b>Список пользователей:</b>\n\n` + users.map((u,i) => `${i+1}. ${u.split('@')[0]} (${allOrders.filter(o=>o.user===u).length} зак.)`).join('\n');
  },
  '/orders': () => {
    if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return '🔒 Доступ только для админов';
    const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
    if(allOrders.length === 0) return '📦 Заказов пока нет';
    const recent = allOrders.slice(-5).reverse();
    return `📦 <b>Последние 5 заказов:</b>\n\n` + recent.map(o => `• #${String(o.id).slice(-4)} | ${o.total} ₽ | ${o.status}`).join('\n');
  },
  '/clear': () => '⚠️ Для очистки введите: <b>/clear confirm</b>',
  '/clear confirm': () => {
    if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return '🔒 Доступ только для админов';
    localStorage.removeItem('allOrders');
    localStorage.removeItem('cart');
    localStorage.removeItem('orderCount');
    return '🗑️ <b>Все данные очищены!</b>\n\n⚠️ Перезагрузите страницу.';
  },
  '/help': () => `🤖 <b>Команды для админа:</b>\n\n/stats — статистика сайта\n/users — список клиентов\n/orders — последние заказы\n/clear confirm — очистить всё`,
};

// === SUPPORT CHAT WITH FIXED COMMANDS ===
window.openSupportChat = () => {
  document.getElementById('support-modal').style.display = 'flex';
  const chatBox = document.getElementById('chat-messages');
  chatBox.innerHTML = '<div class="msg bot">👋 Привет! Я помощник ТапкиДроп. Выберите вопрос или напишите свой.<br><br><small>Админы: введите /help для команд</small></div>';
  renderQuickReplies();
};
window.closeSupportChat = () => { document.getElementById('support-modal').style.display = 'none'; };

function renderQuickReplies() {
  const chatBox = document.getElementById('chat-messages');
  const old = chatBox.querySelector('.quick-replies'); if(old) old.remove();
  const container = document.createElement('div'); container.className = 'quick-replies';
  ["📦 Где заказ?","↩️ Возврат","📏 Размер","💳 Оплата","🏷️ Промокод","👟 Брак","🔄 Обмен","🧼 Уход","👨‍ Оператор"].forEach(text => {
    const btn = document.createElement('button'); btn.className = 'quick-reply-btn'; btn.textContent = text;
    btn.onclick = () => handleChatInput(text);
    container.appendChild(btn);
  });
  chatBox.appendChild(container);
}

window.sendChatMessage = () => {
  const input = document.getElementById('chat-input'); const text = input.value.trim(); if(!text) return;
  input.value = ''; handleChatInput(text);
};

function handleChatInput(text) {
  const chatBox = document.getElementById('chat-messages');
  const qr = chatBox.querySelector('.quick-replies'); if(qr) qr.remove();
  chatBox.innerHTML += `<div class="msg user">${text}</div>`; chatBox.scrollTop = chatBox.scrollHeight;
  
  // === FIX: Проверка команд (точное совпадение, регистр не важен) ===
  const cmd = text.trim().toLowerCase();
  if(cmd.startsWith('/')) {
    setTimeout(() => {
      const handler = botCommands[cmd];
      if(handler) {
        chatBox.innerHTML += `<div class="msg bot">${handler()}</div>`;
      } else {
        chatBox.innerHTML += `<div class="msg bot">❌ Неизвестная команда. Введите /help</div>`;
      }
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 200);
    return;
  }
  
  // Обычные ответы
  const faqDB = {
    'доставк|сроки|где заказ|трек|когда придёт|статус': '🚚 Доставка: 1-3 дня. Бесплатно от 5000₽.',
    'возврат|вернуть|деньги назад|отказ|не понравил': '↩️ Возврат 14 дней. Курьер заберет бесплатно.',
    'размер|маломерит|большемерит|таблица|нога': '📏 Размеры по евро-сетке. Если между — берите больше.',
    'оплат|карт|сбер|тиьков|сбп|наложен': '💳 МИР, Visa, MC, СБП. Рассрочка 3-6 мес.',
    'промокод|скидк|купон|акци|бонус': '🎁 Введите TAPKI2026 для скидки -15%.',
    'качество|материал|кож|замш|брак': '👟 Все партии с контролем. Брак заменим.',
    'обмен|другой размер|цвет|не подошел': '🔄 Обмен в течение 7 дней.',
    'оператор|человек|живой|связ|жалоб': '👨‍ Оператор ответит в течение 5 мин.',
    'грязь|чистка|уход|подошва|стирк': '🧼 Используйте пену для кроссовок.',
    'подарок|упаковк|коробк|состояни': '🎁 Доставка в фирменной коробке.'
  };
  
  const lower = text.toLowerCase();
  let reply = null;
  for(const [keys, ans] of Object.entries(faqDB)) {
    if(keys.split('|').some(k => lower.includes(k))) { reply = ans; break; }
  }
  
  setTimeout(() => {
    const finalMsg = reply || '🤔 Не понял вопрос. Нажмите кнопку выше или введите /help.';
    chatBox.innerHTML += `<div class="msg bot">${finalMsg}</div>`;
    if(!reply) chatBox.innerHTML += `<div class="quick-replies"><button class="quick-reply-btn" onclick="handleChatInput('👨‍ Оператор')">👨‍ Связаться с оператором</button></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 400);
}

// PHOTO UPLOAD FOR CHAT
document.getElementById('chat-file')?.addEventListener('change', function(e) {
  const file = e.target.files[0]; if(!file) return;
  const chatBox = document.getElementById('chat-messages');
  const reader = new FileReader();
  reader.onload = ev => {
    chatBox.innerHTML += `<div class="msg user"><img src="${ev.target.result}" alt="photo" style="max-width:200px;border-radius:8px"></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
      chatBox.innerHTML += `<div class="msg bot">📸 Фото принял! Менеджер проверит и ответит в течение 10 минут.</div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);
  };
  reader.readAsDataURL(file);
  this.value = '';
});

// 📍 PVZ SELECTOR
window.openPVZModal = () => {
  const modal = document.getElementById('pvz-modal');
  const content = modal.querySelector('.pvz-content');
  content.innerHTML = `
    <div class="pvz-header"><h3>Адрес доставки</h3><button onclick="closePVZModal()">✕</button></div>
    <div style="padding:16px">
      <p style="color:var(--muted);font-size:0.9rem;margin-bottom:16px">Укажите, куда доставить заказ.<br><small>Примеры: Москва, с. Красное, д. Ивановка, СНТ "Ромашка"</small></p>
      <input type="text" id="pvz-locality" placeholder="Населённый пункт *" class="input" style="margin-bottom:10px">
      <input type="text" id="pvz-address" placeholder="Улица, дом, ПВЗ *" class="input" style="margin-bottom:10px">
      <input type="text" id="pvz-details" placeholder="Детали (подъезд, код)" class="input" style="margin-bottom:20px">
      <button class="btn btn--primary full" onclick="savePVZManual()">💾 Сохранить адрес</button>
    </div>`;
  const saved = JSON.parse(localStorage.getItem('selectedPVZ') || '{}');
  if(saved.locality) document.getElementById('pvz-locality').value = saved.locality;
  if(saved.address) document.getElementById('pvz-address').value = saved.address;
  if(saved.details) document.getElementById('pvz-details').value = saved.details;
  modal.style.display = 'flex';
};
window.closePVZModal = () => { document.getElementById('pvz-modal').style.display = 'none'; };
window.savePVZManual = () => {
  const locality = document.getElementById('pvz-locality').value.trim();
  const address = document.getElementById('pvz-address').value.trim();
  const details = document.getElementById('pvz-details').value.trim();
  if(!locality || !address) { alert('⚠️ Заполните Населённый пункт и Адрес'); return; }
  const pvzData = { locality, address, details, fullAddress: `${locality}, ${address}${details ? ', ' + details : ''}`, savedAt: new Date().toISOString() };
  localStorage.setItem('selectedPVZ', JSON.stringify(pvzData));
  alert('✅ Адрес сохранён!');
  closePVZModal(); loadSavedPVZ();
};
function loadSavedPVZ() {
  const saved = localStorage.getItem('selectedPVZ');
  if(saved) {
    const pvz = JSON.parse(saved);
    const pvzBtn = document.querySelector('.menu-item[onclick="openPVZModal()"]');
    if(pvzBtn) {
      const short = pvz.fullAddress || [pvz.locality, pvz.address].filter(Boolean).join(', ');
      pvzBtn.innerHTML = `<i class="fa-solid fa-location-dot"></i><span>📍 ${short.slice(0, 22)}${short.length>22?'...':''}</span><i class="fa-solid fa-check" style="color:var(--success)"></i>`;
    }
  }
}

// PWA
if('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(console.warn); });
}
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
if(installBtn) window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.style.display = 'flex'; });
window.installApp = () => { if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt=null; installBtn.style.display='none'; }); } };

// INIT
updateCartUI(); updateProfileUI(); loadSavedPVZ();
