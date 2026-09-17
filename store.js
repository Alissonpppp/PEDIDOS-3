import { db } from "./firebase.js";
import { collection, onSnapshot, query, where, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { addToCart, bindShell, money, safeText } from "./ui.js";

bindShell();
const grid = document.querySelector("#product-grid");
const categories = document.querySelector("#category-tabs");
const empty = document.querySelector("#empty-state");
let products = [];
let activeCategory = "Todos";

function card(p) {
  const old = Number(p.oldPrice || 0);
  const price = Number(p.price || 0);
  const discount = old > price && old > 0 ? Math.round((1 - price / old) * 100) : 0;
  const image = p.imageUrl
    ? `<img src="${safeText(p.imageUrl)}" alt="${safeText(p.title)}" loading="lazy">`
    : `<div class="product-placeholder"><span>FB</span></div>`;
  return `
    <article class="product-card">
      <a class="product-media" href="./produto.html?id=${encodeURIComponent(p.id)}">${image}</a>
      <div class="product-body">
        <div class="product-meta"><span>${safeText(p.category || "Jogos")}</span>${p.autoDelivery !== false ? '<b>Entrega automática</b>' : ''}</div>
        <a class="product-title" href="./produto.html?id=${encodeURIComponent(p.id)}">${safeText(p.title)}</a>
        <div class="price-row">
          <div>${old > price ? `<del>${money(old)}</del>` : ""}<strong>${money(price)}</strong></div>
          ${discount ? `<span class="discount">-${discount}%</span>` : ""}
        </div>
        <div class="product-actions">
          <a class="btn btn-primary" href="./produto.html?id=${encodeURIComponent(p.id)}">Comprar agora</a>
          <button class="btn btn-icon" data-add="${safeText(p.id)}" aria-label="Adicionar ao carrinho">+</button>
        </div>
      </div>
    </article>`;
}

function render() {
  const filtered = activeCategory === "Todos" ? products : products.filter(p => p.category === activeCategory);
  grid.innerHTML = filtered.map(card).join("");
  empty.hidden = filtered.length > 0;
  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = products.find(x => x.id === btn.dataset.add);
      if (p) addToCart(p);
    });
  });
}

function renderCategories() {
  const list = ["Todos", ...new Set(products.map(p => p.category).filter(Boolean))];
  categories.innerHTML = list.map(c => `<button class="category-pill ${c === activeCategory ? "active" : ""}" data-category="${safeText(c)}">${safeText(c)}</button>`).join("");
  categories.querySelectorAll("button").forEach(btn => btn.onclick = () => {
    activeCategory = btn.dataset.category;
    renderCategories();
    render();
  });
}

const productsQuery = query(collection(db, "products"), where("active", "==", true), orderBy("sortOrder", "asc"));
onSnapshot(productsQuery, (snap) => {
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategories();
  render();
}, (err) => {
  console.error(err);
  grid.innerHTML = `<div class="empty-card"><h3>Catálogo indisponível</h3><p>Confira se o Firestore foi criado e se as regras foram publicadas.</p></div>`;
});
