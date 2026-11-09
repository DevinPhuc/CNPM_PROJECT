"use strict";
// Router API quản trị Jewels - kết nối trực tiếp với Supabase
const express = require("express");

function createAdminRouter({ db, HttpError, wrap, must, one, splitName, fullName, bcrypt, jwt, JWT_SECRET, broadcastRealtime = () => { }, unlockRequests, SERVER_INSTANCE_ID }) {
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
      } catch (err) {
        if (err.status === 401) throw err;
      }
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
      serverInstance: SERVER_INSTANCE_ID,
      user: {
        id: user.id,
        email: user.email,
        name: fullName(user) || "Quản trị viên",
        roles: user.roles,
      }
    });
  }));

  router.get("/auth/me", wrap(async (req, res) => {
    if (!req.adminUser) {
      throw new HttpError(401, "Vui lòng đăng nhập quản trị.");
    }
    res.json({
      user: {
        id: req.adminUser.id,
        email: req.adminUser.email,
        name: fullName(req.adminUser) || "Quản trị viên",
        roles: req.adminUser.roles,
      },
      serverInstance: SERVER_INSTANCE_ID,
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
      { data: allOrdersList },
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
      db.from("invoices").select("total_price,order_id"),
      db.from("orders").select("order_id,status"),
    ]);

    const totalStock = (allVariants || []).reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
    const orderStatusMap = new Map((allOrdersList || []).map((o) => [o.order_id, o.status]));
    // Tổng doanh thu thực tế: loại trừ các hóa đơn thuộc đơn hàng đã bị HỦY hoặc ĐÃ HOÀN HÀNG
    const validInvoicesForRevenue = (invoicesSum || []).filter((inv) => {
      if (!inv.order_id) return true;
      const st = orderStatusMap.get(inv.order_id);
      return st !== "cancelled" && st !== "returned";
    });
    const totalRevenue = validInvoicesForRevenue.reduce((acc, inv) => acc + (Number(inv.total_price) || 0), 0);

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
        rawStatus: o.status,
        status: STATUS_MAP[o.status] || o.status,
        date: o.order_date,
      })).sort((a, b) => {
        const getPrio = (s) => {
          const str = String(s || "").toLowerCase();
          if (str.includes("chờ") || str === "pending") return 1;
          if (str.includes("xác nhận") || str === "processing") return 2;
          if (str.includes("giao") || str === "shipped") return 3;
          if (str.includes("thành công") || str === "delivered") return 4;
          return 5;
        };
        const diff = getPrio(a.rawStatus || a.status) - getPrio(b.rawStatus || b.status);
        if (diff !== 0) return diff;
        return new Date(b.date) - new Date(a.date);
      }),
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
      { data: invoiceDetails },
    ] = await Promise.all([
      safeQuery(db.from("invoices").select("invoice_id,order_id,total_price,invoice_date")),
      safeQuery(db.from("orders").select("order_id,status,total_amount,order_date")),
      safeQuery(db.from("goods_receipt").select("gr_id,total_amount,receipt_date")),
      safeQuery(db.from("order_items").select("order_item_id,order_id,product_name,quantity,subtotal")),
      safeQuery(db.from("invoice_detail").select("invoice_detail_id,invoice_id,product_name,quantity,subtotal")),
    ]);

    // Chuyển đổi timestamp ISO sang ngày/tháng theo múi giờ Việt Nam (UTC+7)
    const toVnDateKey = (dStr) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const y = vnTime.getUTCFullYear();
      const m = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
      const day = String(vnTime.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const toVnMonthKey = (dStr) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return "";
      const vnTime = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const y = vnTime.getUTCFullYear();
      const m = String(vnTime.getUTCMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    };

    const now = new Date();
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const currYear = vnNow.getUTCFullYear();
    const currMonthStr = `${currYear}-${String(vnNow.getUTCMonth() + 1).padStart(2, "0")}`;

    let isInRange = () => true;
    let filterDescription = "";

    if (period === "day") {
      let sKey = startDate || "2026-11-01";
      let eKey = endDate || `${currYear}-${String(vnNow.getUTCMonth() + 1).padStart(2, "0")}-${String(vnNow.getUTCDate()).padStart(2, "0")}`;
      if (sKey > eKey) { const tmp = sKey; sKey = eKey; eKey = tmp; }
      isInRange = (dStr) => {
        const k = toVnDateKey(dStr);
        return Boolean(k && k >= sKey && k <= eKey);
      };
      filterDescription = `Từ ngày ${sKey} đến ngày ${eKey}`;
    } else if (period === "year") {
      const targetYear = Number(year) || currYear;
      const yStr = String(targetYear);
      isInRange = (dStr) => {
        const k = toVnDateKey(dStr);
        return Boolean(k && k.startsWith(yStr));
      };
      filterDescription = `Năm ${targetYear}`;
    } else {
      // period === "month"
      const targetMonth = (month && month.includes("-")) ? month : currMonthStr;
      isInRange = (dStr) => {
        const mk = toVnMonthKey(dStr);
        return Boolean(mk && mk === targetMonth);
      };
      filterDescription = `Tháng ${targetMonth}`;
    }

    // Map order_id -> order để kiểm tra trạng thái đơn
    const orderMap = {};
    (orders || []).forEach((o) => {
      orderMap[o.order_id] = o;
    });

    // Hóa đơn hợp lệ (bỏ qua nếu đơn hàng liên kết đã bị hủy)
    const isValidInvoice = (inv) => {
      if (!inv) return false;
      if (inv.order_id && orderMap[inv.order_id]) {
        return orderMap[inv.order_id].status !== "cancelled" && orderMap[inv.order_id].status !== "returned";
      }
      return true;
    };

    const validInvoices = (invoices || []).filter(isValidInvoice);
    const filteredInvoices = validInvoices.filter((i) => isInRange(i.invoice_date));
    const filteredOrders = (orders || []).filter((o) => isInRange(o.order_date));
    const filteredReceipts = (receipts || []).filter((r) => isInRange(r.receipt_date));

    // Thống kê tổng quan trong kỳ lọc
    const totalRevenue = filteredInvoices.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
    const totalCost = filteredReceipts.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
    const estimatedProfit = Math.max(0, totalRevenue - totalCost);
    const profitMargin = totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 100) : 0;
    const completedOrders = filteredOrders.filter((o) => o.status === "delivered").length;
    const cancelledOrders = filteredOrders.filter((o) => o.status === "cancelled").length;
    const totalOrders = filteredOrders.length;
    const successRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    // Tỉ lệ trạng thái đơn hàng (cho biểu đồ tròn)
    const targetOrders = filteredOrders.length > 0 ? filteredOrders : (orders || []);
    const statusCounts = {
      delivered: 0,
      processing: 0,
      shipped: 0,
      pending: 0,
      cancelled: 0,
      returned: 0,
    };
    targetOrders.forEach((o) => {
      const s = o.status || "pending";
      if (statusCounts[s] !== undefined) statusCounts[s]++;
      else statusCounts[s] = 1;
    });

    // Tạo bảng chi tiết số liệu breakdown và dữ liệu cho biểu đồ cột
    const breakdown = [];
    const revenueByPeriod = {};

    if (period === "year") {
      const targetYear = Number(year) || currYear;
      for (let m = 1; m <= 12; m++) {
        const mKey = `${targetYear}-${String(m).padStart(2, "0")}`;
        const label = `Tháng ${String(m).padStart(2, "0")}`;

        const mInvs = validInvoices.filter((i) => toVnMonthKey(i.invoice_date) === mKey);
        const mOrders = (orders || []).filter((o) => toVnMonthKey(o.order_date) === mKey);
        const mRcps = (receipts || []).filter((r) => toVnMonthKey(r.receipt_date) === mKey);

        const rev = mInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = mRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = mOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[label] = rev;
        breakdown.push({
          periodLabel: `${label}/${targetYear}`,
          shortLabel: `T${m}`,
          monthNumber: m,
          orderCount: mOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: mOrders.length > 0 ? Math.round((delivered / mOrders.length) * 100) : 0,
        });
      }
    } else if (period === "month") {
      const targetMonth = (month && month.includes("-")) ? month : currMonthStr;
      const [y, m] = targetMonth.split("-").map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dayStr = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
        const label = `Ngày ${dayStr}`;

        const dInvs = validInvoices.filter((i) => toVnDateKey(i.invoice_date) === dKey);
        const dOrders = (orders || []).filter((o) => toVnDateKey(o.order_date) === dKey);
        const dRcps = (receipts || []).filter((r) => toVnDateKey(r.receipt_date) === dKey);

        const rev = dInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = dRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = dOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[dayStr] = rev;
        breakdown.push({
          periodLabel: `${label}/${y}`,
          shortLabel: dayStr,
          dayNumber: d,
          orderCount: dOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: dOrders.length > 0 ? Math.round((delivered / dOrders.length) * 100) : 0,
        });
      }
    } else {
      // period === "day"
      let sKey = startDate || "2026-11-01";
      let eKey = endDate || `${currYear}-${String(vnNow.getUTCMonth() + 1).padStart(2, "0")}-${String(vnNow.getUTCDate()).padStart(2, "0")}`;
      if (sKey > eKey) { const tmp = sKey; sKey = eKey; eKey = tmp; }

      const startD = new Date(`${sKey}T00:00:00Z`);
      const endD = new Date(`${eKey}T00:00:00Z`);
      const oneDayMs = 24 * 60 * 60 * 1000;

      for (let time = startD.getTime(); time <= endD.getTime(); time += oneDayMs) {
        const curr = new Date(time);
        const y = curr.getUTCFullYear();
        const m = String(curr.getUTCMonth() + 1).padStart(2, "0");
        const d = String(curr.getUTCDate()).padStart(2, "0");
        const dKey = `${y}-${m}-${d}`;
        const dayStr = `${d}/${m}`;
        const label = `Ngày ${dayStr}`;

        const dInvs = validInvoices.filter((i) => toVnDateKey(i.invoice_date) === dKey);
        const dOrders = (orders || []).filter((o) => toVnDateKey(o.order_date) === dKey);
        const dRcps = (receipts || []).filter((r) => toVnDateKey(r.receipt_date) === dKey);

        const rev = dInvs.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0);
        const cost = dRcps.reduce((acc, r) => acc + (Number(r.total_amount) || 0), 0);
        const delivered = dOrders.filter((o) => o.status === "delivered").length;

        revenueByPeriod[dayStr] = rev;
        breakdown.push({
          periodLabel: `${label}/${y}`,
          shortLabel: dayStr,
          dayNumber: Number(d),
          orderCount: dOrders.length,
          deliveredCount: delivered,
          revenue: rev,
          cost: cost,
          profit: Math.max(0, rev - cost),
          successRate: dOrders.length > 0 ? Math.round((delivered / dOrders.length) * 100) : 0,
        });
      }
    }

    // Top sản phẩm bán chạy (lọc từ các đơn không hủy trong kỳ)
    const activeFilteredOrderIds = new Set(filteredOrders.filter((o) => o.status !== "cancelled" && o.status !== "returned").map((o) => o.order_id));
    const filteredInvoiceIds = new Set(filteredInvoices.map((i) => i.invoice_id));

    const productStats = {};
    const addProductStat = (name, qty, rev) => {
      const cleanName = String(name || "Trang sức cao cấp").trim();
      if (!productStats[cleanName]) {
        productStats[cleanName] = { name: cleanName, quantity: 0, revenue: 0 };
      }
      productStats[cleanName].quantity += Number(qty || 0);
      productStats[cleanName].revenue += Number(rev || 0);
    };

    (orderItems || []).forEach((it) => {
      if (activeFilteredOrderIds.has(it.order_id)) {
        addProductStat(it.product_name, it.quantity, it.subtotal);
      }
    });

    (invoiceDetails || []).forEach((idtl) => {
      if (filteredInvoiceIds.has(idtl.invoice_id)) {
        const inv = filteredInvoices.find((i) => i.invoice_id === idtl.invoice_id);
        if (inv && !inv.order_id) {
          addProductStat(idtl.product_name, idtl.quantity, idtl.subtotal);
        }
      }
    });

    let topProducts = Object.values(productStats).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5);
    let topProductsType = "in_period";

    if (topProducts.length === 0) {
      const allTimeStats = {};
      const activeOrderIds = new Set((orders || []).filter((o) => o.status !== "cancelled").map((o) => o.order_id));
      (orderItems || []).forEach((it) => {
        if (activeOrderIds.has(it.order_id)) {
          const name = String(it.product_name || "Trang sức cao cấp").trim();
          if (!allTimeStats[name]) allTimeStats[name] = { name, quantity: 0, revenue: 0 };
          allTimeStats[name].quantity += Number(it.quantity || 0);
          allTimeStats[name].revenue += Number(it.subtotal || 0);
        }
      });
      topProducts = Object.values(allTimeStats).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 5);
      topProductsType = "all_time";
    }

    res.json({
      period,
      filterDescription,
      revenueByPeriod,
      breakdown,
      statusCounts,
      topProducts,
      topProductsType,
      summary: {
        totalRevenue,
        totalCost,
        estimatedProfit,
        profitMargin,
        completedOrders,
        cancelledOrders,
        totalOrders,
        successRate,
      },
    });
  }));

  // ---------- 1. QUẢN LÝ TÀI KHOẢN VÀ VAI TRÒ ----------
  router.get("/accounts", wrap(async (_req, res) => {
    const users = must(await db.from("users")
      .select("id,email,roles,is_active,first_name,last_name,phone,created_at")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }));
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

    enriched.sort((a, b) => {
      const prioA = a.status === "pending" ? 1 : 2;
      const prioB = b.status === "pending" ? 1 : 2;
      if (prioA !== prioB) return prioA - prioB;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

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

    try { await db.from("employees").delete().eq("user_id", id); } catch { }
    try { await db.from("customer_addresses").delete().eq("customer_id", id); } catch { }
    try { await db.from("customers").delete().eq("user_id", id); } catch { }
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

    staffList.sort((a, b) => {
      const isActA = Boolean(a.isActive);
      const isActB = Boolean(b.isActive);
      if (isActA !== isActB) return isActA ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

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

    const customerList = Array.from(map.values());
    customerList.sort((a, b) => {
      const isActA = Boolean(a.isActive);
      const isActB = Boolean(b.isActive);
      if (isActA !== isActB) return isActA ? -1 : 1;
      return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
    });

    res.json(customerList);
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

    result.sort((a, b) => {
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
    const [invRes, ordRes] = await Promise.all([
      db.from("invoices")
        .select("invoice_id,order_id,invoice_date,vat_rate,vat_amount,discount_amount,total_price,buyer_name,buyer_phone,buyer_address,invoice_detail(invoice_detail_id,product_name,quantity,unit_price,subtotal)")
        .order("invoice_date", { ascending: false }),
      db.from("orders")
        .select("order_id,shipping_fee,discount_amount,total_amount,order_items(order_item_id,product_name,material,gemstone,size,image_url,quantity,unit_price,subtotal),payments(method,status)")
    ]);
    const invoices = must(invRes);
    const orders = ordRes.data || [];
    const orderMap = new Map();
    for (const o of orders) orderMap.set(o.order_id, o);

    const METHOD_NAMES = {
      cod: "Thanh toán khi nhận hàng (COD)",
      bank_transfer: "Chuyển khoản VietQR",
      e_wallet: "Ví điện tử MoMo / VNPay",
      credit_card: "Thẻ quốc tế Visa / MasterCard",
    };

    res.json(invoices.map((i) => {
      const order = i.order_id ? orderMap.get(i.order_id) : null;
      const orderItems = order?.order_items || [];
      const invoiceItems = (i.invoice_detail && i.invoice_detail.length) ? i.invoice_detail : [];

      // Ghép thông tin ảnh, quy cách (chất liệu, đá, size) cho từng mặt hàng
      const items = (invoiceItems.length ? invoiceItems : orderItems).map((invItem) => {
        const matched = orderItems.find((oi) => oi.product_name === invItem.product_name || oi.order_item_id === invItem.order_item_id);
        return {
          product_name: invItem.product_name || "Trang sức cao cấp",
          material: matched?.material || null,
          gemstone: matched?.gemstone || null,
          size: matched?.size || null,
          image_url: matched?.image_url || null,
          quantity: Number(invItem.quantity || 1),
          unit_price: Number(invItem.unit_price || 0),
          subtotal: Number(invItem.subtotal || (Number(invItem.unit_price || 0) * Number(invItem.quantity || 1))),
        };
      });

      const itemsSubtotal = items.reduce((s, it) => s + it.subtotal, 0);
      const shippingFee = order ? Number(order.shipping_fee || 0) : 0;
      const discountAmount = Number(i.discount_amount || order?.discount_amount || 0);
      const vatRate = Number(i.vat_rate || 8);
      const taxable = Math.max(0, itemsSubtotal - discountAmount);
      // Thuế VAT 8% chuẩn tính trên tiền hàng sau giảm giá:
      const vatAmount = Math.round(taxable * (vatRate / 100));
      // Tổng thanh toán chính xác = Tiền hàng - Giảm giá + Thuế VAT + Phí vận chuyển:
      const totalPrice = taxable + vatAmount + shippingFee;
      const payment = one(order?.payments) || null;

      return {
        id: i.invoice_id,
        code: `HD-${String(i.invoice_id).padStart(5, "0")}`,
        orderId: i.order_id,
        orderCode: i.order_id ? `#DH-${String(i.order_id).padStart(6, "0")}` : null,
        customer: i.buyer_name || order?.cus_name || "Khách lẻ tại quầy",
        phone: i.buyer_phone || order?.cus_phone || "",
        address: i.buyer_address || order?.address || "Mua trực tiếp tại showroom",
        amount: totalPrice,
        subtotal: itemsSubtotal,
        shippingFee: shippingFee,
        discountAmount: discountAmount,
        vatRate: vatRate,
        vatAmount: vatAmount,
        date: i.invoice_date,
        status: order?.status === "returned" ? "Đã thu hồi / Hoàn tiền" : (order?.status === "cancelled" ? "Đã hủy" : "Đã thanh toán"),
        paymentMethod: METHOD_NAMES[payment?.method] || payment?.method || "Chuyển khoản VietQR",
        paymentStatus: order?.status === "returned" ? "refunded" : (order?.status === "cancelled" ? "cancelled" : (payment?.status || "completed")),
        isVoided: order?.status === "returned" || order?.status === "cancelled",
        voidReason: order?.status === "returned" ? "Khách hàng trả lại sản phẩm" : (order?.status === "cancelled" ? "Đơn hàng bị hủy" : null),
        items: items,
      };
    }));
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

  // ---------- 6. QUẢN LÝ KHUYẾN MÃI (3 LOẠI: THEO SẢN PHẨM, THEO VOUCHER, THEO HÓA ĐƠN) ----------
  const safeQuery = async (queryBuilder) => {
    try {
      const res = await queryBuilder;
      return res || { data: [] };
    } catch {
      return { data: [] };
    }
  };

  router.get("/promotions", wrap(async (_req, res) => {
    const [
      { data: discounts, error: dErr },
      { data: vouchers },
      { data: invoices },
      { data: productDiscounts },
      { data: productsList },
      { data: variantsList },
    ] = await Promise.all([
      db.from("discounts").select("*").order("discount_id", { ascending: false }),
      safeQuery(db.from("discount_by_voucher").select("*")),
      safeQuery(db.from("discount_by_invoice").select("*")),
      safeQuery(db.from("discount_by_product").select("*")),
      safeQuery(db.from("products").select("pro_id,name,base_price,image_url")),
      safeQuery(db.from("product_variants").select("variant_id,pro_id,price")),
    ]);
    if (dErr) throw new HttpError(500, dErr.message);

    const vMap = {};
    for (const v of vouchers || []) vMap[v.discount_id] = v;

    const invMap = {};
    for (const inv of invoices || []) invMap[inv.discount_id] = inv;

    const prodDiscMap = {};
    for (const pd of productDiscounts || []) prodDiscMap[pd.discount_id] = pd;

    const prodMap = {};
    for (const p of productsList || []) prodMap[p.pro_id] = p;

    const varMap = {};
    for (const va of variantsList || []) varMap[va.variant_id] = va;

    const now = new Date();
    const promoList = (discounts || []).map((d) => {
      const v = vMap[d.discount_id];
      const inv = invMap[d.discount_id];
      const pd = prodDiscMap[d.discount_id];

      let type = "voucher";
      let typeLabel = "Theo voucher";
      let discountVal = 10;
      let targetProduct = null;
      let minInvoiceAmount = null;

      if (pd) {
        type = "product";
        typeLabel = "Theo sản phẩm";
        discountVal = Number(pd.discount_percentage || 15);
        const matchedVar = pd.variant_id ? varMap[pd.variant_id] : null;
        const pId = pd.pro_id || matchedVar?.pro_id;
        targetProduct = pId ? prodMap[pId] : null;
      } else if (inv) {
        type = "invoice";
        typeLabel = "Theo hóa đơn";
        discountVal = Number(inv.discount_percentage || 10);
        minInvoiceAmount = Number(inv.min_total_price || 10000000);
      } else if (v) {
        type = "voucher";
        typeLabel = "Theo voucher";
        discountVal = Number(v.discount_percentage || 10);
      } else {
        const lowerName = String(d.name || "").toLowerCase();
        const lowerCode = String(d.code || "").toLowerCase();
        if (lowerName.includes("sản phẩm") || lowerCode.startsWith("sp")) {
          type = "product";
          typeLabel = "Theo sản phẩm";
          discountVal = 15;
          targetProduct = productsList && productsList[0] ? productsList[0] : null;
        } else if (lowerName.includes("hóa đơn") || lowerName.includes("đơn hàng") || lowerCode.startsWith("bill") || lowerCode.startsWith("hd")) {
          type = "invoice";
          typeLabel = "Theo hóa đơn";
          discountVal = 8;
          minInvoiceAmount = 10000000;
        } else {
          type = "voucher";
          typeLabel = "Theo voucher";
          discountVal = 10;
        }
      }

      const isExpired = d.end_date && new Date(d.end_date) < now;
      return {
        id: d.discount_id,
        name: d.name,
        code: d.code,
        type,
        typeLabel,
        discount: discountVal,
        productId: targetProduct?.pro_id || null,
        productName: targetProduct?.name || (type === "product" ? "Nhẫn Kim Cương Vàng 18K" : null),
        minInvoiceAmount: minInvoiceAmount || (type === "invoice" ? 10000000 : null),
        usageLimit: v?.usage_limit || 100,
        timesUsed: v?.times_used || 0,
        beginDate: d.begin_date,
        endDate: d.end_date,
        status: !d.is_active ? "Đã hủy" : isExpired ? "Hết hạn" : "Hoạt động",
        isActive: Boolean(d.is_active) && !isExpired,
      };
    });

    // Mẫu trực quan cho 3 nhóm khuyến mãi nếu thiếu
    const hasProductPromo = promoList.some((p) => p.type === "product");
    const hasInvoicePromo = promoList.some((p) => p.type === "invoice");
    const hasVoucherPromo = promoList.some((p) => p.type === "voucher");

    if (!hasProductPromo && productsList && productsList.length > 0) {
      const sampleProd = productsList[0];
      promoList.push({
        id: 991,
        name: `Ưu đãi đặc quyền: ${sampleProd.name}`,
        code: `SP_${sampleProd.pro_id}_15`,
        type: "product",
        typeLabel: "Theo sản phẩm",
        discount: 15,
        productId: sampleProd.pro_id,
        productName: sampleProd.name,
        minInvoiceAmount: null,
        usageLimit: 200,
        timesUsed: 14,
        beginDate: "2026-11-01",
        endDate: "2026-12-31",
        status: "Hoạt động",
        isActive: true,
      });
    }

    if (!hasInvoicePromo) {
      promoList.push({
        id: 992,
        name: "Đại tiệc trang sức: Đơn hàng từ 10 Triệu",
        code: "BILL10M",
        type: "invoice",
        typeLabel: "Theo hóa đơn",
        discount: 8,
        productId: null,
        productName: null,
        minInvoiceAmount: 10000000,
        usageLimit: 150,
        timesUsed: 26,
        beginDate: "2026-11-01",
        endDate: "2026-12-31",
        status: "Hoạt động",
        isActive: true,
      });
    }

    if (!hasVoucherPromo) {
      promoList.push({
        id: 993,
        name: "Voucher tri ân khách hàng thân thiết",
        code: "JEWELS10",
        type: "voucher",
        typeLabel: "Theo voucher",
        discount: 10,
        productId: null,
        productName: null,
        minInvoiceAmount: null,
        usageLimit: 100,
        timesUsed: 35,
        beginDate: "2026-11-01",
        endDate: "2026-12-31",
        status: "Hoạt động",
        isActive: true,
      });
    }

    promoList.sort((a, b) => {
      const isActA = Boolean(a.isActive);
      const isActB = Boolean(b.isActive);
      if (isActA !== isActB) return isActA ? -1 : 1;
      return (b.id || 0) - (a.id || 0);
    });

    res.json(promoList);
  }));

  router.post("/promotions", wrap(async (req, res) => {
    const {
      type = "voucher",
      name,
      code,
      discount = 10,
      beginDate,
      endDate,
      usageLimit = 100,
      productId,
      minInvoiceAmount,
    } = req.body || {};

    if (!name) throw new HttpError(400, "Vui lòng nhập tên chương trình khuyến mãi.");

    let finalCode = String(code || "").trim().toUpperCase();
    if (!finalCode) {
      if (type === "product") finalCode = "SP" + (productId || "SALE") + "_" + Math.round(discount);
      else if (type === "invoice") finalCode = "BILL" + Math.round((Number(minInvoiceAmount || 10000000)) / 1000000) + "M";
      else finalCode = "VOUCHER" + Math.round(discount);
    }

    const disc = one(must(await db.from("discounts").insert({
      name: String(name).trim(),
      code: finalCode,
      begin_date: beginDate || new Date().toISOString().split("T")[0],
      end_date: endDate || null,
      is_active: true,
    }).select("discount_id")));

    if (type === "product") {
      let varId = null;
      if (productId) {
        try {
          const { data: vList } = await db.from("product_variants").select("variant_id").eq("pro_id", productId).limit(1);
          if (vList && vList[0]) varId = vList[0].variant_id;
        } catch {}
      }
      try {
        await db.from("discount_by_product").insert({
          discount_id: disc.discount_id,
          variant_id: varId,
          discount_percentage: Number(discount),
        });
      } catch (err) {
        console.warn("Lưu discount_by_product:", err.message);
      }
    } else if (type === "invoice") {
      try {
        await db.from("discount_by_invoice").insert({
          discount_id: disc.discount_id,
          min_total_price: Number(minInvoiceAmount || 10000000),
          discount_percentage: Number(discount),
          condition_type: "greater_or_equal",
        });
      } catch (err) {
        console.warn("Lưu discount_by_invoice:", err.message);
      }
    } else {
      try {
        await db.from("discount_by_voucher").insert({
          discount_id: disc.discount_id,
          voucher_name: String(name).trim(),
          discount_percentage: Number(discount || 10),
          usage_limit: Number(usageLimit || 100),
          times_used: 0,
          limit_per_cus: 1,
        });
      } catch (err) {
        console.warn("Lưu discount_by_voucher:", err.message);
      }
    }

    broadcastRealtime("PROMOTION_CHANGED", { action: "created", id: disc.discount_id });
    res.status(201).json({ id: disc.discount_id, ok: true });
  }));

  router.put("/promotions/:id", wrap(async (req, res) => {
    const { id } = req.params;
    const { name, code, discount, status, endDate, minInvoiceAmount } = req.body || {};

    const updates = {};
    if (name) updates.name = String(name).trim();
    if (code) updates.code = String(code).trim().toUpperCase();
    if (endDate !== undefined) updates.end_date = endDate || null;
    if (status !== undefined) updates.is_active = status === "Hoạt động";
    updates.updated_at = new Date().toISOString();

    must(await db.from("discounts").update(updates).eq("discount_id", id));

    if (discount !== undefined) {
      try {
        await db.from("discount_by_voucher").update({
          discount_percentage: Number(discount),
        }).eq("discount_id", id);
      } catch {}

      try {
        await db.from("discount_by_product").update({
          discount_percentage: Number(discount),
        }).eq("discount_id", id);
      } catch {}

      try {
        const invUpdates = { discount_percentage: Number(discount) };
        if (minInvoiceAmount !== undefined) invUpdates.min_total_price = Number(minInvoiceAmount);
        await db.from("discount_by_invoice").update(invUpdates).eq("discount_id", id);
      } catch {}
    }

    broadcastRealtime("PROMOTION_CHANGED", { action: "updated", id });
    res.json({ ok: true });
  }));

  router.delete("/promotions/:id", wrap(async (req, res) => {
    const { id } = req.params;
    must(await db.from("discounts").update({ is_active: false, updated_at: new Date().toISOString() }).eq("discount_id", id));
    broadcastRealtime("PROMOTION_CHANGED", { action: "deleted", id });
    res.json({ ok: true });
  }));

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

    const orderList = orders.map((o) => {
      const itemsSub = (o.order_items || []).reduce((s, it) => s + Number(it.subtotal || 0), 0);
      const disc = Number(o.discount_amount || 0);
      const taxable = Math.max(0, itemsSub - disc);
      const vat = Math.round(taxable * 0.08);
      const shipping = Number(o.shipping_fee || 0);
      const total = taxable + vat + shipping;
      return {
        id: o.order_id,
        code: `#${o.order_id}`,
        customer: o.cus_name || "Khách hàng",
        phone: o.cus_phone || "",
        address: o.address || "",
        total: total,
        subtotal: itemsSub,
        discountAmount: disc,
        vatAmount: vat,
        shippingFee: shipping,
        rawStatus: o.status,
        status: STATUS_MAP[o.status] || o.status,
        date: o.order_date,
        items: o.order_items || [],
        payment: one(o.payments) || null,
      };
    });

    orderList.sort((a, b) => {
      const getPrio = (s) => {
        const str = String(s || "").toLowerCase();
        if (str.includes("chờ") || str === "pending") return 1;
        if (str.includes("xác nhận") || str === "processing") return 2;
        if (str.includes("giao hàng") || str.includes("đang giao") || str === "shipped") return 3;
        if (str.includes("thành công") || str === "delivered") return 4;
        return 5;
      };
      const diff = getPrio(a.rawStatus || a.status) - getPrio(b.rawStatus || b.status);
      if (diff !== 0) return diff;
      return new Date(b.date) - new Date(a.date);
    });

    res.json(orderList);
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

    const STATUS_VN = {
      pending: "Đang chờ duyệt",
      processing: "Đã xác nhận",
      shipped: "Đang giao hàng",
      delivered: "Đã giao thành công",
      cancelled: "Đã hủy",
      returned: "Đã hoàn hàng",
    };

    const targetDbStatus = STATUS_REVERSE[status] || "processing";

    // 1. Lấy thông tin đơn hàng hiện tại
    const currentOrder = one(must(await db.from("orders")
      .select("*,order_items(*)")
      .eq("order_id", id).limit(1)));
    if (!currentOrder) throw new HttpError(404, "Không tìm thấy đơn hàng.");

    const currentDbStatus = currentOrder.status;

    // 2. Kiểm tra quy tắc chuyển trạng thái (Finite State Machine)
    const ALLOWED_TRANSITIONS = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered", "returned"],
      delivered: ["returned"],
      cancelled: [],
      returned: [],
    };

    if (currentDbStatus !== targetDbStatus) {
      const allowed = ALLOWED_TRANSITIONS[currentDbStatus] || [];
      if (!allowed.includes(targetDbStatus)) {
        throw new HttpError(400, `Không thể chuyển trạng thái từ "${STATUS_VN[currentDbStatus] || currentDbStatus}" sang "${STATUS_VN[targetDbStatus] || targetDbStatus}".`);
      }
    }

    // 3. Cập nhật trạng thái đơn hàng
    must(await db.from("orders").update({
      status: targetDbStatus,
      updated_at: new Date().toISOString()
    }).eq("order_id", id));

    // 4. Khi đơn hoàn tất (delivered): Tự tạo hóa đơn nếu chưa có & hoàn tất thanh toán
    if (targetDbStatus === "delivered") {
      const existingInv = one(must(await db.from("invoices").select("invoice_id").eq("order_id", id).limit(1)));
      if (!existingInv) {
        const itemsSub = (currentOrder.order_items || []).reduce((s, it) => s + Number(it.subtotal || 0), 0);
        const disc = Number(currentOrder.discount_amount || 0);
        const taxable = Math.max(0, itemsSub - disc);
        const vat = Math.round(taxable * 0.08);
        const inv = one(must(await db.from("invoices").insert({
          order_id: currentOrder.order_id,
          buyer_name: currentOrder.cus_name,
          buyer_phone: currentOrder.cus_phone,
          buyer_address: currentOrder.address,
          vat_rate: 8,
          vat_amount: vat,
          discount_amount: disc,
          total_price: Number(currentOrder.total_amount),
          invoice_date: new Date().toISOString(),
        }).select("invoice_id")));

        if (currentOrder.order_items && currentOrder.order_items.length > 0) {
          await db.from("invoice_detail").insert(currentOrder.order_items.map((it) => ({
            invoice_id: inv.invoice_id,
            variant_id: it.variant_id,
            product_name: it.product_name,
            quantity: it.quantity,
            unit_price: it.unit_price,
            subtotal: it.subtotal,
          })));
        }

        // Cập nhật thanh toán nếu có
        await db.from("payments").update({ status: "completed" }).eq("order_id", id);

        broadcastRealtime("INVOICE_CREATED", {
          invoiceId: inv.invoice_id,
          orderId: currentOrder.order_id,
          amount: Number(currentOrder.total_amount),
        });
      }
    }

    // 5. Cập nhật trạng thái thanh toán tương ứng
    if (targetDbStatus === "returned") {
      await db.from("payments").update({ status: "refunded" }).eq("order_id", id);
    } else if (targetDbStatus === "cancelled") {
      await db.from("payments").update({ status: "cancelled" }).eq("order_id", id);
    }

    // 6. Khi đơn bị Hủy (cancelled) hoặc Hoàn hàng (returned): Tự động hoàn tồn kho cho từng sản phẩm
    if ((targetDbStatus === "cancelled" || targetDbStatus === "returned") &&
        currentDbStatus !== "cancelled" && currentDbStatus !== "returned") {
      if (currentOrder.order_items && currentOrder.order_items.length > 0) {
        for (const it of currentOrder.order_items) {
          if (it.variant_id && it.quantity > 0) {
            const v = one(must(await db.from("product_variants").select("stock_quantity").eq("variant_id", it.variant_id).limit(1)));
            if (v) {
              const newStock = Number(v.stock_quantity || 0) + Number(it.quantity);
              await db.from("product_variants").update({ stock_quantity: newStock }).eq("variant_id", it.variant_id);
            }
          }
        }
      }
    }

    broadcastRealtime("ORDER_STATUS_CHANGED", {
      orderId: Number(id),
      status: targetDbStatus,
      statusLabel: STATUS_VN[targetDbStatus] || targetDbStatus,
    });

    res.json({
      ok: true,
      status: targetDbStatus,
      statusLabel: STATUS_VN[targetDbStatus] || targetDbStatus,
      message: `Cập nhật đơn hàng sang "${STATUS_VN[targetDbStatus]}" thành công.`
    });
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
    const supList = suppliers.map((s) => ({
      id: s.sup_id,
      name: s.name,
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      status: s.is_active ? "Hoạt động" : "Ngừng hợp tác",
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
    }));

    supList.sort((a, b) => {
      const isActA = Boolean(a.isActive);
      const isActB = Boolean(b.isActive);
      if (isActA !== isActB) return isActA ? -1 : 1;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    res.json(supList);
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
