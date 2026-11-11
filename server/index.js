"use strict";
// Backend Jewels: REST API (Supabase service_role) + phục vụ file tĩnh client/shared.
require("dotenv").config();
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, PORT = 3000 } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  console.error("Thiếu cấu hình: hãy tạo server/.env (xem .env.example) với SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { handleSseConnection, broadcastRealtime } = require("./realtime");
const unlockRequests = require("./unlock-requests");
const app = express();
app.use(express.json({ limit: "100kb" }));

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_FROM = 10000000;
const PAYMENT_METHODS = ["cod", "bank_transfer", "e_wallet", "credit_card"];

// ---------- tiện ích ----------
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const must = ({ data, error }) => { if (error) throw new HttpError(500, error.message); return data; };
const one = (x) => (Array.isArray(x) ? x[0] : x) || null;

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  const first = parts.pop() || "";
  return { first_name: first, last_name: parts.join(" ") };
}
const fullName = (u) => `${u.last_name || ""} ${u.first_name || ""}`.trim();
const signToken = (id) => jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: "7d" });

const auth = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  let payload;
  try {
    payload = jwt.verify(header.replace(/^Bearer /, ""), JWT_SECRET);
    req.uid = payload.sub;
  } catch {
    throw new HttpError(401, "Vui lòng đăng nhập.");
  }
  const user = one(must(await db.from("users").select("id,is_active").eq("id", req.uid).limit(1)));
  if (!user || !user.is_active) {
    const err = new HttpError(403, "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng bấm 'Xin mở lại tài khoản' để gửi yêu cầu hỗ trợ.");
    err.isLocked = true;
    throw err;
  }
  next();
});

async function publicUser(id) {
  const user = one(must(await db.from("users").select("id,email,first_name,last_name,phone,is_active,roles").eq("id", id).limit(1)));
  if (!user || !user.is_active) throw new HttpError(401, "Tài khoản không tồn tại hoặc đã bị khóa.");
  const customer = one(must(await db.from("customers").select("dob").eq("user_id", id).limit(1)));
  return { id: user.id, email: user.email, name: fullName(user), phone: user.phone, dob: customer?.dob || null };
}

// ---------- xác thực ----------
app.post("/api/auth/register", wrap(async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  const mail = String(email || "").trim().toLowerCase();
  if (!mail || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(mail)) {
    throw new HttpError(400, "Email đăng ký phải có đầy đủ cú pháp @gmail.com sau cùng (ví dụ: example@gmail.com).");
  }
  if (String(password || "").length < 8) throw new HttpError(400, "Mật khẩu tối thiểu 8 ký tự.");
  if (String(name || "").trim().length < 2) throw new HttpError(400, "Vui lòng nhập họ tên.");
  if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) throw new HttpError(400, "Số điện thoại đăng ký phải có đúng 10 chữ số.");
  const exists = one(must(await db.from("users").select("id").eq("email", mail).limit(1)));
  if (exists) throw new HttpError(409, "Email này đã được đăng ký. Hãy đăng nhập.");

  const user = one(must(await db.from("users").insert({
    email: mail,
    password_hash: await bcrypt.hash(password, 10),
    roles: ["CUSTOMER"],
    phone: cleanPhone,
    ...splitName(name),
  }).select("id")));
  must(await db.from("customers").insert({ user_id: user.id }));
  res.status(201).json({ token: signToken(user.id), user: await publicUser(user.id) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const mail = String(req.body?.email || "").trim().toLowerCase();
  const user = one(must(await db.from("users").select("id,password_hash,is_active,roles").eq("email", mail).limit(1)));
  if (!user) throw new HttpError(401, "Email hoặc mật khẩu chưa chính xác.");

  // Nếu tài khoản đã bị khóa, báo lỗi ngay lập tức kèm trạng thái yêu cầu mở khóa
  if (!user.is_active) {
    const pendingReq = unlockRequests ? unlockRequests.getLatestStatusByEmail(mail) : null;
    const err = new HttpError(403, "Tài khoản của bạn đã bị khóa bởi quản trị viên. Vui lòng bấm 'Xin mở lại tài khoản' để gửi yêu cầu hỗ trợ.");
    err.isLocked = true;
    err.unlockStatus = pendingReq ? pendingReq.status : null;
    err.unlockReason = pendingReq ? pendingReq.reason : "";
    throw err;
  }

  const ok = user.password_hash && (await bcrypt.compare(String(req.body?.password || ""), user.password_hash));
  if (!ok) throw new HttpError(401, "Email hoặc mật khẩu chưa chính xác.");

  if (!user.roles.includes("CUSTOMER")) throw new HttpError(403, "Tài khoản này không phải khách hàng.");
  // đảm bảo có hồ sơ customers (phòng khi user tạo từ nơi khác)
  must(await db.from("customers").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true }));
  res.json({ token: signToken(user.id), user: await publicUser(user.id) });
}));

