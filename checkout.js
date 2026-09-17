import { auth, functions } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
import { bindShell, getCart, money, safeText, setCart, toast } from "./ui.js";

bindShell();
const itemsEl = document.querySelector("#checkout-items");
const totalEl = document.querySelector("#checkout-total");
const button = document.querySelector("#create-order");
let user = null;

onAuthStateChanged(auth, (u) => { user = u; if (!u) document.querySelector("#login-warning").hidden = false; });

function render() {
  const cart = getCart();
  if (!cart.length) {
    itemsEl.innerHTML = `<div class="empty-card"><h3>Seu carrinho está vazio</h3><a class="btn btn-primary" href="./index.html">Voltar à loja</a></div>`;
    button.disabled = true;
    totalEl.textContent = money(0);
    return;
  }
  itemsEl.innerHTML = cart.map((i, idx) => `<div class="checkout-line"><div class="mini-cover">${i.imageUrl ? `<img src="${safeText(i.imageUrl)}">` : "FB"}</div><div><b>${safeText(i.title)}</b><span>${money(i.price)} × ${i.qty}</span></div><div class="qty"><button data-dec="${idx}">−</button><span>${i.qty}</span><button data-inc="${idx}">+</button><button class="remove" data-remove="${idx}">×</button></div></div>`).join("");
  const total = cart.reduce((a, i) => a + Number(i.price) * Number(i.qty), 0);
  totalEl.textContent = money(total);
  itemsEl.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => change(+b.dataset.inc, 1));
  itemsEl.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => change(+b.dataset.dec, -1));
  itemsEl.querySelectorAll("[data-remove]").forEach(b => b.onclick = () => remove(+b.dataset.remove));
}
function change(index, delta) { const c = getCart(); c[index].qty = Math.max(1, Number(c[index].qty) + delta); setCart(c); render(); }
function remove(index) { const c = getCart(); c.splice(index, 1); setCart(c); render(); }

button.onclick = async () => {
  if (!user) { location.href = "./login.html"; return; }
  const cart = getCart();
  button.disabled = true; button.textContent = "Criando pedido...";
  try {
    const createOrder = httpsCallable(functions, "createOrder");
    const result = await createOrder({ items: cart.map(i => ({ productId: i.id, qty: i.qty })) });
    setCart([]);
    document.querySelector("#checkout-card").innerHTML = `<div class="success-card"><div class="success-icon">✓</div><h2>Pedido criado</h2><p>Pedido <b>#${safeText(result.data.orderId.slice(0,8).toUpperCase())}</b> no valor de <b>${money(result.data.total)}</b>.</p><p>Agora conecte sua forma de pagamento ao pedido. Quando o status virar <b>paid</b>, a entrega automática será processada.</p><div class="stack-actions"><a class="btn btn-primary" href="./conta.html">Minhas compras</a><a class="btn btn-secondary" href="./index.html">Continuar comprando</a></div></div>`;
  } catch (e) {
    console.error(e); toast(e.message || "Erro ao criar pedido", "error");
    button.disabled = false; button.textContent = "Criar pedido";
  }
};
render();
