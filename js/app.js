// 1. SUPABASE + PWA
try {
  window.sb = supabase.createClient(
    "https://ccskkieoldeyqrpxxpnb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI"
  );
  console.log("[OK] Supabase");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
} catch (e) {
  console.error("[SB INIT ERR]", e);
}

// 2. STATE
window.cart = JSON.parse(localStorage.getItem("cart")) || [];
window.pvz = JSON.parse(localStorage.getItem("pvz")) || { city: "", addr: "" };
let prods = [];
const TG_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_CHAT = "-1003371505343";

// Toast-уведомления (замена alert)
window.toast = (msg, type = "info") => {
  const t = document.createElement("div");
  t.className = `toast toast--${type}`;
  t.textContent = msg;
  t.style.cssText =
    "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 20px;border-radius:10px;z-index:10002;font-size:0.9rem;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.2);opacity:0;transition:opacity 0.2s, transform 0.2s";
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => t.remove(), 200);
  }, 2500);
};

// 3. NAV & FILTERS
window.go = (id) => {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.nav-item[onclick*="${id}"]`)?.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "admin") loadAdmin();
  if (id === "my-orders") loadOrders();
};

document.querySelectorAll(".cat-btn").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".cat-btn").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    const c = b.dataset.cat;
    render(c === "all" ? prods : prods.filter((p) => p.category === c));
  };
});

document.getElementById("search-input")?.addEventListener("input", (e) => {
  const v = e.target.value.toLowerCase();
  render(prods.filter((p) => p.name.toLowerCase().includes(v)));
});

// 4. PRODUCTS
async function loadProds() {
  try {
    const { data, error } = await window.sb.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    prods = data || [];
    render(prods.slice(0, 4));
  } catch (e) {
    console.error("[LOAD ERR]", e);
    window.toast("❌ Не удалось загрузить товары", "error");
  }
}

function render(list) {
  const makeCard = (p) => `
    <div class="card" onclick="window.openProd('${p.id}')" role="button" tabindex="0">
      <div class="card-img">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">` : "👟"}</div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-price">${Number(p.price).toLocaleString("ru")} ₽</div>
        <button class="btn-cart" onclick="event.stopPropagation(); window.addCart('${p.id}')">В корзину</button>
      </div>
    </div>`;
  
  const g = document.getElementById("catalog-grid");
  if (g) g.innerHTML = list.map(makeCard).join("") || '<p style="grid-column:1/-1;text-align:center;color:#888;padding:20px">Ничего не найдено</p>';
  
  const h = document.getElementById("home-grid");
  if (h) h.innerHTML = list.slice(0, 4).map(makeCard).join("");
}

window.openProd = (id) => {
  const p = prods.find((x) => x.id === id);
  if (!p) return window.toast("Товар не найден", "error");
  
  window._cur = p;
  window._sz = null;
  
  document.getElementById("detail-img").innerHTML = p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : "👟";
  document.getElementById("detail-brand").textContent = p.category;
  document.getElementById("detail-name").textContent = p.name;
  document.getElementById("detail-price").textContent = Number(p.price).toLocaleString("ru") + " ₽";
  document.getElementById("detail-desc").textContent = p.description || "";
  
  const sizes = Array.isArray(p.sizes) ? p.sizes : (p.sizes || "").split(",").map((s) => s.trim()).filter(Boolean);
  document.getElementById("sizes-container").innerHTML = sizes.length
    ? sizes.map((s) => `<button class="size-btn" onclick="document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active'); window._sz='${s}'">${s}</button>`).join("")
    : '<span style="color:#888;font-size:0.9rem">Размеры уточняются</span>';
  
  window.go("product");
};

// 5. CART
window.addCart = (id) => {
  const p = prods.find((x) => x.id === id);
  if (!p) return;
  // Учитываем размер: одинаковый ID + одинаковый размер = увеличиваем qty
  const ex = window.cart.find((x) => x.id === id && x.size === window._sz);
  if (ex) {
    ex.qty = (ex.qty || 1) + 1;
  } else {
    window.cart.push({ ...p, qty: 1, size: window._sz || null });
  }
  localStorage.setItem("cart", JSON.stringify(window.cart));
  updateCart();
  window.toast("✅ Добавлено в корзину", "success");
  
  const btn = event?.target;
  if (btn && btn.classList.contains("btn-cart")) {
    btn.textContent = "✓";
    btn.style.background = "#28a745";
    setTimeout(() => {
      btn.textContent = "В корзину";
      btn.style.background = "";
    }, 800);
  }
};

window.addToCartFromDetail = () => {
  if (!window._sz && (window._cur?.sizes?.length || 0) > 0) {
    return window.toast("Выбери размер", "error");
  }
  window.addCart(window._cur.id);
};

function updateCart() {
  document.getElementById("cart-badge").textContent = window.cart.reduce((s, i) => s + (i.qty || 1), 0);
  const emp = document.getElementById("cart-empty");
  const lay = document.getElementById("cart-layout");
  
  if (!window.cart.length) {
    emp.style.display = "block";
    lay.style.display = "none";
    return;
  }
  emp.style.display = "none";
  lay.style.display = "grid";
  
  document.getElementById("cart-items").innerHTML = window.cart.map((i, k) => `
    <div class="cart-item">
      <div>
        <div style="font-weight:600">${i.name}</div>
        ${i.size ? `<small style="color:#6c757d">Размер: ${i.size}</small>` : ""}
      </div>
      <div class="cart-controls">
        <button onclick="chgQ(${k},-1)">−</button>
        <span style="min-width:20px;text-align:center">${i.qty}</span>
        <button onclick="chgQ(${k},1)">+</button>
        <button onclick="rmQ(${k})" style="color:var(--danger);background:none;border:none;cursor:pointer;font-weight:bold;padding:0 4px">×</button>
      </div>
    </div>`).join("");
  
  document.getElementById("cart-total").textContent =
    window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0).toLocaleString("ru") + " ₽";
}

window.chgQ = (k, d) => {
  window.cart[k].qty = Math.max(1, (window.cart[k].qty || 1) + d);
  localStorage.setItem("cart", JSON.stringify(window.cart));
  updateCart();
};

window.rmQ = (k) => {
  window.cart.splice(k, 1);
  localStorage.setItem("cart", JSON.stringify(window.cart));
  updateCart();
  window.toast("🗑️ Удалено из корзины", "info");
};

// 6. CHECKOUT
window.checkout = async () => {
  const btn = document.getElementById("checkout-btn");
  try {
    // Безопасная деструктуризация Supabase Auth v2
    const { data: authData, error: authErr } = await window.sb.auth.getUser();
    if (authErr) throw authErr;
    const user = authData?.user;
    
    if (!user) return window.toast("Войдите в аккаунт", "error");
    if (!window.cart.length) return window.toast("Корзина пуста", "error");
    
    // Адрес запрашивается ТОЛЬКО здесь, если пуст
    if (!window.pvz.city || !window.pvz.addr) {
      window.openPVZ();
      return window.toast("Укажите адрес доставки", "error");
    }
    
    btn.disabled = true;
    btn.textContent = "⏳ Оформление...";
    
    const total = window.cart.reduce((s, i) => s + Number(i.price) * (i.qty || 1), 0);
    const items = window.cart.map((i) => `${i.name} ${i.size ? `(р.${i.size})` : ""} ×${i.qty}`).join(", ");
    
    const { data: order, error: orderErr } = await window.sb
      .from("orders")
      .insert({
        user_email: user.email,
        items,
        total: total.toLocaleString("ru") + " ₽",
        address: `${window.pvz.city}, ${window.pvz.addr}`,
        status: "new",
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
        text: `📦 <b>НОВЫЙ ЗАКАЗ</b>\n👤 ${order.user_email}\n🛍️ ${order.items}\n💰 ${order.total}\n📍 ${order.address}`,
        parse_mode: "HTML",
      }),
    }).catch(() => {}); // Игнорируем ошибки TG, UI не блокируем
    
    window.cart = [];
    localStorage.setItem("cart", "[]");
    updateCart();
    window.toast("✅ Заказ успешно оформлен!", "success");
    setTimeout(() => window.go("my-orders"), 800);
  } catch (e) {
    console.error("[CHECKOUT ERR]", e);
    window.toast("❌ " + (e.message || "Ошибка оформления"), "error");
  } finally {
    // Кнопка ВСЕГДА разблокируется
    btn.disabled = false;
    btn.textContent = "Оформить";
  }
};

// 7. ORDERS
window.loadOrders = async () => {
  const c = document.getElementById("my-orders-list");
  if (!c) return;
  try {
    const { data: authData } = await window.sb.auth.getUser();
    const user = authData?.user;
    if (!user) {
      c.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Войдите для просмотра заказов</p>';
      return;
    }
    
    c.innerHTML = '<p style="text-align:center;color:#888;padding:20px">Загрузка...</p>';
    const { data: orders, error } = await window.sb.from("orders").select("*").eq("user_email", user.email).order("created_at", { ascending: false });
    if (error) throw error;
    
    const sc = { new: "#005bff", processing: "#ffc107", shipped: "#17a2b8", delivered: "#28a745", cancelled: "#dc3545" };
    const sn = { new: "Новый", processing: "В обработке", shipped: "Отправлен", delivered: "Доставлен", cancelled: "Отменён" };
    
    c.innerHTML = orders?.length
      ? orders.map((o) => `
        <div class="admin-card" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <b style="font-size:1.05rem">#${(o.id || "").slice(0, 8)}</b>
            <span style="background:${sc[o.status] || "#6c757d"};color:#fff;padding:4px 10px;border-radius:12px;font-size:0.8rem;font-weight:500">${sn[o.status] || o.status}</span>
          </div>
          <div style="color:#555;margin-bottom:6px;font-size:0.95rem">${o.items}</div>
          <div style="font-size:0.9rem;color:#6c757d;margin-bottom:8px">📍 ${o.address}</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:1.1rem">${o.total}</span>
            <small style="color:#888">${new Date(o.created_at).toLocaleDateString("ru")}</small>
          </div>
        </div>`).join("")
      : '<p style="text-align:center;color:#888;padding:20px">У вас пока нет заказов</p>';
  } catch (e) {
    console.error("[ORDERS ERR]", e);
    c.innerHTML = '<p style="text-align:center;color:var(--danger)">Ошибка загрузки заказов</p>';
  }
};

// 8. ADMIN
async function loadAdmin() {
  try {
    const { count, error: cErr } = await window.sb.from("orders").select("*", { count: "exact", head: true });
    if (!cErr) document.getElementById("st-orders").textContent = count || 0;
    
    const { data: orders, error: rErr } = await window.sb.from("orders").select("total");
    if (!rErr && orders) {
      const rev = orders.reduce((s, o) => {
        const num = parseFloat(String(o.total).replace(/[^0-9.,]/g, "").replace(",", "."));
        return s + (isNaN(num) ? 0 : num);
      }, 0);
      document.getElementById("st-rev").textContent = rev.toLocaleString("ru") + " ₽";
    }
    
    document.getElementById("admin-prods").innerHTML = prods.map((p) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:12px">
          ${p.image_url ? `<img src="${p.image_url}" style="width:40px;height:40px;border-radius:8px;object-fit:cover">` : "👟"}
          <span style="font-weight:500">${p.name}</span>
        </div>
        <button onclick="window.delProd('${p.id}')" style="color:var(--danger);background:none;border:none;cursor:pointer;font-size:1.2rem">🗑</button>
      </div>`).join("") || '<p style="color:#888;text-align:center;padding:20px">Товаров нет</p>';
  } catch (e) {
    console.error("[ADMIN LOAD ERR]", e);
  }
}

