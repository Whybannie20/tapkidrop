// ==========================================
// ТАПКИДРОП | CORE ENGINE (v3.0 Stable + UI)
// ==========================================

// 1. SUPABASE INIT & SESSION RESTORE
try {
  window.sb = supabase.createClient(
    "https://ccskkieoldeyqrpxxpnb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI"
  );
  console.log("[OK] Supabase connected");
  
  // Жёсткое восстановление сессии ДО рендера
  window.sb.auth.getSession().then(async ({ data, error }) => {
    if (error) console.error("[SB SESSION ERR]", error);
    if (data?.session) {
      await window.sb.auth.setSession(data.session);
      console.log("[OK] Session restored:", data.session.user.email);
    }
  });
  
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
} catch (e) { console.error("[SB INIT FAIL]", e); }

// 2. STATE & CONFIG
window.cart = JSON.parse(localStorage.getItem("cart")) || [];
window.pvz = JSON.parse(localStorage.getItem("pvz")) || { city: "", addr: "" };
window.currentUser = null;
let prods = [];
const TG_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_CHAT = "-1003371505343";
const ADMIN_EMAILS = ["antoniobandero11@gmail.com", "buldozer.mas12@gmail.com"];

// Toast
window.toast = function(msg, type) {
  if (type === undefined) type = "info";
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:${type==="error"?"#ef4444":type==="success"?"#10b981":"#111827"};color:#fff;padding:14px 24px;border-radius:14px;z-index:10002;font-size:0.95rem;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.25);animation:fadeUp 0.3s cubic-bezier(0.4,0,0.2,1)`;
  document.body.appendChild(t);
  setTimeout(function() { t.style.opacity = "0"; setTimeout(function() { t.remove(); }, 200); }, 2500);
};

// 3. NAVIGATION
window.go = function(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  var el = document.getElementById(id);
  if (el) { el.classList.add("active"); }
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  var navEl = document.querySelector('.nav-item[onclick*="' + id + '"]');
  if (navEl) navEl.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "admin") loadAdmin();
  if (id === "my-orders") loadOrders();
  if (id === "product" && window._cur) loadReviews(window._cur.id);
};

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    var cat = btn.dataset.cat;
    render(cat === "all" ? prods : prods.filter(p => p.category === cat));
  };
});

var searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", function(e) {
    var query = e.target.value.toLowerCase();
    render(prods.filter(p => p.name.toLowerCase().includes(query)));
  });
}

// 4. PRODUCTS
async function loadProds() {
  try {
    var res = await window.sb.from("products").select("*").order("created_at", { ascending: false });
    if (res.error) throw res.error;
    prods = res.data || [];
    render(prods.slice(0, 4));
  } catch (e) { console.error("[LOAD PRODS]", e); window.toast("❌ Ошибка загрузки каталога", "error"); }
}

function render(list) {
  var catalog = document.getElementById("catalog-grid");
  var home = document.getElementById("home-grid");
  var html = list.map(p => {
    return '<div class="card" onclick="window.openProd(\'' + p.id + '\')" tabindex="0">' +
           '<div class="card-img">' + (p.image_url ? '<img src="' + p.image_url + '" alt="' + p.name + '" loading="lazy">' : '👟') + '</div>' +
           '<div class="card-body"><div class="card-name">' + p.name + '</div>' +
           '<div class="card-price">' + Number(p.price).toLocaleString("ru") + ' ₽</div>' +
           '<button class="btn-cart" onclick="event.stopPropagation(); window.addCart(\'' + p.id + '\')">В корзину</button></div></div>';
  }).join("");
  if (catalog) catalog.innerHTML = html || '<p style="grid-column:1/-1;text-align:center;color:#888;padding:24px">Ничего не найдено</p>';
  if (home) home.innerHTML = list.slice(0, 4).map(p => {
    return '<div class="card" onclick="window.openProd(\'' + p.id + '\')"><div class="card-img">' + (p.image_url ? '<img src="' + p.image_url + '" loading="lazy">' : '👟') + '</div><div class="card-body"><div class="card-name">' + p.name + '</div><div class="card-price">' + Number(p.price).toLocaleString("ru") + ' ₽</div><button class="btn-cart" onclick="event.stopPropagation(); window.addCart(\'' + p.id + '\')">В корзину</button></div></div>';
  }).join("");
}

