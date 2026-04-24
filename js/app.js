// ==========================================
// ТАПКИДРОП | CORE ENGINE (v2.0 Presentation)
// ==========================================

// 1. SUPABASE INIT & SESSION RESTORE
try {
  window.sb = supabase.createClient(
    "https://ccskkieoldeyqrpxxpnb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI"
  );
  console.log("[OK] Supabase v2 connected");
  
  // Восстанавливаем сессию при перезагрузке страницы
  window.sb.auth.getSession().then(({  { session } }) => {
    if (session) window.sb.auth.setSession(session);
  });
  
  // PWA Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
} catch (e) {
  console.error("[SB INIT ERROR]", e);
}

// 2. GLOBAL STATE
window.cart = JSON.parse(localStorage.getItem("cart")) || [];
window.pvz = JSON.parse(localStorage.getItem("pvz")) || { city: "", addr: "" };
window.currentUser = null; // Синхронизируется через onAuthStateChange
let prods = [];

const TG_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_CHAT = "-1003371505343";
const ADMIN_EMAILS = ["antoniobandero11@gmail.com", "buldozer.mas12@gmail.com"];

// Утилиты
window.toast = (msg, type = "info") => {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${type==="error"?"#dc3545":type==="success"?"#28a745":"#333"};color:#fff;padding:12px 20px;border-radius:10px;z-index:10002;font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:fadeUp 0.2s`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 200); }, 2500);
};

// 3. NAVIGATION & FILTERS
window.go = (id) => {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.querySelector(`.nav-item[onclick*="${id}"]`)?.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "admin") loadAdmin();
  if (id === "my-orders") loadOrders();
  if (id === "product" && window._cur) loadReviews(window._cur.id);
};

document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    render(cat === "all" ? prods : prods.filter(p => p.category === cat));
  };
});

document.getElementById("search-input")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  render(prods.filter(p => p.name.toLowerCase().includes(query)));
});

// 4. PRODUCTS
async function loadProds() {
  try {
    const { data, error } = await window.sb.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    prods = data || [];
    render(prods.slice(0, 4));
  } catch (e) {
    console.error("[LOAD PRODS]", e);
    window.toast("❌ Не удалось загрузить каталог", "error");
  }
}

