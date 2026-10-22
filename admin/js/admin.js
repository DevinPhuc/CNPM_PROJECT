/**
 * Jewels Admin Panel - Quản trị 10 chức năng kết nối Supabase
 */
(() => {
  "use strict";

  const ADMIN_SESSION_KEY = "jewels-admin-session";
  const ADMIN_DEFAULT = {
    name: "Quản trị viên",
    email: "admin@jewels.vn",
    roles: ["ADMIN", "SALES_STAFF"],
  };

  // Đảm bảo luôn có phiên admin (hỗ trợ chạy song song ngay mà không bị redirect)
  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch {}
  if (!session || !session.email) {
    session = ADMIN_DEFAULT;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  }

  // Cập nhật thông tin profile trên sidebar và topbar
  const profileNameEl = document.getElementById("adminProfileName");
  const profileEmailEl = document.getElementById("adminProfileEmail");
  const dropdownEmailEl = document.getElementById("dropdownEmail");
  const dropdownNameEl = document.getElementById("dropdownName");
  const topbarUserName = document.getElementById("topbarUserName");
  const topbarDropName = document.getElementById("topbarDropName");
  const topbarDropEmail = document.getElementById("topbarDropEmail");

  const adminName = session.name || "Quản trị viên";
  const adminEmail = session.email || "admin@jewels.vn";
  if (profileNameEl) profileNameEl.textContent = adminName;
  if (profileEmailEl) profileEmailEl.textContent = adminEmail;
  if (dropdownNameEl) dropdownNameEl.textContent = adminName;
  if (dropdownEmailEl) dropdownEmailEl.textContent = adminEmail;
  if (topbarUserName) topbarUserName.textContent = adminName;
  if (topbarDropName) topbarDropName.textContent = adminName;
  if (topbarDropEmail) topbarDropEmail.textContent = adminEmail;

  // 3. Xử lý nhấp vào avatar của admin để hiển thị menu đăng xuất
  const setupAvatarDropdown = (triggerId, dropdownId, logoutBtnId) => {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    const logout = document.getElementById(logoutBtnId);

    if (trigger && dropdown) {
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        const isHidden = dropdown.hasAttribute("hidden");
        document.querySelectorAll(".admin-profile-dropdown").forEach((d) => d.setAttribute("hidden", ""));
        if (isHidden) {
          dropdown.removeAttribute("hidden");
        }
      });
      dropdown.addEventListener("click", (e) => e.stopPropagation());
    }

    if (logout) {
      logout.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản trị?")) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          window.location.href = "login.html";
        }
      });
    }
  };

  setupAvatarDropdown("adminProfileTrigger", "adminProfileDropdown", "dropdownLogoutBtn");
  setupAvatarDropdown("topbarAvatarTrigger", "topbarProfileDropdown", "topbarLogoutBtn");

  document.addEventListener("click", () => {
    document.querySelectorAll(".admin-profile-dropdown").forEach((d) => d.setAttribute("hidden", ""));
  });

  // ---------- TIỆN ÍCH API & TOAST ----------
  async function api(path, { method = "GET", body } = {}) {
    const headers = {
      "Content-Type": "application/json",
      "x-admin-key": "jewels-admin-dev",
    };
    if (session?.token) {
      headers["Authorization"] = "Bearer " + session.token;
    }
    const res = await fetch("/api/admin" + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Có lỗi xảy ra trên máy chủ.");
    }
    return data;
  }

  function toast(message, type = "success") {
    const box = document.getElementById("adminToasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `admin-toast ${type}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s ease";
      setTimeout(() => el.remove(), 300);
    }, 3600);
  }

  // 1. Tạo dạng cho đơn vị tiền tệ format auto có dấu chấm với chữ đ phía sau. Ví dụ: 10.000.000 đ
  const formatMoney = (n) => {
    const num = Math.round(Number(n || 0));
    const parts = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${parts} đ`;
  };

  // 7. Form chuẩn dd/mm/yyyy
  const formatDate = (d) => {
    if (!d) return "--";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(d);
    }
  };

  const formatDateTime = (d) => {
    if (!d) return "--";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      const hours = String(dt.getHours()).padStart(2, "0");
      const mins = String(dt.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return String(d);
    }
  };

  // 5. Thống nhất lại màu của các trạng thái
  function renderStatusBadge(statusText) {
    const s = String(statusText || "").trim();
    const sl = s.toLowerCase();

    let cls = "badge-success";
    if (sl.includes("hủy") || sl.includes("khóa") || sl.includes("ngừng") || sl.includes("hết hạn") || sl.includes("hết hàng")) {
      cls = "badge-danger";
    } else if (sl.includes("chờ") || sl.includes("pending") || sl.includes("sắp hết")) {
      cls = "badge-warning";
    } else if (sl.includes("xác nhận") || sl.includes("processing") || sl.includes("cần nhập")) {
      cls = "badge-processing";
    } else if (sl.includes("đang giao") || sl.includes("shipped")) {
      cls = "badge-info";
    } else if (sl.includes("hoàn hàng") || sl.includes("returned")) {
      cls = "badge-purple";
    }

    return `<span class="status-badge ${cls}">${s}</span>`;
  }

  // 2. Chỉnh lại toàn bộ bảng lại cho đều
  function buildRowHeader(columns, gridCols = null) {
    const styleAttr = gridCols
      ? `style="grid-template-columns: ${gridCols};"`
      : `style="grid-template-columns: repeat(${columns.length}, minmax(0, 1fr));"`;
    return `
      <div class="admin-row admin-row-header header-row" ${styleAttr}>
        ${columns.map((c) => `<strong>${c}</strong>`).join("")}
      </div>
    `;
  }

  // ---------- STATE TOÀN CỤC ----------
  const state = {
    overview: null,
    accounts: [],
    staff: [],
    customers: [],
    products: [],
    categories: [],
    invoices: [],
    promotions: [],
    orders: [],
    stock: [],
    suppliers: [],
    analytics: null,
    unlockRequests: [],
  };

  // ---------- 0. TỔNG QUAN (OVERVIEW) ----------
  async function loadOverview() {
    try {
      const data = await api("/overview");
      state.overview = data;

      // Cập nhật KPIs
      const kpis = data.kpis || {};
      const elRev = document.getElementById("kpiRevenue");
      const elOrders = document.getElementById("kpiOrders");
      const elCustomers = document.getElementById("kpiCustomers");
      const elStock = document.getElementById("kpiStock");
      if (elRev) elRev.textContent = formatMoney(kpis.totalRevenue);
      if (elOrders) elOrders.textContent = (kpis.ordersCount || 0).toLocaleString("vi-VN");
      if (elCustomers) elCustomers.textContent = (kpis.customersCount || 0).toLocaleString("vi-VN");
      if (elStock) elStock.textContent = (kpis.totalStock || 0).toLocaleString("vi-VN") + " sp";

      // Đơn hàng gần đây
      const ordersBox = document.getElementById("overviewOrders");
      if (ordersBox) {
        if (!data.recentOrders || data.recentOrders.length === 0) {
          ordersBox.innerHTML = '<div class="admin-empty">Chưa có đơn hàng nào</div>';
        } else {
          const grid = "minmax(85px, 0.9fr) minmax(130px, 1.4fr) minmax(110px, 1.1fr) minmax(110px, 1.1fr) minmax(95px, 0.9fr)";
          ordersBox.innerHTML = buildRowHeader(["Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái", "Ngày tạo"], grid) +
            data.recentOrders.map((o) => `
              <div class="admin-row" style="grid-template-columns: ${grid};">
                <strong>${o.code}</strong>
                <span>${o.customer}</span>
                <span style="color:var(--admin-green); font-weight:600;">${formatMoney(o.total)}</span>
                <span>${renderStatusBadge(o.status)}</span>
                <small>${formatDate(o.date)}</small>
              </div>
            `).join("");
        }
      }

      // Hóa đơn gần đây
      const invBox = document.getElementById("overviewInvoices");
      if (invBox) {
        invBox.innerHTML = (data.recentInvoices || []).map((i) => `
          <div class="mini-row">
            <div>
              <strong>${i.code}</strong> - ${i.customer}
              <div style="font-size:10px; color:#888;">${formatDate(i.date)}</div>
            </div>
            <strong style="color:var(--admin-green);">${formatMoney(i.total)}</strong>
          </div>
        `).join("") || '<div class="admin-empty">Chưa có hóa đơn</div>';
      }

      // Phiếu nhập gần đây
      const stockBox = document.getElementById("overviewStock");
      if (stockBox) {
        const grid = "minmax(90px, 1fr) minmax(140px, 1.5fr) minmax(100px, 1fr)";
        stockBox.innerHTML = (data.recentReceipts && data.recentReceipts.length > 0)
          ? buildRowHeader(["Mã phiếu", "Nhà cung cấp", "Tổng tiền"], grid) +
            data.recentReceipts.map((r) => `
              <div class="admin-row" style="grid-template-columns: ${grid};">
                <strong>${r.code}</strong>
                <span>${r.supplier}</span>
                <span style="font-weight:600; color:var(--admin-gold);">${formatMoney(r.total)}</span>
              </div>
            `).join("")
          : '<div class="admin-empty">Chưa có phiếu nhập</div>';
      }

      // Tải một số sản phẩm lên overview
      loadProducts(true);
    } catch (err) {
      console.error("Lỗi tải tổng quan:", err);
    }
  }

  // ---------- 1. QUẢN LÝ TÀI KHOẢN VÀ VAI TRÒ ----------
  async function loadAccounts(keyword = "") {
    try {
      const data = await api("/accounts");
      state.accounts = data;
      renderAccountsTable(keyword);
      loadUnlockRequests();
    } catch (err) {
      toast("Lỗi tải tài khoản: " + err.message, "error");
    }
  }

  function renderAccountsTable(keyword = "") {
    const table = document.getElementById("accountsTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.accounts.filter((a) =>
      a && a.id && a.email && (
        (a.name && a.name.toLowerCase().includes(filter)) ||
        a.email.toLowerCase().includes(filter) ||
        (a.phone && a.phone.toLowerCase().includes(filter))
      )
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy tài khoản nào</div>';
      return;
    }

    const grid = "minmax(150px, 1.5fr) minmax(100px, 1fr) minmax(110px, 1.1fr) minmax(100px, 1fr) minmax(120px, 1.2fr)";
    table.innerHTML = buildRowHeader(["Họ tên & Email", "Số điện thoại", "Vai trò", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <div>
            <strong>${item.name}</strong>
            <small style="display:block; color:#777;">${item.email}</small>
          </div>
          <span>${item.phone || "--"}</span>
          <span>
            ${(item.roles || []).map((r) => {
              const isAdm = r === "ADMIN" || r === "Quản trị viên";
              const isStf = r === "SALES_STAFF" || r === "Nhân viên";
              const cls = isAdm ? "tag-admin" : isStf ? "tag-staff" : "tag-customer";
              const lbl = isAdm ? "Quản trị viên" : isStf ? "Nhân viên" : "Khách hàng";
              return `<span class="table-tag ${cls}">${lbl}</span>`;
            }).join(" ")}
          </span>
          <span>
            ${renderStatusBadge(item.status)}
            ${item.hasUnlockRequest ? '<span class="table-tag" style="background:#fee2e2; color:#b91c1c; font-weight:700; font-size:11px; margin-left:4px; display:inline-block;" title="Khách hàng đang gửi yêu cầu xin mở lại tài khoản">📩 Xin mở</span>' : ''}
          </span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editAccount('${item.id}')">Sửa</button>
            <button type="button" class="mini-btn ${item.isActive ? "danger" : "success"}" style="${!item.isActive ? "background:#059669; color:#fff; border:none;" : ""}" onclick="toggleAccount('${item.id}')">
              ${item.isActive ? "Khóa" : "Mở"}
            </button>
            ${(item.roles || []).some(r => r.includes("Quản trị") || r === "ADMIN" || r.includes("Nhân viên") || r === "SALES_STAFF") ? `
              <button type="button" class="mini-btn danger" onclick="deleteAccount('${item.id}')">Xóa</button>
            ` : ''}
          </div>
        </div>
      `).join("");
  }

  window.editAccount = (id) => {
    const item = state.accounts.find((a) => a.id === id);
    if (!item) return;
    const form = document.getElementById("accountForm");
    if (!form) return;
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="email"]').value = item.email;
    form.querySelector('[name="phone"]').value = item.phone || "";
    form.querySelector('[name="password"]').value = "";
    const roleSelect = form.querySelector('[name="role"]');
    if (roleSelect) {
      if (item.roles?.includes("ADMIN") || item.roles?.includes("Quản trị viên")) roleSelect.value = "ADMIN";
      else if (item.roles?.includes("SALES_STAFF") || item.roles?.includes("Nhân viên")) roleSelect.value = "SALES_STAFF";
      else roleSelect.value = "CUSTOMER";
    }
    const statusSelect = form.querySelector('[name="status"]');
    if (statusSelect) statusSelect.value = item.status;
    document.getElementById("accountFormTitle").textContent = "Cập nhật tài khoản";
  };

  window.toggleAccount = async (id) => {
    try {
      const target = state.accounts.find((a) => a.id === id);
      const res = await api(`/accounts/${id}/toggle`, { method: "PUT" });
      broadcast("ACCOUNT_CHANGED", { userId: id, email: target?.email, isActive: res.isActive });
      toast("Đã cập nhật trạng thái tài khoản!");
      loadAccounts();
      loadCustomers();
      loadUnlockRequests();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  window.deleteAccount = async (id) => {
    const item = state.accounts.find((a) => a.id === id);
    const isCustomer = item && !(item.roles || []).some(r => r.includes("Quản trị") || r === "ADMIN" || r.includes("Nhân viên") || r === "SALES_STAFF");
    if (isCustomer) {
      toast("Không được phép xóa tài khoản khách hàng! Bạn chỉ có quyền Thêm, Sửa hoặc Khóa/Mở.", "error");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống?")) return;
    try {
      await api(`/accounts/${id}`, { method: "DELETE" });
      toast("Đã xóa tài khoản thành công!");
      loadAccounts();
      loadStaff();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  // ---------- YÊU CẦU MỞ KHÓA TÀI KHOẢN ----------
  async function loadUnlockRequests() {
    try {
      const data = await api("/unlock-requests");
      state.unlockRequests = data.requests || [];
      const pendingCount = data.pendingCount || 0;

      // Cập nhật huy hiệu topbar & nav
      const topBadge = document.getElementById("unlockBadge");
      if (topBadge) {
        topBadge.textContent = pendingCount;
        topBadge.style.display = pendingCount > 0 ? "inline-block" : "none";
      }
      const navBadge = document.getElementById("navUnlockBadge");
      if (navBadge) {
        navBadge.textContent = pendingCount;
        navBadge.style.display = pendingCount > 0 ? "inline-block" : "none";
      }
      const pendingBadge = document.getElementById("pendingUnlockCountBadge");
      if (pendingBadge) {
        pendingBadge.textContent = `${pendingCount} chờ xử lý`;
      }

      renderUnlockRequestsTable();
    } catch (err) {
      console.warn("Lỗi tải yêu cầu mở khóa:", err.message);
    }
  }

  function renderUnlockRequestsTable() {
    const table = document.getElementById("unlockRequestsTable");
    if (!table) return;

    const list = state.unlockRequests || [];
    if (list.length === 0) {
      table.innerHTML = '<div class="admin-empty" style="padding:16px;">Hiện chưa có yêu cầu xin mở lại tài khoản nào.</div>';
      return;
    }

    const grid = "minmax(140px, 1.3fr) minmax(130px, 1.2fr) minmax(160px, 1.8fr) minmax(110px, 1fr) minmax(105px, 1fr) minmax(130px, 1.2fr)";
    table.innerHTML = buildRowHeader(["Khách hàng", "Liên hệ", "Lý do / Lời nhắn", "Thời gian", "Trạng thái", "Thao tác"], grid) +
      list.map((item) => {
        const isPending = item.status === "pending";
        const isApproved = item.status === "approved";
        const statusBadge = isPending
          ? '<span class="table-tag" style="background:#fef3c7; color:#b45309; font-weight:700;">⏳ Chờ mở lại</span>'
          : isApproved
          ? '<span class="table-tag" style="background:#dcfce7; color:#15803d; font-weight:700;">✅ Đã mở khóa</span>'
          : '<span class="table-tag" style="background:#fee2e2; color:#b91c1c; font-weight:700;">❌ Từ chối</span>';

        const actionButtons = isPending
          ? `
            <button type="button" class="mini-btn success" style="background:#059669; color:#fff; border:none; font-weight:600;" onclick="approveUnlock('${item.id}')">
              Mở khóa ngay
            </button>
            <button type="button" class="mini-btn danger" onclick="rejectUnlock('${item.id}')">
              Từ chối
            </button>
          `
          : `<small style="color:#777;">Xử lý bởi: <strong>${item.resolvedBy || "Admin"}</strong></small>`;

        return `
          <div class="admin-row" style="grid-template-columns: ${grid}; align-items:center;">
            <div>
              <strong>${item.name || item.email}</strong>
              ${!item.isUserActive ? '<span class="table-tag" style="background:#ffe4e6; color:#e11d48; font-size:10px; margin-left:4px;">Đang bị khóa</span>' : '<span class="table-tag" style="background:#dcfce7; color:#16a34a; font-size:10px; margin-left:4px;">Đã mở</span>'}
            </div>
            <div>
              <span style="display:block;">${item.email}</span>
              <small style="color:#777;">${item.phone || "--"}</small>
            </div>
            <div style="font-size:12px; color:#444; line-height:1.4; word-break:break-word;">
              ${item.reason || "Xin mở lại tài khoản"}
            </div>
            <span style="font-size:12px; color:#666;">${item.createdAt ? formatDate(item.createdAt) : "--"}</span>
            <span>${statusBadge}</span>
            <div class="table-actions">
              ${actionButtons}
            </div>
          </div>
        `;
      }).join("");
  }

  window.approveUnlock = async (id) => {
    try {
      const res = await api(`/unlock-requests/${id}/approve`, { method: "POST" });
      toast(res.message || "Đã mở khóa tài khoản thành công!", "success");
      loadUnlockRequests();
      loadAccounts();
      loadCustomers();
      const modalBackdrop = document.getElementById("detailModal");
      if (modalBackdrop && !modalBackdrop.hidden) {
        showUnlockRequestsModal();
      }
    } catch (err) {
      toast("Lỗi mở khóa: " + err.message, "error");
    }
  };

  window.rejectUnlock = async (id) => {
    const note = prompt("Nhập lý do từ chối (tùy chọn):", "Yêu cầu không được phê duyệt.");
    if (note === null) return;
    try {
      const res = await api(`/unlock-requests/${id}/reject`, { method: "POST", body: { note } });
      toast(res.message || "Đã từ chối yêu cầu.", "info");
      loadUnlockRequests();
      const modalBackdrop = document.getElementById("detailModal");
      if (modalBackdrop && !modalBackdrop.hidden) {
        showUnlockRequestsModal();
      }
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  window.showUnlockRequestsModal = () => {
    const list = state.unlockRequests || [];
    const pendingList = list.filter((r) => r.status === "pending");

    let html = `
      <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:13px; color:#555;">Tổng cộng <strong>${list.length}</strong> yêu cầu, <strong>${pendingList.length}</strong> đang chờ duyệt</span>
        <button type="button" class="mini-btn" onclick="refreshUnlockModal()">Làm mới</button>
      </div>
    `;

    if (list.length === 0) {
      html += '<div class="admin-empty">Không có yêu cầu mở khóa nào trong hệ thống.</div>';
    } else {
      html += '<div style="max-height:60vh; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">';
      list.forEach((item) => {
        const isPending = item.status === "pending";
        const isApproved = item.status === "approved";
        html += `
          <div style="border:1px solid ${isPending ? "#fdba74" : "#e5e7eb"}; background:${isPending ? "#fffaf5" : "#fafafa"}; border-radius:10px; padding:12px 16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <div>
                <strong style="font-size:14px;">${item.name || item.email}</strong>
                <span style="color:#666; font-size:12px; margin-left:6px;">(${item.email} - ${item.phone || "Không có SĐT"})</span>
              </div>
              <span class="table-tag" style="${isPending ? "background:#fef3c7; color:#b45309;" : isApproved ? "background:#dcfce7; color:#15803d;" : "background:#fee2e2; color:#b91c1c;"}">
                ${isPending ? "Chờ duyệt" : isApproved ? "Đã mở khóa" : "Từ chối"}
              </span>
            </div>
            <p style="margin:4px 0 8px; font-size:13px; color:#444;">
              <strong>Lời nhắn:</strong> ${item.reason || "Không có ghi chú"}
            </p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#777;">
              <span>Gửi lúc: ${item.createdAt ? formatDate(item.createdAt) : "--"}</span>
              <div>
                ${isPending ? `
                  <button type="button" class="mini-btn success" style="background:#059669; color:#fff; border:none; margin-right:6px;" onclick="approveUnlock('${item.id}')">
                    Mở khóa ngay
                  </button>
                  <button type="button" class="mini-btn danger" onclick="rejectUnlock('${item.id}')">
                    Từ chối
                  </button>
                ` : `<span style="color:#666;">Xử lý bởi: ${item.resolvedBy || "Admin"}</span>`}
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    showModal("Danh sách yêu cầu mở khóa tài khoản", html);
  };

  window.refreshUnlockModal = async () => {
    await loadUnlockRequests();
    showUnlockRequestsModal();
  };

  // ---------- 2. QUẢN LÝ NHÂN VIÊN ----------
  async function loadStaff(keyword = "") {
    try {
      const data = await api("/staff");
      state.staff = data;
      renderStaffTable(keyword);
    } catch (err) {
      toast("Lỗi tải nhân viên: " + err.message, "error");
    }
  }

  function renderStaffTable(keyword = "") {
    const table = document.getElementById("staffTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.staff.filter((s) =>
      s && s.id && s.email && (
        (s.name && s.name.toLowerCase().includes(filter)) ||
        s.email.toLowerCase().includes(filter) ||
        (s.position && s.position.toLowerCase().includes(filter))
      )
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy nhân viên nào</div>';
      return;
    }

    const grid = "minmax(140px, 1.4fr) minmax(100px, 1fr) minmax(110px, 1.2fr) minmax(130px, 1.4fr) minmax(95px, 0.9fr) minmax(100px, 1fr)";
    table.innerHTML = buildRowHeader(["Nhân viên", "Số điện thoại", "Chức vụ", "Địa chỉ", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <div>
            <strong>${item.name}</strong>
            <small style="display:block; color:#777;">${item.email}</small>
          </div>
          <span>${item.phone || "--"}</span>
          <span><span class="table-tag tag-staff">${item.position}</span></span>
          <small>${item.address || "--"}</small>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editStaff('${item.id}')">Sửa</button>
            <button type="button" class="mini-btn danger" onclick="deleteStaff('${item.id}')">Xóa</button>
          </div>
        </div>
      `).join("");
  }

  window.editStaff = (id) => {
    const item = state.staff.find((s) => s.id === id);
    if (!item) return;
    const form = document.getElementById("staffForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="email"]').value = item.email;
    form.querySelector('[name="phone"]').value = item.phone || "";
    form.querySelector('[name="address"]').value = item.address || "";
    form.querySelector('[name="position"]').value = item.position || "Nhân viên bán hàng";
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("staffFormTitle").textContent = "Cập nhật nhân viên";
  };

  window.deleteStaff = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa nhân viên này khỏi danh sách?")) return;
    try {
      await api(`/staff/${id}`, { method: "DELETE" });
      toast("Đã xóa nhân viên!");
      loadStaff();
      loadAccounts();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  // ---------- 3. QUẢN LÝ KHÁCH HÀNG ----------
  async function loadCustomers(keyword = "") {
    try {
      const data = await api("/customers");
      state.customers = data;
      renderCustomersTable(keyword);
    } catch (err) {
      toast("Lỗi tải khách hàng: " + err.message, "error");
    }
  }

  function renderCustomersTable(keyword = "") {
    const table = document.getElementById("customersTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.customers.filter((c) =>
      c.name.toLowerCase().includes(filter) ||
      c.email.toLowerCase().includes(filter) ||
      c.phone.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy khách hàng nào</div>';
      return;
    }

    const grid = "minmax(140px, 1.5fr) minmax(100px, 1fr) minmax(90px, 0.9fr) minmax(105px, 1.1fr) minmax(80px, 0.8fr) minmax(95px, 0.9fr) minmax(80px, 0.8fr)";
    table.innerHTML = buildRowHeader(["Khách hàng", "Số điện thoại", "Phân hạng", "Chi tiêu", "Đơn hàng", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <div>
            <strong>${item.name}</strong>
            <small style="display:block; color:#777;">${item.email}</small>
          </div>
          <span>${item.phone || "--"}</span>
          <span><span class="table-tag tag-${(item.segment || "").toLowerCase()}">${item.segment}</span></span>
          <strong style="color:var(--admin-green);">${formatMoney(item.totalSpent)}</strong>
          <span>${item.orderCount || 0} đơn</span>
          <span>
            ${renderStatusBadge(item.status)}
            ${item.hasUnlockRequest ? '<span class="table-tag" style="background:#fee2e2; color:#b91c1c; font-weight:700; font-size:11px; margin-left:4px; display:inline-block; cursor:pointer;" onclick="showUnlockRequestsModal()" title="Khách hàng đang gửi yêu cầu xin mở lại tài khoản (bấm để xem & duyệt)">📩 Xin mở</span>' : ''}
          </span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editCustomer('${item.id}')">Sửa</button>
            <button type="button" class="mini-btn ${item.isActive ? "danger" : "success"}" style="${!item.isActive ? "background:#059669; color:#fff; border:none;" : ""}" onclick="toggleCustomer('${item.id}')">
              ${item.isActive ? "Khóa" : "Mở"}
            </button>
          </div>
        </div>
      `).join("");
  }

  window.toggleCustomer = async (id) => {
    try {
      const target = state.customers.find((c) => c.id === id);
      const res = await api(`/customers/${id}/toggle`, { method: "PUT" });
      broadcast("ACCOUNT_CHANGED", { userId: id, email: target?.email, isActive: res.isActive });
      toast("Đã cập nhật trạng thái khách hàng!");
      loadCustomers();
      loadAccounts();
      loadUnlockRequests();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  window.editCustomer = (id) => {
    const item = state.customers.find((c) => c.id === id);
    if (!item) return;
    const form = document.getElementById("customerForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="email"]').value = item.email;
    form.querySelector('[name="phone"]').value = item.phone || "";
    form.querySelector('[name="dob"]').value = item.dob || "";
    form.querySelector('[name="address"]').value = item.address || "";
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("customerFormTitle").textContent = "Cập nhật khách hàng";
  };

  // ---------- 4. QUẢN LÝ SẢN PHẨM ----------
  async function loadProducts(forOverview = false) {
    try {
      const [products, cats] = await Promise.all([
        api("/products"),
        api("/categories"),
      ]);
      state.products = products;
      state.categories = cats;

      // Cập nhật select danh mục trong form
      const catSelect = document.getElementById("productCategorySelect");
      if (catSelect && cats.length > 0) {
        catSelect.innerHTML = cats.map((c) => `<option value="${c.cat_id}">${c.name}</option>`).join("");
      }

      if (forOverview) {
        const overviewBox = document.getElementById("overviewProducts");
        if (overviewBox) {
          if (!products || products.length === 0) {
            overviewBox.innerHTML = '<div class="admin-empty">Chưa có sản phẩm nào trong kho</div>';
          } else {
            const grid = "60px minmax(160px, 2fr) minmax(110px, 1.2fr) minmax(110px, 1.1fr) minmax(95px, 1fr) minmax(120px, 1.2fr) minmax(90px, 0.9fr)";
            overviewBox.innerHTML = buildRowHeader(["Ảnh", "Tên sản phẩm", "Danh mục", "Đơn giá", "Số lượng tồn", "Tình trạng kho", "Thao tác"], grid) +
              products.slice(0, 6).map((p) => {
                let stockBadge = "";
                if (p.stock <= 0) {
                  stockBadge = '<span class="status-badge badge-danger">Hết hàng</span>';
                } else if (p.stock <= 5) {
                  stockBadge = `<span class="status-badge badge-warning">Sắp hết (${p.stock})</span>`;
                } else if (p.stock <= 15) {
                  stockBadge = `<span class="status-badge badge-processing">Cần nhập (${p.stock})</span>`;
                } else {
                  stockBadge = `<span class="status-badge badge-success">Đủ hàng (${p.stock})</span>`;
                }
                return `
                  <div class="admin-row" style="grid-template-columns: ${grid};">
                    <img src="${p.image}" alt="" class="table-thumb">
                    <div>
                      <strong>${p.name}</strong>
                      <small style="display:block; color:#888;">Mã: #PRO-${p.id}</small>
                    </div>
                    <span>${p.category}</span>
                    <strong style="color:var(--admin-gold);">${formatMoney(p.price)}</strong>
                    <span style="font-weight:600;">${p.stock} cái</span>
                    <span>${stockBadge}</span>
                    <div class="table-actions">
                      <button type="button" class="mini-btn" onclick="switchTab('stock')">Nhập kho</button>
                    </div>
                  </div>
                `;
              }).join("");
          }
        }
      } else {
        renderProductsTable();
      }
    } catch (err) {
      toast("Lỗi tải sản phẩm: " + err.message, "error");
    }
  }

  function renderProductsTable(keyword = "") {
    const table = document.getElementById("productsTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.products.filter((p) =>
      p.name.toLowerCase().includes(filter) ||
      p.category.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy sản phẩm nào</div>';
      return;
    }

    const grid = "60px minmax(160px, 1.6fr) minmax(110px, 1.1fr) minmax(110px, 1fr) minmax(85px, 0.8fr) minmax(110px, 1.1fr) minmax(100px, 1fr)";
    table.innerHTML = buildRowHeader(["Hình ảnh", "Tên sản phẩm", "Danh mục", "Giá niêm yết", "Tồn kho", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <img src="${item.image}" alt="" class="table-thumb">
          <div>
            <strong>${item.name}</strong>
            <small style="display:block; color:#888;">Mã: #PRO-${item.id}</small>
          </div>
          <span>${item.category}</span>
          <strong style="color:var(--admin-gold);">${formatMoney(item.price)}</strong>
          <span style="font-weight:600;">${item.stock} cái</span>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editProduct(${item.id})">Sửa</button>
            <button type="button" class="mini-btn danger" onclick="deleteProduct(${item.id})">Ẩn</button>
          </div>
        </div>
      `).join("");
  }

  window.editProduct = (id) => {
    const item = state.products.find((p) => p.id === id);
    if (!item) return;
    const form = document.getElementById("productForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="categoryId"]').value = item.categoryId || 1;
    form.querySelector('[name="price"]').value = item.price;
    form.querySelector('[name="stock"]').value = item.stock;
    form.querySelector('[name="description"]').value = item.description || "";
    form.querySelector('[name="image"]').value = item.image || "";
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("productFormTitle").textContent = "Cập nhật sản phẩm #" + item.id;
  };

  window.deleteProduct = async (id) => {
    if (!confirm("Bạn có chắc muốn ẩn sản phẩm này khỏi cửa hàng?")) return;
    try {
      await api(`/products/${id}`, { method: "DELETE" });
      toast("Đã chuyển trạng thái sản phẩm!");
      loadProducts();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  // ---------- 5. QUẢN LÝ HÓA ĐƠN ----------
  async function loadInvoices(keyword = "") {
    try {
      const data = await api("/invoices");
      state.invoices = data;
      renderInvoicesTable(keyword);
    } catch (err) {
      toast("Lỗi tải hóa đơn: " + err.message, "error");
    }
  }

  function renderInvoicesTable(keyword = "") {
    const table = document.getElementById("invoicesTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.invoices.filter((i) =>
      i.code.toLowerCase().includes(filter) ||
      i.customer.toLowerCase().includes(filter) ||
      i.phone.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy hóa đơn nào</div>';
      return;
    }

    const grid = "minmax(90px, 1fr) minmax(140px, 1.4fr) minmax(105px, 1fr) minmax(95px, 1fr) minmax(90px, 0.9fr) minmax(110px, 1.1fr) minmax(100px, 1fr)";
    table.innerHTML = buildRowHeader(["Mã HĐ", "Khách hàng", "Số điện thoại", "Ngày xuất", "Thuế VAT", "Tổng tiền", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.code}</strong>
          <span>${item.customer}</span>
          <span>${item.phone || "--"}</span>
          <small>${formatDate(item.date)}</small>
          <small style="color:#666;">${formatMoney(item.vatAmount)}</small>
          <strong style="color:var(--admin-green);">${formatMoney(item.amount)}</strong>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="viewInvoiceDetail(${item.id})">Xem chi tiết</button>
          </div>
        </div>
      `).join("");
  }

  window.viewInvoiceDetail = (id) => {
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) return;
    showModal(`Chi tiết hóa đơn ${inv.code}`, `
      <div style="font-size:13px; display:grid; gap:8px;">
        <p><strong>Người mua hàng:</strong> ${inv.customer} (${inv.phone || "Không có SĐT"})</p>
        <p><strong>Địa chỉ:</strong> ${inv.address || "Tại quầy"}</p>
        <p><strong>Ngày lập hóa đơn:</strong> ${formatDate(inv.date)}</p>
        <div style="margin-top:12px; border-top:1px solid #eee; padding-top:12px;">
          <h4 style="font-size:14px; font-weight:600; margin-bottom:8px;">Các món hàng:</h4>
          ${(inv.items || []).map((it) => `
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #f0f0f0;">
              <span>${it.product_name || "Sản phẩm"} x ${it.quantity}</span>
              <strong>${formatMoney(it.subtotal)}</strong>
            </div>
          `).join("") || '<p style="color:#888;">(Hóa đơn dịch vụ / Khách mua lẻ)</p>'}
        </div>
        <div style="margin-top:12px; border-top:2px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; font-size:15px;">
          <strong>Tổng thanh toán:</strong>
          <strong style="color:var(--admin-green); font-size:16px;">${formatMoney(inv.amount)}</strong>
        </div>
      </div>
    `);
  };

  // ---------- 6. QUẢN LÝ KHUYẾN MÃI ----------
  async function loadPromotions(keyword = "") {
    try {
      const data = await api("/promotions");
      state.promotions = data;
      renderPromotionsTable(keyword);
    } catch (err) {
      toast("Lỗi tải khuyến mãi: " + err.message, "error");
    }
  }

  function renderPromotionsTable(keyword = "") {
    const table = document.getElementById("promotionsTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.promotions.filter((p) =>
      p.name.toLowerCase().includes(filter) ||
      p.code.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy mã khuyến mãi nào</div>';
      return;
    }

    const grid = "minmax(130px, 1.4fr) minmax(100px, 1.1fr) minmax(85px, 0.9fr) minmax(130px, 1.2fr) minmax(85px, 0.9fr) minmax(100px, 1fr) minmax(90px, 1fr)";
    table.innerHTML = buildRowHeader(["Tên CT", "Mã Voucher", "Mức giảm", "Hạn áp dụng", "Lượt dùng", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.name}</strong>
          <span><code style="background:#eee; padding:2px 6px; font-weight:700; color:var(--admin-gold);">${item.code}</code></span>
          <strong style="color:var(--admin-green);">${item.discount}%</strong>
          <small>${formatDate(item.beginDate)} - ${formatDate(item.endDate)}</small>
          <span>${item.timesUsed} / ${item.usageLimit}</span>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editPromotion(${item.id})">Sửa</button>
            <button type="button" class="mini-btn danger" onclick="deletePromotion(${item.id})">Hủy</button>
          </div>
        </div>
      `).join("");
  }

  window.editPromotion = (id) => {
    const item = state.promotions.find((p) => p.id === id);
    if (!item) return;
    const form = document.getElementById("promotionForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="code"]').value = item.code;
    form.querySelector('[name="discount"]').value = item.discount;
    form.querySelector('[name="beginDate"]').value = item.beginDate ? item.beginDate.split("T")[0] : "";
    form.querySelector('[name="endDate"]').value = item.endDate ? item.endDate.split("T")[0] : "";
    form.querySelector('[name="usageLimit"]').value = item.usageLimit || 100;
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("promotionFormTitle").textContent = "Cập nhật khuyến mãi";
  };

  window.deletePromotion = async (id) => {
    if (!confirm("Bạn có muốn ngừng hoạt động chương trình khuyến mãi này?")) return;
    try {
      await api(`/promotions/${id}`, { method: "DELETE" });
      toast("Đã cập nhật trạng thái khuyến mãi!");
      loadPromotions();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  // ---------- 7. QUẢN LÝ ĐƠN ĐẶT HÀNG ----------
  async function loadOrders(keyword = "") {
    try {
      const data = await api("/orders");
      state.orders = data;
      renderOrdersTable(keyword);
    } catch (err) {
      toast("Lỗi tải đơn hàng: " + err.message, "error");
    }
  }

  function renderOrdersTable(keyword = "") {
    const table = document.getElementById("ordersTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.orders.filter((o) =>
      o.code.toLowerCase().includes(filter) ||
      o.customer.toLowerCase().includes(filter) ||
      o.phone.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy đơn hàng nào</div>';
      return;
    }

    const grid = "minmax(85px, 0.9fr) minmax(130px, 1.3fr) minmax(100px, 1fr) minmax(95px, 1fr) minmax(110px, 1.1fr) minmax(120px, 1.1fr) minmax(120px, 1.3fr)";
    table.innerHTML = buildRowHeader(["Mã đơn", "Khách hàng", "Số điện thoại", "Ngày đặt", "Tổng tiền", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.code}</strong>
          <span>${item.customer}</span>
          <span>${item.phone || "--"}</span>
          <small>${formatDate(item.date)}</small>
          <strong style="color:var(--admin-green);">${formatMoney(item.total)}</strong>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editOrderStatus(${item.id})">Cập nhật</button>
            <button type="button" class="mini-btn" onclick="viewOrderDetail(${item.id})">Chi tiết</button>
          </div>
        </div>
      `).join("");
  }

  window.editOrderStatus = (id) => {
    const item = state.orders.find((o) => o.id === id);
    if (!item) return;
    const form = document.getElementById("orderForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="code"]').value = item.code;
    form.querySelector('[name="customer"]').value = item.customer;
    form.querySelector('[name="total"]').value = formatMoney(item.total);
    form.querySelector('[name="status"]').value = item.status;
  };

  window.viewOrderDetail = (id) => {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    showModal(`Chi tiết đơn hàng ${order.code}`, `
      <div style="font-size:13px; display:grid; gap:8px;">
        <p><strong>Người nhận:</strong> ${order.customer} - ${order.phone || "Không có SĐT"}</p>
        <p><strong>Địa chỉ nhận:</strong> ${order.address || "Tại cửa hàng"}</p>
        <p><strong>Ngày đặt:</strong> ${formatDate(order.date)}</p>
        <p><strong>Trạng thái:</strong> ${renderStatusBadge(order.status)}</p>
        <div style="margin-top:12px; border-top:1px solid #eee; padding-top:12px;">
          <h4 style="font-size:14px; font-weight:600; margin-bottom:8px;">Danh sách sản phẩm (${(order.items || []).length}):</h4>
          ${(order.items || []).map((it) => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed #f0f0f0;">
              <div>
                <strong>${it.product_name || "Sản phẩm"}</strong>
                <span style="font-size:11px; color:#666; display:block;">Số lượng: ${it.quantity} x ${formatMoney(it.unit_price)}</span>
              </div>
              <strong style="color:var(--admin-green);">${formatMoney(it.subtotal)}</strong>
            </div>
          `).join("")}
        </div>
        <div style="margin-top:12px; border-top:2px solid #ddd; padding-top:8px; display:flex; justify-content:space-between; font-size:15px;">
          <strong>Tổng thanh toán:</strong>
          <strong style="color:var(--admin-green); font-size:16px;">${formatMoney(order.total)}</strong>
        </div>
      </div>
    `);
  };

  // ---------- 8. QUẢN LÝ NHẬP HÀNG ----------
  async function loadStock(keyword = "") {
    try {
      const [receipts, suppliers, products] = await Promise.all([
        api("/receipts"),
        api("/suppliers"),
        api("/products"),
      ]);
      state.stock = receipts;
      state.suppliers = suppliers;
      state.products = products;

      // Đổ danh sách nhà cung cấp vào select
      const select = document.getElementById("stockSupplierSelect");
      if (select && suppliers.length > 0) {
        select.innerHTML = '<option value="">-- Chọn nhà cung cấp --</option>' +
          suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
      }

      // Đổ danh sách sản phẩm vào select nhập kho
      const prodSelect = document.getElementById("stockProductSelect");
      if (prodSelect && products.length > 0) {
        prodSelect.innerHTML = '<option value="">-- Chọn sản phẩm cần nhập --</option>' +
          products.map((p) => `<option value="${p.id}">${p.name} (Tồn hiện tại: ${p.stock})</option>`).join("");
      }

      renderStockTable(keyword);
    } catch (err) {
      toast("Lỗi tải phiếu nhập: " + err.message, "error");
    }
  }

  function renderStockTable(keyword = "") {
    const table = document.getElementById("stockTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.stock.filter((s) =>
      s.code.toLowerCase().includes(filter) ||
      s.supplier.toLowerCase().includes(filter) ||
      (s.productName && s.productName.toLowerCase().includes(filter))
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy phiếu nhập nào</div>';
      return;
    }

    const grid = "minmax(85px, 0.9fr) minmax(130px, 1.3fr) minmax(140px, 1.5fr) minmax(80px, 0.9fr) minmax(95px, 1fr) minmax(110px, 1.1fr) minmax(120px, 1.3fr)";
    table.innerHTML = buildRowHeader(["Mã phiếu", "Nhà cung cấp", "Sản phẩm nhập", "Số lượng", "Ngày nhập", "Tổng tiền", "Ghi chú"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.code}</strong>
          <span>${item.supplier}</span>
          <strong style="color:var(--admin-green);">${item.productName || "Sản phẩm"}</strong>
          <span style="font-weight:600; color:#10b981;">+${item.quantity}</span>
          <small>${formatDate(item.date)}</small>
          <strong style="color:var(--admin-gold);">${formatMoney(item.totalAmount)}</strong>
          <small style="color:#666;">${item.note || "--"}</small>
        </div>
      `).join("");
  }

  // ---------- 9. QUẢN LÝ NHÀ CUNG CẤP ----------
  async function loadSuppliers(keyword = "") {
    try {
      const data = await api("/suppliers");
      state.suppliers = data;
      renderSuppliersTable(keyword);
    } catch (err) {
      toast("Lỗi tải nhà cung cấp: " + err.message, "error");
    }
  }

  function renderSuppliersTable(keyword = "") {
    const table = document.getElementById("suppliersTable");
    if (!table) return;
    const filter = String(keyword || "").toLowerCase();
    const rows = state.suppliers.filter((s) =>
      s.name.toLowerCase().includes(filter) ||
      s.phone.toLowerCase().includes(filter) ||
      s.email.toLowerCase().includes(filter)
    );

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy nhà cung cấp nào</div>';
      return;
    }

    const grid = "minmax(140px, 1.5fr) minmax(100px, 1fr) minmax(120px, 1.2fr) minmax(130px, 1.4fr) minmax(95px, 1fr) minmax(100px, 1fr)";
    table.innerHTML = buildRowHeader(["Tên đối tác", "Số điện thoại", "Email liên hệ", "Địa chỉ", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.name}</strong>
          <span>${item.phone || "--"}</span>
          <small style="color:#666;">${item.email || "--"}</small>
          <small>${item.address || "--"}</small>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editSupplier(${item.id})">Sửa</button>
            <button type="button" class="mini-btn danger" onclick="deleteSupplier(${item.id})">Xóa</button>
          </div>
        </div>
      `).join("");
  }

  window.editSupplier = (id) => {
    const item = state.suppliers.find((s) => s.id === id);
    if (!item) return;
    const form = document.getElementById("supplierForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="phone"]').value = item.phone || "";
    form.querySelector('[name="email"]').value = item.email || "";
    form.querySelector('[name="address"]').value = item.address || "";
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("supplierFormTitle").textContent = "Cập nhật nhà cung cấp";
  };

  window.deleteSupplier = async (id) => {
    if (!confirm("Bạn có chắc muốn ngừng hợp tác với nhà cung cấp này?")) return;
    try {
      await api(`/suppliers/${id}`, { method: "DELETE" });
      toast("Đã chuyển trạng thái nhà cung cấp!");
      loadSuppliers();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
  };

  // ---------- 10. THỐNG KÊ & BÁO CÁO ----------
  let currentAnalyticsPeriod = "month";

  function renderDonutChart(statusCounts = {}) {
    const svg = document.getElementById("analyticsDonutSvg");
    const ringBox = document.getElementById("analyticsStatusRing");
    const centerVal = document.getElementById("donutCenterValue");
    const orderCountEl = document.getElementById("donutOrderCount");

    const STATUS_CONFIG = [
      { key: "delivered", label: "Đã giao thành công", color: "#10b981", dotClass: "dot-emerald" },
      { key: "processing", label: "Đã xác nhận", color: "#f59e0b", dotClass: "dot-amber" },
      { key: "shipped", label: "Đang giao hàng", color: "#3b82f6", dotClass: "dot-blue" },
      { key: "pending", label: "Đang chờ duyệt", color: "#b18a4b", dotClass: "dot-gold" },
      { key: "cancelled", label: "Đã hủy", color: "#ef4444", dotClass: "dot-red" },
      { key: "returned", label: "Đã hoàn hàng", color: "#8b5cf6", dotClass: "dot-purple" },
    ];

    const total = Object.values(statusCounts).reduce((a, b) => a + Number(b || 0), 0);
    if (centerVal) centerVal.textContent = total;
    if (orderCountEl) orderCountEl.textContent = `Tổng: ${total} đơn`;

    if (!svg) return;

    if (total === 0) {
      svg.innerHTML = `
        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e5ebe4" stroke-width="4.8"></circle>
      `;
      if (ringBox) {
        ringBox.innerHTML = '<div style="color:var(--admin-muted); font-size:12px;">Chưa có dữ liệu đơn hàng trong kỳ này</div>';
      }
      return;
    }

    // Với bán kính r = 15.91549430918954 thì chu vi đường tròn C = 2 * PI * r = 100
    let accumulatedPercent = 0;
    const slices = [];
    const legendItems = [];

    STATUS_CONFIG.forEach((cfg) => {
      const count = Number(statusCounts[cfg.key] || 0);
      if (count === 0) return;
      const pct = (count / total) * 100;
      const roundedPct = Math.round(pct);
      const dashArray = `${pct} ${100 - pct}`;
      const dashOffset = -accumulatedPercent;

      slices.push(`
        <circle class="donut-slice"
          cx="21" cy="21" r="15.91549430918954"
          stroke="${cfg.color}"
          stroke-dasharray="${dashArray}"
          stroke-dashoffset="${dashOffset}"
          data-status="${cfg.key}">
          <title>${cfg.label}: ${count} đơn (${roundedPct}%)</title>
        </circle>
      `);

      legendItems.push(`
        <div class="ring-item" data-status="${cfg.key}">
          <span class="dot ${cfg.dotClass}"></span>
          <span><strong>${cfg.label}:</strong> ${roundedPct}% (${count} đơn)</span>
        </div>
      `);

      accumulatedPercent += pct;
    });

    svg.innerHTML = `
      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f0f4f0" stroke-width="4.8"></circle>
      ${slices.join("")}
    `;

    if (ringBox) {
      ringBox.innerHTML = legendItems.join("");
    }
  }

  function renderBreakdownTable(breakdown = [], period = "month") {
    const table = document.getElementById("analyticsBreakdownTable");
    const titleEl = document.getElementById("breakdownTableTitle");
    if (!table) return;

    if (titleEl) {
      if (period === "day") titleEl.textContent = "Bảng số liệu chi tiết doanh thu theo từng ngày";
      else if (period === "year") titleEl.textContent = "Bảng số liệu chi tiết doanh thu theo 12 tháng";
      else titleEl.textContent = "Bảng số liệu chi tiết doanh thu theo từng ngày trong tháng";
    }

    if (!breakdown || breakdown.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không có dữ liệu trong khoảng thời gian này</div>';
      return;
    }

    // Hiển thị các dòng có số liệu hoạt động hoặc tối đa các ngày trong kỳ
    const activeRows = breakdown.filter(r => r.orderCount > 0 || r.revenue > 0 || r.cost > 0);
    const displayRows = activeRows.length > 0 ? activeRows : breakdown.slice(0, 10);

    const totOrders = breakdown.reduce((acc, r) => acc + (r.orderCount || 0), 0);
    const totDelivered = breakdown.reduce((acc, r) => acc + (r.deliveredCount || 0), 0);
    const totRev = breakdown.reduce((acc, r) => acc + (r.revenue || 0), 0);
    const totCost = breakdown.reduce((acc, r) => acc + (r.cost || 0), 0);
    const totProfit = Math.max(0, totRev - totCost);
    const totRate = totOrders > 0 ? Math.round((totDelivered / totOrders) * 100) : 0;

    table.innerHTML = buildRowHeader(["Thời gian", "Tổng đơn", "Đơn hoàn thành", "Tỷ lệ hoàn thành", "Doanh thu bán", "Chi phí nhập hàng", "Lợi nhuận gộp"]) +
      displayRows.map((r) => `
        <div class="admin-row" style="grid-template-columns: 1.2fr 0.8fr 1fr 1.1fr 1.3fr 1.3fr 1.3fr;">
          <strong>${r.periodLabel || r.shortLabel}</strong>
          <span>${r.orderCount} đơn</span>
          <span style="color:var(--admin-green); font-weight:600;">${r.deliveredCount} đơn</span>
          <span><span class="${r.successRate >= 50 ? 'status-online' : 'status-away'}">${r.successRate}%</span></span>
          <strong style="color:var(--admin-green);">${formatMoney(r.revenue)}</strong>
          <span style="color:#666;">${formatMoney(r.cost)}</span>
          <strong style="color:${r.profit > 0 ? '#10b981' : '#666'};">${formatMoney(r.profit)}</strong>
        </div>
      `).join("") +
      `
        <div class="admin-row breakdown-row-total" style="grid-template-columns: 1.2fr 0.8fr 1fr 1.1fr 1.3fr 1.3fr 1.3fr;">
          <strong style="color:var(--admin-green-dark); font-size:13px;">TỔNG CỘNG</strong>
          <strong>${totOrders} đơn</strong>
          <strong style="color:var(--admin-green);">${totDelivered} đơn</strong>
          <strong><span class="status-online">${totRate}%</span></strong>
          <strong style="color:var(--admin-green); font-size:13px;">${formatMoney(totRev)}</strong>
          <strong style="color:#666;">${formatMoney(totCost)}</strong>
          <strong style="color:#10b981; font-size:13px;">${formatMoney(totProfit)}</strong>
        </div>
      `;
  }

  function formatCompactMoney(num) {
    const n = Number(num || 0);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(".0", "") + " tỷ";
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + " tr";
    if (n >= 1000) return Math.round(n / 1000) + " k";
    return n.toLocaleString("vi-VN") + " ₫";
  }

  function renderRevenueBarChart(chartSource = {}, period = "month", totalRevenue = 0) {
    const barsBox = document.getElementById("analyticsBars");
    const barTitle = document.getElementById("analyticsBarChartTitle");
    const barSub = document.getElementById("analyticsBarSubtitle");
    const yAxisEl = document.getElementById("analyticsYAxis");
    const xAxisEl = document.getElementById("analyticsXAxis");
    const captionEl = document.getElementById("analyticsChartCaption");
    const peakBadgeEl = document.getElementById("analyticsPeakDayBadge");

    if (!barsBox) return;

    if (barTitle) {
      if (period === "day") barTitle.textContent = "Doanh thu theo ngày trong khoảng lọc";
      else if (period === "year") barTitle.textContent = "Doanh thu 12 tháng trong năm";
      else barTitle.textContent = "Doanh thu các ngày trong tháng";
    }

    if (captionEl) {
      if (period === "day") captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: Từng ngày";
      else if (period === "year") captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: 12 tháng";
      else captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: Ngày trong tháng (mùng 1 đến 31)";
    }

    if (barSub) barSub.textContent = `Tổng: ${formatMoney(totalRevenue)}`;

    const entries = Object.entries(chartSource);
    const values = entries.map(([, v]) => Number(v) || 0);
    const max = Math.max(...values, 0);

    // 1. Tính toán mốc Y-axis (Trục tung bên trái)
    if (yAxisEl) {
      if (max <= 0) {
        yAxisEl.innerHTML = `<span>10 tr</span><span>5 tr</span><span>0 ₫</span>`;
      } else {
        const topCeil = Math.ceil(max * 1.15);
        const midVal = Math.round(topCeil / 2);
        yAxisEl.innerHTML = `
          <span>${formatCompactMoney(topCeil)}</span>
          <span>${formatCompactMoney(midVal)}</span>
          <span>0 ₫</span>
        `;
      }
    }

    // 2. Tìm ngày đỉnh điểm cao nhất
    let peakEntry = null;
    if (max > 0) {
      peakEntry = entries.find(([, v]) => Number(v) === max);
    }
    if (peakBadgeEl) {
      if (peakEntry) {
        peakBadgeEl.textContent = `🏆 Cao nhất: ${peakEntry[0]} (${formatCompactMoney(peakEntry[1])})`;
        peakBadgeEl.style.display = "inline-block";
      } else {
        peakBadgeEl.style.display = "none";
      }
    }

    if (entries.length === 0) {
      barsBox.innerHTML = '<div style="color:var(--admin-muted); font-size:12px; margin:auto;">Không có dữ liệu</div>';
      if (xAxisEl) xAxisEl.innerHTML = "";
      return;
    }

    const scaleMax = max > 0 ? max * 1.15 : 100;
    const totalBars = entries.length;

    // 3. Render các cột (bars) kèm nhãn số tiền nổi bật trên cột và tooltip khi hover
    barsBox.innerHTML = entries.map(([label, val]) => {
      const num = Number(val) || 0;
      const isPeak = peakEntry && peakEntry[0] === label && num > 0;
      const hasRevenue = num > 0;
      const pct = hasRevenue ? Math.max(12, Math.round((num / scaleMax) * 100)) : 0;

      return `
        <div class="bar-col ${hasRevenue ? 'has-revenue' : 'is-zero'} ${isPeak ? 'is-peak' : ''}">
          <div class="chart-tooltip">
            <strong>${label}</strong><br>
            <span>Doanh thu: ${formatMoney(num)}</span>
          </div>
          <div class="bar-fill" style="height: ${pct}%;">
            ${hasRevenue ? `<span class="bar-value-tag">${formatCompactMoney(num)}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");

    // 4. Render nhãn trục hoành X-axis bên dưới các cột
    if (xAxisEl) {
      xAxisEl.innerHTML = entries.map(([label, val], idx) => {
        const num = Number(val) || 0;
        const hasRevenue = num > 0;

        let shortX = "";
        if (period === "year") {
          shortX = label.replace("Tháng 0", "T").replace("Tháng ", "T");
        } else if (period === "day") {
          shortX = label.split("/").slice(0, 2).join("/");
        } else {
          // Trong tháng: Ngày 01, Ngày 02 -> hiển thị số ngày
          const dayNum = parseInt(label.replace(/\D/g, ""), 10) || (idx + 1);
          if (hasRevenue || dayNum === 1 || dayNum === 5 || dayNum === 10 || dayNum === 15 || dayNum === 20 || dayNum === 25 || dayNum === 30 || idx === totalBars - 1) {
            shortX = String(dayNum);
          } else {
            shortX = "•";
          }
        }

        return `
          <div class="x-axis-item ${hasRevenue ? 'has-revenue' : ''}" title="${label}">
            ${shortX}
          </div>
        `;
      }).join("");
    }
  }

  async function loadAnalytics(filterParams = {}) {
    try {
      const period = filterParams.period || currentAnalyticsPeriod || "month";
      currentAnalyticsPeriod = period;

      let q = `?period=${encodeURIComponent(period)}`;
      if (period === "day") {
        const s = filterParams.startDate || document.getElementById("analyticsStartDate")?.value || "2026-09-01";
        const e = filterParams.endDate || document.getElementById("analyticsEndDate")?.value || "2026-10-31";
        q += `&startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
      } else if (period === "year") {
        const y = filterParams.year || document.getElementById("analyticsYearSelect")?.value || "2026";
        q += `&year=${encodeURIComponent(y)}`;
      } else {
        const m = filterParams.month || document.getElementById("analyticsMonthInput")?.value || "2026-10";
        q += `&month=${encodeURIComponent(m)}`;
      }

      const noticeEl = document.getElementById("analyticsFilterNotice");
      if (noticeEl) noticeEl.textContent = "Đang tải dữ liệu...";

      const data = await api(`/analytics${q}`);
      state.analytics = data;

      const sum = data.summary || {};
      const elRev = document.getElementById("analyticsTotalRevenue");
      const elCost = document.getElementById("analyticsTotalCost");
      const elProfit = document.getElementById("analyticsEstimatedProfit");
      const elComp = document.getElementById("analyticsCompletedOrders");

      if (elRev) elRev.textContent = formatMoney(sum.totalRevenue);
      if (elCost) elCost.textContent = formatMoney(sum.totalCost);
      if (elProfit) elProfit.textContent = formatMoney(sum.estimatedProfit);
      if (elComp) elComp.textContent = (sum.completedOrders || 0).toLocaleString("vi-VN");

      if (noticeEl) {
        if (period === "day") {
          noticeEl.textContent = `Khoảng ngày: ${document.getElementById("analyticsStartDate")?.value || '2026-09-01'} đến ${document.getElementById("analyticsEndDate")?.value || '2026-10-31'}`;
        } else if (period === "year") {
          noticeEl.textContent = `Năm: ${document.getElementById("analyticsYearSelect")?.value || 2026}`;
        } else {
          noticeEl.textContent = `Tháng: ${document.getElementById("analyticsMonthInput")?.value || '2026-10'}`;
        }
      }

      // Render biểu đồ cột doanh thu trực quan kèm trục tung, trục hoành và nhãn số tiền
      renderRevenueBarChart(data.revenueByPeriod || data.revenueByMonth || {}, period, sum.totalRevenue);

      // Render biểu đồ tròn tỷ lệ trạng thái đơn hàng
      renderDonutChart(data.statusCounts);

      // Render bảng số liệu chi tiết
      renderBreakdownTable(data.breakdown, period);

      // Render top sản phẩm bán chạy
      const topProdBox = document.getElementById("analyticsTopProducts");
      if (topProdBox && data.topProducts) {
        topProdBox.innerHTML = buildRowHeader(["Top", "Sản phẩm", "Số lượng bán", "Doanh thu tạo ra"]) +
          data.topProducts.map((p, idx) => `
            <div class="admin-row" style="grid-template-columns: 60px 2fr 1fr 1fr;">
              <strong>#${idx + 1}</strong>
              <span>${p.name}</span>
              <span><strong>${p.quantity}</strong> chiếc</span>
              <strong style="color:var(--admin-green);">${formatMoney(p.revenue)}</strong>
            </div>
          `).join("");
      }
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
      toast("Lỗi tải thống kê: " + err.message, "error");
    }
  }

  // ---------- MODAL POPUP TIỆN ÍCH ----------
  function showModal(title, html) {
    const backdrop = document.getElementById("detailModal");
    const titleEl = document.getElementById("modalTitle");
    const bodyEl = document.getElementById("modalBody");
    if (!backdrop || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = html;
    backdrop.hidden = false;
  }

  const modalClose = document.getElementById("modalCloseBtn");
  if (modalClose) {
    modalClose.addEventListener("click", () => {
      const backdrop = document.getElementById("detailModal");
      if (backdrop) backdrop.hidden = true;
    });
  }

  // ---------- CHUYỂN TAB & ROUTING ----------
  window.switchTab = (moduleName) => {
    const navItems = document.querySelectorAll(".admin-nav-item");
    navItems.forEach((item) => {
      const href = item.getAttribute("href") || "";
      if (href.replace("#", "") === moduleName) {
        item.classList.add("is-active");
      } else {
        item.classList.remove("is-active");
      }
    });

    const modules = document.querySelectorAll(".admin-module");
    modules.forEach((m) => {
      if (m.getAttribute("data-module") === moduleName) {
        m.removeAttribute("hidden");
        m.classList.add("active");
      } else {
        m.setAttribute("hidden", "hidden");
        m.classList.remove("active");
      }
    });

    // Cập nhật tiêu đề Topbar
    const titles = {
      overview: { eyebrow: "BẢNG ĐIỀU KHIỂN", title: "Tổng quan cửa hàng" },
      accounts: { eyebrow: "HỆ THỐNG", title: "1. Quản lý tài khoản & vai trò" },
      staff: { eyebrow: "NHÂN SỰ", title: "2. Quản lý nhân viên" },
      customers: { eyebrow: "KHÁCH HÀNG", title: "3. Quản lý khách hàng" },
      products: { eyebrow: "SẢN PHẨM", title: "4. Quản lý sản phẩm" },
      invoices: { eyebrow: "HÓA ĐƠN", title: "5. Quản lý hóa đơn" },
      promotions: { eyebrow: "KHUYẾN MÃI", title: "6. Quản lý khuyến mãi" },
      orders: { eyebrow: "ĐƠN HÀNG", title: "7. Quản lý đơn đặt hàng" },
      stock: { eyebrow: "KHO HÀNG", title: "8. Quản lý nhập hàng" },
      suppliers: { eyebrow: "ĐỐI TÁC", title: "9. Quản lý nhà cung cấp" },
      analytics: { eyebrow: "BÁO CÁO", title: "10. Thống kê & Phân tích" },
    };
    const t = titles[moduleName] || titles.overview;
    const eb = document.getElementById("topbarEyebrow");
    const tt = document.getElementById("topbarTitle");
    if (eb) eb.textContent = t.eyebrow;
    if (tt) tt.textContent = t.title;

    // Kích hoạt load dữ liệu
    switch (moduleName) {
      case "overview": loadOverview(); break;
      case "accounts": loadAccounts(); loadUnlockRequests(); break;
      case "staff": loadStaff(); break;
      case "customers": loadCustomers(); loadUnlockRequests(); break;
      case "products": loadProducts(); break;
      case "invoices": loadInvoices(); break;
      case "promotions": loadPromotions(); break;
      case "orders": loadOrders(); break;
      case "stock": loadStock(); break;
      case "suppliers": loadSuppliers(); break;
      case "analytics": loadAnalytics(); break;
    }
  };

  // Lắng nghe click sidebar
  document.querySelectorAll(".admin-nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = item.getAttribute("href")?.replace("#", "") || "overview";
      history.pushState(null, "", "#" + target);
      switchTab(target);
    });
  });

  // Nút làm mới dữ liệu
  const refreshBtn = document.getElementById("refreshDataBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      const hash = window.location.hash.replace("#", "") || "overview";
      switchTab(hash);
      loadUnlockRequests();
      toast("Đã đồng bộ dữ liệu mới nhất từ Supabase!");
    });
  }

  // Nút mở modal danh sách yêu cầu mở khóa (Topbar)
  const openUnlockBtn = document.getElementById("openUnlockRequestsBtn");
  if (openUnlockBtn) {
    openUnlockBtn.addEventListener("click", () => {
      showUnlockRequestsModal();
    });
  }

  // Nút làm mới danh sách yêu cầu mở khóa (trong module Accounts)
  const refreshUnlockBtn = document.getElementById("refreshUnlockRequestsBtn");
  if (refreshUnlockBtn) {
    refreshUnlockBtn.addEventListener("click", () => {
      loadUnlockRequests();
      toast("Đã làm mới danh sách yêu cầu mở khóa!");
    });
  }

  // ---------- SUBMIT CÁC FORM CRUD ----------
  // 1. Account Form
  const accountForm = document.getElementById("accountForm");
  if (accountForm) {
    accountForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(accountForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        password: fd.get("password") || undefined,
        role: fd.get("role"),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/accounts/${id}`, { method: "PUT", body });
          if (body.status !== undefined) {
            broadcast("ACCOUNT_CHANGED", { userId: id, email: body.email, isActive: body.status === "Hoạt động" });
          }
          toast("Đã cập nhật tài khoản trên Supabase!");
        } else {
          await api("/accounts", { method: "POST", body });
          toast("Đã thêm tài khoản mới vào Supabase!");
        }
        accountForm.reset();
        accountForm.querySelector('[name="id"]').value = "";
        document.getElementById("accountFormTitle").textContent = "Thêm tài khoản mới";
        loadAccounts();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 2. Staff Form
  const staffForm = document.getElementById("staffForm");
  if (staffForm) {
    staffForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(staffForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        position: fd.get("position"),
        address: fd.get("address"),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/staff/${id}`, { method: "PUT", body });
          toast("Đã cập nhật nhân viên!");
        } else {
          await api("/staff", { method: "POST", body });
          toast("Đã thêm nhân viên mới!");
        }
        staffForm.reset();
        staffForm.querySelector('[name="id"]').value = "";
        document.getElementById("staffFormTitle").textContent = "Thêm nhân viên";
        loadStaff();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 3. Customer Form
  const customerForm = document.getElementById("customerForm");
  if (customerForm) {
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(customerForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        dob: fd.get("dob") || null,
        address: fd.get("address"),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/customers/${id}`, { method: "PUT", body });
          if (body.status !== undefined) {
            broadcast("ACCOUNT_CHANGED", { userId: id, email: body.email, isActive: body.status === "Hoạt động" });
          }
          toast("Đã cập nhật khách hàng!");
        } else {
          await api("/customers", { method: "POST", body });
          toast("Đã tạo khách hàng mới!");
        }
        customerForm.reset();
        customerForm.querySelector('[name="id"]').value = "";
        loadCustomers();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 4. Product Form
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(productForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        categoryId: fd.get("categoryId"),
        price: Number(fd.get("price")),
        stock: Number(fd.get("stock")),
        image: fd.get("image"),
        description: fd.get("description"),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/products/${id}`, { method: "PUT", body });
          toast("Đã cập nhật sản phẩm!");
        } else {
          await api("/products", { method: "POST", body });
          toast("Đã thêm sản phẩm mới vào kho!");
        }
        productForm.reset();
        productForm.querySelector('[name="id"]').value = "";
        document.getElementById("productFormTitle").textContent = "Thông tin sản phẩm";
        loadProducts();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 5. Invoice Form
  const invoiceForm = document.getElementById("invoiceForm");
  if (invoiceForm) {
    invoiceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(invoiceForm);
      const body = {
        customer: fd.get("customer"),
        phone: fd.get("phone"),
        address: fd.get("address"),
        amount: Number(fd.get("amount")),
        vatRate: Number(fd.get("vatRate") || 8),
      };
      try {
        await api("/invoices", { method: "POST", body });
        toast("Đã lưu hóa đơn thành công!");
        invoiceForm.reset();
        loadInvoices();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 6. Promotion Form
  const promotionForm = document.getElementById("promotionForm");
  if (promotionForm) {
    promotionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(promotionForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        code: fd.get("code"),
        discount: Number(fd.get("discount")),
        beginDate: fd.get("beginDate") || null,
        endDate: fd.get("endDate") || null,
        usageLimit: Number(fd.get("usageLimit") || 100),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/promotions/${id}`, { method: "PUT", body });
          toast("Đã cập nhật chương trình khuyến mãi!");
        } else {
          await api("/promotions", { method: "POST", body });
          toast("Đã tạo chương trình ưu đãi mới!");
        }
        promotionForm.reset();
        promotionForm.querySelector('[name="id"]').value = "";
        document.getElementById("promotionFormTitle").textContent = "Chương trình khuyến mãi";
        loadPromotions();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 7. Order Form (Update Status)
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(orderForm);
      const id = fd.get("id");
      if (!id) return;
      try {
        await api(`/orders/${id}/status`, {
          method: "PUT",
          body: { status: fd.get("status") },
        });
        toast("Đã cập nhật trạng thái đơn hàng!");
        broadcast("ORDER_STATUS_CHANGED", {
          orderId: Number(id),
          status: fd.get("status"),
        });
        orderForm.reset();
        loadOrders();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 8. Stock Form (Tạo phiếu nhập)
  const stockForm = document.getElementById("stockForm");
  if (stockForm) {
    stockForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(stockForm);
      const body = {
        supplierId: fd.get("supplierId"),
        productId: fd.get("productId"),
        quantity: Number(fd.get("quantity")),
        amount: Number(fd.get("amount")),
        date: fd.get("date") || null,
        note: fd.get("note"),
      };
      try {
        await api("/receipts", { method: "POST", body });
        toast("Đã tạo phiếu nhập & tự động cộng tồn kho thành công!");
        stockForm.reset();
        loadStock();
        loadProducts();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // Lắng nghe đổi tab bộ lọc Thống kê (Tháng / Ngày / Năm)
  const periodTabBtns = document.querySelectorAll(".analytics-tab-btn");
  periodTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      periodTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const period = btn.getAttribute("data-period");
      currentAnalyticsPeriod = period;

      const groupMonth = document.getElementById("filterGroupMonth");
      const groupDay = document.getElementById("filterGroupDay");
      const groupYear = document.getElementById("filterGroupYear");

      if (groupMonth) groupMonth.style.display = period === "month" ? "flex" : "none";
      if (groupDay) groupDay.style.display = period === "day" ? "flex" : "none";
      if (groupYear) groupYear.style.display = period === "year" ? "flex" : "none";

      loadAnalytics({ period });
    });
  });

  // Lắng nghe nút "Lọc dữ liệu"
  const analyticsApplyBtn = document.getElementById("analyticsApplyBtn");
  if (analyticsApplyBtn) {
    analyticsApplyBtn.addEventListener("click", () => {
      loadAnalytics({ period: currentAnalyticsPeriod });
    });
  }

  // 9. Supplier Form
  const supplierForm = document.getElementById("supplierForm");
  if (supplierForm) {
    supplierForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(supplierForm);
      const id = fd.get("id");
      const body = {
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
        address: fd.get("address"),
        status: fd.get("status"),
      };
      try {
        if (id) {
          await api(`/suppliers/${id}`, { method: "PUT", body });
          toast("Đã cập nhật nhà cung cấp!");
        } else {
          await api("/suppliers", { method: "POST", body });
          toast("Đã thêm nhà cung cấp mới!");
        }
        supplierForm.reset();
        supplierForm.querySelector('[name="id"]').value = "";
        document.getElementById("supplierFormTitle").textContent = "Thông tin nhà cung cấp";
        loadSuppliers();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // Lắng nghe tìm kiếm trên các bảng
  const binds = [
    ["accountSearch", (val) => renderAccountsTable(val)],
    ["staffSearch", (val) => renderStaffTable(val)],
    ["customerSearch", (val) => renderCustomersTable(val)],
    ["productSearch", (val) => renderProductsTable(val)],
    ["invoiceSearch", (val) => renderInvoicesTable(val)],
    ["promotionSearch", (val) => renderPromotionsTable(val)],
    ["orderSearch", (val) => renderOrdersTable(val)],
    ["stockSearch", (val) => renderStockTable(val)],
    ["supplierSearch", (val) => renderSuppliersTable(val)],
  ];
  const debounce = (fn, delay = 180) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };
  binds.forEach(([id, fn]) => {
    const input = document.getElementById(id);
    if (input) {
      const debounced = debounce(fn, 180);
      input.addEventListener("input", (e) => debounced(e.target.value));
    }
  });

  // Nút Thêm mới (reset form)
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-add");
      const form = document.querySelector(`form#${type.replace(/s$/, "")}Form`) || document.getElementById(`${type}Form`);
      if (form) {
        form.reset();
        const idInp = form.querySelector('[name="id"]');
        if (idInp) idInp.value = "";
        const title = form.querySelector("h3");
        if (title) title.textContent = "Thêm mới";
      }
    });
  });

  // Nút Hủy / Reset
  document.querySelectorAll("[data-reset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-reset");
      const form = document.querySelector(`form#${type.replace(/s$/, "")}Form`) || document.getElementById(`${type}Form`);
      if (form) {
        form.reset();
        const idInp = form.querySelector('[name="id"]');
        if (idInp) idInp.value = "";
      }
    });
  });

  // ---------- ÂM THANH THÔNG BÁO TỨC THÌ ----------
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  }

  // ---------- KẾT NỐI THỜI GIAN THỰC (REALTIME SSE & BROADCASTCHANNEL) ----------
  const realtimeChannel = typeof window.BroadcastChannel !== "undefined" ? new BroadcastChannel("jewels_realtime") : null;

  function broadcast(type, data = {}) {
    if (realtimeChannel) {
      try { realtimeChannel.postMessage({ type, data, timestamp: Date.now() }); } catch {}
    }
  }

  function handleAdminRealtime(type, data) {
    console.log("⚡ Admin Realtime Event:", type, data);

    switch (type) {
      case "ORDER_CREATED": {
        playNotificationChime();
        toast(`🔔 Khách vừa đặt đơn mới! #${data.orderId} - ${formatMoney(data.total)} (${data.customer || "Khách hàng"})`, "success");
        loadOverview();
        loadOrders();
        loadStock(); // trừ kho
        break;
      }
      case "ORDER_CANCELLED": {
        toast(`⚠️ Đơn hàng #${data.orderId} đã bị khách hàng hủy!`, "error");
        loadOverview();
        loadOrders();
        loadStock(); // hoàn kho
        break;
      }
      case "ORDER_STATUS_CHANGED": {
        loadOrders();
        loadOverview();
        break;
      }
      case "PRODUCT_CHANGED": {
        loadProducts();
        loadOverview();
        break;
      }
      case "STOCK_CHANGED": {
        loadStock();
        loadProducts();
        loadOverview();
        break;
      }
      case "PROMOTION_CHANGED": {
        loadPromotions();
        break;
      }
      case "INVOICE_CHANGED": {
        loadInvoices();
        loadOverview();
        break;
      }
      case "ACCOUNT_CHANGED":
      case "CUSTOMER_CHANGED": {
        loadAccounts();
        loadCustomers();
        loadUnlockRequests();
        break;
      }
      case "UNLOCK_REQUEST": {
        toast(`🔔 [Yêu cầu mở khóa] Khách hàng ${data.name || data.email || ""} vừa gửi yêu cầu xin mở lại tài khoản!`, "warning");
        loadUnlockRequests();
        loadAccounts();
        loadCustomers();
        break;
      }
      case "UNLOCK_APPROVED": {
        toast(`✅ Tài khoản ${data.email || ""} đã được mở khóa thành công.`, "success");
        loadUnlockRequests();
        loadAccounts();
        loadCustomers();
        break;
      }
      case "UNLOCK_REJECTED": {
        loadUnlockRequests();
        break;
      }
    }
  }

  // 1. Lắng nghe tab Client cùng trình duyệt qua BroadcastChannel
  if (realtimeChannel) {
    realtimeChannel.onmessage = (event) => {
      const { type, data } = event.data || {};
      if (type) handleAdminRealtime(type, data);
    };
  }

  // 2. Lắng nghe server qua SSE (Server-Sent Events)
  function initAdminSse() {
    try {
      const es = new EventSource("/api/realtime/events");
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type && payload.type !== "CONNECTED") {
            handleAdminRealtime(payload.type, payload.data);
          }
        } catch {}
      };
      es.onerror = () => {
        es.close();
        setTimeout(initAdminSse, 4000);
      };
    } catch {}
  }
  initAdminSse();

  // Khởi động trang theo hash hiện tại
  const initialHash = window.location.hash.replace("#", "") || "overview";
  switchTab(initialHash);
  loadUnlockRequests();
  window.addEventListener("popstate", () => {
    const h = window.location.hash.replace("#", "") || "overview";
    switchTab(h);
    loadUnlockRequests();
  });
})();
