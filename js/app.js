// DATA
const products = [
  {id:1,brand:'nike',name:'Air Max 97 Silver',price:14990,old:18990,badge:'-21%',size:[40,41,42,43]},
  {id:2,brand:'adidas',name:'Ultraboost 22',price:12990,old:null,badge:'NEW',size:[39,40,41,42]},
  {id:3,brand:'newbalance',name:'550 White Green',price:11990,old:13500,badge:'-11%',size:[41,42,43,44]},
  {id:4,brand:'puma',name:'RS-X Reinvention',price:8990,old:null,badge:null,size:[40,41,42]},
  {id:5,brand:'local',name:'Street Runner V3',price:4990,old:6500,badge:'SALE',size:[38,39,40,41,42]},
  {id:6,brand:'nike',name:'Dunk Low Retro',price:13490,old:null,badge:'HOT',size:[39,40,41,42,43]},
  {id:7,brand:'adidas',name:'Samba OG',price:11490,old:null,badge:null,size:[40,41,42,43,44]},
  {id:8,brand:'local',name:'Minimal Walker',price:3990,old:4500,badge:'-11%',size:[38,39,40,41]}
];
const validPromos = {'TAPKI2026':15,'NEWDROP10':10,'DROPVIP':25,'WELCOME5':5};

// STATE
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let activePromo = localStorage.getItem('promo') || null;
let auth = JSON.parse(localStorage.getItem('auth')) || null;