window.addProd = async () => {
  const name = document.getElementById("add-name").value.trim();
  const price = Number(document.getElementById("add-price").value);
  const cat = document.getElementById("add-cat").value;
  const sizes = document.getElementById("add-sizes").value;
  const url = document.getElementById("add-img").value.trim();
  const desc = document.getElementById("add-desc").value.trim();
  const fileInput = document.getElementById("add-file");
  
  if (!name) return window.toast("Введите название товара", "error");
  if (!price || price <= 0) return window.toast("Укажите корректную цену", "error");
  
  const btn = event?.target || document.querySelector("#admin .btn--primary");
  btn.disabled = true;
  btn.textContent = "⏳ Публикация...";
  
  try {
    let finalUrl = url;
    const file = fileInput?.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) throw new Error("Только изображения");
      if (file.size > 5 * 1024 * 1024) throw new Error("Макс. размер 5 МБ");
      const fn = `${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
      await window.sb.storage.from("products").upload(fn, file, { upsert: true });
      finalUrl = window.sb.storage.from("products").getPublicUrl(fn).publicUrl;
    }
    
    await window.sb.from("products").insert({
      name, price, category: cat,
      sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      image_url: finalUrl, description: desc,
    });
    
    window.toast("✅ Товар опубликован", "success");
    ["add-name", "add-price", "add-sizes", "add-img", "add-desc"].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = "";
    });
    if (fileInput) fileInput.value = "";
    document.getElementById("img-preview").style.display = "none";
    await loadProds();
    await loadAdmin();
  } catch (e) {
    console.error("[ADD PROD ERR]", e);
    window.toast("❌ " + (e.message || "Ошибка публикации"), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Опубликовать";
  }
};

window.delProd = async (id) => {
  if (!confirm("Удалить товар?")) return;
  try {
    await window.sb.from("products").delete().eq("id", id);
    window.toast("🗑️ Товар удалён", "info");
    await loadProds();
    await loadAdmin();
  } catch (e) {
    window.toast("❌ " + e.message, "error");
  }
};

// 9. AUTH
let isLogin = true;
document.querySelectorAll(".tab").forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    isLogin = t.dataset.tab === "login";
    const btn = document.getElementById("auth-btn");
    btn.textContent = isLogin ? "Войти" : "Зарегистрироваться";
    btn.type = "submit";
  };
});

document.getElementById("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const em = document.getElementById("email-in").value.trim();
  const pw = document.getElementById("pass-in").value;
  const err = document.getElementById("auth-err");
  const btn = document.getElementById("auth-btn");
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return (err.textContent = "Некорректный email", err.style.display = "block");
  if (pw.length < 6) return (err.textContent = "Пароль минимум 6 символов", err.style.display = "block");
  
  err.style.display = "none";
  btn.disabled = true;
  btn.textContent = isLogin ? "⏳ Вход..." : "⏳ Регистрация...";
  
  try {
    const { error } = isLogin
      ? await window.sb.auth.signInWithPassword({ email: em, password: pw })
      : await window.sb.auth.signUp({ email: em, password: pw });
    if (error) throw error;
    window.toast(isLogin ? "✅ С возвращением!" : "✅ Аккаунт создан!", "success");
  } catch (e) {
    err.textContent = e.message || "Ошибка авторизации";
    err.style.display = "block";
    window.toast("❌ " + err.textContent, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = isLogin ? "Войти" : "Зарегистрироваться";
  }
});

window.sb.auth.onAuthStateChange((_, session) => {
  const user = session?.user;
  document.getElementById("auth-flow").style.display = user ? "none" : "block";
  document.getElementById("profile-acts").style.display = user ? "block" : "none";
  document.getElementById("profile-display-name").textContent = user ? user.email.split("@")[0] : "Гость";
  document.getElementById("profile-email").textContent = user ? user.email : "Войдите в аккаунт";
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await window.sb.auth.signOut();
  window.toast("👋 Вы вышли из аккаунта", "info");
});

// 10. MODALS
window.openPVZ = () => {
  document.getElementById("pvz-city").value = window.pvz.city || "";
  document.getElementById("pvz-addr").value = window.pvz.addr || "";
  document.getElementById("pvz-modal").style.display = "flex";
};
window.closePVZ = () => { document.getElementById("pvz-modal").style.display = "none"; };
window.savePVZ = () => {
  const c = document.getElementById("pvz-city").value.trim();
  const a = document.getElementById("pvz-addr").value.trim();
  if (!c || !a) return window.toast("Заполните город и адрес", "error");
  window.pvz = { city: c, addr: a };
  localStorage.setItem("pvz", JSON.stringify(window.pvz));
  window.closePVZ();
  window.toast("✅ Адрес сохранён", "success");
};

window.openChat = () => {
  document.getElementById("chat-modal").style.display = "flex";
  document.getElementById("chat-body").innerHTML = `
    <div id="quick-questions" style="display:flex;flex-direction:column;gap:8px">
      <p style="color:#888;margin-bottom:4px">Частые вопросы:</p>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Как оформить возврат?')">↩️ Возврат товара</button>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Где мой заказ?')">📦 Статус заказа</button>
      <button class="quick-q-btn" onclick="window.sendMsgDirect('Соедините с оператором')">👨‍💻 Оператор</button>
    </div>`;
};
window.closeChat = () => { document.getElementById("chat-modal").style.display = "none"; };
window.sendMsg = () => {
  const inp = document.getElementById("chat-in");
  const txt = inp.value.trim();
  if (!txt) return;
  const b = document.getElementById("chat-body");
  const q = document.getElementById("quick-questions");
  if (q) q.remove();
  
  b.innerHTML += `<div style="background:var(--primary);color:#fff;padding:10px 14px;border-radius:12px;align-self:end;max-width:85%;box-shadow:0 2px 6px rgba(0,91,255,0.2)">${txt}</div>`;
  inp.value = "";
  b.scrollTop = b.scrollHeight;
  
  setTimeout(() => {
    b.innerHTML += `<div style="background:#f0f0f0;padding:10px 14px;border-radius:12px;align-self:flex-start;max-width:85%">🤖 Спасибо за вопрос! Оператор ответит в течение 5 минут.</div>`;
    b.scrollTop = b.scrollHeight;
  }, 600);
};
window.sendMsgDirect = (txt) => {
  document.getElementById("chat-in").value = txt;
  window.sendMsg();
};

// INIT
document.addEventListener("DOMContentLoaded", () => {
  loadProds();
  updateCart();
});
