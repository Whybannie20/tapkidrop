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

// STATE
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
let purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let currentProductId = null;
let selectedSize = null;
let selectedPhotos = [];

// DATA
const products = [
  {id:1,brand:'nike',name:'Air Max 97 Silver',price:14990,desc:'Культовая модель с системой амортизации Air.',sizes:[39,40,41,42,43,44],rating:4.8,reviews:128},
  {id:2,brand:'adidas',name:'Ultraboost 22',price:12990,desc:'Максимальный комфорт. Технология Boost.',sizes:[40,41,42,43],rating:4.7,reviews:94},
  {id:3,brand:'newbalance',name:'550 White Green',price:11990,desc:'Ретро-силуэт. Натуральная кожа.',sizes:[41,42,43,44],rating:4.9,reviews:215},
  {id:4,brand:'local',name:'Street Runner V3',price:4990,desc:'Локальный бренд. Легкие и дышащие.',sizes:[38,39,40,41,42],rating:4.5,reviews:42},
  {id:5,brand:'nike',name:'Dunk Low Retro',price:13490,desc:'Классика стритвира.',sizes:[39,40,41,42,43],rating:4.8,reviews:156},
  {id:6,brand:'adidas',name:'Forum Low',price:10990,desc:'Винтажный баскетбольный стиль.',sizes:[40,41,42],rating:4.6,reviews:78}
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
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.target));

// RENDER CARDS
const createCard = p => `
  <div class="card" onclick="openProduct(${p.id})">
    <div class="card-img">👟<button class="card-fav" onclick="event.stopPropagation(); this.innerHTML=this.innerHTML.includes('solid')?'<i class=\\'fa-regular fa-heart\\'></i>':'<i class=\\'fa-solid fa-heart\\' style=color:red></i>'"><i class="fa-regular fa-heart"></i></button></div>
    <div class="card-body">
      <div class="card-brand">${p.brand}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-rating">⭐ ${p.rating} <span>(${p.reviews})</span></div>
      <div class="card-price"><span class="now">${p.price.toLocaleString('ru')} ₽</span><span class="old">${Math.round(p.price*1.2).toLocaleString('ru')} ₽</span></div>
      <div class="card-actions"><button class="btn-cart" onclick="event.stopPropagation(); addToCart(${p.id})">В корзину</button></div>
    </div>
  </div>`;
const renderGrid = (id, list) => { const el = document.getElementById(id); if(el) el.innerHTML = list.map(createCard).join(''); };

// INIT CATALOGS
renderGrid('home-grid', products.slice(0,4));
renderGrid('new-grid', products.slice(2,6));
renderGrid('catalog-grid', products);

// FILTERS & SEARCH
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    renderGrid('catalog-grid', cat === 'all' ? products : products.filter(p => p.brand === cat));
  };
});
const searchInput = document.getElementById('search-input');
if(searchInput) searchInput.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderGrid('catalog-grid', products.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)));
});

// PRODUCT DETAIL
window.openProduct = id => {
  currentProductId = id; selectedSize = null;
  const p = products.find(x => x.id === id); if(!p) return;
  document.getElementById('detail-brand').textContent = p.brand;
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

// ==========================================
// 🔥 TELEGRAM (FIXED & DETAILED)
// ==========================================
function sendTelegram(orderData) {
  if(!TG_BOT_TOKEN || !TG_ADMIN_CHAT_ID) return;

  // Получаем данные клиента
  const user = auth.currentUser;
  const userName = user ? (getUserProfile(user.email) || 'Клиент') : 'Гость';
  const userEmail = user ? user.email : 'Нет почты';
  
  // Форматируем список товаров
  let itemsText = "";
  if(Array.isArray(orderData.cartItems)) {
    itemsText = orderData.cartItems.map(item => `• ${item.name} (Разм: ${item.size||'?'}) — ${item.price.toLocaleString('ru')} ₽`).join('\n');
  } else {
    itemsText = orderData.items;
  }

  // Формируем сообщение (HTML)
  const text = `
🔥 <b>НОВЫЙ ЗАКАЗ #${String(orderData.id).slice(-4)}</b>

👤 <b>Кто заказал:</b> ${userName}
📧 <b>Контакты:</b> ${userEmail}

🛍️ <b>Состав заказа:</b>
${itemsText}

💰 <b>ИТОГО К ОПЛАТЕ:</b> ${orderData.total} ₽
${orderData.discount > 0 ? `🎁 <b>Скидка:</b> ${orderData.discount}%` : ''}

📍 <b>Доставка (Адрес):</b>
${orderData.address || 'Не указан'}

📅 <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
  `.trim();

  // Отправка
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      chat_id: TG_ADMIN_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    })
  })
  .then(res => console.log('✅ Telegram sent'))
  .catch(err => console.error('❌ Telegram error:', err));
}

