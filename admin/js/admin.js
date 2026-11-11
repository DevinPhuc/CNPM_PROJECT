/**
 * Jewels Admin Panel - Quản trị 10 chức năng kết nối Supabase
 */
(() => {
  "use strict";

  const ADMIN_SESSION_KEY = "jewels-admin-session";

  // Kiểm tra phiên đăng nhập admin (ưu tiên sessionStorage)
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY) || "null");
  } catch { }

  if (!session || !session.token) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.replace("login.html");
    return;
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
          sessionStorage.removeItem(ADMIN_SESSION_KEY);
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
      if (res.status === 401) {
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        window.location.replace("login.html");
        return;
      }
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
      const secs = String(dt.getSeconds()).padStart(2, "0");
      return `${hours}:${mins}:${secs} ${day}/${month}/${year}`;
    } catch {
      return String(d);
    }
  };

  // Helper hiển thị thời gian có giờ:phút:giây và nhận diện đơn/hóa đơn trong ngày hôm nay
  const formatTableDateTime = (d) => {
    if (!d) return "--";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const now = new Date();
      const isToday = dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      const hours = String(dt.getHours()).padStart(2, "0");
      const mins = String(dt.getMinutes()).padStart(2, "0");
      const secs = String(dt.getSeconds()).padStart(2, "0");

      const timeStr = `${hours}:${mins}:${secs}`;
      const dateStr = `${day}/${month}/${year}`;

      if (isToday) {
        return `<span style="display:inline-flex; align-items:center; gap:4px; font-weight:800; color:#047857; font-size:12px;"><span style="background:#ecfdf5; color:#065f46; font-size:10px; font-weight:800; padding:1px 5px; border-radius:3px; border:1px solid #a7f3d0;">Hôm nay</span>${timeStr}</span><br><small style="color:#64748b; font-size:11px;">${dateStr}</small>`;
      }
      return `<span style="color:#1e293b; font-weight:700; font-size:12px;">${timeStr}</span><br><small style="color:#64748b; font-size:11px;">${dateStr}</small>`;
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
          const sortedRecent = (data.recentOrders || []).slice().sort((a, b) => {
            const getPrio = (s) => {
              const str = String(s || "").toLowerCase();
              if (str.includes("chờ") || str === "pending") return 1;
              if (str.includes("xác nhận") || str === "processing") return 2;
              if (str.includes("giao") || str === "shipped") return 3;
              if (str.includes("thành công") || str === "delivered") return 4;
              return 5;
            };
            const diff = getPrio(a.status) - getPrio(b.status);
            if (diff !== 0) return diff;
            return new Date(b.date || 0) - new Date(a.date || 0);
          });
          ordersBox.innerHTML = buildRowHeader(["Mã đơn", "Khách hàng", "Tổng tiền", "Trạng thái", "Ngày tạo"], grid) +
            sortedRecent.map((o) => `
              <div class="admin-row" style="grid-template-columns: ${grid};">
                <strong>${o.code}</strong>
                <span>${o.customer}</span>
                <span style="color:var(--admin-green); font-weight:600;">${formatMoney(o.total)}</span>
                <span>${renderStatusBadge(o.status)}</span>
                <div style="line-height:1.3;">${formatTableDateTime(o.date)}</div>
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

    // Sắp xếp trạng thái hiện hữu (Hoạt động) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const isActA = Boolean(a.isActive || a.status === "Hoạt động" || a.status === "Đang hoạt động");
      const isActB = Boolean(b.isActive || b.status === "Hoạt động" || b.status === "Đang hoạt động");
      if (isActA !== isActB) return isActA ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

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
    openFormModal("accountsModal");
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

    const list = (state.unlockRequests || []).slice().sort((a, b) => {
      const prioA = a.status === "pending" ? 1 : 2;
      const prioB = b.status === "pending" ? 1 : 2;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
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

    // Sắp xếp trạng thái hiện hữu (Đang làm việc / Làm việc) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const isActA = Boolean(a.isActive || a.status === "Làm việc" || a.status === "Đang làm việc");
      const isActB = Boolean(b.isActive || b.status === "Làm việc" || b.status === "Đang làm việc");
      if (isActA !== isActB) return isActA ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

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
    openFormModal("staffModal");
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

    // Sắp xếp trạng thái hiện hữu (Hoạt động) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const isActA = Boolean(a.isActive || a.status === "Hoạt động" || a.status === "Đang hoạt động");
      const isActB = Boolean(b.isActive || b.status === "Hoạt động" || b.status === "Đang hoạt động");
      if (isActA !== isActB) return isActA ? -1 : 1;
      return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
    });

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
    const dobInput = form.querySelector('[name="dob"]');
    const maxYear = new Date().getFullYear() - 18;
    if (dobInput) {
      dobInput.min = "1900-01-01";
      dobInput.max = `${maxYear}-12-31`;
    }
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;
    form.querySelector('[name="email"]').value = item.email;
    form.querySelector('[name="phone"]').value = item.phone || "";
    if (dobInput) {
      let dobVal = item.dob || "";
      const m = String(dobVal).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m && parseInt(m[1], 10) > maxYear) dobVal = `${maxYear}-${m[2]}-${m[3]}`;
      dobInput.value = dobVal;
    }
    form.querySelector('[name="address"]').value = item.address || "";
    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("customerFormTitle").textContent = "Cập nhật khách hàng";
    openFormModal("customersModal");
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
            const sortedOverviewProducts = products.slice().sort((a, b) => {
              const getPrio = (p) => {
                const s = String(p.status || "").toLowerCase();
                if (s.includes("mở bán") || (p.isActive && p.stock > 0)) return 1;
                if (s.includes("hết hàng") || (p.isActive && p.stock <= 0)) return 2;
                return 3;
              };
              const diff = getPrio(a) - getPrio(b);
              if (diff !== 0) return diff;
              return (b.id || 0) - (a.id || 0);
            });
            overviewBox.innerHTML = buildRowHeader(["Ảnh", "Tên sản phẩm", "Danh mục", "Đơn giá", "Số lượng tồn", "Tình trạng kho", "Thao tác"], grid) +
              sortedOverviewProducts.slice(0, 6).map((p) => {
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

    // Sắp xếp trạng thái hiện hữu (Đang mở bán) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const getPrio = (p) => {
        const s = String(p.status || "").toLowerCase();
        if (s.includes("mở bán") || (p.isActive && p.stock > 0)) return 1;
        if (s.includes("hết hàng") || (p.isActive && p.stock <= 0)) return 2;
        return 3;
      };
      const diff = getPrio(a) - getPrio(b);
      if (diff !== 0) return diff;
      return (b.id || 0) - (a.id || 0);
    });

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
    openFormModal("productsModal");
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
      const panel = document.getElementById("invoiceDetailPanel");
      if (panel) {
        panel.innerHTML = `
          <div class="admin-detail-placeholder">
            <span style="font-size:36px; display:block; margin-bottom:12px;">🧾</span>
            <h4>Không có hóa đơn</h4>
            <p>Không tìm thấy hóa đơn phù hợp với điều kiện tìm kiếm.</p>
          </div>
        `;
      }
      return;
    }

    // Tự động chọn hóa đơn đầu tiên nếu chưa chọn hoặc id không tồn tại trong danh sách
    if (!state.selectedInvoiceId || !rows.some((r) => r.id === state.selectedInvoiceId)) {
      state.selectedInvoiceId = rows[0].id;
    }

    const grid = "minmax(90px, 1fr) minmax(130px, 1.3fr) minmax(105px, 1fr) minmax(120px, 1.2fr) minmax(90px, 0.9fr) minmax(110px, 1.1fr)";
    table.innerHTML = buildRowHeader(["Mã HĐ", "Khách hàng", "Số điện thoại", "Ngày xuất", "Thuế VAT", "Tổng tiền"], grid) +
      rows.map((item) => `
        <div class="admin-row clickable-row ${state.selectedInvoiceId === item.id ? 'selected-row' : ''}"
             id="invoice-row-${item.id}"
             onclick="selectInvoiceRow(${item.id})"
             style="grid-template-columns: ${grid};">
          <strong>${item.code}</strong>
          <span>${item.customer}</span>
          <span>${item.phone || "--"}</span>
          <div style="line-height:1.3;">${formatTableDateTime(item.date)}</div>
          <small style="color:#666;">${formatMoney(item.vatAmount)}</small>
          <strong style="color:var(--admin-green);">${formatMoney(item.amount)}</strong>
        </div>
      `).join("");

    renderInvoiceDetailPanel(state.selectedInvoiceId);
  }

  window.selectInvoiceRow = (id) => {
    state.selectedInvoiceId = id;
    const allRows = document.querySelectorAll("#invoicesTable .admin-row");
    allRows.forEach((r) => r.classList.remove("selected-row"));
    const activeRow = document.getElementById(`invoice-row-${id}`);
    if (activeRow) activeRow.classList.add("selected-row");
    renderInvoiceDetailPanel(id);
  };

  window.renderInvoiceDetailPanel = (id) => {
    const panel = document.getElementById("invoiceDetailPanel");
    if (!panel) return;
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) {
      panel.innerHTML = `
        <div class="admin-detail-placeholder">
          <span style="font-size:36px; display:block; margin-bottom:12px;">🧾</span>
          <h4>Chi tiết hóa đơn</h4>
          <p>Nhấp vào một dòng trong bảng bên cạnh để xem toàn bộ thông tin chi tiết hóa đơn.</p>
        </div>
      `;
      return;
    }

    const items = inv.items || [];
    const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

    panel.innerHTML = `
      <div class="side-detail-content">
        ${inv.isVoided || String(inv.status).includes("thu hồi") || String(inv.status).includes("Hoàn tiền") ? `
          <div style="background:#fff1f2; border:1.5px solid #fecdd3; border-left:4px solid #e11d48; border-radius:8px; padding:10px 14px; margin-bottom:12px; color:#9f1239; font-size:12px; line-height:1.5;">
            <strong>⚠️ HÓA ĐƠN ĐÃ THU HỒI / HỦY BỎ</strong><br>
            Đơn hàng này đã được khách hàng trả lại sản phẩm. Hóa đơn không còn giá trị lưu hành và đã hoàn tiền cho khách.
          </div>
        ` : ''}
        <div class="side-detail-header" style="align-items: flex-start; margin-bottom: 14px;">
          <div>
            <span class="detail-badge" style="background:${inv.isVoided ? '#fee2e2' : '#fef3c7'}; color:${inv.isVoided ? '#991b1b' : '#92400e'}; font-weight:700;">
              ${inv.isVoided ? 'HÓA ĐƠN ĐÃ THU HỒI' : 'HÓA ĐƠN BÁN HÀNG'}
            </span>
            <h3 style="margin: 6px 0 2px 0; font-size: 22px; font-weight: 800; color:${inv.isVoided ? '#991b1b' : '#14532d'}; letter-spacing:0.5px;">${inv.code}</h3>
            <small style="color: #64748b; font-size: 12px; display:block; margin-top:2px;">Ngày tạo: <strong>${formatDateTime(inv.date)}</strong></small>
          </div>
          ${inv.isVoided || String(inv.status).includes("thu hồi") ? `
            <span class="table-tag" style="background:#f3e8ff; color:#7c3aed; font-size:12px; font-weight:800; padding:5px 10px; border-radius:6px; border:1px solid #ddd6fe;">
              ↩️ Đã hoàn tiền
            </span>
          ` : `
            <span class="table-tag" style="background:#ecfdf5; color:#047857; font-size:12px; font-weight:700; padding:5px 10px; border-radius:6px; border:1px solid #a7f3d0;">
              ✓ Đã thanh toán
            </span>
          `}
        </div>

        <div style="margin-bottom: 16px; padding: 12px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">Thông tin khách hàng</h4>
          <div style="display: grid; gap: 5px; font-size: 13px;">
            <div style="display:flex; justify-content:space-between;"><span style="color:#64748b;">Khách hàng:</span> <strong style="color:#0f172a;">${inv.customer}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span style="color:#64748b;">Điện thoại:</span> <strong style="color:#1e293b;">${inv.phone || "Không có SĐT"}</strong></div>
            <div style="display:flex; justify-content:space-between; gap:12px;"><span style="color:#64748b; flex-shrink:0;">Địa chỉ:</span> <span style="color:#334155; text-align:right; word-break:break-word;">${inv.address || "Mua trực tiếp tại showroom"}</span></div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; font-size:12.5px; font-weight:800; text-transform:uppercase; color:#334155; letter-spacing:0.5px;">
              Chi tiết mặt hàng (${items.length} món)
            </h4>
            <span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700; font-size:11.5px; padding:3px 9px; border-radius:12px;">
              Tổng: ${totalQuantity} sản phẩm
            </span>
          </div>

          <div style="display:grid; gap:8px;">
            ${(items.length > 0) ? items.map((it) => {
              const subtotalNum = it.subtotal || (it.quantity * (it.unit_price || 0));
              return `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:10px;">
                    <strong style="font-size:13.5px; color:#0f172a; line-height:1.4; flex:1;">${it.product_name || "Trang sức cao cấp"}</strong>
                    <div style="text-align:right; flex-shrink:0;">
                      <span style="font-size:11px; color:#64748b; margin-right:4px;">Thành tiền:</span>
                      <strong style="font-size:15px; font-weight:800; color:#b45309; letter-spacing:0.2px;">${formatMoney(subtotalNum)}</strong>
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:6px 10px; border-radius:6px; border:1px solid #f1f5f9; font-size:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="display:inline-flex; align-items:center; background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-weight:800; font-size:11.5px; padding:2px 8px; border-radius:4px;">
                        SL: ${it.quantity}
                      </span>
                      ${it.unit_price ? `
                        <span style="color:#64748b;">
                          Đơn giá: <strong style="color:#1e293b; font-weight:700;">${formatMoney(it.unit_price)}</strong>
                        </span>
                      ` : ''}
                    </div>
                    <span style="font-size:11px; color:#94a3b8; font-style:italic;">Chính hãng Jewels</span>
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="color: #64748b; font-size: 12px; font-style: italic; padding: 12px; text-align: center; background:#f8fafc; border-radius:8px;">
                Hóa đơn dịch vụ / Mua sắm lẻ tại quầy
              </div>
            `}
          </div>
        </div>

        <div style="display:grid; gap:7px; font-size:13px; padding-top:12px; border-top:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; color:#475569;">
            <span>Tạm tính tiền hàng:</span>
            <strong style="color:#0f172a; font-size:13.5px;">${formatMoney(inv.subtotal)}</strong>
          </div>
          ${inv.discountAmount > 0 ? `
            <div style="display:flex; justify-content:space-between; color:#15803d;">
              <span>Chiết khấu Voucher:</span>
              <strong style="font-size:13.5px; color:#15803d;">-${formatMoney(inv.discountAmount)}</strong>
            </div>
          ` : ''}
          
          <div style="display:flex; justify-content:space-between; color:#475569;">
            <span>Phí vận chuyển:</span>
            <strong style="color:${inv.shippingFee > 0 ? '#0f172a' : '#15803d'}; font-size:13.5px;">
              ${inv.shippingFee > 0 ? formatMoney(inv.shippingFee) : 'Miễn phí'}
            </strong>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1.5px solid #10b981; border-radius:8px; padding:11px 14px; margin-top:6px; box-shadow:0 1px 3px rgba(16,185,129,0.1);">
            <span style="font-size:13px; font-weight:800; color:#065f46; text-transform:uppercase; letter-spacing:0.5px;">
              Tổng cộng thanh toán:
            </span>
            <strong style="font-size:19px; font-weight:900; color:#047857;">
              ${formatMoney(inv.amount)}
            </strong>
          </div>
          <div style="text-align:right; font-size:11.5px; color:#64748b; font-style:italic; margin-top:4px;">
            (Đã bao gồm thuế VAT)
          </div>
        </div>

        <div style="margin-top: 18px; display: flex; gap: 8px;">
          <button type="button" class="admin-primary-btn" style="flex: 1; padding: 10px 14px; font-size: 13px; font-weight:700; justify-content: center; gap: 6px; box-shadow:0 2px 4px rgba(34,76,48,0.2);" onclick="printInvoiceDetail(${inv.id})">
            🖨️ In hóa đơn điện tử
          </button>
        </div>
      </div>
    `;
  };

  window.printInvoiceDetail = (id) => {
    const inv = state.invoices.find((i) => i.id === id);
    if (!inv) return;
    const printWindow = window.open("", "_blank", "width=800,height=700");
    if (!printWindow) {
      alert("Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hóa đơn ${inv.code}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #222; }
          .inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #b98a3e; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { font-size: 22px; font-weight: 700; color: #1b382b; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #f8f6f0; }
          .text-right { text-align: right; }
          .total-box { margin-top: 20px; float: right; width: 320px; }
          .total-box div { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
          .total-final { font-size: 16px; font-weight: 700; color: #1b382b; border-top: 1px solid #333; margin-top: 6px; padding-top: 6px; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="inv-header">
          <div>
            <div class="logo">SAIGON JEWELRY</div>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Trụ sở chính: TP. Hồ Chí Minh | MST: 0312345678</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 18px; color: #b98a3e;">HÓA ĐƠN BÁN HÀNG</h2>
            <p style="margin: 4px 0; font-weight: 600;">Số: ${inv.code}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Ngày: ${formatDate(inv.date)}</p>
          </div>
        </div>
        <div>
          <p><strong>Khách hàng:</strong> ${inv.customer}</p>
          <p><strong>Số điện thoại:</strong> ${inv.phone || '--'}</p>
          <p><strong>Địa chỉ:</strong> ${inv.address || 'Tại quầy'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mặt hàng</th>
              <th class="text-right">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${(inv.items && inv.items.length) ? inv.items.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${it.product_name || "Trang sức cao cấp"}</td>
                <td class="text-right">${it.quantity}</td>
                <td class="text-right">${formatMoney(it.unit_price || it.subtotal / it.quantity)}</td>
                <td class="text-right">${formatMoney(it.subtotal || it.quantity * (it.unit_price || 0))}</td>
              </tr>
            `).join('') : `
              <tr>
                <td>1</td>
                <td>Sản phẩm trang sức mua lẻ tại quầy</td>
                <td class="text-right">1</td>
                <td class="text-right">${formatMoney(inv.amount - (inv.vatAmount || 0))}</td>
                <td class="text-right">${formatMoney(inv.amount - (inv.vatAmount || 0))}</td>
              </tr>
            `}
          </tbody>
        </table>
        <div class="total-box">
          <div><span>Tạm tính tiền hàng:</span> <span>${formatMoney(inv.subtotal)}</span></div>
          ${inv.discountAmount > 0 ? `<div><span>Chiết khấu Voucher:</span> <span>-${formatMoney(inv.discountAmount)}</span></div>` : ''}
          
          <div><span>Phí vận chuyển:</span> <span>${inv.shippingFee > 0 ? formatMoney(inv.shippingFee) : 'Miễn phí'}</span></div>
          <div class="total-final"><span>Tổng cộng thanh toán:</span> <span>${formatMoney(inv.amount)}</span></div>
          <div style="text-align:right; font-size:11px; color:#64748b; font-style:italic; margin-top:3px;">
            (Đã bao gồm thuế VAT)
          </div>
        </div>
        <div style="clear: both; padding-top: 40px; text-align: center; color: #777; font-size: 12px;">
          <p>Cảm ơn quý khách đã tin tưởng và ủng hộ Saigon Jewelry!</p>
          <button onclick="window.print()" style="margin-top: 15px; padding: 8px 18px; cursor: pointer; background: #1b382b; color: #fff; border: none; border-radius: 4px;">In ngay</button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  window.viewInvoiceDetail = (id) => {
    selectInvoiceRow(id);
  };

  // ---------- 6. QUẢN LÝ KHUYẾN MÃI (3 LOẠI: THEO SẢN PHẨM, THEO VOUCHER, THEO HÓA ĐƠN) ----------
  state.currentPromoType = "all";

  window.filterPromotionType = (type) => {
    state.currentPromoType = type;
    document.querySelectorAll(".promo-filter-btn").forEach((btn) => {
      if (btn.getAttribute("data-promo-type") === type) btn.classList.add("active");
      else btn.classList.remove("active");
    });
    const searchVal = document.getElementById("promotionSearch")?.value || "";
    renderPromotionsTable(searchVal);
  };

  window.handlePromoTypeChange = (type) => {
    const fieldProd = document.getElementById("promoFieldProduct");
    const fieldVouch = document.getElementById("promoFieldVoucher");
    const fieldInv = document.getElementById("promoFieldInvoice");
    const codeInput = document.getElementById("promoCodeInput");
    const minInvInput = document.getElementById("promoMinInvoiceInput");
    const prodSelect = document.getElementById("promoProductSelect");

    if (fieldProd) fieldProd.style.display = type === "product" ? "block" : "none";
    if (fieldVouch) fieldVouch.style.display = (type === "voucher" || type === "invoice") ? "block" : "none";
    if (fieldInv) fieldInv.style.display = type === "invoice" ? "block" : "none";

    if (codeInput) {
      if (type === "product") codeInput.removeAttribute("required");
      else if (type === "voucher") codeInput.setAttribute("required", "required");
      else codeInput.removeAttribute("required");
    }

    if (prodSelect) {
      if (type === "product") prodSelect.setAttribute("required", "required");
      else prodSelect.removeAttribute("required");
    }

    if (minInvInput) {
      if (type === "invoice") minInvInput.setAttribute("required", "required");
      else minInvInput.removeAttribute("required");
    }
  };

  async function loadPromotions(keyword = "") {
    try {
      const [data, products] = await Promise.all([
        api("/promotions"),
        api("/products").catch(() => []),
      ]);
      state.promotions = data;
      state.products = products;

      // Đổ danh sách sản phẩm vào select của modal
      const prodSelect = document.getElementById("promoProductSelect");
      if (prodSelect && products && products.length > 0) {
        prodSelect.innerHTML = '<option value="">-- Chọn sản phẩm giảm giá --</option>' +
          products.map((p) => `<option value="${p.id}">${p.name} (${formatMoney(p.price)})</option>`).join("");
      }

      renderPromotionsTable(keyword);
    } catch (err) {
      toast("Lỗi tải khuyến mãi: " + err.message, "error");
    }
  }

  function renderPromotionsTable(keyword = "") {
    const table = document.getElementById("promotionsTable");
    if (!table) return;

    // Cập nhật số đếm theo từng loại
    const allCount = state.promotions.length;
    const prodCount = state.promotions.filter((p) => p.type === "product").length;
    const vouchCount = state.promotions.filter((p) => p.type === "voucher").length;
    const invCount = state.promotions.filter((p) => p.type === "invoice").length;

    const elAll = document.getElementById("countPromoAll");
    const elProd = document.getElementById("countPromoProduct");
    const elVouch = document.getElementById("countPromoVoucher");
    const elInv = document.getElementById("countPromoInvoice");
    if (elAll) elAll.textContent = allCount;
    if (elProd) elProd.textContent = prodCount;
    if (elVouch) elVouch.textContent = vouchCount;
    if (elInv) elInv.textContent = invCount;

    const filter = String(keyword || "").toLowerCase();
    const typeFilter = state.currentPromoType || "all";

    const rows = state.promotions.filter((p) => {
      const matchText = p.name.toLowerCase().includes(filter) ||
        (p.code && p.code.toLowerCase().includes(filter)) ||
        (p.productName && p.productName.toLowerCase().includes(filter));
      const matchType = typeFilter === "all" || p.type === typeFilter;
      return matchText && matchType;
    });

    // Sắp xếp trạng thái hiện hữu (Hoạt động) xếp trước
    rows.sort((a, b) => {
      const isActA = Boolean(a.isActive || a.status === "Hoạt động");
      const isActB = Boolean(b.isActive || b.status === "Hoạt động");
      if (isActA !== isActB) return isActA ? -1 : 1;
      return (b.id || 0) - (a.id || 0);
    });

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy chương trình khuyến mãi nào phù hợp</div>';
      const panel = document.getElementById("promotionDetailPanel");
      if (panel) {
        panel.innerHTML = `
          <div class="admin-detail-placeholder">
            <span style="font-size:36px; display:block; margin-bottom:12px;">🏷️</span>
            <h4>Không có chương trình ưu đãi</h4>
            <p>Không tìm thấy khuyến mãi nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        `;
      }
      return;
    }

    if (!state.selectedPromotionId || !rows.some((r) => r.id === state.selectedPromotionId)) {
      state.selectedPromotionId = rows[0].id;
    }

    const grid = "minmax(140px, 1.4fr) minmax(110px, 1.1fr) minmax(130px, 1.3fr) minmax(85px, 0.8fr) minmax(130px, 1.2fr) minmax(90px, 0.9fr) minmax(80px, 0.8fr)";
    table.innerHTML = buildRowHeader(["Chương trình", "Phân loại KM", "Áp dụng cho", "Mức giảm", "Thời gian", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => {
        let typeBadge = "";
        let applyTarget = "";

        if (item.type === "product") {
          typeBadge = '<span class="table-tag" style="background:#f3e8ff; color:#7e22ce; font-weight:700; border:1px solid #d8b4fe;">🏷️ Theo sản phẩm</span>';
          applyTarget = `<strong style="color:#6b21a8; font-size:12px;">💍 ${item.productName || 'Sản phẩm chỉ định'}</strong>`;
        } else if (item.type === "invoice") {
          typeBadge = '<span class="table-tag" style="background:#ecfdf5; color:#047857; font-weight:700; border:1px solid #a7f3d0;">🧾 Theo hóa đơn</span>';
          applyTarget = `<span>Đơn từ <strong>${formatMoney(item.minInvoiceAmount || 10000000)}</strong></span>`;
        } else {
          typeBadge = '<span class="table-tag" style="background:#fef3c7; color:#b45309; font-weight:700; border:1px solid #fde68a;">🎟️ Theo voucher</span>';
          applyTarget = `<span>Mã: <code style="background:#fdf6ec; border:1px solid #e7d6b8; padding:2px 6px; font-weight:700; color:var(--admin-gold);">${item.code}</code></span>`;
        }

        return `
          <div class="admin-row clickable-row ${state.selectedPromotionId === item.id ? 'selected-row' : ''}"
               id="promo-row-${item.id}"
               onclick="selectPromotionRow(${item.id})"
               style="grid-template-columns: ${grid}; align-items:center;">
            <div>
              <strong style="display:block; font-size:13px; color:var(--admin-dark);">${item.name}</strong>
              <small style="color:#777;">Mã: #KM-${item.id}</small>
            </div>
            <div>${typeBadge}</div>
            <div>${applyTarget}</div>
            <div><strong style="color:var(--admin-green); font-size:14px; font-weight:800;">Giảm ${item.discount}%</strong></div>
            <div><small style="color:#555;">${formatDate(item.beginDate)}<br>đến ${formatDate(item.endDate)}</small></div>
            <div>${renderStatusBadge(item.status)}</div>
            <div class="table-actions" onclick="event.stopPropagation()">
              <button type="button" class="mini-btn" onclick="editPromotion(${item.id})">Sửa</button>
              <button type="button" class="mini-btn ${item.isActive ? 'danger' : 'success'}" style="${!item.isActive ? 'background:#059669; color:#fff; border:none;' : ''}" onclick="togglePromotion(${item.id})">
                ${item.isActive ? 'Dừng' : 'Bật'}
              </button>
            </div>
          </div>
        `;
      }).join("");

    renderPromotionDetailPanel(state.selectedPromotionId);
  }

  window.selectPromotionRow = (id) => {
    state.selectedPromotionId = id;
    const allRows = document.querySelectorAll("#promotionsTable .admin-row");
    allRows.forEach((r) => r.classList.remove("selected-row"));
    const activeRow = document.getElementById(`promo-row-${id}`);
    if (activeRow) activeRow.classList.add("selected-row");
    renderPromotionDetailPanel(id);
  };

  window.renderPromotionDetailPanel = (id) => {
    const panel = document.getElementById("promotionDetailPanel");
    if (!panel) return;
    const promo = state.promotions.find((p) => p.id === id);
    if (!promo) {
      panel.innerHTML = `
        <div class="admin-detail-placeholder">
          <span style="font-size:36px; display:block; margin-bottom:12px;">🏷️</span>
          <h4>Chi tiết chương trình ưu đãi</h4>
          <p>Nhấp vào một dòng trong bảng bên cạnh để xem thông số và quản lý chương trình.</p>
        </div>
      `;
      return;
    }

    let typeTitle = "🎟️ Khuyến mãi theo Voucher";
    let typeColor = "#b45309";
    let ruleHtml = "";

    if (promo.type === "product") {
      typeTitle = "🏷️ Khuyến mãi theo Sản phẩm";
      typeColor = "#7e22ce";
      ruleHtml = `
        <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:12px; margin-bottom:12px;">
          <strong style="color:#6b21a8; display:block; font-size:12px; margin-bottom:4px; text-transform:uppercase;">Quy tắc giảm theo sản phẩm:</strong>
          <p style="margin:0; font-size:13px; color:#4c1d95;">
            Áp dụng giảm trực tiếp <strong>${promo.discount}%</strong> vào giá bán của sản phẩm:
            <br>💎 <strong>${promo.productName || 'Sản phẩm chỉ định'}</strong>
          </p>
        </div>
      `;
    } else if (promo.type === "invoice") {
      typeTitle = "🧾 Khuyến mãi theo Hóa đơn";
      typeColor = "#047857";
      ruleHtml = `
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:12px; margin-bottom:12px;">
          <strong style="color:#065f46; display:block; font-size:12px; margin-bottom:4px; text-transform:uppercase;">Quy tắc giảm theo hóa đơn:</strong>
          <p style="margin:0; font-size:13px; color:#064e3b;">
            Tổng tiền hóa đơn phải đạt tối thiểu từ: <strong>${formatMoney(promo.minInvoiceAmount || 10000000)}</strong>
            <br>Mức giảm: Chiết khấu <strong>${promo.discount}%</strong> trên tổng hóa đơn.
          </p>
        </div>
      `;
    } else {
      typeTitle = "🎟️ Khuyến mãi theo Voucher";
      typeColor = "#b45309";
      ruleHtml = `
        <div style="background:#fefce8; border:1px solid #fef08a; border-radius:8px; padding:12px; margin-bottom:12px;">
          <strong style="color:#854d0e; display:block; font-size:12px; margin-bottom:4px; text-transform:uppercase;">Quy tắc giảm theo Voucher:</strong>
          <p style="margin:0; font-size:13px; color:#713f12;">
            Khách hàng nhập mã voucher <strong>${promo.code}</strong> khi thanh toán để được giảm <strong>${promo.discount}%</strong>.
            <br>Giới hạn: <strong>${promo.timesUsed} / ${promo.usageLimit} lượt dùng</strong>.
          </p>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="side-detail-content">
        <div class="side-detail-header" style="border-bottom:1px solid #eee; padding-bottom:12px;">
          <div>
            <span class="detail-badge" style="background:${typeColor}15; color:${typeColor}; font-weight:700;">${typeTitle}</span>
            <h3 style="margin: 6px 0 2px 0; font-size: 18px; font-weight: 700; color: var(--admin-dark);">${promo.name}</h3>
            ${promo.code ? `<code style="background:#fdf6ec; border:1px solid #e7d6b8; padding:3px 8px; border-radius:4px; font-weight:800; font-size:13px; color:var(--admin-gold); display:inline-block; margin-top:4px;">MÃ: ${promo.code}</code>` : ''}
          </div>
          <div>${renderStatusBadge(promo.status)}</div>
        </div>

        <div style="margin: 14px 0 10px 0;">
          <div style="background: #faf8f5; border-radius: 8px; padding: 14px; border: 1px solid #f0ede8; margin-bottom:12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: #666; font-weight: 700; text-transform: uppercase;">Mức giảm ưu đãi</span>
              <span style="font-size: 26px; font-weight: 800; color: var(--admin-green);">-${promo.discount}%</span>
            </div>
          </div>
          ${ruleHtml}
        </div>

        <div style="margin-bottom: 16px;">
          <h4 class="side-detail-title">Thời hạn áp dụng chương trình</h4>
          <div class="detail-info-grid">
            <div><span class="lbl">Ngày bắt đầu:</span> <strong>${formatDate(promo.beginDate)}</strong></div>
            <div><span class="lbl">Ngày kết thúc:</span> <strong>${formatDate(promo.endDate)}</strong></div>
            <div>
              <span class="lbl">Trạng thái:</span>
              <strong>${promo.isActive ? '✅ Đang có hiệu lực' : '❌ Tạm dừng / Hết hạn'}</strong>
            </div>
          </div>
        </div>

        <div style="margin-top: 18px; display: flex; gap: 8px; border-top: 1px solid #f0ede8; padding-top: 16px;">
          <button type="button" class="admin-primary-btn" style="flex: 1; padding: 8px 12px; font-size: 12px; justify-content: center;" onclick="editPromotion(${promo.id})">
            ✏️ Chỉnh sửa chương trình
          </button>
          <button type="button" class="admin-secondary-btn" style="padding: 8px 12px; font-size: 12px; color: var(--admin-red); border-color: #fca5a5;" onclick="togglePromotion(${promo.id})">
            ${promo.isActive ? 'Tạm dừng CT' : 'Kích hoạt lại'}
          </button>
        </div>
      </div>
    `;
  };

  window.editPromotion = (id) => {
    const item = state.promotions.find((p) => p.id === id);
    if (!item) return;
    const form = document.getElementById("promotionForm");
    form.querySelector('[name="id"]').value = item.id;
    form.querySelector('[name="name"]').value = item.name;

    const typeSel = form.querySelector('[name="type"]');
    if (typeSel) {
      typeSel.value = item.type || "voucher";
      handlePromoTypeChange(typeSel.value);
    }

    if (item.productId) {
      const pSel = form.querySelector('[name="productId"]');
      if (pSel) pSel.value = item.productId;
    }

    if (item.minInvoiceAmount) {
      const minInp = form.querySelector('[name="minInvoiceAmount"]');
      if (minInp) minInp.value = item.minInvoiceAmount;
    }

    const codeInp = form.querySelector('[name="code"]');
    if (codeInp) codeInp.value = item.code || "";

    form.querySelector('[name="discount"]').value = item.discount;
    form.querySelector('[name="beginDate"]').value = item.beginDate ? item.beginDate.split("T")[0] : "";
    form.querySelector('[name="endDate"]').value = item.endDate ? item.endDate.split("T")[0] : "";
    
    const usageInp = form.querySelector('[name="usageLimit"]');
    if (usageInp) usageInp.value = item.usageLimit || 100;

    form.querySelector('[name="status"]').value = item.status;
    document.getElementById("promotionFormTitle").textContent = "Cập nhật khuyến mãi: " + item.name;
    openFormModal("promotionsModal");
  };

  window.togglePromotion = async (id) => {
    const item = state.promotions.find((p) => p.id === id);
    if (!item) return;
    const nextStatus = item.isActive ? "Hết hạn" : "Hoạt động";
    try {
      await api(`/promotions/${id}`, { method: "PUT", body: { status: nextStatus } });
      toast(`Đã ${item.isActive ? 'tạm dừng' : 'kích hoạt'} chương trình khuyến mãi!`);
      loadPromotions();
    } catch (err) {
      toast("Lỗi: " + err.message, "error");
    }
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

  // 6. Promotion Form Submit Handler
  const promotionForm = document.getElementById("promotionForm");
  if (promotionForm) {
    promotionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(promotionForm);
      const id = fd.get("id");
      const body = {
        type: fd.get("type") || "voucher",
        name: fd.get("name"),
        code: fd.get("code") || "",
        discount: Number(fd.get("discount")),
        beginDate: fd.get("beginDate") || null,
        endDate: fd.get("endDate") || null,
        usageLimit: Number(fd.get("usageLimit") || 100),
        productId: fd.get("productId") ? Number(fd.get("productId")) : null,
        minInvoiceAmount: fd.get("minInvoiceAmount") ? Number(fd.get("minInvoiceAmount")) : null,
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
        closeFormModal("promotionsModal");
        loadPromotions();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

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

    // Sắp xếp trạng thái hiện hữu (Đang chờ duyệt, Đã xác nhận, Đang giao hàng) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const getPrio = (o) => {
        const s = String(o.status || "").toLowerCase();
        if (s.includes("chờ") || s === "pending") return 1;
        if (s.includes("xác nhận") || s === "processing") return 2;
        if (s.includes("giao hàng") || s.includes("đang giao") || s === "shipped") return 3;
        if (s.includes("thành công") || s === "delivered") return 4;
        return 5;
      };
      const diff = getPrio(a) - getPrio(b);
      if (diff !== 0) return diff;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    if (rows.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không tìm thấy đơn hàng nào</div>';
      return;
    }

    const grid = "minmax(85px, 0.9fr) minmax(130px, 1.3fr) minmax(100px, 1fr) minmax(120px, 1.2fr) minmax(110px, 1.1fr) minmax(120px, 1.1fr) minmax(120px, 1.3fr)";
    table.innerHTML = buildRowHeader(["Mã đơn", "Khách hàng", "Số điện thoại", "Ngày đặt", "Tổng tiền", "Trạng thái", "Thao tác"], grid) +
      rows.map((item) => `
        <div class="admin-row" style="grid-template-columns: ${grid};">
          <strong>${item.code}</strong>
          <span>${item.customer}</span>
          <span>${item.phone || "--"}</span>
          <div style="line-height:1.3;">${formatTableDateTime(item.date)}</div>
          <strong style="color:var(--admin-green);">${formatMoney(item.total)}</strong>
          <span>${renderStatusBadge(item.status)}</span>
          <div class="table-actions">
            <button type="button" class="mini-btn" onclick="editOrderStatus(${item.id})">Cập nhật</button>
            <button type="button" class="mini-btn" onclick="viewOrderDetail(${item.id})">Chi tiết</button>
          </div>
        </div>
      `).join("");
  }

  // Finite State Machine (FSM) Configuration
  const ORDER_FSM = {
    steps: [
      { key: "pending", label: "Chờ duyệt", icon: "1" },
      { key: "processing", label: "Đã xác nhận", icon: "2" },
      { key: "shipped", label: "Đang giao", icon: "3" },
      { key: "delivered", label: "Đã giao", icon: "4" }
    ],
    transitions: {
      "pending": [
        { value: "Đã xác nhận", label: "✅ Đã xác nhận (Xác thực thông tin & chuyển kho)", help: "⚡ Tác động: Chuyển đơn sang bộ phận kho để chuẩn bị, đóng gói và niêm phong trang sức." },
        { value: "Đã hủy", label: "❌ Đã hủy (Hủy đơn & hoàn tồn kho)", help: "⚡ Tác động: Đơn hàng sẽ bị hủy. Số lượng sản phẩm sẽ tự động được hoàn trả vào kho hàng." }
      ],
      "processing": [
        { value: "Đang giao hàng", label: "🚚 Đang giao hàng (Xuất kho & bàn giao shipper)", help: "⚡ Tác động: Xuất kho thành công, hàng đã được bàn giao cho đơn vị vận chuyển." },
        { value: "Đã hủy", label: "❌ Đã hủy (Hủy đơn & hoàn tồn kho)", help: "⚡ Tác động: Đơn hàng sẽ bị hủy. Số lượng sản phẩm sẽ tự động được hoàn trả vào kho hàng." }
      ],
      "shipped": [
        { value: "Đã giao thành công", label: "🎉 Đã giao thành công (Tự lập hóa đơn & chốt doanh thu)", help: "⚡ Tác động: Khách đã nhận hàng và thanh toán đủ. Hệ thống sẽ TỰ ĐỘNG LẬP HÓA ĐƠN bán lẻ và ghi nhận Doanh thu." },
        { value: "Đã hoàn hàng", label: "↩️ Đã hoàn hàng (Khách từ chối nhận / bom hàng)", help: "⚡ Tác động: Giao hàng không thành công. Hàng hóa sẽ tự động được kiểm đếm và hoàn lại vào kho." }
      ],
      "shipping": [
        { value: "Đã giao thành công", label: "🎉 Đã giao thành công (Tự lập hóa đơn & chốt doanh thu)", help: "⚡ Tác động: Khách đã nhận hàng và thanh toán đủ. Hệ thống sẽ TỰ ĐỘNG LẬP HÓA ĐƠN bán lẻ và ghi nhận Doanh thu." },
        { value: "Đã hoàn hàng", label: "↩️ Đã hoàn hàng (Khách từ chối nhận / bom hàng)", help: "⚡ Tác động: Giao hàng không thành công. Hàng hóa sẽ tự động được kiểm đếm và hoàn lại vào kho." }
      ],
      "delivered": [
        { value: "Đã hoàn hàng", label: "↩️ Đã hoàn hàng (Đổi trả sản phẩm sau khi nhận)", help: "⚡ Tác động: Tiếp nhận đổi trả / khiếu nại. Hàng hóa sẽ được hoàn trả lại vào kho." }
      ],
      "cancelled": [],
      "returned": []
    }
  };

  function normalizeOrderStatusKey(statusStr) {
    const s = String(statusStr || "").toLowerCase();
    if (s.includes("chờ") || s === "pending") return "pending";
    if (s.includes("xác nhận") || s === "processing") return "processing";
    if (s.includes("đang giao") || s.includes("giao hàng") || s === "shipped") return "shipped";
    if (s.includes("thành công") || s.includes("đã giao") || s === "delivered") return "delivered";
    if (s.includes("hủy") || s === "cancelled") return "cancelled";
    if (s.includes("hoàn") || s === "returned") return "returned";
    return "pending";
  }

  window.editOrderStatus = (id) => {
    const item = state.orders.find((o) => o.id === id);
    if (!item) return;

    const form = document.getElementById("orderForm");
    if (!form) return;

    form.querySelector('[name="id"]').value = item.id;
    document.getElementById("orderModalCode").textContent = item.code || `#${item.id}`;
    document.getElementById("orderModalCustomer").textContent = item.customer || "Khách hàng";
    document.getElementById("orderModalTotal").textContent = formatMoney(item.total);
    document.getElementById("orderModalCurrentBadge").innerHTML = renderStatusBadge(item.status);

    const currentKey = normalizeOrderStatusKey(item.status);
    const allowed = ORDER_FSM.transitions[currentKey] || [];

    // Render Progress Tracker
    const trackerEl = document.getElementById("orderStatusTracker");
    if (trackerEl) {
      if (currentKey === "cancelled") {
        trackerEl.innerHTML = `
          <div style="width:100%; text-align:center; padding:6px; color:#b91c1c; font-weight:800; font-size:12.5px; background:#fef2f2; border-radius:6px;">
            ❌ ĐƠN HÀNG ĐÃ BỊ HỦY (ĐÃ HOÀN TỒN KHO)
          </div>
        `;
      } else if (currentKey === "returned") {
        trackerEl.innerHTML = `
          <div style="width:100%; text-align:center; padding:6px; color:#6b21a8; font-weight:800; font-size:12.5px; background:#f3e8ff; border-radius:6px;">
            ↩️ ĐƠN HÀNG ĐÃ HOÀN TRẢ (ĐÃ NHẬP LẠI KHO)
          </div>
        `;
      } else {
        const stepOrder = ["pending", "processing", "shipped", "delivered"];
        const currentIndex = stepOrder.indexOf(currentKey);
        trackerEl.innerHTML = ORDER_FSM.steps.map((st, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const bg = isCurrent ? '#047857' : (isDone ? '#10b981' : '#e2e8f0');
          const color = (isCurrent || isDone) ? '#ffffff' : '#64748b';
          const fontWeight = isCurrent ? '800' : '600';
          const iconText = isDone ? '✓' : st.icon;
          return `
            <div style="display:flex; align-items:center; gap:6px; font-size:11.5px; flex:1; justify-content:center;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:${bg}; color:${color}; font-size:10px; font-weight:800;">${iconText}</span>
              <span style="color:${isCurrent ? '#047857' : (isDone ? '#0f172a' : '#94a3b8')}; font-weight:${fontWeight};">${st.label}</span>
              ${idx < ORDER_FSM.steps.length - 1 ? '<span style="color:#cbd5e1; font-size:10px; margin-left:2px;">›</span>' : ''}
            </div>
          `;
        }).join("");
      }
    }

    // Render Action Area
    const actionArea = document.getElementById("orderStatusActionArea");
    const closedNotice = document.getElementById("orderClosedNotice");
    const selectEl = document.getElementById("orderStatusSelect");
    const helpEl = document.getElementById("orderStatusHelpText");
    const submitBtn = document.getElementById("orderSubmitBtn");

    if (allowed.length === 0) {
      if (actionArea) actionArea.style.display = "none";
      if (closedNotice) closedNotice.style.display = "block";
      if (submitBtn) submitBtn.style.display = "none";
    } else {
      if (actionArea) actionArea.style.display = "block";
      if (closedNotice) closedNotice.style.display = "none";
      if (submitBtn) submitBtn.style.display = "inline-flex";

      selectEl.innerHTML = allowed.map((opt, i) => `
        <option value="${opt.value}" ${i === 0 ? 'selected' : ''}>${opt.label}</option>
      `).join("");

      const updateHelp = () => {
        const selectedVal = selectEl.value;
        const matched = allowed.find(o => o.value === selectedVal);
        if (matched && helpEl) {
          helpEl.textContent = matched.help;
        }
      };

      selectEl.onchange = updateHelp;
      updateHelp();
    }

    openFormModal("ordersModal");
  };

  window.viewOrderDetail = (id) => {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    const itemsSub = order.subtotal != null ? Number(order.subtotal) : (order.items || []).reduce((s, it) => s + Number(it.subtotal || 0), 0);
    const disc = Number(order.discountAmount || 0);
    const taxable = Math.max(0, itemsSub - disc);
    const vat = order.vatAmount != null ? Number(order.vatAmount) : Math.round(taxable * 0.08);
    const ship = Number(order.shippingFee || 0);
    const total = taxable + vat + ship;

    showModal(`Chi tiết đơn hàng ${order.code}`, `
      <div style="font-size:13px; display:grid; gap:10px;">
        <div style="padding:12px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
          <p style="margin:2px 0;"><strong>Người nhận:</strong> ${order.customer} - ${order.phone || "Không có SĐT"}</p>
          <p style="margin:2px 0;"><strong>Địa chỉ nhận:</strong> ${order.address || "Tại cửa hàng"}</p>
          <p style="margin:2px 0;"><strong>Ngày đặt:</strong> ${formatDateTime(order.date)}</p>
          <p style="margin:2px 0; display:flex; align-items:center; gap:6px;"><strong>Trạng thái:</strong> ${renderStatusBadge(order.status)}</p>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:12.5px; font-weight:800; text-transform:uppercase; color:#334155; margin:0;">
              Danh sách sản phẩm (${(order.items || []).length} món)
            </h4>
            <span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-weight:700; font-size:11.5px; padding:3px 9px; border-radius:12px;">
              Tổng: ${(order.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)} sản phẩm
            </span>
          </div>

          <div style="display:grid; gap:8px;">
            ${(order.items || []).map((it) => {
              const subtotalNum = it.subtotal || (it.quantity * (it.unit_price || 0));
              return `
                <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.03);">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:10px;">
                    <strong style="font-size:13.5px; color:#0f172a; line-height:1.4; flex:1;">${it.product_name || "Sản phẩm"}</strong>
                    <div style="text-align:right; flex-shrink:0;">
                      <span style="font-size:11px; color:#64748b; margin-right:4px;">Thành tiền:</span>
                      <strong style="font-size:15px; font-weight:800; color:#b45309; letter-spacing:0.2px;">${formatMoney(subtotalNum)}</strong>
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:6px 10px; border-radius:6px; border:1px solid #f1f5f9; font-size:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="display:inline-flex; align-items:center; background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-weight:800; font-size:11.5px; padding:2px 8px; border-radius:4px;">
                        SL: ${it.quantity}
                      </span>
                      ${it.unit_price ? `
                        <span style="color:#64748b;">
                          Đơn giá: <strong style="color:#1e293b; font-weight:700;">${formatMoney(it.unit_price)}</strong>
                        </span>
                      ` : ''}
                    </div>
                    <span style="font-size:11px; color:#94a3b8; font-style:italic;">Chính hãng Jewels</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <div style="display:grid; gap:7px; font-size:13px; padding-top:12px; border-top:1px solid #e2e8f0;">
          <div style="display:flex; justify-content:space-between; color:#475569;"><span>Tạm tính tiền hàng:</span> <strong style="color:#0f172a; font-size:13.5px;">${formatMoney(itemsSub)}</strong></div>
          ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#15803d;"><span>Giảm giá:</span> <strong style="font-size:13.5px; color:#15803d;">-${formatMoney(disc)}</strong></div>` : ''}
          
          <div style="display:flex; justify-content:space-between; color:#475569;"><span>Phí vận chuyển:</span> <strong style="color:${ship > 0 ? '#0f172a' : '#15803d'}; font-size:13.5px;">${ship > 0 ? formatMoney(ship) : "Miễn phí"}</strong></div>
          <div style="display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1.5px solid #10b981; border-radius:8px; padding:11px 14px; margin-top:6px; box-shadow:0 1px 3px rgba(16,185,129,0.1);">
            <span style="font-size:13px; font-weight:800; color:#065f46; text-transform:uppercase; letter-spacing:0.5px;">Tổng cộng thanh toán:</span>
            <strong style="font-size:19px; font-weight:900; color:#047857;">${formatMoney(total)}</strong>
          </div>
          <div style="text-align:right; font-size:11.5px; color:#64748b; font-style:italic; margin-top:4px;">
            (Đã bao gồm thuế VAT)
          </div>
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

    // Sắp xếp trạng thái hiện hữu (Hoạt động / Đang hợp tác) xếp từ trên xuống dưới
    rows.sort((a, b) => {
      const isActA = Boolean(a.isActive || a.status === "Hoạt động" || a.status === "Đang hợp tác");
      const isActB = Boolean(b.isActive || b.status === "Hoạt động" || b.status === "Đang hợp tác");
      if (isActA !== isActB) return isActA ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

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
    openFormModal("suppliersModal");
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

  // ---------- 10. THỐNG KÊ & BÁO CÁO KINH DOANH ----------
  let currentAnalyticsPeriod = "month";

  function initAnalyticsInputs() {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = String(now.getMonth() + 1).padStart(2, "0");
    const curDay = String(now.getDate()).padStart(2, "0");
    const monthVal = `${curYear}-${curMonth}`;

    const mInput = document.getElementById("analyticsMonthInput");
    if (mInput && (!mInput.value || mInput.value === "2026-10")) {
      mInput.value = monthVal;
    }

    const sInput = document.getElementById("analyticsStartDate");
    if (sInput && (!sInput.value || sInput.value === "2026-09-01")) {
      sInput.value = `${curYear}-${curMonth}-01`;
    }

    const eInput = document.getElementById("analyticsEndDate");
    if (eInput && (!eInput.value || eInput.value === "2026-10-31")) {
      eInput.value = `${curYear}-${curMonth}-${curDay}`;
    }

    const ySelect = document.getElementById("analyticsYearSelect");
    if (ySelect && !ySelect.value) {
      ySelect.value = String(curYear);
    }
  }

  function renderDonutChart(statusCounts = {}) {
    const svg = document.getElementById("analyticsDonutSvg");
    const ringBox = document.getElementById("analyticsStatusRing");
    const centerVal = document.getElementById("donutCenterValue");
    const orderCountEl = document.getElementById("donutOrderCount");

    const STATUS_CONFIG = [
      { key: "delivered", label: "Đã giao thành công", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
      { key: "processing", label: "Đã xác nhận", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
      { key: "shipped", label: "Đang giao hàng", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
      { key: "pending", label: "Đang chờ duyệt", color: "#ca8a04", bg: "rgba(202, 138, 4, 0.12)" },
      { key: "cancelled", label: "Đã hủy", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
      { key: "returned", label: "Đã hoàn hàng", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
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
        ringBox.innerHTML = '<div style="color:var(--admin-muted); font-size:12px; padding:12px;">Chưa có đơn hàng trong khoảng thời gian này</div>';
      }
      return;
    }

    let accumulatedPercent = 0;
    const slices = [];
    const legendItems = [];

    STATUS_CONFIG.forEach((cfg) => {
      const count = Number(statusCounts[cfg.key] || 0);
      if (count === 0) return;
      const pct = (count / total) * 100;
      const roundedPct = Math.round(pct * 10) / 10;
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
        <div class="donut-legend-card" data-status="${cfg.key}">
          <div class="donut-legend-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="donut-legend-dot" style="background:${cfg.color};"></span>
              <span class="donut-legend-title">${cfg.label}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <strong class="donut-legend-count">${count} đơn</strong>
              <span class="donut-legend-badge" style="color:${cfg.color}; background:${cfg.bg};">${roundedPct}%</span>
            </div>
          </div>
          <div class="donut-legend-track">
            <div class="donut-legend-bar" style="width:${roundedPct}%; background:${cfg.color};"></div>
          </div>
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
      if (period === "day") titleEl.textContent = "Bảng số liệu chi tiết doanh thu & chi phí theo từng ngày";
      else if (period === "year") titleEl.textContent = "Bảng số liệu chi tiết doanh thu & chi phí theo 12 tháng";
      else titleEl.textContent = "Bảng số liệu chi tiết doanh thu & chi phí theo từng ngày trong tháng";
    }

    if (!breakdown || breakdown.length === 0) {
      table.innerHTML = '<div class="admin-empty">Không có dữ liệu trong khoảng thời gian này</div>';
      return;
    }

    const activeRows = breakdown.filter(r => r.orderCount > 0 || r.revenue > 0 || r.cost > 0);
    const displayRows = activeRows.length > 0 ? activeRows : breakdown.slice(0, 10);

    const maxRowRev = Math.max(...breakdown.map(r => r.revenue || 0), 0);

    const totOrders = breakdown.reduce((acc, r) => acc + (r.orderCount || 0), 0);
    const totDelivered = breakdown.reduce((acc, r) => acc + (r.deliveredCount || 0), 0);
    const totRev = breakdown.reduce((acc, r) => acc + (r.revenue || 0), 0);
    const totCost = breakdown.reduce((acc, r) => acc + (r.cost || 0), 0);
    const totProfit = Math.max(0, totRev - totCost);
    const totRate = totOrders > 0 ? Math.round((totDelivered / totOrders) * 100) : 0;

    table.innerHTML = buildRowHeader(["Thời gian", "Tổng đơn", "Đơn hoàn thành", "Tỷ lệ giao", "Doanh thu bán", "Chi phí nhập", "Lợi nhuận gộp"]) +
      displayRows.map((r) => {
        const isPeakRow = maxRowRev > 0 && r.revenue === maxRowRev;
        return `
          <div class="admin-row ${isPeakRow ? 'breakdown-row-peak' : ''}" style="grid-template-columns: 1.3fr 0.8fr 1fr 1fr 1.3fr 1.3fr 1.3fr;">
            <strong>${r.periodLabel || r.shortLabel} ${isPeakRow ? '<span class="peak-tag-mini">⭐ Đỉnh điểm</span>' : ''}</strong>
            <span>${r.orderCount} đơn</span>
            <span style="color:var(--admin-green); font-weight:600;">${r.deliveredCount} đơn</span>
            <span><span class="${r.successRate >= 50 ? 'status-online' : 'status-away'}">${r.successRate}%</span></span>
            <strong style="color:var(--admin-green);">${formatMoney(r.revenue)}</strong>
            <span style="color:#666;">${formatMoney(r.cost)}</span>
            <strong style="color:${r.profit > 0 ? '#10b981' : '#666'}; ">${formatMoney(r.profit)}</strong>
          </div>
        `;
      }).join("") +
      `
        <div class="admin-row breakdown-row-total" style="grid-template-columns: 1.3fr 0.8fr 1fr 1fr 1.3fr 1.3fr 1.3fr; background:rgba(34, 76, 48, 0.05); border-top:2px solid var(--admin-green);">
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

  function renderRevenueBarChart(breakdownData, period = "month", totalRevenue = 0) {
    const barsBox = document.getElementById("analyticsBars");
    const barTitle = document.getElementById("analyticsBarChartTitle");
    const barSub = document.getElementById("analyticsBarSubtitle");
    const yAxisEl = document.getElementById("analyticsYAxis");
    const xAxisEl = document.getElementById("analyticsXAxis");
    const captionEl = document.getElementById("analyticsChartCaption");
    const peakBadgeEl = document.getElementById("analyticsPeakDayBadge");

    if (!barsBox) return;

    if (barTitle) {
      if (period === "day") barTitle.textContent = "Biểu đồ doanh thu theo từng ngày";
      else if (period === "year") barTitle.textContent = "Biểu đồ doanh thu 12 tháng trong năm";
      else barTitle.textContent = "Biểu đồ doanh thu các ngày trong tháng";
    }

    if (captionEl) {
      if (period === "day") captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: Từng ngày";
      else if (period === "year") captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: 12 tháng";
      else captionEl.textContent = "Trục dọc: Doanh thu (VNĐ) • Trục ngang: Ngày trong tháng (mùng 1 đến 31)";
    }

    if (barSub) barSub.textContent = `Tổng: ${formatMoney(totalRevenue)}`;

    let items = [];
    if (Array.isArray(breakdownData)) {
      items = breakdownData;
    } else if (breakdownData && typeof breakdownData === "object") {
      items = Object.entries(breakdownData).map(([k, v]) => ({
        shortLabel: k,
        periodLabel: k,
        revenue: Number(v) || 0,
        orderCount: 0,
        deliveredCount: 0,
      }));
    }

    const revenues = items.map(it => Number(it.revenue || 0));
    const maxRev = Math.max(...revenues, 0);

    // 1. Tính toán mốc Y-axis (Trục tung)
    if (yAxisEl) {
      if (maxRev <= 0) {
        yAxisEl.innerHTML = `<span>10 tr</span><span>5 tr</span><span>0 ₫</span>`;
      } else {
        const topCeil = Math.ceil(maxRev * 1.15);
        const midVal = Math.round(topCeil / 2);
        yAxisEl.innerHTML = `
          <span>${formatCompactMoney(topCeil)}</span>
          <span>${formatCompactMoney(midVal)}</span>
          <span>0 ₫</span>
        `;
      }
    }

    // 2. Tìm điểm đỉnh cao nhất
    let peakItem = null;
    if (maxRev > 0) {
      peakItem = items.find(it => Number(it.revenue || 0) === maxRev);
    }
    if (peakBadgeEl) {
      if (peakItem) {
        peakBadgeEl.innerHTML = `🏆 Đỉnh điểm: <strong>${peakItem.periodLabel || peakItem.shortLabel}</strong> (${formatMoney(peakItem.revenue)})`;
        peakBadgeEl.style.display = "inline-block";
      } else {
        peakBadgeEl.style.display = "none";
      }
    }

    if (items.length === 0) {
      barsBox.innerHTML = '<div style="color:var(--admin-muted); font-size:12px; margin:auto;">Chưa có dữ liệu giao dịch trong kỳ</div>';
      if (xAxisEl) xAxisEl.innerHTML = "";
      return;
    }

    const scaleMax = maxRev > 0 ? maxRev * 1.15 : 100;
    const totalBars = items.length;

    // 3. Render các cột kèm Tooltip tương tác chi tiết
    barsBox.innerHTML = items.map((it) => {
      const num = Number(it.revenue || 0);
      const isPeak = peakItem && peakItem === it && num > 0;
      const hasRevenue = num > 0;
      const pct = hasRevenue ? Math.max(10, Math.round((num / scaleMax) * 100)) : 0;

      return `
        <div class="bar-col ${hasRevenue ? 'has-revenue' : 'is-zero'} ${isPeak ? 'is-peak' : ''}">
          <div class="chart-tooltip">
            <div class="chart-tooltip-title">${it.periodLabel || it.shortLabel}</div>
            <div class="chart-tooltip-row"><span>Doanh thu:</span> <strong>${formatMoney(num)}</strong></div>
            <div class="chart-tooltip-row"><span>Số đơn hàng:</span> <span>${it.orderCount || 0} đơn</span></div>
            ${it.deliveredCount ? `<div class="chart-tooltip-row"><span>Hoàn thành:</span> <span style="color:#10b981;">${it.deliveredCount} đơn</span></div>` : ''}
          </div>
          <div class="bar-fill" style="height: ${pct}%;">
            ${isPeak ? `<span class="bar-value-tag">🏆 ${formatCompactMoney(num)}</span>` : (hasRevenue && totalBars <= 14 ? `<span class="bar-value-tag">${formatCompactMoney(num)}</span>` : "")}
          </div>
        </div>
      `;
    }).join("");

    // 4. Render nhãn trục hoành X-axis rõ ràng
    if (xAxisEl) {
      xAxisEl.innerHTML = items.map((it, idx) => {
        const num = Number(it.revenue || 0);
        const hasRevenue = num > 0;
        let shortX = "";

        if (period === "year") {
          shortX = it.shortLabel || `T${idx + 1}`;
        } else if (period === "day") {
          shortX = it.shortLabel || "";
        } else {
          const dayNum = it.dayNumber || parseInt(String(it.shortLabel).replace(/\D/g, ""), 10) || (idx + 1);
          if (hasRevenue || dayNum === 1 || dayNum === 5 || dayNum === 10 || dayNum === 15 || dayNum === 20 || dayNum === 25 || dayNum === 30 || idx === totalBars - 1) {
            shortX = String(dayNum);
          } else {
            shortX = "•";
          }
        }

        return `
          <div class="x-axis-item ${hasRevenue ? 'has-revenue' : ''}" title="${it.periodLabel || it.shortLabel}">
            ${shortX}
          </div>
        `;
      }).join("");
    }
  }

  function renderTopProducts(topProducts = [], topProductsType = "in_period") {
    const topProdBox = document.getElementById("analyticsTopProducts");
    if (!topProdBox) return;

    if (!topProducts || topProducts.length === 0) {
      topProdBox.innerHTML = '<div class="admin-empty">Chưa có sản phẩm bán ra trong khoảng thời gian này</div>';
      return;
    }

    const MEDAL_ICONS = ["🥇", "🥈", "🥉", "4", "5"];

    topProdBox.innerHTML = buildRowHeader(["Xếp hạng", "Tên trang sức / sản phẩm", "Số lượng bán ra", "Doanh thu tạo ra"]) +
      topProducts.map((p, idx) => `
        <div class="admin-row" style="grid-template-columns: 80px 2.2fr 1.2fr 1.3fr;">
          <strong style="font-size:15px;">${MEDAL_ICONS[idx] || (idx + 1)}</strong>
          <strong>${p.name}</strong>
          <span><span class="product-sold-badge">${p.quantity} chiếc</span></span>
          <strong style="color:var(--admin-green);">${formatMoney(p.revenue)}</strong>
        </div>
      `).join("");
  }

  async function loadAnalytics(filterParams = {}) {
    try {
      initAnalyticsInputs();

      const period = filterParams.period || currentAnalyticsPeriod || "month";
      currentAnalyticsPeriod = period;

      let q = `?period=${encodeURIComponent(period)}`;
      if (period === "day") {
        const s = filterParams.startDate || document.getElementById("analyticsStartDate")?.value || "2026-11-01";
        const e = filterParams.endDate || document.getElementById("analyticsEndDate")?.value || "2026-11-06";
        q += `&startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
      } else if (period === "year") {
        const y = filterParams.year || document.getElementById("analyticsYearSelect")?.value || "2026";
        q += `&year=${encodeURIComponent(y)}`;
      } else {
        const m = filterParams.month || document.getElementById("analyticsMonthInput")?.value || "2026-11";
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
      const elProfitMargin = document.getElementById("analyticsProfitMargin");
      const elOrderRate = document.getElementById("analyticsOrderRate");

      if (elRev) elRev.textContent = formatMoney(sum.totalRevenue);
      if (elCost) elCost.textContent = formatMoney(sum.totalCost);
      if (elProfit) elProfit.textContent = formatMoney(sum.estimatedProfit);
      if (elComp) elComp.textContent = (sum.completedOrders || 0).toLocaleString("vi-VN");

      if (elProfitMargin) {
        elProfitMargin.textContent = `Tỉ suất lợi nhuận: ${sum.profitMargin || 0}%`;
      }
      if (elOrderRate) {
        elOrderRate.textContent = `Tổng đơn: ${sum.totalOrders || 0} (Đạt ${sum.successRate || 0}%)`;
      }

      if (noticeEl) {
        noticeEl.textContent = data.filterDescription ? `Kỳ lọc: ${data.filterDescription}` : "";
      }

      // Render biểu đồ cột doanh thu
      renderRevenueBarChart(data.breakdown || data.revenueByPeriod || {}, period, sum.totalRevenue);

      // Render biểu đồ tròn tỷ lệ trạng thái đơn hàng
      renderDonutChart(data.statusCounts);

      // Render bảng số liệu chi tiết
      renderBreakdownTable(data.breakdown, period);

      // Render top sản phẩm bán chạy
      renderTopProducts(data.topProducts, data.topProductsType);
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
      toast("Lỗi tải thống kê: " + err.message, "error");
    }
  }


  function exportAnalyticsToExcel() {
    if (!state.analytics) {
      toast("Chưa có dữ liệu thống kê để xuất file. Vui lòng thử lại!", "error");
      return;
    }

    if (typeof XLSX === "undefined") {
      toast("Thư viện Excel đang tải, vui lòng thử lại sau giây lát!", "error");
      return;
    }

    const { summary = {}, breakdown = [], statusCounts = {}, topProducts = [], filterDescription = "", period = "month" } = state.analytics;
    const wb = XLSX.utils.book_new();

    // 1. SHEET 1: TỔNG QUAN & KPIS
    const kpiRows = [
      ["BÁO CÁO KINH DOANH & TỔNG QUAN CHỈ SỐ (JEWELS LUXURY)"],
      ["Khoảng thời gian báo cáo:", filterDescription || `Kỳ lọc: ${period}`],
      ["Thời điểm xuất file:", new Date().toLocaleString("vi-VN")],
      [],
      ["CHỈ SỐ TÀI CHÍNH & HOẠT ĐỘNG", "GIÁ TRỊ", "ĐƠN VỊ TÍNH", "GHI CHÚ"],
      ["1. Tổng doanh thu bán hàng", Number(summary.totalRevenue || 0), "VNĐ", "Tính từ các hóa đơn hợp lệ trong kỳ"],
      ["2. Chi phí nhập kho", Number(summary.totalCost || 0), "VNĐ", "Tổng giá trị phiếu nhập kho"],
      ["3. Lợi nhuận gộp ước tính", Number(summary.estimatedProfit || 0), "VNĐ", "Doanh thu trừ Chi phí nhập"],
      ["4. Tỉ suất lợi nhuận gộp", `${summary.profitMargin || 0}%`, "%", "Tỷ lệ lợi nhuận / Doanh thu"],
      ["5. Đơn hàng giao thành công", Number(summary.completedOrders || 0), "Đơn", "Đơn có trạng thái delivered"],
      ["6. Đơn hàng bị hủy", Number(summary.cancelledOrders || 0), "Đơn", "Đơn có trạng thái cancelled"],
      ["7. Tổng số đơn hàng phát sinh", Number(summary.totalOrders || 0), "Đơn", "Tổng đơn phát sinh trong kỳ"],
      ["8. Tỷ lệ hoàn thành đơn hàng", `${summary.successRate || 0}%`, "%", "Đơn giao thành công / Tổng đơn"],
    ];
    const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
    wsKpi["!cols"] = [{ wch: 35 }, { wch: 22 }, { wch: 15 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsKpi, "TongQuan_KPI");

    // 2. SHEET 2: DOANH THU & CHI PHÍ CHI TIẾT THEO THỜI GIAN
    const detailHeaders = [
      "Thời gian",
      "Số đơn phát sinh",
      "Đơn giao thành công",
      "Tỷ lệ hoàn thành (%)",
      "Doanh thu bán hàng (VNĐ)",
      "Chi phí nhập kho (VNĐ)",
      "Lợi nhuận gộp (VNĐ)",
    ];
    const detailRows = [
      ["BẢNG SỐ LIỆU CHI TIẾT DOANH THU & CHI PHÍ THEO THỜI GIAN"],
      [`Khoảng thời gian: ${filterDescription || period}`],
      [],
      detailHeaders,
    ];

    let totOrders = 0;
    let totDelivered = 0;
    let totRev = 0;
    let totCost = 0;
    let totProfit = 0;

    (breakdown || []).forEach((r) => {
      totOrders += Number(r.orderCount || 0);
      totDelivered += Number(r.deliveredCount || 0);
      totRev += Number(r.revenue || 0);
      totCost += Number(r.cost || 0);
      totProfit += Number(r.profit || 0);

      detailRows.push([
        r.periodLabel || r.shortLabel,
        Number(r.orderCount || 0),
        Number(r.deliveredCount || 0),
        Number(r.successRate || 0),
        Number(r.revenue || 0),
        Number(r.cost || 0),
        Number(r.profit || 0),
      ]);
    });

    const overallRate = totOrders > 0 ? Math.round((totDelivered / totOrders) * 100) : 0;
    detailRows.push([]);
    detailRows.push([
      "TỔNG CỘNG",
      totOrders,
      totDelivered,
      overallRate,
      totRev,
      totCost,
      totProfit,
    ]);

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    wsDetail["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wsDetail, "DoanhThu_ChiTiet");

    // 3. SHEET 3: TOP SẢN PHẨM BÁN CHẠY
    const prodRows = [
      ["TOP SẢN PHẨM TRANG SỨC BÁN CHẠY NHẤT"],
      [`Khoảng thời gian: ${filterDescription || period}`],
      [],
      ["Xếp hạng", "Tên trang sức / sản phẩm", "Số lượng bán ra (chiếc)", "Doanh thu tạo ra (VNĐ)"],
    ];
    (topProducts || []).forEach((p, idx) => {
      prodRows.push([
        `#${idx + 1}`,
        p.name,
        Number(p.quantity || 0),
        Number(p.revenue || 0),
      ]);
    });
    const wsProd = XLSX.utils.aoa_to_sheet(prodRows);
    wsProd["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsProd, "Top_SanPham");

    // 4. SHEET 4: CƠ CẤU TRẠNG THÁI ĐƠN HÀNG
    const STATUS_LABELS = {
      delivered: "Đã giao thành công",
      processing: "Đã xác nhận",
      shipped: "Đang giao hàng",
      pending: "Đang chờ duyệt",
      cancelled: "Đã hủy",
      returned: "Đã hoàn hàng",
    };
    const totalStatusOrders = Object.values(statusCounts).reduce((a, b) => a + Number(b || 0), 0);
    const statusRows = [
      ["CƠ CẤU TRẠNG THÁI ĐƠN HÀNG"],
      [`Tổng số đơn hàng: ${totalStatusOrders}`],
      [],
      ["Mã trạng thái", "Tên trạng thái", "Số lượng đơn", "Tỷ lệ phân bổ (%)"],
    ];
    Object.entries(statusCounts).forEach(([k, v]) => {
      const c = Number(v || 0);
      const pct = totalStatusOrders > 0 ? Math.round((c / totalStatusOrders) * 1000) / 10 : 0;
      statusRows.push([k, STATUS_LABELS[k] || k, c, `${pct}%`]);
    });
    const wsStatus = XLSX.utils.aoa_to_sheet(statusRows);
    wsStatus["!cols"] = [{ wch: 16 }, { wch: 25 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsStatus, "TrangThai_DonHang");

    // Đặt tên file xuất
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const cleanPeriod = (filterDescription || period).replace(/[^a-zA-Z0-9_À-ỹ]/g, "_").replace(/_+/g, "_");
    const fileName = `Bao_Cao_Kinh_Doanh_Jewels_${cleanPeriod}_${dateStamp}.xlsx`;

    // Tải file trực tiếp
    XLSX.writeFile(wb, fileName);
    toast("Đã xuất file Excel (.xlsx) thành công!", "success");
  }

  window.exportAnalyticsToExcel = exportAnalyticsToExcel;

  // ---------- MODAL POPUP TIỆN ÍCH ----------
  window.openFormModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.hidden = false;
      modal.removeAttribute("hidden");
    }
  };

  window.closeFormModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.hidden = true;
      modal.setAttribute("hidden", "");
    }
  };

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
        closeFormModal("accountsModal");
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
        closeFormModal("staffModal");
        loadStaff();
      } catch (err) {
        toast("Lỗi: " + err.message, "error");
      }
    });
  }

  // 3. Customer Form
  const customerForm = document.getElementById("customerForm");
  if (customerForm) {
    const custDobInput = customerForm.querySelector('[name="dob"]');
    if (custDobInput) {
      const maxYear = new Date().getFullYear() - 18;
      custDobInput.min = "1900-01-01";
      custDobInput.max = `${maxYear}-12-31`;
    }
    customerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(customerForm);
      const id = fd.get("id");
      const rawDob = (fd.get("dob") || "").trim();
      if (rawDob) {
        const maxYear = new Date().getFullYear() - 18;
        const m = rawDob.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m || parseInt(m[1], 10) > maxYear || parseInt(m[1], 10) < 1900) {
          toast(`Ngày sinh không hợp lệ: Năm sinh phải từ năm ${maxYear} trở về trước (trên 18 tuổi).`, "error");
          return;
        }
      }
      const body = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
        dob: rawDob || null,
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
        closeFormModal("customersModal");
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
        closeFormModal("productsModal");
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
        closeFormModal("invoicesModal");
        loadInvoices();
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
      const targetStatus = fd.get("status");
      if (!id || !targetStatus) return;

      const submitBtn = document.getElementById("orderSubmitBtn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Đang xử lý...";
      }

      try {
        const res = await api(`/orders/${id}/status`, {
          method: "PUT",
          body: { status: targetStatus },
        });

        toast(res.message || `Đã cập nhật trạng thái đơn sang "${targetStatus}"!`, "success");

        broadcast("ORDER_STATUS_CHANGED", {
          orderId: Number(id),
          status: res.status || targetStatus,
        });

        closeFormModal("ordersModal");
        await Promise.all([
          loadOrders(),
          typeof loadInvoices === "function" ? loadInvoices() : Promise.resolve(),
          typeof loadOverview === "function" ? loadOverview() : Promise.resolve(),
          typeof loadAnalytics === "function" ? loadAnalytics() : Promise.resolve()
        ]);
      } catch (err) {
        toast("Lỗi cập nhật: " + err.message, "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Xác nhận chuyển";
        }
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
        closeFormModal("stockModal");
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
        closeFormModal("suppliersModal");
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

  // Nút Thêm mới (reset form và mở khung modal)
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-add");
      const form = document.querySelector(`form#${type.replace(/s$/, "")}Form`) || document.getElementById(`${type}Form`);
      if (form) {
        form.reset();
        const idInp = form.querySelector('[name="id"]');
        if (idInp) idInp.value = "";
        const title = form.querySelector("h3");
        if (title) {
          const typeNames = {
            accounts: "Thêm tài khoản mới",
            staff: "Thêm nhân viên",
            customers: "Thêm khách hàng",
            products: "Thêm sản phẩm",
            invoices: "Lập hóa đơn tại quầy",
            promotions: "Tạo chương trình ưu đãi",
            stock: "Phiếu nhập kho mới",
            suppliers: "Thêm nhà cung cấp",
          };
          title.textContent = typeNames[type] || "Thêm mới";
        }
      }
      if (type === "promotions") {
        const typeSel = form?.querySelector('[name="type"]');
        if (typeSel) typeSel.value = "voucher";
        if (window.handlePromoTypeChange) window.handlePromoTypeChange("voucher");
      }
      openFormModal(`${type}Modal`);
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
      closeFormModal(`${type}Modal`);
    });
  });

  // Nút đóng modal (dấu x)
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      closeFormModal(modalId);
    });
  });

  // Đóng modal khi bấm ra ngoài nền tối
  document.querySelectorAll(".admin-modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.hidden = true;
        backdrop.setAttribute("hidden", "");
      }
    });
  });

  // Đóng modal khi nhấn phím Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".admin-modal-backdrop").forEach((b) => {
        b.hidden = true;
        b.setAttribute("hidden", "");
      });
    }
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
    } catch { }
  }

  // ---------- KẾT NỐI THỜI GIAN THỰC (REALTIME SSE & BROADCASTCHANNEL) ----------
  const realtimeChannel = typeof window.BroadcastChannel !== "undefined" ? new BroadcastChannel("jewels_realtime") : null;

  function broadcast(type, data = {}) {
    if (realtimeChannel) {
      try { realtimeChannel.postMessage({ type, data, timestamp: Date.now() }); } catch { }
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
          if (payload.type === "CONNECTED") {
            if (payload.instanceId && session) {
              session.serverInstance = payload.instanceId;
            }
          } else if (payload.type) {
            handleAdminRealtime(payload.type, payload.data);
          }
        } catch { }
      };
      es.onerror = () => {
        es.close();
        setTimeout(initAdminSse, 4000);
      };
    } catch { }
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
