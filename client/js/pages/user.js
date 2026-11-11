(async () => {
  const { api, $, $$, esc, toast, openAuth, onLogin, ready, state } = Jewels;
  const root = $("#userRoot");
  if (!root) return;
  const getDlg = () => $("#addrDialog");
  let tab = "profile";
  let editingId = null;

  // Năm tối đa cho ngày sinh (đủ từ 18 tuổi trở lên theo năm hệ thống hiện tại, VD 2026 -> 2008)
  function getMaxAdultYear() {
    return new Date().getFullYear() - 18;
  }
  function getMaxAdultDateStr() {
    return `${getMaxAdultYear()}-12-31`;
  }
  function normalizeAdultDob(dobStr) {
    if (!dobStr) return "";
    const m = String(dobStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    const maxYear = getMaxAdultYear();
    let year = parseInt(m[1], 10);
    const month = m[2];
    const day = m[3];
    if (year > maxYear) year = maxYear;
    if (year < 1900) year = 1900;
    return `${String(year).padStart(4, "0")}-${month}-${day}`;
  }

  // Hiệu ứng thanh gạch dưới lướt mượt giữa các tab (giống Trang chủ, Cửa hàng, Đơn hàng, Tài khoản)
  function updateTabIndicator(targetEl, immediate = false) {
    const tabsEl = $(".tabs", root);
    if (!tabsEl) return;
    let indicator = $("#tabIndicator", tabsEl);
    if (!indicator) {
      indicator = document.createElement("span");
      indicator.id = "tabIndicator";
      indicator.className = "tab-indicator";
      tabsEl.appendChild(indicator);
    }
    const el = targetEl || tabsEl.querySelector("button.active");
    if (!el) {
      indicator.style.opacity = "0";
      return;
    }
    const tabsRect = tabsEl.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left = elRect.left - tabsRect.left;
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

  async function load() {
    if (!state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập</h3><p>Đăng nhập để quản lý tài khoản.</p><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      const goBtn = $("#goLogin");
      if (goBtn) goBtn.addEventListener("click", () => openAuth());
      return;
    }
    $("#hello").textContent = "Xin chào, " + state.user.name;
    root.innerHTML = `
      <div class="tabs" role="tablist">
        <button data-tab="profile" class="${tab === "profile" ? "active" : ""}">Thông tin cá nhân</button>
        <button data-tab="addresses" class="${tab === "addresses" ? "active" : ""}">Sổ địa chỉ</button>
        <button data-tab="password" class="${tab === "password" ? "active" : ""}">Đổi mật khẩu</button>
        <a href="orders.html">Đơn hàng →</a>
      </div>
      <div id="tabBody"></div>`;

    const tabsEl = $(".tabs", root);
    if (tabsEl) {
      tabsEl.addEventListener("mouseenter", (e) => {
        const item = e.target.closest("button, a");
        if (item && tabsEl.contains(item)) updateTabIndicator(item);
      }, true);
      tabsEl.addEventListener("mouseleave", () => {
        updateTabIndicator();
      });
    }
    updateTabIndicator(null, true);
    setTimeout(() => updateTabIndicator(), 50);
    await renderTab();
  }

  async function renderTab() {
    const body = $("#tabBody");
    if (!body) return;
    if (tab === "profile") {
      const u = state.user;
      const maxDobDate = getMaxAdultDateStr();
      const normalizedDob = normalizeAdultDob(u.dob);
      body.innerHTML = `<form class="panel form-grid" id="profileForm">
        <label class="field">Họ và tên<input name="name" required value="${esc(u.name)}"></label>
        <label class="field">Email<input value="${esc(u.email)}" disabled></label>
        <label class="field">Số điện thoại<input name="phone" type="tel" maxlength="10" inputmode="numeric" placeholder="0901234567" value="${esc(u.phone || "")}"></label>
        <label class="field">Ngày sinh<input name="dob" type="date" min="1900-01-01" max="${maxDobDate}" value="${esc(normalizedDob)}"></label>
        <div class="wide"><button class="btn gold" type="submit">Lưu thay đổi</button><p class="feedback" id="fb"></p></div></form>`;
    } else if (tab === "password") {
      body.innerHTML = `<form class="panel form-grid" id="pwForm">
        <label class="field wide">Mật khẩu hiện tại<input name="currentPassword" type="password" required autocomplete="current-password"></label>
        <label class="field">Mật khẩu mới<input name="newPassword" type="password" minlength="8" required autocomplete="new-password"></label>
        <label class="field">Xác nhận mật khẩu mới<input name="confirm" type="password" minlength="8" required autocomplete="new-password"></label>
        <div class="wide"><button class="btn gold" type="submit">Đổi mật khẩu</button><p class="feedback" id="fb"></p></div></form>`;
    } else {
      body.innerHTML = '<div class="skeleton" style="min-height:160px"></div>';
      try {
        const list = await api("/addresses");
        body.innerHTML = (list.length ? list.map((a) => `
          <div class="addr ${a.is_default ? "default" : ""}">
            <div><strong>${esc(a.recipient_name)}</strong> · ${esc(a.phone)}${a.is_default ? '<span class="pill">Mặc định</span>' : ""}<br><span class="muted">${esc(a.address_line)}</span></div>
            <div class="acts">
              ${a.is_default ? "" : `<button class="link-btn" data-default="${a.address_id}">Đặt mặc định</button>`}
              <button class="link-btn" data-edit='${esc(JSON.stringify(a))}'>Sửa</button>
              <button class="link-btn" data-del="${a.address_id}">Xóa</button>
            </div></div>`).join("") : '<div class="empty"><h3>Chưa có địa chỉ nào</h3></div>')
          + '<button class="btn sm outline" data-add type="button">+ Thêm địa chỉ</button>';
      } catch (e) { body.innerHTML = `<div class="empty"><h3>${esc(e.message)}</h3></div>`; }
    }
  }

  function openAddr(a) {
    editingId = a?.address_id || null;
    const f = $("#addrForm");
    if (!f) return;
    f.reset();
    const titleEl = $("#addrTitle");
    if (titleEl) titleEl.textContent = a ? "Sửa địa chỉ" : "Thêm địa chỉ";
    const fbEl = $("#addrFb");
    if (fbEl) fbEl.textContent = "";
    if (f.recipient_name) f.recipient_name.value = a?.recipient_name || state.user?.name || "";
    if (f.phone) f.phone.value = a?.phone || state.user?.phone || "";
    if (f.address_line) f.address_line.value = a?.address_line || "";
    if (f.is_default) f.is_default.checked = !!a?.is_default;
    const d = getDlg();
    if (d && typeof d.showModal === "function") d.showModal();
  }

  root.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    try {
      if (t.dataset.tab) {
        if (t.dataset.tab === tab) return;
        tab = t.dataset.tab;
        $$(".tabs button", root).forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
        updateTabIndicator(t);
        const body = $("#tabBody");
        if (body) {
          body.style.transition = "opacity 0.18s ease, transform 0.18s ease";
          body.style.opacity = "0";
          body.style.transform = "translateY(6px)";
          await new Promise((r) => setTimeout(r, 140));
        }
        await renderTab();
        if (body) {
          body.style.opacity = "1";
          body.style.transform = "translateY(0)";
        }
      }
      else if (t.hasAttribute("data-add")) openAddr();
      else if (t.dataset.edit) openAddr(JSON.parse(t.dataset.edit));
      else if (t.dataset.del) {
        if (!confirm("Xóa địa chỉ này?")) return;
        await api("/addresses/" + t.dataset.del, { method: "DELETE" }); toast("Đã xóa địa chỉ"); renderTab();
      } else if (t.dataset.default) {
        const list = await api("/addresses");
        const a = list.find((x) => x.address_id === +t.dataset.default);
        await api("/addresses/" + a.address_id, { method: "PUT", body: { ...a, is_default: true } });
        renderTab();
      }
    } catch (err) { toast(err.message, "error"); }
  });

  root.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fb = $("#fb");
    const d = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector("button[type='submit']");
    const oldText = btn ? btn.textContent : "";
    fb.className = "feedback"; fb.textContent = "";
    if (btn) { btn.disabled = true; btn.textContent = "Đang lưu..."; }

    try {
      if (e.target.id === "profileForm") {
        const phoneVal = (d.phone || "").trim();
        const cleanPhone = phoneVal.replace(/\D/g, "");
        if (phoneVal && !/^\d{10}$/.test(cleanPhone)) {
          throw new Error("Số điện thoại phải bao gồm đúng 10 chữ số.");
        }
        const dobVal = (d.dob || "").trim();
        if (dobVal) {
          const maxYear = getMaxAdultYear();
          const m = dobVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
          const birthYear = m ? parseInt(m[1], 10) : NaN;
          if (!m || isNaN(birthYear) || birthYear > maxYear || birthYear < 1900) {
            throw new Error(`Ngày sinh không hợp lệ: Năm sinh phải từ năm ${maxYear} trở về trước (đủ 18 tuổi trở lên).`);
          }
        }
        const updated = await api("/me", { method: "PUT", body: { ...d, phone: cleanPhone || null, dob: dobVal || null } });
        Jewels.state.user = updated;
        fb.className = "feedback ok"; fb.textContent = "Đã lưu thông tin thành công.";
        $("#hello").textContent = "Xin chào, " + updated.name;
        toast("Đã lưu thông tin cá nhân thành công!", "ok");
        document.dispatchEvent(new CustomEvent("jewels:user-updated", { detail: updated }));
      } else if (e.target.id === "pwForm") {
        if (d.newPassword !== d.confirm) throw new Error("Mật khẩu xác nhận chưa khớp.");
        await api("/me/password", { method: "PUT", body: d });
        e.target.reset();
        fb.className = "feedback ok"; fb.textContent = "Đã đổi mật khẩu thành công.";
        toast("Đã đổi mật khẩu thành công!", "ok");
      }
    } catch (err) {
      fb.className = "feedback";
      fb.textContent = err.message;
      toast(err.message, "error");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
  });

  const addrForm = $("#addrForm");
  if (addrForm) {
    addrForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.is_default = Boolean(e.target.is_default && e.target.is_default.checked);
      const phoneVal = (d.phone || "").trim();
      const cleanPhone = phoneVal.replace(/\D/g, "");
      if (!/^\d{10}$/.test(cleanPhone)) {
        const fbEl = $("#addrFb");
        if (fbEl) fbEl.textContent = "Số điện thoại phải bao gồm đúng 10 chữ số.";
        return;
      }
      try {
        await api(editingId ? "/addresses/" + editingId : "/addresses", { method: editingId ? "PUT" : "POST", body: { ...d, phone: cleanPhone } });
        const dEl = getDlg();
        if (dEl && typeof dEl.close === "function") dEl.close();
        toast("Đã lưu địa chỉ", "ok");
        renderTab();
      } catch (err) {
        const fbEl = $("#addrFb");
        if (fbEl) fbEl.textContent = err.message;
      }
    });
  }

  const curDlg = getDlg();
  if (curDlg) {
    const closeBtn = $("[data-close]", curDlg);
    if (closeBtn) closeBtn.addEventListener("click", () => curDlg.close());
    curDlg.addEventListener("click", (e) => { if (e.target === curDlg) curDlg.close(); });
    curDlg.addEventListener("input", (e) => {
      if (e.target && e.target.name === "phone") {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      }
    });
  }

  if (root) {
    root.addEventListener("input", (e) => {
      if (e.target && e.target.name === "phone") {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
      }
    });
    root.addEventListener("change", (e) => {
      if (e.target && e.target.name === "dob" && e.target.value) {
        const maxYear = getMaxAdultYear();
        const m = String(e.target.value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m && parseInt(m[1], 10) > maxYear) {
          e.target.value = normalizeAdultDob(e.target.value);
          toast(`Chỉ hiển thị và cho phép chọn năm sinh từ năm ${maxYear} trở về trước (trên 18 tuổi).`, "error");
        }
      }
    });
  }

  window.addEventListener("resize", () => updateTabIndicator(), { passive: true });

  onLogin(load);
  await ready;
  load();
})();