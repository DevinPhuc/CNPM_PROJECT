import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Kết nối trực tiếp tới cơ sở dữ liệu Supabase của hệ thống Jewels
const SUPABASE_URL = "https://bftsaoenydkbdsiwgczq.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmdHNhb2VueWRrYmRzaXdnY3pxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTI5ODM0NywiZXhwIjoyMTA2ODc0MzQ3fQ.FOxqiAIXGSiXArcN3bxF5FiIeDntzzwtVqU-tKy76dU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

export interface CustomerProfile {
  id: string;
  email: string;
  name: string;
  phone: string;
  dob: string;
  address: string;
  gender: string;
  ordersCount: number;
  points: number;
  joinDate: string;
}

export interface DbCategory {
  id: number;
  name: string;
  icon: string;
}

export interface DbVariant {
  id: number;
  label: string;
  material: string;
  gemstone: string | null;
  size: number | null;
  price: number;
  stock: number;
}

export interface DbProduct {
  id: number;
  name: string;
  price: string;
  numericPrice: number;
  tag?: string;
  category: string;
  catId: number;
  variant: string;
  variants: string[];
  variantObjects: DbVariant[];
  defaultVariantId: number | null;
  stock: number;
  img: string;
  desc: string;
  createdAt?: string;
}

export interface DbCartItem {
  id: number; // cart_item_id or variant_id
  variantId: number;
  productId: number;
  name: string;
  price: number;
  img: string;
  qty: number;
  variant: string;
  stock: number;
}

export interface DbNotification {
  id: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

// Map ảnh sản phẩm để hoạt động mượt trên cả trình duyệt web, VS Code Live Server và Android Studio WebView
const FALLBACK_IMAGES: Record<string, string> = {
  "nhan-vang-18k.jpg":
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop&auto=format",
  "nhan-vang-18k-detail.jpg":
    "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop&auto=format",
  "nhan-cuoi-14k.jpg":
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=600&fit=crop&auto=format",
  "day-chuyen-bac.jpg":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop&auto=format",
  "bong-tai-ngoc-trai.jpg":
    "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=600&h=600&fit=crop&auto=format",
  "lac-tay-vang-24k.jpg":
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=600&fit=crop&auto=format",
  "product-item1.jpg":
    "https://images.unsplash.com/photo-1573408301185-9519f94b6b38?w=600&h=600&fit=crop&auto=format",
  "product-item2.jpg":
    "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&h=600&fit=crop&auto=format",
};

export function resolveImageUrl(rawUrl?: string | null, proId?: number): string {
  if (!rawUrl) {
    return "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop&auto=format";
  }
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  const fileName = rawUrl.split("/").pop() || "";
  // Nếu chạy trên Express server port 3000 thì dùng ảnh gốc từ /shared/images, nếu mở standalone/Android thì dùng ảnh chất lượng cao tương ứng
  if (
    typeof window !== "undefined" &&
    window.location.protocol.startsWith("http") &&
    window.location.port === "3000"
  ) {
    return rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl.replace(/^\.\.\//, "");
  }
  if (FALLBACK_IMAGES[fileName]) {
    return FALLBACK_IMAGES[fileName];
  }
  const fallbackList = Object.values(FALLBACK_IMAGES);
  return fallbackList[(proId || 1) % fallbackList.length];
}

function splitName(full: string) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts.pop() || "";
  return { first_name: first, last_name: parts.join(" ") };
}

function fullName(u: { first_name?: string | null; last_name?: string | null }) {
  return `${u.last_name || ""} ${u.first_name || ""}`.trim();
}

function formatVariantLabel(v: {
  material?: string | null;
  gemstone?: string | null;
  size?: number | null;
}): string {
  const parts: string[] = [];
  if (v.material) parts.push(v.material);
  if (v.gemstone) parts.push(v.gemstone);
  else if (v.size) parts.push(`Size ${v.size}`);
  return parts.length > 0 ? parts.join(" · ") : "Tiêu chuẩn";
}

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("nhẫn")) return "💍";
  if (lower.includes("dây chuyền")) return "📿";
  if (lower.includes("lắc") || lower.includes("vòng")) return "✨";
  if (lower.includes("bông tai") || lower.includes("hoa tai")) return "💎";
  return "👑";
}