function render(list) {
  const cardHTML = p => `
    <div class="card" onclick="window.openProd('${p.id}')" tabindex="0">
      <div class="card-img">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">` : "👟"}</div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-price">${Number(p.price).toLocaleString("ru")} ₽</div>
        <button class="btn-cart" onclick="event.stopPropagation(); window.addCart('${p.id}')">В корзину</button>
      </div>
    </div>`;
    
  const catalog = document.getElementById("catalog-grid");
  if (catalog) catalog.innerHTML = list.map(cardHTML).join("") || '<p style="grid-column:1/-1;text-align:center;color:#888;padding:20px">Ничего не найдено</p>';
  
  const home = document.getElementById("home-grid");
  if (home) home.innerHTML = list.slice(0, 4).map(cardHTML).join("");
}

window.openProd = async (id) => {
  const p = prods.find(x => x.id === id);
  if (!p) return window.toast("Товар не найден", "error");
  
  window._cur = p; window._sz = null;
  document.getElementById("detail-img").innerHTML = p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : "👟";
  document.getElementById("detail-brand").textContent = p.category;
  document.getElementById("detail-name").textContent = p.name;
  document.getElementById("detail-price").textContent = Number(p.price).toLocaleString("ru") + " ₽";
  document.getElementById("detail-desc").textContent = p.description || "";
  
  const sizes = Array.isArray(p.sizes) ? p.sizes : (p.sizes || "").split(",").map(s => s.trim()).filter(Boolean);
  document.getElementById("sizes-container").innerHTML = sizes.length
    ? sizes.map(s => `<button class="size-btn" onclick="document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');window._sz='${s}'">${s}</button>`).join("")
    : '<span style="color:#888;font-size:0.9rem">Размеры уточняются</span>';
    
  window.go("product");
  await loadReviews(id);
};

// 5. CART
window.addCart = (id) => {
  const p = prods.find(x => x.id === id);
  if (!p) return;
  
  // Проверяем: если такой же товар + такой же размер уже в корзине -> увеличиваем qty
  const existing = window.cart.find(x => x.id === id && x.size === window._sz);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    window.cart.push({ ...p, qty: 1, size: window._sz || null });
  }
  
  localStorage.setItem("cart", JSON.stringify(window.cart));
  updateCart();
  window.toast("✅ Добавлено в корзину", "success");
  
  // Визуальный фидбек на кнопке
  const btn = event?.target;
  if (btn && btn.classList.contains("btn-cart")) {
    btn.textContent = "✓"; btn.style.background = "#28a745";
    setTimeout(() => { btn.textContent = "В корзину"; btn.style.background = ""; }, 800);
  }
};

window.addToCartFromDetail = () => {
  if (!window._sz && (window._cur?.sizes?.length || 0) > 0) {
    return window.toast("Пожалуйста, выберите размер", "error");
  }
  window.addCart(window._cur.id);
};

function updateCart() {
  document.getElementById("cart-badge").textContent = window.cart.reduce((s, i) => s + (i.qty || 1), 0);
  const emp = document.getElementById("cart-empty");
  const lay = document.getElementById("cart-layout");
  
  if (!window.cart.length) {
    emp.style.display = "block"; lay.style.display = "none"; return;
  }
  emp.style.display = "none"; lay.style.display = "grid";
  
  document.getElementById("cart-items").innerHTML = window.cart.map((item, idx) => `
    <div class="cart-item">
      <div>
        <b>${item.name}</b>
        ${item.size ? `<br><small style="color:#6c757d">Размер: ${item.size}</small>` : ""}
      </div>
      <div class="cart-controls">
        <button onclick="chgQ(${idx},-1)">−</button>
        <span style="min-width:20px;text-align:center">${item.qty}</span>
        <button onclick="chgQ(${idx},1)">+</button>
        <button onclick="rmQ(${idx})" style="color:var(--danger);background:none;border:none;font-weight:bold;padding:0 6px">×</button>
      </div>
    </div>`).join("");
    
  document.getElementById("cart-total").textContent = window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0).toLocaleString("ru") + " ₽";
}

window.chgQ = (idx, delta) => {
  window.cart[idx].qty = Math.max(1, (window.cart[idx].qty || 1) + delta);
  localStorage.setItem("cart", JSON.stringify(window.cart)); updateCart();
};

window.rmQ = (idx) => {
  window.cart.splice(idx, 1);
  localStorage.setItem("cart", JSON.stringify(window.cart)); updateCart();
  window.toast("🗑️ Товар удалён", "info");
};

// 6. CHECKOUT (Без оплаты, только фиксация заказа)
window.checkout = async () => {
  const btn = document.getElementById("checkout-btn");
  try {
    // ✅ Корректная деструктуризация Supabase v2
    const { data: { user }, error: authErr } = await window.sb.auth.getUser();
    if (authErr) throw authErr;
    if (!user) return window.toast("Войдите в аккаунт", "error");
    if (!window.cart.length) return window.toast("Корзина пуста", "error");
    if (!window.pvz.city || !window.pvz.addr) { window.openPVZ(); return window.toast("Укажите адрес доставки", "error"); }
    
    btn.disabled = true; btn.textContent = "⏳ Оформление...";
    
    const total = window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);
    const items = window.cart.map(i => `${i.name} ${i.size ? `(р.${i.size})` : ""} ×${i.qty}`).join(", ");
    
    const { data: order, error: orderErr } = await window.sb
      .from("orders")
      .insert({
        user_email: user.email,
        items,
        total: total.toLocaleString("ru") + " ₽",
        address: `${window.pvz.city}, ${window.pvz.addr}`,
        status: "new",
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (orderErr) throw orderErr;
    
    // 🔔 Telegram: НЕБЛОКИРУЮЩИЙ запрос
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHAT,
        text: `📦 <b>НОВЫЙ ЗАКАЗ</b>\n👤 ${order.user_email}\n🛍️ ${order.items}\n💰 ${order.total}\n📍 ${order.address}\n🔗 ${window.location.origin}/my-orders?id=${order.id}`,
        parse_mode: "HTML"
      })
    }).catch(() => console.warn("TG Notification failed"));
    
    window.cart = []; localStorage.setItem("cart", "[]"); updateCart();
    window.toast("✅ Заказ успешно оформлен!", "success");
    setTimeout(() => window.go("my-orders"), 800);
  } catch (e) {
    console.error("[CHECKOUT]", e);
    window.toast("❌ " + (e.message || "Ошибка оформления"), "error");
  } finally {
    btn.disabled = false; btn.textContent = "Оформить";
  }
};

// 7. ORDERS & STATUS TRACKER
window.loadOrders = async () => {
  const container = document.getElementById("my-orders-list");
  if (!container) return;
  try {
    const { data: { user } } = await window.sb.auth.getUser();
    if (!user) { container.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Войдите в аккаунт</p>'; return; }
    
    container.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Загрузка...</p>';
    const { data, error } = await window.sb.from("orders").select("*").eq("user_email", user.email).order("created_at", { ascending: false });
    if (error) throw error;
    
    const steps = ["new", "processing", "shipped", "delivered"];
    const labels = { new: "Новый", processing: "Собирается", shipped: "В пути", delivered: "Доставлен" };
    
    container.innerHTML = data?.length ? data.map(o => {
      const currentIdx = steps.indexOf(o.status);
      return `
      <div class="admin-card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px"><b>#${(o.id||"").slice(0,8)}</b><span>${o.total}</span></div>
        <div style="color:#555;margin-bottom:10px;font-size:0.95rem">${o.items}</div>
        <div style="font-size:0.85rem;color:#6c757d;margin-bottom:12px">📍 ${o.address}</div>
        <div class="status-bar">${steps.map((_, i) => `<div class="step ${i <= currentIdx ? 'active' : ''}"></div>`).join("")}</div>
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#6c757d;margin-top:4px">
          <span>${labels[o.status] || o.status}</span>
          <small>${new Date(o.created_at).toLocaleDateString("ru")}</small>
        </div>
      </div>`;
    }).join("") : '<p style="text-align:center;color:#888;padding:20px">У вас пока нет заказов</p>';
  } catch (e) {
    container.innerHTML = '<p style="text-align:center;color:var(--danger)">Ошибка загрузки заказов</p>';
  }
};

// 8. ADMIN PANEL
async function loadAdmin() {
  try {
    // Статистика
    const { count } = await window.sb.from("orders").select("*", { count: "exact", head: true });
    document.getElementById("st-orders").textContent = count || 0;
    const { data: orders } = await window.sb.from("orders").select("total");
    const rev = orders?.reduce((s, o) => s + (parseFloat(String(o.total).replace(/[^0-9.]/g, "")) || 0), 0) || 0;
    document.getElementById("st-rev").textContent = rev.toLocaleString("ru") + " ₽";
    
    // Список товаров
    document.getElementById("admin-prods").innerHTML = prods.map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px">${p.image_url ? `<img src="${p.image_url}" style="width:40px;height:40px;border-radius:6px;object-fit:cover">` : "👟"}<span>${p.name}</span></div>
        <button onclick="window.delProd('${p.id}')" style="color:var(--danger);background:none;border:none;cursor:pointer">🗑</button>
      </div>`).join("") || '<p style="color:#888;text-align:center">Товаров нет</p>';
      
    // Управление заказами
    const { data: allOrders } = await window.sb.from("orders").select("*").order("created_at", { ascending: false }).limit(15);
    const statuses = ["new", "processing", "shipped", "delivered", "cancelled"];
    document.getElementById("admin-orders-list").innerHTML = allOrders?.map(o => `
      <div style="padding:10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div><b>#${(o.id||"").slice(0,6)}</b><br><small>${o.user_email}</small></div>
        <div style="display:flex;gap:8px;align-items:center">
          <select onchange="window.updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
            ${statuses.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <button onclick="window.deleteOrder('${o.id}')" style="color:var(--danger);background:none;border:none;cursor:pointer">🗑</button>
        </div>
      </div>`).join("") || '<p style="color:#888">Нет заказов</p>';
  } catch (e) { console.error("[ADMIN LOAD]", e); }
}

