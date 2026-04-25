// ==========================================
// ТАПКИДРОП | CORE ENGINE v5.2 (STABLE)
// ==========================================

// 1. SUPABASE INIT (Безопасный)
try {
  window.sb = supabase.createClient(
    "https://ccskkieoldeyqrpxxpnb.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjc2traWVvbGRleXFycHh4cG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjkyOTYsImV4cCI6MjA5MjM0NTI5Nn0.XO_JiiZDlbMFuHSdgQZKQedXPWbsQF2XTd0_wDhS7oI"
  );
  console.log("[OK] Supabase connected");
  
  // Восстановление сессии
  window.sb.auth.getSession().then(({data, error}) => {
    if(!error && data?.session) {
      window.sb.auth.setSession(data.session);
      console.log("[OK] Session restored");
    }
  });
  
  if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
} catch(e) { console.error("[SB INIT FAIL]", e); }

// 2. STATE
window.cart = JSON.parse(localStorage.getItem("cart")) || [];
window.pvz = JSON.parse(localStorage.getItem("pvz")) || {city:"", addr:""};
window.currentUser = null;
window.userProfile = null;
let prods = [];
const TG_TOKEN = "8706865987:AAHSTQvxklwoiScS3HpJvFyEyVT57eQkz8o";
const TG_CHAT = "-1003371505343";
const ADMIN_EMAILS = ["antoniobandero11@gmail.com", "buldozer.mas12@gmail.com"];

// Toast
window.toast = function(msg, type="info") {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${type==="error"?"#ef4444":type==="success"?"#10b981":"#111827"};color:#fff;padding:12px 20px;border-radius:12px;z-index:10002;font-size:0.9rem;box-shadow:0 6px 16px rgba(0,0,0,0.2);animation:fadeUp 0.25s`;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";setTimeout(()=>t.remove(),200);},2500);
};

// 3. NAVIGATION (Гарантированно работает)
window.go = function(id) {
  document.querySelectorAll(".page").forEach(p => { p.classList.remove("active"); p.style.opacity="0"; p.style.transform="translateY(8px)"; });
  const el = document.getElementById(id);
  if(el) {
    el.classList.add("active");
    requestAnimationFrame(() => { el.style.opacity="1"; el.style.transform="translateY(0)"; });
  }
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  const nav = document.querySelector(`.nav-item[onclick*="${id}"]`);
  if(nav) nav.classList.add("active");
  window.scrollTo({top:0, behavior:"smooth"});
  if(id==="admin") loadAdmin();
  if(id==="my-orders") loadOrders();
  if(id==="product" && window._cur) loadReviews(window._cur.id);
};

// 4. FILTERS & SEARCH
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.onclick = function() {
    document.querySelectorAll(".cat-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const cat = btn.dataset.cat;
    render(cat==="all" ? prods : prods.filter(p=>p.category===cat));
  };
});
document.getElementById("search-input")?.addEventListener("input", function(e) {
  render(prods.filter(p=>p.name.toLowerCase().includes(e.target.value.toLowerCase())));
});

// 5. PRODUCTS
async function loadProds() {
  try {
    const res = await window.sb.from("products").select("*").order("created_at", {ascending:false});
    if(res.error) throw res.error;
    prods = res.data || [];
    render(prods.slice(0,4));
  } catch(e) { console.error("[LOAD]",e); }
}

function render(list) {
  const html = list.map(p => `
    <div class="card" onclick="window.openProd('${p.id}')">
      <div class="card-img">${p.image_url?`<img src="${p.image_url}" loading="lazy">`:"👟"}</div>
      <div class="card-body">
        <div class="card-name">${p.name}</div>
        <div class="card-price">${Number(p.price).toLocaleString("ru")} ₽</div>
        <button class="btn-cart" onclick="event.stopPropagation();window.addCart('${p.id}')">В корзину</button>
      </div>
    </div>`).join("");
  const c = document.getElementById("catalog-grid"); if(c) c.innerHTML = html || '<p style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">Ничего не найдено</p>';
  const h = document.getElementById("home-grid"); if(h) h.innerHTML = list.slice(0,4).map(p => `<div class="card" onclick="window.openProd('${p.id}')"><div class="card-img">${p.image_url?`<img src="${p.image_url}" loading="lazy">`:"👟"}</div><div class="card-body"><div class="card-name">${p.name}</div><div class="card-price">${Number(p.price).toLocaleString("ru")} ₽</div><button class="btn-cart" onclick="event.stopPropagation();window.addCart('${p.id}')">В корзину</button></div></div>`).join("");
}