app.post("/api/auth/request-unlock", wrap(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const reason = String(req.body?.reason || "").trim();
  if (!email) throw new HttpError(400, "Vui lòng nhập email tài khoản cần mở khóa.");
  const user = one(must(await db.from("users").select("id,email,first_name,last_name,phone,is_active").eq("email", email).limit(1)));
  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản với email này trong hệ thống.");
  if (user.is_active) {
    return res.json({ ok: true, isAlreadyActive: true, message: "Tài khoản của bạn hiện đang ở trạng thái hoạt động bình thường, bạn có thể đăng nhập ngay." });
  }

  const reqItem = unlockRequests.addOrUpdateUnlockRequest({
    userId: user.id,
    email: user.email,
    name: fullName(user) || user.email,
    phone: user.phone || "",
    reason,
  });

  console.log(`[YÊU CẦU MỞ KHÓA] Khách hàng yêu cầu mở lại tài khoản: ${email} (${user.id})`);
  broadcastRealtime("UNLOCK_REQUEST", {
    requestId: reqItem.id,
    email: user.email,
    name: fullName(user) || user.email,
    userId: user.id,
    reason: reqItem.reason,
    time: reqItem.createdAt,
  });

  res.json({
    ok: true,
    requestId: reqItem.id,
    message: "Yêu cầu xin mở lại tài khoản đã được gửi thành công đến Ban Quản Trị Jewels. Quản trị viên sẽ sớm kiểm tra và mở khóa tài khoản cho bạn."
  });
}));

app.get("/api/auth/unlock-status", wrap(async (req, res) => {
  const email = String(req.query?.email || "").trim().toLowerCase();
  if (!email) throw new HttpError(400, "Vui lòng cung cấp email.");
  const user = one(must(await db.from("users").select("id,is_active").eq("email", email).limit(1)));
  if (!user) throw new HttpError(404, "Không tìm thấy tài khoản.");
  const reqItem = unlockRequests.getLatestStatusByEmail(email);
  res.json({
    isActive: Boolean(user.is_active),
    requestStatus: reqItem ? reqItem.status : null,
    resolvedAt: reqItem ? reqItem.resolvedAt : null,
  });
}));

app.get("/api/me", auth, wrap(async (req, res) => res.json(await publicUser(req.uid))));

app.put("/api/me", auth, wrap(async (req, res) => {
  const { name, phone, dob } = req.body || {};
  if (String(name || "").trim().length < 2) throw new HttpError(400, "Vui lòng nhập họ tên.");
  const cleanPhone = String(phone || "").trim().replace(/\D/g, "");
  if (phone && !/^\d{10}$/.test(cleanPhone)) {
    throw new HttpError(400, "Số điện thoại phải bao gồm đúng 10 chữ số.");
  }
  must(await db.from("users").update({ ...splitName(name), phone: cleanPhone || null }).eq("id", req.uid));
  const cust = one(must(await db.from("customers").select("user_id").eq("user_id", req.uid).limit(1)));
  if (cust) {
    must(await db.from("customers").update({ dob: dob || null }).eq("user_id", req.uid));
  } else {
    must(await db.from("customers").insert({ user_id: req.uid, dob: dob || null }));
  }
  res.json(await publicUser(req.uid));
}));

