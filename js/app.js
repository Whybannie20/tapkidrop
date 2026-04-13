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
let selectedPhotos = []; // For reviews

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

const renderGrid = (id, list) => {
  const el = document.getElementById(id);
  if(el) el.innerHTML = list.map(createCard).join('');
};

// INIT CATALOGS
renderGrid('home-grid', products.slice(0,4));
renderGrid('new-grid', products.slice(2,6));
renderGrid('catalog-grid', products);

// FILTERS
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    renderGrid('catalog-grid', cat === 'all' ? products : products.filter(p => p.brand === cat));
  };
});

// SEARCH
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
  const list = document.getElementById('reviews-list');
  if(!list) return;
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
  const badge = document.getElementById('cart-badge');
  if(badge) badge.textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty=document.getElementById('cart-empty'), layout=document.getElementById('cart-layout');
  if(!empty || !layout) return;
  if(!cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items