window.openProd = async function(id) {
  const p = prods.find(x=>x.id===id); if(!p) return window.toast("Не найдено","error");
  window._cur = p; window._sz = null;
  const img = document.getElementById("detail-img"); if(img) img.innerHTML = p.image_url?`<img src="${p.image_url}">`:"👟";
  const brand = document.getElementById("detail-brand"); if(brand) brand.textContent = p.category;
  const name = document.getElementById("detail-name"); if(name) name.textContent = p.name;
  const price = document.getElementById("detail-price"); if(price) price.textContent = Number(p.price).toLocaleString("ru") + " ₽";
  const desc = document.getElementById("detail-desc"); if(desc) desc.textContent = p.description || "";
  const sizes = Array.isArray(p.sizes)?p.sizes:(p.sizes||"").split(",").map(s=>s.trim()).filter(Boolean);
  const szCont = document.getElementById("sizes-container");
  if(szCont) szCont.innerHTML = sizes.length ? sizes.map(s=>`<button class="size-btn" onclick="document.querySelectorAll('.size-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active');window._sz='${s}'">${s}</button>`).join("") : '<span style="color:var(--text-muted)">Нет данных</span>';
  window.go("product"); await loadReviews(id);
};

// 6. CART
window.addCart = function(id) {
  const p = prods.find(x=>x.id===id); if(!p) return;
  const ex = window.cart.find(x=>x.id===id && x.size===window._sz);
  if(ex) ex.qty = (ex.qty||1)+1; else window.cart.push({...p, qty:1, size:window._sz||null});
  localStorage.setItem("cart", JSON.stringify(window.cart)); updateCart(); window.toast("✅ В корзине","success");
};
window.addToCartFromDetail = function() { if(!window._sz && (window._cur?.sizes?.length||0)>0) return window.toast("Выбери размер","error"); window.addCart(window._cur.id); };

function updateCart() {
  const badge = document.getElementById("cart-badge"); if(badge) badge.textContent = window.cart.reduce((s,i)=>s+(i.qty||1),0);
  const emp = document.getElementById("cart-empty"), lay = document.getElementById("cart-layout");
  if(!window.cart.length) { if(emp) emp.style.display="block"; if(lay) lay.style.display="none"; return; }
  if(emp) emp.style.display="none"; if(lay) lay.style.display="block";
  const items = document.getElementById("cart-items");
  if(items) items.innerHTML = window.cart.map((i,k)=>`<div class="cart-item"><div><b>${i.name}</b>${i.size?`<br><small style="color:var(--text-muted)">Размер: ${i.size}</small>`:""}</div><div class="cart-controls"><button onclick="chgQ(${k},-1)">−</button><span>${i.qty}</span><button onclick="chgQ(${k},1)">+</button><button onclick="rmQ(${k})" style="color:var(--danger);background:none;border:none">🗑</button></div></div>`).join("");
  const total = document.getElementById("cart-total"); if(total) total.textContent = window.cart.reduce((s,i)=>s+Number(i.price)*(i.qty||1),0).toLocaleString("ru")+" ₽";
}
window.chgQ = function(k,d) { window.cart[k].qty = Math.max(1, (window.cart[k].qty||1)+d); localStorage.setItem("cart",JSON.stringify(window.cart)); updateCart(); };
window.rmQ = function(k) { window.cart.splice(k,1); localStorage.setItem("cart",JSON.stringify(window.cart)); updateCart(); window.toast("🗑️ Удалено","info"); };

