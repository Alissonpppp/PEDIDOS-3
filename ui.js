import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

export const money = (value) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
}).format(Number(value || 0));

export function safeText(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function toast(message, kind = "info") {
  let host = document.querySelector(".toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    document.body.appendChild(host);
  }
  const item = document.createElement("div");
  item.className = `toast ${kind}`;
  item.textContent = message;
  host.appendChild(item);
  setTimeout(() => item.classList.add("show"), 10);
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 250);
  }, 3500);
}

export function getCart() {
  try { return JSON.parse(localStorage.getItem("fluxblue_cart")) || []; }
  catch { return []; }
}

export function setCart(cart) {
  localStorage.setItem("fluxblue_cart", JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(product, qty = 1) {
  const cart = getCart();
  const found = cart.find((i) => i.id === product.id);
  if (found) found.qty += qty;
  else cart.push({
    id: product.id,
    title: product.title,
    price: Number(product.price),
    imageUrl: product.imageUrl || "",
    qty
  });
  setCart(cart);
  toast("Adicionado ao carrinho", "success");
}

export function updateCartBadge() {
  const count = getCart().reduce((a, i) => a + Number(i.qty || 0), 0);
  document.querySelectorAll("[data-cart-count]").forEach((el) => el.textContent = count);
}

export function bindShell() {
  updateCartBadge();
  document.querySelectorAll("[data-menu-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => document.body.classList.toggle("menu-open"));
  });

  onAuthStateChanged(auth, (user) => {
    document.querySelectorAll("[data-auth-label]").forEach((el) => {
      el.textContent = user ? (user.displayName?.split(" ")[0] || "Minha conta") : "Entrar";
    });
    document.querySelectorAll("[data-auth-link]").forEach((el) => {
      el.href = user ? "./conta.html" : "./login.html";
    });
    document.querySelectorAll("[data-logout]").forEach((el) => {
      el.hidden = !user;
      el.onclick = async () => { await signOut(auth); location.href = "./index.html"; };
    });
  });
}

export const qs = (name) => new URLSearchParams(location.search).get(name);
