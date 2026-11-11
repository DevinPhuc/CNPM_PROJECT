(async () => {
  const { api, $, money, esc, toast, dateVN, variantLabel, openAuth, onLogin, ready } = Jewels;
  const root = $("#ordersRoot");
  const dlg = $("#orderDialog");
  const STATUS = { pending: "Chờ xác nhận", processing: "Đang xử lý", shipped: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy", returned: "Đã trả hàng" };
  const METHOD = { cod: "Thanh toán khi nhận hàng", bank_transfer: "Chuyển khoản", e_wallet: "Ví điện tử", credit_card: "Thẻ tín dụng" };
  const PAY = { pending: "Chờ thanh toán", completed: "Đã thanh toán", failed: "Thất bại", refunded: "Đã hoàn tiền" };
  const STEPS = ["pending", "processing", "shipped", "delivered"];

  async function load() {
    if (!Jewels.state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập</h3><p>Đăng nhập để xem đơn hàng của bạn.</p><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      $("#goLogin").addEventListener("click", () => openAuth());
      return;
    }
    try {
      const orders = await api("/orders");
      root.innerHTML = orders.length ? orders.map(card).join("")
        : '<div class="empty"><h3>Bạn chưa có đơn hàng nào</h3><a class="btn" href="shop.html">Mua sắm ngay</a></div>';
    } catch (e) { root.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; }
  }

  function card(o) {
    const n = o.items.reduce((s, i) => s + i.quantity, 0);
    return `<article class="order-card">
      <div class="order-top"><div><strong>Đơn #${o.id}</strong> <span class="muted">· ${dateVN(o.date)}</span></div><span class="status ${o.status}">${STATUS[o.status] || o.status}</span></div>
      <div class="thumb-row">${o.items.slice(0, 5).map((i) => `<img src="${esc(i.image_url || "https://placehold.co/100")}" alt="${esc(i.product_name)}" title="${esc(i.product_name)}">`).join("")}
        <span class="muted">${esc(o.items[0]?.product_name || "")}${o.items.length > 1 ? ` và ${o.items.length - 1} sản phẩm khác` : ""} (${n} món)</span></div>
      <div class="order-foot"><span>Tổng tiền: <strong class="price">${money(o.total)}</strong></span>
        <span style="display:flex;gap:10px">
          ${o.status === "pending" ? `<button class="btn sm outline" data-cancel="${o.id}">Hủy đơn</button>` : ""}
          <button class="btn sm" data-view="${o.id}">Xem chi tiết</button></span></div>
    </article>`;
  }

  async function view(id) {
    const body = $("#orderDetail");
    body.innerHTML = '<div class="skeleton" style="min-height:260px"></div>';
    dlg.showModal();
    try {
      const o = await api("/orders/" + id);
      const idx = STEPS.indexOf(o.status);
      const sub = o.order_items.reduce((s, i) => s + Number(i.subtotal), 0);
      body.innerHTML = `
        <p class="eyebrow">Jewels · Đơn hàng</p>
        <h2>Đơn #${o.order_id} <span class="status ${o.status}" style="font-size:.7rem;vertical-align:middle">${STATUS[o.status]}</span></h2>
        <p class="muted">Đặt lúc ${dateVN(o.order_date)}</p>
        ${idx >= 0 ? `<div class="timeline">${STEPS.map((s, i) => `<div class="${i <= idx ? "done" : ""}"><i></i>${STATUS[s]}</div>`).join("")}</div>` : ""}
        <div class="form-grid" style="margin:18px 0">
          <div><strong>Người nhận</strong><br>${esc(o.cus_name)} · ${esc(o.cus_phone)}<br><span class="muted">${esc(o.address)}</span></div>
          <div><strong>Thanh toán</strong><br>${METHOD[o.payment?.method] || "-"}<br><span class="muted">${PAY[o.payment?.status] || ""}</span></div>
        </div>
        <div class="od-items">${o.order_items.map((i) => `
          <div class="line-item"><img src="${esc(i.image_url || "https://placehold.co/100")}" alt=""><div><h4>${esc(i.product_name)}</h4><small>${esc(variantLabel(i))} · ${money(i.unit_price)} × ${i.quantity}</small></div><strong class="price">${money(i.subtotal)}</strong></div>`).join("")}</div>
        <div class="sum-row"><span>Tạm tính</span><strong>${money(sub)}</strong></div>
        <div class="sum-row"><span>Giảm giá${o.discount ? ` (${esc(o.discount.code)})` : ""}</span><strong>-${money(o.discount_amount)}</strong></div>
        <div class="sum-row"><span>Phí vận chuyển</span><strong>${money(o.shipping_fee)}</strong></div>
        <div class="sum-row total"><span>Tổng cộng</span><strong>${money(o.total_amount)}</strong></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px" class="no-print">
          ${o.status === "pending" ? `<button class="btn outline" data-cancel="${o.order_id}">Hủy đơn</button>` : ""}
          <button class="btn" onclick="window.print()">In hóa đơn</button></div>`;
    } catch (e) { body.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; }
  }

  async function cancel(id) {
    if (!confirm("Bạn chắc chắn muốn hủy đơn hàng #" + id + "?")) return;
    try {
      await api(`/orders/${id}/cancel`, { method: "POST" });
      toast("Đã hủy đơn hàng #" + id, "ok");
      dlg.open && dlg.close();
      Jewels.broadcast("ORDER_CANCELLED", { orderId: id });
      load();
    } catch (e) { toast(e.message, "error"); }
  }

  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.view) {
      dlg._currentOrderId = t.dataset.view;
      view(t.dataset.view);
    }
    else if (t.dataset.cancel) cancel(t.dataset.cancel);
    else if (t.hasAttribute("data-close") && dlg.contains(t)) dlg.close();
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // Tự động cập nhật tức thì khi Admin đổi trạng thái
  document.addEventListener("jewels:order-updated", (e) => {
    load();
    if (dlg.open && dlg._currentOrderId) {
      view(dlg._currentOrderId);
    }
  });

  onLogin(load);
  await ready;
  load();
})();
