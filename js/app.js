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
// 🔒 Фикс: сохраняем сессию даже после закрытия браузера/PWA
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
  {id:1,brand:'nike',name:'Air Max 97 Silver',price:14990,desc:'Культовая модель с системой амортизации Air. Отличное состояние, полная комплектация.',sizes:[39,40,41,42,43,44]},
  {id:2,brand:'adidas',name:'Ultraboost 22',price:12990,desc:'Максимальный комфорт для бега и города. Технология Boost возвращает энергию.',sizes:[40,41,42,43]},
  {id:3,brand:'newbalance',name:'550 White Green',price:11990,desc:'Ретро-баскетбольный силуэт. Тренд сезона. Натуральная кожа.',sizes:[41,42,43,44]},
  {id:4,brand:'local',name:'Street Runner V3',price:4990,desc:'Локальный бренд. Легкие, дышащие. Идеальны на каждый день.',sizes:[38,39,40,41,42]}
];

// REVIEWS & PROFILES
let allReviews = JSON.parse(localStorage.getItem('allReviews')) || {
  1: [{user:'Alex',name:'Алексей',stars:5,text:'Топ пушки, качество огонь!',date:'10.04.2026',photos:[]}],
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
  { lvl: 6, title: 'Коллекционер', discount: 6, perks: ['Скидка на аксессуары', 'Ранний доступ к дропам'] },
  { lvl: 7, title: 'Трендсеттер', discount: 7, perks: ['Скидка на аксессуары', 'Ранний доступ', 'Приоритетная поддержка'] },
  { lvl: 8, title: 'Амбассадор', discount: 8, perks: ['Скидка на аксессуары', 'Ранний доступ', 'Приоритетная поддержка', 'Бесплатная упаковка'] },
  { lvl: 9, title: 'VIP-покупатель', discount: 9, perks: ['Скидка на аксессуары', 'Ранний доступ', 'Приоритетная поддержка', 'Бесплатная упаковка', 'Персональный менеджер'] },
  { lvl: 10, title: 'Легенда', discount: 10, perks: ['Максимальная скидка 10%', 'Бесплатная доставка всегда', 'Эксклюзивные дропы', 'Личный менеджер', 'Гарантия возврата 30 дней'] }
];
function getRankData(count) {
  const lvl = Math.min(count, 10);
  const data = ranks[lvl];
  return { lvl: count > 10 ? 10 : lvl, displayLvl: count, title: count > 10 ? 'Император' : data.title, discount: data.discount, perks: count > 10 ? [...data.perks, 'Эксклюзивные коллаборации'] : data.perks, isMax: count >= 10 };
}