window.openProd = async function(id) {
  var p = prods.find(x => x.id === id);
  if (!p) return window.toast("Товар не найден", "error");
  window._cur = p; window._sz = null;
  var imgEl = document.getElementById("detail-img");
  if (imgEl) imgEl.innerHTML = p.image_url ? '<img src="' + p.image_url + '" alt="' + p.name + '">' : '👟';
  document.getElementById("detail-brand").textContent = p.category;
  document.getElementById("detail-name").textContent = p.name;
  document.getElementById("detail-price").textContent = Number(p.price).toLocaleString("ru") + " ₽";
  document.getElementById("detail-desc").textContent = p.description || "";
  var sizes = Array.isArray(p.sizes) ? p.sizes : (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
  document.getElementById("sizes-container").innerHTML = sizes.length
    ? sizes.map(s => '<button class="size-btn" onclick="document.querySelectorAll(\'.size-btn\').forEach(b=>b.classList.remove(\'active\'));this.classList.add(\'active\');window._sz=\'' + s + '\'">' + s + '</button>').join("")
    : '<span style="color:#888;font-size:0.9rem">Размеры уточняются</span>';
  window.go("product");
  await loadReviews(id);
};

// 5. CART
window.addCart = function(id) {
  var p = prods.find(x => x.id === id); if (!p) return;
  var existing = window.cart.find(x => x.id === id && x.size === window._sz);
  if (existing) existing.qty = (existing.qty || 1) + 1;
  else window.cart.push({ ...p, qty: 1, size: window._sz || null });
  localStorage.setItem("cart", JSON.stringify(window.cart));
  updateCart(); window.toast("✅ Добавлено", "success");
};
window.addToCartFromDetail = function() {
  if (!window._sz && (window._cur?.sizes?.length || 0) > 0) return window.toast("Выбери размер", "error");
  window.addCart(window._cur.id);
};

function updateCart() {
  var badge = document.getElementById("cart-badge");
  if (badge) badge.textContent = window.cart.reduce((s, i) => s + (i.qty || 1), 0);
  var emp = document.getElementById("cart-empty"), lay = document.getElementById("cart-layout");
  if (!window.cart.length) { if(emp) emp.style.display="block"; if(lay) lay.style.display="none"; return; }
  if(emp) emp.style.display="none"; if(lay) lay.style.display="grid";
  var itemsEl = document.getElementById("cart-items");
  if (itemsEl) itemsEl.innerHTML = window.cart.map((item, idx) => `<div class="cart-item"><div><b>${item.name}</b>${item.size?`<br><small style="color:#6b7280">Размер: ${item.size}</small>`:''}</div><div class="cart-controls"><button onclick="chgQ(${idx},-1)">−</button><span>${item.qty}</span><button onclick="chgQ(${idx},1)">+</button><button onclick="rmQ(${idx})" style="color:var(--danger);background:none;border:none;font-weight:bold">×</button></div></div>`).join("");
  document.getElementById("cart-total").textContent = window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0).toLocaleString("ru") + " ₽";
}
window.chgQ = (idx, delta) => { window.cart[idx].qty = Math.max(1, (window.cart[idx].qty || 1) + delta); localStorage.setItem("cart", JSON.stringify(window.cart)); updateCart(); };
window.rmQ = (idx) => { window.cart.splice(idx, 1); localStorage.setItem("cart", JSON.stringify(window.cart)); updateCart(); window.toast("🗑️ Удалено", "info"); };

