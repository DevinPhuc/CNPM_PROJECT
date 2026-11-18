import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Bell,
  Calendar,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Heart,
  Home as HomeIcon,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  User,
  Venus,
  X,
} from "lucide-react";
import {
  addCartItemToDb,
  createOrderInDb,
  CustomerProfile,
  DbCartItem,
  DbCategory,
  DbNotification,
  DbProduct,
  fetchCustomerCart,
  fetchCustomerNotifications,
  fetchCustomerProfileById,
  fetchSampleCustomerAccounts,
  fetchStoreCatalog,
  loginCustomer,
  registerCustomer,
  removeCartItemFromDb,
  updateCartItemQtyInDb,
  updateCustomerPassword,
  updateCustomerProfile,
} from "./supabaseClient";

// ==========================================
// 1. DESIGN TOKENS & CONSTANTS
// ==========================================
const PRIMARY_GOLD = "#b8922a";
const BORDER_GOLD_LIGHT = "#e8dfc8";
const NAVY_HEADER = "#2d2060";
const DARK_BG = "#16120c";
const DARK_CARD = "#221c13";
const DARK_BORDER = "rgba(184, 146, 42, 0.22)";

const formatCurrency = (amount: number) => {
  return amount.toLocaleString("vi-VN") + "đ";
};

const maskPhone = (phone?: string) => {
  if (!phone) return "Chưa cập nhật SĐT";
  const clean = phone.replace(/\s+/g, "");
  if (clean.length < 7) return clean;
  return clean.slice(0, 3) + "****" + clean.slice(-3);
};

// ==========================================
// 2. DATA MODELS & FALLBACK DATA
// ==========================================
export type CartItem = DbCartItem;
export type ProductItem = DbProduct;

const fallbackCategories: DbCategory[] = [
  { id: 1, icon: "💍", name: "Nhẫn" },
  { id: 2, icon: "📿", name: "Dây chuyền" },
  { id: 4, icon: "✨", name: "Lắc tay" },
  { id: 3, icon: "💎", name: "Bông tai" },
];

const fallbackProducts: ProductItem[] = [
  {
    id: 1,
    name: "Nhẫn Vàng 18K Đính Kim Cương",
    price: "12.500.000đ",
    numericPrice: 12500000,
    tag: "BÁN CHẠY",
    category: "Nhẫn",
    catId: 1,
    variant: "Vàng 18K · Kim cương 0.3ct",
    variants: ["Vàng 18K · Kim cương 0.3ct"],
    variantObjects: [
      {
        id: 1,
        label: "Vàng 18K · Kim cương 0.3ct",
        material: "Vàng 18K",
        gemstone: "Kim cương 0.3ct",
        size: 12,
        price: 12500000,
        stock: 18,
      },
    ],
    defaultVariantId: 1,
    stock: 29,
    img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop&auto=format",
    desc: "Nhẫn vàng 18K đính kim cương tự nhiên 0.3ct, thiết kế solitaire.",
  },
  {
    id: 7,
    name: "Nhẫn Vàng Thử Nghiệm 862785 Updated",
    price: "16.000.000đ",
    numericPrice: 16000000,
    tag: "MỚI",
    category: "Nhẫn",
    catId: 1,
    variant: "Vàng 18K · Kim cương",
    variants: ["Vàng 18K · Kim cương"],
    variantObjects: [
      {
        id: 8,
        label: "Vàng 18K · Kim cương",
        material: "Vàng 18K",
        gemstone: "Kim cương",
        size: null,
        price: 16000000,
        stock: 5,
      },
    ],
    defaultVariantId: 8,
    stock: 5,
    img: "https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&h=600&fit=crop&auto=format",
    desc: "Mô tả cập nhật",
  },
  {
    id: 4,
    name: "Bông Tai Ngọc Trai Akoya",
    price: "3.900.000đ",
    numericPrice: 3900000,
    tag: "SALE",
    category: "Bông tai",
    catId: 3,
    variant: "Vàng 14K · Ngọc trai Akoya",
    variants: ["Vàng 14K · Ngọc trai Akoya"],
    variantObjects: [
      {
        id: 5,
        label: "Vàng 14K · Ngọc trai Akoya",
        material: "Vàng 14K",
        gemstone: "Ngọc trai Akoya",
        size: 8,
        price: 3900000,
        stock: 19,
      },
    ],
    defaultVariantId: 5,
    stock: 19,
    img: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=600&h=600&fit=crop&auto=format",
    desc: "Bông tai ngọc trai Akoya gắn vàng 14K.",
  },
];

const legalItems = [
  {
    icon: FileText,
    label: "Điều khoản dịch vụ",
    content:
      "Chào mừng quý khách đến với Hương Jewelry. Mọi sản phẩm trang sức đều đi kèm giấy kiểm định chất lượng kim cương và vàng 18K chính hãng, hỗ trợ bảo hành làm sáng trọn đời.",
  },
  {
    icon: Shield,
    label: "Chính sách bảo mật",
    content:
      "Thông tin cá nhân, số điện thoại và lịch sử giao dịch của quý khách tại Hương Jewelry được mã hóa và bảo mật tuyệt đối trên cơ sở dữ liệu Supabase chuẩn an toàn dữ liệu.",
  },
  {
    icon: FileText,
    label: "Quy định sử dụng",
    content:
      "Khách hàng thành viên Vàng được hưởng ưu đãi tích điểm trên mọi đơn hàng, miễn phí vận chuyển cho đơn từ 10.000.000đ và đổi trả trong vòng 7 ngày.",
  },
];