// NAV
window.navigate = target => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(target).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-target="${target}"]`)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(target === 'admin') renderAdmin();
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.target));

// CATALOG
const renderProducts = () => {
  document.getElementById('catalog-grid').innerHTML = products.map(p => `
    <div class="product-card" onclick="openProduct(${p.id})">
      <div class="prod-img">👟</div>
      <div class="prod-info"><div class="prod-name">${p.name}</div><div class="prod-price">${p.price.toLocaleString('ru')} ₽</div>
      <div class="prod-actions"><button class="btn-cart">Подробнее</button></div></div>
    </div>`).join('');
};
renderProducts();

// PRODUCT DETAIL
window.openProduct = id => {
  currentProductId = id; selectedSize = null;
  const p = products.find(x => x.id === id); if(!p) return;
  document.getElementById('detail-brand').textContent = p.brand;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = p.price.toLocaleString('ru') + ' ₽';
  document.getElementById('detail-desc').textContent = p.desc;
  document.getElementById('sizes-container').innerHTML = p.sizes.map(s => `<button class="size-btn" onclick="selectSize(this, ${s})">${s}</button>`).join('');
  const prodReviews = allReviews[id] || [];
  const avg = prodReviews.length ? (prodReviews.reduce((a,b)=>a+b.stars,0)/prodReviews.length).toFixed(1) : '0.0';
  document.getElementById('detail-rating').textContent = `⭐ ${avg} (${prodReviews.length})`;
  renderReviews(id); checkReviewAvailability(id); navigate('product');
};
window.selectSize = (btn, size) => {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); selectedSize = size;
};
window.addToCartFromDetail = () => {
  if(!selectedSize){alert('Выберите размер!');return;}
  const p = products.find(x => x.id === currentProductId);
  cart.push({...p, size: selectedSize});
  localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI();
  alert(`Добавлено: ${p.name} (${selectedSize})`);
};

// REVIEW AVAILABILITY
function checkReviewAvailability(productId) {
  const box = document.getElementById('review-box'), msg = document.getElementById('no-review-msg');
  if(!auth.currentUser) { box.style.display='none'; msg.innerHTML='<p>💡 <a href="#" onclick="navigate(\'profile\')" style="color:var(--primary)">Войдите</a> для отзыва</p>'; msg.style.display='block'; return; }
  const has = purchasedProducts.some(p => p.id === productId && p.user === auth.currentUser.email);
  const done = (allReviews[productId]||[]).some(r => r.user === auth.currentUser.email);
  if(has && !done) { box.style.display='block'; msg.style.display='none'; }
  else if(done) { box.style.display='none'; msg.innerHTML='<p>✅ Вы уже оставляли отзыв</p>'; msg.style.display='block'; }
  else { box.style.display='none'; msg.innerHTML='<p>💡 Купите товар, чтобы оставить отзыв</p>'; msg.style.display='block'; }
}
function renderReviews(id) {
  const list = document.getElementById('reviews-list');
  const revs = allReviews[id] || [];
  list.innerHTML = revs.length ? revs.map(r => `
    <div class="review-card">
      <div class="reviewer-avatar">👤</div>
      <div class="review-content">
        <h5><span class="reviewer-name">${r.name||r.user}</span><span class="review-date">${r.date}</span></h5>
        <div class="review-stars">${'⭐'.repeat(r.stars)}</div>
        <p class="review-text">${r.text}</p>
        ${r.photos?.length ? `<div class="review-photos">${r.photos.map(img=>`<img src="${img}" class="review-photo" onclick="window.open(this.src)">`).join('')}</div>` : ''}
      </div>
    </div>`).join('') : '<p style="color:var(--text-muted)">Отзывов пока нет.</p>';
}
window.submitReview = () => {
  const txt = document.getElementById('review-text').value.trim();
  const stars = document.querySelector('.stars-input .active')?.dataset.val || 5;
  if(!txt){alert('Напишите текст');return;}
  if(!auth.currentUser){alert('Войдите в аккаунт');return;}
  const rev = {user:auth.currentUser.email, name:getUserProfile(auth.currentUser.email), stars:parseInt(stars), text:txt, date:new Date().toLocaleDateString('ru'), photos:selectedPhotos};
  if(!allReviews[currentProductId]) allReviews[currentProductId]=[];
  allReviews[currentProductId].unshift(rev); saveReviews();
  document.getElementById('review-text').value=''; document.querySelectorAll('.stars-input i').forEach(i=>i.classList.remove('active'));
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

// CART UI
const updateCartUI = () => {
  const rank = getRankData(orderCount);
  document.getElementById('cart-badge').textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty=document.getElementById('cart-empty'), items=document.getElementById('cart-items'), footer=document.querySelector('.cart-summary-section');
  if(!cart.length){empty.style.display='block';items.style.display='none';footer.style.display='none';return;}
  empty.style.display='none';items.style.display='block';footer.style.display='block';
  items.innerHTML = cart.map((i,idx)=>`<div class="cart-item"><div class="cart-item-img">👟</div><div class="cart-item-info"><div style="font-weight:600">${i.name} (${i.size||'?'})</div><div style="font-size:0.85rem;color:var(--text-muted)">${i.price.toLocaleString('ru')} ₽</div></div><button onclick="removeItem(${idx})" style="background:none;border:none;color:var(--danger);cursor:pointer">🗑</button></div>`).join('');
  const sub=cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const disc=Math.floor(sub*(rank.discount/100));
  document.getElementById('cart-subtotal').textContent=sub.toLocaleString('ru')+' ₽';
  document.getElementById('discount-row').style.display=disc>0?'flex':'none';
  document.getElementById('discount-lvl').textContent=rank.discount;
  document.getElementById('discount-amount').textContent='-'+disc.toLocaleString('ru')+' ₽';
  document.getElementById('cart-total').textContent=(sub-disc).toLocaleString('ru')+' ₽';
};
window.removeItem = idx => { cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };

// TELEGRAM NOTIFICATION
function sendTelegram(orderData) {
  if(!TG_BOT_TOKEN || !TG_ADMIN_CHAT_ID) return;
  const text = `📦 <b>НОВЫЙ ЗАКАЗ!</b>\n👤 Клиент: ${orderData.user}\n🛍️ Товары: ${orderData.items}\n💰 Сумма: <b>${orderData.total} ₽</b>\n📅 ${new Date().toLocaleString('ru')}`;
  fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_ADMIN_CHAT_ID, text, parse_mode:'HTML'})
  }).catch(e=>console.warn('TG Err:',e));
}

// CHECKOUT
window.checkout = () => { 
  if(!auth.currentUser){navigate('profile');alert('Войдите в аккаунт');return;} 
  if(!cart.length) return;
  const itemsList = cart.map(i=>`${i.name} (${i.size||''})`).join(', ');
  const sub = cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  const order = {id:Date.now(), user:auth.currentUser.email, items:itemsList, total:sub.toLocaleString('ru'), status:'Новый', date:new Date().toISOString()};
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  allOrders.push(order); localStorage.setItem('allOrders', JSON.stringify(allOrders));
  cart.forEach(item => { if(!purchasedProducts.some(p=>p.id===item.id && p.user===auth.currentUser.email)) purchasedProducts.push({id:item.id, user:auth.currentUser.email, date:new Date().toISOString()}); });
  localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
  sendTelegram(order);
  orderCount++; localStorage.setItem('orderCount', orderCount);
  const nr=getRankData(orderCount), pr=getRankData(orderCount-1);
  if(nr.lvl>pr.lvl) showToast(`LVL ${nr.displayLvl}`, nr.title);
  alert('✅ Заказ оформлен! Ожидайте сообщения.');
  cart=[]; localStorage.setItem('cart','[]'); updateCartUI(); updateProfileUI();
};
function showToast(t,d){const el=document.getElementById('level-toast');document.getElementById('toast-desc').textContent=d;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}

// PROFILE & ADMIN
window.saveUsername = () => { const n=document.getElementById('username-input').value.trim(); if(!n||!auth.currentUser)return alert('Введите имя'); saveUserProfile(auth.currentUser.email,n); updateProfileUI(); document.getElementById('settings-card').style.display='none'; alert('✅ Сохранено'); };
const updateProfileUI = () => {
  const rank=getRankData(orderCount), name=auth.currentUser?getUserProfile(auth.currentUser.email):'Гость';
  document.getElementById('profile-display-name').textContent=name;
  document.getElementById('user-lvl').textContent=rank.displayLvl; document.getElementById('user-title').textContent=rank.title; document.getElementById('user-discount').textContent=rank.discount;
  document.getElementById('lvl-progress').style.width=(rank.isMax?100:((rank.displayLvl%10)/10)*100)+'%';
  document.getElementById('progress-text').textContent=rank.isMax?'🏆 Максимум!':`До след. уровня: ${10-rank.displayLvl} заказов`;
  document.getElementById('perks-grid').innerHTML=rank.perks.length?rank.perks.map(p=>`<div class="perk-card"><div class="perk-icon"><i class="fa-solid fa-check"></i></div><div class="perk-info"><div class="perk-name">${p}</div></div></div>`).join(''):'<p style="color:var(--text-muted);font-size:0.85rem">Совершите первый заказ</p>';
  document.getElementById('stat-orders').textContent=orderCount; document.getElementById('stat-bonus').textContent=orderCount*50;
  if(auth.currentUser) document.getElementById('username-input').value=name;
};
function renderAdmin() {
  if(!auth.currentUser) return;
  const isAdmin = auth.currentUser.email === 'maslakov.antoni@yandex.ru';
  if(!isAdmin) return; 
  const list=document.getElementById('orders-list-admin');
  const all=JSON.parse(localStorage.getItem('allOrders'))||[];
  list.innerHTML=all.length?all.reverse().map(o=>`<div class="order-row"><div class="order-info"><div class="order-id">#${String(o.id).slice(-4)}</div><div>${o.user}</div><div style="font-size:0.8rem;color:var(--text-muted)">${o.items}</div></div><div style="text-align:right"><div class="order-sum">${o.total} ₽</div><span class="status-badge">${o.status}</span></div></div>`).join(''):'<p class="muted">Заказов нет</p>';
}
window.clearAllOrders=()=>{if(confirm('Удалить историю?')){localStorage.removeItem('allOrders');renderAdmin();}};
window.exportOrders=()=>{const a=JSON.parse(localStorage.getItem('allOrders'))||[];if(!a.length)return alert('Пусто');navigator.clipboard.writeText(a.map(o=>`#${o.id}|${o.user}|${o.total}р`).join('\n'));alert('Скопировано!');};