window.addProd = async () => {
  const name = document.getElementById("add-name").value.trim();
  const price = Number(document.getElementById("add-price").value);
  const cat = document.getElementById("add-cat").value;
  const sizesRaw = document.getElementById("add-sizes").value;
  const url = document.getElementById("add-img").value.trim();
  const desc = document.getElementById("add-desc").value.trim();
  const fileInput = document.getElementById("add-file");
  const file = fileInput?.files?.[0];
  
  if (!name || isNaN(price) || price <= 0) return window.toast("Заполните название и цену", "error");
  
  const btn = event?.target || document.querySelector("#admin .btn--primary");
  btn.disabled = true; btn.textContent = "⏳ Публикация...";
  
  try {
    let finalUrl = url;
    if (file) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) throw new Error("Только изображения до 5МБ");
      const fileName = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      await window.sb.storage.from("products").upload(fileName, file, { upsert: true });
      finalUrl = window.sb.storage.from("products").getPublicUrl(fileName).publicUrl;
    }
    
    await window.sb.from("products").insert({
      name, price, category: cat,
      sizes: sizesRaw.split(",").map(s => s.trim()).filter(Boolean),
      image_url: finalUrl, description: desc
    });
    
    window.toast("✅ Товар опубликован", "success");
    ["add-name", "add-price", "add-sizes", "add-img", "add-desc"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
    if (fileInput) fileInput.value = "";
    document.getElementById("img-preview").style.display = "none";
    await loadProds(); await loadAdmin();
  } catch (e) { window.toast("❌ " + e.message, "error"); }
  finally { btn.disabled = false; btn.textContent = "💾 Опубликовать"; }
};