// 6. CHECKOUT
window.checkout = async function() {
  var btn = document.getElementById("checkout-btn"); if (!btn) return;
  try {
    var res = await window.sb.auth.getUser(); if (res.error) throw res.error;
    var user = res.data?.user;
    if (!user) return window.toast("Войдите в аккаунт", "error");
    if (!window.cart.length) return window.toast("Корзина пуста", "error");
    if (!window.pvz.city || !window.pvz.addr) { window.openPVZ(); return window.toast("Укажите адрес", "error"); }
    
    btn.disabled = true; btn.textContent = "⏳ Оформление...";
    var total = window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);
    var items = window.cart.map(i => `${i.name}${i.size?` (р.${i.size})`:''} ×${i.qty}`).join(", ");
    var orderRes = await window.sb.from("orders").insert({ user_email: user.email, items, total: total.toLocaleString("ru") + " ₽", address: `${window.pvz.city}, ${window.pvz.addr}`, status: "new" }).select().single();
    if (orderRes.error) throw orderRes.error;
    var order = orderRes.data;
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({chat_id:TG_CHAT,text:`📦 НОВЫЙ ЗАКАЗ #${order.id.slice(0,8)}\n👤 ${order.user_email}\n🛍️ ${order.items}\n💰 ${order.total}\n📍 ${order.address}`, parse_mode:"HTML"}) }).catch(()=>{});
    window.cart = []; localStorage.setItem("cart", "[]"); updateCart();
    window.toast("✅ Заказ оформлен!", "success");
    setTimeout(() => window.go("my-orders"), 800);
  } catch (e) { console.error("[CHECKOUT]", e); window.toast("❌ " + e.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "Оформить"; }
};

