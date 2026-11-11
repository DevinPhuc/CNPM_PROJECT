// Lõi dùng chung: API, phiên đăng nhập, header/footer, hộp thoại đăng nhập, toast.
(() => {
  "use strict";
  const TOKEN_KEY = "jewels_token";
  const state = { user: null, cartCount: 0 };
  const listeners = [];

  const getAuthToken = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  const setAuthToken = (token) => {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };
  const clearAuth = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem("jewels_user_email");
    sessionStorage.removeItem("jewels_user_id");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("jewels_user_email");
    localStorage.removeItem("jewels_user_id");
  };

  const money = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const dateVN = (d) => new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  async function api(path, { method = "GET", body } = {}) {
    const headers = { "Content-Type": "application/json" };
    const token = getAuthToken();
    if (token) headers.Authorization = "Bearer " + token;
    let res;
    try {
      res = await fetch("/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new Error("Không kết nối được máy chủ. Hãy chạy server (npm start) và mở trang qua http://localhost:3000.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if ((res.status === 401 || (res.status === 403 && data.isLocked)) && token) {
        if (data.isLocked) {
          handleAccountLocked();
          return;
        }
        clearAuth();
        state.user = null;
        state.cartCount = 0;
        renderAccount();
      }
      const msg = data.message || data.error || "Có lỗi xảy ra, vui lòng thử lại.";
      const err = new Error(msg);
      err.status = res.status;
      err.isLocked = Boolean(data.isLocked || (msg && msg.toLowerCase().includes("khóa")));
      err.data = data;
      throw err;
    }
    return data;
  }

  function getLoggedInUserId() {
    if (state.user && state.user.id) return String(state.user.id);
    const saved = sessionStorage.getItem("jewels_user_id");
    if (saved) return String(saved);
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return String(payload.sub || "");
      } catch {}
    }
    return "";
  }

  function getLoggedInUserEmail() {
    if (state.user && state.user.email) return String(state.user.email).toLowerCase();
    const saved = sessionStorage.getItem("jewels_user_email");
    if (saved) return String(saved).toLowerCase();
    return "";
  }

  function handleAccountLocked() {
    const curEmail = getLoggedInUserEmail();
    clearAuth();
    state.user = null;
    state.cartCount = 0;
    renderAccount();
    if (curEmail) {
      try { broadcast("ACCOUNT_CHANGED", { email: curEmail, isActive: false }); } catch {}
    }
    // Chuyển hướng ngay lập tức (không alert chặn), tự động văng luôn mà không cần reload trang
    const targetUrl = "/client/login.html?locked=1&email=" + encodeURIComponent(curEmail || "");
    if (location.pathname.endsWith("login.html")) {
      if (typeof window._showLockedAlert === "function") {
        window._showLockedAlert(curEmail);
      }
    } else {
      location.replace(targetUrl);
    }
  }

  function toast(message, type = "") {
    let box = $("#toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  // ---------- layout ----------
  const ICONS = {
    cart: '<svg viewBox="0 0 16 16"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
    user: '<svg viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>',
    menu: '<svg viewBox="0 0 16 16"><path d="M1 3h14v1H1zm0 4.5h14v1H1zM1 12h14v1H1z"/></svg>',
  };

  // ---------- THANH GẠCH DƯỚI LƯỚT MƯỢT GIỮA CÁC TAB ----------
  function updateNavIndicator(targetEl, immediate = false) {
    const navLinks = $("#navLinks");
    let indicator = $("#navIndicator");
    if (!navLinks) return;
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.id = "navIndicator";
      indicator.className = "nav-indicator";
      navLinks.appendChild(indicator);
    }
    const el = targetEl || navLinks.querySelector("a.active");
    if (!el) {
      indicator.style.opacity = "0";
      return;
    }
    const navRect = navLinks.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left = elRect.left - navRect.left;
    const width = elRect.width;

    if (immediate) {
      indicator.style.transition = "none";
    }
    indicator.style.width = width + "px";
    indicator.style.transform = `translateX(${left}px)`;
    indicator.style.opacity = "1";
    if (immediate) {
      void indicator.offsetWidth;
      indicator.style.transition = "";
    }
  }

  // ---------- THÔNG BÁO TẢI DỮ LIỆU KÈM ICON BOT NẢY & NHẮM MẮT ----------
  let pageLoadingTimer = null;
  function showPageLoading(show) {
    let toast = $("#pageLoadingToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pageLoadingToast";
      toast.className = "page-loading-toast";
      toast.innerHTML = `
        <div class="bot-bouncer">
          <div class="bot-figure">
            <img class="bot-img bot-open" src="../shared/images/Icons/bot.png" alt="Bot">
            <img class="bot-img bot-blink" src="../shared/images/Icons/bot-blink.png" alt="Bot nhắm mắt">
          </div>
          <div class="bot-shadow"></div>
        </div>
        <div class="loading-content">
          <span class="loading-msg">Đang tải dữ liệu, xin chờ trong giây lát…</span>
        </div>`;
      document.body.appendChild(toast);
    }

    if (show) {
      clearTimeout(pageLoadingTimer);
      pageLoadingTimer = setTimeout(() => {
        toast.classList.add("active");
      }, 50);
    } else {
      clearTimeout(pageLoadingTimer);
      toast.classList.remove("active");
    }
  }

  // ---------- CHUYỂN TRANG MƯỢT MÀ (SPA ROUTER) KHÔNG RESET TOÀN BỘ TRANG ----------
  let currentNavId = 0;

  function resolveClientUrl(url) {
    try {
      // Dùng window.location.href làm base để đường dẫn tương đối (e.g. "shop.html", "shop.html?cat=1")
      // luôn giữ đúng thư mục /client/
      const parsed = new URL(url, window.location.href);
      if (
        !parsed.pathname.startsWith("/client/") &&
        !parsed.pathname.startsWith("/admin/") &&
        !parsed.pathname.startsWith("/api/") &&
        !parsed.pathname.startsWith("/shared/")
      ) {
        parsed.pathname = "/client/" + parsed.pathname.replace(/^\/+/, "");
      }
      return parsed;
    } catch {
      return new URL(url, window.location.origin + "/client/");
    }
  }

  async function navigate(url, { push = true } = {}) {
    const navId = ++currentNavId;
    const destUrl = resolveClientUrl(url);

    // Bật thông báo tải trang có chú bot nảy lên xuống
    showPageLoading(true);

    // Lướt thanh gạch dưới đến nút được chọn ngay tức thì
    const fileName = destUrl.pathname.split("/").pop() || "home.html";
    const targetLink =
      $(`#navLinks a[href="${fileName}"]`) ||
      $(`#navLinks a[href^="${fileName}?"]`) ||
      $(`#navLinks a[href$="/${fileName}"]`);
    if (targetLink) {
      $$("#navLinks a").forEach((a) => a.classList.remove("active"));
      targetLink.classList.add("active");
      updateNavIndicator(targetLink);
    }

    try {
      const res = await fetch(destUrl.href);
      if (!res.ok) throw new Error("Không thể tải trang: HTTP " + res.status);
      const html = await res.text();

      // Nếu đã có lệnh chuyển trang mới hơn thì bỏ qua lệnh cũ
      if (navId !== currentNavId) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const newMain = doc.querySelector("main");
      const curMain = $("main");
      if (newMain && curMain) {
        curMain.style.transition = "opacity 0.16s ease, transform 0.16s ease";
        curMain.style.opacity = "0";
        curMain.style.transform = "translateY(6px)";

        await new Promise((r) => setTimeout(r, 160));
        if (navId !== currentNavId) return;

        // Thay nội dung phần main mà không làm mất header/footer/realtime
        curMain.innerHTML = newMain.innerHTML;
        if (newMain.className) curMain.className = newMain.className;
        document.title = doc.title;
        document.body.dataset.page = doc.body.dataset.page || "";

        // Đồng bộ các dialog bên ngoài main (như #addrDialog trong user.html, #orderDialog trong orders.html)
        $$("body > dialog:not(#authDialog)").forEach((d) => d.remove());
        const newDialogs = doc.querySelectorAll("body > dialog:not(#authDialog)");
        const siteFooter = $("#site-footer");
        newDialogs.forEach((d) => {
          if (siteFooter) {
            document.body.insertBefore(d.cloneNode(true), siteFooter);
          } else {
            document.body.appendChild(d.cloneNode(true));
          }
        });
        if (!$("#authDialog")) {
          createAuthDialog();
        }

        // Cập nhật URL trình duyệt TRƯỚC KHI thực thi script mới
        // để các script (như shop.js) đọc đúng query parameters từ location.search
        if (push) {
          history.pushState({ page: document.body.dataset.page, url: destUrl.href }, "", destUrl.href);
          sessionStorage.setItem("jewels_last_shop_url", location.href);
        }

        // Nạp và thực thi script trang mới
        const newScripts = doc.querySelectorAll("body script");
        newScripts.forEach((s) => {
          const rawSrc = s.getAttribute("src") || "";
          if (rawSrc.includes("js/pages/")) {
            // Xóa script trang cũ
            $$('script[src*="js/pages/"]').forEach((el) => el.remove());
            const resolvedSrc = new URL(rawSrc, destUrl.href).href;
            const scriptEl = document.createElement("script");
            scriptEl.src = resolvedSrc.split("?")[0] + "?v=" + Date.now();
            document.body.appendChild(scriptEl);
          }
        });

        // Đồng bộ lại nav links
        const curPage = document.body.dataset.page || "";
        $$("#navLinks a").forEach((a) => {
          a.classList.toggle("active", a.dataset.nav === curPage);
        });
        updateNavIndicator();

        // Cuộn lên đầu
        window.scrollTo({ top: 0, behavior: "instant" });

        // Khởi tạo lại scroll reveal cho các phần tử mới
        if (typeof initScrollReveal === "function") {
          initScrollReveal();
        }

        curMain.style.opacity = "1";
        curMain.style.transform = "translateY(0)";
      }
    } catch (err) {
      console.warn("Chuyển trang SPA thất bại, chuyển bằng trình duyệt:", err);
      location.href = destUrl.href;
    } finally {
      if (navId === currentNavId) {
        setTimeout(() => {
          if (navId === currentNavId) showPageLoading(false);
        }, 150);
      }
    }
  }

  // Bắt sự kiện click các liên kết nội bộ trang client
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:") || a.target === "_blank") {
      return;
    }
    const curPage = document.body.dataset.page || "";
    const baseName = href.split("?")[0].split("#")[0];
    if (curPage === "login" || curPage === "register" || curPage === "admin-login" || baseName === "login.html" || baseName === "register.html" || a.hasAttribute("data-no-spa")) {
      return;
    }
    const internalPages = ["home.html", "shop.html", "orders.html", "user.html", "cart.html", "checkout.html", "product.html"];
    if (internalPages.includes(baseName) || (baseName.endsWith(".html") && !baseName.includes("/admin/"))) {
      e.preventDefault();
      navigate(href);
    }
  });

  // Xử lý nút Back/Forward của trình duyệt
  window.addEventListener("popstate", () => {
    navigate(location.href, { push: false });
  });

  function buildLayout() {
    const page = document.body.dataset.page || "";
    if (page === "login" || page === "register" || page === "admin-login") {
      return;
    }
    const link = (href, label, key) => `<a href="${href}" class="${page === key ? "active" : ""}" data-nav="${key}">${label}</a>`;
    const header = $("#site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="container nav">
          <a class="logo" href="home.html" aria-label="Jewels"><img src="../shared/images/main-logo.png" alt="Jewels"></a>
          <nav class="nav-links" id="navLinks">
            ${link("home.html", "Trang chủ", "home")}
            ${link("shop.html", "Cửa hàng", "shop")}
            ${link("orders.html", "Đơn hàng", "orders")}
            ${link("user.html", "Tài khoản", "user")}
            <span class="nav-indicator" id="navIndicator"></span>
          </nav>
          <span class="spacer"></span>
          <form class="nav-search" id="navSearch" role="search">
            <input type="search" name="q" placeholder="Tìm trang sức…" aria-label="Tìm kiếm">
            <button type="submit" aria-label="Tìm">⌕</button>
          </form>
          <div class="nav-actions">
            <div id="accountSlot"></div>
            <a class="icon-btn" href="cart.html" aria-label="Giỏ hàng">${ICONS.cart}<span class="badge" id="cartBadge" data-n="0"></span></a>
            <button class="icon-btn nav-toggle" id="navToggle" aria-label="Menu">${ICONS.menu}</button>
          </div>
        </div>`;
      $("#navToggle").addEventListener("click", () => $("#navLinks").classList.toggle("open"));
      $("#navSearch").addEventListener("submit", (e) => {
        e.preventDefault();
        const q = new FormData(e.target).get("q").trim();
        navigate("shop.html" + (q ? "?q=" + encodeURIComponent(q) : ""));
      });

      const navLinks = $("#navLinks");
      if (navLinks) {
        navLinks.addEventListener("mouseenter", (e) => {
          const a = e.target.closest("a");
          if (a) updateNavIndicator(a);
        }, true);
        navLinks.addEventListener("mouseleave", () => {
          updateNavIndicator();
        });
      }
      setTimeout(updateNavIndicator, 60);
      window.addEventListener("resize", () => updateNavIndicator(), { passive: true });
    }
    const footer = $("#site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `
        <div class="container">
          <div class="foot-grid">
            <div><h4>JEWELS</h4><p>Những món trang sức nhỏ, lưu giữ những khoảnh khắc lớn. Vàng, bạc, kim cương và ngọc trai được chọn lọc kỹ lưỡng.</p></div>
            <div><h4>Mua sắm</h4><ul><li><a href="shop.html">Tất cả sản phẩm</a></li><li><a href="cart.html">Giỏ hàng</a></li><li><a href="orders.html">Theo dõi đơn hàng</a></li></ul></div>
            <div><h4>Hỗ trợ</h4><ul><li>Miễn phí vận chuyển từ 10.000.000đ</li><li>Giao hàng toàn quốc</li><li>Giấy kiểm định đi kèm</li></ul></div>
          </div>
          <div class="copy-line">© ${new Date().getFullYear()} Jewels · Everyday Treasures</div>
        </div>`;
    }
    createAuthDialog();
  }

  function createAuthDialog() {
    let dlg = $("#authDialog");
    if (dlg) {
      if (!dlg._setMode) setupAuthDialog(dlg);
      return dlg;
    }
    dlg = document.createElement("dialog");
    dlg.id = "authDialog";
    dlg.innerHTML = `
      <button class="dlg-close" type="button" data-close aria-label="Đóng">×</button>
      
      <!-- GIAO DIỆN 1: ĐĂNG NHẬP (Obsidian & Gold - Thân thiết) -->
      <div class="auth-view auth-login-view" id="authLoginView">
        <div class="auth-layout">
          <aside class="auth-aside">
            <div>
              <span class="auth-badge">✦ Jewels Atelier ✦</span>
              <div class="auth-aside-body">
                <h3>Mỗi món trang sức là một câu chuyện vô giá.</h3>
                <p>Chào mừng quý khách quay lại với không gian mua sắm thượng lưu của Jewels.</p>
              </div>
            </div>
            <div class="auth-aside-foot">
              <span>Bảo mật chuẩn SSL 256-bit</span>
              <span>Hotline VIP: 1900 8899</span>
            </div>
          </aside>
          <section class="auth-main">
            <div class="auth-head">
              <p class="eyebrow">Khách hàng thân thiết</p>
              <h2>Đăng Nhập</h2>
              <p>Nhập email và mật khẩu để quản lý đơn hàng & tích lũy điểm thưởng.</p>
            </div>
            <form class="auth-form" id="loginForm">
              <label class="field">Email<input name="email" type="email" autocomplete="email" placeholder="ban@email.com" required></label>
              <label class="field">
                Mật khẩu
                <div class="pw-wrap">
                  <input name="password" type="password" minlength="8" placeholder="Nhập mật khẩu" required autocomplete="current-password">
                  <button type="button" class="pw-toggle-btn" title="Hiện/Ẩn mật khẩu" aria-label="Hiện/Ẩn mật khẩu">
                    <img src="../shared/images/Icons/eye.png" alt="Hiện mật khẩu" class="pw-toggle-icon">
                  </button>
                </div>
              </label>
              <div class="auth-util-row">
                <label><input type="checkbox" name="remember" checked> Ghi nhớ đăng nhập</label>
                <a href="javascript:void(0)" id="forgotPwLink">Quên mật khẩu?</a>
              </div>
              <button class="btn block gold" type="submit" id="loginSubmit">Đăng Nhập Ngay →</button>
              <p class="feedback" id="loginFeedback" role="status" aria-live="polite"></p>
            </form>
            <div class="auth-switch-card">
              <div>
                <strong>Bạn là Quản lý ?</strong>
                <p>Truy cập không gian quản trị hệ thống Jewels</p>
              </div>
              <a href="../admin/login.html" class="auth-switch-btn">Đăng nhập admin →</a>
            </div>
            <div class="auth-switch-card">
              <div>
                <strong>Chưa có tài khoản?</strong>
                <p>Gia nhập hội viên nhận ngay Voucher 10%</p>
              </div>
              <button type="button" class="auth-switch-btn" data-go="register">Đăng ký mới →</button>
            </div>
          </section>
        </div>
      </div>

      <!-- GIAO DIỆN 2: ĐĂNG KÝ (Champagne & Rose Gold - Đặc quyền VIP) -->
      <div class="auth-view auth-register-view" id="authRegisterView" hidden>
        <div class="auth-layout">
          <aside class="auth-aside">
            <div>
              <span class="auth-badge">💎 Jewels Privilege VIP</span>
              <div class="auth-aside-body">
                <h3>Đặc Quyền Thành Viên Mới</h3>
                <p>Khám phá thế giới trang sức cao cấp cùng những đặc quyền dành riêng cho bạn:</p>
                <div class="auth-perks">
                  <div class="perk-item">
                    <div class="perk-icon">🏷️</div>
                    <div class="perk-text">
                      <strong>Voucher Chào Mừng 10%</strong>
                      <span>Áp dụng ngay cho đơn hàng đầu tiên</span>
                    </div>
                  </div>
                  <div class="perk-item">
                    <div class="perk-icon">🎂</div>
                    <div class="perk-text">
                      <strong>Quà Sinh Nhật Độc Quyền</strong>
                      <span>Món quà sang trọng gửi tận nơi mỗi năm</span>
                    </div>
                  </div>
                  <div class="perk-item">
                    <div class="perk-icon">✨</div>
                    <div class="perk-text">
                      <strong>Làm Sáng & Bảo Trì Trọn Đời</strong>
                      <span>Miễn phí bảo dưỡng định kỳ vô điều kiện</span>
                    </div>
                  </div>
                  <div class="perk-item">
                    <div class="perk-icon">🚚</div>
                    <div class="perk-text">
                      <strong>Miễn Phí Giao Hàng Hỏa Tốc</strong>
                      <span>Đóng gói hộp quà cao cấp kèm thiệp</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="auth-aside-foot">
              <span>Tham gia hoàn toàn miễn phí</span>
              <span>Tích lũy trọn đời</span>
            </div>
          </aside>
          <section class="auth-main">
            <div class="auth-head">
              <p class="eyebrow">Gia nhập thành viên mới</p>
              <h2>Tạo Tài Khoản</h2>
              <p>Chỉ mất 30 giây để kích hoạt toàn bộ đặc quyền hội viên VIP Jewels.</p>
            </div>
            <form class="auth-form" id="regForm">
              <div class="form-row-2">
                <label class="field">Họ và tên<input name="name" autocomplete="name" placeholder="Nguyễn Văn A" required></label>
                <label class="field">Số điện thoại<input name="phone" type="tel" maxlength="10" inputmode="numeric" placeholder="0901234567" required></label>
              </div>
              <label class="field">Email nhận thông báo & ưu đãi<input name="email" type="email" autocomplete="email" placeholder="ban@gmail.com" required></label>
              <div class="form-row-2">
                <label class="field">
                  Mật khẩu
                  <div class="pw-wrap">
                    <input name="password" type="password" minlength="8" placeholder="Tối thiểu 8 ký tự" required autocomplete="new-password">
                    <button type="button" class="pw-toggle-btn" title="Hiện/Ẩn mật khẩu" aria-label="Hiện/Ẩn mật khẩu">
                      <img src="../shared/images/Icons/eye.png" alt="Hiện mật khẩu" class="pw-toggle-icon">
                    </button>
                  </div>
                </label>
                <label class="field">
                  Xác nhận mật khẩu
                  <div class="pw-wrap">
                    <input name="confirm" type="password" minlength="8" placeholder="Nhập lại mật khẩu" required autocomplete="new-password">
                    <button type="button" class="pw-toggle-btn" title="Hiện/Ẩn mật khẩu" aria-label="Hiện/Ẩn mật khẩu">
                      <img src="../shared/images/Icons/eye.png" alt="Hiện mật khẩu" class="pw-toggle-icon">
                    </button>
                  </div>
                </label>
              </div>
              <label class="auth-agree-label">
                <input type="checkbox" required checked>
                <span>Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật hội viên Jewels.</span>
              </label>
              <button class="btn block gold" type="submit" id="regSubmit">Hoàn Tất Đăng Ký & Nhận Ưu Đãi 10% →</button>
              <p class="feedback" id="regFeedback" role="status" aria-live="polite"></p>
            </form>
            <div class="auth-switch-card">
              <div>
                <strong>Đã là thành viên của Jewels?</strong>
                <p>Đăng nhập để theo dõi đơn và tích điểm</p>
              </div>
              <button type="button" class="auth-switch-btn" data-go="login">Đăng nhập ngay →</button>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    setupAuthDialog(dlg);
    return dlg;
  }

  function renderAccount() {
    const slot = $("#accountSlot");
    if (slot) {
      slot.innerHTML = state.user
        ? `<div class="user-chip"><a href="user.html" title="Tài khoản">${esc(state.user.name.split(" ").pop() || "Tài khoản")}</a><button class="link-btn" id="logoutBtn" type="button">Thoát</button></div>`
        : `<div style="display:flex;align-items:center;gap:10px;">
             <button class="btn sm outline" id="loginBtn" type="button">Đăng nhập</button>
             <button class="btn sm gold" id="regBtn" type="button">Đăng ký</button>
           </div>`;
      $("#logoutBtn")?.addEventListener("click", logout);
      $("#loginBtn")?.addEventListener("click", () => openAuth("login"));
      $("#regBtn")?.addEventListener("click", () => openAuth("register"));
    }
    setCartCount(state.cartCount);
  }

  function setCartCount(n) {
    state.cartCount = n;
    const badge = $("#cartBadge");
    if (badge) { badge.textContent = n || ""; badge.dataset.n = n; }
  }

  async function refreshCartCount() {
    if (!state.user) return setCartCount(0);
    try { setCartCount((await api("/cart")).count); } catch { /* bỏ qua */ }
  }

  // ---------- đăng nhập & đăng ký riêng biệt ----------
  let pendingLogin = null;
  function setupAuthDialog(dlg) {
    const loginView = $("#authLoginView", dlg);
    const regView = $("#authRegisterView", dlg);
    const loginForm = $("#loginForm", dlg);
    const regForm = $("#regForm", dlg);
    const loginFb = $("#loginFeedback", dlg);
    const regFb = $("#regFeedback", dlg);
    const loginSubmit = $("#loginSubmit", dlg);
    const regSubmit = $("#regSubmit", dlg);

    const setMode = (m) => {
      if (m === "register") {
        loginView.hidden = true;
        regView.hidden = false;
        regForm.querySelector("input[name=name]")?.focus({ preventScroll: true });
      } else {
        loginView.hidden = false;
        regView.hidden = true;
        loginForm.querySelector("input[name=email]")?.focus({ preventScroll: true });
      }
      loginFb.textContent = "";
      regFb.textContent = "";
    };
    dlg._setMode = setMode;

    // Chuyển đổi giữa Đăng nhập và Đăng ký qua nút bấm trong callout card
    $$("[data-go]", dlg).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.go)));
    $("[data-close]", dlg).addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { if (pendingLogin) { pendingLogin.reject(new Error("cancelled")); pendingLogin = null; } });

    // Nút ẩn/hiện mật khẩu (eye toggle)
    $$(".pw-toggle-btn", dlg).forEach((btn) => {
      btn.addEventListener("click", () => {
        const inp = btn.previousElementSibling;
        if (!inp) return;
        const isPw = inp.type === "password";
        inp.type = isPw ? "text" : "password";
        const img = btn.querySelector("img");
        if (img) {
          img.src = isPw ? "../shared/images/Icons/eye-closed.png" : "../shared/images/Icons/eye.png";
          img.alt = isPw ? "Ẩn mật khẩu" : "Hiện mật khẩu";
        }
      });
    });

    $("#forgotPwLink", dlg)?.addEventListener("click", () => {
      toast("Vui lòng liên hệ CSKH qua hotline 1900 8899 hoặc gửi email hỗ trợ để đặt lại mật khẩu.", "ok");
    });

    // Xử lý SUBMIT ĐĂNG NHẬP
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(loginForm));
      loginSubmit.disabled = true;
      loginFb.textContent = "";
      try {
        const data = await api("/auth/login", { method: "POST", body: { email: f.email, password: f.password } });
        setAuthToken(data.token);
        if (data.user?.email) {
          sessionStorage.setItem("jewels_user_email", data.user.email);
          localStorage.setItem("jewels_user_email", data.user.email);
        }
        if (data.user?.id) {
          sessionStorage.setItem("jewels_user_id", data.user.id);
          localStorage.setItem("jewels_user_id", data.user.id);
        }
        state.user = data.user;
        loginForm.reset();
        const p = pendingLogin; pendingLogin = null;
        dlg.close();
        renderAccount();
        await refreshCartCount();
        toast("Chào mừng trở lại, " + data.user.name + "!", "ok");
        if (p) p.resolve(data.user);
        listeners.forEach((fn) => fn(state.user));
      } catch (err) {
        if (err.isLocked) {
          const isPending = err.unlockStatus === "pending";
          loginFb.innerHTML = `
            <div class="locked-modal-box" style="margin-top:12px; padding:12px 14px; background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; text-align:left;">
              <div style="color:#be123c; font-weight:700; font-size:13px; margin-bottom:4px;">
                🔒 Tài khoản đã bị khóa
              </div>
              <p style="margin:0 0 6px; font-size:12px; color:#881337; line-height:1.4;">
                Tài khoản <strong>${f.email}</strong> đang bị khóa bởi quản trị viên.
              </p>
              ${isPending ? `
                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:6px 8px; color:#92400e; font-size:11px; margin-bottom:6px;">
                  ⏳ <strong>Yêu cầu mở khóa của bạn đang chờ phê duyệt.</strong>
                </div>
              ` : ''}
              <textarea id="modalUnlockReason" placeholder="${isPending ? 'Cập nhật thêm lời nhắn...' : 'Nhập lý do hoặc lời nhắn gửi ban quản trị (tùy chọn)...'}" style="width:100%; border:1px solid #fecdd3; border-radius:6px; padding:6px 8px; font-size:12px; font-family:inherit; resize:vertical; min-height:42px; margin-bottom:8px; box-sizing:border-box;">${err.unlockReason || ''}</textarea>
              <button type="button" class="btn block gold" id="modalBtnRequestUnlock" style="padding:7px 10px; font-size:12px; border:none; border-radius:6px; cursor:pointer; width:100%; font-weight:600;">
                ${isPending ? '📩 Cập nhật yêu cầu mở tài khoản' : '📩 Xin mở lại tài khoản'}
              </button>
              <div id="modalUnlockNotice" style="margin-top:6px; font-size:11px; font-weight:600;"></div>
            </div>
          `;
          const reqBtn = $("#modalBtnRequestUnlock", loginFb);
          const notice = $("#modalUnlockNotice", loginFb);
          const reasonEl = $("#modalUnlockReason", loginFb);
          reqBtn?.addEventListener("click", async () => {
            reqBtn.disabled = true;
            reqBtn.textContent = "Đang gửi yêu cầu...";
            try {
              const res = await api("/auth/request-unlock", {
                method: "POST",
                body: { email: f.email, reason: reasonEl ? reasonEl.value : "" }
              });
              notice.style.color = "#047857";
              notice.textContent = "✅ " + (res.message || "Đã gửi yêu cầu xin mở lại tài khoản!");
              reqBtn.disabled = false;
              reqBtn.textContent = "📩 Cập nhật lại yêu cầu";
            } catch (uErr) {
              notice.style.color = "#b91c1c";
              notice.textContent = "Lỗi: " + uErr.message;
              reqBtn.disabled = false;
              reqBtn.textContent = "📩 Thử lại";
            }
          });

          // Polling phát hiện tài khoản được mở
          if (window._modalUnlockPoll) clearInterval(window._modalUnlockPoll);
          window._modalUnlockPoll = setInterval(async () => {
            try {
              const st = await api("/auth/unlock-status?email=" + encodeURIComponent(f.email));
              if (st && st.isActive) {
                clearInterval(window._modalUnlockPoll);
                window._modalUnlockPoll = null;
                if (notice) {
                  notice.style.color = "#047857";
                  notice.innerHTML = "🎉 <strong>Tài khoản đã được mở khóa!</strong> Bạn có thể bấm Đăng nhập ngay.";
                }
                if (reqBtn) reqBtn.style.display = "none";
                loginSubmit.disabled = false;
              }
            } catch {}
          }, 3000);
        } else {
          loginFb.textContent = err.message;
        }
      } finally {
        loginSubmit.disabled = false;
      }
    });

    // Ràng buộc chỉ nhập chữ số và tối đa 10 chữ số cho SĐT đăng ký
    const regPhoneInput = regForm.querySelector("input[name=phone]");
    regPhoneInput?.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    });

    // Xử lý SUBMIT ĐĂNG KÝ
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(regForm));
      if (!f.name || f.name.trim().length < 2) return (regFb.textContent = "Vui lòng nhập họ và tên.");
      const cleanPhone = (f.phone || "").trim().replace(/\D/g, "");
      if (!/^\d{10}$/.test(cleanPhone)) return (regFb.textContent = "Số điện thoại phải bao gồm đúng 10 chữ số.");
      const cleanMail = String(f.email || "").trim().toLowerCase();
      if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(cleanMail)) {
        return (regFb.textContent = "Email đăng ký phải có đầy đủ cú pháp @gmail.com sau cùng (ví dụ: ban@gmail.com).");
      }
      if (f.password !== f.confirm) return (regFb.textContent = "Mật khẩu xác nhận chưa khớp.");
      regSubmit.disabled = true;
      regFb.textContent = "";
      try {
        const data = await api("/auth/register", { method: "POST", body: { name: f.name, email: cleanMail, phone: cleanPhone, password: f.password } });
        setAuthToken(data.token);
        if (data.user?.email) {
          sessionStorage.setItem("jewels_user_email", data.user.email);
          localStorage.setItem("jewels_user_email", data.user.email);
        }
        if (data.user?.id) {
          sessionStorage.setItem("jewels_user_id", data.user.id);
          localStorage.setItem("jewels_user_id", data.user.id);
        }
        state.user = data.user;
        regForm.reset();
        const p = pendingLogin; pendingLogin = null;
        dlg.close();
        renderAccount();
        await refreshCartCount();
        toast("Chúc mừng " + data.user.name + " đã gia nhập thành viên Jewels!", "ok");
        if (p) p.resolve(data.user);
        listeners.forEach((fn) => fn(state.user));
      } catch (err) {
        regFb.textContent = err.message;
      } finally {
        regSubmit.disabled = false;
      }
    });
  }

  function openAuth(m = "login") {
    let dlg = $("#authDialog");
    if (!dlg || !dlg._setMode) {
      dlg = createAuthDialog();
    }
    if (dlg && typeof dlg._setMode === "function") {
      dlg._setMode(m);
      if (typeof dlg.showModal === "function") {
        try {
          if (!dlg.open) dlg.showModal();
        } catch {
          dlg.showModal();
        }
      }
      dlg.querySelector("input[name=email]")?.focus({ preventScroll: true });
    }
  }

  // Đảm bảo đã đăng nhập; mở hộp thoại nếu chưa.
  function requireLogin() {
    if (state.user) return Promise.resolve(state.user);
    return new Promise((resolve, reject) => { pendingLogin = { resolve, reject }; openAuth(); });
  }

  function logout() {
    clearAuth();
    state.user = null;
    toast("Bạn đã đăng xuất.");
    if (["cart", "checkout", "orders", "user"].includes(document.body.dataset.page)) location.href = "home.html";
    else renderAccount();
  }

  // ---------- thành phần dùng chung ----------
  function productCard(p) {
    const range = p.maxPrice > p.price ? `Từ ${money(p.price)}` : money(p.price);
    const isOut = p.inStock === false || (typeof p.stock === "number" && p.stock <= 0);
    let badgeHtml = "";
    if (isOut) {
      badgeHtml = '<span class="tag" style="background:#555">Hết hàng</span>';
    } else if (p.id === 1 || p.isFeatured) {
      badgeHtml = '<span class="tag">✨ Tuyệt tác 2026</span>';
    } else if (p.id === 2 || (p.price && p.price >= 30000000)) {
      badgeHtml = '<span class="tag">💎 Kim cương cao cấp</span>';
    } else if (p.id === 3 || p.isBestseller) {
      badgeHtml = '<span class="tag">🔥 Bán chạy nhất</span>';
    } else if (p.id === 4 || (p.category && p.category.toLowerCase().includes("vàng"))) {
      badgeHtml = '<span class="tag">✦ Vàng 18K Ý</span>';
    }
    const stockQty = typeof p.stock === "number" ? p.stock : (p.stockQuantity ?? (isOut ? 0 : ""));
    const stockHtml = isOut
      ? '<div class="card-stock card-stock-out"><span class="stock-pill out">Hết hàng</span></div>'
      : `<div class="card-stock card-stock-in"><span class="stock-dot"></span><span>Hiện đang có sẵn: <strong>${stockQty !== "" ? stockQty : "nhiều"}</strong> sản phẩm</span></div>`;
    const maxQty = (typeof p.stock === "number" && p.stock > 0) ? p.stock : 99;

    return `<a class="card" href="product.html?id=${p.id}" data-stock="${stockQty}">
      ${badgeHtml}
      <div class="thumb">
        <img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">
        <div class="sparkle-container" aria-hidden="true">
          <span class="sparkle sp-1">✦</span>
          <span class="sparkle sp-2">✦</span>
          <span class="sparkle sp-3">✦</span>
        </div>
      </div>
      <div class="body">
        <span class="cat">${esc(p.category || "")}</span>
        <h3>${esc(p.name)}</h3>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <span class="price">${range}</span>
          <span style="font-size:0.8rem;color:var(--gold);font-weight:600;letter-spacing:0.04em">Khám phá →</span>
        </div>
        ${stockHtml}
        <div class="card-add-wrap">
          <div class="card-qty-row">
            <div class="card-qty-stepper" title="Nhập hoặc chọn số lượng">
              <button type="button" class="btn-card-qty btn-card-qty-dec" aria-label="Giảm số lượng" ${isOut ? "disabled" : ""}>−</button>
              <input type="number" class="card-qty-input" value="1" min="1" max="${maxQty}" aria-label="Số lượng" ${isOut ? "disabled" : ""}>
              <button type="button" class="btn-card-qty btn-card-qty-inc" aria-label="Tăng số lượng" ${isOut ? "disabled" : ""}>+</button>
            </div>
            <button type="button" class="btn-card-add ${isOut ? "disabled" : ""}" data-pro-id="${p.id}" data-variant-id="${p.defaultVariantId || ""}" ${isOut ? "disabled" : ""} title="${isOut ? "Sản phẩm tạm hết hàng" : "Thêm vào giỏ hàng"}">
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
              <span>${isOut ? "Hết hàng" : "Thêm giỏ"}</span>
            </button>
          </div>
        </div>
      </div>
    </a>`;
  }

  // Xử lý nút tăng giảm số lượng (+ / -) trên từng thẻ sản phẩm
  document.addEventListener("click", (e) => {
    const qtyBtn = e.target.closest(".btn-card-qty");
    if (!qtyBtn) return;
    e.preventDefault();
    e.stopPropagation();

    const stepper = qtyBtn.closest(".card-qty-stepper");
    const input = stepper?.querySelector(".card-qty-input");
    if (!input || input.disabled) return;

    let val = parseInt(input.value) || 1;
    const maxVal = parseInt(input.getAttribute("max")) || 99;
    if (qtyBtn.classList.contains("btn-card-qty-inc")) {
      val = Math.min(maxVal, val + 1);
    } else if (qtyBtn.classList.contains("btn-card-qty-dec")) {
      val = Math.max(1, val - 1);
    }
    input.value = val;
  });

  // Chặn mở liên kết thẻ khi người dùng click, focus hoặc gõ số lượng trong ô input
  document.addEventListener("click", (e) => {
    if (e.target.closest(".card-qty-input")) {
      e.stopPropagation();
    }
  });
  document.addEventListener("input", (e) => {
    const input = e.target.closest(".card-qty-input");
    if (!input) return;
    e.stopPropagation();
    const maxVal = parseInt(input.getAttribute("max")) || 99;
    let val = parseInt(input.value);
    if (!isNaN(val)) {
      if (val < 1) input.value = 1;
      else if (val > maxVal) input.value = maxVal;
    }
  });
  document.addEventListener("change", (e) => {
    const input = e.target.closest(".card-qty-input");
    if (!input) return;
    e.stopPropagation();
    const maxVal = parseInt(input.getAttribute("max")) || 99;
    let val = parseInt(input.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > maxVal) val = maxVal;
    input.value = val;
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.closest(".card-qty-input")) {
      e.stopPropagation();
    }
  });

  // Lắng nghe bấm nút "Thêm vào giỏ hàng" trực tiếp trên từng thẻ sản phẩm
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-card-add");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (btn.disabled || btn.classList.contains("disabled")) return;

    try {
      await requireLogin();
    } catch {
      return;
    }

    const proId = btn.dataset.proId;
    let variantId = btn.dataset.variantId;

    // Lấy số lượng từ ô input của thẻ
    const wrap = btn.closest(".card-add-wrap");
    const qtyInput = wrap?.querySelector(".card-qty-input");
    const qty = Math.max(1, Math.min(99, parseInt(qtyInput?.value) || 1));

    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<span>⏳ Đang thêm…</span>`;

    try {
      if (!variantId) {
        const p = await api("/products/" + encodeURIComponent(proId));
        const v = p.variants?.find((x) => x.stock > 0) || p.variants?.[0];
        if (!v || v.stock <= 0) throw new Error("Sản phẩm đã tạm hết hàng.");
        variantId = v.id;
      }

      await api("/cart/items", { method: "POST", body: { variantId: Number(variantId), quantity: qty } });
      await refreshCartCount();
      btn.classList.add("added");
      btn.innerHTML = `<span>✓ Đã thêm (${qty})</span>`;
      toast(`Đã thêm ${qty} sản phẩm vào giỏ hàng thành công!`, "ok");

      setTimeout(() => {
        btn.classList.remove("added");
        btn.innerHTML = oldHtml;
        btn.disabled = false;
        if (qtyInput) qtyInput.value = 1;
      }, 1500);
    } catch (err) {
      toast(err.message || "Không thể thêm vào giỏ hàng", "error");
      btn.innerHTML = oldHtml;
      btn.disabled = false;
    }
  });

  const variantLabel = (l) => [l.material, l.gemstone, l.size != null ? "Size " + l.size : null].filter(Boolean).join(" · ");

  // ---------- HIỆU ỨNG POP-UP ĐẨY MÀN HÌNH 2 CHIỀU KHI LƯỚT LÊN & LƯỚT XUỐNG ----------
  function initScrollReveal() {
    // 1. Cập nhật trạng thái scrolled cho site-header
    const header = $("#site-header");
    const handleHeaderScroll = () => {
      if (header) {
        if (window.scrollY > 15) {
          header.classList.add("scrolled");
        } else {
          header.classList.remove("scrolled");
        }
      }
    };
    window.addEventListener("scroll", handleHeaderScroll, { passive: true });
    handleHeaderScroll();

    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(".reveal-on-scroll").forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    // 2. IntersectionObserver kích hoạt hiệu ứng 2 chiều
    const observer = new IntersectionObserver((entries) => {
      const winH = window.innerHeight || 800;
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          // Khi phần tử bước vào khung nhìn -> trồi về vị trí chuẩn translateY(0)
          el.classList.add("is-revealed");
        } else {
          // Khi phần tử ra khỏi khung nhìn -> thiết lập hướng sẵn sàng để lướt quay lại sẽ trồi tiếp
          const rect = entry.boundingClientRect;
          if (rect.top >= winH - 20) {
            // Nằm dưới đáy màn hình -> chuẩn bị trồi lên từ dưới khi cuộn xuống
            el.classList.remove("is-revealed", "from-top");
            el.classList.add("from-bottom");
          } else if (rect.bottom <= 20) {
            // Nằm trên đỉnh màn hình -> chuẩn bị trôi xuống từ trên khi cuộn ngược lên
            el.classList.remove("is-revealed", "from-bottom");
            el.classList.add("from-top");
          }
        }
      });
    }, {
      root: null,
      rootMargin: "10px 0px -10px 0px",
      threshold: [0, 0.05]
    });

    const targetSelectors = [
      "main > section",
      ".hero .copy",
      ".section-head",
      ".page-head .container",
      ".cat-row > .cat-tile",
      ".grid > .card",
      ".perks > .perk",
      ".shop > .filters",
      ".cart-layout",
      ".cart-card",
      ".checkout-grid > *",
      ".order-card",
      ".order-detail",
      "#ordersRoot > .panel",
      ".tabs",
      "#tabBody > .panel",
      "#tabBody > .addr",
      ".profile-card",
      ".auth-box",
      ".site-footer",
      ".editorial-grid"
    ];

    function observeElements() {
      const elements = document.querySelectorAll(targetSelectors.join(","));
      const winH = window.innerHeight || 800;
      elements.forEach((el) => {
        if (!el.classList.contains("reveal-on-scroll")) {
          const rect = el.getBoundingClientRect();
          el.classList.add("reveal-on-scroll");
          // Nếu phần tử đang ở ngay trong khung nhìn lúc đầu: hiện ngay
          if (rect.top < winH * 0.85 && rect.bottom > 20) {
            el.classList.add("is-revealed");
          } else if (rect.top >= winH * 0.85) {
            // Nằm ở dưới
            el.classList.add("from-bottom");
          } else {
            // Nằm ở trên
            el.classList.add("from-top");
          }
          observer.observe(el);
        }
      });
    }

    observeElements();
    setTimeout(observeElements, 100);
    setTimeout(observeElements, 400);

    // Tự động gán cho phần tử render động (như sản phẩm nổi bật từ API)
    let scanTimer = null;
    const mutObs = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(observeElements, 50);
    });
    mutObs.observe(document.body, { childList: true, subtree: true });
  }

  const ready = (async () => {
    buildLayout();
    initScrollReveal();

    // Ghi nhớ trang mua sắm gần nhất (để khi bấm "Tiếp tục mua sắm" trong giỏ hàng sẽ quay lại đúng nơi này)
    const curPage = document.body.dataset.page || "";
    if (["home", "shop", "product"].includes(curPage)) {
      sessionStorage.setItem("jewels_last_shop_url", location.href);
    }

    const token = getAuthToken();
    if (token) {
      try {
        const [user, cart] = await Promise.all([
          api("/me").catch(() => null),
          api("/cart").catch(() => null),
        ]);
        state.user = user;
        if (user?.email) sessionStorage.setItem("jewels_user_email", user.email);
        if (user?.id) sessionStorage.setItem("jewels_user_id", user.id);
        if (cart) setCartCount(cart.count);
      } catch {
        state.user = null;
        clearAuth();
      }
    }
    renderAccount();
    return state.user;
  })();

  // ---------- THỜI GIAN THỰC (REALTIME SSE & BROADCAST) ----------
  const realtimeChannel = typeof window.BroadcastChannel !== "undefined" ? new BroadcastChannel("jewels_realtime") : null;
  const realtimeListeners = [];

  function broadcast(type, data = {}) {
    if (realtimeChannel) {
      try {
        realtimeChannel.postMessage({ type, data, timestamp: Date.now() });
      } catch {}
    }
  }

  function handleIncomingRealtime(type, data, notifyChannel = false) {
    if (notifyChannel && realtimeChannel) {
      try { realtimeChannel.postMessage({ type, data, timestamp: Date.now() }); } catch {}
    }

    // Xử lý các loại sự kiện hệ thống
    switch (type) {
      case "ORDER_STATUS_CHANGED": {
        const statusMap = {
          pending: "Chờ xác nhận",
          processing: "Đã xác nhận",
          shipped: "Đang giao hàng",
          delivered: "Đã giao thành công",
          cancelled: "Đã hủy",
        };
        const statusText = data.statusLabel || statusMap[data.status] || data.status;
        toast(`🔔 Đơn hàng #${data.orderId} đã được cập nhật: ${statusText}!`, "ok");
        document.dispatchEvent(new CustomEvent("jewels:order-updated", { detail: data }));
        break;
      }
      case "PRODUCT_CHANGED":
      case "STOCK_CHANGED": {
        document.dispatchEvent(new CustomEvent("jewels:catalog-updated", { detail: data }));
        break;
      }
      case "PROMOTION_CHANGED": {
        document.dispatchEvent(new CustomEvent("jewels:promotions-updated", { detail: data }));
        break;
      }
      case "ACCOUNT_CHANGED": {
        // 1. Nếu tài khoản hiện tại đang đăng nhập bị Admin khóa -> TỰ ĐỘNG ĐĂNG XUẤT VÀ VĂNG RA NGAY
        const myId = (getLoggedInUserId() || "").trim().toLowerCase();
        const myEmail = (getLoggedInUserEmail() || "").trim().toLowerCase();
        const targetId = String(data?.userId || "").trim().toLowerCase();
        const targetEmail = String(data?.email || "").trim().toLowerCase();
        const matchId = Boolean(targetId && myId && targetId === myId);
        const matchEmail = Boolean(targetEmail && myEmail && targetEmail === myEmail);
        const isLocked = data?.isActive === false || data?.isActive === "false" || data?.status === "Khóa" || data?.status === "Bị khóa";

        if ((matchId || matchEmail) && isLocked) {
          handleAccountLocked();
          return;
        }

        // 2. Nếu đang mở modal đăng nhập và tài khoản được mở khóa
        const notice = $("#modalUnlockNotice");
        const box = $(".locked-modal-box");
        const mailInput = $('[name="email"]', $("#authDialog"));
        const curEmail = (mailInput?.value || "").trim().toLowerCase();
        if (curEmail && data?.email && data.email.toLowerCase() === curEmail && (data?.isActive !== false)) {
          if (notice) {
            notice.style.color = "#047857";
            notice.innerHTML = "🎉 <strong>Tài khoản đã được Quản trị viên mở khóa!</strong> Vui lòng bấm Đăng nhập.";
          }
          if (box) {
            box.style.borderColor = "#a7f3d0";
            box.style.background = "#f0fdf4";
          }
          const sub = $("#loginSubmit");
          if (sub) sub.disabled = false;
        }
        break;
      }
      case "UNLOCK_APPROVED": {
        const notice = $("#modalUnlockNotice");
        const box = $(".locked-modal-box");
        const mailInput = $('[name="email"]', $("#authDialog"));
        const curEmail = (mailInput?.value || "").trim().toLowerCase();
        if (curEmail && data?.email && data.email.toLowerCase() === curEmail) {
          if (notice) {
            notice.style.color = "#047857";
            notice.innerHTML = "🎉 <strong>Tài khoản đã được Quản trị viên mở khóa!</strong> Vui lòng bấm Đăng nhập.";
          }
          if (box) {
            box.style.borderColor = "#a7f3d0";
            box.style.background = "#f0fdf4";
          }
          const sub = $("#loginSubmit");
          if (sub) sub.disabled = false;
        }
        break;
      }
    }

    // Gọi các listener đăng ký
    realtimeListeners.forEach((fn) => {
      try { fn(type, data); } catch (e) { console.error("Realtime listener error:", e); }
    });
  }

  function initRealtime() {
    // 1. Lắng nghe tab khác qua BroadcastChannel
    if (realtimeChannel) {
      realtimeChannel.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type) handleIncomingRealtime(type, data, false);
      };
    }

    // 2. Lắng nghe server qua SSE
    try {
      const es = new EventSource("/api/realtime/events");
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "CONNECTED") {
            if (payload.instanceId) {
              window._serverInstance = payload.instanceId;
            }
          } else if (payload.type) {
            handleIncomingRealtime(payload.type, payload.data, false);
          }
        } catch {}
      };
      es.onerror = () => {
        es.close();
        setTimeout(initRealtime, 4000);
      };
    } catch {}

    // 3. Kiểm tra định kỳ (heartbeat) tài khoản đang đăng nhập phòng trường hợp mất mạng/SSE
    setInterval(async () => {
      const token = getAuthToken();
      const email = getLoggedInUserEmail();
      if (token && email) {
        try {
          const res = await fetch("/api/auth/unlock-status?email=" + encodeURIComponent(email));
          if (res.ok) {
            const st = await res.json();
            if (st && st.isActive === false) {
              handleAccountLocked();
            }
          }
        } catch {}
      }
    }, 3000);
  }

  initRealtime();

  window.Jewels = {
    api, money, esc, $, $$, dateVN, toast, ready, state, productCard, variantLabel,
    openAuth, requireLogin, setCartCount, refreshCartCount, broadcast,
    navigate, updateNavIndicator, showPageLoading,
    onLogin: (fn) => listeners.push(fn),
    onRealtime: (fn) => realtimeListeners.push(fn),
  };
})();
