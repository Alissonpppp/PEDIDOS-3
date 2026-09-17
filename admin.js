import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { bindShell, money, safeText, toast } from "./ui.js";

bindShell();
const gate = document.querySelector("#admin-gate");
const panel = document.querySelector("#admin-panel");
const productsTable = document.querySelector("#admin-products");
const ordersTable = document.querySelector("#admin-orders");
const productForm = document.querySelector("#product-form");
const inventoryForm = document.querySelector("#inventory-form");
const productSelect = document.querySelector("#inventory-product");
let products = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { gate.innerHTML = `<div class="empty-card"><h2>Área administrativa</h2><p>Entre com uma conta administradora.</p><a class="btn btn-primary" href="./login.html?force=1">Entrar</a></div>`; return; }
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (!adminDoc.exists()) {
    gate.innerHTML = `<div class="empty-card"><h2>Acesso negado</h2><p>Seu UID é <code>${safeText(user.uid)}</code>.</p><p>Crie manualmente <code>admins/${safeText(user.uid)}</code> no Firestore para transformar esta conta em administradora.</p></div>`;
    return;
  }
  gate.hidden = true; panel.hidden = false; startAdmin();
});

function startAdmin() {
  onSnapshot(query(collection(db, "products"), orderBy("sortOrder", "asc")), (snap) => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    productsTable.innerHTML = products.map(p => `<tr><td><div class="table-product"><div class="tiny-cover">${p.imageUrl ? `<img src="${safeText(p.imageUrl)}">` : "FB"}</div><div><b>${safeText(p.title)}</b><span>${safeText(p.category || "")}</span></div></div></td><td>${money(p.price)}</td><td>${p.stockCount || 0}</td><td>${p.active !== false ? "Ativo" : "Oculto"}</td><td><button class="link-btn" data-edit="${p.id}">Editar</button><button class="link-btn danger" data-delete="${p.id}">Excluir</button></td></tr>`).join("");
    productSelect.innerHTML = `<option value="">Selecione...</option>` + products.map(p => `<option value="${p.id}">${safeText(p.title)}</option>`).join("");
    productsTable.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => fillProduct(b.dataset.edit));
    productsTable.querySelectorAll("[data-delete]").forEach(b => b.onclick = () => removeProduct(b.dataset.delete));
    document.querySelector("#stat-products").textContent = products.length;
  });

  onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(50)), (snap) => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    ordersTable.innerHTML = orders.map(o => `<tr><td>#${safeText(o.id.slice(0,8).toUpperCase())}<small>${safeText(o.userEmail || "")}</small></td><td>${money(o.total)}</td><td><select data-status="${o.id}"><option value="pending" ${o.status==='pending'?'selected':''}>Pendente</option><option value="paid" ${o.status==='paid'?'selected':''}>Pago</option><option value="delivered" ${o.status==='delivered'?'selected':''}>Entregue</option><option value="cancelled" ${o.status==='cancelled'?'selected':''}>Cancelado</option><option value="awaiting_stock" ${o.status==='awaiting_stock'?'selected':''}>Sem estoque</option></select></td><td>${(o.items || []).map(i => safeText(i.title)).join(", ")}</td></tr>`).join("");
    ordersTable.querySelectorAll("[data-status]").forEach(s => s.onchange = async () => {
      try { await updateDoc(doc(db, "orders", s.dataset.status), { status: s.value, updatedAt: serverTimestamp() }); toast("Pedido atualizado", "success"); }
      catch (e) { toast(e.message, "error"); }
    });
    document.querySelector("#stat-orders").textContent = orders.length;
    document.querySelector("#stat-pending").textContent = orders.filter(o => o.status === "pending").length;
  });
}

productForm.onsubmit = async (e) => {
  e.preventDefault();
  const f = new FormData(productForm);
  const id = f.get("id");
  const data = {
    title: f.get("title").trim(),
    category: f.get("category").trim() || "Outros",
    imageUrl: f.get("imageUrl").trim(),
    description: f.get("description").trim(),
    price: Number(f.get("price")),
    oldPrice: Number(f.get("oldPrice") || 0),
    sortOrder: Number(f.get("sortOrder") || 999),
    active: f.get("active") === "on",
    autoDelivery: true,
    updatedAt: serverTimestamp()
  };
  try {
    if (id) await updateDoc(doc(db, "products", id), data);
    else await addDoc(collection(db, "products"), { ...data, stockCount: 0, createdAt: serverTimestamp() });
    productForm.reset(); productForm.elements.id.value = ""; document.querySelector("#product-submit").textContent = "Salvar jogo";
    toast("Produto salvo", "success");
  } catch (err) { toast(err.message, "error"); }
};

document.querySelector("#product-cancel").onclick = () => { productForm.reset(); productForm.elements.id.value = ""; document.querySelector("#product-submit").textContent = "Salvar jogo"; };

function fillProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  Object.entries({ id:p.id, title:p.title, category:p.category, imageUrl:p.imageUrl, description:p.description, price:p.price, oldPrice:p.oldPrice, sortOrder:p.sortOrder }).forEach(([k,v]) => { if (productForm.elements[k]) productForm.elements[k].value = v ?? ""; });
  productForm.elements.active.checked = p.active !== false;
  document.querySelector("#product-submit").textContent = "Atualizar jogo";
  productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removeProduct(id) {
  if (!confirm("Excluir este produto? Os pedidos antigos não serão apagados.")) return;
  try { await deleteDoc(doc(db, "products", id)); toast("Produto excluído", "success"); }
  catch (e) { toast(e.message, "error"); }
}

inventoryForm.onsubmit = async (e) => {
  e.preventDefault();
  const productId = productSelect.value;
  const payloads = inventoryForm.payloads.value.split("\n").map(x => x.trim()).filter(Boolean);
  if (!productId || !payloads.length) return toast("Escolha um produto e informe ao menos uma entrega.", "error");
  try {
    const batch = writeBatch(db);
    payloads.forEach(payload => {
      const ref = doc(collection(db, "inventory"));
      batch.set(ref, { productId, payload, status: "available", createdAt: serverTimestamp() });
    });
    const product = products.find(p => p.id === productId);
    batch.update(doc(db, "products", productId), { stockCount: Number(product?.stockCount || 0) + payloads.length, updatedAt: serverTimestamp() });
    await batch.commit();
    inventoryForm.reset(); toast(`${payloads.length} entrega(s) adicionada(s)`, "success");
  } catch (err) { toast(err.message, "error"); }
};