app.put("/api/me/password", auth, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (String(newPassword || "").length < 8) throw new HttpError(400, "Mật khẩu mới tối thiểu 8 ký tự.");
  const user = one(must(await db.from("users").select("password_hash").eq("id", req.uid).limit(1)));
  if (!(await bcrypt.compare(String(currentPassword || ""), user.password_hash || ""))) throw new HttpError(400, "Mật khẩu hiện tại chưa đúng.");
  const hashed = await bcrypt.hash(newPassword, 10);
  must(await db.rpc("app_set_password_hash", { p_user_id: req.uid, p_hash: hashed }));
  res.json({ ok: true });
}));

// ---------- sổ địa chỉ ----------
const addressBody = (b) => {
  const recipient_name = String(b?.recipient_name || "").trim();
  const phone = String(b?.phone || "").trim();
  const address_line = String(b?.address_line || "").trim();
  if (!recipient_name) throw new HttpError(400, "Vui lòng nhập họ và tên người nhận.");
  if (!phone) throw new HttpError(400, "Vui lòng nhập số điện thoại nhận hàng.");
  if (!/^[0-9+\s.-]{3,20}$/.test(phone)) throw new HttpError(400, "Số điện thoại không hợp lệ (ví dụ: 090 123 4567).");
  if (!address_line) throw new HttpError(400, "Vui lòng nhập địa chỉ nhận hàng (số nhà, đường, phường/xã...).");
  return { recipient_name, phone, address_line, is_default: !!b?.is_default };
};
async function clearDefault(uid, exceptId) {
  let q = db.from("customer_addresses").update({ is_default: false }).eq("customer_id", uid);
  if (exceptId) q = q.neq("address_id", exceptId);
  must(await q);
}

app.get("/api/addresses", auth, wrap(async (req, res) => {
  res.json(must(await db.from("customer_addresses").select("*").eq("customer_id", req.uid).order("is_default", { ascending: false }).order("address_id")));
}));

app.post("/api/addresses", auth, wrap(async (req, res) => {
  const body = addressBody(req.body);
  // Đảm bảo tồn tại bản ghi trong customers để tránh lỗi khóa ngoại
  must(await db.from("customers").upsert({ user_id: req.uid }, { onConflict: "user_id", ignoreDuplicates: true }));
  const count = must(await db.from("customer_addresses").select("address_id").eq("customer_id", req.uid)).length;
  if (count === 0) body.is_default = true;
  const row = one(must(await db.from("customer_addresses").insert({ ...body, customer_id: req.uid }).select()));
  if (body.is_default) await clearDefault(req.uid, row.address_id);
  res.status(201).json(row);
}));

app.put("/api/addresses/:id", auth, wrap(async (req, res) => {
  const body = addressBody(req.body);
  const row = one(must(await db.from("customer_addresses").update(body).eq("address_id", req.params.id).eq("customer_id", req.uid).select()));
  if (!row) throw new HttpError(404, "Không tìm thấy địa chỉ.");
  if (body.is_default) await clearDefault(req.uid, row.address_id);
  res.json(row);
}));

app.delete("/api/addresses/:id", auth, wrap(async (req, res) => {
  must(await db.from("customer_addresses").delete().eq("address_id", req.params.id).eq("customer_id", req.uid));
  res.json({ ok: true });
}));

// ---------- danh mục & sản phẩm ----------
let cachedCategories = null;
let cachedCategoriesTime = 0;
const CATEGORIES_CACHE_TTL = 60000; // 60s cache in-memory

app.get("/api/categories", wrap(async (_req, res) => {
  if (cachedCategories && Date.now() - cachedCategoriesTime < CATEGORIES_CACHE_TTL) {
    return res.json(cachedCategories);
  }
  const data = must(await db.from("categories").select("cat_id,name,parent_cat_id").eq("is_active", true).order("cat_id"));
  cachedCategories = data;
  cachedCategoriesTime = Date.now();
  res.json(data);
}));

async function imagesFor(proIds) {
  if (!proIds.length) return {};
  const rows = must(await db.from("product_images").select("pro_id,variant_id,image_url,is_primary").in("pro_id", proIds).order("img_id"));
  const map = {};
  rows.forEach((r) => { (map[r.pro_id] ||= []).push(r); });
  return map;
}
const placeholder = "https://placehold.co/600x600/png?text=Jewels";
const mainImage = (imgs = [], variantId) =>
  (imgs.find((i) => variantId && i.variant_id === variantId) || imgs.find((i) => i.is_primary) || imgs[0])?.image_url || placeholder;