// 7. ORDERS
window.loadOrders = async function() {
  var container = document.getElementById("my-orders-list"); if (!container) return;
  try {
    var res = await window.sb.auth.getUser(); var user = res.data?.user;
    if (!user) { container.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Войдите в аккаунт</p>'; return; }
    container.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Загрузка...</p>';
    var ordersRes = await window.sb.from("orders").select("*").eq("user_email", user.email).order("created_at", { ascending: false });
    if (ordersRes.error) throw ordersRes.error;
    var steps = ["new", "processing", "shipped", "delivered"];
    var labels = { new: "Новый", processing: "Собирается", shipped: "В пути", delivered: "Доставлен" };
    container.innerHTML = ordersRes.data?.length ? ordersRes.data.map(o => {
      var idx = steps.indexOf(o.status);
      return `<div class="admin-card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>#${(o.id||"").slice(0,8)}</b><span>${o.total}</span></div><div style="color:#555;margin-bottom:10px;font-size:0.95rem">${o.items}</div><div style="font-size:0.85rem;color:#6b7280;margin-bottom:12px">📍 ${o.address}</div><div class="status-bar">${steps.map((_, i) => `<div class="step ${i <= idx ? 'active' : ''}"></div>`).join("")}</div><div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#6b7280"><span>${labels[o.status]||o.status}</span><small>${new Date(o.created_at).toLocaleDateString("ru")}</small></div></div>`;
    }).join("") : '<p style="text-align:center;color:#888;padding:20px">Заказов нет</p>';
  } catch (e) { container.innerHTML = '<p style="text-align:center;color:var(--danger)">Ошибка</p>'; }
};

// 8. ADMIN
async function loadAdmin() {
  try {
    var countRes = await window.sb.from("orders").select("*", { count: "exact", head: true });
    var stOrders = document.getElementById("st-orders"); if (stOrders) stOrders.textContent = countRes.count || 0;
    var revRes = await window.sb.from("orders").select("total");
    var rev = revRes.data?.reduce((s, o) => s + (parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0), 0) || 0;
    var stRev = document.getElementById("st-rev"); if (stRev) stRev.textContent = rev.toLocaleString("ru") + " ₽";
    var prodsEl = document.getElementById("admin-prods");
    if (prodsEl) prodsEl.innerHTML = prods.map(p => `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border)"><div style="display:flex;align-items:center;gap:10px">${p.image_url?`<img src="${p.image_url}" style="width:40px;height:40px;border-radius:8px;object-fit:cover">`:'👟'}<span>${p.name}</span></div><button onclick="window.delProd('${p.id}')" style="color:var(--danger);background:none;border:none;cursor:pointer">🗑</button></div>`).join("")||'<p style="color:#888;text-align:center">Товаров нет</p>';
    var allOrdersRes = await window.sb.from("orders").select("*").order("created_at", { ascending: false }).limit(15);
    var ordersList = document.getElementById("admin-orders-list");
    var statuses = ["new", "processing", "shipped", "delivered", "cancelled"];
    if (ordersList) ordersList.innerHTML = allOrdersRes.data?.map(o => `<div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><b>#${(o.id||"").slice(0,6)}</b><br><small>${o.user_email}</small></div><select onchange="window.updateOrderStatus('${o.id}',this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border)">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join("")}</select><button onclick="window.deleteOrder('${o.id}')" style="color:var(--danger);background:none;border:none;cursor:pointer">🗑</button></div>`).join("")||'<p style="color:#888">Нет заказов</p>';
  } catch (e) { console.error("[ADMIN]", e); }
}

window.addProd = async function() {
  var name = document.getElementById("add-name").value.trim();
  var price = Number(document.getElementById("add-price").value);
  var cat = document.getElementById("add-cat").value;
  var sizesRaw = document.getElementById("add-sizes").value;
  var url = document.getElementById("add-img").value.trim();
  var desc = document.getElementById("add-desc").value.trim();
  var file = document.getElementById("add-file")?.files?.[0];
  if (!name || isNaN(price) || price <= 0) return window.toast("Заполните название и цену", "error");
  var btn = event?.target || document.querySelector("#admin .btn--primary");
  btn.disabled = true; btn.textContent = "⏳ Публикация...";
  try {
    var finalUrl = url;
    if (file) {
      if (!file.type.startsWith("image/") || file.size > 5*1024*1024) throw new Error("Только изображения до 5МБ");
      var fn = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      await window.sb.storage.from("products").upload(fn, file, { upsert: true });
      finalUrl = window.sb.storage.from("products").getPublicUrl(fn).publicUrl;
    }
    await window.sb.from("products").insert({ name, price, category: cat, sizes: sizesRaw.split(",").map(s=>s.trim()).filter(Boolean), image_url: finalUrl, description: desc });
    window.toast("✅ Товар опубликован", "success");
    ["add-name","add-price","add-sizes","add-img","add-desc"].forEach(id=>{var el=document.getElementById(id);if(el)el.value=""});
    if(document.getElementById("add-file")) document.getElementById("add-file").value="";
    var preview = document.getElementById("img-preview"); if(preview) preview.style.display="none";
    await loadProds(); await loadAdmin();
  } catch (e) { window.toast("❌ " + e.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "💾 Опубликовать"; }
};
window.delProd = async id => { if(!confirm("Удалить?"))return; try{await window.sb.from("products").delete().eq("id",id);window.toast("🗑️","info");await loadProds();await loadAdmin()}catch(e){window.toast("❌ "+e.message,"error")} };
window.updateOrderStatus = async (oid, status) => { try{await window.sb.from("orders").update({status}).eq("id",oid);await window.sb.from("order_status_history").insert({order_id:oid,status,changed_by:window.currentUser?.id});window.toast("✅ Статус обновлён","success");await loadAdmin();await loadOrders()}catch(e){window.toast("❌ "+e.message,"error")} };
window.deleteOrder = async id => { if(!confirm("Удалить заказ?"))return; try{await window.sb.from("orders").delete().eq("id",id);window.toast("🗑️ Заказ удалён","info");await loadAdmin()}catch(e){window.toast("❌ "+e.message,"error")} };

// 9. 🔑 AUTH & PROFILE (FIXED PERSISTENCE)
var isLogin = true;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => { document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active"); isLogin=(t.dataset.tab==="login"); document.getElementById("auth-btn").textContent=isLogin?"Войти":"Регистрация"; };
});

var authForm = document.getElementById("auth-form");
if (authForm) {
  authForm.addEventListener("submit", async e => {
    e.preventDefault();
    var email = document.getElementById("email-in").value.trim();
    var pass = document.getElementById("pass-in").value;
    var errEl = document.getElementById("auth-err");
    var btn = document.getElementById("auth-btn");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (errEl.textContent="Некорректный email", errEl.style.display="block");
    if (pass.length<6) return (errEl.textContent="Пароль мин. 6 символов", errEl.style.display="block");
    errEl.style.display="none"; btn.disabled=true; btn.textContent=isLogin?"⏳ Вход...":"⏳ Регистрация...";
    try {
      var res = isLogin ? await window.sb.auth.signInWithPassword({email, password:pass}) : await window.sb.auth.signUp({email, password:pass});
      if (res.error) throw res.error;
      window.toast(isLogin?"✅ С возвращением!":"✅ Аккаунт создан!","success");
    } catch (e) { errEl.textContent=e.message; errEl.style.display="block"; window.toast("❌ "+errEl.textContent,"error"); }
    finally { btn.disabled=false; btn.textContent=isLogin?"Войти":"Регистрация"; }
  });
}

// ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ АВТОРИЗАЦИИ (Гарантирует сохранение сессии)
window.sb.auth.onAuthStateChange(async (_, session) => {
  var user = session?.user;
  window.currentUser = user;
  var authFlow = document.getElementById("auth-flow");
  var profileActs = document.getElementById("profile-acts");
  var dispName = document.getElementById("profile-display-name");
  var dispEmail = document.getElementById("profile-email");
  var adminMenu = document.getElementById("admin-menu");
  
  if (authFlow) authFlow.style.display = user ? "none" : "block";
  if (profileActs) profileActs.style.display = user ? "block" : "none";
  
  if (user) {
    // Загружаем профиль из БД сразу при логине
    var { data: prof } = await window.sb.from("profiles").select("*").eq("id", user.id).single();
    var displayName = prof?.full_name || user.email.split("@")[0];
    if (dispName) dispName.textContent = displayName;
    if (dispEmail) dispEmail.textContent = user.email;
    if (adminMenu) adminMenu.style.display = ADMIN_EMAILS.includes(user.email) ? "flex" : "none";
  } else {
    if (dispName) dispName.textContent = "Гость";
    if (dispEmail) dispEmail.textContent = "Войдите в аккаунт";
    if (adminMenu) adminMenu.style.display = "none";
  }
});

var logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) logoutBtn.addEventListener("click", async () => { await window.sb.auth.signOut(); window.currentUser=null; window.toast("👋 Вы вышли","info"); });

