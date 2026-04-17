// === FIREBASE & FIRESTORE CONFIG ===
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
const db = firebase.firestore();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// === TELEGRAM & ADMIN ===
const TG_BOT_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_ADMIN_CHAT_ID = "-1003371505343";
const ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];
const isAdmin = (email) => ADMIN_EMAILS.includes(email);

// STATE
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orderCount = parseInt(localStorage.getItem('orderCount')) || 0;
let purchasedProducts = JSON.parse(localStorage.getItem('purchasedProducts')) || [];
let products = [];
let currentProductId = null;
let selectedSize = null;
let selectedPhotos = [];

// === CATEGORIES ===
const categories = [
  {id:'all',name:'Все',icon:'🔍'},{id:'designer',name:'Дизайнерские',icon:'✨'},{id:'kids',name:'Детские',icon:'🧒'},
  {id:'swag',name:'Сваг',icon:'🔥'},{id:'classics',name:'Классика',icon:'👟'},{id:'sale',name:'Распродажа',icon:'🏷️'}
];

// === LOAD PRODUCTS FROM FIRESTORE ===
function loadProductsFromDB() {
  db.collection('products').get().then(snapshot => {
    products = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      products.push(data);
    });
    renderGrid('home-grid', products.slice(0,4));
    renderGrid('catalog-grid', products);
  }).catch(err => console.error('DB Error:', err));
}

// === SAVE NEW PRODUCT (Called by Bot) ===
window.addProductFromChat = async (args) => {
  if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return '🔒 Доступ только для админов';
  
  // Формат: Название | Цена | Категория | Размеры | Описание | Фото1, Фото2, Фото3
  const parts = args.split('|').map(p => p.trim());
  if(parts.length < 5) return '❌ Ошибка формата!\n\nИспользуй:\n<b>/add Название | Цена | Категория | Размеры | Описание | [Фото1, Фото2]</b>';
  
  const name = parts[0];
  const price = Number(parts[1]);
  const category = parts[2];
  const sizes = parts[3].split(',').map(s => s.trim());
  const desc = parts[4];
  const imgsRaw = parts[5] || '';
  
  // Парсим фото: если есть ссылки, делаем массив. Иначе ставим эмодзи.
  const images = imgsRaw 
    ? imgsRaw.split(',').map(url => url.trim()).filter(url => url.startsWith('http')) 
    : ['👟'];
  if(images.length === 0) images.push('👟');

  const newProduct = {
    name, price, category, sizes, desc, images,
    rating: 5.0, reviews: 0,
    createdAt: new Date().toISOString()
  };

  try {
    await db.collection('products').add(newProduct);
    return `✅ <b>${name}</b> добавлен в каталог!\n💰 ${price.toLocaleString('ru')} ₽ | 📏 ${sizes.join(', ')}\n🖼️ Фото: ${images.length} шт.`;
  } catch(e) {
    return `❌ Ошибка: ${e.message}`;
  }
};

// === RENDER FUNCTIONS ===
const createCard = p => {
  const mainImg = p.images && p.images[0] ? p.images[0] : '👟';
  const imgHtml = mainImg.startsWith('http') 
    ? `<img src="${mainImg}" style="width:100%;height:100%;object-fit:cover">` 
    : mainImg;
    
  return `
    <div class="card" onclick="openProduct('${p.id}')">
      <div class="card-img">${imgHtml}</div>
      <div class="card-body">
        <div class="card-brand">${categories.find(c=>c.id===p.category)?.name||p.category}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-price"><span class="now">${p.price.toLocaleString('ru')} ₽</span></div>
        <div class="card-actions"><button class="btn-cart" onclick="event.stopPropagation(); addToCart('${p.id}')">В корзину</button></div>
      </div>
    </div>`;
};

const renderGrid = (id, list) => {
  const el = document.getElementById(id);
  if(el) el.innerHTML = list.map(createCard).join('');
};