window.delProd = async (id) => {
  if (!confirm("Удалить товар?")) return;
  try { await window.sb.from("products").delete().eq("id", id); window.toast("🗑️ Удалено", "info"); await loadProds(); await loadAdmin(); }
  catch (e) { window.toast("❌ " + e.message, "error"); }
};

window.updateOrderStatus = async (orderId, status) => {
  try {
    await window.sb.from("orders").update({ status }).eq("id", orderId);
    await window.sb.from("order_status_history").insert({ order_id: orderId, status, changed_by: window.currentUser?.id });
    window.toast("✅ Статус обновлён", "success");
    await loadAdmin(); if (window.currentUser) await loadOrders();
  } catch (e) { window.toast("❌ " + e.message, "error"); }
};

window.deleteOrder = async (id) => {
  if (!confirm("Удалить заказ?")) return;
  try { await window.sb.from("orders").delete().eq("id", id); window.toast("🗑️ Заказ удалён", "info"); await loadAdmin(); }
  catch (e) { window.toast("❌ " + e.message, "error"); }
};

// 9. AUTH & PROFILE
let isLogin = true;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active"); isLogin = (t.dataset.tab === "login");
    document.getElementById("auth-btn").textContent = isLogin ? "Войти" : "Регистрация";
  };
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email-in").value.trim();
  const pass = document.getElementById("pass-in").value;
  const errEl = document.getElementById("auth-err");
  const btn = document.getElementById("auth-btn");
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return (errEl.textContent = "Некорректный email", errEl.style.display = "block");
  if (pass.length < 6) return (errEl.textContent = "Пароль минимум 6 символов", errEl.style.display = "block");
  
  errEl.style.display = "none"; btn.disabled = true; btn.textContent = isLogin ? "⏳ Вход..." : "⏳ Регистрация...";
  
  try {
    const { error } = isLogin
      ? await window.sb.auth.signInWithPassword({ email, password: pass })
      : await window.sb.auth.signUp({ email, password: pass });
    if (error) throw error;
    window.toast(isLogin ? "✅ С возвращением!" : "✅ Аккаунт создан!", "success");
  } catch (e) { errEl.textContent = e.message || "Ошибка"; errEl.style.display = "block"; window.toast("❌ " + errEl.textContent, "error"); }
  finally { btn.disabled = false; btn.textContent = isLogin ? "Войти" : "Регистрация"; }
});