window.editProfile = async () => {
  if (!window.currentUser) return window.toast("Войдите", "error");
  var { data: prof } = await window.sb.from("profiles").select("*").eq("id", window.currentUser.id).single();
  document.getElementById("edit-fullname").value = prof?.full_name || "";
  document.getElementById("edit-phone").value = prof?.phone || "";
  document.getElementById("edit-avatar").value = prof?.avatar_url || "";
  document.getElementById("profile-edit-modal").style.display = "flex";
};
window.closeProfileEdit = () => { document.getElementById("profile-edit-modal").style.display = "none"; };

window.saveProfile = async () => {
  if (!window.currentUser) return window.toast("Ошибка: войдите снова", "error");
  var btn = event.target; btn.disabled=true; btn.textContent="Сохранение...";
  try {
    var payload = {
      id: window.currentUser.id, email: window.currentUser.email,
      full_name: document.getElementById("edit-fullname").value.trim(),
      phone: document.getElementById("edit-phone").value.trim(),
      avatar_url: document.getElementById("edit-avatar").value.trim(),
      updated_at: new Date().toISOString()
    };
    var { error } = await window.sb.from("profiles").upsert(payload);
    if (error) throw error;
    window.closeProfileEdit();
    document.getElementById("profile-display-name").textContent = payload.full_name || window.currentUser.email.split("@")[0];
    window.toast("✅ Профиль сохранён", "success");
  } catch (e) { window.toast("❌ " + e.message, "error"); }
  finally { btn.disabled=false; btn.textContent="Сохранить"; }
};

// 10. REVIEWS
async function loadReviews(productId) {
  var list = document.getElementById("reviews-list"); if (!list) return;
  try {
    var { data: reviews } = await window.sb.from("reviews").select("*, profiles(full_name)").eq("product_id", productId).order("created_at", { ascending: false });
    list.innerHTML = reviews?.length ? reviews.map(r => `<div class="review-card"><div class="review-header"><b>${r.profiles?.full_name||r.user_email.split("@")[0]}</b><span class="review-stars">${"⭐".repeat(r.rating)}</span></div><div style="color:#555">${r.comment}</div>${window.currentUser&&ADMIN_EMAILS.includes(window.currentUser.email)?`<button onclick="window.deleteReview('${r.id}')" style="margin-top:8px;color:var(--danger);background:none;border:none;cursor:pointer;font-size:0.85rem">Удалить</button>`:''}</div>`).join("") : '<p style="color:#888">Пока нет отзывов</p>';
  } catch (e) { console.error("[REVIEWS]", e); }
}
var reviewForm = document.getElementById("review-form");
if (reviewForm) reviewForm.addEventListener("submit", async e => {
  e.preventDefault(); if (!window.currentUser) return window.toast("Войдите", "error");
  var rating = Number(document.getElementById("review-rating").value);
  var comment = document.getElementById("review-comment").value.trim();
  if (!comment) return window.toast("Напишите текст", "error");
  try { await window.sb.from("reviews").insert({product_id:window._cur.id, user_id:window.currentUser.id, user_email:window.currentUser.email, rating, comment}); document.getElementById("review-comment").value=""; await loadReviews(window._cur.id); window.toast("✅ Спасибо!","success"); } catch (e) { window.toast("❌ "+e.message,"error"); }
});
window.deleteReview = async id => { if(!confirm("Удалить?"))return; try{await window.sb.from("reviews").delete().eq("id",id);await loadReviews(window._cur.id);window.toast("🗑️","info")}catch(e){window.toast("❌ "+e.message,"error")} };