// ==========================================
// 1. LẤY DANH SÁCH DANH MỤC & SẢN PHẨM TỪ SUPABASE
// ==========================================
export async function fetchStoreCatalog(): Promise<{
  categories: DbCategory[];
  products: DbProduct[];
}> {
  const [catRes, prodRes, imgRes] = await Promise.all([
    supabase
      .from("categories")
      .select("cat_id,name,parent_cat_id")
      .eq("is_active", true)
      .order("cat_id"),
    supabase
      .from("products")
      .select(
        "pro_id,cat_id,name,description,base_price,created_at,categories(name),product_variants(variant_id,material,gemstone,size,price,stock_quantity,is_active)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("product_images")
      .select("pro_id,variant_id,image_url,is_primary")
      .order("img_id"),
  ]);

  const categories: DbCategory[] = (catRes.data || [])
    .filter((c: any) => !c.parent_cat_id)
    .map((c: any) => ({
      id: c.cat_id,
      name: c.name,
      icon: getCategoryIcon(c.name),
    }));

  const imgMap: Record<number, any[]> = {};
  (imgRes.data || []).forEach((row: any) => {
    if (!imgMap[row.pro_id]) imgMap[row.pro_id] = [];
    imgMap[row.pro_id].push(row);
  });

  const tags = ["BÁN CHẠY", "MỚI", "TUYỆT TÁC", "HOT", "CAO CẤP"];

  const products: DbProduct[] = (prodRes.data || []).map(
    (p: any, idx: number) => {
      const activeVariants = (p.product_variants || []).filter(
        (v: any) => v.is_active
      );
      const variantObjects: DbVariant[] = activeVariants.map((v: any) => ({
        id: v.variant_id,
        label: formatVariantLabel(v),
        material: v.material || "Vàng 18K",
        gemstone: v.gemstone || null,
        size: v.size === null ? null : Number(v.size),
        price: Number(v.price ?? p.base_price),
        stock: Number(v.stock_quantity ?? 0),
      }));

      const inStockVariants = variantObjects.filter((v) => v.stock > 0);
      const defVar = inStockVariants[0] || variantObjects[0] || null;
      const totalStock = variantObjects.reduce((s, v) => s + v.stock, 0);
      const minPrice = variantObjects.length
        ? Math.min(...variantObjects.map((v) => v.price))
        : Number(p.base_price);

      const pImgs = imgMap[p.pro_id] || [];
      const primaryImg =
        pImgs.find((i) => i.is_primary) || pImgs[0] || null;

      const variantsLabels =
        variantObjects.length > 0
          ? Array.from(new Set(variantObjects.map((v) => v.label)))
          : ["Vàng 18K · Kim cương"];

      return {
        id: p.pro_id,
        name: p.name,
        price: minPrice.toLocaleString("vi-VN") + "đ",
        numericPrice: minPrice,
        tag: tags[idx % tags.length],
        category: p.categories?.name || "Nhẫn",
        catId: p.cat_id,
        variant: defVar ? defVar.label : variantsLabels[0],
        variants: variantsLabels,
        variantObjects,
        defaultVariantId: defVar ? defVar.id : null,
        stock: totalStock > 0 ? totalStock : 5,
        img: resolveImageUrl(primaryImg?.image_url, p.pro_id),
        desc:
          p.description ||
          "Chế tác tinh xảo từ chất liệu quý hiếm kèm chứng thư kiểm định chất lượng tại Hương Jewelry.",
        createdAt: p.created_at,
      };
    }
  );

  return { categories, products };
}

// ==========================================
// 2. XÁC THỰC & ĐỒNG BỘ TÀI KHOẢN KHÁCH HÀNG SUPABASE
// ==========================================
export async function fetchCustomerProfileById(
  userId: string
): Promise<CustomerProfile> {
  const { data: users, error } = await supabase
    .from("users")
    .select("id,email,first_name,last_name,phone,is_active,roles,created_at")
    .eq("id", userId)
    .limit(1);

  if (error || !users || users.length === 0) {
    throw new Error("Tài khoản không tồn tại.");
  }
  const user = users[0];
  if (!user.is_active) {
    const err: any = new Error(
      "Tài khoản của bạn đã bị khóa bởi quản trị viên."
    );
    err.isLocked = true;
    throw err;
  }

  const [custRes, addrRes, ordRes] = await Promise.all([
    supabase
      .from("customers")
      .select("dob,created_at")
      .eq("user_id", userId)
      .limit(1),
    supabase
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", userId)
      .order("is_default", { ascending: false })
      .order("address_id"),
    supabase
      .from("orders")
      .select("order_id,total_amount,status")
      .eq("customer_id", userId),
  ]);

  const customer = custRes.data?.[0] || null;
  const defaultAddr = addrRes.data?.[0] || null;
  const orders = ordRes.data || [];
  const validOrders = orders.filter((o: any) => o.status !== "cancelled");
  const totalSpent = validOrders.reduce(
    (sum: number, o: any) => sum + Number(o.total_amount || 0),
    0
  );
  // Tích điểm: 1 điểm cho mỗi 10.000đ chi tiêu (tối thiểu 1.200 điểm chào mừng thành viên)
  const points = Math.max(1200, Math.round(totalSpent / 10000));

  const createdDate = customer?.created_at || user.created_at;
  let joinDate = "10/2026";
  if (createdDate) {
    const d = new Date(createdDate);
    if (!isNaN(d.getTime())) {
      joinDate = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: fullName(user) || user.email.split("@")[0],
    phone: user.phone || "",
    dob: customer?.dob || "1995-05-20",
    address:
      defaultAddr?.address_line ||
      "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
    gender: "Nữ",
    ordersCount: orders.length,
    points,
    joinDate,
  };
}

export async function loginCustomer(
  emailInput: string,
  passwordInput: string
): Promise<CustomerProfile> {
  const mail = String(emailInput || "")
    .trim()
    .toLowerCase();
  if (!mail || !passwordInput) {
    throw new Error("Vui lòng nhập đầy đủ email và mật khẩu.");
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("id,email,password_hash,is_active,roles")
    .eq("email", mail)
    .limit(1);

  if (error) throw new Error("Lỗi kết nối cơ sở dữ liệu: " + error.message);
  const user = users?.[0];
  if (!user) {
    throw new Error("Email hoặc mật khẩu chưa chính xác.");
  }

  if (!user.is_active) {
    const err: any = new Error(
      "Tài khoản của bạn đã bị khóa bởi quản trị viên."
    );
    err.isLocked = true;
    throw err;
  }

  const ok =
    user.password_hash &&
    (await bcrypt.compare(String(passwordInput), user.password_hash));
  if (!ok) {
    throw new Error("Email hoặc mật khẩu chưa chính xác.");
  }

  if (Array.isArray(user.roles) && !user.roles.includes("CUSTOMER")) {
    throw new Error("Tài khoản này không phải tài khoản khách hàng.");
  }

  // Đảm bảo có bản ghi trong bảng customers
  await supabase
    .from("customers")
    .upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });

  const profile = await fetchCustomerProfileById(user.id);
  localStorage.setItem("jewels_mobile_uid", profile.id);
  localStorage.setItem("jewels_user_email", profile.email);
  localStorage.setItem("jewels_user_id", profile.id);
  return profile;
}

export async function registerCustomer(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<CustomerProfile> {
  const mail = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!mail || !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(mail)) {
    throw new Error(
      "Email đăng ký phải có đầy đủ cú pháp @gmail.com (ví dụ: ban@gmail.com)."
    );
  }
  if (String(payload.password || "").length < 8) {
    throw new Error("Mật khẩu tối thiểu 8 ký tự.");
  }
  if (String(payload.name || "").trim().length < 2) {
    throw new Error("Vui lòng nhập họ và tên.");
  }
  const cleanPhone = String(payload.phone || "")
    .trim()
    .replace(/\D/g, "");
  if (!/^\d{10}$/.test(cleanPhone)) {
    throw new Error("Số điện thoại đăng ký phải có đúng 10 chữ số.");
  }

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", mail)
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error("Email này đã được đăng ký. Hãy đăng nhập.");
  }

  const password_hash = await bcrypt.hash(payload.password, 10);
  const { data: inserted, error } = await supabase
    .from("users")
    .insert({
      email: mail,
      password_hash,
      roles: ["CUSTOMER"],
      phone: cleanPhone,
      ...splitName(payload.name),
    })
    .select("id");

  if (error || !inserted?.[0]) {
    throw new Error(error?.message || "Không thể tạo tài khoản.");
  }

  const newUid = inserted[0].id;
  await supabase.from("customers").insert({ user_id: newUid });

  const profile = await fetchCustomerProfileById(newUid);
  localStorage.setItem("jewels_mobile_uid", profile.id);
  localStorage.setItem("jewels_user_email", profile.email);
  localStorage.setItem("jewels_user_id", profile.id);
  return profile;
}