// NAV
window.navigate = target => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(target).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-item[data-target="${target}"]`)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.target));
document.querySelector('.logo').onclick = () => navigate('home');

// CATALOG
const renderProducts = (list) => {
  const grid = document.getElementById('catalog-grid');
  if(!list.length){ grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-filter"></i><p>Ничего не найдено. Попробуйте изменить фильтры.</p></div>`; return; }
  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="prod-img">👟${p.badge?`<span class="prod-badge">${p.badge}</span>`:''}</div>
      <div class="prod-info">
        <div class="prod-brand">${p.brand}</div>
        <div class="prod-name">${p.name}</div>
        <div class="prod-price">${p.price.toLocaleString('ru')} ₽ ${p.old?`<span class="old">${p.old.toLocaleString('ru')} ₽</span>`:''}</div>
        <div class="prod-actions">
          <button class="btn-cart" onclick="addToCart(${p.id})">В корзину</button>
          <button class="btn-fav" onclick="this.style.color='var(--danger)'"><i class="fa-regular fa-heart"></i></button>
        </div>
      </div>
    </div>`).join('');
};
renderProducts(products);

// FILTERS
let currentFilter = 'all';
document.querySelectorAll('.cat-btn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
  b.classList.add('active'); currentFilter = b.dataset.cat; applyFilters();
});
window.filterByBrand = brand => {
  navigate('catalog'); currentFilter = brand; applyFilters();
};
const applyFilters = () => {
  let res = products;
  if(currentFilter !== 'all') res = res.filter(p => p.brand === currentFilter);
  const from = +document.getElementById('price-from').value;
  const to = +document.getElementById('price-to').value;
  if(from) res = res.filter(p => p.price >= from);
  if(to) res = res.filter(p => p.price <= to);
  renderProducts(res);
};
document.getElementById('price-from').oninput = applyFilters;
document.getElementById('price-to').oninput = applyFilters;
window.resetFilters = () => {
  document.getElementById('price-from').value=''; document.getElementById('price-to').value=''; currentFilter='all';
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.cat-btn[data-cat="all"]').classList.add('active'); renderProducts(products);
};

// SORT
document.querySelectorAll('.sort-btn').forEach(b => b.onclick = () => {
  document.querySelectorAll('.sort-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  let sorted = [...products];
  const s = b.dataset.sort;
  if(s==='price-asc') sorted.sort((a,b)=>a.price-b.price);
  if(s==='price-desc') sorted.sort((a,b)=>b.price-a.price);
  if(s==='new') sorted.sort((a,b)=>b.id-a.id);
  renderProducts(sorted);
});

// CART
window.addToCart = id => {
  const p = products.find(x=>x.id===id);
  const exist = cart.find(x=>x.id===id);
  if(exist) exist.qty++; else cart.push({...p, qty:1});
  saveCart(); updateCartUI();
};
window.addToCartFromWeek = () => { cart.push({...products[0], qty:1}); saveCart(); updateCartUI(); navigate('cart'); alert('🔥 Air Max 97 добавлен в корзину!'); };
window.changeQty = (id,d) => {
  const i = cart.find(x=>x.id===id);
  if(i){ i.qty+=d; if(i.qty<1) cart=cart.filter(x=>x.id!==id); }
  saveCart(); updateCartUI();
};
const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));
const updateCartUI = () => {
  document.getElementById('cart-badge').textContent = cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById('cart-count-summary').textContent = cart.reduce((s,i)=>s+i.qty,0);
  const empty = document.getElementById('cart-empty');
  const items = document.getElementById('cart-items');
  const footer = document.querySelector('.cart-summary-section');
  if(!cart.length){ empty.style.display='block'; items.style.display='none'; footer.style.display='none'; return; }
  empty.style.display='none'; items.style.display='block'; footer.style.display='block';
  items.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="cart-item-img">👟</div>
      <div class="cart-item-info">
        <h4>${i.name}</h4>
        <div class="cart-item-meta">${i.brand} • Размер ${i.size[1] || 42}</div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="changeQty(${i.id},-1)">-</button>
          <span>${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.id},1)">+</button>
          <button onclick="removeItem(${i.id})" style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.85rem"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
  const sub = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const disc = activePromo && validPromos[activePromo] ? Math.floor(sub * validPromos[activePromo]/100) : 0;
  document.getElementById('cart-subtotal').textContent = sub.toLocaleString('ru') + ' ₽';
  document.getElementById('cart-total').textContent = (sub-disc).toLocaleString('ru') + ' ₽';
  document.getElementById('discount-row').style.display = disc ? 'flex' : 'none';
  document.getElementById('discount-value').textContent = '-' + disc.toLocaleString('ru') + ' ₽';
  const msg = document.getElementById('promo-message');
  msg.innerHTML = activePromo ? `<span style="color:var(--success)">✅ ${activePromo} (-${validPromos[activePromo]}%)</span>` : '';
};
window.removeItem = id => { cart=cart.filter(x=>x.id!==id); saveCart(); updateCartUI(); };
window.applyPromo = () => {
  const code = document.getElementById('promo-input').value.toUpperCase().trim();
  if(validPromos[code]){ activePromo=code; localStorage.setItem('promo',code); updateCartUI(); }
  else { document.getElementById('promo-message').innerHTML='<span style="color:var(--danger)">❌ Неверный код</span>'; setTimeout(()=>document.getElementById('promo-message').innerHTML='',2000); }
};
window.checkout = () => {
  if(!auth){ navigate('profile'); alert('Пожалуйста, войдите в аккаунт для оформления.'); return; }
  alert(`✅ Заказ на сумму ${document.getElementById('cart-total').textContent} успешно создан!\nОжидайте СМС с подтверждением.`);
  cart=[]; saveCart(); updateCartUI();
  const orders = JSON.parse(localStorage.getItem('orders')||'[]');
  orders.push({id:Math.floor(Math.random()*900000+100000),date:new Date().toLocaleDateString('ru'),total:document.getElementById('cart-total').textContent,status:'В обработке'});
  localStorage.setItem('orders',JSON.stringify(orders)); renderOrders();
};

// ORDERS
const renderOrders = () => {
  const list = document.getElementById('orders-list');
  const data = JSON.parse(localStorage.getItem('orders')||'[]');
  if(!data.length){ list.innerHTML=`<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>Пока нет заказов</p></div>`; return; }
  list.innerHTML = data.map(o => `
    <div class="order-card">
      <div class="order-header"><span>№${o.id} от ${o.date}</span><span class="order-status status-${o.status==='Готов'? 'done':'pending'}">${o.status}</span></div>
      <div style="font-weight:600;margin-bottom:4px">Сумма: ${o.total}</div>
      <div class="order-items"><div class="order-thumb">👟</div><div class="order-thumb">👟</div></div>
    </div>`).join('');
};

// AUTH & PROFILE
const renderProfile = () => {
  if(auth){
    document.getElementById('auth-view').style.display='none';
    document.getElementById('profile-view').style.display='block';
    document.getElementById('profile-name').textContent = 'Пользователь';
    document.getElementById('profile-email').textContent = auth.email;
  } else {
    document.getElementById('auth-view').style.display='block';
    document.getElementById('profile-view').style.display='none';
    document.getElementById('profile-name').textContent = 'Гость';
    document.getElementById('profile-email').textContent = 'Войдите в аккаунт';
  }
};
document.querySelectorAll('.tab[data-tab]').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active');
  document.querySelector('.auth-phone').style.display = b.dataset.tab==='register'?'block':'none';
  document.getElementById('auth-submit').textContent = b.dataset.tab==='login'?'Войти':'Создать аккаунт';
});
document.getElementById('auth-form').onsubmit = e => {
  e.preventDefault();
  const email = document.querySelector('#auth-form input[type="email"]').value;
  auth = {email, id:Math.floor(Math.random()*900000+100000)};
  localStorage.setItem('auth', JSON.stringify(auth)); renderProfile(); alert('👤 Вы успешно вошли!');
};
document.getElementById('logout-btn').onclick = () => { localStorage.removeItem('auth'); auth=null; renderProfile(); };

// COUNTDOWN
const end = new Date(); end.setDate(end.getDate()+3); end.setHours(23,59,59);
const tick = () => {
  const diff = end - new Date(); if(diff<=0) return;
  const d=Math.floor(diff/864e5),h=Math.floor((diff%864e5)/36e5),m=Math.floor((diff%36e5)/6e4),s=Math.floor((diff%6e4)/1e3);
  document.getElementById('countdown').innerHTML=`<span>${d}д</span>:<span>${h}ч</span>:<span>${m}м</span>:<span>${s}с</span>`;
};
tick(); setInterval(tick,1000);

// SCROLL ANIMATION
const obs = new IntersectionObserver(e=>e.forEach(x=>x.isIntersecting&&x.target.classList.add('visible')),{threshold:0.1});
document.querySelectorAll('.fade-in').forEach(el=>obs.observe(el));

// INIT
updateCartUI(); renderProfile(); renderOrders();
