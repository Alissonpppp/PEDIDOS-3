const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
setGlobalOptions({ region: "southamerica-east1", maxInstances: 10 });

exports.createOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para criar um pedido.");
  const rawItems = Array.isArray(request.data?.items) ? request.data.items : [];
  if (!rawItems.length || rawItems.length > 20) throw new HttpsError("invalid-argument", "Carrinho inválido.");

  const normalized = rawItems.map((i) => ({
    productId: String(i.productId || ""),
    qty: Math.max(1, Math.min(10, Number(i.qty || 1)))
  })).filter(i => i.productId);
  if (!normalized.length) throw new HttpsError("invalid-argument", "Nenhum produto válido.");

  const items = [];
  let total = 0;
  for (const wanted of normalized) {
    const snap = await db.collection("products").doc(wanted.productId).get();
    if (!snap.exists || snap.get("active") !== true) throw new HttpsError("failed-precondition", "Um produto não está disponível.");
    const data = snap.data();
    const price = Number(data.price || 0);
    if (!Number.isFinite(price) || price < 0) throw new HttpsError("internal", "Preço inválido no catálogo.");
    items.push({ productId: snap.id, title: data.title || "Produto", price, qty: wanted.qty });
    total += price * wanted.qty;
  }
  total = Math.round(total * 100) / 100;

  const ref = await db.collection("orders").add({
    userId: request.auth.uid,
    userEmail: request.auth.token.email || "",
    items,
    total,
    status: "pending",
    deliveryItems: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { orderId: ref.id, total };
});

exports.autoDeliverPaidOrder = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (after.status !== "paid" || before.status === "paid" || (after.deliveryItems || []).length) return;

  const requirements = [];
  for (const item of after.items || []) {
    const qty = Math.max(1, Number(item.qty || 1));
    const q = await db.collection("inventory")
      .where("productId", "==", item.productId)
      .where("status", "==", "available")
      .limit(qty)
      .get();
    if (q.size < qty) {
      await event.data.after.ref.update({ status: "awaiting_stock", updatedAt: FieldValue.serverTimestamp() });
      return;
    }
    q.docs.forEach(docSnap => requirements.push({ ref: docSnap.ref, productId: item.productId, title: item.title }));
  }

  await db.runTransaction(async (tx) => {
    const deliveries = [];
    const stockDelta = new Map();
    for (const req of requirements) {
      const snap = await tx.get(req.ref);
      if (!snap.exists || snap.get("status") !== "available") throw new Error("Stock item no longer available");
      deliveries.push({ productId: req.productId, title: req.title, payload: snap.get("payload") || "" });
      tx.update(req.ref, { status: "sold", orderId: event.params.orderId, soldAt: FieldValue.serverTimestamp() });
      stockDelta.set(req.productId, (stockDelta.get(req.productId) || 0) + 1);
    }
    for (const [productId, count] of stockDelta.entries()) {
      tx.update(db.collection("products").doc(productId), { stockCount: FieldValue.increment(-count), updatedAt: FieldValue.serverTimestamp() });
    }
    tx.update(event.data.after.ref, {
      status: "delivered",
      deliveryItems: deliveries,
      deliveredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
});

// PONTO DE INTEGRAÇÃO DO SEU PAGAMENTO.
// Não confie em orderId/status enviados pelo navegador sem validar a assinatura do gateway.
exports.paymentWebhook = onRequest(async (req, res) => {
  res.status(501).json({
    ok: false,
    message: "Integração de pagamento ainda não configurada. Valide a assinatura do seu gateway e só então atualize orders/{id}.status para 'paid'."
  });
});