app.get("/api/products", wrap(async (req, res) => {
  const { cat, cats: multiCats, q, sort = "new", min, max, prices } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const size = Math.min(48, parseInt(req.query.size) || 12);

  let catIds = null;
  const rawCat = multiCats || cat;
  if (rawCat) {
    const rawList = (Array.isArray(rawCat) ? rawCat : String(rawCat).split(",")).map((s) => String(s).trim()).filter(Boolean);
    if (rawList.length) {
      const allCats = must(await db.from("categories").select("cat_id,parent_cat_id").eq("is_active", true));
      const set = new Set();
      rawList.forEach((rc) => {
        allCats.forEach((c) => {
          if (String(c.cat_id) === rc || String(c.parent_cat_id) === rc) {
            set.add(c.cat_id);
          }
        });
      });
      catIds = Array.from(set);
    }
  }
  let query = db.from("products")
    .select("pro_id,cat_id,name,description,base_price,created_at,categories(name),product_variants(variant_id,price,stock_quantity,is_active)", { count: "exact" })
    .eq("is_active", true);
  if (catIds) {
    query = catIds.length ? query.in("cat_id", catIds) : query.in("cat_id", [-1]);
  }
  if (q) query = query.ilike("name", `%${String(q).replace(/[%,]/g, " ")}%`);

  // Hỗ trợ lọc nhiều khoảng giá cùng lúc (prices=0-2000000,10000000-) hoặc đơn lẻ (min/max)
  if (prices) {
    const rangeList = String(prices).split(",").map((s) => s.trim()).filter(Boolean);
    const orConds = [];
    rangeList.forEach((r) => {
      const parts = r.split("-");
      const rMin = parts[0]?.trim();
      const rMax = parts[1]?.trim();
      if (rMin && rMax) {
        orConds.push(`and(base_price.gte.${Number(rMin)},base_price.lte.${Number(rMax)})`);
      } else if (rMin) {
        orConds.push(`base_price.gte.${Number(rMin)}`);
      } else if (rMax) {
        orConds.push(`base_price.lte.${Number(rMax)}`);
      }
    });
    if (orConds.length) {
      query = query.or(orConds.join(","));
    }
  } else {
    if (min) query = query.gte("base_price", Number(min));
    if (max) query = query.lte("base_price", Number(max));
  }
  const order = { new: ["created_at", false], "price-asc": ["base_price", true], "price-desc": ["base_price", false], name: ["name", true] }[sort] || ["created_at", false];
  query = query.order(order[0], { ascending: order[1] }).range((page - 1) * size, page * size - 1);

  const { data, error, count } = await query;
  if (error) throw new HttpError(500, error.message);
  const images = await imagesFor(data.map((p) => p.pro_id));
  const items = data.map((p) => {
    const variants = (p.product_variants || []).filter((v) => v.is_active);
    const prices = variants.map((v) => Number(v.price ?? p.base_price));
    return {
      id: p.pro_id, name: p.name, category: p.categories?.name || "", image: mainImage(images[p.pro_id]),
      price: prices.length ? Math.min(...prices) : Number(p.base_price),
      maxPrice: prices.length ? Math.max(...prices) : Number(p.base_price),
      inStock: variants.some((v) => v.stock_quantity > 0),
    };
  });
  res.json({ items, total: count || 0, page, pages: Math.max(1, Math.ceil((count || 0) / size)) });
}));

