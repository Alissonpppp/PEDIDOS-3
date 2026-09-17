import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, onSnapshot, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { bindShell, money, safeText } from "./ui.js";

bindShell();
const profile = document.querySelector("#profile-card");
const ordersEl = document.querySelector("#orders-list");

const labels = { pending: "Aguardando pagamento", paid: "Pagamento confirmado", delivered: "Entregue", cancelled: "Cancelado", awaiting_stock: "Aguardando estoque" };

onAuthStateChanged(auth, (user) => {
  if (!user) { location.href = "./login.html"; return; }
  profile.innerHTML = `<div class="avatar">${safeText((user.displayName || user.email || "F")[0].toUpperCase())}</div><div><h2>${safeText(user.displayName || "Cliente Flux Blue")}</h2><p>${safeText(user.email || "")}</p></div>`;
  const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    if (snap.empty) {
      ordersEl.innerHTML = `<div class="empty-card"><h3>Você ainda não tem compras</h3><p>Seus pedidos aparecerão aqui.</p><a class="btn btn-primary" href="./index.html">Ver jogos</a></div>`;
      return;
    }
    ordersEl.innerHTML = snap.docs.map(d => {
      const o = { id: d.id, ...d.data() };
      const items = (o.items || []).map(i => `<li>${safeText(i.title)} <span>x${i.qty || 1}</span></li>`).join("");
      const delivery = (o.deliveryItems || []).map(item => `
        <div class="delivery-box"><div><b>${safeText(item.title || "Entrega")}</b><span>Seu conteúdo digital</span></div><code>${safeText(item.payload || "")}</code><button data-copy="${safeText(item.payload || "")}">Copiar</button></div>`).join("");
      return `<article class="order-card">
        <div class="order-head"><div><b>Pedido #${safeText(d.id.slice(0,8).toUpperCase())}</b><span>${o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("pt-BR") : ""}</span></div><span class="status status-${safeText(o.status)}">${safeText(labels[o.status] || o.status)}</span></div>
        <ul>${items}</ul><div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div>${delivery}
      </article>`;
    }).join("");
    ordersEl.querySelectorAll("[data-copy]").forEach(btn => btn.onclick = async () => {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = "Copiado";
    });
  }, (err) => {
    console.error(err);
    ordersEl.innerHTML = `<div class="empty-card"><h3>Não foi possível carregar os pedidos.</h3><p>Talvez falte publicar o índice do Firestore.</p></div>`;
  });
});