// CHECKOUT
window.checkout = () => { 
  if(!auth.currentUser){navigate('profile');alert('Войдите в аккаунт');return;} 
  if(!cart.length) return;

  // 1. Собираем данные заказа
  const sub = cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const rank = getRankData(orderCount);
  const discount = Math.floor(sub*(rank.discount/100));
  const total = sub - discount;

  // 2. Адрес
  const pvzData = JSON.parse(localStorage.getItem('selectedPVZ') || '{}');
  const pvzAddress = pvzData.fullAddress || (pvzData.locality ? `${pvzData.locality}, ${pvzData.address}${pvzData.details ? ', ' + pvzData.details : ''}` : 'Не указан');

  // 3. Создаем объект заказа
  const order = {
    id: Date.now(), 
    user: auth.currentUser.email,
    userName: getUserProfile(auth.currentUser.email),
    items: cart.map(i=>`${i.name} (${i.size||''})`).join(', '),
    cartItems: cart, // Полный массив для отправки в бота
    total: total.toLocaleString('ru'),
    discount: rank.discount,
    address: pvzAddress,
    status:'Новый', 
    date:new Date().toISOString()
  };

  // 4. Сохраняем в историю заказов
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  allOrders.push(order); 
  localStorage.setItem('allOrders', JSON.stringify(allOrders));
  
  // 5. Помечаем товары как купленные (для отзывов)
  cart.forEach(item => { 
    if(!purchasedProducts.some(p=>p.id===item.id && p.user===auth.currentUser.email)) 
      purchasedProducts.push({id:item.id, user:auth.currentUser.email, date:new Date().toISOString()}); 
  });
  localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
  
  // 6. ОТПРАВЛЯЕМ В ТЕЛЕГРАМ (теперь точно каждый раз)
  sendTelegram(order);

  // 7. UI и уровни
  orderCount++; localStorage.setItem('orderCount', orderCount);
  const nr=getRankData(orderCount), pr=getRankData(orderCount-1);
  if(nr.lvl>pr.lvl) showToast(`LVL ${nr.displayLvl}`, nr.title);
  
  alert('✅ Заказ оформлен! Данные отправлены менеджеру.');
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
function renderAdmin() {
  if(!auth.currentUser || auth.currentUser.email !== 'maslakov.antoni@yandex.ru') return; 
  const list=document.getElementById('orders-list-admin');
  const all=JSON.parse(localStorage.getItem('allOrders'))||[];
  list.innerHTML=all.length?all.reverse().map(o=>`<div class="order-row"><div>#${String(o.id).slice(-4)}<br><small>${o.userName||o.user}</small><br><small style="color:var(--muted)">${o.address||''}</small></div><div style="text-align:right"><b>${o.total} ₽</b><br><small>${o.status}</small></div></div>`).join(''):'<p style="color:var(--muted)">Заказов нет</p>';
}
window.clearAllOrders=()=>{if(confirm('Удалить историю?')){localStorage.removeItem('allOrders');renderAdmin();}};
window.exportOrders=()=>{const a=JSON.parse(localStorage.getItem('allOrders'))||[];if(!a.length)return alert('Пусто');navigator.clipboard.writeText(a.map(o=>`#${o.id}|${o.user}|${o.total}р|${o.address||''}`).join('\n'));alert('Скопировано!');};

// AUTH
const authForm=document.getElementById('auth-form'), emailIn=document.getElementById('email-input'), passIn=document.getElementById('pass-input'), authSub=document.getElementById('auth-submit'), authErr=document.getElementById('auth-error');
let isLogin=true;
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active'); isLogin = t.dataset.tab==='login';
  authSub.textContent = isLogin ? 'Войти' : 'Создать аккаунт'; authErr.style.display='none';
});
authForm.onsubmit=async e=>{
  e.preventDefault(); const em=emailIn.value.trim(), pw=passIn.value;
  authErr.style.display='none'; authSub.disabled=true; authSub.textContent='...';
  try { isLogin ? await auth.signInWithEmailAndPassword(em,pw) : await auth.createUserWithEmailAndPassword(em,pw); } 
  catch(err) { const msgs = {'auth/user-not-found':'Пользователь не найден.','auth/wrong-password':'Неверный пароль.','auth/email-already-in-use':'Email уже занят.','auth/invalid-email':'Неверный email.','auth/weak-password':'Минимум 6 символов.'}; authErr.textContent = msgs[err.code] || err.message.replace('Firebase: ',''); authErr.style.display='block'; } 
  finally { authSub.disabled=false; authSub.textContent=isLogin?'Войти':'Создать аккаунт'; }
};
auth.onAuthStateChanged(user => {
  if(user){
    document.getElementById('auth-flow').style.display='none';
    document.getElementById('profile-actions').style.display='block';
    document.getElementById('settings-card').style.display='block';
    document.getElementById('profile-email').textContent=user.email;
    if(user.email==='maslakov.antoni@yandex.ru' && !document.getElementById('admin-link')){
      document.querySelector('.menu-grid').innerHTML+=`<div class="menu-item" id="admin-link" onclick="navigate('admin')"><i class="fa-solid fa-lock"></i><span>Админ-панель</span><i class="fa-solid fa-chevron-right"></i></div>`;
    }
    renderAdmin();
  } else {
    document.getElementById('auth-flow').style.display='block';
    document.getElementById('profile-actions').style.display='none';
    document.getElementById('settings-card').style.display='none';
    document.getElementById('profile-display-name').textContent='Гость';
    document.getElementById('profile-email').textContent='Войдите';
    document.getElementById('admin-link')?.remove();
    emailIn.value=''; passIn.value=''; isLogin=true;
    document.querySelector('.tab[data-tab="login"]').click();
  }
  updateProfileUI();
});
document.getElementById('logout-btn').onclick=()=>auth.signOut();

