(async () => {
  const { api, $, $$, money, esc, toast, variantLabel, refreshCartCount, openAuth, onLogin, ready } = Jewels;
  const root = $("#checkoutRoot");
  const METHODS = [
    ["cod", "Thanh toán khi nhận hàng (COD)", "Trả tiền mặt cho nhân viên giao hàng"],
    ["bank_transfer", "Chuyển khoản ngân hàng", "Thông tin chuyển khoản sẽ được gửi sau khi đặt hàng"],
    ["e_wallet", "Ví điện tử", "MoMo / ZaloPay / VNPay"],
    ["credit_card", "Thẻ tín dụng / ghi nợ", "Visa, MasterCard, JCB"],
  ];
  let cart, addresses = [], method = "cod", voucher = null;

  // Giữ lại giá trị người dùng nhập (nếu re-render)
  let orderInfo = {
    recipientName: "",
    phone: "",
    address: "",
  };

  async function load() {
    if (!Jewels.state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập để thanh toán</h3><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      $("#goLogin").addEventListener("click", () => openAuth());
      return;
    }

    // Thiết lập mặc định thông tin người nhận từ tài khoản (địa chỉ để trống để khách tự nhập tay)
    if (!orderInfo.recipientName) orderInfo.recipientName = Jewels.state.user.name || "";
    if (!orderInfo.phone) orderInfo.phone = Jewels.state.user.phone || "";

    try {
      [cart, addresses] = await Promise.all([api("/cart"), api("/addresses")]);
    } catch (e) {
      root.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`;
      return;
    }

    if (!cart.items.length) {
      root.innerHTML = `<div class="empty"><h3>Giỏ hàng đang trống</h3><a class="btn" href="shop.html">Tiếp tục mua sắm</a></div>`;
      return;
    }

    render();
  }

  function totals() {
    const discount = voucher?.amount || 0;
    return { discount, total: cart.subtotal - discount + cart.shipping };
  }

  function render() {
    const { discount, total } = totals();
    root.innerHTML = `
      <div class="layout-2">
        <div>
          <!-- PHẦN 1: THÔNG TIN ĐẶT HÀNG (Người nhận & SĐT mặc định nhưng sửa được, Địa chỉ để trống nhập tay) -->
          <section class="panel">
            <h3>1. Thông tin đặt hàng</h3>

            <div class="form-grid" id="orderInfoForm">
              <label class="field">
                Họ và tên người nhận
                <input id="orderRecipient" name="recipient_name" required placeholder="Nhập họ và tên người nhận" value="${esc(orderInfo.recipientName)}">
                <small class="muted" style="font-size:0.78rem">Mặc định từ tài khoản, có thể thay đổi nếu gửi tặng người khác</small>
              </label>

              <label class="field">
                Số điện thoại liên hệ
                <input id="orderPhone" name="phone" type="tel" maxlength="10" inputmode="numeric" required placeholder="0901234567" value="${esc(orderInfo.phone)}">
                <small class="muted" style="font-size:0.78rem">Số điện thoại để shipper liên hệ giao hàng</small>
              </label>

              <label class="field wide">
                Địa chỉ nhận hàng
                <input id="orderAddress" name="address" required placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..." value="${esc(orderInfo.address)}">
                <small class="muted" style="font-size:0.78rem">Vui lòng nhập địa chỉ cụ thể cho đơn hàng này</small>
              </label>
            </div>
            <p class="feedback" id="orderInfoFb" style="margin-top:10px"></p>
          </section>

          <!-- PHẦN 2: PHƯƠNG THỨC THANH TOÁN -->
          <section class="panel">
            <h3>2. Phương thức thanh toán</h3>
            ${METHODS.map(([v, t, d]) => `
              <label class="radio-card">
                <input type="radio" name="method" value="${v}" ${v === method ? "checked" : ""}>
                <span><strong>${t}</strong><small>${d}</small></span>
              </label>`).join("")}
          </section>

          <!-- PHẦN 3: SẢN PHẨM -->
          <section class="panel">
            <h3>3. Sản phẩm trong đơn (${cart.count})</h3>
            <div class="od-items">
              ${cart.items.map((i) => `
                <div class="line-item">
                  <img src="${esc(i.image)}" alt="${esc(i.name)}">
                  <div>
                    <h4>${esc(i.name)}</h4>
                    <small>${esc(variantLabel(i))} · SL ${i.quantity}</small>
                  </div>
                  <strong class="price">${money(i.subtotal)}</strong>
                </div>`).join("")}
            </div>
          </section>
        </div>

        <!-- TÓM TẮT ĐƠN HÀNG & NÚT ĐẶT HÀNG -->
        <aside class="panel" style="position:sticky;top:100px">
          <h3>Tóm tắt đơn hàng</h3>
          <div class="voucher">
            <input id="code" placeholder="Mã giảm giá" value="${esc(voucher?.code || "")}" ${voucher ? "readonly" : ""}>
            ${voucher ? '<button class="btn sm outline" id="rmVoucher" type="button">Bỏ</button>' : '<button class="btn sm" id="applyVoucher" type="button">Áp dụng</button>'}
          </div>
          <p class="feedback ${voucher ? "ok" : ""}" id="voucherFb">${voucher ? "✓ " + esc(voucher.label) : ""}</p>
          <div class="sum-row"><span>Tạm tính</span><strong>${money(cart.subtotal)}</strong></div>
          <div class="sum-row"><span>Giảm giá</span><strong>${discount ? "-" + money(discount) : "0đ"}</strong></div>
          <div class="sum-row"><span>Phí vận chuyển</span><strong>${cart.shipping ? money(cart.shipping) : "Miễn phí"}</strong></div>
          <div class="sum-row total"><span>Tổng cộng</span><strong>${money(total)}</strong></div>

          <button class="btn gold block" id="placeOrder" style="margin-top:18px;font-size:1.05rem;padding:14px">
            Xác nhận đặt hàng →
          </button>
          <p class="feedback" id="orderFb"></p>
          <a class="link-btn" href="cart.html" style="text-align:center;display:block;margin-top:8px">← Quay lại giỏ hàng</a>
        </aside>
      </div>`;

    // Lắng nghe thay đổi trên các ô nhập để lưu trạng thái
    $("#orderRecipient")?.addEventListener("input", (e) => { orderInfo.recipientName = e.target.value; });
    $("#orderPhone")?.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      orderInfo.phone = e.target.value;
    });
    $("#orderAddress")?.addEventListener("input", (e) => { orderInfo.address = e.target.value; });
  }

  async function applyVoucher() {
    const code = $("#code").value.trim();
    const fb = $("#voucherFb");
    fb.className = "feedback";
    fb.textContent = "";
    try {
      voucher = await api("/vouchers/validate", { method: "POST", body: { code } });
      render();
    } catch (e) {
      fb.textContent = e.message;
    }
  }

  root.addEventListener("click", async (e) => {
    const id = e.target.id;
    if (id === "applyVoucher") applyVoucher();
    else if (id === "rmVoucher") { voucher = null; render(); }
    else if (id === "placeOrder") placeOrder(e.target);
  });

  root.addEventListener("change", (e) => {
    if (e.target.name === "method") method = e.target.value;
  });

  async function placeOrder(btn) {
    const fb = $("#orderFb");
    const infoFb = $("#orderInfoFb");
    if (fb) fb.textContent = "";
    if (infoFb) infoFb.textContent = "";

    const recipientName = ($("#orderRecipient")?.value || orderInfo.recipientName || "").trim();
    const phone = ($("#orderPhone")?.value || orderInfo.phone || "").trim();
    const address = ($("#orderAddress")?.value || orderInfo.address || "").trim();

    // Kiểm tra tính hợp lệ
    if (!recipientName) {
      const msg = "Vui lòng nhập họ và tên người nhận hàng.";
      if (infoFb) infoFb.textContent = msg;
      if (fb) fb.textContent = msg;
      $("#orderRecipient")?.focus();
      return;
    }
    if (!phone) {
      const msg = "Vui lòng nhập số điện thoại người nhận.";
      if (infoFb) infoFb.textContent = msg;
      if (fb) fb.textContent = msg;
      $("#orderPhone")?.focus();
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      const msg = "Số điện thoại phải bao gồm đúng 10 chữ số.";
      if (infoFb) infoFb.textContent = msg;
      if (fb) fb.textContent = msg;
      $("#orderPhone")?.focus();
      return;
    }
    if (!address) {
      const msg = "Vui lòng nhập địa chỉ nhận hàng.";
      if (infoFb) infoFb.textContent = msg;
      if (fb) fb.textContent = msg;
      $("#orderAddress")?.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = "Đang xử lý đơn hàng…";

    try {
      const r = await api("/orders", {
        method: "POST",
        body: {
          recipientName,
          phone,
          address,
          method,
          code: voucher?.code,
        },
      });

      Jewels.broadcast("ORDER_CREATED", {
        orderId: r.orderId,
        total: r.total,
        customer: recipientName,
        phone,
      });

      await refreshCartCount();
      root.innerHTML = `
        <div class="success" style="padding:60px 20px;text-align:center">
          <div class="tick" style="font-size:3rem;color:var(--gold-rich);margin-bottom:12px">✓</div>
          <h2>Đặt hàng thành công!</h2>
          <p style="font-size:1.1rem;color:var(--ink-soft);max-width:560px;margin:12px auto 28px">
            Mã đơn hàng: <strong style="color:var(--ink-deep)">#${r.orderId}</strong><br>
            Người nhận: <strong>${esc(recipientName)}</strong> (${esc(phone)})<br>
            Giao đến: <strong>${esc(address)}</strong><br>
            Tổng thanh toán: <strong style="color:var(--gold);font-size:1.25rem">${money(r.total)}</strong>
          </p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
            <a class="btn gold" href="orders.html">Xem danh sách đơn hàng →</a>
            <a class="btn outline" href="shop.html">Tiếp tục mua sắm</a>
          </div>
        </div>`;
      scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (fb) fb.textContent = err.message;
      if (infoFb) infoFb.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Xác nhận đặt hàng →";
    }
  }

  onLogin(load);
  await ready;
  load();
})();