export async function updateCustomerProfile(
  userId: string,
  payload: {
    name: string;
    phone: string;
    dob: string;
    address: string;
  }
): Promise<CustomerProfile> {
  if (String(payload.name || "").trim().length < 2) {
    throw new Error("Vui lòng nhập họ và tên hợp lệ.");
  }
  const cleanPhone = String(payload.phone || "")
    .trim()
    .replace(/\D/g, "");
  if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
    throw new Error("Số điện thoại phải bao gồm đúng 10 chữ số.");
  }

  const { error: uErr } = await supabase
    .from("users")
    .update({
      ...splitName(payload.name),
      phone: cleanPhone || null,
    })
    .eq("id", userId);
  if (uErr) throw new Error(uErr.message);

  // Cập nhật ngày sinh trong bảng customers
  let formattedDob: string | null = null;
  if (payload.dob) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(payload.dob.trim())) {
      formattedDob = payload.dob.trim();
    } else {
      const m = payload.dob.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        formattedDob = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
    }
  }
  await supabase
    .from("customers")
    .upsert(
      { user_id: userId, dob: formattedDob },
      { onConflict: "user_id" }
    );

  // Cập nhật địa chỉ mặc định trong bảng customer_addresses
  if (payload.address && payload.address.trim()) {
    const { data: existingAddrs } = await supabase
      .from("customer_addresses")
      .select("address_id")
      .eq("customer_id", userId)
      .order("is_default", { ascending: false })
      .limit(1);

    if (existingAddrs && existingAddrs.length > 0) {
      await supabase
        .from("customer_addresses")
        .update({
          recipient_name: payload.name.trim(),
          phone: cleanPhone || "0900000000",
          address_line: payload.address.trim(),
          is_default: true,
        })
        .eq("address_id", existingAddrs[0].address_id);
    } else {
      await supabase.from("customer_addresses").insert({
        customer_id: userId,
        recipient_name: payload.name.trim(),
        phone: cleanPhone || "0900000000",
        address_line: payload.address.trim(),
        is_default: true,
      });
    }
  }

  return fetchCustomerProfileById(userId);
}