window.sb.auth.onAuthStateChange((_, session) => {
  const user = session?.user;
  window.currentUser = user;
  document.getElementById("auth-flow").style.display = user ? "none" : "block";
  document.getElementById("profile-acts").style.display = user ? "block" : "none";
  document.getElementById("profile-display-name").textContent = user ? (user.user_metadata?.full_name || user.email.split("@")[0]) : "Гость";
  document.getElementById("profile-email").textContent = user ? user.email : "Войдите в аккаунт";
  // Показ админки только для утверждённых почт
  document.getElementById("admin-menu").style.display = (user && ADMIN_EMAILS.includes(user.email)) ? "flex" : "none";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await window.sb.auth.signOut(); window.currentUser = null; window.toast("👋 Вы вышли", "info");
});

// Редактирование профиля
window.editProfile = async () => {
  if (!window.currentUser) return window.toast("Войдите в аккаунт", "error");
  const { data: p } = await window.sb.from("profiles").select("*").eq("id", window.currentUser.id).single();
  document.getElementById("edit-fullname").value = p?.full_name || "";
  document.getElementById("edit-phone").value = p?.phone || "";
  document.getElementById("edit-avatar").value = p?.avatar_url || "";
  document.getElementById("profile-edit-modal").style.display = "flex";
};
window.closeProfileEdit = () => { document.getElementById("profile-edit-modal").style.display = "none"; };
window.saveProfile = async () => {
  if (!window.currentUser) return;
  try {
    await window.sb.from("profiles").upsert({
      id: window.currentUser.id, email: window.currentUser.email,
      full_name: document.getElementById("edit-fullname").value.trim(),
      phone: document.getElementById("edit-phone").value.trim(),
      avatar_url: document.getElementById("edit-avatar").value.trim(),
      updated_at: new Date().toISOString()
    });
    window.closeProfileEdit();
    document.getElementById("profile-display-name").textContent = document.getElementById("edit-fullname").value.trim() || window.currentUser.email.split("@")[0];
    window.toast("✅ Профиль сохранён", "success");
  } catch (e) { window.toast("❌ " + e.message, "error"); }
};

// 10. REVIEWS
async function loadReviews(productId) {
  const list = document.getElementById("reviews-list"); if (!list) return;
  try {
    const { data: reviews } = await window.sb.from("reviews").select("*, profiles(full_name)").eq("product_id", productId).order("created_at", { ascending: false });
    list.innerHTML = reviews?.length ? reviews.map(r => `
      <div class="review-card">
        <div class="review-header"><b>${r.profiles?.full_name || r.user_email.split("@")[0]}</b><span class="review-stars">${"⭐".repeat(r.rating)}</span></div>
        <div style="color:#555">${r.comment}</div>
        ${window.currentUser && ADMIN_EMAILS.includes(window.currentUser.email) ? `<button onclick="window.deleteReview('${r.id}')" style="margin-top:8px;color:var(--danger);background:none;border:none;cursor:pointer;font-size:0.85rem">Удалить</button>` : ""}
      </div>`).join("") : '<p style="color:#888">Пока нет отзывов</p>';
  } catch (e) { console.error("[REVIEWS]", e); }
}

document.getElementById("review-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.currentUser) return window.toast("Войдите, чтобы оставить отзыв", "error");
  const rating = Number(document.getElementById("review-rating").value);
  const comment = document.getElementById("review-comment").value.trim();
  if (!comment) return window.toast("Напишите текст отзыва", "error");
  
  try {
    await window.sb.from("reviews").insert({
      product_id: window._cur.id,
      user_id: window.currentUser.id,
      user_email: window.currentUser.email,
      rating, comment
    });
    document.getElementById("review-comment").value = "";
    await loadReviews(window._cur.id);
    window.toast("✅ Спасибо за отзыв!", "success");
  } catch (e) { window.toast("❌ " + e.message, "error"); }
});