// 🤖 SUPPORT CHAT
const faqDB = {
  'доставк|сроки|где заказ|трек|когда придёт|статус': '🚚 Доставка по РФ: 1-3 дня. Бесплатно от 5000₽. Трек-номер придет в SMS сразу после отправки.',
  'возврат|вернуть|деньги назад|отказ|не понравил': '↩️ Возврат в течение 14 дней, если не носили и сохранили вид/бирки. Курьер заберет бесплатно.',
  'размер|маломерит|большемерит|таблица|нога|полнот': '📏 Размеры по евро-сетке. Если стопа между размерами — берите больше.',
  'оплат|карт|сбер|тиьков|сбп|наложен|рассрочк': '💳 Карты МИР, Visa, Mastercard, СБП. Есть рассрочка через банки на 3-6 мес без переплат.',
  'промокод|скидк|купон|акци|бонус|баллы': '🎁 Введите TAPKI2026 для скидки -15%. Бонусы за отзывы и заказы.',
  'качество|материал|кож|замш|текстиль|швы|клей|брак': '👟 Указываем материалы в карточке. Все партии проходят контроль. Если нашли брак — заменим бесплатно.',
  'обмен|другой размер|цвет|подобрать|не подошел': '🔄 Обмен размера/цвета возможен в течение 7 дней. Оформите возврат и закажите заново.',
  'оператор|человек|живой|связ|жалоб|проблем|не работает': '👨‍ Оператор подключится в течение 5 мин. Оставьте номер телефона, и мы перезвоним.',
  'грязь|чистка|уход|подошва|стирк|вода|пятн': '🧼 Рекомендуем специальную пену для кроссовок. Не стирайте в машинке.',
  'подарок|упаковк|коробк|состояни|нов|следы носк': '🎁 Доставка в фирменной коробке. По запросу добавим подарочный пакет (+199₽).'
};
const quickReplies = ["📦 Где мой заказ?","↩️ Как вернуть?","📏 Подбор размера","💳 Оплата","️ Промокод","👟 Качество/Брак","🔄 Обмен","🧼 Уход","👨‍ Оператор"];