// AUTH (FIXED)
const authForm=document.getElementById('auth-form'), emailIn=document.getElementById('email-input'), passIn=document.getElementById('pass-input'), authSub=document.getElementById('auth-submit'), authErr=document.getElementById('auth-error');
let isLogin=true;
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  isLogin = t.dataset.tab==='login';
  authSub.textContent = isLogin ? 'Войти' : 'Создать аккаунт';
  authErr.style.display='none';
});
authForm.onsubmit=async e=>{
  e.preventDefault();
  const em=emailIn.value.trim(), pw=passIn.value;
  authErr.style.display='none'; authSub.disabled=true; authSub.textContent='Загрузка...';
  try {
    if(isLogin) await auth.signInWithEmailAndPassword(em,pw);
    else await auth.createUserWithEmailAndPassword(em,pw);
  } catch(err) {
    // Перевод ошибок Firebase
    const msgs = {
      'auth/user-not-found':'Пользователь не найден. Проверьте email.',
      'auth/wrong-password':'Неверный пароль.',
      'auth/email-already-in-use':'Этот email уже зарегистрирован. Нажмите "Вход".',
      'auth/invalid-email':'Некорректный формат email.',
      'auth/weak-password':'Пароль должен содержать минимум 6 символов.'
    };
    authErr.textContent = msgs[err.code] || err.message.replace('Firebase: ','');
    authErr.style.display='block';
  } finally {
    authSub.disabled=false; authSub.textContent=isLogin?'Войти':'Создать аккаунт';
  }
};

