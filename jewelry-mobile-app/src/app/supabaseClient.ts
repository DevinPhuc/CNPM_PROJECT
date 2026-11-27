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
  parentCatId?: number | null;
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
  images?: string[];
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

export interface DbOrderItem {
  id: number;
  variantId?: number | null;
  productName: string;
  material?: string | null;
  gemstone?: string | null;
  size?: number | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  imageUrl: string;
  variantLabel: string;
}

export interface DbOrder {
  id: number;
  orderDate: string;
  formattedDate: string;
  status: string;
  cusName: string;
  cusPhone: string;
  address: string;
  shippingFee: number;
  discountAmount: number;
  discountCode?: string | null;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  items: DbOrderItem[];
}

export interface DbVoucher {
  discountId: number;
  voucherName: string;
  code: string;
  discountPercentage: number;
  usageLimit: number;
  timesUsed: number;
  remainingCount: number;
  limitPerCus: number;
  endDate?: string | null;
  isActive: boolean;
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

  const categories: DbCategory[] = (catRes.data || []).map((c: any) => ({
    id: c.cat_id,
    name: c.name,
    icon: getCategoryIcon(c.name),
    parentCatId: c.parent_cat_id || null,
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
      const resolvedPrimaryImg = resolveImageUrl(primaryImg?.image_url, p.pro_id);
      const resolvedGallery = Array.from(
        new Set([
          resolvedPrimaryImg,
          ...pImgs.map((row: any, rIdx: number) =>
            resolveImageUrl(row?.image_url, p.pro_id + rIdx)
          ),
        ])
      );

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
        img: resolvedPrimaryImg,
        images: resolvedGallery,
        desc:
          p.description ||
          "Chế tác tinh xảo từ chất liệu quý hiếm kèm chứng thư kiểm định chất lượng tại SaiGon Jewelry.",
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
    throw new Error("Tài khoản hoặc mật khẩu không chính xác");
  }

  let users: any[] | null = null;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id,email,password_hash,is_active,roles")
      .ilike("email", mail)
      .limit(1);
    if (error) {
      throw new Error("Lỗi kết nối, vui lòng thử lại");
    }
    users = data;
  } catch {
    throw new Error("Lỗi kết nối, vui lòng thử lại");
  }

  const user = users?.[0];
  if (!user) {
    throw new Error("Tài khoản chưa được đăng ký");
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
    throw new Error("Tài khoản hoặc mật khẩu không chính xác");
  }

  if (Array.isArray(user.roles) && !user.roles.includes("CUSTOMER")) {
    throw new Error("Tài khoản hoặc mật khẩu không chính xác");
  }

  try {
    // Đảm bảo có bản ghi trong bảng customers
    await supabase
      .from("customers")
      .upsert(
        { user_id: user.id },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

    const profile = await fetchCustomerProfileById(user.id);
    appStorage.setItem("jewels_mobile_uid", profile.id);
    localStorage.setItem("jewels_mobile_uid", profile.id);
    localStorage.setItem("jewels_user_email", profile.email);
    localStorage.setItem("jewels_user_id", profile.id);
    return profile;
  } catch {
    throw new Error("Lỗi kết nối, vui lòng thử lại");
  }
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
        name: v.products?.name || "Trang sức SaiGon Jewelry",
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
  paymentMethod: "cod" | "card" | "ewallet",
  discountId?: number | null,
  discountAmountInput: number = 0
): Promise<{ orderCode: string; orderId: number }> {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal >= 10000000 ? 0 : 83500;
  const discountAmount = Math.max(
    0,
    Math.min(subtotal, Math.round(discountAmountInput || 0))
  );
  const total = Math.max(0, subtotal - discountAmount + shipping);
  const dbMethod =
    paymentMethod === "card"
      ? "credit_card"
      : paymentMethod === "ewallet"
        ? "e_wallet"
        : "cod";

  await supabase
    .from("customers")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

  const orderInsertPayload: Record<string, any> = {
    customer_id: userId,
    cus_name: profile.name,
    cus_phone: profile.phone || "0900000000",
    address: profile.address || "123 Nguyễn Huệ, Quận 1, TP.HCM",
    status: dbMethod === "cod" ? "pending" : "processing",
    shipping_fee: shipping,
    discount_amount: discountAmount,
    total_amount: total,
  };
  if (discountId) {
    orderInsertPayload.discount_id = discountId;
  }

  const { data: orderRows, error: ordErr } = await supabase
    .from("orders")
    .insert(orderInsertPayload)
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

  // Chỉ xóa những món hàng đã được chọn mua khỏi giỏ hàng (giữ lại các món chưa chọn)
  const cartId = await getOrCreateCartId(userId);
  const dbCartItemIds = items
    .map((i) => i.id)
    .filter((id) => typeof id === "number" && id > 0 && id < 1000000000);
  if (dbCartItemIds.length > 0) {
    await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId)
      .in("cart_item_id", dbCartItemIds);
  }

  return {
    orderId,
    orderCode: `HD${String(orderId).padStart(6, "0")}`,
  };
}

// ==========================================
// QUẢN LÝ VOUCHER HỆ THỐNG & GIỮ CHỖ VOUCHER TRÊN SUPABASE
// ==========================================
export async function fetchActiveVouchers(): Promise<DbVoucher[]> {
  const [vRes, dRes] = await Promise.all([
    supabase
      .from("discount_by_voucher")
      .select(
        "discount_id,voucher_name,discount_percentage,usage_limit,times_used,limit_per_cus"
      )
      .order("discount_id"),
    supabase
      .from("discounts")
      .select("discount_id,name,code,begin_date,end_date,is_active"),
  ]);

  const discountsMap = new Map<number, any>();
  (dRes.data || []).forEach((d: any) => {
    discountsMap.set(Number(d.discount_id), d);
  });

  const now = new Date();
  const result: DbVoucher[] = [];

  for (const row of vRes.data || []) {
    const dId = Number(row.discount_id);
    const parentDisc = discountsMap.get(dId);

    // Nếu mã voucher trong bảng discounts có is_active === false hoặc đã hết hạn thì không hiển thị
    if (parentDisc && parentDisc.is_active === false) {
      continue;
    }
    if (parentDisc?.end_date) {
      const endD = new Date(parentDisc.end_date);
      if (!isNaN(endD.getTime()) && endD.getTime() + 86400000 < now.getTime()) {
        continue;
      }
    }

    const usageLimit = Number(row.usage_limit ?? 100);
    const timesUsed = Math.max(0, Number(row.times_used ?? 0));
    const remainingCount = Math.max(0, usageLimit - timesUsed);

    result.push({
      discountId: dId,
      voucherName: String(
        row.voucher_name || parentDisc?.name || `Voucher #${dId}`
      ),
      code: String(
        parentDisc?.code || row.voucher_name || `VOUCHER${dId}`
      ).toUpperCase(),
      discountPercentage: Number(row.discount_percentage ?? 10),
      usageLimit,
      timesUsed,
      remainingCount,
      limitPerCus: Number(row.limit_per_cus ?? 1),
      endDate: parentDisc?.end_date || null,
      isActive: true,
    });
  }

  return result;
}

export async function reserveVoucherInDb(
  discountId: number
): Promise<DbVoucher[]> {
  const { data: rows, error } = await supabase
    .from("discount_by_voucher")
    .select("discount_id,usage_limit,times_used")
    .eq("discount_id", discountId)
    .limit(1);

  if (error || !rows?.[0]) {
    throw new Error("Không thể tải dữ liệu voucher.");
  }

  const row = rows[0];
  const usageLimit = Number(row.usage_limit ?? 100);
  const currentUsed = Math.max(0, Number(row.times_used ?? 0));
  if (currentUsed >= usageLimit) {
    throw new Error("Mã voucher này đã hết lượt sử dụng.");
  }

  await supabase
    .from("discount_by_voucher")
    .update({ times_used: currentUsed + 1 })
    .eq("discount_id", discountId);

  return fetchActiveVouchers();
}

export async function releaseVoucherInDb(
  discountId: number
): Promise<DbVoucher[]> {
  const { data: rows } = await supabase
    .from("discount_by_voucher")
    .select("discount_id,times_used")
    .eq("discount_id", discountId)
    .limit(1);

  if (rows?.[0]) {
    const currentUsed = Math.max(0, Number(rows[0].times_used ?? 0));
    const nextUsed = Math.max(0, currentUsed - 1);
    await supabase
      .from("discount_by_voucher")
      .update({ times_used: nextUsed })
      .eq("discount_id", discountId);
  }

  return fetchActiveVouchers();
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
        o.order_items?.[0]?.product_name || "Trang sức SaiGon Jewelry";
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
      body: "Giảm 10% khi nhập mã WELCOME10 tại SaiGon Jewelry.",
      time: "14/11/2026 14:00",
      read: false,
    },
    {
      id: 5,
      title: "SAIGON JEWELRY – THÔNG BÁO HỆ THỐNG",
      body: "Tài khoản của bạn đã được đồng bộ dữ liệu trực tiếp với hệ thống Supabase.",
      time: "14/11/2026 10:00",
      read: true,
    },
  ];

  return [...dynamicNotifs, ...defaultNotifs];
}