export async function updateCustomerPassword(
  userId: string,
  currentPass: string,
  newPass: string
): Promise<void> {
  if (newPass.length < 8) {
    throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự.");
  }
  const { data: users, error } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .limit(1);
  if (error || !users?.[0]) {
    throw new Error("Không tìm thấy tài khoản.");
  }
  const ok = await bcrypt.compare(currentPass, users[0].password_hash || "");
  if (!ok) {
    throw new Error("Mật khẩu hiện tại chưa chính xác.");
  }
  const hashed = await bcrypt.hash(newPass, 10);
  const { error: rpcErr } = await supabase.rpc("app_set_password_hash", {
    p_user_id: userId,
    p_hash: hashed,
  });
  if (rpcErr) {
    // Fallback update directly if RPC not needed
    const { error: upErr } = await supabase
      .from("users")
      .update({ password_hash: hashed })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);
  }
}

// ==========================================
// 3. ĐỒNG BỘ GIỎ HÀNG & ĐƠN HÀNG VỚI SUPABASE
// ==========================================
async function getOrCreateCartId(userId: string): Promise<number> {
  const { data: existing } = await supabase
    .from("carts")
    .select("cart_id")
    .eq("customer_id", userId)
    .limit(1);
  if (existing && existing.length > 0) {
    return existing[0].cart_id;
  }
  const { data: created, error } = await supabase
    .from("carts")
    .insert({ customer_id: userId, status: "empty" })
    .select("cart_id");
  if (error || !created?.[0]) {
    throw new Error(error?.message || "Không thể khởi tạo giỏ hàng.");
  }
  return created[0].cart_id;
}