// 11. BOT
window.openChat = () => { document.getElementById("chat-modal").style.display="flex"; document.getElementById("chat-body").innerHTML=`<div id="quick-questions" style="display:flex;flex-direction:column;gap:8px"><p style="color:#888;margin-bottom:4px">Частые вопросы:</p><button class="quick-q-btn" onclick="window.sendMsgDirect('Как оформить возврат?')">↩️ Возврат</button><button class="quick-q-btn" onclick="window.sendMsgDirect('Где мой заказ?')">📦 Статус</button><button class="quick-q-btn" onclick="window.sendMsgDirect('Оператор')">👨‍💻 Оператор</button></div>`; addBotMsg("👋 Привет! Я бот ТапкиДроп. Выберите вопрос."); };
window.closeChat = () => { document.getElementById("chat-modal").style.display="none"; };
var BOT_ANSWERS = {"возврат":"↩️ 14 дней на возврат. Товар в упаковке.","где мой заказ":"📦 Статус в «Мои заказы».","доставка":"🚚 СДЭК, Почта, курьер. 2-7 дней.","оператор":"👨‍💻 Подключим за 5 мин. Оставьте вопрос."};
function addBotMsg(t){var b=document.getElementById("chat-body");b.innerHTML+=`<div style="background:#f3f4f6;padding:10px 14px;border-radius:12px;align-self:flex-start;max-width:85%;margin-top:8px">${t}</div>`;b.scrollTop=b.scrollHeight;}
window.sendMsg = () => { var inp=document.getElementById("chat-in"),txt=inp.value.trim();if(!txt)return;var b=document.getElementById("chat-body"),q=document.getElementById("quick-questions");if(q)q.remove();b.innerHTML+=`<div style="background:var(--primary);color:#fff;padding:10px 14px;border-radius:12px;align-self:end;max-width:85%">${txt}</div>`;inp.value="";b.scrollTop=b.scrollHeight;setTimeout(()=>{var k=Object.keys(BOT_ANSWERS).find(x=>txt.toLowerCase().includes(x));addBotMsg(k?BOT_ANSWERS[k]:"🤖 Спасибо! Передал оператору.")},600); };
window.sendMsgDirect = t => { document.getElementById("chat-in").value=t; window.sendMsg(); };

// 12. PVZ & UTILS
window.openPVZ = () => { document.getElementById("pvz-city").value=window.pvz.city||""; document.getElementById("pvz-addr").value=window.pvz.addr||""; document.getElementById("pvz-modal").style.display="flex"; };
window.closePVZ = () => { document.getElementById("pvz-modal").style.display="none"; };
window.savePVZ = () => { var c=document.getElementById("pvz-city").value.trim(),a=document.getElementById("pvz-addr").value.trim();if(!c||!a)return window.toast("Заполните поля","error");window.pvz={city:c,addr:a};localStorage.setItem("pvz",JSON.stringify(window.pvz));window.closePVZ();window.toast("✅ Сохранено","success"); };
document.getElementById("add-file")?.addEventListener("change", function(e){ var f=e.target.files[0],p=document.getElementById("img-preview");if(f){p.src=URL.createObjectURL(f);p.style.display="block"}else{p.style.display="none"} });

// INIT
document.addEventListener("DOMContentLoaded", () => { console.log("[OK] DOM Ready"); loadProds(); updateCart(); });