// ==========================================
// LƯU TRỮ BỀN VỮNG TRẠNG THÁI ĐÃ ĐỌC THÔNG BÁO (LOCALSTORAGE + ANDROID SHAREDPREFERENCES)
// ==========================================
export const appStorage = {
  getItem(key: string): string | null {
    try {
      const w = typeof window !== "undefined" ? (window as any) : null;
      if (w?.AndroidStorage && typeof w.AndroidStorage.getItem === "function") {
        const nativeVal = w.AndroidStorage.getItem(key);
        if (
          nativeVal !== null &&
          nativeVal !== undefined &&
          String(nativeVal) !== ""
        ) {
          return String(nativeVal);
        }
      }
      if (typeof localStorage !== "undefined") {
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem(key: string, value: string): void {
    try {
      const w = typeof window !== "undefined" ? (window as any) : null;
      if (w?.AndroidStorage && typeof w.AndroidStorage.setItem === "function") {
        w.AndroidStorage.setItem(key, value);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, value);
      }
    } catch {}
  },
  removeItem(key: string): void {
    try {
      const w = typeof window !== "undefined" ? (window as any) : null;
      if (
        w?.AndroidStorage &&
        typeof w.AndroidStorage.removeItem === "function"
      ) {
        w.AndroidStorage.removeItem(key);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch {}
  },
};

export function getSavedReadNotificationIds(
  userId: string,
  notifs: DbNotification[] = []
): number[] {
  const key = `jewels_read_notifs_${userId}`;
  const maxKey = `jewels_read_all_max_${userId}`;
  const raw = appStorage.getItem(key);
  const rawMax = appStorage.getItem(maxKey);
  const maxReadAllId = rawMax !== null ? Number(rawMax) : -1;

  let savedIds: number[] = [];
  let hasSavedRecord = false;
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        savedIds = parsed.map((n) => Number(n)).filter((n) => !isNaN(n));
        hasSavedRecord = true;
      }
    } catch {}
  }

  // Nếu người dùng chưa từng có lịch sử lưu trữ trên thiết bị, khởi tạo với các thông báo mặc định có read = true
  if (!hasSavedRecord) {
    const defaultRead = notifs.filter((n) => n.read).map((n) => n.id);
    return Array.from(new Set([5, ...defaultRead]));
  }

  // Nếu người dùng đã bấm "Đọc tất cả" trước đó, mọi thông báo có id <= maxReadAllId đều được đánh dấu đã đọc
  const autoReadFromWatermark =
    maxReadAllId >= 0
      ? notifs.filter((n) => n.id <= maxReadAllId).map((n) => n.id)
      : [];

  return Array.from(new Set([...savedIds, ...autoReadFromWatermark]));
}

export function saveReadNotificationIds(
  userId: string,
  readIds: number[],
  markedAll: boolean = false
): void {
  if (!userId) return;
  const uniqueIds = Array.from(
    new Set(readIds.map((n) => Number(n)).filter((n) => !isNaN(n)))
  );
  appStorage.setItem(
    `jewels_read_notifs_${userId}`,
    JSON.stringify(uniqueIds)
  );
  if (markedAll && uniqueIds.length > 0) {
    const prevMaxRaw = appStorage.getItem(`jewels_read_all_max_${userId}`);
    const prevMax = prevMaxRaw !== null ? Number(prevMaxRaw) : 0;
    const nextMax = Math.max(prevMax, ...uniqueIds);
    appStorage.setItem(`jewels_read_all_max_${userId}`, String(nextMax));
  }
}

function formatShortDateVN(isoStr?: string | null): string {
  if (!isoStr) return "Hôm nay";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "Hôm nay";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = d.getDate();
  const mo = d.getMonth() + 1;
  const yy = String(d.getFullYear()).slice(-2);
  return `${hh}:${mm} ${dd}/${mo}/${yy}`;
}

export async function fetchCustomerOrders(userId: string): Promise<DbOrder[]> {
  const { data: rows } = await supabase
    .from("orders")
    .select("*,order_items(*),payments(*),discounts(name,code)")
    .eq("customer_id", userId)
    .order("order_date", { ascending: false });

  if (!rows || rows.length === 0) return [];

  return rows.map((o: any) => {
    const payRow = Array.isArray(o.payments) ? o.payments[0] : o.payments;
    const discRow = Array.isArray(o.discounts) ? o.discounts[0] : o.discounts;
    const items: DbOrderItem[] = (o.order_items || []).map(
      (it: any, idx: number) => ({
        id: it.order_item_id || idx + 1,
        variantId: it.variant_id || null,
        productName: it.product_name || "Trang sức SaiGon Jewelry",
        material: it.material || null,
        gemstone: it.gemstone || null,
        size: it.size || null,
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unit_price || 0),
        subtotal: Number(
          it.subtotal ?? Number(it.unit_price || 0) * Number(it.quantity || 1)
        ),
        imageUrl: resolveImageUrl(it.image_url, o.order_id + idx),
        variantLabel: formatVariantLabel({
          material: it.material,
          gemstone: it.gemstone,
          size: it.size,
        }),
      })
    );

    return {
      id: o.order_id,
      orderDate: o.order_date || "",
      formattedDate: formatShortDateVN(o.order_date),
      status: o.status || "pending",
      cusName: o.cus_name || "Khách hàng",
      cusPhone: o.cus_phone || "",
      address: o.address || "",
      shippingFee: Number(o.shipping_fee || 0),
      discountAmount: Number(o.discount_amount || 0),
      discountCode: discRow?.code || null,
      totalAmount: Number(o.total_amount || 0),
      paymentMethod: payRow?.method || "cod",
      paymentStatus: payRow?.status || "pending",
      items,
    };
  });
}

export async function cancelCustomerOrderInDb(
  orderId: number,
  userId: string
): Promise<DbOrder[]> {
  const { data: ord } = await supabase
    .from("orders")
    .select("order_id,status,order_items(variant_id,quantity)")
    .eq("order_id", orderId)
    .eq("customer_id", userId)
    .limit(1);

  const row = ord?.[0];
  if (!row) throw new Error("Không tìm thấy đơn hàng.");
  if (row.status !== "pending") {
    throw new Error("Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận.");
  }

  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .eq("customer_id", userId);

  await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  // Hoàn lại số lượng tồn kho
  for (const it of row.order_items || []) {
    if (it.variant_id) {
      const { data: vRows } = await supabase
        .from("product_variants")
        .select("stock_quantity")
        .eq("variant_id", it.variant_id)
        .limit(1);
      if (vRows?.[0]) {
        await supabase
          .from("product_variants")
          .update({
            stock_quantity:
              Number(vRows[0].stock_quantity || 0) + Number(it.quantity || 0),
          })
          .eq("variant_id", it.variant_id);
      }
    }
  }

  return fetchCustomerOrders(userId);
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