export async function fetchCustomerCart(userId: string): Promise<DbCartItem[]> {
  const cartId = await getOrCreateCartId(userId);
  const { data: rows } = await supabase
    .from("cart_items")
    .select(
      "cart_item_id,quantity,variant_id,product_variants(variant_id,pro_id,material,gemstone,size,price,stock_quantity,is_active,products(name,is_active))"
    )
    .eq("cart_id", cartId)
    .order("cart_item_id");

  if (!rows || rows.length === 0) return [];

  const proIds = Array.from(
    new Set(
      rows
        .map((r: any) => r.product_variants?.pro_id)
        .filter(Boolean)
    )
  );

  const { data: imgs } = await supabase
    .from("product_images")
    .select("pro_id,variant_id,image_url,is_primary")
    .in("pro_id", proIds)
    .order("img_id");

  const imgMap: Record<number, any[]> = {};
  (imgs || []).forEach((i: any) => {
    if (!imgMap[i.pro_id]) imgMap[i.pro_id] = [];
    imgMap[i.pro_id].push(i);
  });

  return rows
    .filter((r: any) => r.product_variants)
    .map((r: any) => {
      const v = r.product_variants;
      const pImgs = imgMap[v.pro_id] || [];
      const chosenImg =
        pImgs.find((i) => i.variant_id === v.variant_id) ||
        pImgs.find((i) => i.is_primary) ||
        pImgs[0];
      return {
        id: r.cart_item_id,
        variantId: v.variant_id,
        productId: v.pro_id,
        name: v.products?.name || "Trang sức Hương Jewelry",
        price: Number(v.price || 0),
        img: resolveImageUrl(chosenImg?.image_url, v.pro_id),
        qty: Number(r.quantity || 1),
        variant: formatVariantLabel(v),
        stock: Number(v.stock_quantity || 5),
      };
    });
}