app.get("/api/products/:id", wrap(async (req, res) => {
  const p = one(must(await db.from("products")
    .select("pro_id,cat_id,name,description,base_price,categories(name),product_variants(variant_id,material,gemstone,certificate_code,size,price,stock_quantity,is_active)")
    .eq("pro_id", req.params.id).eq("is_active", true).limit(1)));
  if (!p) throw new HttpError(404, "Không tìm thấy sản phẩm.");
  const [imagesMap, related] = await Promise.all([
    imagesFor([p.pro_id]),
    db.from("products").select("pro_id,name,base_price").eq("is_active", true).eq("cat_id", p.cat_id).neq("pro_id", p.pro_id).limit(4).then(must),
  ]);
  const images = imagesMap[p.pro_id] || [];
  const relImgs = await imagesFor(related.map((r) => r.pro_id));
  res.json({
    id: p.pro_id, name: p.name, description: p.description, category: p.categories?.name || "", catId: p.cat_id,
    basePrice: Number(p.base_price),
    images: images.length ? images.map((i) => ({ url: i.image_url, variantId: i.variant_id })) : [{ url: placeholder, variantId: null }],
    variants: (p.product_variants || []).filter((v) => v.is_active).map((v) => ({
      id: v.variant_id, material: v.material, gemstone: v.gemstone, certificate: v.certificate_code,
      size: v.size === null ? null : Number(v.size), price: Number(v.price ?? p.base_price), stock: v.stock_quantity || 0,
    })),
    related: related.map((r) => ({ id: r.pro_id, name: r.name, price: Number(r.base_price), image: mainImage(relImgs[r.pro_id]) })),
  });
}));

// ---------- giỏ hàng ----------
async function getCartId(uid) {
  let cart = one(must(await db.from("carts").select("cart_id").eq("customer_id", uid).limit(1)));
  if (!cart) cart = one(must(await db.from("carts").insert({ customer_id: uid, status: "empty" }).select("cart_id")));
  return cart.cart_id;
}

async function loadCart(uid) {
  const cartId = await getCartId(uid);
  const rows = must(await db.from("cart_items")
    .select("cart_item_id,quantity,variant_id,product_variants(variant_id,pro_id,material,gemstone,size,price,stock_quantity,is_active,products(name,is_active))")
    .eq("cart_id", cartId).order("cart_item_id"));
  const images = await imagesFor([...new Set(rows.map((r) => r.product_variants?.pro_id).filter(Boolean))]);
  const lines = rows.filter((r) => r.product_variants).map((r) => {
    const v = r.product_variants;
    const available = v.is_active && v.products?.is_active && v.stock_quantity > 0;
    return {
      id: r.cart_item_id, variantId: v.variant_id, productId: v.pro_id, name: v.products?.name || "", material: v.material,
      gemstone: v.gemstone, size: v.size === null ? null : Number(v.size), price: Number(v.price), quantity: r.quantity,
      stock: v.stock_quantity || 0, available, image: mainImage(images[v.pro_id], v.variant_id),
      subtotal: Number(v.price) * r.quantity,
    };
  });
  return { cartId, lines, subtotal: lines.reduce((s, l) => s + l.subtotal, 0) };
}

const shippingFor = (subtotal) => (subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);

async function syncCartStatus(cartId) {
  const n = must(await db.from("cart_items").select("cart_item_id").eq("cart_id", cartId)).length;
  must(await db.from("carts").update({ status: n ? "active" : "empty", updated_at: new Date().toISOString() }).eq("cart_id", cartId));
}

app.get("/api/cart", auth, wrap(async (req, res) => {
  const cart = await loadCart(req.uid);
  res.json({ items: cart.lines, subtotal: cart.subtotal, shipping: shippingFor(cart.subtotal), count: cart.lines.reduce((s, l) => s + l.quantity, 0), freeShippingFrom: FREE_SHIPPING_FROM });
}));

async function checkVariant(variantId, quantity) {
  const v = one(must(await db.from("product_variants").select("variant_id,stock_quantity,is_active,products(is_active)").eq("variant_id", variantId).limit(1)));
  if (!v || !v.is_active || !v.products?.is_active) throw new HttpError(404, "Sản phẩm không còn kinh doanh.");
  if (v.stock_quantity < quantity) throw new HttpError(400, `Chỉ còn ${v.stock_quantity} sản phẩm trong kho.`);
}

