import { db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { addToCart, bindShell, money, qs, safeText } from "./ui.js";

bindShell();
const id = qs("id");
const root = document.querySelector("#product-view");

if (!id) {
  root.innerHTML = `<div class="empty-card"><h2>Produto não encontrado</h2><a class="btn btn-primary" href="./index.html">Voltar à loja</a></div>`;
} else {
  onSnapshot(doc(db, "products", id), (snap) => {
    if (!snap.exists()) {
      root.innerHTML = `<div class="empty-card"><h2>Produto não encontrado</h2></div>`;
      return;
    }
    const p = { id: snap.id, ...snap.data() };
    const old = Number(p.oldPrice || 0), price = Number(p.price || 0);
    const discount = old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0;
    const img = p.imageUrl ? `<img src="${safeText(p.imageUrl)}" alt="${safeText(p.title)}">` : `<div class="product-placeholder hero-placeholder"><span>FB</span></div>`;
    root.innerHTML = `
      <div class="product-detail-grid">
        <div class="product-detail-media">${img}</div>
        <section class="product-detail-info">
          <a class="eyebrow" href="./index.html">← Voltar ao catálogo</a>
          <h1>${safeText(p.title)}</h1>
          <span class="delivery-badge">⚡ ${p.autoDelivery !== false ? "Entrega automática" : "Entrega digital"}</span>
          <div class="detail-price">${old > price ? `<del>${money(old)}</del>` : ""}<strong>${money(price)}</strong>${discount ? `<span>-${discount}%</span>` : ""}</div>
          <p class="pix-copy">Pagamento configurável por você no checkout.</p>
          <div class="stock-status">${p.stockCount > 0 ? `● Em estoque (${p.stockCount})` : "● Consulte disponibilidade"}</div>
          <div class="detail-actions">
            <button class="btn btn-primary btn-lg" id="buy-now">Comprar agora</button>
            <button class="btn btn-secondary btn-lg" id="add-cart">Adicionar ao carrinho</button>
          </div>
          <div class="trust-grid">
            <div><b>Compra segura</b><span>Autenticação Firebase e regras de acesso.</span></div>
            <div><b>Entrega automática</b><span>Liberação após o pedido ser confirmado como pago.</span></div>
            <div><b>Área do cliente</b><span>Pedidos e entregas ficam em “Minhas compras”.</span></div>
          </div>
        </section>
      </div>
      <section class="description-card">
        <h2>Descrição</h2>
        <div class="description-text">${safeText(p.description || "Sem descrição cadastrada.").replaceAll("\n", "<br>")}</div>
      </section>`;
    document.querySelector("#add-cart").onclick = () => addToCart(p);
    document.querySelector("#buy-now").onclick = () => {
      addToCart(p);
      location.href = "./checkout.html";
    };
  });
}