window.openSupportChat = () => {
  document.getElementById('support-modal').style.display = 'flex';
  const chatBox = document.getElementById('chat-messages');
  chatBox.innerHTML = '<div class="msg bot">👋 Привет! Я помощник ТапкиДроп. Выберите вопрос или напишите свой. Для фото брака нажмите 📷.</div>';
  renderQuickReplies();
};
window.closeSupportChat = () => { document.getElementById('support-modal').style.display = 'none'; };

function renderQuickReplies() {
  const chatBox = document.getElementById('chat-messages');
  const old = chatBox.querySelector('.quick-replies'); if(old) old.remove();
  const container = document.createElement('div'); container.className = 'quick-replies';
  quickReplies.forEach(text => {
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
  const lower = text.toLowerCase(); let reply = null;
  for(const [keys, ans] of Object.entries(faqDB)) { if(keys.split('|').some(k => lower.includes(k))) { reply = ans; break; } }
  setTimeout(() => {
    const finalMsg = reply || '🤔 Не совсем понял вопрос. Уточните, или нажмите кнопку ниже.';
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
    chatBox.innerHTML += `<div class="msg user"><img src="${ev.target.result}" alt="photo"></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
      chatBox.innerHTML += `<div class="msg bot">📸 Фото принял! Менеджер проверит и ответит в течение 10 минут.</div>`;
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);
  };
  reader.readAsDataURL(file);
  this.value = '';
});

// 📍 PVZ SELECTOR (MANUAL INPUT)
window.openPVZModal = () => {
  const modal = document.getElementById('pvz-modal');
  const content = modal.querySelector('.pvz-content');
  
  content.innerHTML = `
    <div class="pvz-header">
      <h3>Адрес доставки</h3>
      <button onclick="closePVZModal()">✕</button>
    </div>
    <div style="padding:16px">
      <p style="color:var(--muted);font-size:0.9rem;margin-bottom:16px">
        Укажите, куда доставить заказ (ПВЗ, постамат, дом, офис).<br>
        <small>Примеры: Москва, с. Красное, д. Ивановка, СНТ "Ромашка", г. Екатеринбург, ЖК "Северный"</small>
      </p>
      
      <input type="text" id="pvz-locality" placeholder="Населённый пункт (Город/Село/Деревня) *" class="input" style="margin-bottom:10px">
      <input type="text" id="pvz-address" placeholder="Улица, дом, офис, ПВЗ *" class="input" style="margin-bottom:10px">
      <input type="text" id="pvz-details" placeholder="Детали (подъезд, этаж, код, ориентир)" class="input" style="margin-bottom:20px">
      
      <button class="btn btn--primary full" onclick="savePVZManual()">💾 Сохранить адрес</button>
    </div>
  `;
  
  // Load saved data
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
  
  if(!locality || !address) {
    alert('⚠️ Пожалуйста, заполните Населённый пункт и Адрес');
    return;
  }
  
  const pvzData = { 
    locality, 
    address, 
    details, 
    fullAddress: `${locality}, ${address}${details ? ', ' + details : ''}`,
    savedAt: new Date().toISOString() 
  };
  localStorage.setItem('selectedPVZ', JSON.stringify(pvzData));
  
  alert('✅ Адрес сохранён! Он будет использован при оформлении заказа.');
  closePVZModal();
  loadSavedPVZ();
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
updateCartUI();
updateProfileUI();
loadSavedPVZ();