// 7. CHECKOUT (Безопасный доступ к auth)
window.checkout = async function() {
  const btn = document.getElementById("checkout-btn"); if(!btn) return;
  try {
    const res = await window.sb.auth.getUser();
    if(res.error) throw res.error;
    const user = res.data?.user;
    if(!user) return window.toast("Войдите в аккаунт","error");
    if(!window.cart.length) return window.toast("Корзина пуста","error");
    if(!window.pvz.city||!window.pvz.addr) { window.openPVZ(); return window.toast("Укажите адрес","error"); }
    
    btn.disabled = true; btn.textContent = "⏳ Оформление...";
    const total = window.cart.reduce((s,i)=>s+Number(i.price)*(i.qty||1),0);
    const items = window.cart.map(i=>`${i.name}${i.size?` (${i.size})`:''} ×${i.qty}`).join(", ");
    
    const orderRes = await window.sb.from("orders").insert({user_email:user.email, items, total:total.toLocaleString("ru")+" ₽", address:`${window.pvz.city}, ${window.pvz.addr}`, status:"new"}).select().single();
    if(orderRes.error) throw orderRes.error;
    
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:TG_CHAT,text:`📦 <b>ЗАКАЗ</b>\n👤 ${orderRes.data.user_email}\n🛍️ ${orderRes.data.items}\n💰 ${orderRes.data.total}\n📍 ${orderRes.data.address}`,parse_mode:"HTML"})}).catch(()=>{});
    
    window.cart=[]; localStorage.setItem("cart","[]"); updateCart();
    window.toast("✅ Оформлен!","success"); setTimeout(()=>window.go("my-orders"),600);
  } catch(e) { console.error("[CHECKOUT]",e); window.toast("❌ "+e.message,"error"); }
  finally { btn.disabled=false; btn.textContent="Оформить"; }
};

// 8. ORDERS
window.loadOrders = async function() {
  const c = document.getElementById("my-orders-list"); if(!c) return;
  try {
    const res = await window.sb.auth.getUser(); const user = res.data?.user;
    if(!user) { c.innerHTML='<p style="text-align:center;padding:30px;color:var(--text-muted)">Войдите</p>'; return; }
    c.innerHTML='<div style="text-align:center;padding:20px">Загрузка...</div>';
    const ordersRes = await window.sb.from("orders").select("*").eq("user_email",user.email).order("created_at",{ascending:false});
    if(ordersRes.error) throw ordersRes.error;
    const steps=["new","processing","shipped","delivered"], labels={new:"Новый",processing:"Собирается",shipped:"В пути",delivered:"Доставлен"};
    c.innerHTML = ordersRes.data?.length ? ordersRes.data.map(o=>{
      const idx=steps.indexOf(o.status);
      return `<div class="cart-item" style="display:block"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>#${(o.id||"").slice(0,8)}</b><span>${o.total}</span></div><div style="color:var(--text-muted);margin-bottom:8px;font-size:0.9rem">${o.items}</div><div class="status-bar">${steps.map((_,i)=>`<div class="step ${i<=idx?'active':''}"></div>`).join("")}</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.8rem;color:var(--text-muted)"><span>${labels[o.status]||o.status}</span><small>${new Date(o.created_at).toLocaleDateString("ru")}</small></div></div>`;
    }).join("") : '<p style="text-align:center;padding:30px;color:var(--text-muted)">Нет заказов</p>';
  } catch(e) { c.innerHTML='<p style="text-align:center;padding:30px;color:var(--danger)">Ошибка</p>'; }
};

// 9. ADMIN
async function loadAdmin() {
  try {
    const {count}=await window.sb.from("orders").select("*",{count:"exact",head:true});
    const st=document.getElementById("st-orders"); if(st) st.textContent=count||0;
    const {data}=await window.sb.from("orders").select("total");
    const rev=data?.reduce((s,o)=>s+(parseFloat(String(o.total).replace(/[^0-9.]/g,""))||0),0)||0;
    const sr=document.getElementById("st-rev"); if(sr) sr.textContent=rev.toLocaleString("ru")+" ₽";
    const pr=document.getElementById("admin-prods"); if(pr) pr.innerHTML=prods.map(p=>`<div style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid var(--border)"><span>${p.name}</span><button onclick="window.delProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:var(--danger)">🗑</button></div>`).join("")||'<p style="text-align:center;color:var(--text-muted)">Нет товаров</p>';
    const {allOrders}=await window.sb.from("orders").select("*").order("created_at",{ascending:false}).limit(10);
    const statuses=["new","processing","shipped","delivered","cancelled"];
    const ol=document.getElementById("admin-orders-list"); if(ol) ol.innerHTML=allOrders?.map(o=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border)"><span>#${(o.id||"").slice(0,6)}<br><small style="color:var(--text-muted)">${o.user_email}</small></span><select onchange="window.updateOrderStatus('${o.id}',this.value)" class="input" style="width:auto">${statuses.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join("")}</select><button onclick="window.deleteOrder('${o.id}')" style="background:none;border:none;cursor:pointer;color:var(--danger)">🗑</button></div>`).join("")||'<p style="color:var(--text-muted)">Нет заказов</p>';
  } catch(e){console.error("[ADMIN]",e);}
}

