(async () => {
  const { api, $, $$, esc, toast, openAuth, onLogin, ready, state } = Jewels;
  const root = $("#userRoot");
  const dlg = $("#addrDialog");
  let tab = "profile";
  let editingId = null;

  async function load() {
    if (!state.user) {
      root.innerHTML = `<div class="empty"><h3>Vui lòng đăng nhập</h3><p>Đăng nhập để quản lý tài khoản.</p><button class="btn" id="goLogin">Đăng nhập / Đăng ký</button></div>`;
      $("#goLogin").addEventListener("click", () => openAuth());
      return;
    }
    $("#hello").textContent = "Xin chào, " + state.user.name;
    root.innerHTML = `
      <div class="tabs" role="tablist">
        <button data-tab="profile" class="${tab === "profile" ? "active" : ""}">Thông tin cá nhân</button>
        <button data-tab="addresses" class="${tab === "addresses" ? "active" : ""}">Sổ địa chỉ</button>
        <button data-tab="password" class="${tab === "password" ? "active" : ""}">Đổi mật khẩu</button>
        <a href="orders.html" style="padding:12px 20px;font-weight:600;color:var(--ink-soft)">Đơn hàng →</a>
      </div>
      <div id="tabBody"></div>`;
    await renderTab();
  }

  async function renderTab() {
    const body = $("#tabBody");
    if (tab === "profile") {
      const u = state.user;
      body.innerHTML = `<form class="panel form-grid" id="profileForm">
        <label class="field">Họ và tên<input name="name" required value="${esc(u.name)}"></label>
        <label class="field">Email<input value="${esc(u.email)}" disabled></label>
        <label class="field">Số điện thoại<input name="phone" type="tel" maxlength="10" inputmode="numeric" placeholder="0901234567" value="${esc(u.phone || "")}"></label>
        <label class="field">Ngày sinh<input name="dob" type="date" value="${esc(u.dob || "")}"></label>
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
    f.reset();
    $("#addrTitle").textContent = a ? "Sửa địa chỉ" : "Thêm địa chỉ";
    $("#addrFb").textContent = "";
    f.recipient_name.value = a?.recipient_name || state.user.name;
    f.phone.value = a?.phone || state.user.phone || "";
    f.address_line.value = a?.address_line || "";
    f.is_default.checked = !!a?.is_default;
    dlg.showModal();
  }

  root.addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    try {
      if (t.dataset.tab) { tab = t.dataset.tab; await load(); }
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
        const updated = await api("/me", { method: "PUT", body: { ...d, phone: cleanPhone || null } });
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

  $("#addrForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.is_default = e.target.is_default.checked;
    const phoneVal = (d.phone || "").trim();
    const cleanPhone = phoneVal.replace(/\D/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      $("#addrFb").textContent = "Số điện thoại phải bao gồm đúng 10 chữ số.";
      return;
    }
    try {
      await api(editingId ? "/addresses/" + editingId : "/addresses", { method: editingId ? "PUT" : "POST", body: { ...d, phone: cleanPhone } });
      dlg.close(); toast("Đã lưu địa chỉ", "ok"); renderTab();
    } catch (err) { $("#addrFb").textContent = err.message; }
  });
  $("[data-close]", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  root.addEventListener("input", (e) => {
    if (e.target && e.target.name === "phone") {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    }
  });
  dlg.addEventListener("input", (e) => {
    if (e.target && e.target.name === "phone") {
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
    }
  });

  onLogin(load);
  await ready;
  load();
})();