// === NAVIGATION ===
window.navigate = target => {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(target); if(el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-target="${target}"]`); if(btn) btn.classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  if(target === 'admin') renderAdmin();
  if(target === 'my-orders') renderMyOrders();
};
document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.target));

// === PRODUCT DETAILS (WITH GALLERY) ===
window.openProduct = id => {
  const p = products.find(x => x.id === id);
  if(!p) return;
  currentProductId = id; selectedSize = null;
  
  const mainImg = p.images[0] || '👟';
  const imgContainer = document.getElementById('detail-img');
  imgContainer.innerHTML = mainImg.startsWith('http') 
    ? `<img src="${mainImg}" style="width:100%;height:100%;object-fit:contain">` 
    : mainImg;
    
  document.getElementById('detail-brand').textContent = categories.find(c=>c.id===p.category)?.name || p.category;
  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-price').textContent = p.price.toLocaleString('ru') + ' ₽';
  document.getElementById('detail-desc').textContent = p.desc;
  document.getElementById('sizes-container').innerHTML = p.sizes.map(s => `<button class="size-btn" onclick="selectSize(this, '${s}')">${s}</button>`).join('');
  
  // Галерея миниатюр
  const thumbContainer = document.getElementById('product-thumbs');
  thumbContainer.innerHTML = '';
  if(p.images && p.images.length > 1) {
    p.images.forEach((img, i) => {
      const btn = document.createElement('button');
      btn.className = `thumb-btn ${i===0?'active':''}`;
      btn.innerHTML = img.startsWith('http') ? `<img src="${img}">` : img;
      btn.onclick = () => {
        imgContainer.innerHTML = img.startsWith('http') ? `<img src="${img}" style="width:100%;height:100%;object-fit:contain">` : img;
        document.querySelectorAll('.thumb-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
      };
      thumbContainer.appendChild(btn);
    });
  }
  
  navigate('product');
};

// CSS for thumbs (injected dynamically if not exists)
if(!document.getElementById('thumb-styles')) {
  const style = document.createElement('style');
  style.id = 'thumb-styles';
  style.textContent = `.thumb-btn{width:50px;height:50px;border:2px solid transparent;border-radius:6px;overflow:hidden;flex-shrink:0;cursor:pointer;padding:0;background:none}.thumb-btn img{width:100%;height:100%;object-fit:cover}.thumb-btn.active{border-color:var(--primary)}#product-thumbs{display:flex;gap:8px;margin-top:12px;overflow-x:auto;padding-bottom:4px}`;
  document.head.appendChild(style);
}

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
window.addToCart = id => {
  const p = products.find(x => x.id === id);
  const exist = cart.find(x => x.id === id);
  if(exist) exist.qty++; else cart.push({...p, qty:1});
  localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI();
};

// === CART UI ===
const updateCartUI = () => {
  const badge = document.getElementById('cart-badge'); if(badge) badge.textContent = cart.reduce((s,i)=>s+(i.qty||1),0);
  const empty=document.getElementById('cart-empty'), layout=document.getElementById('cart-layout');
  if(!empty || !layout) return;
  if(!cart.length){empty.style.display='block';layout.style.display='none';return;}
  empty.style.display='none';layout.style.display='grid';
  document.getElementById('cart-items').innerHTML = cart.map((i,idx)=>`
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-meta">${i.price.toLocaleString('ru')} ₽ • Размер ${i.size||'?'}</div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button><span>${i.qty||1}</span><button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
          <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer" onclick="removeItem(${idx})">🗑</button>
        </div>
      </div>
    </div>`).join('');
  const sub=cart.reduce((s,i)=>s+i.price*(i.qty||1),0);
  document.getElementById('cart-total').textContent=sub.toLocaleString('ru')+' ₽';
};
window.changeQty = (idx,d) => { cart[idx].qty=(cart[idx].qty||1)+d; if(cart[idx].qty<1)cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };
window.removeItem = idx => { cart.splice(idx,1); localStorage.setItem('cart',JSON.stringify(cart)); updateCartUI(); };

// === CHECKOUT & TELEGRAM ===
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
    id: Date.now(), user: auth.currentUser.email,
    items: cart.map(i=>`${i.name} (${i.size||''})`).join(', '),
    total: sub.toLocaleString('ru'), address: pvzAddress, status: 'new', qrImage: '', date: new Date().toISOString()
  };
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  allOrders.push(order); localStorage.setItem('allOrders', JSON.stringify(allOrders));
  cart.forEach(item => { if(!purchasedProducts.some(p=>p.id===item.id && p.user===auth.currentUser.email)) purchasedProducts.push({id:item.id, user:auth.currentUser.email, date:new Date().toISOString()}); });
  localStorage.setItem('purchasedProducts', JSON.stringify(purchasedProducts));
  sendTelegram(order);
  orderCount++; localStorage.setItem('orderCount', orderCount);
  alert('✅ Заказ оформлен!');
  cart=[]; localStorage.setItem('cart','[]'); updateCartUI();
};