window.addProd = async function() {
  const n=document.getElementById("add-name")?.value.trim(), p=Number(document.getElementById("add-price")?.value), c=document.getElementById("add-cat")?.value, s=document.getElementById("add-sizes")?.value, u=document.getElementById("add-img")?.value.trim(), d=document.getElementById("add-desc")?.value.trim(), f=document.getElementById("add-file")?.files?.[0];
  if(!n||!p) return window.toast("Заполните поля","error");
  const btn=event?.target||document.querySelector("#admin .btn--primary"); if(btn){btn.disabled=true;btn.textContent="⏳...";}
  try {
    let url=u; if(f){await window.sb.storage.from("products").upload(`${Date.now()}_${f.name}`,f,{upsert:true});url=window.sb.storage.from("products").getPublicUrl(`${Date.now()}_${f.name}`).publicUrl;}
    await window.sb.from("products").insert({name:n,price:p,category:c,sizes:s.split(",").map(x=>x.trim()).filter(Boolean),image_url:url,description:d});
    window.toast("✅ Опубликовано","success"); ["add-name","add-price","add-sizes","add-img","add-desc"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=""}); if(f)document.getElementById("add-file").value=""; const pv=document.getElementById("img-preview"); if(pv) pv.style.display="none"; await loadProds(); await loadAdmin();
  } catch(e){window.toast("❌ "+e.message,"error");} finally{if(btn){btn.disabled=false;btn.textContent="Опубликовать";}}
};
window.delProd = async id => { if(!confirm("Удалить?"))return; try{await window.sb.from("products").delete().eq("id",id);window.toast("🗑️","info");await loadProds();await loadAdmin();}catch(e){window.toast("❌ "+e.message,"error");} };
window.updateOrderStatus = async (oid,st) => { try{await window.sb.from("orders").update({status:st}).eq("id",oid);await window.sb.from("order_status_history").insert({order_id:oid,status:st});window.toast("✅ Статус обновлён","success");await loadAdmin();await loadOrders();}catch(e){window.toast("❌ "+e.message,"error");} };
window.deleteOrder = async id => { if(!confirm("Удалить?"))return; try{await window.sb.from("orders").delete().eq("id",id);window.toast("🗑️","info");await loadAdmin();}catch(e){window.toast("❌ "+e.message,"error");} };

// 🔑 10. AUTH & PROFILE (ИСПРАВЛЕНО)
let isLogin = true;
document.querySelectorAll(".tab").forEach(t => {
  t.onclick = function() {
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active"); isLogin=(t.dataset.tab==="login");
    const btn=document.getElementById("auth-btn"); if(btn) btn.textContent=isLogin?"Войти":"Регистрация";
  };
});

document.getElementById("auth-form")?.addEventListener("submit", async function(e) {
  e.preventDefault();
  const em=document.getElementById("email-in").value.trim(), pw=document.getElementById("pass-in").value, err=document.getElementById("auth-err"), btn=document.getElementById("auth-btn");
  if(!err||!btn) return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return err.textContent="Неверный email",err.style.display="block";
  if(pw.length<6) return err.textContent="Пароль < 6 символов",err.style.display="block";
  err.style.display="none"; btn.disabled=true; btn.textContent="⏳...";
  try {
    const res = isLogin ? await window.sb.auth.signInWithPassword({email:em,password:pw}) : await window.sb.auth.signUp({email:em,password:pw});
    if(res.error) throw res.error;
    if(res.data?.user) { await loadUserProfile(res.data.user); window.toast(isLogin?"✅ С возвращением!":"✅ Регистрация!","success"); }
  } catch(e) { err.textContent=e.message; err.style.display="block"; window.toast("❌ "+err.textContent,"error"); }
  finally { btn.disabled=false; btn.textContent=isLogin?"Войти":"Регистрация"; }
});