app.post("/api/cart/items", auth, wrap(async (req, res) => {
  const variantId = Number(req.body?.variantId);
  const add = Math.max(1, parseInt(req.body?.quantity) || 1);
  if (!variantId) throw new HttpError(400, "Thiếu biến thể sản phẩm.");
  const cartId = await getCartId(req.uid);
  const existing = one(must(await db.from("cart_items").select("cart_item_id,quantity").eq("cart_id", cartId).eq("variant_id", variantId).limit(1)));
  const total = (existing?.quantity || 0) + add;
  await checkVariant(variantId, total);
  if (existing) must(await db.from("cart_items").update({ quantity: total }).eq("cart_item_id", existing.cart_item_id));
  else must(await db.from("cart_items").insert({ cart_id: cartId, variant_id: variantId, quantity: add }));
  await syncCartStatus(cartId);
  res.status(201).json({ ok: true });
}));

app.put("/api/cart/items/:id", auth, wrap(async (req, res) => {
  const quantity = parseInt(req.body?.quantity);
  if (!(quantity > 0)) throw new HttpError(400, "Số lượng không hợp lệ.");
  const cartId = await getCartId(req.uid);
  const item = one(must(await db.from("cart_items").select("cart_item_id,variant_id").eq("cart_item_id", req.params.id).eq("cart_id", cartId).limit(1)));
  if (!item) throw new HttpError(404, "Không tìm thấy sản phẩm trong giỏ.");
  await checkVariant(item.variant_id, quantity);
  must(await db.from("cart_items").update({ quantity }).eq("cart_item_id", item.cart_item_id));
  res.json({ ok: true });
}));

app.delete("/api/cart/items/:id", auth, wrap(async (req, res) => {
  const cartId = await getCartId(req.uid);
  must(await db.from("cart_items").delete().eq("cart_item_id", req.params.id).eq("cart_id", cartId));
  await syncCartStatus(cartId);
  res.json({ ok: true });
}));

// ---------- mã giảm giá ----------
// Trả về { discount_id, label, amount } hoặc ném HttpError nếu mã không hợp lệ.
async function evaluateCode(code, lines, subtotal, uid) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) throw new HttpError(400, "Vui lòng nhập mã giảm giá.");
  const d = one(must(await db.from("discounts")
    .select("discount_id,name,code,begin_date,end_date,is_active,discount_by_voucher(*),discount_by_invoice(*),discount_by_product(*)")
    .ilike("code", clean).limit(1)));
  const today = new Date().toISOString().slice(0, 10);
  if (!d || !d.is_active || (d.begin_date && d.begin_date > today) || (d.end_date && d.end_date < today)) {
    throw new HttpError(400, "Mã giảm giá không hợp lệ hoặc đã hết hạn.");
  }
  const list = (x) => [].concat(x || []).filter(Boolean);
  const voucher = list(d.discount_by_voucher)[0];
  const invoice = list(d.discount_by_invoice)[0];
  const products = list(d.discount_by_product);
  let amount = 0;

  if (voucher) {
    if (voucher.usage_limit != null && voucher.times_used >= voucher.usage_limit) throw new HttpError(400, "Mã giảm giá đã hết lượt sử dụng.");
    if (voucher.limit_per_cus != null) {
      const used = must(await db.from("orders").select("order_id").eq("customer_id", uid).eq("discount_id", d.discount_id).neq("status", "cancelled")).length;
      if (used >= voucher.limit_per_cus) throw new HttpError(400, "Bạn đã dùng hết lượt cho mã này.");
    }
    amount = Math.round((subtotal * Number(voucher.discount_percentage)) / 100);
  } else if (invoice) {
    const min = Number(invoice.min_total_price);
    const okCond = invoice.condition_type === "exact" ? subtotal === min : subtotal >= min;
    if (!okCond) throw new HttpError(400, `Mã áp dụng cho đơn từ ${min.toLocaleString("vi-VN")}đ.`);
    amount = Math.round((subtotal * Number(invoice.discount_percentage)) / 100);
  } else if (products.length) {
    products.forEach((rule) => {
      const line = lines.find((l) => l.variantId === rule.variant_id);
      if (line) amount += Math.round((line.subtotal * Number(rule.discount_percentage)) / 100);
    });
    if (!amount) throw new HttpError(400, "Mã chỉ áp dụng cho sản phẩm cụ thể, giỏ hàng chưa có sản phẩm phù hợp.");
  } else {
    throw new HttpError(400, "Mã giảm giá chưa được cấu hình.");
  }
  return { discount_id: d.discount_id, code: d.code, label: d.name, amount: Math.min(amount, subtotal), voucher: !!voucher };
}