export async function addCartItemToDb(
  userId: string,
  variantId: number,
  qty: number
): Promise<DbCartItem[]> {
  const cartId = await getOrCreateCartId(userId);
  const { data: existing } = await supabase
    .from("cart_items")
    .select("cart_item_id,quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .limit(1);

  if (existing && existing.length > 0) {
    const newQty = Number(existing[0].quantity || 0) + qty;
    await supabase
      .from("cart_items")
      .update({ quantity: newQty })
      .eq("cart_item_id", existing[0].cart_item_id);
  } else {
    await supabase.from("cart_items").insert({
      cart_id: cartId,
      variant_id: variantId,
      quantity: qty,
    });
  }
  await supabase
    .from("carts")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("cart_id", cartId);

  return fetchCustomerCart(userId);
}

export async function updateCartItemQtyInDb(
  userId: string,
  cartItemId: number,
  newQty: number
): Promise<DbCartItem[]> {
  if (newQty <= 0) {
    return removeCartItemFromDb(userId, cartItemId);
  }
  await supabase
    .from("cart_items")
    .update({ quantity: newQty })
    .eq("cart_item_id", cartItemId);
  return fetchCustomerCart(userId);
}

export async function removeCartItemFromDb(
  userId: string,
  cartItemId: number
): Promise<DbCartItem[]> {
  const cartId = await getOrCreateCartId(userId);
  await supabase
    .from("cart_items")
    .delete()
    .eq("cart_item_id", cartItemId)
    .eq("cart_id", cartId);
  return fetchCustomerCart(userId);
}

export async function createOrderInDb(
  userId: string,
  profile: CustomerProfile,
  items: DbCartItem[],
  paymentMethod: "cod" | "card" | "ewallet"
): Promise<{ orderCode: string; orderId: number }> {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 10000000 ? 0 : 30000;
  const total = subtotal + shipping;
  const dbMethod =
    paymentMethod === "card"
      ? "credit_card"
      : paymentMethod === "ewallet"
        ? "e_wallet"
        : "cod";

  await supabase
    .from("customers")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

  const { data: orderRows, error: ordErr } = await supabase
    .from("orders")
    .insert({
      customer_id: userId,
      cus_name: profile.name,
      cus_phone: profile.phone || "0900000000",
      address: profile.address || "123 Nguyễn Huệ, Quận 1, TP.HCM",
      status: dbMethod === "cod" ? "pending" : "processing",
      shipping_fee: shipping,
      discount_amount: 0,
      total_amount: total,
    })
    .select("order_id");

  if (ordErr || !orderRows?.[0]) {
    throw new Error(ordErr?.message || "Không thể tạo đơn hàng.");
  }

  const orderId = orderRows[0].order_id;

  // Lưu chi tiết đơn hàng
  const orderItemsPayload = items
    .filter((i) => i.variantId)
    .map((i) => ({
      order_id: orderId,
      variant_id: i.variantId,
      quantity: i.qty,
      unit_price: i.price,
      subtotal: i.price * i.qty,
      product_name: i.name,
      material: i.variant.split("·")[0]?.trim() || "Vàng 18K",
      image_url: i.img,
    }));

  if (orderItemsPayload.length > 0) {
    await supabase.from("order_items").insert(orderItemsPayload);
  }

  await supabase.from("payments").insert({
    order_id: orderId,
    method: dbMethod,
    amount: total,
    status: dbMethod === "cod" ? "pending" : "completed",
  });

  // Dọn giỏ hàng sau khi đặt
  const cartId = await getOrCreateCartId(userId);
  await supabase.from("cart_items").delete().eq("cart_id", cartId);
  await supabase
    .from("carts")
    .update({ status: "empty", updated_at: new Date().toISOString() })
    .eq("cart_id", cartId);

  return {
    orderId,
    orderCode: `HD${String(orderId).padStart(6, "0")}`,
  };
}

export async function fetchCustomerNotifications(
  userId: string
): Promise<DbNotification[]> {
  const { data: orders } = await supabase
    .from("orders")
    .select("order_id,order_date,status,total_amount,order_items(product_name)")
    .eq("customer_id", userId)
    .order("order_date", { ascending: false })
    .limit(5);

  const dynamicNotifs: DbNotification[] = (orders || []).map(
    (o: any, idx: number) => {
      const firstProd =
        o.order_items?.[0]?.product_name || "Trang sức Hương Jewelry";
      const code = `HD${String(o.order_id).padStart(6, "0")}`;
      const statusTitle =
        o.status === "delivered"
          ? "GIAO HÀNG THÀNH CÔNG"
          : o.status === "cancelled"
            ? "ĐƠN HÀNG ĐÃ HỦY"
            : "ĐƠN HÀNG CỦA BẠN ĐÃ ĐƯỢC XÁC NHẬN";
      const statusBody =
        o.status === "delivered"
          ? `${firstProd} – Mã đơn ${code} đã được giao thành công.`
          : o.status === "cancelled"
            ? `Đơn hàng ${code} (${firstProd}) đã được hủy.`
            : `${firstProd} – Mã đơn ${code} đang được xử lý (${Number(o.total_amount || 0).toLocaleString("vi-VN")}đ).`;
      const d = o.order_date ? new Date(o.order_date) : new Date();
      const timeStr = !isNaN(d.getTime())
        ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : "Hôm nay";

      return {
        id: 100 + o.order_id,
        title: statusTitle,
        body: statusBody,
        time: timeStr,
        read: idx > 1,
      };
    }
  );

  const defaultNotifs: DbNotification[] = [
    {
      id: 2,
      title: "KHUYẾN MÃI ĐẶC BIỆT CUỐI TUẦN",
      body: "Giảm 10% cho thành viên VIP khi nhập mã WELCOME10 tại Hương Jewelry.",
      time: "14/11/2026 14:00",
      read: false,
    },
    {
      id: 5,
      title: "HƯƠNG JEWELRY – ĐẶC QUYỀN THÀNH VIÊN",
      body: "Tài khoản của bạn đã được đồng bộ dữ liệu trực tiếp với hệ thống Supabase.",
      time: "14/11/2026 10:00",
      read: true,
    },
  ];

  return [...dynamicNotifs, ...defaultNotifs];
}

// Lấy danh sách tài khoản khách hàng mẫu từ Supabase để người dùng có thể chọn đăng nhập nhanh hoặc kiểm tra
export async function fetchSampleCustomerAccounts(): Promise<
  { email: string; name: string; phone: string }[]
> {
  const { data } = await supabase
    .from("users")
    .select("email,first_name,last_name,phone,roles,is_active")
    .eq("is_active", true)
    .limit(10);

  return (data || [])
    .filter(
      (u: any) => Array.isArray(u.roles) && u.roles.includes("CUSTOMER")
    )
    .map((u: any) => ({
      email: u.email,
      name: fullName(u) || u.email,
      phone: u.phone || "",
    }));
}