window.sb.auth.onAuthStateChange(async function(_, session) {
  const user = session?.user; window.currentUser = user || null;
  const af=document.getElementById("auth-flow"), pa=document.getElementById("profile-acts"), pn=document.getElementById("profile-display-name"), pe=document.getElementById("profile-email"), am=document.getElementById("admin-menu");
  if(af) af.style.display=user?"none":"block";
  if(pa) pa.style.display=user?"block":"none";
  if(user) {
    await loadUserProfile(user);
    const n=window.userProfile?.full_name||user.email.split("@")[0];
    if(pn) pn.textContent=n; if(pe) pe.textContent=user.email;
    if(am) am.style.display=ADMIN_EMAILS.includes(user.email)?"flex":"none";
  } else {
    window.userProfile=null; if(pn) pn.textContent="Гость"; if(pe) pe.textContent="Войдите"; if(am) am.style.display="none";
  }
});

async function loadUserProfile(user) {
  if(!user?.id) return;
  try {
    const res = await window.sb.from("profiles").select("*").eq("id", user.id).single();
    if(res.error && res.error.code !== "PGRST116") throw res.error;
    window.userProfile = res.data || {email:user.email, full_name:user.email.split("@")[0]};
  } catch(e) { window.userProfile = {email:user.email, full_name:user.email.split("@")[0]}; }
}

document.getElementById("logout-btn")?.addEventListener("click", async function() { await window.sb.auth.signOut(); window.currentUser=null; window.userProfile=null; window.toast("👋 Вышли","info"); });

window.editProfile = async function() {
  if(!window.currentUser) return window.toast("Войдите","error");
  await loadUserProfile(window.currentUser);
  document.getElementById("edit-fullname").value = window.userProfile?.full_name||"";
  document.getElementById("edit-phone").value = window.userProfile?.phone||"";
  document.getElementById("edit-avatar").value = window.userProfile?.avatar_url||"";
  document.getElementById("profile-edit-modal").classList.add("open");
};
window.closeProfileEdit = () => document.getElementById("profile-edit-modal").classList.remove("open");
window.saveProfile = async function() {
  if(!window.currentUser) return; const btn=event.target; btn.disabled=true; btn.textContent="⏳...";
  try {
    await window.sb.from("profiles").upsert({id:window.currentUser.id,email:window.currentUser.email,full_name:document.getElementById("edit-fullname").value.trim(),phone:document.getElementById("edit-phone").value.trim(),avatar_url:document.getElementById("edit-avatar").value.trim()});
    window.closeProfileEdit(); document.getElementById("profile-display-name").textContent=document.getElementById("edit-fullname").value.trim()||window.currentUser.email.split("@")[0]; window.toast("✅ Сохранено","success");
  } catch(e) { window.toast("❌ "+e.message,"error"); } finally { btn.disabled=false; btn.textContent="Сохранить"; }
};