app.post("/api/vouchers/validate", auth, wrap(async (req, res) => {
  const cart = await loadCart(req.uid);
  const r = await evaluateCode(req.body?.code, cart.lines, cart.subtotal, req.uid);
  res.json({ code: r.code, label: r.label, amount: r.amount });
}));

// ---------- đơn hàng ----------
app.post("/api/orders", auth, wrap(async (req, res) => {
  const { recipientName, phone, address, addressId, method, code } = req.body || {};
  if (!PAYMENT_METHODS.includes(method)) throw new HttpError(400, "Phương thức thanh toán không hợp lệ.");

  let cus_name = String(recipientName || "").trim();
  let cus_phone = String(phone || "").trim();
  let cus_address = String(address || "").trim();

  // Tương thích ngược nếu có addressId
  if ((!cus_name || !cus_address) && addressId) {
    const a = one(must(await db.from("customer_addresses").select("*").eq("address_id", addressId).eq("customer_id", req.uid).limit(1)));
    if (a) {
      cus_name = cus_name || a.recipient_name;
      cus_phone = cus_phone || a.phone;
      cus_address = cus_address || a.address_line;
    }
  }

  if (!cus_name) throw new HttpError(400, "Vui lòng nhập họ và tên người nhận hàng.");
  if (!cus_phone) throw new HttpError(400, "Vui lòng nhập số điện thoại người nhận.");
  if (!cus_address) throw new HttpError(400, "Vui lòng nhập địa chỉ nhận hàng.");

  // Đảm bảo tồn tại bản ghi trong bảng customers
  must(await db.from("customers").upsert({ user_id: req.uid }, { onConflict: "user_id", ignoreDuplicates: true }));

  const cart = await loadCart(req.uid);
  if (!cart.lines.length) throw new HttpError(400, "Giỏ hàng đang trống.");
  for (const l of cart.lines) {
    if (!l.available || l.quantity > l.stock) throw new HttpError(400, `"${l.name}" không đủ hàng (còn ${l.stock}). Vui lòng cập nhật giỏ hàng.`);
  }

  let discount = null;
  if (code) discount = await evaluateCode(code, cart.lines, cart.subtotal, req.uid);
  const shipping = shippingFor(cart.subtotal);
  const discountAmount = discount?.amount || 0;
  const total = cart.subtotal - discountAmount + shipping;

  const order = one(must(await db.from("orders").insert({
    customer_id: req.uid,
    discount_id: discount?.discount_id || null,
    cus_name,
    cus_phone,
    address: cus_address,
    status: "pending",
    shipping_fee: shipping,
    discount_amount: discountAmount,
    total_amount: total,
  }).select("order_id")));

  try {
    must(await db.from("order_items").insert(cart.lines.map((l) => ({
      order_id: order.order_id, variant_id: l.variantId, quantity: l.quantity, unit_price: l.price, subtotal: l.subtotal,
      product_name: l.name, material: l.material, gemstone: l.gemstone, size: l.size, image_url: l.image,
    }))));
    must(await db.from("payments").insert({ order_id: order.order_id, method, amount: total, status: "pending" }));
  } catch (e) {
    await db.from("orders").delete().eq("order_id", order.order_id);
    throw e;
  }

  // trừ kho, tăng lượt dùng voucher, dọn giỏ
  for (const l of cart.lines) {
    await db.from("product_variants").update({ stock_quantity: l.stock - l.quantity }).eq("variant_id", l.variantId);
  }
  if (discount?.voucher) {
    const v = one(must(await db.from("discount_by_voucher").select("times_used").eq("discount_id", discount.discount_id).limit(1)));
    await db.from("discount_by_voucher").update({ times_used: (v?.times_used || 0) + 1 }).eq("discount_id", discount.discount_id);
  }
  must(await db.from("cart_items").delete().eq("cart_id", cart.cartId));
  await syncCartStatus(cart.cartId);
  broadcastRealtime("ORDER_CREATED", {
    orderId: order.order_id,
    total,
    customer: cus_name || "Khách hàng",
    phone: cus_phone,
    linesCount: cart.lines.length,
  });
  res.status(201).json({ orderId: order.order_id, total });
}));

