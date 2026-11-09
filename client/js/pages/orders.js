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
      const disc = Number(o.discount_amount || 0);
      const taxable = Math.max(0, sub - disc);
      const vat = Math.round(taxable * 0.08);
      const shipping = Number(o.shipping_fee || 0);
      const totalToPay = taxable + vat + shipping;
      const isReturned = o.status === "returned" || o.payment?.status === "refunded";
      const isCancelled = o.status === "cancelled";

      // Xử lý hiển thị trạng thái thanh toán logic
      let payStatusHtml = "";
      if (isReturned) {
        payStatusHtml = '<span style="color:#7c3aed;font-weight:700;background:#f3e8ff;padding:2px 8px;border-radius:4px;border:1px solid #ddd6fe;display:inline-block;margin-top:2px;">↩️ Đã hoàn tiền (Refunded)</span>';
      } else if (isCancelled) {
        payStatusHtml = '<span style="color:#dc2626;font-weight:700;background:#fee2e2;padding:2px 8px;border-radius:4px;border:1px solid #fca5a5;display:inline-block;margin-top:2px;">Đã hủy thanh toán</span>';
      } else {
        const payText = PAY[o.payment?.status] || (o.payment?.method === "cod" ? "Thu tiền COD" : "Đã thanh toán");
        payStatusHtml = `<span class="muted" style="color:var(--gold-rich);font-weight:600">${payText}</span>`;
      }

      // Xử lý banner cảnh báo trên đầu hóa đơn
      let bannerHtml = "";
      if (isReturned) {
        bannerHtml = `
          <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-left:5px solid #e11d48;border-radius:8px;padding:11px 15px;margin-bottom:14px;color:#9f1239;font-size:12.5px;line-height:1.5;">
            <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">⚠️ HÓA ĐƠN ĐÃ THU HỒI / HỦY BỎ</strong>
            Đơn hàng này đã được hoàn trả lại sản phẩm. Hóa đơn không còn giá trị lưu hành và số tiền đã được hoàn lại cho khách hàng.
          </div>
        `;
      } else if (isCancelled) {
        bannerHtml = `
          <div style="background:#fef2f2;border:1.5px solid #fee2e2;border-left:5px solid #ef4444;border-radius:8px;padding:11px 15px;margin-bottom:14px;color:#991b1b;font-size:12.5px;line-height:1.5;">
            <strong style="font-size:13px;display:flex;align-items:center;gap:6px;">⚠️ ĐƠN HÀNG ĐÃ BỊ HỦY</strong>
            Hóa đơn này không còn hiệu lực do đơn hàng đã được hủy bỏ.
          </div>
        `;
      }

      // Xử lý con dấu mộc điện tử
      let stampHtml = "";
      if (isReturned) {
        stampHtml = `
          <div class="inv-stamp" style="font-size:0.75rem;padding:6px 14px;border:2px dashed #e11d48;color:#e11d48;border-radius:6px;background:#fff1f2;display:inline-block;text-align:center;">
            <span style="display:block;font-weight:800;font-size:11px;letter-spacing:0.5px;">✗ HÓA ĐƠN ĐÃ THU HỒI / HỦY BỎ</span>
            <span style="font-size:9.5px;display:block;margin-top:2px;">LÝ DO: HÀNG BỊ TRẢ LẠI (HOÀN TIỀN)</span>
          </div>
        `;
      } else if (isCancelled) {
        stampHtml = `
          <div class="inv-stamp" style="font-size:0.75rem;padding:6px 14px;border:2px dashed #991b1b;color:#991b1b;border-radius:6px;background:#fef2f2;display:inline-block;text-align:center;">
            <span style="display:block;font-weight:800;font-size:11px;letter-spacing:0.5px;">✗ HÓA ĐƠN ĐÃ HỦY BỎ</span>
            <span style="font-size:9.5px;display:block;margin-top:2px;">ĐƠN HÀNG BỊ HỦY</span>
          </div>
        `;
      } else {
        stampHtml = `
          <div class="inv-stamp" style="font-size:0.75rem;padding:6px 12px">
            <span>✓ XÁC THỰC KÝ ĐIỆN TỬ</span>
            <span style="font-size:0.65rem">CÔNG TY TNHH TRANG SỨC JEWELS</span>
          </div>
        `;
      }

      body.innerHTML = `
        ${bannerHtml}
        <div class="inv-brand" style="margin-bottom:12px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div>
              <h3 style="margin:0;font-size:1.6rem;color:var(--gold-rich)">JEWELS ATELIER</h3>
              <small class="muted">CÔNG TY TNHH TRANG SỨC CAO CẤP JEWELS · MST: 0318999888</small>
            </div>
            <div style="text-align:right">
              <strong>${isReturned ? 'HÓA ĐƠN ĐÃ THU HỒI' : (isCancelled ? 'HÓA ĐƠN ĐÃ HỦY' : 'HÓA ĐƠN ĐIỆN TỬ')}</strong><br>
              <small class="muted">Số: #HD-${String(o.order_id).padStart(6, "0")} · Ký hiệu: JW/26E</small>
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <h2>Đơn hàng #${o.order_id} <span class="status ${o.status}" style="font-size:.7rem;vertical-align:middle">${STATUS[o.status] || o.status}</span></h2>
          <p class="muted" style="margin:0">Thời gian: ${dateVN(o.order_date)}</p>
        </div>
        ${idx >= 0 ? `<div class="timeline no-print">${STEPS.map((s, i) => `<div class="${i <= idx ? "done" : ""}"><i></i>${STATUS[s]}</div>`).join("")}</div>` : ""}
        <div class="form-grid" style="margin:18px 0;background:#faf8f5;padding:12px 16px;border-radius:10px;border:1px solid #ebd9b5">
          <div><strong>Người nhận hàng:</strong><br>${esc(o.cus_name)} · ${esc(o.cus_phone)}<br><span class="muted">${esc(o.address)}</span></div>
          <div><strong>Hình thức thanh toán:</strong><br>${METHOD[o.payment?.method] || o.payment?.method || "-"}<br>${payStatusHtml}</div>
        </div>
        <div class="od-items">${o.order_items.map((i) => `
          <div class="line-item"><img src="${esc(i.image_url || "https://placehold.co/100")}" alt=""><div><h4>${esc(i.product_name)}</h4><small>${esc(variantLabel(i))} · ${money(i.unit_price)} × ${i.quantity}</small></div><strong class="price">${money(i.subtotal)}</strong></div>`).join("")}</div>
        <div class="sum-row"><span>Tạm tính tiền hàng</span><strong>${money(sub)}</strong></div>
        ${disc > 0 ? `<div class="sum-row" style="color:var(--ok)"><span>Giảm giá${o.discount ? ` (${esc(o.discount.code)})` : ""}</span><strong>-${money(disc)}</strong></div>` : ""}
        
        <div class="sum-row"><span>Phí vận chuyển</span><strong>${o.shipping_fee > 0 ? money(o.shipping_fee) : "Miễn phí"}</strong></div>
        <div class="sum-row total"><span>${isReturned ? 'Tổng tiền đã hoàn trả' : 'Tổng cộng thanh toán'}</span><strong>${money(totalToPay)}</strong></div>
        <div style="text-align:right;font-size:11.5px;color:#94a3b8;font-style:italic;margin-top:-6px;margin-bottom:6px;">
          (Đã bao gồm thuế VAT)
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
          ${stampHtml}
          <div style="display:flex;gap:10px;justify-content:flex-end" class="no-print">
            ${o.status === "pending" ? `<button class="btn outline" data-cancel="${o.order_id}">Hủy đơn</button>` : ""}
            <button class="btn gold" onclick="window.print()">🖨️ In hóa đơn</button>
          </div>
        </div>`;
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