// === MY ORDERS ===
window.renderMyOrders = () => {
  if(!auth.currentUser) return;
  const container = document.getElementById('my-orders-list'); if(!container) return;
  const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const myOrders = allOrders.filter(o => o.user === auth.currentUser.email).reverse();
  if(myOrders.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">У вас пока нет заказов.</p>'; return; }
  container.innerHTML = myOrders.map(o => {
    let statusText = '', statusColor = '', qrBlock = '';
    switch(o.status) {
      case 'new': statusText='В обработке'; statusColor='orange'; break;
      case 'assembling': statusText='В сборке'; statusColor='#005bff'; break;
      case 'shipping': statusText='В пути'; statusColor='#00b341'; break;
      case 'delivered': statusText='Доставлен'; statusColor='#111';
        if(o.qrImage) qrBlock = `<div style="margin-top:12px;padding:12px;background:#f0f7ff;border-radius:8px;text-align:center"><p style="font-size:0.85rem;color:var(--muted);margin-bottom:8px">📱 Код для получения:</p><img src="${o.qrImage}" style="max-width:100%;border-radius:8px"><p style="font-size:0.75rem;color:var(--muted)">Покажите это на ПВЗ</p></div>`;
        break;
    }
    return `<div class="order-card"><div class="order-head"><span>Заказ #${String(o.id).slice(-4)}</span><span style="font-weight:700;color:${statusColor}">${statusText}</span></div><div class="order-body"><div class="order-items">${o.items}</div><div class="order-addr">📍 ${o.address}</div><div class="order-sum">${o.total} ₽</div></div>${qrBlock}</div>`;
  }).join('');
};

// === ADMIN PANEL ===
function renderAdmin() {
  if(!auth.currentUser || !isAdmin(auth.currentUser.email)) return; 
  const container = document.getElementById('orders-list-admin'); if(!container) return;
  const allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const stats = document.getElementById('admin-stats');
  if(stats) stats.innerHTML = `<div style="font-size:2rem;font-weight:700;color:var(--primary)">${allOrders.length}</div><div style="color:var(--muted)">заказов</div>`;
  
  container.innerHTML = allOrders.length===0 ? '<p style="color:var(--muted)">Заказов нет</p>' : 
    allOrders.reverse().map(o => {
      const btn = (s,txt) => `<button style="padding:4px 8px;border-radius:4px;border:1px solid var(--border);background:${o.status===s?'var(--primary)':'transparent'};color:${o.status===s?'#fff':'var(--text)'};cursor:pointer;font-size:0.7rem;margin-right:4px" onclick="updateOrderStatus(${o.id},'${s}')">${txt}</button>`;
      const qrUpload = `
        <div style="margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <input type="file" id="qr-file-${o.id}" accept="image/*" style="display:none" onchange="saveOrderQRImage(${o.id}, this)">
          <label for="qr-file-${o.id}" style="padding:4px 10px;background:var(--primary);color:#fff;border-radius:4px;cursor:pointer;font-size:0.75rem">📷 Код</label>
          ${o.qrImage ? '<span style="font-size:0.75rem;color:var(--success)">✅</span>' : ''}
        </div>`;
      return `<div class="order-row"><div style="flex:1"><div style="font-weight:700">#${String(o.id).slice(-4)} | ${o.user.split('@')[0]}</div><div style="font-size:0.85rem;color:var(--muted)">${o.items}</div><div style="margin-top:6px">${btn('new','Новый')}${btn('assembling','Сборка')}${btn('shipping','Отправлен')}${btn('delivered','Доставлен')}</div>${o.status==='delivered'?qrUpload:''}</div><div style="text-align:right"><b>${o.total} ₽</b></div></div>`;
    }).join('');
}

window.updateOrderStatus = (id, status) => {
  let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
  const order = allOrders.find(o => o.id === id);
  if(order) { order.status = status; localStorage.setItem('allOrders', JSON.stringify(allOrders)); renderAdmin(); }
};
window.saveOrderQRImage = (id, input) => {
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    let allOrders = JSON.parse(localStorage.getItem('allOrders'))||[];
    const order = allOrders.find(o => o.id === id);
    if(order) { order.qrImage = e.target.result; localStorage.setItem('allOrders', JSON.stringify(allOrders)); alert('✅ Код сохранён!'); renderAdmin(); }
  };
  reader.readAsDataURL(file);
};
window.clearAllOrders=()=>{if(confirm('Удалить все заказы?')){localStorage.removeItem('allOrders');renderAdmin();}};

// === SUPPORT CHAT & COMMANDS (DEBUG MODE) ===
window.ADMIN_EMAILS = ['antoniobandero11@gmail.com', 'buldozer.mas12@gmail.com'];