auth.onAuthStateChanged(user=>{
  if(user){
    document.getElementById('auth-flow').style.display='none';
    document.getElementById('profile-actions').style.display='flex';
    document.getElementById('settings-card').style.display='block';
    document.getElementById('profile-email').textContent=user.email;
    if(user.email==='maslakov.antoni@yandex.ru' && !document.getElementById('admin-link')){
      document.querySelector('.menu-grid').innerHTML+=`<div class="menu-card-v2" id="admin-link" onclick="navigate('admin')"><i class="fa-solid fa-lock"></i><span>Админ-панель</span><i class="fa-solid fa-chevron-right"></i></div>`;
    }
    renderAdmin();
  } else {
    document.getElementById('auth-flow').style.display='block';
    document.getElementById('profile-actions').style.display='none';
    document.getElementById('settings-card').style.display='none';
    document.getElementById('profile-display-name').textContent='Гость';
    document.getElementById('profile-email').textContent='Войдите';
    document.getElementById('admin-link')?.remove();
    // Сбрасываем форму входа при логауте
    emailIn.value=''; passIn.value=''; isLogin=true;
    document.querySelector('.tab[data-tab="login"]').click();
  }
  updateProfileUI();
});
document.getElementById('logout-btn').onclick=()=>auth.signOut();

// CHAT
window.openSupportChat=()=>document.getElementById('support-modal').style.display='flex';
window.closeSupportChat=()=>document.getElementById('support-modal').style.display='none';
window.sendChatMessage=()=>{const i=document.getElementById('chat-input'),t=i.value.trim();if(!t)return;const b=document.getElementById('chat-messages');b.innerHTML+=`<div class="chat-msg user"><div class="msg-bubble">${t}</div></div>`;i.value='';b.scrollTop=b.scrollHeight;setTimeout(()=>{b.innerHTML+=`<div class="chat-msg bot"><div class="msg-bubble">Оператор ответит через 5 мин. ⏳</div></div>`;b.scrollTop=b.scrollHeight;},1000);};
document.querySelectorAll('.stars-input i').forEach(s=>s.onclick=function(){document.querySelectorAll('.stars-input i').forEach(x=>x.classList.remove('active'));this.classList.add('active');let v=parseInt(this.dataset.val);for(let k=0;k<v;k++)document.querySelectorAll('.stars-input i')[k].classList.add('active');});

// === PWA SETUP ===
if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.log('❌ SW failed', err));
  });
}
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'flex';
});
window.installApp = () => {
  if(deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(() => { deferredPrompt=null; installBtn.style.display='none'; }); }
};

// HERO ANIMATIONS
const animateCounters = () => {
  document.querySelectorAll('.stat-num').forEach(counter => {
    const target = +counter.dataset.target;
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if(current >= target){ current = target; clearInterval(timer); }
      counter.textContent = Math.floor(current).toLocaleString('ru');
    }, 16);
  });
};
const sneaker = document.getElementById('hero-sneaker');
if(sneaker && window.innerWidth > 900){
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    sneaker.style.transform = `translate(${x}px, ${y}px) rotate(${-5 + x/2}deg)`;
  });
}
window.addEventListener('load', animateCounters);

updateCartUI(); updateProfileUI();
