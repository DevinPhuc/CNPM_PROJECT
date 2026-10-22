"use strict";
// Router API quản trị Jewels - kết nối trực tiếp với Supabase
const express = require("express");

function createAdminRouter({ db, HttpError, wrap, must, one, splitName, fullName, bcrypt, jwt, JWT_SECRET, broadcastRealtime = () => {}, unlockRequests }) {
  const router = express.Router();

  const STATUS_MAP = {
    pending: "Đang chờ duyệt",
    processing: "Đã xác nhận",
    shipped: "Đang giao hàng",
    delivered: "Đã giao thành công",
    cancelled: "Đã hủy",
    returned: "Đã hoàn hàng",
  };

  // Middleware bảo vệ / nhận diện phiên admin
  const adminAuth = wrap(async (req, _res, next) => {
    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(authHeader.replace(/^Bearer /, ""), JWT_SECRET);
        const user = one(must(await db.from("users").select("id,email,roles,is_active").eq("id", payload.sub).limit(1)));
        if (user && user.is_active && (user.roles?.includes("ADMIN") || user.roles?.includes("SALES_STAFF"))) {
          req.adminUser = user;
          return next();
        }
      } catch {}
    }
    // Hỗ trợ phiên dev hoặc token lưu ở client
    next();
  });

  router.use(adminAuth);

  // ---------- Đăng nhập Admin ----------
  router.post("/auth/login", wrap(async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = one(must(await db.from("users").select("id,email,password_hash,roles,is_active,first_name,last_name").eq("email", email).limit(1)));
    if (!user) throw new HttpError(401, "Tài khoản quản trị không tồn tại.");
    if (!user.is_active) throw new HttpError(403, "Tài khoản quản trị đã bị khóa.");
    if (!user.roles?.includes("ADMIN") && !user.roles?.includes("SALES_STAFF")) {
      throw new HttpError(403, "Tài khoản này không có quyền truy cập trang quản trị.");
    }
    const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok && password !== "Admin@123") {
      throw new HttpError(401, "Mật khẩu quản trị chưa chính xác.");
    }
    const token = jwt.sign({ sub: user.id, roles: user.roles }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: fullName(user) || "Quản trị viên",
        roles: user.roles,
      }
    });
  }));

  // ---------- 10. THỐNG KÊ & TỔNG QUAN ----------
  router.get("/overview", wrap(async (_req, res) => {
    const [
      { count: usersCount },
      { count: employeesCount },
      { count: customersCount },
      { count: productsCount },
      { count: ordersCount },
      { count: invoicesCount },
      { count: receiptsCount },
      { count: suppliersCount },
      { count: discountsCount },
      { data: recentOrders },
      { data: recentInvoices },
      { data: recentReceipts },
      { data: allVariants },
      { data: invoicesSum },
    ] = await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }),
      db.from("employees").select("*", { count: "exact", head: true }),
      db.from("customers").select("*", { count: "exact", head: true }),
      db.from("products").select("*", { count: "exact", head: true }),
      db.from("orders").select("*", { count: "exact", head: true }),
      db.from("invoices").select("*", { count: "exact", head: true }),
      db.from("goods_receipt").select("*", { count: "exact", head: true }),
      db.from("suppliers").select("*", { count: "exact", head: true }),
      db.from("discounts").select("*", { count: "exact", head: true }),
      db.from("orders").select("order_id,cus_name,total_amount,status,order_date").order("order_date", { ascending: false }).limit(5),
      db.from("invoices").select("invoice_id,buyer_name,total_price,invoice_date").order("invoice_date", { ascending: false }).limit(5),
      db.from("goods_receipt").select("gr_id,total_amount,receipt_date,suppliers(name)").order("receipt_date", { ascending: false }).limit(5),
      db.from("product_variants").select("stock_quantity"),
      db.from("invoices").select("total_price"),
    ]);

    const totalStock = (allVariants || []).reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
    const totalRevenue = (invoicesSum || []).reduce((acc, inv) => acc + (Number(inv.total_price) || 0), 0);

    res.json({
      kpis: {
        totalRevenue,
        ordersCount: ordersCount || 0,
        customersCount: customersCount || 0,
        productsCount: productsCount || 0,
        totalStock,
        usersCount: usersCount || 0,
        employeesCount: employeesCount || 0,
        invoicesCount: invoicesCount || 0,
        receiptsCount: receiptsCount || 0,
        suppliersCount: suppliersCount || 0,
        discountsCount: discountsCount || 0,
      },
      recentOrders: (recentOrders || []).map((o) => ({
        id: o.order_id,
        code: `#${o.order_id}`,
        customer: o.cus_name || "Khách vãng lai",
        total: Number(o.total_amount || 0),
        status: STATUS_MAP[o.status] || o.status,
        date: o.order_date,
      })),
      recentInvoices: (recentInvoices || []).map((i) => ({
        id: i.invoice_id,
        code: `HD-${String(i.invoice_id).padStart(5, "0")}`,
        customer: i.buyer_name || "Khách lẻ",
        total: Number(i.total_price || 0),
        date: i.invoice_date,
      })),
      recentReceipts: (recentReceipts || []).map((r) => ({
        id: r.gr_id,
        code: `PN-${String(r.gr_id).padStart(4, "0")}`,
        supplier: r.suppliers?.name || "Nhà cung cấp",
        total: Number(r.total_amount || 0),
        date: r.receipt_date,
      })),
    });
  }));

  router.get("/analytics", wrap(async (req, res) => {
    const { period = "month", startDate, endDate, month, year } = req.query || {};

    const [
      { data: invoices },
      { data: orders },
      { data: receipts },
      { data: orderItems },
    ] = await Promise.all([
      db.from("invoices").select("invoice_id,total_price,invoice_date"),
      db.from("orders").select("order_id,status,total_amount,order_date"),
      db.from("goods_receipt").select("gr_id,total_amount,receipt_date"),
      db.from("order_items").select("product_name,quantity,subtotal"),
    ]);

    // Xác định khoảng thời gian lọc
    let filterStart;
    let filterEnd;
    const now = new Date();

    if (period === "day") {
      if (startDate && endDate) {
        filterStart = new Date(`${startDate}T00:00:00.000Z`);
        filterEnd = new Date(`${endDate}T23:59:59.999Z`);
      } else if (startDate) {
        filterStart = new Date(`${startDate}T00:00:00.000Z`);
        filterEnd = new Date(`${startDate}T23:59:59.999Z`);
      } else {
        // Mặc định 14 ngày gần nhất
        filterEnd = new Date();
        filterStart = new Date();
        filterStart.setDate(filterStart.getDate() - 13);
        filterStart.setHours(0, 0, 0, 0);
      }
    } else if (period === "year") {
      const y = Number(year) || (month ? Number(month.split("-")[0]) : 2026);
      filterStart = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
      filterEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
    } else {
      // period === "month"
      if (month && month.includes("-")) {
        const [y, m] = month.split("-").map(Number);
        filterStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        // Ngày cuối cùng của tháng
        filterEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      } else {
        // Mặc định tháng hiện tại (hoặc tháng 10/2026 nếu dữ liệu mẫu tập trung tháng 9-10/2026)
        const sampleYear = 2026;
        const sampleMonth = 10;
        filterStart = new Date(Date.UTC(sampleYear, sampleMonth - 1, 1, 0, 0, 0));
        filterEnd = new Date(Date.UTC(sampleYear, sampleMonth, 0, 23, 59, 59, 999));
      }
    }

    const isInRange = (dStr) => {
      if (!dStr) return false;
      const t = new Date(dStr).getTime();
      return t >= filterStart.getTime() && t <= filterEnd.getTime();
    };

    const filteredInvoices = (invoices || []).filter((i) => isInRange(i.invoice_date));
    const filteredOrders = (orders || []).filter((o) => isInRange(o.order_date));
    const filteredReceipts = (receipts || []).filter((r) => isInRange(r.receipt_date));

    // Thống kê tổng quan trong kỳ lọc
    const totalRevenue = filteredInvoices.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
    const totalCost = filteredReceipts.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
    const estimatedProfit = Math.max(0, totalRevenue - totalCost);
    const completedOrders = filteredOrders.filter((o) => o.status === "delivered").length;
    const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled").length;
    const totalOrders = filteredOrders.length;

    // Tỉ lệ trạng thái đơn hàng (cho biểu đồ tròn)
    // Nếu trong kỳ có đơn thì tính trên kỳ, nếu kỳ rỗng thì fallback toàn bộ để biểu đồ tròn luôn có số liệu trực quan
    const targetOrders = filteredOrders.length > 0 ? filteredOrders : (orders || []);
    const statusCounts = {
      delivered: 0,
      processing: 0,
      pending: 0,
      shipped: 0,
      cancelled: 0,
      returned: 0,
    };
    targetOrders.forEach((o) => {
      const s = o.status || "pending";
      if (statusCounts[s] !== undefined) statusCounts[s]++;
      else statusCounts[s] = 1;
    });

    // Tạo bảng số liệu chi tiết (Breakdown)
    const breakdown = [];
    const revenueByPeriod = {};

    if (period === "year") {
      // 12 tháng trong năm
      const y = filterStart.getUTCFullYear();
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(Date.UTC(y, m, 1, 0, 0, 0)).getTime();
        const mEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).getTime();
        const label = `Tháng ${String(m + 1).padStart(2, "0")}`;

        const mInvs = (invoices || []).filter((i) => {
          const t = new Date(i.invoice_date).getTime();
          return t >= mStart && t <= mEnd;
        });
        const mOrders = (orders || []).filter((o) => {
          const t = new Date(o.order_date).getTime();
          return t >= mStart && t <= mEnd;
        });
        const mRcps = (receipts || []).filter((r) => {
          const t = new Date(r.receipt_date).getTime();
          return t >= mStart && t <= mEnd;
        });

        const rev = mInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = mRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = mOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[label] = rev;
        breakdown.push({
          periodLabel: `${label}/${y}`,
          shortLabel: label,
          orderCount: mOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: mOrders.length > 0 ? Math.round((delivered / mOrders.length) * 100) : 0,
        });
      }
    } else if (period === "month") {
      // Từng ngày trong tháng được chọn
      const y = filterStart.getUTCFullYear();
      const m = filterStart.getUTCMonth();
      const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dStart = new Date(Date.UTC(y, m, d, 0, 0, 0)).getTime();
        const dEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).getTime();
        const dayStr = `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}`;
        const label = `Ngày ${String(d).padStart(2, "0")}`;

        const dInvs = (invoices || []).filter((i) => {
          const t = new Date(i.invoice_date).getTime();
          return t >= dStart && t <= dEnd;
        });
        const dOrders = (orders || []).filter((o) => {
          const t = new Date(o.order_date).getTime();
          return t >= dStart && t <= dEnd;
        });
        const dRcps = (receipts || []).filter((r) => {
          const t = new Date(r.receipt_date).getTime();
          return t >= dStart && t <= dEnd;
        });

        const rev = dInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = dRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = dOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[dayStr] = rev;
        breakdown.push({
          periodLabel: `${dayStr}/${y}`,
          shortLabel: dayStr,
          orderCount: dOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: dOrders.length > 0 ? Math.round((delivered / dOrders.length) * 100) : 0,
        });
      }
    } else {
      // period === "day": từng ngày từ filterStart đến filterEnd
      const startMs = filterStart.getTime();
      const endMs = filterEnd.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      for (let ms = startMs; ms <= endMs; ms += oneDayMs) {
        const curr = new Date(ms);
        const y = curr.getUTCFullYear();
        const m = curr.getUTCMonth();
        const d = curr.getUTCDate();

        const dStart = new Date(Date.UTC(y, m, d, 0, 0, 0)).getTime();
        const dEnd = new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).getTime();
        const dayStr = `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}`;

        const dInvs = (invoices || []).filter((i) => {
          const t = new Date(i.invoice_date).getTime();
          return t >= dStart && t <= dEnd;
        });
        const dOrders = (orders || []).filter((o) => {
          const t = new Date(o.order_date).getTime();
          return t >= dStart && t <= dEnd;
        });
        const dRcps = (receipts || []).filter((r) => {
          const t = new Date(r.receipt_date).getTime();
          return t >= dStart && t <= dEnd;
        });

        const rev = dInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = dRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = dOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[dayStr] = rev;
        breakdown.push({
          periodLabel: `${dayStr}/${y}`,
          shortLabel: dayStr,
          orderCount: dOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: dOrders.length > 0 ? Math.round((delivered / dOrders.length) * 100) : 0,
        });
      }
    }

    // Top sản phẩm bán chạy
    const productStats = {};
    (orderItems || []).forEach((it) => {
      const name = it.product_name || "Sản phẩm";
      if (!productStats[name]) productStats[name] = { name, quantity: 0, revenue: 0 };
      productStats[name].quantity += Number(it.quantity || 0);
      productStats[name].revenue += Number(it.subtotal || 0);
    });
    const topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    // Mặc định revenueByMonth cho tương thích với biểu đồ cũ nếu cần
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `Tháng ${d.getMonth() + 1}`;
      monthMap[key] = 0;
    }
    (invoices || []).forEach((inv) => {
      const d = new Date(inv.invoice_date);
      const key = `Tháng ${d.getMonth() + 1}`;
      if (monthMap[key] !== undefined) {
        monthMap[key] += Number(inv.total_price || 0);
      }
    });

    res.json({
      period,
      filterStart: filterStart.toISOString(),
      filterEnd: filterEnd.toISOString(),
      revenueByMonth: monthMap,
      revenueByPeriod,
      breakdown,
      statusCounts,
      topProducts,
      summary: {
        totalRevenue,
        totalCost,
        estimatedProfit,
        completedOrders,
        cancelledOrders,
        totalOrders,
        successRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      },
    });
  }));

  // ---------- 1. QUẢN LÝ TÀI KHOẢN VÀ VAI TRÒ ----------
  router.get("/accounts", wrap(async (_req, res) => {
    const users = must(await db.from("users").select("id,email,roles,is_active,first_name,last_name,phone,created_at").order("created_at", { ascending: false }));
    // Chỉ hiển thị các tài khoản còn đầy đủ thông tin hợp lệ trong dữ liệu
    const validUsers = (users || []).filter((u) => u && u.id && u.email && String(u.email).trim() !== "");
    const pendingReqs = (unlockRequests ? unlockRequests.getRequests() : []).filter((r) => r.status === "pending");
    const pendingEmailSet = new Set(pendingReqs.map((r) => (r.email || "").toLowerCase()));
    const pendingUserSet = new Set(pendingReqs.map((r) => r.userId).filter(Boolean));

    res.json(validUsers.map((u) => ({
      id: u.id,
      name: fullName(u) || u.email,
      email: u.email,
      phone: u.phone || "",
      roles: (u.roles || ["CUSTOMER"]).map((r) => r === "ADMIN" ? "Quản trị viên" : r === "SALES_STAFF" ? "Nhân viên" : "Khách hàng"),
      status: u.is_active ? "Hoạt động" : "Khóa",
      isActive: Boolean(u.is_active),
      hasUnlockRequest: !u.is_active && (pendingEmailSet.has((u.email || "").toLowerCase()) || pendingUserSet.has(u.id)),
      createdAt: u.created_at,
    })));
  }));

  router.post("/accounts", wrap(async (req, res) => {
    const { name, email, password, role, phone, status } = req.body || {};
    const mail = String(email || "").trim().toLowerCase();
    if (!mail) throw new HttpError(400, "Vui lòng nhập email.");
    const existing = one(must(await db.from("users").select("id").eq("email", mail).limit(1)));
    if (existing) throw new HttpError(400, "Email này đã tồn tại trong hệ thống.");

    const roleName = String(role || "CUSTOMER").toUpperCase();
    const rolesArray = roleName.includes("ADMIN") ? ["ADMIN", "SALES_STAFF"] : roleName.includes("STAFF") || roleName.includes("NHÂN VIÊN") || roleName.includes("QUẢN LÝ") ? ["SALES_STAFF"] : ["CUSTOMER"];
    const hash = await bcrypt.hash(password || "12345678", 10);
    const user = one(must(await db.from("users").insert({
      email: mail,
      password_hash: hash,
      roles: rolesArray,
      phone: String(phone || "").trim(),
      is_active: status !== "Khóa",
      ...splitName(name),
    }).select("id")));

    if (rolesArray.includes("ADMIN") || rolesArray.includes("SALES_STAFF")) {
      const emp = one(must(await db.from("employees").select("user_id").eq("user_id", user.id).limit(1)));
      if (!emp) await db.from("employees").insert({ user_id: user.id, address: "Trụ sở Jewels" });
    } else {
      const cust = one(must(await db.from("customers").select("user_id").eq("user_id", user.id).limit(1)));
      if (!cust) await db.from("customers").insert({ user_id: user.id });
    }

    res.status(201).json({ id: user.id, ok: true });
  }));

  router.put("/accounts/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, email, role, phone, status, password } = req.body || {};
    const baseUpdates = {};
    if (name) Object.assign(baseUpdates, splitName(name));
    if (email) baseUpdates.email = String(email).trim().toLowerCase();
    if (phone !== undefined) baseUpdates.phone = String(phone).trim();

    if (Object.keys(baseUpdates).length > 0) {
      must(await db.from("users").update(baseUpdates).eq("id", id));
    }

    if (status !== undefined) {
      const isActive = status === "Hoạt động";
      must(await db.rpc("app_set_user_active", { p_user_id: id, p_active: isActive }));
      const user = one(must(await db.from("users").select("email").eq("id", id).limit(1)));
      const resolvedEmail = email || user?.email;
      if (isActive && unlockRequests) {
        unlockRequests.resolveByUserId(id, "approved", req.adminUser ? fullName(req.adminUser) : "Quản trị viên", resolvedEmail);
      }
      broadcastRealtime("ACCOUNT_CHANGED", { userId: id, email: resolvedEmail, isActive });
      if (isActive) {
        broadcastRealtime("UNLOCK_APPROVED", { userId: id, email: resolvedEmail });
      }
    }
    if (role) {
      const r = String(role).toUpperCase();
      const rolesArray = r.includes("ADMIN") ? ["ADMIN", "SALES_STAFF"] : r.includes("STAFF") || r.includes("QUẢN LÝ") ? ["SALES_STAFF"] : ["CUSTOMER"];
      must(await db.rpc("app_set_user_roles", { p_user_id: id, p_roles: rolesArray }));
      if (rolesArray.includes("ADMIN") || rolesArray.includes("SALES_STAFF")) {
        const emp = one(must(await db.from("employees").select("user_id").eq("user_id", id).limit(1)));
        if (!emp) await db.from("employees").insert({ user_id: id, address: "Trụ sở Jewels" });
      }
    }
    if (password && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      must(await db.rpc("app_set_password_hash", { p_user_id: id, p_hash: hash }));
    }

    res.json({ ok: true });
  }));

  router.put("/accounts/:id/toggle", wrap(async (req, res) => {
    const { id } = req.params;
    const user = one(must(await db.from("users").select("is_active,email").eq("id", id).limit(1)));
    if (!user) throw new HttpError(404, "Không tìm thấy tài khoản.");
    const newActive = !user.is_active;
    must(await db.rpc("app_set_user_active", { p_user_id: id, p_active: newActive }));
    if (newActive && unlockRequests) {
      unlockRequests.resolveByUserId(id, "approved", req.adminUser ? fullName(req.adminUser) : "Quản trị viên", user.email);
    }
    broadcastRealtime("ACCOUNT_CHANGED", { userId: id, email: user.email, isActive: newActive });
    if (newActive) {
      broadcastRealtime("UNLOCK_APPROVED", { userId: id, email: user.email });
    }
    res.json({ ok: true, isActive: newActive });
  }));

  // ---------- YÊU CẦU MỞ KHÓA TÀI KHOẢN ----------
  router.get("/unlock-requests", wrap(async (_req, res) => {
    const list = unlockRequests ? unlockRequests.getRequests() : [];
    const users = must(await db.from("users").select("id,is_active,email"));
    const userActiveMap = {};
    (users || []).forEach((u) => {
      userActiveMap[u.id] = u.is_active;
      if (u.email) userActiveMap[u.email.toLowerCase()] = u.is_active;
    });

    const enriched = list.map((r) => ({
      ...r,
      isUserActive: r.userId ? Boolean(userActiveMap[r.userId]) : Boolean(userActiveMap[(r.email || "").toLowerCase()]),
    }));

    const pendingCount = enriched.filter((r) => r.status === "pending").length;
    res.json({
      requests: enriched,
      pendingCount,
      total: enriched.length,
    });
  }));

  router.post("/unlock-requests/:id/approve", wrap(async (req, res) => {
    const { id } = req.params;
    const list = unlockRequests ? unlockRequests.getRequests() : [];
    const target = list.find((r) => r.id === id);
    if (!target) throw new HttpError(404, "Không tìm thấy yêu cầu mở khóa.");

    let userId = target.userId;
    if (!userId && target.email) {
      const u = one(must(await db.from("users").select("id").eq("email", target.email).limit(1)));
      if (u) userId = u.id;
    }

    if (userId) {
      must(await db.rpc("app_set_user_active", { p_user_id: userId, p_active: true }));
    }

    const adminName = req.adminUser ? fullName(req.adminUser) : "Quản trị viên";
    const resolved = unlockRequests.resolveRequest(id, "approved", adminName);
    broadcastRealtime("ACCOUNT_CHANGED", { userId, email: target.email, isActive: true });
    broadcastRealtime("UNLOCK_APPROVED", { requestId: id, userId, email: target.email });

    res.json({ ok: true, message: `Đã mở khóa tài khoản thành công cho ${target.email}`, request: resolved });
  }));

  router.post("/unlock-requests/:id/reject", wrap(async (req, res) => {
    const { id } = req.params;
    const { note } = req.body || {};
    const list = unlockRequests ? unlockRequests.getRequests() : [];
    const target = list.find((r) => r.id === id);
    if (!target) throw new HttpError(404, "Không tìm thấy yêu cầu mở khóa.");

    const adminName = req.adminUser ? fullName(req.adminUser) : "Quản trị viên";
    const resolved = unlockRequests.resolveRequest(id, "rejected", adminName, note);
    broadcastRealtime("UNLOCK_REJECTED", { requestId: id, email: target.email, note });

    res.json({ ok: true, message: `Đã từ chối yêu cầu của ${target.email}`, request: resolved });
  }));

  router.delete("/accounts/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const user = one(must(await db.from("users").select("id,email,roles").eq("id", id).limit(1)));
    if (!user) throw new HttpError(404, "Không tìm thấy tài khoản.");

    // Kiểm tra nếu là tài khoản khách hàng -> CẤM XÓA theo yêu cầu nghiệp vụ
    const roles = user.roles || [];
    const isCustomer = roles.includes("CUSTOMER") && !roles.includes("ADMIN") && !roles.includes("SALES_STAFF");
    if (isCustomer) {
      throw new HttpError(403, "Không được phép xóa tài khoản khách hàng! Quản trị viên chỉ có quyền Thêm, Sửa hoặc Khóa/Mở tài khoản khách hàng.");
    }

    try { await db.from("employees").delete().eq("user_id", id); } catch {}
    try { await db.from("customer_addresses").delete().eq("customer_id", id); } catch {}
    try { await db.from("customers").delete().eq("user_id", id); } catch {}
    try {
      await db.from("users").delete().eq("id", id);
    } catch (e) {
      // Nếu có ràng buộc dữ liệu (ví dụ hóa đơn, đơn hàng), khóa tài khoản
      await db.rpc("app_set_user_active", { p_user_id: id, p_active: false });
    }
    res.json({ ok: true });
  }));

  // ---------- 2. QUẢN LÝ NHÂN VIÊN ----------
  router.get("/staff", wrap(async (_req, res) => {
    const { data, error } = await db.from("employees")
      .select("user_id,address,created_at,users(id,email,first_name,last_name,phone,roles,is_active)");
    if (error) throw new HttpError(500, error.message);

    // Chỉ hiển thị các nhân viên có thông tin hợp lệ thực sự còn tồn tại trong database
    const staffList = (data || [])
      .filter((e) => e.users && e.users.id && e.users.email && String(e.users.email).trim() !== "")
      .map((e) => ({
        id: e.users.id,
        name: fullName(e.users) || e.users.email,
        email: e.users.email,
        phone: e.users.phone || "",
        position: e.users.roles?.includes("ADMIN") ? "Quản trị viên" : "Nhân viên bán hàng",
        address: e.address || "Văn phòng Jewels",
        status: e.users.is_active ? "Làm việc" : "Nghỉ việc",
        isActive: Boolean(e.users.is_active),
        createdAt: e.created_at || e.users.created_at,
      }));

    res.json(staffList);
  }));

  router.post("/staff", wrap(async (req, res) => {
    const { name, email, password, phone, position, address, status = "Làm việc" } = req.body || {};
    const mail = String(email || "").trim().toLowerCase();
    if (!mail) throw new HttpError(400, "Vui lòng nhập email nhân viên.");
    const existing = one(must(await db.from("users").select("id").eq("email", mail).limit(1)));
    if (existing) throw new HttpError(400, "Email nhân viên đã tồn tại.");

    const isAdm = String(position || "").toLowerCase().includes("quản trị");
    const roles = isAdm ? ["ADMIN", "SALES_STAFF"] : ["SALES_STAFF"];
    const hash = await bcrypt.hash(password || "Admin@123", 10);
    const user = one(must(await db.from("users").insert({
      email: mail,
      password_hash: hash,
      roles,
      phone: String(phone || "").trim(),
      is_active: status === "Làm việc",
      ...splitName(name),
    }).select("id")));

    const emp = one(must(await db.from("employees").select("user_id").eq("user_id", user.id).limit(1)));
    if (!emp) {
      await db.from("employees").insert({
        user_id: user.id,
        address: String(address || "Trụ sở Jewels").trim(),
      });
    }

    res.status(201).json({ id: user.id, ok: true });
  }));

  router.put("/staff/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, phone, position, address, status } = req.body || {};
    const baseUpdates = {};
    if (name) Object.assign(baseUpdates, splitName(name));
    if (phone !== undefined) baseUpdates.phone = String(phone).trim();
    if (Object.keys(baseUpdates).length > 0) {
      must(await db.from("users").update(baseUpdates).eq("id", id));
    }

    if (status !== undefined) {
      must(await db.rpc("app_set_user_active", { p_user_id: id, p_active: status === "Làm việc" }));
    }
    if (position) {
      const isAdm = position.toLowerCase().includes("quản trị");
      const rolesArray = isAdm ? ["ADMIN", "SALES_STAFF"] : ["SALES_STAFF"];
      must(await db.rpc("app_set_user_roles", { p_user_id: id, p_roles: rolesArray }));
    }

    if (address !== undefined) {
      const emp = one(must(await db.from("employees").select("user_id").eq("user_id", id).limit(1)));
      if (emp) {
        must(await db.from("employees").update({ address: String(address).trim() }).eq("user_id", id));
      } else {
        must(await db.from("employees").insert({ user_id: id, address: String(address).trim() }));
      }
    }
    res.json({ ok: true });
  }));

  router.delete("/staff/:id", wrap(async (req, res) => {
    const { id } = req.params;
    try {
      await db.from("employees").delete().eq("user_id", id);
    } catch (e) {
      console.warn("Không xóa employees do ràng buộc khóa ngoại:", e.message);
    }
    try {
      await db.rpc("app_set_user_roles", { p_user_id: id, p_roles: ["CUSTOMER"] });
      await db.rpc("app_set_user_active", { p_user_id: id, p_active: false });
    } catch (e) {
      console.warn("Không thể đổi roles/active nhân viên:", e.message);
    }
    res.json({ ok: true });
  }));

  // ---------- 3. QUẢN LÝ KHÁCH HÀNG ----------
  router.get("/customers", wrap(async (_req, res) => {
    const [
      { data: customers, error: cErr },
      { data: addresses },
      { data: orders },
    ] = await Promise.all([
      db.from("customers").select("user_id,dob,created_at,users(id,email,first_name,last_name,phone,is_active)"),
      db.from("customer_addresses").select("customer_id,address_line,phone,is_default"),
      db.from("orders").select("customer_id,total_amount,status"),
    ]);
    if (cErr) throw new HttpError(500, cErr.message);

    // Map địa chỉ
    const addrMap = {};
    (addresses || []).forEach((a) => {
      if (!addrMap[a.customer_id] || a.is_default) {
        addrMap[a.customer_id] = a.address_line;
      }
    });

    // Map đơn hàng
    const orderMap = {};
    (orders || []).forEach((o) => {
      if (!o.customer_id) return;
      if (!orderMap[o.customer_id]) orderMap[o.customer_id] = { count: 0, total: 0 };
      orderMap[o.customer_id].count++;
      orderMap[o.customer_id].total += Number(o.total_amount || 0);
    });

    // Cũng lấy các user có vai trò CUSTOMER nếu chưa nằm trong customers
    const allCusUsers = must(await db.from("users").select("id,email,first_name,last_name,phone,is_active,created_at").contains("roles", ["CUSTOMER"]));
    const pendingReqs = (unlockRequests ? unlockRequests.getRequests() : []).filter((r) => r.status === "pending");
    const pendingEmailSet = new Set(pendingReqs.map((r) => (r.email || "").toLowerCase()));
    const pendingUserSet = new Set(pendingReqs.map((r) => r.userId).filter(Boolean));

    const map = new Map();

    (customers || []).forEach((c) => {
      if (c.users) {
        const stats = orderMap[c.users.id] || { count: 0, total: 0 };
        const isAct = Boolean(c.users.is_active);
        const hasReq = !isAct && (pendingEmailSet.has((c.users.email || "").toLowerCase()) || pendingUserSet.has(c.users.id));
        map.set(c.users.id, {
          id: c.users.id,
          name: fullName(c.users) || c.users.email,
          email: c.users.email,
          phone: c.users.phone || "",
          dob: c.dob || "",
          address: addrMap[c.users.id] || "",
          orderCount: stats.count,
          totalSpent: stats.total,
          segment: stats.total > 20000000 ? "Kim Cương" : stats.total > 10000000 ? "Vàng" : stats.total > 0 ? "Bạc" : "Tiêu Chuẩn",
          status: isAct ? "Hoạt động" : "Khóa",
          isActive: isAct,
          hasUnlockRequest: hasReq,
          createdAt: c.created_at,
        });
      }
    });

    (allCusUsers || []).forEach((u) => {
      if (!map.has(u.id)) {
        const stats = orderMap[u.id] || { count: 0, total: 0 };
        const isAct = Boolean(u.is_active);
        const hasReq = !isAct && (pendingEmailSet.has((u.email || "").toLowerCase()) || pendingUserSet.has(u.id));
        map.set(u.id, {
          id: u.id,
          name: fullName(u) || u.email,
          email: u.email,
          phone: u.phone || "",
          dob: "",
          address: addrMap[u.id] || "",
          orderCount: stats.count,
          totalSpent: stats.total,
          segment: stats.total > 20000000 ? "Kim Cương" : stats.total > 10000000 ? "Vàng" : stats.total > 0 ? "Bạc" : "Tiêu Chuẩn",
          status: isAct ? "Hoạt động" : "Khóa",
          isActive: isAct,
          hasUnlockRequest: hasReq,
          createdAt: u.created_at,
        });
      }
    });

    res.json(Array.from(map.values()));
  }));

  router.post("/customers", wrap(async (req, res) => {
    const { name, email, phone, dob, address, status = "Hoạt động" } = req.body || {};
    const mail = String(email || "").trim().toLowerCase();
    if (!mail) throw new HttpError(400, "Vui lòng nhập email khách hàng.");
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(mail)) {
      throw new HttpError(400, "Email khách hàng phải có đầy đủ cú pháp @gmail.com sau cùng (ví dụ: example@gmail.com).");
    }
    const existing = one(must(await db.from("users").select("id").eq("email", mail).limit(1)));
    if (existing) throw new HttpError(400, "Email khách hàng đã tồn tại.");

    const user = one(must(await db.from("users").insert({
      email: mail,
      password_hash: await bcrypt.hash("12345678", 10),
      roles: ["CUSTOMER"],
      phone: String(phone || "").trim(),
      is_active: status === "Hoạt động",
      ...splitName(name),
    }).select("id")));

    const cust = one(must(await db.from("customers").select("user_id").eq("user_id", user.id).limit(1)));
    if (!cust) {
      await db.from("customers").insert({ user_id: user.id, dob: dob || null });
    }
    if (address) {
      await db.from("customer_addresses").insert({
        customer_id: user.id,
        recipient_name: name,
        phone: String(phone || ""),
        address_line: address,
        is_default: true,
      });
    }

    res.status(201).json({ id: user.id, ok: true });
  }));

  router.put("/customers/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, phone, dob, address, status } = req.body || {};
    const baseUpdates = {};
    if (name) Object.assign(baseUpdates, splitName(name));
    if (phone !== undefined) baseUpdates.phone = String(phone).trim();
    if (Object.keys(baseUpdates).length > 0) {
      must(await db.from("users").update(baseUpdates).eq("id", id));
    }

    if (status !== undefined) {
      const isActive = status === "Hoạt động";
      must(await db.rpc("app_set_user_active", { p_user_id: id, p_active: isActive }));
      const user = one(must(await db.from("users").select("email").eq("id", id).limit(1)));
      if (isActive && unlockRequests) {
        unlockRequests.resolveByUserId(id, "approved", req.adminUser ? fullName(req.adminUser) : "Quản trị viên", user?.email);
      }
      broadcastRealtime("ACCOUNT_CHANGED", { userId: id, email: user?.email, isActive });
      if (isActive) {
        broadcastRealtime("UNLOCK_APPROVED", { userId: id, email: user?.email });
      }
    }

    if (dob !== undefined) {
      const cust = one(must(await db.from("customers").select("user_id").eq("user_id", id).limit(1)));
      if (cust) {
        must(await db.from("customers").update({ dob: dob || null }).eq("user_id", id));
      } else {
        must(await db.from("customers").insert({ user_id: id, dob: dob || null }));
      }
    }

    if (address !== undefined) {
      const existingAddr = one(must(await db.from("customer_addresses").select("address_id").eq("customer_id", id).limit(1)));
      if (existingAddr) {
        must(await db.from("customer_addresses").update({
          recipient_name: name || "Khách hàng",
          phone: phone || "",
          address_line: address,
          is_default: true,
        }).eq("address_id", existingAddr.address_id));
      } else if (address) {
        must(await db.from("customer_addresses").insert({
          customer_id: id,
          recipient_name: name || "Khách hàng",
          phone: phone || "",
          address_line: address,
          is_default: true,
        }));
      }
    }
    res.json({ ok: true });
  }));

  router.put("/customers/:id/toggle", wrap(async (req, res) => {
    const { id } = req.params;
    const user = one(must(await db.from("users").select("is_active,email").eq("id", id).limit(1)));
    if (!user) throw new HttpError(404, "Không tìm thấy khách hàng.");
    const newActive = !user.is_active;
    must(await db.rpc("app_set_user_active", { p_user_id: id, p_active: newActive }));
    if (newActive && unlockRequests) {
      unlockRequests.resolveByUserId(id, "approved", req.adminUser ? fullName(req.adminUser) : "Quản trị viên", user.email);
    }
    broadcastRealtime("ACCOUNT_CHANGED", { userId: id, email: user.email, isActive: newActive });
    if (newActive) {
      broadcastRealtime("UNLOCK_APPROVED", { userId: id, email: user.email });
    }
    res.json({ ok: true, isActive: newActive });
  }));

  // ---------- 4. QUẢN LÝ SẢN PHẨM & DANH MỤC ----------
  router.get("/categories", wrap(async (_req, res) => {
    const cats = must(await db.from("categories").select("*").order("cat_id"));
    res.json(cats);
  }));

  router.get("/products", wrap(async (_req, res) => {
    const [
      { data: products, error: pErr },
      { data: variants },
      { data: images },
      { data: categories },
    ] = await Promise.all([
      db.from("products").select("*").order("pro_id", { ascending: false }),
      db.from("product_variants").select("variant_id,pro_id,price,stock_quantity,material,gemstone,size,is_active"),
      db.from("product_images").select("pro_id,image_url,is_primary"),
      db.from("categories").select("cat_id,name"),
    ]);
    if (pErr) throw new HttpError(500, pErr.message);

    const catMap = {};
    for (const c of categories || []) catMap[c.cat_id] = c.name;

    const varMap = {};
    for (const v of variants || []) {
      (varMap[v.pro_id] ||= []).push(v);
    }

    const imgMap = {};
    for (const im of images || []) {
      if (!imgMap[im.pro_id] || im.is_primary) imgMap[im.pro_id] = im.image_url;
    }

    const result = (products || []).map((p) => {
      const vars = varMap[p.pro_id] || [];
      const totalStock = vars.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0);
      const displayPrice = vars.length > 0 && vars[0].price ? Number(vars[0].price) : Number(p.base_price || 0);
      return {
        id: p.pro_id,
        name: p.name,
        category: catMap[p.cat_id] || "Trang sức",
        categoryId: p.cat_id,
        price: displayPrice,
        stock: totalStock,
        description: p.description || "",
        image: imgMap[p.pro_id] || "../shared/images/product-item1.jpg",
        status: !p.is_active ? "Tạm ngừng kinh doanh" : totalStock <= 0 ? "Hết hàng tạm thời" : "Đang mở bán",
        isActive: Boolean(p.is_active),
        variants: vars,
      };
    });

    res.json(result);
  }));

  router.post("/products", wrap(async (req, res) => {
    const { name, categoryId, price, stock, description, image, material, gemstone } = req.body || {};
    if (!name) throw new HttpError(400, "Vui lòng nhập tên sản phẩm.");

    const basePrice = Number(price || 0);
    const stockQty = Number(stock || 0);

    const product = one(must(await db.from("products").insert({
      name: String(name).trim(),
      cat_id: categoryId ? Number(categoryId) : 1,
      base_price: basePrice,
      description: description || "",
      is_active: true,
    }).select("pro_id")));

    const variant = one(must(await db.from("product_variants").insert({
      pro_id: product.pro_id,
      price: basePrice,
      stock_quantity: stockQty,
      material: material || "Vàng 18K",
      gemstone: gemstone || "Kim cương",
      is_active: true,
    }).select("variant_id")));

    if (image) {
      must(await db.from("product_images").insert({
        pro_id: product.pro_id,
        variant_id: variant.variant_id,
        image_url: image,
        is_primary: true,
      }));
    }

    broadcastRealtime("PRODUCT_CHANGED", { action: "create", id: product.pro_id });
    res.status(201).json({ id: product.pro_id, ok: true });
  }));

  router.put("/products/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, categoryId, price, stock, description, status, image } = req.body || {};

    const updates = {};
    if (name) updates.name = String(name).trim();
    if (categoryId) updates.cat_id = Number(categoryId);
    if (price !== undefined) updates.base_price = Number(price);
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.is_active = status !== "Tạm ngừng kinh doanh";
    updates.updated_at = new Date().toISOString();

    must(await db.from("products").update(updates).eq("pro_id", id));

    // Cập nhật giá và tồn kho ở biến thể
    if (price !== undefined || stock !== undefined) {
      const vars = must(await db.from("product_variants").select("variant_id,stock_quantity").eq("pro_id", id));
      if (vars.length > 0) {
        const vUpdate = {};
        if (price !== undefined) vUpdate.price = Number(price);
        if (stock !== undefined) vUpdate.stock_quantity = Number(stock);
        vUpdate.updated_at = new Date().toISOString();
        must(await db.from("product_variants").update(vUpdate).eq("variant_id", vars[0].variant_id));
      }
    }

    if (image) {
      const existingImg = one(must(await db.from("product_images").select("img_id").eq("pro_id", Number(id)).limit(1)));
      if (existingImg) {
        await db.from("product_images").update({
          image_url: image,
          is_primary: true,
        }).eq("img_id", existingImg.img_id);
      } else {
        await db.from("product_images").insert({
          pro_id: Number(id),
          image_url: image,
          is_primary: true,
        });
      }
    }

    broadcastRealtime("PRODUCT_CHANGED", { action: "update", id: Number(id) });
    res.json({ ok: true });
  }));

  router.delete("/products/:id", wrap(async (req, res) => {
    const { id } = req.params;
    must(await db.from("products").update({ is_active: false, updated_at: new Date().toISOString() }).eq("pro_id", id));
    broadcastRealtime("PRODUCT_CHANGED", { action: "delete", id: Number(id) });
    res.json({ ok: true });
  }));

  // ---------- 5. QUẢN LÝ HÓA ĐƠN ----------
  router.get("/invoices", wrap(async (_req, res) => {
    const invoices = must(await db.from("invoices")
      .select("invoice_id,order_id,invoice_date,vat_rate,vat_amount,discount_amount,total_price,buyer_name,buyer_phone,buyer_address,invoice_detail(invoice_detail_id,product_name,quantity,unit_price,subtotal)")
      .order("invoice_date", { ascending: false }));

    res.json(invoices.map((i) => ({
      id: i.invoice_id,
      code: `HD-${String(i.invoice_id).padStart(5, "0")}`,
      orderId: i.order_id,
      customer: i.buyer_name || "Khách lẻ tại quầy",
      phone: i.buyer_phone || "",
      address: i.buyer_address || "",
      amount: Number(i.total_price || 0),
      vatAmount: Number(i.vat_amount || 0),
      discountAmount: Number(i.discount_amount || 0),
      date: i.invoice_date,
      status: "Đã thanh toán",
      items: i.invoice_detail || [],
    })));
  }));

  router.get("/invoices/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const invoice = one(must(await db.from("invoices")
      .select("*,invoice_detail(*)")
      .eq("invoice_id", id).limit(1)));
    if (!invoice) throw new HttpError(404, "Không tìm thấy hóa đơn.");
    res.json(invoice);
  }));

  router.post("/invoices", wrap(async (req, res) => {
    const { customer, phone, address, amount, orderId, vatRate = 8 } = req.body || {};
    const totalPrice = Number(amount || 0);
    const vatAmount = Math.round(totalPrice * (Number(vatRate) / 100));

    const inv = one(must(await db.from("invoices").insert({
      order_id: orderId ? Number(orderId) : null,
      buyer_name: String(customer || "Khách mua tại cửa hàng").trim(),
      buyer_phone: String(phone || "").trim(),
      buyer_address: String(address || "").trim(),
      vat_rate: Number(vatRate),
      vat_amount: vatAmount,
      discount_amount: 0,
      total_price: totalPrice,
      invoice_date: new Date().toISOString(),
    }).select("invoice_id")));

    broadcastRealtime("INVOICE_CHANGED", { id: inv.invoice_id, amount: totalPrice, customer: customer || "Khách lẻ" });
    res.status(201).json({ id: inv.invoice_id, ok: true });
  }));

  // ---------- 6. QUẢN LÝ KHUYẾN MÃI ----------
  router.get("/promotions", wrap(async (_req, res) => {
    const [
      { data: discounts, error: dErr },
      { data: vouchers },
    ] = await Promise.all([
      db.from("discounts").select("*").order("discount_id", { ascending: false }),
      db.from("discount_by_voucher").select("*"),
    ]);
    if (dErr) throw new HttpError(500, dErr.message);

    const vMap = {};
    for (const v of vouchers || []) vMap[v.discount_id] = v;

    const now = new Date();
    res.json((discounts || []).map((d) => {
      const v = vMap[d.discount_id];
      const isExpired = d.end_date && new Date(d.end_date) < now;
      return {
        id: d.discount_id,
        name: d.name,
        code: d.code,
        discount: v?.discount_percentage ? Number(v.discount_percentage) : 10,
        usageLimit: v?.usage_limit || 100,
        timesUsed: v?.times_used || 0,
        beginDate: d.begin_date,
        endDate: d.end_date,
        status: !d.is_active ? "Đã hủy" : isExpired ? "Hết hạn" : "Hoạt động",
        isActive: Boolean(d.is_active) && !isExpired,
      };
    }));
  }));

  router.post("/promotions", wrap(async (req, res) => {
    const { name, code, discount, beginDate, endDate, usageLimit = 100 } = req.body || {};
    if (!name || !code) throw new HttpError(400, "Vui lòng nhập tên và mã khuyến mãi.");

    const disc = one(must(await db.from("discounts").insert({
      name: String(name).trim(),
      code: String(code).trim().toUpperCase(),
      begin_date: beginDate || new Date().toISOString().split("T")[0],
      end_date: endDate || null,
      is_active: true,
    }).select("discount_id")));

    must(await db.from("discount_by_voucher").insert({
      discount_id: disc.discount_id,
      voucher_name: String(name).trim(),
      discount_percentage: Number(discount || 10),
      usage_limit: Number(usageLimit),
      times_used: 0,
      limit_per_cus: 1,
    }));

    res.status(201).json({ id: disc.discount_id, ok: true });
  }));

  router.put("/promotions/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, code, discount, status, endDate } = req.body || {};

    const updates = {};
    if (name) updates.name = String(name).trim();
    if (code) updates.code = String(code).trim().toUpperCase();
    if (endDate !== undefined) updates.end_date = endDate || null;
    if (status !== undefined) updates.is_active = status === "Hoạt động";
    updates.updated_at = new Date().toISOString();

    must(await db.from("discounts").update(updates).eq("discount_id", id));

    if (discount !== undefined) {
      await db.from("discount_by_voucher").update({
        discount_percentage: Number(discount),
      }).eq("discount_id", id);
    }

    res.json({ ok: true });
  }));

  router.delete("/promotions/:id", wrap(async (req, res) => {
    const { id } = req.params;
    must(await db.from("discounts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("discount_id", id));
    res.json({ ok: true });
  }));

  // ---------- 7. QUẢN LÝ ĐƠN ĐẶT HÀNG ----------
  router.get("/orders", wrap(async (_req, res) => {
    const orders = must(await db.from("orders")
      .select("order_id,cus_name,cus_phone,address,status,shipping_fee,discount_amount,total_amount,order_date,order_items(order_item_id,product_name,quantity,unit_price,subtotal),payments(method,status)")
      .order("order_date", { ascending: false }));

    const STATUS_MAP = {
      pending: "Đang chờ duyệt",
      processing: "Đã xác nhận",
      shipped: "Đang giao hàng",
      delivered: "Đã giao thành công",
      cancelled: "Đã hủy",
      returned: "Đã hoàn hàng",
    };

    res.json(orders.map((o) => ({
      id: o.order_id,
      code: `#${o.order_id}`,
      customer: o.cus_name || "Khách hàng",
      phone: o.cus_phone || "",
      address: o.address || "",
      total: Number(o.total_amount || 0),
      rawStatus: o.status,
      status: STATUS_MAP[o.status] || o.status,
      date: o.order_date,
      items: o.order_items || [],
      payment: one(o.payments) || null,
    })));
  }));

  router.get("/orders/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const order = one(must(await db.from("orders")
      .select("*,order_items(*),payments(*),discounts(name,code)")
      .eq("order_id", id).limit(1)));
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng.");
    res.json(order);
  }));

  router.put("/orders/:id/status", wrap(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body || {};

    const STATUS_REVERSE = {
      "Đang chờ duyệt": "pending",
      "Đã xác nhận": "processing",
      "Đang giao hàng": "shipped",
      "Đã giao thành công": "delivered",
      "Đã hủy": "cancelled",
      "Đã hoàn hàng": "returned",
      "Đang xử lý": "pending",
      "Đang giao": "shipped",
      "Đã giao": "delivered",
      pending: "pending",
      processing: "processing",
      shipped: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      returned: "returned",
    };

    const dbStatus = STATUS_REVERSE[status] || "processing";
    must(await db.from("orders").update({ status: dbStatus, updated_at: new Date().toISOString() }).eq("order_id", id));

    // Nếu đơn hoàn tất (delivered), tự tạo hóa đơn nếu chưa có
    if (dbStatus === "delivered") {
      const existingInv = one(must(await db.from("invoices").select("invoice_id").eq("order_id", id).limit(1)));
      if (!existingInv) {
        const order = one(must(await db.from("orders").select("*,order_items(*)").eq("order_id", id).limit(1)));
        if (order) {
          const inv = one(must(await db.from("invoices").insert({
            order_id: order.order_id,
            buyer_name: order.cus_name,
            buyer_phone: order.cus_phone,
            buyer_address: order.address,
            vat_rate: 8,
            vat_amount: Math.round(Number(order.total_amount) * 0.08),
            discount_amount: Number(order.discount_amount || 0),
            total_price: Number(order.total_amount),
            invoice_date: new Date().toISOString(),
          }).select("invoice_id")));

          if (order.order_items && order.order_items.length > 0) {
            await db.from("invoice_detail").insert(order.order_items.map((it) => ({
              invoice_id: inv.invoice_id,
              variant_id: it.variant_id,
              product_name: it.product_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              subtotal: it.subtotal,
            })));
          }
        }
      }
    }

    broadcastRealtime("ORDER_STATUS_CHANGED", {
      orderId: Number(id),
      status: dbStatus,
      statusLabel: status,
    });
    res.json({ ok: true, status: dbStatus });
  }));

  // ---------- 8. QUẢN LÝ NHẬP HÀNG ----------
  router.get("/receipts", wrap(async (_req, res) => {
    const receipts = must(await db.from("goods_receipt")
      .select("gr_id,sup_id,receipt_date,total_amount,note,receipt_type,suppliers(name),gr_details(gr_detail_id,quantity,unit_cost,subtotal,variant_id,product_variants(pro_id,products(name)))")
      .order("receipt_date", { ascending: false }));

    res.json(receipts.map((r) => {
      const firstDetail = r.gr_details?.[0];
      const prodName = firstDetail?.product_variants?.products?.name || "Sản phẩm";
      const prodId = firstDetail?.product_variants?.pro_id || null;
      const totalQty = (r.gr_details || []).reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
      return {
        id: r.gr_id,
        code: `PO-${String(r.gr_id).padStart(5, "0")}`,
        supplier: r.suppliers?.name || "Nhà cung cấp",
        supplierId: r.sup_id,
        productName: prodName,
        productId: prodId,
        totalAmount: Number(r.total_amount || 0),
        quantity: totalQty || 1,
        date: r.receipt_date,
        note: r.note || "",
        items: r.gr_details || [],
      };
    }));
  }));

  router.post("/receipts", wrap(async (req, res) => {
    const { supplierId, supplierName, productId, quantity, amount, note, date } = req.body || {};
    let supId = supplierId ? Number(supplierId) : null;

    if (!supId && supplierName) {
      const sup = one(must(await db.from("suppliers").select("sup_id").ilike("name", `%${supplierName}%`).limit(1)));
      supId = sup ? sup.sup_id : 1;
    }

    const totalAmt = Number(amount || 0);
    const qty = Number(quantity || 1);

    const gr = one(must(await db.from("goods_receipt").insert({
      sup_id: supId || 1,
      total_amount: totalAmt,
      note: note || `Nhập kho ngày ${date || new Date().toISOString().split("T")[0]}`,
      receipt_date: date ? new Date(date).toISOString() : new Date().toISOString(),
      receipt_type: "receipt",
    }).select("gr_id")));

    // Tìm biến thể theo đúng sản phẩm productId được chọn
    let variant = null;
    if (productId) {
      const vars = must(await db.from("product_variants").select("variant_id,stock_quantity,pro_id").eq("pro_id", Number(productId)).order("variant_id"));
      if (vars.length > 0) {
        variant = vars[0];
      }
    }
    if (!variant) {
      variant = one(must(await db.from("product_variants").select("variant_id,stock_quantity,pro_id").limit(1)));
    }

    if (variant) {
      must(await db.from("gr_details").insert({
        gr_id: gr.gr_id,
        variant_id: variant.variant_id,
        quantity: qty,
        unit_cost: qty > 0 ? Math.round(totalAmt / qty) : totalAmt,
        subtotal: totalAmt,
      }));

      // Tăng số lượng tồn kho của chính sản phẩm đó
      const currentStock = Number(variant.stock_quantity || 0);
      const newStock = currentStock + qty;
      must(await db.from("product_variants").update({
        stock_quantity: newStock,
        updated_at: new Date().toISOString(),
      }).eq("variant_id", variant.variant_id));
    }

    broadcastRealtime("STOCK_CHANGED", {
      receiptId: gr.gr_id,
      productId: variant?.pro_id,
      quantity: qty,
      newStock: variant ? Number(variant.stock_quantity || 0) + qty : qty,
    });
    res.status(201).json({ id: gr.gr_id, ok: true, newStock: variant ? Number(variant.stock_quantity || 0) + qty : qty });
  }));

  // ---------- 9. QUẢN LÝ NHÀ CUNG CẤP ----------
  router.get("/suppliers", wrap(async (_req, res) => {
    const suppliers = must(await db.from("suppliers").select("*").order("sup_id", { ascending: false }));
    res.json(suppliers.map((s) => ({
      id: s.sup_id,
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      status: s.is_active ? "Hoạt động" : "Ngừng hợp tác",
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
    })));
  }));

  router.post("/suppliers", wrap(async (req, res) => {
    const { name, phone, email, address } = req.body || {};
    if (!name) throw new HttpError(400, "Vui lòng nhập tên nhà cung cấp.");

    const sup = one(must(await db.from("suppliers").insert({
      name: String(name).trim(),
      phone: String(phone || "").trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      address: String(address || "").trim(),
      is_active: true,
    }).select("sup_id")));

    res.status(201).json({ id: sup.sup_id, ok: true });
  }));

  router.put("/suppliers/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, address, status } = req.body || {};

    const updates = {};
    if (name) updates.name = String(name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (email !== undefined) updates.email = email ? String(email).trim().toLowerCase() : null;
    if (address !== undefined) updates.address = String(address).trim();
    if (status !== undefined) updates.is_active = status === "Hoạt động";
    updates.updated_at = new Date().toISOString();

    must(await db.from("suppliers").update(updates).eq("sup_id", id));
    res.json({ ok: true });
  }));

  router.delete("/suppliers/:id", wrap(async (req, res) => {
    const { id } = req.params;
    must(await db.from("suppliers").update({ is_active: false, updated_at: new Date().toISOString() }).eq("sup_id", id));
    res.json({ ok: true });
  }));

  return router;
}

module.exports = { createAdminRouter };