window.deleteReview = async (id) => {
  if (!confirm("Удалить отзыв?")) return;
  try { await window.sb.from("reviews").delete().eq("id", id); await loadReviews(window._cur.id); window.toast("🗑️ Удалено", "info"); }
  catch (e) { window.toast("❌ " + e.message, "error"); }
};

// 11. SUPPORT BOT
window.openChat = () => {
  document.getElementById("chat-modal").style.display = "flex";
  document.getElementById("chat-body").innerHTML = `
    <div id="quick-questions" style="display:flex;flex-direction:column;gap:8px">
      <p style="color:#888;margin-bottom:4px">Частые вопросы:</p>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Как оформить возврат?')">↩️ Возврат</button>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Где мой заказ?')">📦 Статус заказа</button>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Какие способы доставки?')">🚚 Доставка</button>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Оператор')">👨‍💻 Оператор</button>
    </div>`;
  addBotMsg("👋 Привет! Я бот поддержки ТапкиДроп. Выберите вопрос или напишите свой.");
};
window.closeChat = () => { document.getElementById("chat-modal").style.display = "none"; };

const BOT_ANSWERS = {
  "возврат": "↩️ Возврат в течение 14 дней. Товар должен быть в оригинальной упаковке. Оформите в разделе «Мои заказы».",
  "где мой заказ": "📦 Статус отображается в «Мои заказы». Там же доступен трек-номер для отслеживания.",
  "доставка": "🚚 СДЭК, Почта РФ, курьер. Срок 2-7 дней. Стоимость считается при оформлении.",
  "оператор": "👨‍💻 Оператор подключится в течение 5 минут. Оставьте ваш вопрос, мы ответим в чате."
};

function addBotMsg(text) {
  const b = document.getElementById("chat-body");
  b.innerHTML += `<div style="background:#f0f0f0;padding:10px 14px;border-radius:12px;align-self:flex-start;max-width:85%;margin-top:8px">${text}</div>`;
  b.scrollTop = b.scrollHeight;
}

window.sendMsg = () => {
  const inp = document.getElementById("chat-in"), txt = inp.value.trim();
  if (!txt) return;
  const b = document.getElementById("chat-body"), q = document.getElementById("quick-questions");
  if (q) q.remove();
  b.innerHTML += `<div style="background:var(--primary);color:#fff;padding:10px 14px;border-radius:12px;align-self:end;max-width:85%">${txt}</div>`;
  inp.value = ""; b.scrollTop = b.scrollHeight;
  
  setTimeout(() => {
    const key = Object.keys(BOT_ANSWERS).find(k => txt.toLowerCase().includes(k));
    addBotMsg(key ? BOT_ANSWERS[key] : "🤖 Спасибо! Передал вопрос оператору. Ответим в течение 5 мин.");
  }, 600);
};
window.sendMsgDirect = (t) => { document.getElementById("chat-in").value = t; window.sendMsg(); };

// 12. PVZ & UTILS
window.openPVZ = () => { document.getElementById("pvz-city").value = window.pvz.city || ""; document.getElementById("pvz-addr").value = window.pvz.addr || ""; document.getElementById("pvz-modal").style.display = "flex"; };
window.closePVZ = () => { document.getElementById("pvz-modal").style.display = "none"; };
window.savePVZ = () => {
  const c = document.getElementById("pvz-city").value.trim(), a = document.getElementById("pvz-addr").value.trim();
  if (!c || !a) return window.toast("Заполните город и адрес", "error");
  window.pvz = { city: c, addr: a }; localStorage.setItem("pvz", JSON.stringify(window.pvz));
  window.closePVZ(); window.toast("✅ Адрес сохранён", "success");
};

// Превью изображения в админке
document.getElementById("add-file")?.addEventListener("change", function(e) {
  const f = e.target.files[0], p = document.getElementById("img-preview");
  if (f) { p.src = URL.createObjectURL(f); p.style.display = "block"; } else { p.style.display = "none"; }
});

// INIT
document.addEventListener("DOMContentLoaded", () => { loadProds(); updateCart(); });
