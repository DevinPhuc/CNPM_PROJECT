(async () => {
  const { api, $, $$, money, esc, toast, variantLabel, refreshCartCount, openAuth, onLogin, ready } = Jewels;
  const root = $("#checkoutRoot");
  if (!root) return;

  const METHODS = [
    ["cod", "Thanh toán khi nhận hàng (COD)", "Trả tiền mặt cho nhân viên giao hàng khi nhận kiện hàng."],
    ["bank_transfer", "Chuyển khoản ngân hàng (VietQR)", "Quét mã VietQR hoặc chuyển khoản nhanh 24/7 tức thì."],
    ["e_wallet", "Ví điện tử (MoMo / VNPay / ZaloPay)", "Quét mã QR thanh toán qua ứng dụng ví điện tử."],
    ["credit_card", "Thẻ quốc tế Visa / MasterCard / JCB", "Thanh toán trực tuyến bảo mật chuẩn PCI-DSS."],
  ];

  let cart, addresses = [], method = "cod", voucher = null;

  let orderInfo = {
    recipientName: "",
    phone: "",
    address: "",
    cardNumber: "",
    cardHolder: "",
    cardExpiry: "",
    cardCvv: "",
  };

  // Hàm chuyển số tiền thành chữ tiếng Việt chuẩn hóa đơn tài chính
  function docSoThanhChu(so) {
    if (!so || so <= 0) return "Không đồng";
    const chuSo = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const donVi = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

    function docBaChuSo(n, dayDu) {
      let tram = Math.floor(n / 100);
      let chuc = Math.floor((n % 100) / 10);
      let donvi = n % 10;
      let res = "";
      if (tram > 0 || dayDu) res += chuSo[tram] + " trăm ";
      if (chuc === 0 && donvi > 0) {
        if (tram > 0 || dayDu) res += "lẻ ";
        res += chuSo[donvi];
      } else if (chuc === 1) {
        res += "mười ";
        if (donvi === 1) res += "một";
        else if (donvi === 5) res += "lăm";
        else if (donvi > 0) res += chuSo[donvi];
      } else if (chuc > 1) {
        res += chuSo[chuc] + " mươi ";
        if (donvi === 1) res += "mốt";
        else if (donvi === 5) res += "lăm";
        else if (donvi > 0) res += chuSo[donvi];
      }
      return res.trim();
    }

    let n = Math.round(Number(so));
    let chuoi = "";
    let viTri = 0;
    while (n > 0) {
      let baSo = n % 1000;
      if (baSo > 0) {
        let s = docBaChuSo(baSo, n >= 1000);
        chuoi = s + " " + donVi[viTri] + " " + chuoi;
      }
      n = Math.floor(n / 1000);
      viTri++;
    }
    chuoi = chuoi.trim();
    if (!chuoi) return "Không đồng";
    return chuoi.charAt(0).toUpperCase() + chuoi.slice(1) + " đồng chẵn.";
  }

  async function load() {
    if (!Jewels.state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập để thanh toán</h3><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      $("#goLogin").addEventListener("click", () => openAuth());
      return;
    }

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
    const taxable = Math.max(0, cart.subtotal - discount);
    const vat = Math.round(taxable * 0.08);
    const total = taxable + vat + cart.shipping;
    return { discount, taxable, vat, total };
  }

  function getMockQrSvg(type = "bank") {
    const isWallet = type === "wallet";
    const headerTitle = isWallet ? "VÍ ĐIỆN TỬ" : "VietQR";
    const subTitle = isWallet ? "MoMo / VNPay" : "napas 247";
    const primaryColor = isWallet ? "#a21caf" : "#005baa";
    const accentColor = isWallet ? "#d946ef" : "#ea1c24";
    const bannerBg = isWallet ? "#fdf4ff" : "#f8fafc";

    return `
      <div class="mock-qr-container" style="display:flex;justify-content:center">
        <svg viewBox="0 0 240 300" width="210" height="262" xmlns="http://www.w3.org/2000/svg" style="border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.08); background:#ffffff; border:1.5px solid #e2e8f0; display:block;">
          <!-- Top Gateway Banner -->
          <rect x="0" y="0" width="240" height="46" fill="${bannerBg}" rx="12"/>
          <rect x="0" y="34" width="240" height="12" fill="${bannerBg}"/>
          <line x1="0" y1="46" x2="240" y2="46" stroke="#e2e8f0" stroke-width="1.5"/>

          <text x="32" y="29" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="${primaryColor}" letter-spacing="-0.5">${headerTitle}</text>
          <rect x="136" y="13" width="86" height="22" rx="4" fill="${isWallet ? '#a50064' : '#005baa'}"/>
          <text x="179" y="28" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${subTitle}</text>

          <!-- Finder Pattern Top-Left -->
          <rect x="20" y="58" width="46" height="46" rx="5" fill="#0f2b48"/>
          <rect x="26" y="64" width="34" height="34" rx="3" fill="#ffffff"/>
          <rect x="32" y="70" width="22" height="22" rx="2" fill="${primaryColor}"/>

          <!-- Finder Pattern Top-Right -->
          <rect x="174" y="58" width="46" height="46" rx="5" fill="#0f2b48"/>
          <rect x="180" y="64" width="34" height="34" rx="3" fill="#ffffff"/>
          <rect x="186" y="70" width="22" height="22" rx="2" fill="${primaryColor}"/>

          <!-- Finder Pattern Bottom-Left -->
          <rect x="20" y="196" width="46" height="46" rx="5" fill="#0f2b48"/>
          <rect x="26" y="202" width="34" height="34" rx="3" fill="#ffffff"/>
          <rect x="32" y="208" width="22" height="22" rx="2" fill="${primaryColor}"/>

          <!-- Data Grid Pattern -->
          <g fill="#1e293b">
            <rect x="74" y="58" width="8" height="8" rx="1.5"/>
            <rect x="90" y="58" width="8" height="8" rx="1.5"/>
            <rect x="114" y="58" width="8" height="8" rx="1.5"/>
            <rect x="138" y="58" width="8" height="8" rx="1.5"/>
            <rect x="154" y="58" width="8" height="8" rx="1.5"/>

            <rect x="74" y="74" width="8" height="8" rx="1.5"/>
            <rect x="98" y="74" width="8" height="8" rx="1.5"/>
            <rect x="114" y="74" width="8" height="8" rx="1.5"/>
            <rect x="130" y="74" width="8" height="8" rx="1.5"/>

            <rect x="74" y="90" width="8" height="8" rx="1.5"/>
            <rect x="90" y="90" width="8" height="8" rx="1.5"/>
            <rect x="146" y="90" width="8" height="8" rx="1.5"/>

            <rect x="74" y="106" width="8" height="8" rx="1.5"/>
            <rect x="90" y="106" width="8" height="8" rx="1.5"/>
            <rect x="106" y="106" width="8" height="8" rx="1.5"/>
            <rect x="122" y="106" width="8" height="8" rx="1.5"/>
            <rect x="138" y="106" width="8" height="8" rx="1.5"/>
            <rect x="154" y="106" width="8" height="8" rx="1.5"/>

            <rect x="39" y="112" width="8" height="8" rx="1.5"/>
            <rect x="39" y="128" width="8" height="8" rx="1.5"/>
            <rect x="39" y="144" width="8" height="8" rx="1.5"/>
            <rect x="39" y="160" width="8" height="8" rx="1.5"/>
            <rect x="39" y="176" width="8" height="8" rx="1.5"/>

            <rect x="20" y="114" width="8" height="8" rx="1.5"/>
            <rect x="56" y="114" width="8" height="8" rx="1.5"/>
            <rect x="174" y="114" width="8" height="8" rx="1.5"/>
            <rect x="198" y="114" width="8" height="8" rx="1.5"/>
            <rect x="212" y="114" width="8" height="8" rx="1.5"/>

            <rect x="20" y="130" width="8" height="8" rx="1.5"/>
            <rect x="56" y="130" width="8" height="8" rx="1.5"/>
            <rect x="182" y="130" width="8" height="8" rx="1.5"/>
            <rect x="206" y="130" width="8" height="8" rx="1.5"/>

            <rect x="20" y="146" width="8" height="8" rx="1.5"/>
            <rect x="56" y="146" width="8" height="8" rx="1.5"/>
            <rect x="174" y="146" width="8" height="8" rx="1.5"/>
            <rect x="198" y="146" width="8" height="8" rx="1.5"/>

            <rect x="20" y="162" width="8" height="8" rx="1.5"/>
            <rect x="56" y="162" width="8" height="8" rx="1.5"/>
            <rect x="190" y="162" width="8" height="8" rx="1.5"/>
            <rect x="212" y="162" width="8" height="8" rx="1.5"/>

            <rect x="20" y="178" width="8" height="8" rx="1.5"/>
            <rect x="56" y="178" width="8" height="8" rx="1.5"/>
            <rect x="174" y="178" width="8" height="8" rx="1.5"/>
            <rect x="206" y="178" width="8" height="8" rx="1.5"/>

            <!-- Bottom Data -->
            <rect x="74" y="168" width="8" height="8" rx="1.5"/>
            <rect x="90" y="168" width="8" height="8" rx="1.5"/>
            <rect x="138" y="168" width="8" height="8" rx="1.5"/>
            <rect x="154" y="168" width="8" height="8" rx="1.5"/>

            <rect x="82" y="184" width="8" height="8" rx="1.5"/>
            <rect x="98" y="184" width="8" height="8" rx="1.5"/>
            <rect x="130" y="184" width="8" height="8" rx="1.5"/>
            <rect x="146" y="184" width="8" height="8" rx="1.5"/>

            <!-- Alignment Pattern Bottom-Right -->
            <rect x="174" y="196" width="34" height="34" rx="4" fill="#0f2b48"/>
            <rect x="180" y="202" width="22" height="22" rx="2" fill="#ffffff"/>
            <rect x="186" y="208" width="10" height="10" rx="1" fill="${primaryColor}"/>

            <rect x="74" y="200" width="8" height="8" rx="1.5"/>
            <rect x="90" y="200" width="8" height="8" rx="1.5"/>
            <rect x="114" y="200" width="8" height="8" rx="1.5"/>
            <rect x="138" y="200" width="8" height="8" rx="1.5"/>
            <rect x="214" y="200" width="8" height="8" rx="1.5"/>

            <rect x="74" y="216" width="8" height="8" rx="1.5"/>
            <rect x="106" y="216" width="8" height="8" rx="1.5"/>
            <rect x="122" y="216" width="8" height="8" rx="1.5"/>
            <rect x="146" y="216" width="8" height="8" rx="1.5"/>
            <rect x="214" y="216" width="8" height="8" rx="1.5"/>

            <rect x="74" y="232" width="8" height="8" rx="1.5"/>
            <rect x="98" y="232" width="8" height="8" rx="1.5"/>
            <rect x="114" y="232" width="8" height="8" rx="1.5"/>
            <rect x="138" y="232" width="8" height="8" rx="1.5"/>
          </g>

          <!-- Center Jewels Emblem -->
          <circle cx="120" cy="148" r="21" fill="#ffffff" stroke="#cfa866" stroke-width="2.5"/>
          <circle cx="120" cy="148" r="17" fill="#0f2b48"/>
          <text x="120" y="154" font-family="'Playfair Display', Georgia, serif" font-size="16" font-weight="700" fill="#f5d485" text-anchor="middle">J</text>

          <!-- Watermark DEMO Overlay -->
          <rect x="42" y="254" width="156" height="20" rx="10" fill="rgba(15, 23, 42, 0.88)"/>
          <text x="120" y="268" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#fef08a" text-anchor="middle" letter-spacing="1">MÃ TƯỢNG TRƯNG</text>

          <!-- Footer Bar -->
          <rect x="0" y="278" width="240" height="22" fill="#f1f5f9" rx="0 0 12 12"/>
          <line x1="0" y1="278" x2="240" y2="278" stroke="#e2e8f0" stroke-width="1"/>
          <text x="120" y="293" font-family="'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="600" fill="#64748b" text-anchor="middle">KHÔNG QUÉT CHUYỂN TIỀN THẬT</text>
        </svg>
      </div>
    `;
  }

  function render() {
    const { discount, vat, total } = totals();
    root.innerHTML = `
      <div class="layout-2">
        <div>
          <!-- PHẦN 1: THÔNG TIN ĐẶT HÀNG -->
          <section class="panel">
            <h3>1. Thông tin giao hàng</h3>

            <div class="form-grid" id="orderInfoForm">
              <label class="field">
                Họ và tên người nhận
                <input id="orderRecipient" name="recipient_name" required placeholder="Nhập họ và tên người nhận" value="${esc(orderInfo.recipientName)}">
                <small class="muted" style="font-size:0.78rem">Mặc định từ tài khoản, có thể thay đổi nếu gửi tặng</small>
              </label>

              <label class="field">
                Số điện thoại liên hệ
                <input id="orderPhone" name="phone" type="tel" maxlength="10" inputmode="numeric" required placeholder="0901234567" value="${esc(orderInfo.phone)}">
                <small class="muted" style="font-size:0.78rem">Số điện thoại để shipper liên hệ giao hàng</small>
              </label>

              <label class="field wide">
                Địa chỉ nhận hàng chi tiết
                <input id="orderAddress" name="address" required placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..." value="${esc(orderInfo.address)}">
                <small class="muted" style="font-size:0.78rem">Vui lòng cung cấp địa chỉ nhận hàng chính xác</small>
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
                <span style="flex:1">
                  <strong>${t}</strong>
                  <small>${d}</small>
                </span>
              </label>`).join("")}
          </section>

          <!-- PHẦN 3: SẢN PHẨM TRONG ĐƠN -->
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
          <div class="sum-row"><span>Tạm tính tiền hàng</span><strong>${money(cart.subtotal)}</strong></div>
          ${discount > 0 ? `<div class="sum-row" style="color:var(--ok)"><span>Giảm giá</span><strong>-${money(discount)}</strong></div>` : ""}
          
          <div class="sum-row"><span>Phí vận chuyển</span><strong>${cart.shipping ? money(cart.shipping) : "Miễn phí"}</strong></div>
          <div class="sum-row total"><span>Tổng cộng thanh toán</span><strong>${money(total)}</strong></div>
          <div style="text-align:right;font-size:11.5px;color:#94a3b8;font-style:italic;margin-top:-6px;margin-bottom:8px;">
            (Đã bao gồm thuế VAT)
          </div>

          <button class="btn gold block" id="placeOrder" style="margin-top:18px;font-size:1.05rem;padding:14px">
            ${method === "cod" ? "Xác nhận đặt hàng →" : "Thanh toán →"}
          </button>
          <p class="feedback" id="orderFb"></p>
          <a class="link-btn" href="cart.html" style="text-align:center;display:block;margin-top:8px">← Quay lại giỏ hàng</a>
        </aside>
      </div>`;

    // Listeners for inputs
    $("#orderRecipient")?.addEventListener("input", (e) => { orderInfo.recipientName = e.target.value; });
    $("#orderPhone")?.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      orderInfo.phone = e.target.value;
    });
    $("#orderAddress")?.addEventListener("input", (e) => { orderInfo.address = e.target.value; });
  }

  async function applyVoucher() {
    const code = $("#code")?.value.trim();
    const fb = $("#voucherFb");
    if (!fb) return;
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
    else if (id === "placeOrder") handleOrderSubmit(e.target);
  });

  root.addEventListener("change", (e) => {
    if (e.target.name === "method") {
      method = e.target.value;
      render();
    }
  });

  // Xử lý khi nhấn nút đặt hàng / thanh toán
  async function handleOrderSubmit(btn) {
    const fb = $("#orderFb");
    const infoFb = $("#orderInfoFb");
    if (fb) fb.textContent = "";
    if (infoFb) infoFb.textContent = "";

    const recipientName = ($("#orderRecipient")?.value || orderInfo.recipientName || "").trim();
    const phone = ($("#orderPhone")?.value || orderInfo.phone || "").trim();
    const address = ($("#orderAddress")?.value || orderInfo.address || "").trim();

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

    orderInfo.recipientName = recipientName;
    orderInfo.phone = phone;
    orderInfo.address = address;

    if (method === "cod") {
      // 1. Luồng COD: Chỉ cần ấn "Xác nhận đặt hàng" -> Tạo đơn đặt hàng (chưa có hóa đơn)
      btn.disabled = true;
      btn.textContent = "Đang tiếp nhận đơn hàng…";
      try {
        await executeCreateOrder(false);
      } catch (err) {
        if (fb) fb.textContent = err.message;
        if (infoFb) infoFb.textContent = err.message;
        btn.disabled = false;
        btn.textContent = "Xác nhận đặt hàng →";
      }
    } else {
      // 2. Luồng thanh toán online: Bấm "Thanh toán" -> Mở cổng thanh toán cho từng phương thức
      openPaymentModal();
    }
  }

  // Mở giao diện từng cách thanh toán tương ứng (Cổng thanh toán thực tế)
  let gwTimerInterval = null;

  function openPaymentModal() {
    let dlg = $("#paymentModal");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "paymentModal";
      document.body.appendChild(dlg);
    }
    dlg.className = "dlg-gateway";

    const { total } = totals();
    const phoneMemo = orderInfo.phone || "0901234567";

    let headerHtml = "";
    let bodyHtml = "";

    if (method === "bank_transfer") {
      headerHtml = `
        <div class="gw-header">
          <div class="gw-header-brand">
            <div class="gw-badge-group">
              <span class="gw-pill gw-pill-vietqr">VietQR</span>
              <span class="gw-pill gw-pill-napas">NAPAS 247</span>
            </div>
            <div class="gw-brand-text">
              <h4>CỔNG THANH TOÁN CHUYỂN KHOẢN VIETQR</h4>
              <p>Đơn vị thụ hưởng: CÔNG TY TNHH TRANG SỨC JEWELS (Đã xác minh ✓)</p>
            </div>
          </div>
          <div style="display:flex;align-items:center">
            <div class="gw-pill-timer">
              <span class="gw-dot-pulse"></span>
              Hết hạn: <span id="gwTimer">15:00</span>
            </div>
            <button class="gw-close" type="button" aria-label="Đóng" id="closePaymentModal">&times;</button>
          </div>
        </div>
      `;

      bodyHtml = `
        <div class="gw-layout">
          <!-- Cột trái: Thẻ mã QR Chuẩn VietQR -->
          <div class="gw-qr-card">
            ${getMockQrSvg("bank")}
            <p class="gw-qr-instruction">
              Mở <strong>App Ngân hàng bất kỳ</strong> hoặc Ví điện tử để quét mã thanh toán tức thì 24/7.
            </p>
            <div class="gw-bank-logos">
              <span class="gw-bank-tag">Vietcombank</span>
              <span class="gw-bank-tag">MB Bank</span>
              <span class="gw-bank-tag">Techcombank</span>
              <span class="gw-bank-tag">BIDV</span>
              <span class="gw-bank-tag">ACB</span>
              <span class="gw-bank-tag">TPBank</span>
              <span class="gw-bank-tag">VPBank</span>
              <span class="gw-bank-tag">+50 NH</span>
            </div>
          </div>

          <!-- Cột phải: Thông tin giao dịch & nút sao chép -->
          <div class="gw-info-card">
            <div class="gw-amount-hero">
              <div>
                <div class="label">Số tiền thanh toán</div>
                <div class="amount">${money(total)}</div>
              </div>
              <button class="gw-btn-copy" type="button" data-copy="${total}">
                📋 Sao chép
              </button>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Ngân hàng thụ hưởng</span>
              <div class="gw-field-val">
                <strong>MBBANK (Ngân hàng Quân Đội)</strong>
              </div>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Chủ tài khoản</span>
              <div class="gw-field-val">
                <strong>CÔNG TY TNHH TRANG SỨC JEWELS</strong>
              </div>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Số tài khoản</span>
              <div class="gw-field-val">
                <strong style="color:#005baa;font-size:1.02rem;letter-spacing:0.5px">0901 234 567</strong>
                <button class="gw-btn-copy" type="button" data-copy="0901234567">
                  📋 Sao chép
                </button>
              </div>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Nội dung chuyển khoản</span>
              <div class="gw-field-val">
                <strong style="color:#b45309;font-size:1rem;letter-spacing:0.5px">JEWELS ${esc(phoneMemo)}</strong>
                <button class="gw-btn-copy" type="button" data-copy="JEWELS ${esc(phoneMemo)}">
                  📋 Sao chép
                </button>
              </div>
            </div>

            <div class="gw-alert-box">
              <span>💡</span>
              <div>
                <strong>Lưu ý quan trọng:</strong> Vui lòng giữ đúng <strong>Số tiền</strong> và <strong>Nội dung chuyển khoản</strong> để hệ thống tự động xác nhận đơn và tự động xuất hóa đơn điện tử ngay.
              </div>
            </div>

            <div class="gw-actions">
              <button class="gw-btn-submit" id="btnConfirmOnlinePaid" type="button">
                ✓ Tôi đã chuyển khoản thành công →
              </button>
              <button class="gw-btn-cancel" id="btnCancelGateway" type="button">
                Hủy giao dịch & chọn phương thức khác
              </button>
            </div>

            <div class="gw-security-foot">
              <span>🔒 Chuẩn bảo mật PCI-DSS</span>
              <span>⚡ Mạng lưới NAPAS 24/7</span>
              <span>📞 CSKH: 1900 6868</span>
            </div>
          </div>
        </div>
      `;
    } else if (method === "e_wallet") {
      headerHtml = `
        <div class="gw-header gw-header-wallet">
          <div class="gw-header-brand">
            <div class="gw-badge-group">
              <span class="gw-pill" style="background:#fff;color:#a50064">MoMo</span>
              <span class="gw-pill" style="background:#005baa;color:#fff">VNPay</span>
            </div>
            <div class="gw-brand-text">
              <h4>CỔNG THANH TOÁN VÍ ĐIỆN TỬ</h4>
              <p>Đối tác thanh toán trực tuyến ủy quyền: JEWELS VIETNAM</p>
            </div>
          </div>
          <div style="display:flex;align-items:center">
            <div class="gw-pill-timer">
              <span class="gw-dot-pulse"></span>
              Hết hạn: <span id="gwTimer">15:00</span>
            </div>
            <button class="gw-close" type="button" aria-label="Đóng" id="closePaymentModal">&times;</button>
          </div>
        </div>
      `;

      bodyHtml = `
        <div class="gw-layout">
          <div class="gw-qr-card">
            ${getMockQrSvg("wallet")}
            <p class="gw-qr-instruction">
              Mở <strong>App Ví MoMo, VNPay hoặc ZaloPay</strong> để quét mã liên kết thanh toán.
            </p>
            <div class="gw-bank-logos">
              <span class="gw-bank-tag" style="background:#fce7f3;color:#a21caf">Ví MoMo</span>
              <span class="gw-bank-tag" style="background:#e0f2fe;color:#0369a1">VNPay-QR</span>
              <span class="gw-bank-tag" style="background:#ecfdf5;color:#047857">ZaloPay</span>
              <span class="gw-bank-tag" style="background:#fff7ed;color:#c2410c">ShopeePay</span>
            </div>
          </div>

          <div class="gw-info-card">
            <div class="gw-amount-hero">
              <div>
                <div class="label">Số tiền thanh toán ví</div>
                <div class="amount" style="color:#a50064">${money(total)}</div>
              </div>
              <button class="gw-btn-copy" type="button" data-copy="${total}">
                📋 Sao chép
              </button>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Đơn vị thụ hưởng ví</span>
              <div class="gw-field-val">
                <strong>JEWELS VIETNAM (Thương gia xác thực)</strong>
              </div>
            </div>

            <div class="gw-field-row">
              <span class="gw-field-label">Mã giao dịch ví</span>
              <div class="gw-field-val">
                <strong style="color:#a50064">JEWELS ${esc(phoneMemo)}</strong>
                <button class="gw-btn-copy" type="button" data-copy="JEWELS ${esc(phoneMemo)}">
                  📋 Sao chép
                </button>
              </div>
            </div>

            <div class="gw-alert-box">
              <span>💡</span>
              <div>
                Quý khách quét mã trên ứng dụng ví và kiểm tra số tiền khớp <strong>${money(total)}</strong>. Sau đó bấm nút bên dưới để nhận hóa đơn điện tử tự động.
              </div>
            </div>

            <div class="gw-actions">
              <button class="gw-btn-submit" id="btnConfirmOnlinePaid" type="button" style="background:linear-gradient(135deg, #a50064 0%, #c026d3 100%)">
                ✓ Tôi đã hoàn tất thanh toán trên Ví →
              </button>
              <button class="gw-btn-cancel" id="btnCancelGateway" type="button">
                Hủy giao dịch & chọn phương thức khác
              </button>
            </div>

            <div class="gw-security-foot">
              <span>🔒 Chuẩn bảo mật quốc tế PCI-DSS</span>
              <span>⚡ Xác thực OTP hai lớp</span>
            </div>
          </div>
        </div>
      `;
    } else if (method === "credit_card") {
      headerHtml = `
        <div class="gw-header gw-header-card">
          <div class="gw-header-brand">
            <div class="gw-badge-group">
              <span class="gw-pill" style="background:#1a1f71;color:#fff">VISA</span>
              <span class="gw-pill" style="background:#eb001b;color:#fff">Mastercard</span>
              <span class="gw-pill" style="background:#007940;color:#fff">JCB</span>
            </div>
            <div class="gw-brand-text">
              <h4>CỔNG THANH TOÁN THẺ QUỐC TẾ</h4>
              <p>Bảo mật giao dịch trực tuyến SSL 256-bit & 3D Secure 2.0</p>
            </div>
          </div>
          <div style="display:flex;align-items:center">
            <div class="gw-pill-timer">
              <span class="gw-dot-pulse"></span>
              Hết hạn: <span id="gwTimer">15:00</span>
            </div>
            <button class="gw-close" type="button" aria-label="Đóng" id="closePaymentModal">&times;</button>
          </div>
        </div>
      `;

      bodyHtml = `
        <div class="gw-layout">
          <!-- Cột trái: Mô phỏng thẻ thanh toán thực tế -->
          <div>
            <div class="gw-virtual-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <span style="font-size:0.75rem;letter-spacing:1px;font-weight:700;color:#cbd5e1">JEWELS PLATINUM</span>
                <span style="font-weight:800;font-size:0.95rem;color:#f5d485">CREDIT</span>
              </div>
              <div class="gw-card-chip"></div>
              <div class="gw-card-num" id="cardPreviewNum">4123 4567 8901 2345</div>
              <div class="gw-card-meta">
                <div>
                  <span>Chủ thẻ</span>
                  <strong id="cardPreviewName">${esc(orderInfo.cardHolder || orderInfo.recipientName || "NGUYEN VAN A")}</strong>
                </div>
                <div>
                  <span>Hết hạn</span>
                  <strong id="cardPreviewExp">${esc(orderInfo.cardExpiry || "12/28")}</strong>
                </div>
              </div>
            </div>

            <div class="gw-alert-box" style="margin-top:0">
              <span>🔒</span>
              <div>
                Thông tin thẻ được mã hóa trực tiếp theo tiêu chuẩn PCI-DSS Level 1. Chúng tôi không lưu trữ mã CVV của quý khách.
              </div>
            </div>
          </div>

          <!-- Cột phải: Form nhập thông tin thẻ -->
          <div class="gw-info-card">
            <div class="gw-amount-hero">
              <div>
                <div class="label">Tổng tiền thanh toán</div>
                <div class="amount">${money(total)}</div>
              </div>
              <span style="font-size:0.8rem;color:#64748b;font-weight:600">Miễn phí giao dịch</span>
            </div>

            <div class="cc-form-grid" style="margin-top:4px">
              <label class="field full-col">
                Số thẻ thanh toán (16 số)
                <input id="modalCcNumber" placeholder="4123 4567 8901 2345" maxlength="19" value="${esc(orderInfo.cardNumber || "4123 4567 8901 2345")}">
              </label>
              <label class="field full-col">
                Tên in trên thẻ (không dấu)
                <input id="modalCcHolder" placeholder="NGUYEN VAN A" style="text-transform:uppercase" value="${esc(orderInfo.cardHolder || orderInfo.recipientName || "NGUYEN VAN A")}">
              </label>
              <label class="field">
                Ngày hết hạn
                <input id="modalCcExpiry" placeholder="MM/YY" maxlength="5" value="${esc(orderInfo.cardExpiry || "12/28")}">
              </label>
              <label class="field">
                Mã bảo mật CVV
                <input id="modalCcCvv" type="password" placeholder="123" maxlength="4" value="${esc(orderInfo.cardCvv || "888")}">
              </label>
            </div>

            <div class="gw-actions">
              <button class="gw-btn-submit" id="btnConfirmOnlinePaid" type="button">
                ✓ Xác nhận thanh toán thẻ (${money(total)}) →
              </button>
              <button class="gw-btn-cancel" id="btnCancelGateway" type="button">
                Hủy giao dịch & chọn phương thức khác
              </button>
            </div>

            <div class="gw-security-foot">
              <span>🔒 PCI-DSS Certified</span>
              <span>🛡️ 3D-Secure 2.0 Verified</span>
            </div>
          </div>
        </div>
      `;
    }

    dlg.innerHTML = `
      ${headerHtml}
      <div class="gw-body">
        ${bodyHtml}
        <p class="feedback" id="paymentModalFb" style="margin-top:14px;text-align:center;font-weight:600"></p>
      </div>
    `;

    // Bộ đếm ngược 15 phút sống động như cổng thanh toán thật
    let secondsLeft = 15 * 60;
    if (gwTimerInterval) clearInterval(gwTimerInterval);
    gwTimerInterval = setInterval(() => {
      secondsLeft--;
      const timerEl = dlg.querySelector("#gwTimer");
      if (!timerEl) {
        clearInterval(gwTimerInterval);
        return;
      }
      if (secondsLeft <= 0) {
        clearInterval(gwTimerInterval);
        timerEl.textContent = "00:00 (Hết hạn)";
        return;
      }
      const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
      const s = String(secondsLeft % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }, 1000);

    const closeModal = () => {
      if (gwTimerInterval) clearInterval(gwTimerInterval);
      dlg.close();
    };

    $("#closePaymentModal", dlg)?.addEventListener("click", closeModal);
    $("#btnCancelGateway", dlg)?.addEventListener("click", closeModal);

    // Tính năng sao chép 1 chạm thông minh
    dlg.querySelectorAll(".gw-btn-copy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.copy || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text);
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        const originalHtml = btn.innerHTML;
        btn.classList.add("copied");
        btn.innerHTML = "✓ Đã chép";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = originalHtml;
        }, 1800);
      });
    });

    // Listeners thẻ tín dụng tương tác theo thời gian thực
    $("#modalCcNumber", dlg)?.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "").slice(0, 16);
      e.target.value = val.replace(/(\d{4})(?=\d)/g, "$1 ");
      orderInfo.cardNumber = e.target.value;
      const preview = $("#cardPreviewNum", dlg);
      if (preview) preview.textContent = e.target.value || "•••• •••• •••• ••••";
    });
    $("#modalCcHolder", dlg)?.addEventListener("input", (e) => {
      orderInfo.cardHolder = e.target.value.toUpperCase();
      const preview = $("#cardPreviewName", dlg);
      if (preview) preview.textContent = orderInfo.cardHolder || "NGUYEN VAN A";
    });
    $("#modalCcExpiry", dlg)?.addEventListener("input", (e) => {
      let val = e.target.value.replace(/\D/g, "").slice(0, 4);
      if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2);
      e.target.value = val;
      orderInfo.cardExpiry = val;
      const preview = $("#cardPreviewExp", dlg);
      if (preview) preview.textContent = val || "12/28";
    });
    $("#modalCcCvv", dlg)?.addEventListener("input", (e) => {
      orderInfo.cardCvv = e.target.value.replace(/\D/g, "").slice(0, 4);
    });

    // Bấm nút Xác nhận thanh toán thành công trong modal
    $("#btnConfirmOnlinePaid", dlg)?.addEventListener("click", async () => {
      const btn = $("#btnConfirmOnlinePaid", dlg);
      const fb = $("#paymentModalFb", dlg);
      if (fb) fb.textContent = "";

      if (method === "credit_card") {
        const cc = ($("#modalCcNumber", dlg)?.value || "").replace(/\s/g, "");
        if (cc.length < 15) {
          if (fb) fb.textContent = "Vui lòng nhập đầy đủ 16 số thẻ thanh toán.";
          $("#modalCcNumber", dlg)?.focus();
          return;
        }
      }

      btn.disabled = true;
      btn.textContent = "Đang kiểm tra giao dịch & tự động xuất hóa đơn…";

      try {
        await executeCreateOrder(true);
        if (gwTimerInterval) clearInterval(gwTimerInterval);
        dlg.close();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "✓ Thử lại thanh toán";
        if (fb) fb.textContent = (err.message || "Giao dịch chưa hoàn tất.");
      }
    });

    dlg.showModal();
  }

  // Gọi API tạo đơn hàng & điều hướng giao diện tương ứng
  async function executeCreateOrder(isPaid) {
    const recipientName = orderInfo.recipientName;
    const phone = orderInfo.phone;
    const address = orderInfo.address;

    const r = await api("/orders", {
      method: "POST",
      body: {
        recipientName,
        phone,
        address,
        method,
        paid: isPaid,
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

    // Tải chi tiết đơn vừa lập
    let orderDetail = null;
    try {
      orderDetail = await api("/orders/" + r.orderId);
    } catch { }

    if (method === "cod") {
      // Luồng COD: Hiển thị màn hình đặt hàng COD thành công (chưa có hóa đơn)
      renderCodSuccessScreen(r, orderDetail, { recipientName, phone, address, method, total: r.total });
    } else {
      // Luồng thanh toán online thành công: Tự động tạo hóa đơn và hiển thị giao diện hóa đơn hoàn tất
      renderInvoiceScreen(r, orderDetail, { recipientName, phone, address, method, total: r.total, invoiceCode: r.invoiceCode });
    }
  }

  // Màn hình xác nhận đơn hàng COD thành công (chưa tạo hóa đơn, đợi giao thành công)
  function renderCodSuccessScreen(orderResult, detail, fallback) {
    const orderId = orderResult.orderId;
    const items = detail?.order_items || cart?.items || [];
    const recipient = detail?.cus_name || fallback.recipientName;
    const phone = detail?.cus_phone || fallback.phone;
    const address = detail?.address || fallback.address;
    const shippingFee = detail?.shipping_fee != null ? Number(detail.shipping_fee) : (cart?.shipping || 0);
    const discountAmt = detail?.discount_amount != null ? Number(detail.discount_amount) : (voucher?.amount || 0);
    const subtotalAmt = items.reduce((sum, it) => sum + (Number(it.subtotal) || (Number(it.price || it.unit_price) * it.quantity)), 0);
    const taxableAmt = Math.max(0, subtotalAmt - discountAmt);
    const vatAmt = detail?.vat_amount != null ? Number(detail.vat_amount) : Math.round(taxableAmt * 0.08);
    const finalTotal = detail?.total_amount != null ? Number(detail.total_amount) : (taxableAmt + vatAmt + shippingFee);
    const dateFormatted = new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

    root.innerHTML = `
      <div class="invoice-wrapper" style="max-width:760px">
        <div style="margin-bottom:24px;text-align:center">
          <div class="tick" style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg, #2b7d48, #1a5c33);color:#fff;display:inline-grid;place-items:center;font-size:2rem;margin-bottom:12px;box-shadow:0 6px 18px rgba(32, 107, 62, 0.3)">✓</div>
          <h2 style="margin:0 0 6px">Đặt hàng thành công!</h2>
          <p class="muted" style="margin:0 0 16px">Cảm ơn quý khách đã tin tưởng và đặt hàng tại <strong>Jewels High Jewelry</strong>.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <a class="btn gold" href="orders.html">Xem danh sách đơn hàng →</a>
            <a class="btn outline" href="shop.html">Tiếp tục mua sắm</a>
          </div>
        </div>

        <article class="invoice-card" style="padding:28px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:16px">
            <div>
              <span class="tag" style="background:#fef3c7;color:#b45309;font-weight:700">Chờ xác nhận (COD)</span>
              <h3 style="margin:8px 0 2px;font-size:1.3rem">Mã đơn hàng: #DH-${String(orderId).padStart(6, "0")}</h3>
              <small class="muted">Thời gian đặt: ${dateFormatted}</small>
            </div>
            <div style="text-align:right">
              <span style="font-size:0.85rem;color:#777">Hình thức:</span>
              <strong style="display:block;color:var(--ink-deep)">Thanh toán khi nhận hàng (COD)</strong>
            </div>
          </div>

          <!-- THÔNG BÁO VỀ HÓA ĐƠN -->
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:20px">
            <div style="display:flex;align-items:center;gap:8px;color:#b45309;font-weight:700;font-size:0.95rem;margin-bottom:6px">
              <span>🧾</span> Quy trình xuất hóa đơn điện tử cho đơn hàng COD:
            </div>
            <p style="margin:0;font-size:0.88rem;color:#78350f;line-height:1.55">
              Đơn hàng của quý khách đã được ghi nhận vào hệ thống. 
              <strong>Hóa đơn bán hàng sẽ được tự động tạo ngay khi đơn hàng chuyển sang trạng thái "Đã giao thành công"</strong> (sau khi quý khách nhận hàng và thanh toán tiền mặt cho nhân viên giao hàng). Quý khách có thể xem và in hóa đơn tại mục <em>Đơn hàng</em> sau khi giao hoàn tất.
            </p>
          </div>

          <div style="margin-bottom:20px">
            <h4 style="font-size:0.95rem;text-transform:uppercase;letter-spacing:0.5px;color:#777;margin-bottom:8px">Thông tin nhận hàng</h4>
            <div style="font-size:0.92rem;display:grid;gap:4px">
              <div><strong>Người nhận:</strong> ${esc(recipient)}</div>
              <div><strong>Số điện thoại:</strong> ${esc(phone)}</div>
              <div><strong>Địa chỉ:</strong> ${esc(address)}</div>
            </div>
          </div>

          <h4 style="font-size:0.95rem;text-transform:uppercase;letter-spacing:0.5px;color:#777;margin-bottom:8px">Chi tiết sản phẩm</h4>
          <table class="inv-table" style="margin-bottom:16px">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style="width:70px;text-align:center">SL</th>
                <th style="width:130px;text-align:right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it) => `
                <tr>
                  <td>
                    <strong>${esc(it.product_name || it.name)}</strong>
                    ${variantLabel(it) ? `<div style="font-size:0.8rem;color:#777">${esc(variantLabel(it))}</div>` : ""}
                  </td>
                  <td style="text-align:center">${it.quantity}</td>
                  <td style="text-align:right"><strong>${money(Number(it.subtotal || (Number(it.price || it.unit_price) * it.quantity)))}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="inv-calc" style="margin-top:16px">
            <div class="inv-calc-box">
              <div class="inv-calc-row"><span>Cộng tiền hàng:</span> <strong>${money(subtotalAmt)}</strong></div>
              ${discountAmt > 0 ? `<div class="inv-calc-row" style="color:var(--ok)"><span>Chiết khấu Voucher:</span> <strong>-${money(discountAmt)}</strong></div>` : ""}
              
              <div class="inv-calc-row"><span>Phí vận chuyển:</span> <strong>${shippingFee > 0 ? money(shippingFee) : "Miễn phí"}</strong></div>
              <div class="inv-calc-row grand-total">
                <span>TỔNG TIỀN THANH TOÁN KHI NHẬN HÀNG:</span>
                <strong style="color:var(--gold-rich)">${money(finalTotal)}</strong>
              </div>
              <div style="text-align:right;font-size:11.5px;color:#94a3b8;font-style:italic;margin-top:3px;">
                (Đã bao gồm thuế VAT)
              </div>
            </div>
          </div>
        </article>
      </div>
    `;

    scrollTo({ top: 0, behavior: "smooth" });
  }

  // Hiển thị giao diện hóa đơn hoàn tất khi thanh toán trực tuyến thành công
  function renderInvoiceScreen(orderResult, detail, fallback) {
    const orderId = orderResult.orderId;
    const invoiceCode = orderResult.invoiceCode || fallback.invoiceCode || `HD-${String(orderId).padStart(5, "0")}`;
    const items = detail?.order_items || cart?.items || [];
    const recipient = detail?.cus_name || fallback.recipientName;
    const phone = detail?.cus_phone || fallback.phone;
    const address = detail?.address || fallback.address;
    const finalTotal = detail?.total_amount != null ? Number(detail.total_amount) : fallback.total;
    const shippingFee = detail?.shipping_fee != null ? Number(detail.shipping_fee) : (cart?.shipping || 0);
    const discountAmt = detail?.discount_amount != null ? Number(detail.discount_amount) : (voucher?.amount || 0);
    const subtotalAmt = items.reduce((s, it) => s + (Number(it.subtotal) || (Number(it.price || it.unit_price) * it.quantity)), 0);
    const taxableAmt = Math.max(0, subtotalAmt - discountAmt);
    const vatAmt = detail?.invoice?.vat_amount != null ? Number(detail.invoice.vat_amount) : Math.round(taxableAmt * 0.08);
    const dateFormatted = new Date().toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    const methodObj = METHODS.find((m) => m[0] === fallback.method);
    const methodTitle = methodObj ? methodObj[1] : "Thanh toán trực tuyến";
    const paymentStatus = "Đã thanh toán trực tuyến thành công";
    const wordsTotal = docSoThanhChu(finalTotal);

    root.innerHTML = `
      <div class="invoice-wrapper">
        <div class="no-print" style="margin-bottom:24px;text-align:center">
          <div class="tick" style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg, #2b7d48, #1a5c33);color:#fff;display:inline-grid;place-items:center;font-size:2rem;margin-bottom:12px;box-shadow:0 6px 18px rgba(32, 107, 62, 0.3)">✓</div>
          <h2 style="margin:0 0 6px">Thanh toán thành công & Hóa đơn điện tử đã được tạo!</h2>
          <p class="muted" style="margin:0 0 16px">Cảm ơn quý khách đã tin tưởng và mua sắm tại <strong>Jewels High Jewelry</strong>.</p>
          <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn gold" type="button" onclick="window.print()">🖨️ In hóa đơn / Tải PDF</button>
            <a class="btn" href="orders.html">Xem danh sách đơn hàng →</a>
            <a class="btn outline" href="shop.html">Tiếp tục mua sắm</a>
          </div>
        </div>

        <!-- BẢN THỂ HIỆN HÓA ĐƠN BÁN HÀNG ĐIỆN TỬ -->
        <article class="invoice-card" id="officialInvoice">
          <header class="inv-header">
            <div class="inv-brand">
              <h2>JEWELS</h2>
              <p><strong>CÔNG TY TNHH TRANG SỨC CAO CẤP JEWELS</strong></p>
              <p>Mã số thuế: <strong>0318999888</strong> · Hotline CSKH: <strong>1900 8899</strong></p>
              <p>Địa chỉ: 123 Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>
              <p>Website: jewels.vn · Email hỗ trợ: support@jewels.vn</p>
            </div>
            <div class="inv-meta">
              <div class="inv-title">HÓA ĐƠN BÁN HÀNG</div>
              <p style="font-size:0.8rem;text-transform:uppercase;color:var(--gold-rich);font-weight:700">Bản thể hiện hóa đơn điện tử</p>
              <p>Mẫu số: <strong>01GTKT0/001</strong> · Ký hiệu: <strong>JW/26E</strong></p>
              <p>Số hóa đơn: <strong>#${esc(invoiceCode)}</strong></p>
              <p>Mã đơn hàng: <strong>#DH-${String(orderId).padStart(6, "0")}</strong></p>
              <p>Ngày lập: <span>${dateFormatted}</span></p>
            </div>
          </header>

          <section class="inv-customer-box">
            <div>
              <p style="margin:0 0 4px"><strong>Khách hàng / Người nhận:</strong> ${esc(recipient)}</p>
              <p style="margin:0 0 4px"><strong>Số điện thoại:</strong> ${esc(phone)}</p>
              <p style="margin:0"><strong>Địa chỉ giao hàng:</strong> ${esc(address)}</p>
            </div>
            <div>
              <p style="margin:0 0 4px"><strong>Hình thức thanh toán:</strong> ${esc(methodTitle)}</p>
              <p style="margin:0 0 4px"><strong>Trạng thái thanh toán:</strong> <span style="color:${fallback.method === "cod" ? "#a6732e" : "#1a5c33"};font-weight:700">${esc(paymentStatus)}</span></p>
              <p style="margin:0"><strong>Tiền tệ:</strong> VNĐ (Việt Nam Đồng)</p>
            </div>
          </section>

          <table class="inv-table">
            <thead>
              <tr>
                <th style="width:40px;text-align:center">STT</th>
                <th>Tên sản phẩm & Đặc tả</th>
                <th style="width:80px;text-align:center">Số lượng</th>
                <th style="width:130px;text-align:right">Đơn giá</th>
                <th style="width:140px;text-align:right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => {
      const name = it.product_name || it.name;
      const vLabel = variantLabel(it);
      const unit = Number(it.unit_price || it.price || 0);
      const sub = Number(it.subtotal || unit * it.quantity);
      return `
                  <tr>
                    <td style="text-align:center">${idx + 1}</td>
                    <td>
                      <strong>${esc(name)}</strong>
                      ${vLabel ? `<div style="font-size:0.8rem;color:var(--ink-soft)">${esc(vLabel)}</div>` : ""}
                    </td>
                    <td style="text-align:center">${it.quantity}</td>
                    <td style="text-align:right">${money(unit)}</td>
                    <td style="text-align:right"><strong>${money(sub)}</strong></td>
                  </tr>`;
    }).join("")}
            </tbody>
          </table>

          <div class="inv-calc">
            <div class="inv-calc-box">
              <div class="inv-calc-row"><span>Cộng tiền hàng:</span> <strong>${money(subtotalAmt)}</strong></div>
              ${discountAmt > 0 ? `<div class="inv-calc-row" style="color:var(--ok)"><span>Chiết khấu Voucher:</span> <strong>-${money(discountAmt)}</strong></div>` : ""}
              <div class="inv-calc-row"><span>Phí vận chuyển:</span> <strong>${shippingFee > 0 ? money(shippingFee) : "Miễn phí"}</strong></div>
              
              <div class="inv-calc-row grand-total">
                <span>TỔNG CỘNG THANH TOÁN:</span>
                <strong>${money(finalTotal)}</strong>
              </div>
              <div style="text-align:right;font-size:11.5px;color:#94a3b8;font-style:italic;margin-top:3px;">
                (Đã bao gồm thuế VAT)
              </div>
            </div>
          </div>

          <div class="inv-words">
            <strong>Số tiền viết bằng chữ:</strong> ${esc(wordsTotal)}
          </div>

          <footer class="inv-foot">
            <div>
              <p style="margin:0;font-size:0.86rem;color:var(--ink-soft)">Khách hàng đã ký & xác nhận đơn</p>
              <strong style="font-size:0.95rem">${esc(recipient)}</strong>
            </div>
            <div class="inv-stamp">
              <span>✓ ĐÃ XÁC THỰC KÝ ĐIỆN TỬ</span>
              <span style="font-size:0.7rem;font-weight:500">CÔNG TY TNHH TRANG SỨC JEWELS</span>
              <span style="font-size:0.65rem;font-weight:400">NGÀY: ${new Date().toLocaleDateString("vi-VN")}</span>
            </div>
          </footer>
        </article>
      </div>`;

    scrollTo({ top: 0, behavior: "smooth" });
  }

  async function placeOrder(btn) {
    const fb = $("#orderFb");
    const infoFb = $("#orderInfoFb");
    if (fb) fb.textContent = "";
    if (infoFb) infoFb.textContent = "";

    const recipientName = ($("#orderRecipient")?.value || orderInfo.recipientName || "").trim();
    const phone = ($("#orderPhone")?.value || orderInfo.phone || "").trim();
    const address = ($("#orderAddress")?.value || orderInfo.address || "").trim();

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

    // Nếu chọn thẻ tín dụng thì kiểm tra định dạng cơ bản
    if (method === "credit_card") {
      const cc = ($("#ccNumber")?.value || orderInfo.cardNumber || "").replace(/\s/g, "");
      if (cc.length < 15) {
        const msg = "Vui lòng nhập đầy đủ 16 số thẻ thanh toán quốc tế.";
        if (fb) fb.textContent = msg;
        $("#ccNumber")?.focus();
        return;
      }
    }

    btn.disabled = true;
    btn.textContent = "Đang xử lý đơn & tạo hóa đơn…";

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

      // Tải chi tiết đơn vừa lập để render hóa đơn đầy đủ
      let orderDetail = null;
      try {
        orderDetail = await api("/orders/" + r.orderId);
      } catch { }

      renderInvoiceScreen(r, orderDetail, { recipientName, phone, address, method, total: r.total });
    } catch (err) {
      if (fb) fb.textContent = err.message;
      if (infoFb) infoFb.textContent = err.message;
      btn.disabled = false;
      btn.textContent = "Xác nhận đặt hàng & Lập hóa đơn →";
    }
  }

  onLogin(load);
  await ready;
  load();
})();