// 11. REVIEWS & CHAT & PVZ (Сокращено до рабочей сути)
async function loadReviews(pid){ const l=document.getElementById("reviews-list"); if(!l)return; try{ const res=await window.sb.from("reviews").select("*,profiles(full_name)").eq("product_id",pid).order("created_at",{ascending:false}); const r=res.data; l.innerHTML=r?.length?r.map(x=>`<div class="review-card"><div style="display:flex;justify-content:space-between"><b>${x.profiles?.full_name||x.user_email.split("@")[0]}</b><span style="color:#f59e0b">${"⭐".repeat(x.rating)}</span></div><p style="margin-top:6px;color:var(--text-muted)">${x.comment}</p>${window.currentUser&&ADMIN_EMAILS.includes(window.currentUser.email)?`<button onclick="window.deleteReview('${x.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-top:6px;font-size:0.8rem">Удалить</button>`:''}</div>`).join(""):'<p style="color:var(--text-muted)">Нет отзывов</p>'; }catch(e){console.error(e);} }
document.getElementById("review-form")?.addEventListener("submit",async e=>{ e.preventDefault(); if(!window.currentUser) return window.toast("Войдите","error"); const r=Number(document.getElementById("review-rating").value), c=document.getElementById("review-comment").value.trim(); if(!c) return window.toast("Напишите текст","error"); try{ await window.sb.from("reviews").insert({product_id:window._cur.id,user_id:window.currentUser.id,user_email:window.currentUser.email,rating:r,comment:c}); document.getElementById("review-comment").value=""; await loadReviews(window._cur.id); window.toast("✅ Спасибо!","success"); }catch(e){window.toast("❌ "+e.message,"error");} });
window.deleteReview = async id => { if(!confirm("Удалить?"))return; try{await window.sb.from("reviews").delete().eq("id",id);await loadReviews(window._cur.id);window.toast("🗑️","info");}catch(e){window.toast("❌ "+e.message,"error");} };

window.openChat = () => { document.getElementById("chat-modal").classList.add("open"); document.getElementById("chat-body").innerHTML='<div id="quick-q" style="display:flex;flex-direction:column;gap:8px"><button class="quick-q-btn" onclick="window.sendMsgDirect(\'Возврат\')">↩️ Возврат</button><button class="quick-q-btn" onclick="window.sendMsgDirect(\'Где заказ\')">📦 Статус</button><button class="quick-q-btn" onclick="window.sendMsgDirect(\'Оператор\')">👨‍💻 Оператор</button></div>'; addMsg("👋 Привет! Выберите вопрос."); };
window.closeChat = () => document.getElementById("chat-modal").classList.remove("open");
const BOT_ANSWERS={"возврат":"↩️ 14 дней, товар в упаковке. Оформите в заказах.","где заказ":"📦 Статус в разделе Мои заказы.","оператор":"👨‍💻 Подключим за 5 мин. Оставьте вопрос."};
function addMsg(t){const b=document.getElementById("chat-body");b.innerHTML+=`<div style="background:var(--bg);padding:10px 12px;border-radius:12px;align-self:flex-start;max-width:80%">${t}</div>`;b.scrollTop=b.scrollHeight;}
window.sendMsg = () => { const i=document.getElementById("chat-in"),t=i.value.trim(); if(!t)return; const q=document.getElementById("quick-q"); if(q) q.remove(); const b=document.getElementById("chat-body"); b.innerHTML+=`<div style="background:var(--accent);color:#fff;padding:10px 12px;border-radius:12px;align-self:end;max-width:80%">${t}</div>`; i.value=""; b.scrollTop=b.scrollHeight; setTimeout(()=>{const k=Object.keys(BOT_ANSWERS).find(x=>t.toLowerCase().includes(x));addMsg(k?BOT_ANSWERS[k]:"🤖 Передал оператору.");},600); };
window.sendMsgDirect = t => { document.getElementById("chat-in").value=t; window.sendMsg(); };

window.openPVZ = () => { document.getElementById("pvz-modal").classList.add("open"); document.getElementById("pvz-city").value=window.pvz.city||""; document.getElementById("pvz-addr").value=window.pvz.addr||""; };
window.closePVZ = () => document.getElementById("pvz-modal").classList.remove("open");
window.savePVZ = () => { const c=document.getElementById("pvz-city").value.trim(), a=document.getElementById("pvz-addr").value.trim(); if(!c||!a) return window.toast("Заполните поля","error"); window.pvz={city:c,addr:a}; localStorage.setItem("pvz",JSON.stringify(window.pvz)); window.closePVZ(); window.toast("✅ Сохранено","success"); };
document.getElementById("add-file")?.addEventListener("change",function(e){const f=e.target.files[0],p=document.getElementById("img-preview");if(f){p.src=URL.createObjectURL(f);p.style.display="block"}else{p.style.display="none"}});

// INIT
document.addEventListener("DOMContentLoaded", () => { console.log("[OK] DOM Ready"); loadProds(); updateCart(); });