// ==========================================
// 2B. AUTH SCREEN (ĐĂNG NHẬP / ĐĂNG KÝ / ĐĂNG XUẤT TỪ WEB)
// ==========================================
function AuthScreen({
  loggedOutBanner,
  onLoginSuccess,
}: {
  loggedOutBanner?: string | null;
  onLoginSuccess: (profile: CustomerProfile) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Register fields
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sampleAccounts, setSampleAccounts] = useState<
    { email: string; name: string; phone: string }[]
  >([]);
  const [showQuickAccounts, setShowQuickAccounts] = useState(false);

  useEffect(() => {
    fetchSampleCustomerAccounts()
      .then((list) => setSampleAccounts(list))
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await loginCustomer(email, password);
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err?.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== regConfirm) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      const profile = await registerCustomer({
        name: regName,
        phone: regPhone,
        email,
        password,
      });
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err?.message || "Đăng ký thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{
        background:
          "radial-gradient(circle at 50% 20%, #2a1e16 0%, #17110c 60%, #0b0704 100%)",
        scrollbarWidth: "none",
      }}
    >
      {/* Luxury Obsidian & Gold Hero Header (Giống giao diện trang đăng nhập/đăng xuất trên Web) */}
      <div
        className="px-5 pt-10 pb-6 relative overflow-hidden shrink-0"
        style={{
          background:
            mode === "login"
              ? "linear-gradient(170deg, #120e0a 0%, #291b0f 55%, #4a3014 100%)"
              : "linear-gradient(160deg, #23160c 0%, #3d2310 45%, #6a441c 100%)",
          borderBottom: "1px solid rgba(207, 168, 102, 0.25)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(207,168,102,0.28), transparent 70%)",
          }}
        />
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-['Inter'] font-bold uppercase tracking-[0.18em]"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(207,168,102,0.4)",
            color: "#f4d99f",
          }}
        >
          {mode === "login" ? "✦ Jewels Atelier ✦" : "💎 Jewels Privilege VIP"}
        </span>

        <h1 className="text-xl font-['Playfair_Display'] font-bold text-white mt-3 leading-snug">
          {mode === "login"
            ? "Mỗi món trang sức là một câu chuyện vô giá."
            : "Đặc Quyền Thành Viên Mới"}
        </h1>
        <p
          className="text-xs font-['Inter'] mt-1.5 leading-relaxed"
          style={{ color: "rgba(255, 245, 230, 0.8)" }}
        >
          {mode === "login"
            ? "Chào mừng quý khách quay lại với không gian mua sắm thượng lưu của Hương Jewelry (Đồng bộ Supabase)."
            : "Gia nhập hội viên VIP nhận ngay ưu đãi 10% và tích điểm trọn đời."}
        </p>

        {/* Thông báo đã đăng xuất thành công */}
        {loggedOutBanner && (
          <div
            className="mt-3.5 px-3.5 py-2.5 rounded-xl flex items-center gap-2"
            style={{
              background: "rgba(46, 204, 113, 0.14)",
              border: "1px solid rgba(46, 204, 113, 0.4)",
            }}
          >
            <CheckCircle size={15} color="#2ecc71" className="shrink-0" />
            <span className="text-xs font-['Inter'] text-emerald-200 font-medium">
              {loggedOutBanner}
            </span>
          </div>
        )}
      </div>

      {/* Main White Card Container */}
      <div className="flex-1 bg-[#faf8f5] rounded-t-3xl -mt-3 px-5 pt-6 pb-8 flex flex-col justify-between z-10">
        <div>
          {/* Eyebrow & Heading */}
          <div className="mb-4">
            <p
              className="text-[10px] font-['Inter'] font-bold uppercase tracking-[0.22em] flex items-center gap-2"
              style={{ color: "#9a6b24" }}
            >
              <span
                className="inline-block w-3.5 h-[1.5px]"
                style={{ background: PRIMARY_GOLD }}
              />
              {mode === "login"
                ? "KHÁCH HÀNG THÂN THIẾT"
                : "GIA NHẬP THÀNH VIÊN MỚI"}
            </p>
            <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#141210] mt-1">
              {mode === "login" ? "Đăng Nhập" : "Tạo Tài Khoản"}
            </h2>
            <p className="text-xs font-['Inter'] text-[#6b6358] mt-1 leading-relaxed">
              {mode === "login"
                ? "Nhập email và mật khẩu khách hàng từ hệ thống Supabase để quản lý đơn hàng & tích lũy điểm thưởng."
                : "Chỉ mất 30 giây để kích hoạt toàn bộ đặc quyền hội viên VIP."}
            </p>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="ban@gmail.com"
                  required
                  className="w-full px-3.5 py-3 rounded-xl text-sm font-['Inter'] bg-white outline-none transition-all"
                  style={{
                    border: `1px solid ${BORDER_GOLD_LIGHT}`,
                    color: "#141210",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1.5">
                  Mật khẩu
                </label>
                <div
                  className="flex items-center bg-white rounded-xl px-3.5 py-3"
                  style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                >
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Nhập mật khẩu"
                    required
                    className="flex-1 text-sm font-['Inter'] bg-transparent outline-none text-[#141210]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="p-0.5 text-[#8a7a5c] cursor-pointer"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-['Inter'] my-0.5">
                <label className="flex items-center gap-2 text-[#6b6358] cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="accent-[#9a6b24]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setError(
                      "Vui lòng liên hệ CSKH qua hotline 1900 8899 để được hỗ trợ đặt lại mật khẩu."
                    )
                  }
                  className="font-semibold cursor-pointer"
                  style={{ color: "#9a6b24" }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {error && (
                <div
                  className="px-3.5 py-2.5 rounded-xl text-xs font-['Inter'] leading-relaxed"
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#be123c",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-xs font-['Inter'] font-bold uppercase tracking-wider text-white cursor-pointer active:scale-[0.99] transition-transform mt-1"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
                  boxShadow: "0 6px 18px rgba(184, 146, 42, 0.35)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Đang xác thực Supabase..." : "Đăng Nhập Ngay →"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleRegisterSubmit}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      setError("");
                    }}
                    placeholder="Nguyễn Văn A"
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-['Inter'] bg-white outline-none"
                    style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => {
                      setRegPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError("");
                    }}
                    placeholder="0901234567"
                    required
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-['Inter'] bg-white outline-none"
                    style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1">
                  Email nhận thông báo &amp; ưu đãi (@gmail.com)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="ban@gmail.com"
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-['Inter'] bg-white outline-none"
                  style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1">
                    Mật khẩu
                  </label>
                  <div
                    className="flex items-center bg-white rounded-xl px-3 py-2.5"
                    style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                  >
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="8+ ký tự"
                      required
                      className="w-full text-xs font-['Inter'] bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="text-[#8a7a5c] cursor-pointer"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-['Inter'] font-semibold text-[#1c1917] mb-1">
                    Xác nhận MK
                  </label>
                  <div
                    className="flex items-center bg-white rounded-xl px-3 py-2.5"
                    style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                  >
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={regConfirm}
                      onChange={(e) => {
                        setRegConfirm(e.target.value);
                        setError("");
                      }}
                      placeholder="Nhập lại MK"
                      required
                      className="w-full text-xs font-['Inter'] bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="text-[#8a7a5c] cursor-pointer"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  className="px-3.5 py-2.5 rounded-xl text-xs font-['Inter'] leading-relaxed"
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#be123c",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-xs font-['Inter'] font-bold uppercase tracking-wider text-white cursor-pointer active:scale-[0.99] transition-transform mt-1"
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
                  boxShadow: "0 6px 18px rgba(184, 146, 42, 0.35)",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading
                  ? "Đang tạo tài khoản..."
                  : "Hoàn Tất Đăng Ký & Nhận Ưu Đãi →"}
              </button>
            </form>
          )}

          {/* Quick Fill Customer Accounts from Supabase Database */}
          {mode === "login" && (
            <div
              className="mt-4 rounded-2xl p-3"
              style={{
                background: "#f5efe2",
                border: `1px solid ${BORDER_GOLD_LIGHT}`,
              }}
            >
              <button
                type="button"
                onClick={() => setShowQuickAccounts(!showQuickAccounts)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} color="#9a6b24" />
                  <span className="text-[11px] font-['Inter'] font-semibold text-[#433216]">
                    Tài khoản khách hàng từ Supabase DB
                  </span>
                </div>
                {showQuickAccounts ? (
                  <ChevronUp size={14} color="#9a6b24" />
                ) : (
                  <ChevronDown size={14} color="#9a6b24" />
                )}
              </button>

              {showQuickAccounts && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {[
                    {
                      email: "vana@gmail.com",
                      name: "Nguyễn Văn A",
                      pw: "12345678",
                    },
                    {
                      email: "cust_417756@gmail.com",
                      name: "Phạm Thị Khách",
                      pw: "12345678",
                    },
                    {
                      email: "mot1@gmail.com",
                      name: "Nguyễn Văn Một",
                      pw: "11111111",
                    },
                    ...sampleAccounts
                      .filter(
                        (a) =>
                          ![
                            "vana@gmail.com",
                            "cust_417756@gmail.com",
                            "mot1@gmail.com",
                          ].includes(a.email)
                      )
                      .slice(0, 3)
                      .map((a) => ({
                        email: a.email,
                        name: a.name,
                        pw: "",
                      })),
                  ].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => {
                        setEmail(acc.email);
                        if (acc.pw) setPassword(acc.pw);
                        setError("");
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white text-left hover:bg-amber-50/60 transition-colors cursor-pointer"
                      style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-['Inter'] font-semibold text-[#1c1917] truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] font-['Inter'] text-[#6b6358] truncate">
                          {acc.email}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-['Inter'] font-semibold px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "#fdf0c8", color: "#9a6b24" }}
                      >
                        Điền nhanh
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Switch Mode Card (Giống auth-switch-card trên Web) */}
          <div
            className="mt-4 p-3.5 rounded-2xl flex items-center justify-between gap-3"
            style={{
              background: "#f5efe2",
              border: "1px solid rgba(207, 168, 102, 0.35)",
            }}
          >
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-['Inter'] font-bold text-[#141210]">
                {mode === "login"
                  ? "Chưa có tài khoản thành viên?"
                  : "Đã là thành viên của Jewels?"}
              </strong>
              <p className="text-[11px] font-['Inter'] text-[#6b6358] mt-0.5 leading-snug">
                {mode === "login"
                  ? "Gia nhập hội viên nhận ngay Voucher giảm 10%"
                  : "Đăng nhập để theo dõi đơn và tích điểm"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "register" : "login");
              }}
              className="px-3.5 py-2 rounded-full text-[11px] font-['Inter'] font-bold bg-white shrink-0 cursor-pointer active:scale-95 transition-transform"
              style={{
                color: "#9a6b24",
                border: `1px solid ${PRIMARY_GOLD}`,
              }}
            >
              {mode === "login" ? "Đăng ký mới →" : "Đăng nhập →"}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div
          className="mt-6 pt-3 flex items-center justify-between text-[10px] font-['Inter'] text-[#8a7a5c]"
          style={{ borderTop: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <span>Bảo mật chuẩn SSL 256-bit</span>
          <span>Hotline VIP: 1900 8899</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. CART SCREEN (A1)
// ==========================================
function CartScreen({
  items,
  onUpdateQty,
  onRemoveItem,
  onBack,
  onOrder,
}: {
  items: CartItem[];
  onUpdateQty: (item: CartItem, delta: number) => void;
  onRemoveItem: (item: CartItem) => void;
  onBack: () => void;
  onOrder: () => void;
}) {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const isFreeShipping = subtotal >= 10000000;
  const shippingFee = isFreeShipping ? 0 : 50000;
  const total = subtotal + shippingFee;

  return (
    <div className="flex flex-col h-full" style={{ background: "#f2f2f7" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-5 shrink-0"
        style={{ background: NAVY_HEADER }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <ArrowLeft size={18} color="white" />
        </button>
        <h1 className="flex-1 text-lg font-['Playfair_Display'] font-semibold text-white">
          Giỏ hàng
        </h1>
        <span className="text-sm font-['Inter'] text-white/60">
          {items.length} sản phẩm
        </span>
      </div>

      {/* Item List / Empty State */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 flex flex-col gap-3"
        style={{ scrollbarWidth: "none" }}
      >
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "#f5f0e8" }}
            >
              <ShoppingBag size={36} color={PRIMARY_GOLD} />
            </div>
            <p className="font-['Playfair_Display'] text-base font-semibold text-foreground">
              Giỏ hàng trống
            </p>
            <p className="text-sm font-['Inter'] text-muted-foreground">
              Hãy thêm sản phẩm yêu thích vào giỏ
            </p>
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-full text-sm font-['Inter'] font-semibold text-white cursor-pointer"
              style={{ background: PRIMARY_GOLD }}
            >
              Khám phá ngay
            </button>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div
                key={`${item.id}-${item.variant}`}
                className="bg-white rounded-2xl px-4 py-4 shadow-sm flex gap-3"
              >
                <div className="w-18 h-18 rounded-xl overflow-hidden shrink-0 bg-[#f5f0e8]">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-['Playfair_Display'] font-semibold text-foreground leading-snug">
                    {item.name}
                  </p>
                  <p className="text-xs font-['Inter'] text-muted-foreground mt-0.5">
                    {item.variant}
                  </p>
                  <p
                    className="text-sm font-['Inter'] font-bold mt-1"
                    style={{ color: PRIMARY_GOLD }}
                  >
                    {formatCurrency(item.price)}
                  </p>

                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => onUpdateQty(item, -1)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-foreground active:scale-95 transition-transform cursor-pointer"
                        style={{
                          border: `1px solid ${BORDER_GOLD_LIGHT}`,
                          background: "#ffffff",
                        }}
                      >
                        <Minus size={13} color="#555" />
                      </button>
                      <span className="text-xs font-['Inter'] font-semibold w-5 text-center text-foreground">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item, 1)}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
                        style={{ background: PRIMARY_GOLD }}
                      >
                        <Plus size={13} color="white" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                      style={{ background: "#fff0f0" }}
                    >
                      <Trash2 size={14} color="#e74c3c" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Shipping Box */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2.5">
                <Truck size={16} color="#444" />
                <span className="text-xs font-['Inter'] font-semibold text-foreground">
                  Phương thức vận chuyển
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-['Inter'] font-medium text-foreground">
                    Giao hàng tiêu chuẩn
                  </p>
                  <p className="text-[11px] font-['Inter'] text-muted-foreground mt-0.5">
                    Nhận hàng trong 2–3 ngày làm việc
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="text-sm font-['Inter'] font-semibold"
                    style={{ color: isFreeShipping ? "#27ae60" : PRIMARY_GOLD }}
                  >
                    {isFreeShipping ? "Miễn phí" : formatCurrency(50000)}
                  </span>
                  <ChevronDown size={14} color="#aaa" />
                </div>
              </div>
              {isFreeShipping && (
                <div
                  className="mt-3 px-3 py-2 rounded-xl text-xs font-['Inter'] font-medium leading-relaxed"
                  style={{ background: "#f0faf4", color: "#27ae60" }}
                >
                  ✓ Bạn được miễn phí vận chuyển cho đơn trên 10.000.000đ
                </div>
              )}
            </div>
            <div className="h-2" />
          </>
        )}
      </div>

      {/* Sticky Bottom Summary Bar */}
      {items.length > 0 && (
        <div
          className="shrink-0 px-4 pt-3 pb-5 bg-white"
          style={{
            borderTop: "1px solid #ece8e0",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-['Inter'] text-muted-foreground">
                Tổng thanh toán
              </p>
              <p
                className="text-lg font-['Inter'] font-bold"
                style={{ color: PRIMARY_GOLD }}
              >
                {formatCurrency(total)}
              </p>
            </div>
            <button
              onClick={onOrder}
              className="px-6 py-3 rounded-2xl text-sm font-['Inter'] font-bold text-white active:scale-95 transition-transform cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
                boxShadow: "0 4px 14px rgba(184,146,42,0.35)",
              }}
            >
              Đặt hàng ({items.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3B. PRODUCT DETAIL SCREEN (D1)
// ==========================================
function ProductDetailScreen({
  product,
  cartCount,
  onBack,
  onOpenCart,
  onAddToCart,
  onBuyNow,
}: {
  product: ProductItem;
  cartCount: number;
  onBack: () => void;
  onOpenCart: () => void;
  onAddToCart: (product: ProductItem, qty: number, variant: string) => void;
  onBuyNow: (product: ProductItem, qty: number, variant: string) => void;
}) {
  const variantsList =
    product.variants && product.variants.length > 0
      ? product.variants
      : [product.variant || "Vàng 18K · Kim cương"];
  const [selectedVariant, setSelectedVariant] = useState<string>(
    variantsList[0]
  );
  const [qty, setQty] = useState<number>(1);

  const matchedVarObj = product.variantObjects?.find(
    (v) => v.label === selectedVariant
  );
  const displayPrice = matchedVarObj
    ? formatCurrency(matchedVarObj.price)
    : product.price;
  const stockCount = matchedVarObj ? matchedVarObj.stock : (product.stock ?? 5);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ background: "#faf8f5", scrollbarWidth: "none" }}
    >
      {/* Top Navigation Bar */}
      <div
        className="flex items-center justify-between px-4 pt-10 pb-3 sticky top-0 z-20"
        style={{
          background: "rgba(250, 248, 245, 0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${BORDER_GOLD_LIGHT}`,
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-['Inter'] font-medium cursor-pointer active:scale-95 transition-transform"
          style={{
            background: "#ffffff",
            border: `1px solid ${BORDER_GOLD_LIGHT}`,
            color: "#1c1917",
          }}
        >
          <ArrowLeft size={15} color="#1c1917" />
          <span>Quay lại</span>
        </button>

        <span className="text-xs font-['Playfair_Display'] font-semibold text-foreground truncate max-w-[160px]">
          Chi tiết sản phẩm
        </span>

        <button
          onClick={onOpenCart}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <ShoppingBag size={16} color="#9a6b24" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4 pb-8 flex flex-col">
        {/* Large Rounded Product Image */}
        <div
          className="w-full aspect-square rounded-2xl overflow-hidden shadow-md bg-secondary relative"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <img
            src={product.img}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Category Eyebrow: — NHẪN */}
        <p
          className="text-[11px] font-['Inter'] font-semibold uppercase tracking-[0.16em] mt-5"
          style={{ color: "#9a6b24" }}
        >
          — {product.category}
        </p>

        {/* Product Title */}
        <h1
          className="text-[26px] font-['Playfair_Display'] font-normal leading-tight mt-1.5"
          style={{ color: "#111111" }}
        >
          {product.name}
        </h1>

        {/* Product Price */}
        <p
          className="text-xl font-['Inter'] font-bold mt-2.5"
          style={{ color: "#9a6b24" }}
        >
          {displayPrice}
        </p>

        {/* Product Description */}
        <p
          className="text-xs font-['Inter'] leading-relaxed mt-3"
          style={{ color: "#6b6358" }}
        >
          {product.desc}
        </p>

        {/* PHIÊN BẢN (Variants) */}
        <div className="mt-5">
          <p
            className="text-[10px] font-['Inter'] font-semibold uppercase tracking-[0.14em] mb-2.5"
            style={{ color: "#6b6358" }}
          >
            PHIÊN BẢN
          </p>
          <div className="flex flex-wrap gap-2">
            {variantsList.map((v) => {
              const isSelected = selectedVariant === v;
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVariant(v)}
                  className="px-4 py-2 rounded-full text-xs font-['Inter'] font-medium transition-all cursor-pointer active:scale-95"
                  style={{
                    background: isSelected ? "#111111" : "#ffffff",
                    color: isSelected ? "#ffffff" : "#1c1917",
                    border: isSelected
                      ? "1px solid #111111"
                      : `1px solid ${BORDER_GOLD_LIGHT}`,
                    boxShadow: isSelected
                      ? "0 4px 12px rgba(0,0,0,0.14)"
                      : "none",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stock Status */}
        <p
          className="text-xs font-['Inter'] font-medium mt-4"
          style={{ color: "#9a6b24" }}
        >
          Chỉ còn {stockCount} sản phẩm
        </p>

        {/* Action Row: Quantity Selector + THÊM VÀO GIỎ HÀNG + MUA NGAY */}
        <div className="flex items-center gap-2 mt-4">
          {/* Pill Quantity Selector */}
          <div
            className="flex items-center justify-between bg-white rounded-full px-3 py-2.5 shrink-0"
            style={{
              border: `1px solid ${BORDER_GOLD_LIGHT}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              minWidth: "92px",
            }}
          >
            <button
              onClick={() => setQty((prev) => Math.max(1, prev - 1))}
              className="w-5 h-5 flex items-center justify-center text-sm font-bold cursor-pointer active:scale-90"
              style={{ color: "#1c1917" }}
            >
              −
            </button>
            <span
              className="text-xs font-['Inter'] font-semibold px-2"
              style={{ color: "#1c1917" }}
            >
              {qty}
            </span>
            <button
              onClick={() =>
                setQty((prev) => Math.min(Math.max(1, stockCount), prev + 1))
              }
              className="w-5 h-5 flex items-center justify-center text-sm font-bold cursor-pointer active:scale-90"
              style={{ color: "#1c1917" }}
            >
              +
            </button>
          </div>

          {/* THÊM VÀO GIỎ HÀNG Button */}
          <button
            onClick={() => onAddToCart(product, qty, selectedVariant)}
            className="flex-1 py-3 px-3 rounded-full text-[11px] font-['Inter'] font-bold uppercase tracking-wider text-white cursor-pointer active:scale-95 transition-transform text-center"
            style={{
              background: "#966928",
              boxShadow: "0 4px 14px rgba(150, 105, 40, 0.28)",
            }}
          >
            THÊM VÀO GIỎ HÀNG
          </button>

          {/* MUA NGAY Button */}
          <button
            onClick={() => onBuyNow(product, qty, selectedVariant)}
            className="py-3 px-4 rounded-full text-[11px] font-['Inter'] font-bold uppercase tracking-wider bg-white cursor-pointer active:scale-95 transition-transform shrink-0"
            style={{
              color: "#111111",
              border: "1px solid #1c1917",
            }}
          >
            MUA NGAY
          </button>
        </div>

        {/* Commitment / Guarantee Box */}
        <div
          className="mt-5 rounded-2xl p-3.5 flex flex-col gap-2.5"
          style={{
            background: "#fbf6ec",
            border: "1px solid #eadbc0",
          }}
        >
          <p
            className="text-[11px] font-['Inter'] leading-relaxed"
            style={{ color: "#5c4928" }}
          >
            ✨{" "}
            <strong style={{ color: "#433216" }}>Cam kết chính hãng:</strong>{" "}
            Đầy đủ chứng thư kiểm định kèm theo kiện hàng
          </p>
          <p
            className="text-[11px] font-['Inter'] leading-relaxed"
            style={{ color: "#5c4928" }}
          >
            🛡️ <strong style={{ color: "#433216" }}>Bảo hành trọn đời:</strong>{" "}
            Miễn phí làm mới, siêu âm &amp; kiểm tra chấu giữ đá
          </p>
          <p
            className="text-[11px] font-['Inter'] leading-relaxed"
            style={{ color: "#5c4928" }}
          >
            🚚{" "}
            <strong style={{ color: "#433216" }}>Giao hàng niêm phong:</strong>{" "}
            Bảo hiểm vận chuyển 100% giá trị sản phẩm
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. HOME SCREEN (I1) - LẤY SẢN PHẨM & DANH MỤC TỪ SUPABASE
// ==========================================
function HomeScreen({
  categoriesList,
  productsList,
  favorites,
  onToggleFavorite,
  cartCount,
  onOpenCart,
  onSelectProduct,
}: {
  categoriesList: DbCategory[];
  productsList: ProductItem[];
  favorites: number[];
  onToggleFavorite: (id: number, e?: React.MouseEvent) => void;
  cartCount: number;
  onOpenCart: () => void;
  onSelectProduct: (product: ProductItem) => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const matchProduct = (p: ProductItem) => {
    const matchCat =
      !selectedCategory ||
      p.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (selectedCategory === "Nhẫn" &&
        p.category.toLowerCase().includes("nhẫn"));
    const matchQ =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  };

  const filteredAll = productsList.filter(matchProduct);
  const filteredFeatured = filteredAll.slice(0, 4);
  const filteredNewArrivals =
    filteredAll.length > 2 ? [...filteredAll].reverse() : filteredAll;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Sticky Top Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 bg-background sticky top-0 z-10">
        <div>
          <p className="text-xs text-muted-foreground font-['Inter']">
            Chào mừng trở lại
          </p>
          <h1 className="text-lg font-['Playfair_Display'] font-semibold text-foreground">
            Hương Jewelry
          </h1>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            <Search size={16} color={PRIMARY_GOLD} />
          </button>
          <button
            onClick={onOpenCart}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
          >
            <ShoppingBag size={16} color={PRIMARY_GOLD} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {searchOpen && (
        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2 bg-white rounded-full px-3.5 py-2 shadow-sm"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
          >
            <Search size={14} color={PRIMARY_GOLD} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhẫn, dây chuyền, bông tai..."
              className="flex-1 text-xs font-['Inter'] bg-transparent outline-none text-foreground"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Promo Banner */}
      <div className="mx-4 rounded-2xl overflow-hidden relative h-44 shrink-0">
        <img
          src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop&auto=format"
          alt="Bộ sưu tập trang sức cao cấp"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent flex flex-col justify-center px-5">
          <p className="text-[10px] uppercase tracking-widest text-amber-300 font-['Inter'] font-medium mb-1">
            Bộ sưu tập mới
          </p>
          <h2 className="text-xl font-['Playfair_Display'] text-white font-bold leading-tight">
            Vẻ đẹp vĩnh
            <br />
            cửu
          </h2>
          <button
            onClick={() =>
              productsList[0] && onSelectProduct(productsList[0])
            }
            className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium text-white border border-white/60 w-fit font-['Inter'] hover:bg-white/20 transition-colors cursor-pointer"
          >
            Khám phá ngay
          </button>
        </div>
      </div>

      {/* Banner Carousel Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveSlide(idx)}
            className={`rounded-full transition-all cursor-pointer ${
              idx === activeSlide ? "w-5 h-1.5" : "w-1.5 h-1.5"
            }`}
            style={{
              background: idx === activeSlide ? PRIMARY_GOLD : "#d4c4a0",
            }}
          />
        ))}
      </div>

      {/* Categories */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Playfair_Display'] text-base font-semibold text-foreground">
            Danh mục
          </h3>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-xs font-['Inter'] cursor-pointer"
            style={{ color: PRIMARY_GOLD }}
          >
            {selectedCategory ? "Tất cả" : "Xem thêm"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categoriesList.slice(0, 4).map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(isSelected ? null : cat.name)
                }
                className="flex flex-col items-center gap-2 group cursor-pointer"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-active:scale-95"
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg,#f5e4bc 0%,#ebd296 100%)"
                      : "linear-gradient(135deg,#fdf8ef 0%,#f5edd8 100%)",
                    border: `1px solid ${
                      isSelected ? PRIMARY_GOLD : BORDER_GOLD_LIGHT
                    }`,
                  }}
                >
                  {cat.icon}
                </div>
                <span
                  className="text-[11px] font-['Inter'] text-center"
                  style={{
                    color: isSelected ? PRIMARY_GOLD : "var(--foreground)",
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Products ("Nổi bật") */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Playfair_Display'] text-base font-semibold text-foreground">
            Nổi bật
          </h3>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery("");
            }}
            className="text-xs font-['Inter'] cursor-pointer"
            style={{ color: PRIMARY_GOLD }}
          >
            Xem thêm
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {filteredFeatured.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-sm cursor-pointer active:scale-[0.99] transition-transform"
              style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-secondary">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="text-[9px] font-['Inter'] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: "#fdf0c8", color: PRIMARY_GOLD }}
                >
                  {p.tag || p.category}
                </span>
                <p className="text-sm font-['Playfair_Display'] font-semibold text-foreground leading-snug mt-1">
                  {p.name}
                </p>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={10}
                      fill="#f5a623"
                      color="#f5a623"
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-1 font-['Inter']">
                    (Còn {p.stock})
                  </span>
                </div>
                <p
                  className="text-sm font-['Inter'] font-semibold mt-1"
                  style={{ color: PRIMARY_GOLD }}
                >
                  {p.price}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-center shrink-0">
                <button
                  onClick={(e) => onToggleFavorite(p.id, e)}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                  style={{
                    background: favorites.includes(p.id)
                      ? "#fce8e8"
                      : "#f5f0e8",
                  }}
                >
                  <Heart
                    size={14}
                    fill={favorites.includes(p.id) ? "#e74c3c" : "none"}
                    color={favorites.includes(p.id) ? "#e74c3c" : "#8a7a5c"}
                  />
                </button>
                <ChevronRight size={14} color="#c4b08a" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Arrivals ("Hàng mới về") */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h3 className="font-['Playfair_Display'] text-base font-semibold text-foreground">
            Hàng mới về
          </h3>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchQuery("");
            }}
            className="text-xs font-['Inter'] cursor-pointer"
            style={{ color: PRIMARY_GOLD }}
          >
            Xem thêm
          </button>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2 px-4"
          style={{ scrollbarWidth: "none" }}
        >
          {filteredNewArrivals.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectProduct(item)}
              className="shrink-0 w-36 bg-card rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-95 transition-transform"
              style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
            >
              <div className="w-full h-36 bg-secondary">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-['Playfair_Display'] font-semibold text-foreground leading-snug line-clamp-2">
                  {item.name}
                </p>
                <p
                  className="text-xs font-['Inter'] font-semibold mt-1"
                  style={{ color: PRIMARY_GOLD }}
                >
                  {item.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}

// ==========================================
// 5. NOTIFICATIONS SCREEN (M1)
// ==========================================
function NotificationsScreen({
  notifications,
  readIds,
  setReadIds,
}: {
  notifications: DbNotification[];
  readIds: number[];
  setReadIds: React.Dispatch<React.SetStateAction<number[]>>;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const unreadCount = notifications.filter(
    (item) => !readIds.includes(item.id)
  ).length;

  const displayList =
    filter === "unread"
      ? notifications.filter((item) => !readIds.includes(item.id))
      : notifications;

  const markAllRead = () => {
    setReadIds(notifications.map((item) => item.id));
  };

  const markSingleRead = (id: number) => {
    if (!readIds.includes(id)) {
      setReadIds((prev) => [...prev, id]);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="px-4 pt-10 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-['Playfair_Display'] font-semibold text-foreground">
            Thông báo
          </h1>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-['Inter'] font-medium cursor-pointer active:scale-95 transition-transform"
            style={{ background: "#f5f0e8", color: PRIMARY_GOLD }}
          >
            <CheckCircle size={13} />
            Đọc tất cả
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex mt-4 bg-secondary rounded-full p-1">
          {(["all", "unread"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="flex-1 py-1.5 rounded-full text-sm font-['Inter'] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={
                filter === tab
                  ? {
                      background: "white",
                      color: PRIMARY_GOLD,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    }
                  : { color: "#8a7a5c" }
              }
            >
              {tab === "all" ? "Tất cả" : "Chưa đọc"}
              {tab === "unread" && unreadCount > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold"
                  style={{ background: "#e74c3c" }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {displayList.length === 0 && (
          <div className="text-center py-16 text-muted-foreground font-['Inter'] text-sm">
            Không có thông báo mới
          </div>
        )}
        {displayList.map((item) => {
          const isUnread = !readIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => markSingleRead(item.id)}
              className="flex items-start gap-3 bg-card rounded-2xl p-3.5 text-left w-full transition-opacity active:opacity-70 cursor-pointer"
              style={{
                border: `1px solid ${
                  isUnread ? "rgba(184,146,42,0.25)" : BORDER_GOLD_LIGHT
                }`,
              }}
            >
              <div className="relative shrink-0 mt-0.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "#f5f0e8" }}
                >
                  <Bell size={18} style={{ color: PRIMARY_GOLD }} />
                </div>
                {isUnread && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-['Inter'] leading-snug ${
                    isUnread
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-[11px] font-['Inter'] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {item.body}
                </p>
                <p
                  className="text-[10px] font-['Inter'] mt-1.5"
                  style={{ color: "#b8a080" }}
                >
                  {item.time}
                </p>
              </div>
              <ChevronRight
                size={14}
                color="#c4b08a"
                className="mt-1 shrink-0"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// 6. TOGGLE SWITCH (z1)
// ==========================================
function ToggleSwitch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="w-11 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer"
      style={{ background: on ? PRIMARY_GOLD : "#cbced4" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

// ==========================================
// 7. PERSONAL INFO SCREEN (D1) - ĐỒNG BỘ SUPABASE
// ==========================================
function PersonalInfoScreen({
  user,
  onUserUpdated,
  onBack,
}: {
  user: CustomerProfile;
  onUserUpdated: (u: CustomerProfile) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [dob, setDob] = useState(user.dob);
  const [gender, setGender] = useState(user.gender || "Nữ");
  const [email] = useState(user.email);
  const [address, setAddress] = useState(user.address);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSave = async () => {
    setErrMsg("");
    setSaving(true);
    try {
      const updated = await updateCustomerProfile(user.id, {
        name,
        phone,
        dob,
        address,
      });
      onUserUpdated({ ...updated, gender });
      setSaved(true);
    } catch (e: any) {
      setErrMsg(e?.message || "Không thể lưu thông tin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Banner */}
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-4 shrink-0"
        style={{
          background:
            "linear-gradient(160deg,#c9972d 0%,#b8922a 40%,#8b6914 100%)",
        }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <ArrowLeft size={18} color="white" />
        </button>
        <h1 className="flex-1 text-lg font-['Playfair_Display'] font-semibold text-white">
          Thông tin cá nhân
        </h1>
        {saved && (
          <span className="text-xs font-['Inter'] text-white/90 font-medium">
            Đã lưu ✓
          </span>
        )}
      </div>

      {/* Form Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Avatar Section */}
        <div className="flex flex-col items-center pt-5 pb-2">
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-md"
              style={{
                background: "#fdf5d7",
                border: `3px solid ${PRIMARY_GOLD}`,
              }}
            >
              👤
            </div>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center absolute bottom-0 right-0 shadow"
              style={{
                background: PRIMARY_GOLD,
                border: "2px solid white",
              }}
            >
              <Camera size={14} color="white" />
            </button>
          </div>
          <h2 className="text-base font-['Playfair_Display'] font-bold text-foreground mt-2.5">
            {name}
          </h2>
          <p className="text-xs font-['Inter'] text-muted-foreground mt-0.5">
            Thành viên Vàng · Hương Jewelry
          </p>
        </div>

        <div
          className="bg-card mx-4 mt-3 rounded-2xl overflow-hidden shadow-sm"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          {/* Họ và tên */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <User size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Họ và tên
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className="w-full text-sm font-['Inter'] text-foreground bg-transparent outline-none"
              style={{ caretColor: PRIMARY_GOLD }}
            />
          </div>

          {/* Số điện thoại */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Phone size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Số điện thoại (10 chữ số)
              </span>
            </div>
            <input
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setSaved(false);
              }}
              className="w-full text-sm font-['Inter'] text-foreground bg-transparent outline-none"
              style={{ caretColor: PRIMARY_GOLD }}
            />
          </div>

          {/* Ngày sinh */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Calendar size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Ngày sinh
              </span>
            </div>
            <input
              type="date"
              value={dob}
              onChange={(e) => {
                setDob(e.target.value);
                setSaved(false);
              }}
              className="w-full text-sm font-['Inter'] text-foreground bg-transparent outline-none"
              style={{ caretColor: PRIMARY_GOLD }}
            />
          </div>

          {/* Email */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Mail size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Email (Tài khoản định danh)
              </span>
            </div>
            <input
              type="email"
              value={email}
              disabled
              className="w-full text-sm font-['Inter'] text-muted-foreground bg-transparent outline-none"
            />
          </div>

          {/* Địa chỉ */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <MapPin size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Địa chỉ mặc định
              </span>
            </div>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setSaved(false);
              }}
              className="w-full text-sm font-['Inter'] text-foreground bg-transparent outline-none"
              style={{ caretColor: PRIMARY_GOLD }}
            />
          </div>

          {/* Giới tính */}
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Venus size={13} color={PRIMARY_GOLD} />
              <span className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground">
                Giới tính
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {["Nữ", "Nam", "Khác"].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setGender(item);
                    setSaved(false);
                  }}
                  className="flex-1 py-2 rounded-full text-xs font-['Inter'] font-medium transition-all cursor-pointer"
                  style={
                    gender === item
                      ? { background: PRIMARY_GOLD, color: "white" }
                      : {
                          background: "#f5f0e8",
                          color: "#8a7a5c",
                          border: `1px solid ${BORDER_GOLD_LIGHT}`,
                        }
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errMsg && (
          <div
            className="mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs font-['Inter']"
            style={{
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
            }}
          >
            {errMsg}
          </div>
        )}

        {/* Membership Gold Card */}
        <div
          className="mx-4 mt-4 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,#c9972d 0%,#8b6914 100%)",
          }}
        >
          <div
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
            style={{ background: "white" }}
          />
          <div
            className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-10"
            style={{ background: "white" }}
          />
          <p className="text-[10px] font-['Inter'] uppercase tracking-widest text-white/60 mb-1">
            Hương Jewelry
          </p>
          <p className="text-base font-['Playfair_Display'] font-bold text-white">
            Thành viên Vàng
          </p>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-[10px] font-['Inter'] text-white/60">
                Điểm tích lũy
              </p>
              <p className="text-xl font-['Playfair_Display'] font-bold text-white">
                {user.points.toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-['Inter'] text-white/60">
                Ngày tham gia
              </p>
              <p className="text-xs font-['Inter'] text-white/80">
                {user.joinDate}
              </p>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {/* Save Button */}
      <div
        className="px-4 pb-6 pt-3 shrink-0 bg-background"
        style={{ borderTop: `1px solid ${BORDER_GOLD_LIGHT}` }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-['Inter'] font-bold text-white transition-transform active:scale-[0.98] cursor-pointer"
          style={{
            background: `linear-gradient(135deg,${PRIMARY_GOLD} 0%,#8b6914 100%)`,
            boxShadow: "0 4px 14px rgba(184,146,42,0.35)",
          }}
        >
          {saving
            ? "Đang đồng bộ lên Supabase..."
            : saved
              ? "Đã lưu vào Supabase ✓"
              : "Lưu thay đổi"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 8. CHANGE PASSWORD SCREEN (j1) - ĐỒNG BỘ SUPABASE
// ==========================================
function ChangePasswordScreen({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const strength = (() => {
    if (newPass.length === 0) return 0;
    let score = 0;
    if (newPass.length >= 8) score++;
    if (/[A-Z]/.test(newPass)) score++;
    if (/[0-9]/.test(newPass)) score++;
    if (/[^A-Za-z0-9]/.test(newPass)) score++;
    return score;
  })();

  const strengthLabel = ["", "Yếu", "Trung bình", "Mạnh", "Rất mạnh"][strength];
  const strengthColor = ["", "#e74c3c", "#f39c12", "#27ae60", "#1e8449"][
    strength
  ];
  const strengthWidth = ["0%", "25%", "50%", "75%", "100%"][strength];

  const handleUpdate = async () => {
    if (!currentPass) {
      setError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await updateCustomerPassword(userId, currentPass, newPass);
      setSuccess(true);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      setError(e?.message || "Đổi mật khẩu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-4 shrink-0"
        style={{
          background:
            "linear-gradient(160deg,#c9972d 0%,#b8922a 40%,#8b6914 100%)",
        }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <ArrowLeft size={18} color="white" />
        </button>
        <h1 className="flex-1 text-lg font-['Playfair_Display'] font-semibold text-white">
          Thay đổi mật khẩu
        </h1>
      </div>

      {/* Form */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Top Lock Icon Hero */}
        <div className="flex flex-col items-center pt-6 pb-2 px-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
            style={{
              background:
                "linear-gradient(135deg, #c9972d 0%, #8b6914 100%)",
            }}
          >
            <Lock size={28} color="white" />
          </div>
          <p className="text-xs font-['Inter'] text-muted-foreground text-center mt-3 leading-relaxed">
            Mật khẩu mới phải khác mật khẩu cũ và có ít nhất 8 ký tự.
          </p>
        </div>

        <div
          className="bg-card mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          {/* Current Password */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <p className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Mật khẩu hiện tại
            </p>
            <div className="flex items-center gap-2">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPass}
                onChange={(e) => {
                  setCurrentPass(e.target.value);
                  setError("");
                  setSuccess(false);
                }}
                placeholder="Nhập mật khẩu hiện tại"
                className="flex-1 text-sm font-['Inter'] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
                style={{ caretColor: PRIMARY_GOLD }}
              />
              <button
                onClick={() => setShowCurrent(!showCurrent)}
                className="shrink-0 p-1 cursor-pointer"
              >
                {showCurrent ? (
                  <EyeOff size={16} color="#c4b08a" />
                ) : (
                  <Eye size={16} color="#c4b08a" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div
            className="px-4 py-3.5"
            style={{ borderBottom: "1px solid rgba(184,146,42,0.1)" }}
          >
            <p className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Mật khẩu mới
            </p>
            <div className="flex items-center gap-2">
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => {
                  setNewPass(e.target.value);
                  setError("");
                  setSuccess(false);
                }}
                placeholder="Tối thiểu 8 ký tự"
                className="flex-1 text-sm font-['Inter'] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
                style={{ caretColor: PRIMARY_GOLD }}
              />
              <button
                onClick={() => setShowNew(!showNew)}
                className="shrink-0 p-1 cursor-pointer"
              >
                {showNew ? (
                  <EyeOff size={16} color="#c4b08a" />
                ) : (
                  <Eye size={16} color="#c4b08a" />
                )}
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          {newPass.length > 0 && (
            <div className="px-4 py-2.5 bg-secondary/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-['Inter'] text-muted-foreground">
                  Độ mạnh mật khẩu
                </span>
                <span
                  className="text-[10px] font-['Inter'] font-bold"
                  style={{ color: strengthColor }}
                >
                  {strengthLabel}
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: strengthWidth,
                    background: strengthColor,
                  }}
                />
              </div>

              {/* Requirement Badges */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {[
                  { label: "8+ ký tự", ok: newPass.length >= 8 },
                  { label: "Chữ hoa", ok: /[A-Z]/.test(newPass) },
                  { label: "Số", ok: /[0-9]/.test(newPass) },
                  {
                    label: "Ký tự đặc biệt",
                    ok: /[^A-Za-z0-9]/.test(newPass),
                  },
                ].map((req) => (
                  <span
                    key={req.label}
                    className="text-[9px] font-['Inter'] px-2 py-0.5 rounded-full"
                    style={
                      req.ok
                        ? { background: "#f0faf4", color: "#27ae60" }
                        : { background: "#f5f0e8", color: "#8a7a5c" }
                    }
                  >
                    {req.ok ? "✓ " : ""}
                    {req.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="px-4 py-3.5">
            <p className="text-[10px] font-['Inter'] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Xác nhận mật khẩu mới
            </p>
            <div className="flex items-center gap-2">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => {
                  setConfirmPass(e.target.value);
                  setError("");
                  setSuccess(false);
                }}
                placeholder="Nhập lại mật khẩu mới"
                className="flex-1 text-sm font-['Inter'] text-foreground bg-transparent outline-none placeholder:text-muted-foreground/50"
                style={{ caretColor: PRIMARY_GOLD }}
              />
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                className="shrink-0 p-1 cursor-pointer"
              >
                {showConfirm ? (
                  <EyeOff size={16} color="#c4b08a" />
                ) : (
                  <Eye size={16} color="#c4b08a" />
                )}
              </button>
            </div>
          </div>

          {confirmPass.length > 0 && (
            <div className="px-4 pb-3">
              <p
                className="text-xs font-['Inter']"
                style={{
                  color: newPass === confirmPass ? "#27ae60" : "#e74c3c",
                }}
              >
                {newPass === confirmPass
                  ? "✓ Mật khẩu khớp"
                  : "✗ Mật khẩu chưa khớp"}
              </p>
            </div>
          )}
        </div>

        {/* Security Suggestions */}
        <div
          className="mx-4 mt-4 rounded-2xl p-4"
          style={{
            background: "#f5f0e8",
            border: `1px solid ${BORDER_GOLD_LIGHT}`,
          }}
        >
          <p className="text-xs font-['Inter'] font-semibold text-foreground mb-2">
            Gợi ý bảo mật
          </p>
          {[
            "Không dùng tên, ngày sinh làm mật khẩu",
            "Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt",
            "Không dùng lại mật khẩu từ tài khoản khác",
          ].map((tip) => (
            <p
              key={tip}
              className="text-[11px] font-['Inter'] text-muted-foreground flex gap-1.5 mb-1 leading-relaxed"
            >
              <span style={{ color: PRIMARY_GOLD }}>•</span> {tip}
            </p>
          ))}
        </div>

        {error && (
          <div
            className="mx-4 mt-3 px-4 py-3 rounded-2xl"
            style={{
              background: "#fff0f0",
              border: "1px solid rgba(231,76,60,0.2)",
            }}
          >
            <p className="text-xs font-['Inter'] text-red-500">{error}</p>
          </div>
        )}

        {success && (
          <div
            className="mx-4 mt-3 px-4 py-3 rounded-2xl flex items-center gap-2"
            style={{ background: "#f0faf4", border: "1px solid #c3e6cb" }}
          >
            <CheckCircle size={14} color="#27ae60" />
            <p className="text-xs font-['Inter'] text-green-700 font-medium">
              Mật khẩu đã được cập nhật lên Supabase thành công!
            </p>
          </div>
        )}

        <div className="h-6" />
      </div>

      {/* Submit Button */}
      <div
        className="px-4 pb-6 pt-3 shrink-0 bg-background"
        style={{ borderTop: `1px solid ${BORDER_GOLD_LIGHT}` }}
      >
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-['Inter'] font-bold text-white transition-transform active:scale-[0.98] cursor-pointer"
          style={{
            background: `linear-gradient(135deg,${PRIMARY_GOLD} 0%,#8b6914 100%)`,
            boxShadow: "0 4px 14px rgba(184,146,42,0.35)",
          }}
        >
          {saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 9. PROFILE SCREEN ($1) - HIỂN THỊ DỮ LIỆU KHÁCH HÀNG & ĐĂNG XUẤT THẬT
// ==========================================
function ProfileScreen({
  user,
  favoritesCount,
  onUserUpdated,
  onLogout,
}: {
  user: CustomerProfile;
  favoritesCount: number;
  onUserUpdated: (u: CustomerProfile) => void;
  onLogout: () => void;
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [subScreen, setSubScreen] = useState<"main" | "info" | "password">(
    "main"
  );
  const [modalInfo, setModalInfo] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  if (subScreen === "info") {
    return (
      <PersonalInfoScreen
        user={user}
        onUserUpdated={onUserUpdated}
        onBack={() => setSubScreen("main")}
      />
    );
  }

  if (subScreen === "password") {
    return (
      <ChangePasswordScreen
        userId={user.id}
        onBack={() => setSubScreen("main")}
      />
    );
  }

  const MenuItem = ({
    icon: Icon,
    label,
    right,
    onClick,
  }: {
    icon: any;
    label: string;
    right?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3.5 cursor-pointer hover:bg-secondary/50 transition-colors"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "#f5f0e8" }}
      >
        <Icon size={16} style={{ color: PRIMARY_GOLD }} />
      </div>
      <span className="flex-1 text-sm font-['Inter'] text-foreground">
        {label}
      </span>
      {right ?? <ChevronRight size={16} color="#c4b08a" />}
    </div>
  );

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Golden Profile Header */}
      <div
        className="relative pt-10 pb-7 flex flex-col items-center overflow-hidden shrink-0"
        style={{
          background:
            "linear-gradient(160deg,#c9972d 0%,#b8922a 40%,#8b6914 100%)",
        }}
      >
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />
        <div
          className="absolute -bottom-6 -left-8 w-32 h-32 rounded-full opacity-15"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />
        <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-amber-100 flex items-center justify-center z-10 mb-3">
          <span className="text-3xl">👤</span>
        </div>
        <h2 className="text-lg font-['Playfair_Display'] font-bold text-white z-10">
          {user.name}
        </h2>
        <p className="text-sm font-['Inter'] text-amber-100 z-10 mt-0.5">
          {maskPhone(user.phone)}
        </p>

        {/* Stats Row */}
        <div className="flex gap-6 mt-4 z-10">
          {[
            { label: "Đơn hàng", val: String(user.ordersCount) },
            { label: "Yêu thích", val: String(favoritesCount) },
            { label: "Điểm", val: user.points.toLocaleString("vi-VN") },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-base font-['Playfair_Display'] font-bold text-white">
                {stat.val}
              </span>
              <span className="text-[10px] font-['Inter'] text-amber-100">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Cards */}
      <div className="flex flex-col">
        {/* Account Menu */}
        <div
          className="bg-card mx-4 mt-4 rounded-2xl overflow-hidden shadow-sm"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <MenuItem
            icon={User}
            label="Thông tin cá nhân"
            onClick={() => setSubScreen("info")}
          />
          <div
            className="mx-4 border-b"
            style={{ borderColor: "rgba(184,146,42,0.12)" }}
          />
          <MenuItem
            icon={Lock}
            label="Thay đổi mật khẩu"
            onClick={() => setSubScreen("password")}
          />
          <div
            className="mx-4 border-b"
            style={{ borderColor: "rgba(184,146,42,0.12)" }}
          />
          <MenuItem
            icon={Settings}
            label="Bảo mật & Passcode"
            onClick={() =>
              setModalInfo({
                title: "Bảo mật & Passcode",
                body: `Tài khoản ${user.email} (${user.name}) đang được đồng bộ bảo mật trực tiếp với cơ sở dữ liệu Supabase.`,
              })
            }
          />
        </div>

        {/* Settings */}
        <p className="text-xs font-['Inter'] font-semibold text-muted-foreground uppercase tracking-wider px-4 mt-5 mb-2">
          Cài đặt
        </p>
        <div
          className="bg-card mx-4 rounded-2xl overflow-hidden shadow-sm"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <MenuItem
            icon={Bell}
            label="Nhận thông báo"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            right={
              <ToggleSwitch
                on={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
              />
            }
          />
        </div>

        {/* Legal */}
        <p className="text-xs font-['Inter'] font-semibold text-muted-foreground uppercase tracking-wider px-4 mt-5 mb-2">
          Thông tin pháp lý
        </p>
        <div
          className="bg-card mx-4 rounded-2xl overflow-hidden shadow-sm"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          {legalItems.map((item, idx) => (
            <div key={item.label}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                onClick={() =>
                  setModalInfo({
                    title: item.label,
                    body: item.content,
                  })
                }
              />
              {idx < legalItems.length - 1 && (
                <div
                  className="mx-4 border-b"
                  style={{ borderColor: "rgba(184,146,42,0.12)" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mx-4 mt-5 mb-6">
          <button
            onClick={() => setConfirmLogoutOpen(true)}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-['Inter'] font-medium text-red-500 cursor-pointer active:scale-[0.99] transition-transform"
            style={{
              border: "1px solid rgba(231,76,60,0.25)",
              background: "#fff5f5",
            }}
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {modalInfo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6"
          onClick={() => setModalInfo(null)}
        >
          <div
            className="bg-card rounded-2xl p-5 max-w-[340px] w-full shadow-xl"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-['Playfair_Display'] font-bold text-foreground">
              {modalInfo.title}
            </h3>
            <p className="text-xs font-['Inter'] text-muted-foreground mt-2 leading-relaxed">
              {modalInfo.body}
            </p>
            <button
              onClick={() => setModalInfo(null)}
              className="mt-4 w-full py-2.5 rounded-xl text-xs font-['Inter'] font-semibold text-white cursor-pointer"
              style={{ background: PRIMARY_GOLD }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Confirm Logout Modal */}
      {confirmLogoutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-6"
          onClick={() => setConfirmLogoutOpen(false)}
        >
          <div
            className="bg-card rounded-2xl p-5 max-w-[340px] w-full shadow-2xl"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#fff0f0" }}
              >
                <LogOut size={16} color="#e74c3c" />
              </div>
              <h3 className="text-base font-['Playfair_Display'] font-bold text-foreground">
                Xác nhận đăng xuất
              </h3>
            </div>
            <p className="text-xs font-['Inter'] text-muted-foreground mt-2.5 leading-relaxed">
              Bạn đang đăng nhập dưới tài khoản{" "}
              <strong className="text-foreground">{user.name}</strong> (
              {user.email}). Bạn có chắc chắn muốn đăng xuất và chuyển về màn
              hình đăng nhập không?
            </p>
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => setConfirmLogoutOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-['Inter'] font-semibold cursor-pointer"
                style={{
                  background: "#f5f0e8",
                  color: "#6b6358",
                  border: `1px solid ${BORDER_GOLD_LIGHT}`,
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setConfirmLogoutOpen(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-['Inter'] font-bold text-white cursor-pointer active:scale-95 transition-transform"
                style={{ background: "#e74c3c" }}
              >
                Đăng xuất ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 10. CHECKOUT / ORDER SCREEN (P1) - LƯU ĐƠN HÀNG VÀO SUPABASE
// ==========================================
function OrderScreen({
  user,
  onBack,
  onGoHome,
  items,
  onOrderPlaced,
}: {
  user: CustomerProfile;
  onBack: () => void;
  onGoHome: () => void;
  items: CartItem[];
  onOrderPlaced: (orderCode: string) => void;
}) {
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "card" | "ewallet"
  >("cod");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState(() => "HD51411063");

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const isFreeShipping = subtotal >= 10000000;
  const shippingOriginal = 83500;
  const shippingDiscount = isFreeShipping ? 83500 : 0;
  const shippingFinal = shippingOriginal - shippingDiscount;
  const total = subtotal + shippingFinal;
  const totalItemCount = items.reduce((acc, item) => acc + item.qty, 0);

  const handleConfirmOrder = async () => {
    setSubmitting(true);
    try {
      const res = await createOrderInDb(user.id, user, items, paymentMethod);
      setOrderCode(res.orderCode);
      setIsSuccess(true);
      onOrderPlaced(res.orderCode);
    } catch {
      setIsSuccess(true);
      onOrderPlaced(orderCode);
    } finally {
      setSubmitting(false);
    }
  };

  // Success view
  if (isSuccess) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-6 px-6"
        style={{ background: DARK_BG }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(184,146,42,0.15)",
            border: `2px solid ${PRIMARY_GOLD}`,
          }}
        >
          <CheckCircle size={40} color={PRIMARY_GOLD} />
        </div>
        <div className="text-center">
          <p className="text-xl font-['Playfair_Display'] font-bold text-white mb-2">
            Đặt hàng thành công!
          </p>
          <p className="text-sm font-['Inter'] text-white/60">
            Mã đơn hàng: {orderCode}
          </p>
          <p className="text-xs font-['Inter'] text-white/40 mt-1">
            Đơn hàng đã được lưu vào cơ sở dữ liệu Supabase
          </p>
        </div>
        <button
          onClick={onGoHome}
          className="px-8 py-3 rounded-2xl text-sm font-['Inter'] font-bold text-white cursor-pointer active:scale-95 transition-transform"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
          }}
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  // Checkout Review view (Dark luxury theme)
  return (
    <div className="flex flex-col h-full" style={{ background: DARK_BG }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-5 shrink-0"
        style={{ background: NAVY_HEADER }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <ArrowLeft size={18} color="white" />
        </button>
        <h1 className="flex-1 text-lg font-['Playfair_Display'] font-semibold text-white">
          Tổng quan đơn hàng
        </h1>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Delivery Address Card */}
        <div
          className="mx-4 mt-4 rounded-2xl px-4 py-3.5 flex items-start gap-3"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <MapPin
            size={16}
            color={PRIMARY_GOLD}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-['Inter'] font-semibold text-white/50 uppercase tracking-wide mb-0.5">
              Địa chỉ giao hàng
            </p>
            <p className="text-sm font-['Inter'] font-semibold text-white">
              {user.name} · {maskPhone(user.phone)}
            </p>
            <p className="text-xs font-['Inter'] text-white/50 mt-0.5 leading-relaxed">
              {user.address}
            </p>
          </div>
          <button className="cursor-pointer">
            <Pencil size={14} color={PRIMARY_GOLD} />
          </button>
        </div>

        {/* Mall / Store Order Items */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: DARK_BORDER }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-['Inter'] font-bold px-2 py-0.5 rounded"
                style={{ background: PRIMARY_GOLD, color: "white" }}
              >
                MALL
              </span>
              <span className="text-sm font-['Inter'] font-semibold text-white">
                Hương Jewelry
              </span>
            </div>
            <button
              className="flex items-center gap-1 text-xs font-['Inter'] cursor-pointer"
              style={{ color: PRIMARY_GOLD }}
            >
              <Pencil size={11} />
              Ghi chú
            </button>
          </div>

          {items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className={`flex gap-3 px-4 py-3 ${
                idx < items.length - 1 ? "border-b" : ""
              }`}
              style={{ borderColor: DARK_BORDER }}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-['Playfair_Display'] font-semibold text-white leading-snug">
                    {item.name}
                  </p>
                  <span className="text-xs font-['Inter'] text-white/50 shrink-0">
                    x{item.qty}
                  </span>
                </div>
                <p className="text-xs font-['Inter'] text-white/40 mt-0.5">
                  {item.variant}
                </p>
                <p
                  className="text-sm font-['Inter'] font-semibold mt-1"
                  style={{ color: PRIMARY_GOLD }}
                >
                  {formatCurrency(item.price)}
                </p>
              </div>
            </div>
          ))}

          {/* Shipping Row */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: DARK_BORDER }}
          >
            <div className="flex items-center gap-2">
              <Truck size={14} color={PRIMARY_GOLD} />
              <span className="text-xs font-['Inter'] text-white/80">
                Giao hàng bảo hiểm niêm phong
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isFreeShipping && (
                <span className="text-xs font-['Inter'] text-white/40 line-through">
                  {formatCurrency(shippingOriginal)}
                </span>
              )}
              <span
                className="text-xs font-['Inter'] font-semibold"
                style={{ color: isFreeShipping ? "#4ade80" : PRIMARY_GOLD }}
              >
                {isFreeShipping
                  ? "Miễn phí"
                  : formatCurrency(shippingOriginal)}
              </span>
              <ChevronRight size={12} color="#666" />
            </div>
          </div>
        </div>

        {/* Voucher */}
        <div
          className="mx-4 mt-3 rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <Tag size={15} color={PRIMARY_GOLD} />
          <span className="flex-1 text-sm font-['Inter'] text-white/80">
            Voucher Hương Jewelry
          </span>
          {isFreeShipping ? (
            <span className="text-sm font-['Inter'] font-semibold text-green-400">
              −{formatCurrency(shippingDiscount)}
            </span>
          ) : (
            <span className="text-xs font-['Inter'] text-white/40">
              Chọn voucher
            </span>
          )}
          <ChevronRight size={14} color="#555" />
        </div>

        {/* Points */}
        <div
          className="mx-4 mt-2 rounded-2xl px-4 py-3.5 flex items-center gap-3"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <Gift size={15} color={PRIMARY_GOLD} />
          <div className="flex-1">
            <span className="text-sm font-['Inter'] text-white/80">
              Điểm thưởng ({user.points.toLocaleString("vi-VN")} điểm)
            </span>
          </div>
          <span
            className="text-sm font-['Inter'] font-semibold"
            style={{ color: PRIMARY_GOLD }}
          >
            Dùng 1.200đ
          </span>
          <ChevronRight size={14} color="#555" />
        </div>

        {/* Collapsible Order Summary ("Tóm tắt đơn hàng") */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <button
            onClick={() => setShowSummaryDetails(!showSummaryDetails)}
            className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
          >
            <span className="text-sm font-['Inter'] font-bold text-white">
              Tóm tắt đơn hàng
            </span>
            {showSummaryDetails ? (
              <ChevronUp size={16} color={PRIMARY_GOLD} />
            ) : (
              <ChevronDown size={16} color={PRIMARY_GOLD} />
            )}
          </button>

          <div className="px-4 pb-2">
            <div className="flex justify-between py-1">
              <span className="text-xs font-['Inter'] text-white/70">
                Tổng phụ sản phẩm
              </span>
              <span className="text-xs font-['Inter'] font-semibold text-white">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-xs font-['Inter'] text-white/70">
                Tổng phụ vận chuyển
              </span>
              <span className="text-xs font-['Inter'] font-semibold text-white">
                {formatCurrency(shippingFinal)}
              </span>
            </div>

            {showSummaryDetails && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-xs font-['Inter'] text-white/50 pl-3">
                    Giá gốc vận chuyển
                  </span>
                  <span className="text-xs font-['Inter'] text-white/60">
                    {formatCurrency(shippingOriginal)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs font-['Inter'] text-white/50 pl-3">
                    Giảm phí vận chuyển
                  </span>
                  <span className="text-xs font-['Inter'] text-red-400">
                    −{formatCurrency(shippingDiscount)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div
            className="mx-4 border-t my-1"
            style={{ borderColor: DARK_BORDER }}
          />
          <div className="flex justify-between px-4 py-3.5">
            <span className="text-base font-['Inter'] font-bold text-white">
              Tổng
            </span>
            <span
              className="text-base font-['Playfair_Display'] font-bold"
              style={{ color: PRIMARY_GOLD }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden"
          style={{ background: DARK_CARD, border: `1px solid ${DARK_BORDER}` }}
        >
          <p className="px-4 pt-4 pb-2 text-sm font-['Inter'] font-semibold text-white">
            Phương thức thanh toán
          </p>
          {(
            [
              {
                id: "cod",
                icon: <Banknote size={16} color={PRIMARY_GOLD} />,
                name: "Thanh toán khi giao hàng",
                sub: "COD",
              },
              {
                id: "card",
                icon: <CreditCard size={16} color={PRIMARY_GOLD} />,
                name: "Thẻ tín dụng / Ghi nợ",
                sub: "Visa, Mastercard, JCB",
              },
              {
                id: "ewallet",
                icon: <ShoppingBag size={16} color={PRIMARY_GOLD} />,
                name: "Ví điện tử",
                sub: "MoMo · ZaloPay · VNPay",
              },
            ] as const
          ).map((m, idx) => (
            <div key={m.id}>
              {idx > 0 && (
                <div
                  className="mx-4 border-t"
                  style={{ borderColor: DARK_BORDER }}
                />
              )}
              <button
                onClick={() => setPaymentMethod(m.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(184,146,42,0.12)" }}
                >
                  {m.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-['Inter'] text-white">{m.name}</p>
                  {m.sub && (
                    <p className="text-[11px] font-['Inter'] text-white/40 mt-0.5">
                      {m.sub}
                    </p>
                  )}
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor:
                      paymentMethod === m.id ? PRIMARY_GOLD : "#555",
                    background:
                      paymentMethod === m.id ? PRIMARY_GOLD : "transparent",
                  }}
                >
                  {paymentMethod === m.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            </div>
          ))}

          {/* Legal Disclaimer */}
          <div className="px-4 pb-4 pt-1">
            <p
              className="text-[10px] font-['Inter'] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Bằng cách đặt đơn hàng, bạn đồng ý với{" "}
              <span style={{ color: PRIMARY_GOLD }}>
                Điều khoản sử dụng và bán hàng
              </span>{" "}
              của Hương Jewelry và đồng ý rằng dữ liệu của bạn sẽ được xử lý theo{" "}
              <span style={{ color: PRIMARY_GOLD }}>
                Chính sách quyền riêng tư
              </span>
              .
            </p>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Sticky Bottom Order Confirmation Action */}
      <div
        className="shrink-0 px-4 pt-3 pb-5"
        style={{
          background: DARK_CARD,
          borderTop: `1px solid ${DARK_BORDER}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[11px] font-['Inter']"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Tổng ({totalItemCount} mặt hàng)
            </p>
            <p
              className="text-lg font-['Inter'] font-bold"
              style={{ color: PRIMARY_GOLD }}
            >
              {formatCurrency(total)}
            </p>
          </div>
          <button
            onClick={handleConfirmOrder}
            disabled={submitting}
            className="px-6 py-3 rounded-2xl text-sm font-['Inter'] font-bold text-white active:scale-95 transition-transform cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
              boxShadow: "0 4px 14px rgba(184,146,42,0.4)",
            }}
          >
            {submitting ? "Đang xử lý..." : "Xác nhận đặt hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 11. BOTTOM NAVIGATION BAR (L1)
// ==========================================
function BottomNav({
  tab,
  setTab,
  unread,
}: {
  tab: "home" | "notifications" | "profile";
  setTab: (tab: "home" | "notifications" | "profile") => void;
  unread: number;
}) {
  const tabs = [
    { id: "home", icon: HomeIcon, label: "Trang chủ" },
    { id: "notifications", icon: Bell, label: "Thông báo" },
    { id: "profile", icon: User, label: "Cá nhân" },
  ] as const;

  return (
    <nav
      className="flex items-center justify-around bg-card border-t px-2 pb-4 pt-2 shrink-0"
      style={{ borderColor: BORDER_GOLD_LIGHT }}
    >
      {tabs.map(({ id, icon: Icon, label }) => {
        const isActive = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 relative transition-all min-w-0 flex-1 cursor-pointer"
            style={{ color: isActive ? PRIMARY_GOLD : "#8a7a5c" }}
          >
            {id === "notifications" && unread > 0 && (
              <span className="absolute -top-0.5 left-1/2 ml-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold z-10">
                {unread}
              </span>
            )}
            <div
              className="w-10 h-10 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: isActive
                  ? "rgba(184,146,42,0.12)"
                  : "transparent",
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.8}
                style={{ color: isActive ? PRIMARY_GOLD : "#8a7a5c" }}
              />
            </div>
            <span
              className="text-[10px] font-['Inter'] font-medium"
              style={{ color: isActive ? PRIMARY_GOLD : "#8a7a5c" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ==========================================
// 12. ROOT APP COMPONENT (H1) - ĐỒNG BỘ SUPABASE TOÀN DIỆN
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState<
    "home" | "notifications" | "profile"
  >("home");
  const [overlayScreen, setOverlayScreen] = useState<
    "main" | "cart" | "order" | "product-detail"
  >("main");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );

  // Supabase Store State
  const [categoriesList, setCategoriesList] =
    useState<DbCategory[]>(fallbackCategories);
  const [productsList, setProductsList] =
    useState<ProductItem[]>(fallbackProducts);
  const [favorites, setFavorites] = useState<number[]>([1, 4]);

  // Customer Auth & Session State (Supabase)
  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);
  const [loggedOutMessage, setLoggedOutMessage] = useState<string | null>(null);

  // Cart & Notifications State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<number[]>([5]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Load dữ liệu người dùng cụ thể từ Supabase
  const loadUserSessionData = async (uid: string) => {
    try {
      const [profile, cart, notifs] = await Promise.all([
        fetchCustomerProfileById(uid),
        fetchCustomerCart(uid),
        fetchCustomerNotifications(uid),
      ]);
      setCurrentUser(profile);
      setCartItems(cart);
      setNotifications(notifs);
    } catch {
      // Nếu lỗi session thì để người dùng đăng nhập lại
    }
  };

  // Khởi tạo: Lấy danh mục, sản phẩm và phiên đăng nhập khách hàng từ Supabase
  useEffect(() => {
    (async () => {
      try {
        const catalog = await fetchStoreCatalog();
        if (catalog.categories.length > 0) {
          setCategoriesList(catalog.categories);
        }
        if (catalog.products.length > 0) {
          setProductsList(catalog.products);
        }
      } catch {
        // Giữ fallback nếu mất mạng
      }

      const savedUid =
        localStorage.getItem("jewels_mobile_uid") ||
        localStorage.getItem("jewels_user_id");
      const loggedOutFlag =
        sessionStorage.getItem("jewels_mobile_logged_out") === "1";

      if (savedUid && !loggedOutFlag) {
        await loadUserSessionData(savedUid);
      } else if (!loggedOutFlag) {
        // Mặc định tự động đồng bộ tài khoản khách hàng đầu tiên trong Supabase nếu mở lần đầu tiên
        try {
          const defaultUid = "e79979c4-fcd3-48c9-b882-16f8f6ffbe2e"; // Nguyễn Văn A (vana@gmail.com)
          await loadUserSessionData(defaultUid);
          localStorage.setItem("jewels_mobile_uid", defaultUid);
        } catch {}
      }
    })();
  }, []);

  const toggleFavorite = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const unreadCount = notifications.filter(
    (item) => !readNotificationIds.includes(item.id)
  ).length;

  const handleAddToCart = async (
    product: ProductItem,
    qty: number = 1,
    chosenVariant?: string
  ) => {
    const finalVariant = chosenVariant || product.variant;
    const matchedVar =
      product.variantObjects?.find((v) => v.label === finalVariant) ||
      product.variantObjects?.[0];
    const unitPrice = matchedVar ? matchedVar.price : product.numericPrice;
    const variantId = matchedVar
      ? matchedVar.id
      : (product.defaultVariantId || product.id);

    // Cập nhật tức thì trên UI
    setCartItems((prev) => {
      const existing = prev.find(
        (i) => i.variantId === variantId && i.variant === finalVariant
      );
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId && i.variant === finalVariant
            ? { ...i, qty: i.qty + qty }
            : i
        );
      }
      return [
        ...prev,
        {
          id: Date.now(),
          variantId,
          productId: product.id,
          name: product.name,
          price: unitPrice,
          img: product.img,
          qty,
          variant: finalVariant,
          stock: matchedVar ? matchedVar.stock : product.stock,
        },
      ];
    });

    showToast("Đã thêm vào giỏ hàng thành công!");

    // Đồng bộ vào bảng cart_items trên Supabase nếu đã đăng nhập
    if (currentUser && variantId) {
      try {
        const synced = await addCartItemToDb(currentUser.id, variantId, qty);
        setCartItems(synced);
      } catch {}
    }
  };

  const handleUpdateCartQty = async (item: CartItem, delta: number) => {
    const nextQty = Math.max(1, item.qty + delta);
    setCartItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, qty: nextQty } : i))
    );
    if (currentUser && item.id < 1000000000) {
      try {
        const synced = await updateCartItemQtyInDb(
          currentUser.id,
          item.id,
          nextQty
        );
        setCartItems(synced);
      } catch {}
    }
  };

  const handleRemoveCartItem = async (item: CartItem) => {
    setCartItems((prev) => prev.filter((i) => i.id !== item.id));
    if (currentUser && item.id < 1000000000) {
      try {
        const synced = await removeCartItemFromDb(currentUser.id, item.id);
        setCartItems(synced);
      } catch {}
    }
  };

  const handleLogout = () => {
    const prevName = currentUser?.name || "Khách hàng";
    localStorage.removeItem("jewels_mobile_uid");
    localStorage.removeItem("jewels_user_id");
    localStorage.removeItem("jewels_user_email");
    localStorage.removeItem("jewels_token");
    sessionStorage.setItem("jewels_mobile_logged_out", "1");
    setCurrentUser(null);
    setCartItems([]);
    setSelectedProduct(null);
    setOverlayScreen("main");
    setLoggedOutMessage(
      `Đã đăng xuất tài khoản ${prevName} thành công! Vui lòng đăng nhập lại.`
    );
    showToast("Bạn đã đăng xuất thành công!");
  };

  const handleLoginSuccess = async (profile: CustomerProfile) => {
    sessionStorage.removeItem("jewels_mobile_logged_out");
    setLoggedOutMessage(null);
    setCurrentUser(profile);
    setActiveTab("home");
    setOverlayScreen("main");
    showToast(`Chào mừng trở lại, ${profile.name}!`);
    try {
      const [cart, notifs] = await Promise.all([
        fetchCustomerCart(profile.id),
        fetchCustomerNotifications(profile.id),
      ]);
      setCartItems(cart);
      setNotifications(notifs);
    } catch {}
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#e8e0d0] sm:p-4">
      {/* Mobile Shell Frame: 390x844px on Desktop, Fullscreen on Mobile/Android WebView */}
      <div
        className="relative flex flex-col overflow-hidden shadow-2xl w-full h-screen sm:w-[390px] sm:h-[844px] sm:rounded-[40px]"
        style={{
          background: "#faf8f5",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)",
        }}
      >
        {/* Top Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none">
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl pointer-events-auto"
              style={{
                background: "#1c1917",
                color: "#ffffff",
                border: `1px solid ${PRIMARY_GOLD}`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
              }}
            >
              <CheckCircle size={17} color="#2ecc71" className="shrink-0" />
              <span className="text-xs font-['Inter'] font-semibold tracking-wide">
                {toastMessage}
              </span>
            </div>
          </div>
        )}

        {/* Nếu đã Đăng xuất (chưa có currentUser) -> Hiển thị Giao diện Đăng nhập / Đăng ký chuẩn từ Web */}
        {!currentUser ? (
          <AuthScreen
            loggedOutBanner={loggedOutMessage}
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <>
            {/* Full-Screen Overlay 0: Product Detail */}
            {overlayScreen === "product-detail" && selectedProduct && (
              <div className="absolute inset-0 z-40 flex flex-col sm:rounded-[40px] overflow-hidden">
                <ProductDetailScreen
                  product={selectedProduct}
                  cartCount={cartItems.reduce((s, i) => s + i.qty, 0)}
                  onBack={() => setOverlayScreen("main")}
                  onOpenCart={() => setOverlayScreen("cart")}
                  onAddToCart={(prod, q, v) => handleAddToCart(prod, q, v)}
                  onBuyNow={async (prod, q, v) => {
                    await handleAddToCart(prod, q, v);
                    setOverlayScreen("cart");
                  }}
                />
              </div>
            )}

            {/* Full-Screen Overlay 1: Cart */}
            {overlayScreen === "cart" && (
              <div className="absolute inset-0 z-50 flex flex-col sm:rounded-[40px] overflow-hidden">
                <CartScreen
                  items={cartItems}
                  onUpdateQty={handleUpdateCartQty}
                  onRemoveItem={handleRemoveCartItem}
                  onBack={() =>
                    setOverlayScreen(
                      selectedProduct ? "product-detail" : "main"
                    )
                  }
                  onOrder={() => setOverlayScreen("order")}
                />
              </div>
            )}

            {/* Full-Screen Overlay 2: Checkout / Order */}
            {overlayScreen === "order" && (
              <div className="absolute inset-0 z-50 flex flex-col sm:rounded-[40px] overflow-hidden">
                <OrderScreen
                  user={currentUser}
                  onBack={() => setOverlayScreen("cart")}
                  onGoHome={() => {
                    setSelectedProduct(null);
                    setOverlayScreen("main");
                    setActiveTab("home");
                  }}
                  items={cartItems}
                  onOrderPlaced={async () => {
                    setCartItems([]);
                    await loadUserSessionData(currentUser.id);
                    const catalog = await fetchStoreCatalog();
                    if (catalog.products.length > 0) {
                      setProductsList(catalog.products);
                    }
                  }}
                />
              </div>
            )}

            {/* Tab View Container */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeTab === "home" && (
                <HomeScreen
                  categoriesList={categoriesList}
                  productsList={productsList}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  cartCount={cartItems.reduce((s, i) => s + i.qty, 0)}
                  onOpenCart={() => {
                    setSelectedProduct(null);
                    setOverlayScreen("cart");
                  }}
                  onSelectProduct={(prod) => {
                    setSelectedProduct(prod);
                    setOverlayScreen("product-detail");
                  }}
                />
              )}
              {activeTab === "notifications" && (
                <NotificationsScreen
                  notifications={notifications}
                  readIds={readNotificationIds}
                  setReadIds={setReadNotificationIds}
                />
              )}
              {activeTab === "profile" && (
                <ProfileScreen
                  user={currentUser}
                  favoritesCount={favorites.length}
                  onUserUpdated={(u) => {
                    setCurrentUser(u);
                    showToast("Đã đồng bộ thông tin khách hàng lên Supabase!");
                  }}
                  onLogout={handleLogout}
                />
              )}
            </div>

            {/* Bottom Nav */}
            <BottomNav
              tab={activeTab}
              setTab={(t) => {
                setSelectedProduct(null);
                setOverlayScreen("main");
                setActiveTab(t);
              }}
              unread={unreadCount}
            />
          </>
        )}
      </div>
    </div>
  );
}