const botCommands = {
  '/test': () => '✅ <b>Связь работает!</b> Бот видит ваши команды.',
  '/stats': () => {
    if (!auth.currentUser || !window.ADMIN_EMAILS.includes(auth.currentUser.email)) {
      return '🔒 <b>Войдите как админ</b>, чтобы видеть статистику.';
    }
    const orders = JSON.parse(localStorage.getItem('allOrders') || '[]');
    const rev = orders.reduce((s, o) => s + parseFloat(o.total.replace(/\s|₽/g, '')) || 0, 0);
    return `📊 <b>Статистика:</b>\n📦 Заказов: ${orders.length}\n💰 Выручка: ${rev.toLocaleString('ru')} ₽\n🛍️ Товаров: ${products.length}`;
  },
  '/add': async (args) => {
    if (!auth.currentUser || !window.ADMIN_EMAILS.includes(auth.currentUser.email)) return '🔒 Требуется вход под админом.';
    const parts = args.split('|').map(p => p.trim());
    if (parts.length < 5) return '❌ Формат:\n/add Название | Цена | Категория | Размеры | Описание | Фото1, Фото2';
    
    const [name, priceStr, category, sizesStr, desc, imgsRaw] = parts;
    const price = Number(priceStr);
    if (isNaN(price)) return '❌ Цена должна быть числом.';
    
    const images = imgsRaw ? imgsRaw.split(',').map(u => u.trim()).filter(u => u.startsWith('http')) : ['👟'];
    if (images.length === 0) images.push('👟');
    
    try {
      await db.collection('products').add({
        name, price, category, sizes: sizesStr.split(',').map(s => s.trim()), desc, images,
        rating: 5.0, reviews: 0, createdAt: new Date().toISOString()
      });
      return `✅ <b>${name}</b> добавлен!\n💰 ${price.toLocaleString('ru')} ₽ | 📏 ${sizesStr}\n🖼️ Фото: ${images.length}`;
    } catch (e) { return `❌ Ошибка базы: ${e.message}`; }
  },
  '/help': () => `🤖 <b>Команды:</b>\n/test — проверка\n/stats — статистика\n/add — добавить товар\n\n⚠️ Нужен вход под админом.`
};

// Глобальная функция для кнопки в HTML
window.sendChatMessage = function() {
  console.log('[CHAT] Кнопка нажата'); // Отладка
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const chatBox = document.getElementById('chat-messages');
  chatBox.innerHTML += `<div class="msg user">${text}</div>`;
  input.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  if (text.startsWith('/')) {
    const match = text.match(/^\/(\w+)\s*(.*)?$/);
    if (match) {
      const cmd = '/' + match[1].toLowerCase();
      const args = match[2] || '';
      console.log('[CHAT] Команда:', cmd);

      setTimeout(async () => {
        try {
          const handler = botCommands[cmd];
          if (handler) {
            const res = await handler(args);
            chatBox.innerHTML += `<div class="msg bot">${res}</div>`;
          } else {
            chatBox.innerHTML += `<div class="msg bot">❌ Неизвестная команда. Введите /help</div>`;
          }
        } catch (err) {
          console.error('[CHAT] Ошибка:', err);
          chatBox.innerHTML += `<div class="msg bot">⚠️ Ошибка: ${err.message}</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
      }, 300);
      return;
    }
  }
  
  setTimeout(() => {
    chatBox.innerHTML += `<div class="msg bot">🤖 Я понимаю только команды. Введите /help</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 400);
};

// === AUTH ===
const authForm = document.getElementById('auth-form');
const emailIn = document.getElementById('email-input');
const passIn = document.getElementById('pass-input');
const authSub = document.getElementById('auth-submit');
const authErr = document.getElementById('auth-error');
let isLogin = true;

document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active'); 
  isLogin = t.dataset.tab === 'login';
  authSub.textContent = isLogin ? 'Войти' : 'Создать аккаунт'; 
  authErr.style.display = 'none';
});

authForm.onsubmit = async e => {
  e.preventDefault(); 
  const em = emailIn.value.trim(), pw = passIn.value;
  authErr.style.display = 'none'; authSub.disabled = true; authSub.textContent = '...';
  try { 
    isLogin ? await auth.signInWithEmailAndPassword(em, pw) : await auth.createUserWithEmailAndPassword(em, pw); 
  } catch(err) { 
    authErr.textContent = err.message; authErr.style.display = 'block'; 
  } finally { 
    authSub.disabled = false; authSub.textContent = isLogin ? 'Войти' : 'Создать аккаунт'; 
  }
};

auth.onAuthStateChanged(user => {
  console.log('[AUTH] Статус входа:', user ? user.email : 'Гость');
  if (user) {
    document.getElementById('auth-flow').style.display = 'none';
    document.getElementById('profile-actions').style.display = 'block';
    document.getElementById('profile-email').textContent = user.email;
    if (window.ADMIN_EMAILS.includes(user.email) && !document.getElementById('admin-link')) {
      document.querySelector('.menu-grid').innerHTML += `<div class="menu-item" id="admin-link" onclick="navigate('admin')"><i class="fa-solid fa-lock"></i><span>Админка</span></div>`;
    }
  } else {
    document.getElementById('auth-flow').style.display = 'block';
    document.getElementById('profile-actions').style.display = 'none';
    document.getElementById('profile-display-name').textContent = 'Гость';
    document.getElementById('profile-email').textContent = 'Войдите';
    document.getElementById('admin-link')?.remove();
  }
});
document.getElementById('logout-btn').onclick = () => auth.signOut();

// === INIT ===
loadProductsFromDB();
updateCartUI();
console.log('[INIT] Скрипт запущен успешно');