app.get("/api/orders", auth, wrap(async (req, res) => {
  const rows = must(await db.from("orders")
    .select("order_id,order_date,status,total_amount,order_items(product_name,quantity,image_url),payments(method,status)")
    .eq("customer_id", req.uid).order("order_date", { ascending: false }));
  res.json(rows.map((o) => ({
    id: o.order_id, date: o.order_date, status: o.status, total: Number(o.total_amount),
    items: o.order_items || [], payment: one(o.payments) || null,
  })));
}));

app.get("/api/orders/:id", auth, wrap(async (req, res) => {
  const o = one(must(await db.from("orders").select("*,order_items(*),payments(*),discounts(name,code)").eq("order_id", req.params.id).eq("customer_id", req.uid).limit(1)));
  if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng.");
  res.json({ ...o, payment: one(o.payments) || null, discount: o.discounts || null });
}));

app.post("/api/orders/:id/cancel", auth, wrap(async (req, res) => {
  const o = one(must(await db.from("orders").select("order_id,status,discount_id,order_items(variant_id,quantity)").eq("order_id", req.params.id).eq("customer_id", req.uid).limit(1)));
  if (!o) throw new HttpError(404, "Không tìm thấy đơn hàng.");
  if (o.status !== "pending") throw new HttpError(400, "Chỉ có thể hủy đơn đang chờ xác nhận.");
  // payments chỉ cho phép đổi cột status (updated_at do trigger tự cập nhật)
  must(await db.from("payments").update({ status: "failed" }).eq("order_id", o.order_id).eq("status", "pending"));
  must(await db.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("order_id", o.order_id));
  for (const it of o.order_items) {
    const v = one(must(await db.from("product_variants").select("stock_quantity").eq("variant_id", it.variant_id).limit(1)));
    if (v) must(await db.from("product_variants").update({ stock_quantity: v.stock_quantity + it.quantity }).eq("variant_id", it.variant_id));
  }
  if (o.discount_id) {
    const v = one(must(await db.from("discount_by_voucher").select("times_used").eq("discount_id", o.discount_id).limit(1)));
    if (v && v.times_used > 0) must(await db.from("discount_by_voucher").update({ times_used: v.times_used - 1 }).eq("discount_id", o.discount_id));
  }
  broadcastRealtime("ORDER_CANCELLED", { orderId: o.order_id });
  res.json({ ok: true });
}));

// ---------- api thời gian thực (SSE) ----------
app.get("/api/realtime/events", handleSseConnection);

// ---------- api quản trị (admin) ----------
const { createAdminRouter } = require("./admin-routes");
app.use("/api/admin", createAdminRouter({ db, HttpError, wrap, must, one, splitName, fullName, bcrypt, jwt, JWT_SECRET, broadcastRealtime, unlockRequests }));

// ---------- file tĩnh & lỗi ----------
const root = path.join(__dirname, "..");
const staticOpts = {
  maxAge: "2h",
  etag: true,
  setHeaders: (res, pathUrl) => {
    // Không lưu cache HTML lâu để đảm bảo nội dung mới nhất
    if (pathUrl.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    }
  },
};
app.use("/shared", express.static(path.join(root, "shared"), staticOpts));
app.use("/client", express.static(path.join(root, "client"), staticOpts));
app.use("/admin", express.static(path.join(root, "admin"), staticOpts));
app.get("/", (_req, res) => res.redirect("/client/home.html"));
app.use("/api", (_req, res) => res.status(404).json({ error: "Không tìm thấy API." }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const msg = status >= 500 ? "Lỗi máy chủ: " + err.message : err.message;
  res.status(status).json({
    error: msg,
    message: msg,
    isLocked: Boolean(err.isLocked || (msg && msg.toLowerCase().includes("khóa"))),
    unlockStatus: err.unlockStatus || null,
    unlockReason: err.unlockReason || null,
  });
});

app.listen(PORT, () => console.log(`Jewels chạy tại http://localhost:${PORT}  (API: /api, Giao diện: /client/home.html)`));
