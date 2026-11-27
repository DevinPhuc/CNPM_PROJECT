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
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  User,
  Venus,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import {
  addCartItemToDb,
  appStorage,
  cancelCustomerOrderInDb,
  createOrderInDb,
  CustomerProfile,
  DbCartItem,
  DbCategory,
  DbNotification,
  DbOrder,
  DbProduct,
  DbVoucher,
  fetchActiveVouchers,
  fetchCustomerCart,
  fetchCustomerNotifications,
  fetchCustomerOrders,
  fetchCustomerProfileById,
  fetchSampleCustomerAccounts,
  fetchStoreCatalog,
  getSavedReadNotificationIds,
  loginCustomer,
  registerCustomer,
  releaseVoucherInDb,
  removeCartItemFromDb,
  reserveVoucherInDb,
  saveReadNotificationIds,
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
  { id: 1, icon: "💍", name: "Nhẫn", parentCatId: null },
  { id: 5, icon: "💍", name: "Nhẫn cưới", parentCatId: 1 },
  { id: 2, icon: "📿", name: "Dây chuyền", parentCatId: null },
  { id: 3, icon: "💎", name: "Bông tai", parentCatId: null },
  { id: 4, icon: "✨", name: "Lắc tay", parentCatId: null },
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
    id: 3,
    name: "Dây Chuyền Bạc 925 Mặt Trái Tim",
    price: "1.450.000đ",
    numericPrice: 1450000,
    tag: "BÁN CHẠY NHẤT",
    category: "Dây chuyền",
    catId: 2,
    variant: "Bạc 925 · Đá CZ",
    variants: ["Bạc 925 · Đá CZ"],
    variantObjects: [
      {
        id: 4,
        label: "Bạc 925 · Đá CZ",
        material: "Bạc 925",
        gemstone: "Đá CZ",
        size: 42,
        price: 1450000,
        stock: 40,
      },
    ],
    defaultVariantId: 4,
    stock: 40,
    img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=600&fit=crop&auto=format",
    desc: "Dây chuyền bạc Ý 925 mặt trái tim đính đá CZ lấp lánh.",
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
  {
    id: 5,
    name: "Lắc Tay Vàng 24K Hoa Mai",
    price: "18.900.000đ",
    numericPrice: 18900000,
    tag: "CAO CẤP",
    category: "Lắc tay",
    catId: 4,
    variant: "Vàng 24K · Chế tác thủ công",
    variants: ["Vàng 24K · Chế tác thủ công"],
    variantObjects: [
      {
        id: 6,
        label: "Vàng 24K · Chế tác thủ công",
        material: "Vàng 24K",
        gemstone: null,
        size: 16,
        price: 18900000,
        stock: 11,
      },
    ],
    defaultVariantId: 6,
    stock: 11,
    img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&h=600&fit=crop&auto=format",
    desc: "Lắc tay vàng 24K họa tiết hoa mai phú quý sang trọng.",
  },
];

const legalItems = [
  {
    icon: FileText,
    label: "Điều khoản dịch vụ",
    content:
      "Chào mừng quý khách đến với SaiGon Jewelry. Mọi sản phẩm trang sức đều đi kèm giấy kiểm định chất lượng kim cương và vàng 18K chính hãng, hỗ trợ bảo hành làm sáng trọn đời.",
  },
  {
    icon: Shield,
    label: "Chính sách bảo mật",
    content:
      "Thông tin cá nhân, số điện thoại và lịch sử giao dịch của quý khách tại SaiGon Jewelry được mã hóa và bảo mật tuyệt đối trên cơ sở dữ liệu Supabase chuẩn an toàn dữ liệu.",
  },
  {
    icon: FileText,
    label: "Quy định sử dụng",
    content:
      "Khách hàng mua sắm tại SaiGon Jewelry được hưởng ưu đãi miễn phí vận chuyển cho đơn từ 10.000.000đ và hỗ trợ đổi trả trong vòng 7 ngày.",
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
            ? "Chào mừng quý khách quay lại với không gian mua sắm thượng lưu của SaiGon Jewelry (Đồng bộ Supabase)."
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
                {loading ? "Đang đăng nhập...." : "Đăng Nhập Ngay →"}
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
                  : "Đăng nhập để theo dõi đơn hàng"}
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
// 3. CART SCREEN (A1) - CHO PHÉP CHỌN MÓN HÀNG MUỐN MUA (HÌNH 1)
// ==========================================
function CartScreen({
  items,
  onUpdateQty,
  onRemoveItem,
  onBack,
  onOrder,
  onShowToast,
}: {
  items: CartItem[];
  onUpdateQty: (item: CartItem, delta: number) => void;
  onRemoveItem: (item: CartItem) => void;
  onBack: () => void;
  onOrder: (selectedItems: CartItem[]) => void;
  onShowToast?: (msg: string) => void;
}) {
  const getItemKey = (item: CartItem) => `${item.id}-${item.variant}`;

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    items.map((item) => `${item.id}-${item.variant}`)
  );

  // Đồng bộ danh sách chọn khi giỏ hàng thay đổi
  useEffect(() => {
    setSelectedKeys((prev) => {
      const currentKeys = items.map(getItemKey);
      const kept = prev.filter((k) => currentKeys.includes(k));
      // Nếu vừa thêm món mới hoặc chưa có món nào trong prev nhưng giỏ có hàng
      if (kept.length === 0 && currentKeys.length > 0 && prev.length === 0) {
        return currentKeys;
      }
      return kept;
    });
  }, [items]);

  const toggleSelectItem = (item: CartItem) => {
    const key = getItemKey(item);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isAllSelected =
    items.length > 0 &&
    items.every((item) => selectedKeys.includes(getItemKey(item)));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(items.map(getItemKey));
    }
  };

  const selectedItems = items.filter((item) =>
    selectedKeys.includes(getItemKey(item))
  );
  const subtotal = selectedItems.reduce(
    (acc, item) => acc + item.price * item.qty,
    0
  );
  const isFreeShipping = subtotal >= 10000000;
  const shippingFee =
    selectedItems.length === 0 ? 0 : isFreeShipping ? 0 : 50000;
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
            {/* Thanh Chọn tất cả món hàng muốn mua */}
            <div className="bg-white rounded-2xl px-4 py-2.5 shadow-2xs flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold transition-all"
                  style={
                    isAllSelected
                      ? {
                          background: PRIMARY_GOLD,
                          color: "#ffffff",
                          border: `1.5px solid ${PRIMARY_GOLD}`,
                        }
                      : {
                          background: "#ffffff",
                          color: "transparent",
                          border: "1.5px solid #c9bea9",
                        }
                  }
                >
                  ✓
                </span>
                <span className="text-xs font-['Inter'] font-semibold text-[#141210]">
                  Chọn tất cả ({selectedItems.length}/{items.length} sản phẩm)
                </span>
              </button>
              <span className="text-[11px] font-['Inter'] text-[#8a7a5c]">
                Tích chọn món muốn mua
              </span>
            </div>

            {items.map((item) => {
              const isSelected = selectedKeys.includes(getItemKey(item));
              return (
                <div
                  key={getItemKey(item)}
                  className="bg-white rounded-2xl px-3.5 py-4 shadow-sm flex items-center gap-3 transition-all"
                  style={{
                    border: isSelected
                      ? `1.5px solid ${PRIMARY_GOLD}`
                      : "1.5px solid transparent",
                  }}
                >
                  {/* Button trước sản phẩm để chọn mua */}
                  <button
                    type="button"
                    onClick={() => toggleSelectItem(item)}
                    aria-label={`Chọn mua ${item.name}`}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer active:scale-90 transition-all"
                    style={
                      isSelected
                        ? {
                            background: PRIMARY_GOLD,
                            color: "#ffffff",
                            border: `1.5px solid ${PRIMARY_GOLD}`,
                            boxShadow: "0 2px 6px rgba(184,146,42,0.3)",
                          }
                        : {
                            background: "#ffffff",
                            color: "transparent",
                            border: "1.5px solid #c4b79e",
                          }
                    }
                  >
                    ✓
                  </button>

                  <div
                    onClick={() => toggleSelectItem(item)}
                    className="w-18 h-18 rounded-xl overflow-hidden shrink-0 bg-[#f5f0e8] cursor-pointer"
                  >
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => toggleSelectItem(item)}
                      className="text-sm font-['Playfair_Display'] font-semibold text-foreground leading-snug cursor-pointer"
                    >
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
              );
            })}

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
                    style={{
                      color:
                        selectedItems.length === 0
                          ? "#8a7a5c"
                          : isFreeShipping
                            ? "#27ae60"
                            : PRIMARY_GOLD,
                    }}
                  >
                    {selectedItems.length === 0
                      ? "0đ"
                      : isFreeShipping
                        ? "Miễn phí"
                        : formatCurrency(50000)}
                  </span>
                  <ChevronDown size={14} color="#aaa" />
                </div>
              </div>
              {isFreeShipping && selectedItems.length > 0 && (
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
                Tổng thanh toán ({selectedItems.length} món đã chọn)
              </p>
              <p
                className="text-lg font-['Inter'] font-bold"
                style={{ color: PRIMARY_GOLD }}
              >
                {formatCurrency(total)}
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedItems.length === 0) {
                  onShowToast?.("Vui lòng tích chọn ít nhất 1 sản phẩm để mua!");
                  return;
                }
                onOrder(selectedItems);
              }}
              className="px-6 py-3 rounded-2xl text-sm font-['Inter'] font-bold text-white active:scale-95 transition-transform cursor-pointer"
              style={{
                background:
                  selectedItems.length > 0
                    ? `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`
                    : "#b5afa4",
                boxShadow:
                  selectedItems.length > 0
                    ? "0 4px 14px rgba(184,146,42,0.35)"
                    : "none",
              }}
            >
              Đặt hàng ({selectedItems.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3B. PRODUCT DETAIL SCREEN (D1) - GIAO DIỆN HÌNH 5 + ZOOM HÌNH ẢNH
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

  // Danh sách hình ảnh góc chụp của sản phẩm
  const galleryImages = React.useMemo(() => {
    const base =
      product.images && product.images.length > 0
        ? product.images
        : [product.img];
    const extras = [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&auto=format",
    ];
    const combined = Array.from(new Set([...base, ...extras])).slice(0, 4);
    return combined;
  }, [product]);

  const [activeImgIdx, setActiveImgIdx] = useState<number>(0);

  // State phóng to / thu nhỏ hình ảnh khi bấm vào hình
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const openZoomModal = () => {
    setZoomScale(1.5);
    setPanOffset({ x: 0, y: 0 });
    setIsZoomOpen(true);
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(0.5, Number((prev - 0.5).toFixed(1)));
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const matchedVarObj = product.variantObjects?.find(
    (v) => v.label === selectedVariant
  );
  const displayPrice = matchedVarObj
    ? formatCurrency(matchedVarObj.price)
    : product.price;
  const stockCount = matchedVarObj ? matchedVarObj.stock : (product.stock ?? 5);

  const currentImage = galleryImages[activeImgIdx] || product.img;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ background: "#faf8f5", scrollbarWidth: "none" }}
    >
      {/* KHUNG HÌNH SẢN PHẨM TRÀN VIỀN TRÊN CÙNG + NÚT QUAY LẠI & GIỎ HÀNG NẰM CHUNG TRÊN HÌNH (GIỐNG HÌNH 5) */}
      <div className="relative w-full aspect-square bg-secondary shrink-0 overflow-hidden select-none">
        {/* Hình sản phẩm chính - bấm vào để phóng to/thu nhỏ */}
        <img
          src={currentImage}
          alt={product.name}
          onClick={openZoomModal}
          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300"
        />

        {/* Lớp phủ mờ nhẹ ở mép trên để nút Quay lại & Giỏ hàng luôn nổi bật rõ nét */}
        <div
          className="absolute inset-x-0 top-0 h-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* Nút Quay lại (chỉ để icon) & Nút Giỏ hàng nằm đè trực tiếp trên hình sản phẩm giống Hình 5 */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          {/* Nút Quay lại chỉ để icon mũi tên trắng trong vòng tròn nền tối mờ */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            style={{
              background: "rgba(0, 0, 0, 0.42)",
              backdropFilter: "blur(4px)",
            }}
          >
            <ArrowLeft size={20} color="#ffffff" strokeWidth={2.2} />
          </button>

          {/* Nút Giỏ hàng nằm chung trên hình sản phẩm góc phải kèm badge đỏ cam giống Hình 5 */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Giỏ hàng"
            className="w-10 h-10 rounded-full flex items-center justify-center relative cursor-pointer active:scale-90 transition-transform"
            style={{
              background: "rgba(0, 0, 0, 0.42)",
              backdropFilter: "blur(4px)",
            }}
          >
            <ShoppingCart size={19} color="#ffffff" strokeWidth={2} />
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-['Inter'] font-bold flex items-center justify-center shadow-xs"
              style={{ background: "#ee4d2d" }}
            >
              {cartCount}
            </span>
          </button>
        </div>

        {/* Nút gợi ý chạm để phóng to ở góc dưới trái & Chỉ số trang ảnh (1/4) ở góc dưới phải giống Hình 5 */}
        <button
          type="button"
          onClick={openZoomModal}
          className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-['Inter'] font-medium text-white cursor-pointer active:scale-95"
          style={{
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(4px)",
          }}
        >
          <ZoomIn size={13} color="#ffffff" />
          <span>Chạm để phóng to</span>
        </button>

        <div
          className="absolute bottom-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-['Inter'] font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.88)",
            color: "#1c1917",
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          }}
        >
          {activeImgIdx + 1}/{galleryImages.length}
        </div>
      </div>

      {/* Hàng ảnh thu nhỏ (Thumbnails) giống Hình 5 */}
      <div
        className="px-4 pt-3 pb-2 bg-white"
        style={{ borderBottom: `1px solid ${BORDER_GOLD_LIGHT}` }}
      >
        <p className="text-xs font-['Inter'] text-[#6b6358] mb-2">
          {galleryImages.length} hình ảnh chi tiết có sẵn (Chạm vào ảnh trên để phóng to/thu nhỏ)
        </p>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {galleryImages.map((imgUrl, idx) => {
            const isSelected = idx === activeImgIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImgIdx(idx)}
                className="w-16 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer transition-all"
                style={{
                  border: isSelected
                    ? `2px solid ${PRIMARY_GOLD}`
                    : `1px solid ${BORDER_GOLD_LIGHT}`,
                  opacity: isSelected ? 1 : 0.72,
                }}
              >
                <img
                  src={imgUrl}
                  alt={`${product.name} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pt-4 pb-8 flex flex-col">
        {/* Category Eyebrow: — NHẪN */}
        <p
          className="text-[11px] font-['Inter'] font-semibold uppercase tracking-[0.16em]"
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

      {/* MODAL XEM PHÓNG TO / THU NHỎ HÌNH ẢNH SẢN PHẨM */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 flex flex-col justify-between select-none"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Thanh điều khiển phía trên */}
          <div
            className="flex items-center justify-between px-4 pt-8 pb-3 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-['Inter'] font-semibold text-white/90">
              Ảnh {activeImgIdx + 1}/{galleryImages.length} · Mức phóng:{" "}
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white cursor-pointer active:scale-90"
            >
              <X size={18} />
            </button>
          </div>

          {/* Vùng hiển thị ảnh có thể phóng to / thu nhỏ và kéo xem chi tiết */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative px-2"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => {
              if (zoomScale > 1) {
                handleResetZoom();
              } else {
                setZoomScale(2.2);
              }
            }}
            onMouseDown={(e) => {
              if (zoomScale > 1) {
                setIsDragging(true);
                setDragStart({
                  x: e.clientX - panOffset.x,
                  y: e.clientY - panOffset.y,
                });
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && zoomScale > 1) {
                setPanOffset({
                  x: e.clientX - dragStart.x,
                  y: e.clientY - dragStart.y,
                });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={(e) => {
              if (zoomScale > 1 && e.touches.length === 1) {
                setIsDragging(true);
                setDragStart({
                  x: e.touches[0].clientX - panOffset.x,
                  y: e.touches[0].clientY - panOffset.y,
                });
              }
            }}
            onTouchMove={(e) => {
              if (isDragging && zoomScale > 1 && e.touches.length === 1) {
                setPanOffset({
                  x: e.touches[0].clientX - dragStart.x,
                  y: e.touches[0].clientY - dragStart.y,
                });
              }
            }}
            onTouchEnd={() => setIsDragging(false)}
          >
            <img
              src={currentImage}
              alt={product.name}
              draggable={false}
              className="max-w-full max-h-[70vh] object-contain transition-transform duration-150"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
                cursor: zoomScale > 1 ? "grab" : "zoom-in",
              }}
            />
          </div>

          {/* Thanh công cụ Phóng to / Thu nhỏ / Chọn ảnh ở dưới */}
          <div
            className="px-4 pb-8 pt-3 flex flex-col items-center gap-3 z-20 bg-gradient-to-t from-black/90 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bộ nút Thu nhỏ (-), Đặt lại (100%), Phóng to (+) */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-['Inter'] font-semibold cursor-pointer active:scale-90"
              >
                <ZoomOut size={15} />
                <span>Thu nhỏ</span>
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-['Inter'] font-bold cursor-pointer active:scale-90"
              >
                <RotateCcw size={13} />
                <span>{Math.round(zoomScale * 100)}%</span>
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-600 text-white text-xs font-['Inter'] font-semibold cursor-pointer active:scale-90"
              >
                <ZoomIn size={15} />
                <span>Phóng to</span>
              </button>
            </div>

            {/* Thumbnails trong chế độ Zoom */}
            <div className="flex gap-2">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveImgIdx(idx);
                    handleResetZoom();
                  }}
                  className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer"
                  style={{
                    border:
                      idx === activeImgIdx
                        ? `2px solid ${PRIMARY_GOLD}`
                        : "1px solid rgba(255,255,255,0.3)",
                    opacity: idx === activeImgIdx ? 1 : 0.55,
                  }}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3C. SHOP / ALL PRODUCTS SCREEN (HÌNH 3 - TRANG SẢN PHẨM / TOÀN BỘ SẢN PHẨM)
// ==========================================
function ShopScreen({
  categoriesList,
  productsList,
  initialCategoryId,
  cartCount,
  onBack,
  onOpenCart,
  onSelectProduct,
  onAddToCart,
}: {
  categoriesList: DbCategory[];
  productsList: ProductItem[];
  initialCategoryId: number | null;
  cartCount: number;
  onBack: () => void;
  onOpenCart: () => void;
  onSelectProduct: (product: ProductItem) => void;
  onAddToCart: (product: ProductItem, qty: number, variant?: string) => void;
}) {
  const [selectedCats, setSelectedCats] = useState<number[]>(
    initialCategoryId ? [initialCategoryId] : []
  );
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<
    "new" | "price-asc" | "price-desc" | "name"
  >("new");
  const [cardQtys, setCardQtys] = useState<Record<number, number>>({});

  useEffect(() => {
    setSelectedCats(initialCategoryId ? [initialCategoryId] : []);
  }, [initialCategoryId]);

  // Xây dựng cây danh mục giống Hình 3 (Tất cả, Nhẫn, - Nhẫn cưới, Dây chuyền, Bông tai, Lắc tay)
  const orderedCategories = React.useMemo(() => {
    const hasWeddingRing = categoriesList.some((c) =>
      c.name.toLowerCase().includes("nhẫn cưới")
    );
    const fullList: DbCategory[] = hasWeddingRing
      ? categoriesList
      : [
          ...categoriesList,
          { id: 5, name: "Nhẫn cưới", icon: "💍", parentCatId: 1 },
        ];
    const roots = fullList.filter((c) => !c.parentCatId);
    const result: { cat: DbCategory; isSub: boolean }[] = [];
    roots.forEach((r) => {
      result.push({ cat: r, isSub: false });
      fullList
        .filter((c) => c.parentCatId === r.id)
        .forEach((sub) => result.push({ cat: sub, isSub: true }));
    });
    return result;
  }, [categoriesList]);

  const priceRanges = [
    { key: "0-2000000", label: "Dưới 2 triệu" },
    { key: "2000000-10000000", label: "2 – 10 triệu" },
    { key: "10000000-", label: "Trên 10 triệu" },
  ];

  const toggleCategory = (catId: number | null) => {
    if (catId === null) {
      setSelectedCats([]);
      return;
    }
    setSelectedCats((prev) => {
      const exists = prev.includes(catId);
      const next = exists ? prev.filter((id) => id !== catId) : [...prev, catId];
      if (next.length >= orderedCategories.length) return [];
      return next;
    });
  };

  const togglePriceRange = (rangeKey: string | null) => {
    if (rangeKey === null) {
      setSelectedPrices([]);
      return;
    }
    setSelectedPrices((prev) => {
      const exists = prev.includes(rangeKey);
      const next = exists
        ? prev.filter((k) => k !== rangeKey)
        : [...prev, rangeKey];
      if (next.length >= priceRanges.length) return [];
      return next;
    });
  };

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = React.useMemo(() => {
    return productsList
      .filter((p) => {
        // Lọc theo danh mục
        if (selectedCats.length > 0) {
          const catMatch = selectedCats.some((selId) => {
            if (p.catId === selId) return true;
            const selObj = orderedCategories.find(
              (x) => x.cat.id === selId
            )?.cat;
            if (!selObj) return false;
            // Nếu chọn Nhẫn (id=1) thì bao gồm cả Nhẫn cưới
            if (
              selObj.name.toLowerCase() === "nhẫn" &&
              p.category.toLowerCase().includes("nhẫn")
            ) {
              return true;
            }
            return (
              p.category.toLowerCase() === selObj.name.toLowerCase() ||
              p.category.toLowerCase().includes(selObj.name.toLowerCase())
            );
          });
          if (!catMatch) return false;
        }

        // Lọc theo khoảng giá
        if (selectedPrices.length > 0) {
          const priceMatch = selectedPrices.some((rk) => {
            const [minStr, maxStr] = rk.split("-");
            const min = minStr ? Number(minStr) : 0;
            const max = maxStr ? Number(maxStr) : Infinity;
            return p.numericPrice >= min && p.numericPrice <= max;
          });
          if (!priceMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-asc") return a.numericPrice - b.numericPrice;
        if (sortBy === "price-desc") return b.numericPrice - a.numericPrice;
        if (sortBy === "name") return a.name.localeCompare(b.name, "vi");
        return b.id - a.id;
      });
  }, [productsList, selectedCats, selectedPrices, sortBy, orderedCategories]);

  const getCardQty = (proId: number) => cardQtys[proId] || 1;
  const setCardQty = (proId: number, next: number, maxStock: number) => {
    const clamped = Math.max(1, Math.min(Math.max(1, maxStock), next));
    setCardQtys((prev) => ({ ...prev, [proId]: clamped }));
  };

  const getProductBadge = (p: ProductItem) => {
    if (p.stock <= 0) return "HẾT HÀNG";
    if (p.id === 3 || p.tag?.includes("BÁN CHẠY")) return "🔥 BÁN CHẠY NHẤT";
    if (p.id === 1) return "✨ TUYỆT TÁC 2026";
    if (p.numericPrice >= 15000000) return "💎 KIM CƯƠNG CAO CẤP";
    return `✦ ${p.tag || "VÀNG 18K Ý"}`;
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ background: "#faf8f5", scrollbarWidth: "none" }}
    >
      {/* Top Header */}
      <div
        className="flex items-center justify-between px-4 pt-10 pb-3 sticky top-0 z-20"
        style={{
          background: "rgba(250, 248, 245, 0.95)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${BORDER_GOLD_LIGHT}`,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <ArrowLeft size={17} color="#1c1917" />
        </button>

        <div className="text-center">
          <h1 className="text-base font-['Playfair_Display'] font-bold text-[#141210]">
            {selectedCats.length === 1
              ? orderedCategories.find((x) => x.cat.id === selectedCats[0])?.cat
                  .name || "Cửa hàng"
              : "Toàn bộ sản phẩm"}
          </h1>
          <p className="text-[11px] font-['Inter'] text-[#6b6358]">
            Trang sức chọn lọc cho mọi khoảnh khắc
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCart}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center relative cursor-pointer active:scale-90 transition-transform"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <ShoppingBag size={16} color={PRIMARY_GOLD} />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Shop Layout giống Hình 3 */}
      <div className="p-3.5 flex flex-col gap-3.5 pb-10">
        {/* Khung Bộ lọc Danh mục & Khoảng giá giống Hình 3 */}
        <div
          className="bg-white rounded-2xl p-3.5 shadow-xs grid grid-cols-2 gap-3"
          style={{ border: "1px solid #ece4d4" }}
        >
          {/* Cột 1: Danh mục */}
          <div>
            <h4 className="font-['Playfair_Display'] text-sm font-bold text-[#141210] mb-2">
              Danh mục
            </h4>
            <div className="flex flex-col gap-1">
              {/* Nút Tất cả danh mục */}
              <button
                type="button"
                onClick={() => toggleCategory(null)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-['Inter'] text-left transition-all cursor-pointer"
                style={
                  selectedCats.length === 0
                    ? {
                        background: "#8c5e1a",
                        color: "#ffffff",
                        fontWeight: 600,
                      }
                    : {
                        background: "transparent",
                        color: "#3f3a34",
                      }
                }
              >
                <span
                  className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={
                    selectedCats.length === 0
                      ? { background: "#ffffff", color: "#8c5e1a" }
                      : { border: "1px solid #c9c0b1", background: "#ffffff" }
                  }
                >
                  {selectedCats.length === 0 ? "✓" : ""}
                </span>
                <span>Tất cả</span>
              </button>

              {orderedCategories.map(({ cat, isSub }) => {
                const isSel = selectedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-['Inter'] text-left transition-all cursor-pointer ${
                      isSub ? "ml-3 text-[11px]" : ""
                    }`}
                    style={
                      isSel
                        ? {
                            background: "#8c5e1a",
                            color: "#ffffff",
                            fontWeight: 600,
                          }
                        : {
                            background: "transparent",
                            color: "#3f3a34",
                          }
                    }
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={
                        isSel
                          ? { background: "#ffffff", color: "#8c5e1a" }
                          : {
                              border: "1px solid #c9c0b1",
                              background: "#ffffff",
                            }
                      }
                    >
                      {isSel ? "✓" : ""}
                    </span>
                    <span className="truncate">
                      {isSub ? `– ${cat.name}` : cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cột 2: Khoảng giá */}
          <div>
            <h4 className="font-['Playfair_Display'] text-sm font-bold text-[#141210] mb-2">
              Khoảng giá
            </h4>
            <div className="flex flex-col gap-1">
              {/* Nút Tất cả khoảng giá */}
              <button
                type="button"
                onClick={() => togglePriceRange(null)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-['Inter'] text-left transition-all cursor-pointer"
                style={
                  selectedPrices.length === 0
                    ? {
                        background: "#8c5e1a",
                        color: "#ffffff",
                        fontWeight: 600,
                      }
                    : {
                        background: "transparent",
                        color: "#3f3a34",
                      }
                }
              >
                <span
                  className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={
                    selectedPrices.length === 0
                      ? { background: "#ffffff", color: "#8c5e1a" }
                      : { border: "1px solid #c9c0b1", background: "#ffffff" }
                  }
                >
                  {selectedPrices.length === 0 ? "✓" : ""}
                </span>
                <span>Tất cả</span>
              </button>

              {priceRanges.map((pr) => {
                const isSel = selectedPrices.includes(pr.key);
                return (
                  <button
                    key={pr.key}
                    type="button"
                    onClick={() => togglePriceRange(pr.key)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-['Inter'] text-left transition-all cursor-pointer"
                    style={
                      isSel
                        ? {
                            background: "#8c5e1a",
                            color: "#ffffff",
                            fontWeight: 600,
                          }
                        : {
                            background: "transparent",
                            color: "#3f3a34",
                          }
                    }
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-[4px] flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={
                        isSel
                          ? { background: "#ffffff", color: "#8c5e1a" }
                          : {
                              border: "1px solid #c9c0b1",
                              background: "#ffffff",
                            }
                      }
                    >
                      {isSel ? "✓" : ""}
                    </span>
                    <span className="truncate">{pr.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Thanh số lượng sản phẩm & Sắp xếp giống Hình 3 */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-['Inter'] text-[#6b6358]">
            {filteredProducts.length} sản phẩm
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sắp xếp"
            className="px-3.5 py-1.5 rounded-full bg-white text-xs font-['Inter'] font-medium text-[#141210] outline-none cursor-pointer shadow-2xs"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
          >
            <option value="new">Mới nhất</option>
            <option value="price-asc">Giá tăng dần</option>
            <option value="price-desc">Giá giảm dần</option>
            <option value="name">Tên A–Z</option>
          </select>
        </div>

        {/* Danh sách Thẻ sản phẩm giống Hình 3 */}
        {filteredProducts.length === 0 ? (
          <div
            className="bg-white rounded-2xl p-8 text-center"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
          >
            <p className="font-['Playfair_Display'] text-base font-semibold text-[#141210]">
              Không tìm thấy sản phẩm phù hợp
            </p>
            <p className="text-xs font-['Inter'] text-[#6b6358] mt-1">
              Thử chọn danh mục hoặc khoảng giá khác.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCats([]);
                setSelectedPrices([]);
              }}
              className="mt-3 px-4 py-2 rounded-full text-xs font-['Inter'] font-semibold text-white cursor-pointer"
              style={{ background: "#8c5e1a" }}
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredProducts.map((p) => {
              const cQty = getCardQty(p.id);
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl overflow-hidden transition-all"
                  style={{
                    border: "1.5px solid #c99a3e",
                    boxShadow: "0 8px 24px rgba(184, 146, 42, 0.12)",
                  }}
                >
                  {/* Ảnh sản phẩm + Badge góc trái trên giống Hình 3 */}
                  <div
                    onClick={() => onSelectProduct(p)}
                    className="relative w-full aspect-square bg-secondary overflow-hidden cursor-pointer"
                  >
                    <span
                      className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-[10px] font-['Inter'] font-bold uppercase tracking-wider text-white shadow-sm"
                      style={{ background: "rgba(24, 20, 16, 0.86)" }}
                    >
                      {getProductBadge(p)}
                    </span>
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Nội dung thẻ sản phẩm giống Hình 3 */}
                  <div className="p-4">
                    <div
                      onClick={() => onSelectProduct(p)}
                      className="cursor-pointer"
                    >
                      <p
                        className="text-[10px] font-['Inter'] font-bold uppercase tracking-[0.14em]"
                        style={{ color: "#9a6b24" }}
                      >
                        {p.category}
                      </p>
                      <h3 className="text-lg font-['Playfair_Display'] font-semibold text-[#141210] mt-1 leading-snug">
                        {p.name}
                      </h3>

                      <div className="flex items-center justify-between mt-2">
                        <span
                          className="text-base font-['Inter'] font-bold"
                          style={{ color: "#8c5e1a" }}
                        >
                          {p.price}
                        </span>
                        <span
                          className="text-xs font-['Inter'] font-semibold"
                          style={{ color: "#9a6b24" }}
                        >
                          Khám phá →
                        </span>
                      </div>

                      {/* Dòng trạng thái tồn kho có chấm xanh giống Hình 3 */}
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-['Inter'] text-[#3d5a45]">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ background: "#2ecc71" }}
                        />
                        <span>
                          Hiện đang có sẵn:{" "}
                          <strong className="text-[#1e7e34]">{p.stock}</strong>{" "}
                          sản phẩm
                        </span>
                      </div>
                    </div>

                    {/* Hàng chọn số lượng [- 1 +] & Nút [Thêm giỏ] giống Hình 3 */}
                    <div
                      className="flex items-center gap-2.5 mt-3.5 pt-3"
                      style={{ borderTop: "1px solid #f1eadc" }}
                    >
                      <div
                        className="flex items-center justify-between rounded-xl px-2.5 py-1.5 bg-[#faf7f0]"
                        style={{
                          border: "1px solid #e4d8c3",
                          minWidth: "90px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setCardQty(p.id, cQty - 1, p.stock)}
                          className="w-6 h-6 flex items-center justify-center text-sm font-bold text-[#6b5327] cursor-pointer active:scale-90"
                        >
                          −
                        </button>
                        <span className="text-xs font-['Inter'] font-bold text-[#141210] px-2">
                          {cQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCardQty(p.id, cQty + 1, p.stock)}
                          className="w-6 h-6 flex items-center justify-center text-sm font-bold text-[#6b5327] cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onAddToCart(p, cQty, p.variant)}
                        className="flex-1 py-2.5 px-3 rounded-xl text-xs font-['Inter'] font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                        style={{
                          background: "#f5efe2",
                          border: "1px solid #e2d3b5",
                          color: "#7c5215",
                        }}
                      >
                        <ShoppingCart size={13} color="#8c5e1a" />
                        <span>Thêm giỏ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 4. HOME SCREEN (I1) - BANNER TỰ ĐỘNG CHUYỂN ĐỔI (HÌNH 1) & DANH MỤC DẪN TỚI TRANG SẢN PHẨM (HÌNH 2 -> HÌNH 3)
// ==========================================
function HomeScreen({
  categoriesList,
  productsList,
  favorites,
  onToggleFavorite,
  cartCount,
  onOpenCart,
  onSelectProduct,
  onOpenShopCategory,
}: {
  categoriesList: DbCategory[];
  productsList: ProductItem[];
  favorites: number[];
  onToggleFavorite: (id: number, e?: React.MouseEvent) => void;
  cartCount: number;
  onOpenCart: () => void;
  onSelectProduct: (product: ProductItem) => void;
  onOpenShopCategory: (categoryId: number | null) => void;
}) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Danh sách 4 slide banner quảng bá sản phẩm tự động chuyển đổi lặp lại (Hình 5)
  const promoSlides = React.useMemo(
    () => [
      {
        eyebrow: "BỘ SƯU TẬP MỚI",
        title: "Vẻ đẹp vĩnh\ncửu",
        img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=400&fit=crop&auto=format",
        productIndex: 0,
      },
      {
        eyebrow: "TUYỆT TÁC KIM CƯƠNG",
        title: "Tỏa sáng\nkhí chất",
        img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=400&fit=crop&auto=format",
        productIndex: 1,
      },
      {
        eyebrow: "QUÀ TẶNG TÌNH YÊU",
        title: "Dây chuyền\nMặt Trái Tim",
        img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=400&fit=crop&auto=format",
        productIndex: 2,
      },
      {
        eyebrow: "CHẾ TÁC THƯỢNG LƯU",
        title: "Bông tai\nNgọc Trai Akoya",
        img: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?w=800&h=400&fit=crop&auto=format",
        productIndex: 3,
      },
    ],
    []
  );

  // Nhân bản slide đầu tiên ở cuối mảng để khi từ hình cuối trượt sang hình đầu sẽ tiếp tục trượt từ phải sang trái mượt mà, không bị tua ngược lại
  const extendedSlides = React.useMemo(
    () => [...promoSlides, promoSlides[0]],
    [promoSlides]
  );

  // Tự động trượt tiến liên tục từ phải sang trái
  useEffect(() => {
    const timer = setInterval(() => {
      setEnableTransition(true);
      setSlideIdx((prev) => prev + 1);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Khi trượt tới bản sao của hình đầu tiên (index === promoSlides.length), đợi hiệu ứng trượt kết thúc rồi đặt lại về index 0 không cần animation
  useEffect(() => {
    if (slideIdx === promoSlides.length) {
      const resetTimer = setTimeout(() => {
        setEnableTransition(false);
        setSlideIdx(0);
      }, 700);
      return () => clearTimeout(resetTimer);
    }
  }, [slideIdx, promoSlides.length]);

  const activeDot = slideIdx % promoSlides.length;

  // 4 danh mục gốc hiển thị ở Trang chủ (Nhẫn, Dây chuyền, Bông tai, Lắc tay) giống Hình 2
  const homeCategories = React.useMemo(() => {
    const roots = categoriesList.filter((c) => !c.parentCatId);
    const desiredOrder = ["nhẫn", "dây chuyền", "bông tai", "lắc tay"];
    return [...roots]
      .sort((a, b) => {
        const ia = desiredOrder.findIndex((k) =>
          a.name.toLowerCase().includes(k)
        );
        const ib = desiredOrder.findIndex((k) =>
          b.name.toLowerCase().includes(k)
        );
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .slice(0, 4);
  }, [categoriesList]);

  const matchProduct = (p: ProductItem) => {
    const matchQ =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchQ;
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
            SaiGon Jewelry
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

      {/* Hero Promo Banner - Hiệu ứng trượt liên tục một chiều từ phải sang trái (không trượt ngược lại khi hết hình cuối) */}
      <div className="mx-4 rounded-2xl overflow-hidden relative h-44 shrink-0 shadow-sm">
        <div
          className={`flex h-full w-full ${
            enableTransition
              ? "transition-transform duration-700 ease-in-out"
              : ""
          }`}
          style={{
            transform: `translateX(-${slideIdx * 100}%)`,
          }}
        >
          {extendedSlides.map((slide, idx) => (
            <div
              key={idx}
              className="relative w-full h-full shrink-0 overflow-hidden"
            >
              <img
                src={slide.img}
                alt={slide.eyebrow}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex flex-col justify-center px-5 z-10">
                <p className="text-[10px] uppercase tracking-widest text-amber-300 font-['Inter'] font-medium mb-1">
                  {slide.eyebrow}
                </p>
                <h2 className="text-xl font-['Playfair_Display'] text-white font-bold leading-tight whitespace-pre-line">
                  {slide.title}
                </h2>
                <button
                  onClick={() => {
                    const targetProd =
                      productsList[slide.productIndex % productsList.length] ||
                      productsList[0];
                    if (targetProd) {
                      onSelectProduct(targetProd);
                    } else {
                      onOpenShopCategory(null);
                    }
                  }}
                  className="mt-3 px-4 py-1.5 rounded-full text-xs font-medium text-white border border-white/60 w-fit font-['Inter'] hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Khám phá ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Carousel Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {promoSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setEnableTransition(true);
              setSlideIdx(idx);
            }}
            className={`rounded-full transition-all duration-300 cursor-pointer ${
              idx === activeDot ? "w-5 h-1.5" : "w-1.5 h-1.5"
            }`}
            style={{
              background: idx === activeDot ? PRIMARY_GOLD : "#d4c4a0",
            }}
          />
        ))}
      </div>

      {/* Categories - Bấm chọn danh mục dẫn thẳng đến trang Sản phẩm / Toàn bộ sản phẩm (Hình 2 -> Hình 3) */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Playfair_Display'] text-base font-semibold text-foreground">
            Danh mục
          </h3>
          <button
            onClick={() => onOpenShopCategory(null)}
            className="text-xs font-['Inter'] cursor-pointer"
            style={{ color: PRIMARY_GOLD }}
          >
            Tất cả
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {homeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onOpenShopCategory(cat.id)}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm transition-transform group-active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#fdf8ef 0%,#f5edd8 100%)",
                  border: `1px solid ${BORDER_GOLD_LIGHT}`,
                }}
              >
                {cat.icon}
              </div>
              <span
                className="text-[11px] font-['Inter'] text-center"
                style={{
                  color: "var(--foreground)",
                  fontWeight: 500,
                }}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Products ("Nổi bật") */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Playfair_Display'] text-base font-semibold text-foreground">
            Nổi bật
          </h3>
          <button
            onClick={() => onOpenShopCategory(null)}
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
            onClick={() => onOpenShopCategory(null)}
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
// 5. NOTIFICATIONS SCREEN (M1) - ĐỒNG BỘ & LƯU BỀN VỮNG TRẠNG THÁI ĐÃ ĐỌC
// ==========================================
function NotificationsScreen({
  notifications,
  readIds,
  onMarkAllRead,
  onMarkSingleRead,
}: {
  notifications: DbNotification[];
  readIds: number[];
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: number) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("unread");

  const unreadCount = notifications.filter(
    (item) => !readIds.includes(item.id)
  ).length;

  const displayList =
    filter === "unread"
      ? notifications.filter((item) => !readIds.includes(item.id))
      : notifications;

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
            onClick={onMarkAllRead}
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
              onClick={() => onMarkSingleRead(item.id)}
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
            {email}
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

        {/* Stats Row (Không hiển thị điểm / hạng thành viên) */}
        <div className="flex gap-10 mt-4 z-10">
          {[
            { label: "Đơn hàng", val: String(user.ordersCount) },
            { label: "Yêu thích", val: String(favoritesCount) },
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
// 10. CHECKOUT / ORDER SCREEN (P1) - CHỌN MÃ VOUCHER HỆ THỐNG & GIỮ CHỖ VOUCHER (HÌNH 2 & HÌNH 3)
// ==========================================
function OrderScreen({
  user,
  onBack,
  onGoHome,
  onViewOrders,
  items,
  onOrderPlaced,
  onShowToast,
}: {
  user: CustomerProfile;
  onBack: () => void;
  onGoHome: () => void;
  onViewOrders?: () => void;
  items: CartItem[];
  onOrderPlaced: (orderCode: string) => void;
  onShowToast?: (msg: string) => void;
}) {
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "card" | "ewallet"
  >("cod");
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState(() => "HD51411063");

  // State quản lý danh sách Voucher đang hoạt động & giữ chỗ Voucher
  const [vouchers, setVouchers] = useState<DbVoucher[]>([]);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [updatingVoucherId, setUpdatingVoucherId] = useState<number | null>(
    null
  );
  const [selectedVoucher, setSelectedVoucher] = useState<DbVoucher | null>(
    null
  );
  const reservedVoucherIdRef = React.useRef<number | null>(null);
  const orderConfirmedRef = React.useRef<boolean>(false);

  // Tải danh sách các mã voucher đang hoạt động từ Supabase
  const loadVouchers = async () => {
    setLoadingVouchers(true);
    try {
      const list = await fetchActiveVouchers();
      setVouchers(list);
    } catch {
      // ignore
    } finally {
      setLoadingVouchers(false);
    }
  };

  useEffect(() => {
    loadVouchers();
    return () => {
      // Nếu thoát khỏi trang Tổng quan đơn hàng mà chưa xác nhận đặt hàng, hoàn trả lại lượt giữ chỗ voucher
      if (reservedVoucherIdRef.current && !orderConfirmedRef.current) {
        releaseVoucherInDb(reservedVoucherIdRef.current).catch(() => {});
        reservedVoucherIdRef.current = null;
      }
    };
  }, []);

  // Xử lý chọn hoặc bỏ chọn mã voucher (Giữ chỗ & hiện thông báo "Đã tải dữ liệu")
  const handleToggleSelectVoucher = async (v: DbVoucher) => {
    if (updatingVoucherId !== null) return;
    setUpdatingVoucherId(v.discountId);
    onShowToast?.("Đã tải dữ liệu");

    try {
      const isCurrentlySelected = selectedVoucher?.discountId === v.discountId;

      if (isCurrentlySelected) {
        // Bỏ chọn mã voucher hiện tại -> Hoàn trả lại số lượng giữ chỗ (times_used - 1)
        const updatedList = await releaseVoucherInDb(v.discountId);
        reservedVoucherIdRef.current = null;
        setSelectedVoucher(null);
        setVouchers(updatedList);
      } else {
        // Nếu đang giữ chỗ một mã voucher khác trước đó -> Trả lại số lượng cho mã cũ trước
        if (selectedVoucher) {
          await releaseVoucherInDb(selectedVoucher.discountId);
          reservedVoucherIdRef.current = null;
        }
        // Giữ chỗ mã voucher mới vừa chọn (times_used + 1)
        const updatedList = await reserveVoucherInDb(v.discountId);
        reservedVoucherIdRef.current = v.discountId;
        const refreshed =
          updatedList.find((x) => x.discountId === v.discountId) || v;
        setSelectedVoucher(refreshed);
        setVouchers(updatedList);
      }
    } catch (e: any) {
      onShowToast?.(e?.message || "Không thể chọn mã voucher này.");
    } finally {
      setUpdatingVoucherId(null);
    }
  };

  const handleBackFromOrder = async () => {
    if (reservedVoucherIdRef.current && !orderConfirmedRef.current) {
      const toRelease = reservedVoucherIdRef.current;
      reservedVoucherIdRef.current = null;
      setSelectedVoucher(null);
      releaseVoucherInDb(toRelease).catch(() => {});
    }
    onBack();
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const isFreeShipping = subtotal >= 10000000;
  const shippingOriginal = 83500;
  const shippingDiscount = isFreeShipping ? 83500 : 0;
  const shippingFinal = shippingOriginal - shippingDiscount;

  const voucherDiscountAmount = selectedVoucher
    ? Math.round((subtotal * selectedVoucher.discountPercentage) / 100)
    : 0;
  const total = Math.max(0, subtotal - voucherDiscountAmount + shippingFinal);
  const totalItemCount = items.reduce((acc, item) => acc + item.qty, 0);

  const handleConfirmOrder = async () => {
    setSubmitting(true);
    try {
      const res = await createOrderInDb(
        user.id,
        user,
        items,
        paymentMethod,
        selectedVoucher?.discountId || null,
        voucherDiscountAmount
      );
      orderConfirmedRef.current = true;
      reservedVoucherIdRef.current = null;
      setOrderCode(res.orderCode);
      setIsSuccess(true);
      onOrderPlaced(res.orderCode);
    } catch {
      orderConfirmedRef.current = true;
      reservedVoucherIdRef.current = null;
      setIsSuccess(true);
      onOrderPlaced(orderCode);
    } finally {
      setSubmitting(false);
    }
  };

  // Success view (Màu trắng chủ đạo)
  if (isSuccess) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-6 px-6"
        style={{ background: "#ffffff" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: "#fdf8ef",
            border: `2px solid ${PRIMARY_GOLD}`,
          }}
        >
          <CheckCircle size={40} color={PRIMARY_GOLD} />
        </div>
        <div className="text-center">
          <p className="text-xl font-['Playfair_Display'] font-bold text-[#141210] mb-2">
            Đặt hàng thành công!
          </p>
          <p className="text-sm font-['Inter'] font-semibold text-[#6b6358]">
            Mã đơn hàng: {orderCode}
          </p>
          <p className="text-xs font-['Inter'] text-[#8a7a5c] mt-1">
            Đơn hàng đã được lưu vào cơ sở dữ liệu Supabase
          </p>
        </div>
        <div className="flex flex-col gap-2.5 w-full max-w-[240px]">
          {onViewOrders && (
            <button
              onClick={onViewOrders}
              className="w-full py-3 rounded-2xl text-sm font-['Inter'] font-bold text-white cursor-pointer active:scale-95 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${PRIMARY_GOLD} 0%, #8b6914 100%)`,
                boxShadow: "0 4px 14px rgba(184,146,42,0.3)",
              }}
            >
              Xem đơn hàng của tôi
            </button>
          )}
          <button
            onClick={onGoHome}
            className="w-full py-3 rounded-2xl text-sm font-['Inter'] font-bold text-[#141210] bg-[#faf8f5] cursor-pointer active:scale-95 transition-transform"
            style={{
              border: `1px solid ${BORDER_GOLD_LIGHT}`,
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Checkout Review view (White & Clean Gold Theme - Hình 2)
  return (
    <div className="flex flex-col h-full relative" style={{ background: "#f8f6f2" }}>
      {/* Header màu trắng chủ đạo */}
      <div
        className="flex items-center gap-3 px-4 pt-10 pb-4 shrink-0 bg-white"
        style={{
          borderBottom: `1px solid ${BORDER_GOLD_LIGHT}`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <button
          onClick={handleBackFromOrder}
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
          style={{
            background: "#faf8f5",
            border: `1px solid ${BORDER_GOLD_LIGHT}`,
          }}
        >
          <ArrowLeft size={18} color="#141210" />
        </button>
        <h1 className="flex-1 text-lg font-['Playfair_Display'] font-bold text-[#141210]">
          Tổng quan đơn hàng
        </h1>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Delivery Address Card */}
        <div
          className="mx-4 mt-4 rounded-2xl px-4 py-3.5 flex items-start gap-3 bg-white shadow-2xs"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <MapPin
            size={16}
            color={PRIMARY_GOLD}
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-['Inter'] font-semibold text-[#8a7a5c] uppercase tracking-wide mb-0.5">
              Địa chỉ giao hàng
            </p>
            <p className="text-sm font-['Inter'] font-bold text-[#141210]">
              {user.name} · {maskPhone(user.phone)}
            </p>
            <p className="text-xs font-['Inter'] text-[#6b6358] mt-0.5 leading-relaxed">
              {user.address}
            </p>
          </div>
          <button className="cursor-pointer">
            <Pencil size={14} color={PRIMARY_GOLD} />
          </button>
        </div>

        {/* Mall / Store Order Items */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white shadow-2xs"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "#f1eadc" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-['Inter'] font-bold px-2 py-0.5 rounded"
                style={{ background: PRIMARY_GOLD, color: "white" }}
              >
                MALL
              </span>
              <span className="text-sm font-['Inter'] font-bold text-[#141210]">
                SaiGon Jewelry
              </span>
            </div>
            <button
              className="flex items-center gap-1 text-xs font-['Inter'] font-medium cursor-pointer"
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
              style={{ borderColor: "#f1eadc" }}
            >
              <div
                className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-[#faf8f5]"
                style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
              >
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-['Playfair_Display'] font-bold text-[#141210] leading-snug">
                    {item.name}
                  </p>
                  <span className="text-xs font-['Inter'] font-semibold text-[#6b6358] shrink-0">
                    x{item.qty}
                  </span>
                </div>
                <p className="text-xs font-['Inter'] text-[#8a7a5c] mt-0.5">
                  {item.variant}
                </p>
                <p
                  className="text-sm font-['Inter'] font-bold mt-1"
                  style={{ color: "#9a6b24" }}
                >
                  {formatCurrency(item.price)}
                </p>
              </div>
            </div>
          ))}

          {/* Shipping Row */}
          <div
            className="flex items-center justify-between px-4 py-3 border-t bg-[#fdfbf7]"
            style={{ borderColor: "#f1eadc" }}
          >
            <div className="flex items-center gap-2">
              <Truck size={14} color={PRIMARY_GOLD} />
              <span className="text-xs font-['Inter'] text-[#3f3a34] font-medium">
                Giao hàng bảo hiểm niêm phong
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isFreeShipping && (
                <span className="text-xs font-['Inter'] text-[#9c9283] line-through">
                  {formatCurrency(shippingOriginal)}
                </span>
              )}
              <span
                className="text-xs font-['Inter'] font-bold"
                style={{ color: isFreeShipping ? "#16a34a" : "#9a6b24" }}
              >
                {isFreeShipping
                  ? "Miễn phí"
                  : formatCurrency(shippingOriginal)}
              </span>
              <ChevronRight size={12} color="#b5a68e" />
            </div>
          </div>
        </div>

        {/* Khu vực Voucher SaiGon Jewelry -> Chọn mã (Hình 2 & Hình 3) */}
        <button
          type="button"
          onClick={() => {
            setVoucherModalOpen(true);
            loadVouchers();
          }}
          className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl px-4 py-3.5 flex items-center gap-3 bg-white shadow-2xs cursor-pointer active:scale-[0.99] transition-transform text-left"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <Tag size={15} color={PRIMARY_GOLD} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-['Inter'] font-medium text-[#141210] block">
              Voucher SaiGon Jewelry
            </span>
            {selectedVoucher && (
              <span className="text-[11px] font-['Inter'] text-[#9a6b24] font-semibold">
                Đã chọn: {selectedVoucher.voucherName} (−
                {selectedVoucher.discountPercentage}%)
              </span>
            )}
          </div>
          {selectedVoucher ? (
            <span className="text-sm font-['Inter'] font-bold text-[#16a34a] shrink-0">
              −{formatCurrency(voucherDiscountAmount)}
            </span>
          ) : (
            <span
              className="text-xs font-['Inter'] font-semibold px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: "#fdf6e7",
                color: "#9a6b24",
                border: `1px solid ${BORDER_GOLD_LIGHT}`,
              }}
            >
              Chọn mã
            </span>
          )}
          <ChevronRight size={14} color="#b5a68e" className="shrink-0" />
        </button>

        {/* Collapsible Order Summary ("Tóm tắt đơn hàng") */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white shadow-2xs"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <button
            onClick={() => setShowSummaryDetails(!showSummaryDetails)}
            className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
          >
            <span className="text-sm font-['Inter'] font-bold text-[#141210]">
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
              <span className="text-xs font-['Inter'] text-[#6b6358]">
                Tổng phụ sản phẩm
              </span>
              <span className="text-xs font-['Inter'] font-semibold text-[#141210]">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-xs font-['Inter'] text-[#6b6358]">
                Tổng phụ vận chuyển
              </span>
              <span className="text-xs font-['Inter'] font-semibold text-[#141210]">
                {formatCurrency(shippingFinal)}
              </span>
            </div>
            {selectedVoucher && (
              <div className="flex justify-between py-1">
                <span className="text-xs font-['Inter'] text-[#16a34a]">
                  Voucher ({selectedVoucher.voucherName} −
                  {selectedVoucher.discountPercentage}%)
                </span>
                <span className="text-xs font-['Inter'] font-bold text-[#16a34a]">
                  −{formatCurrency(voucherDiscountAmount)}
                </span>
              </div>
            )}

            {showSummaryDetails && (
              <>
                <div className="flex justify-between py-1">
                  <span className="text-xs font-['Inter'] text-[#8a7a5c] pl-3">
                    Giá gốc vận chuyển
                  </span>
                  <span className="text-xs font-['Inter'] text-[#6b6358]">
                    {formatCurrency(shippingOriginal)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-xs font-['Inter'] text-[#8a7a5c] pl-3">
                    Giảm phí vận chuyển
                  </span>
                  <span className="text-xs font-['Inter'] font-semibold text-[#16a34a]">
                    −{formatCurrency(shippingDiscount)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div
            className="mx-4 border-t my-1"
            style={{ borderColor: "#f1eadc" }}
          />
          <div className="flex justify-between px-4 py-3.5">
            <span className="text-base font-['Inter'] font-bold text-[#141210]">
              Tổng
            </span>
            <span
              className="text-base font-['Playfair_Display'] font-bold"
              style={{ color: "#9a6b24" }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Modal Chọn Mã Voucher Hệ Thống (Hình 3 - discount_by_voucher) */}
        {voucherModalOpen && (
          <div
            className="fixed inset-0 z-[110] bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setVoucherModalOpen(false)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-[380px] max-h-[82vh] flex flex-col overflow-hidden shadow-2xl"
              style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div
                className="flex items-center justify-between px-4 py-3.5 bg-[#faf8f5]"
                style={{ borderBottom: `1px solid ${BORDER_GOLD_LIGHT}` }}
              >
                <div>
                  <p
                    className="text-[10px] font-['Inter'] font-bold uppercase tracking-wider"
                    style={{ color: "#9a6b24" }}
                  >
                    VOUCHER SAIGON JEWELRY
                  </p>
                  <h3 className="text-base font-['Playfair_Display'] font-bold text-[#141210]">
                    Chọn mã giảm giá hệ thống
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#141210] cursor-pointer"
                  style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Danh sách Voucher đang hoạt động */}
              <div
                className="p-4 overflow-y-auto flex flex-col gap-3"
                style={{ scrollbarWidth: "none" }}
              >
                {loadingVouchers && vouchers.length === 0 ? (
                  <div className="py-10 text-center text-xs font-['Inter'] text-[#6b6358]">
                    Đang tải danh sách mã voucher...
                  </div>
                ) : vouchers.length === 0 ? (
                  <div className="py-10 text-center text-xs font-['Inter'] text-[#6b6358]">
                    Hiện không có mã voucher nào đang hoạt động.
                  </div>
                ) : (
                  vouchers.map((v) => {
                    const isSelected =
                      selectedVoucher?.discountId === v.discountId;
                    const isUpdating = updatingVoucherId === v.discountId;
                    const estDiscount = Math.round(
                      (subtotal * v.discountPercentage) / 100
                    );
                    const isOut = v.remainingCount <= 0 && !isSelected;

                    return (
                      <div
                        key={v.discountId}
                        className="rounded-2xl p-3.5 transition-all flex items-center justify-between gap-3"
                        style={{
                          background: isSelected ? "#fdf8ef" : "#ffffff",
                          border: isSelected
                            ? `1.5px solid ${PRIMARY_GOLD}`
                            : `1px solid ${BORDER_GOLD_LIGHT}`,
                          opacity: isOut ? 0.55 : 1,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-['Inter'] font-bold text-white"
                              style={{ background: "#8c5e1a" }}
                            >
                              −{v.discountPercentage}%
                            </span>
                            <p className="text-sm font-['Playfair_Display'] font-bold text-[#141210] truncate">
                              {v.voucherName}
                            </p>
                          </div>

                          <p className="text-xs font-['Inter'] font-semibold text-[#16a34a] mt-1">
                            Giảm {formatCurrency(estDiscount)} trên đơn hiện tại
                          </p>

                          <div className="flex items-center gap-3 mt-1 text-[11px] font-['Inter'] text-[#6b6358]">
                            <span>
                              Số lượng:{" "}
                              <strong className="text-[#141210]">
                                {v.remainingCount}/{v.usageLimit}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOut || updatingVoucherId !== null}
                          onClick={() => handleToggleSelectVoucher(v)}
                          className="px-3.5 py-2 rounded-xl text-xs font-['Inter'] font-bold shrink-0 cursor-pointer active:scale-95 transition-transform"
                          style={
                            isSelected
                              ? {
                                  background: "#fff1f2",
                                  color: "#be123c",
                                  border: "1px solid #fecdd3",
                                }
                              : {
                                  background: PRIMARY_GOLD,
                                  color: "#ffffff",
                                }
                          }
                        >
                          {isUpdating
                            ? "Đang tải..."
                            : isSelected
                              ? "Bỏ chọn"
                              : "Chọn mã"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Modal */}
              <div
                className="px-4 py-3 bg-[#faf8f5] flex items-center justify-between"
                style={{ borderTop: `1px solid ${BORDER_GOLD_LIGHT}` }}
              >
                <span className="text-xs font-['Inter'] text-[#6b6358]">
                  {selectedVoucher
                    ? `Đã chọn: ${selectedVoucher.voucherName} (−${formatCurrency(voucherDiscountAmount)})`
                    : "Chưa chọn mã voucher"}
                </span>
                <button
                  type="button"
                  onClick={() => setVoucherModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-['Inter'] font-bold text-white cursor-pointer"
                  style={{ background: "#141210" }}
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div
          className="mx-4 mt-3 rounded-2xl overflow-hidden bg-white shadow-2xs"
          style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
        >
          <p className="px-4 pt-4 pb-2 text-sm font-['Inter'] font-bold text-[#141210]">
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
                  style={{ borderColor: "#f1eadc" }}
                />
              )}
              <button
                onClick={() => setPaymentMethod(m.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#fdf6e7" }}
                >
                  {m.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-['Inter'] font-medium text-[#141210]">
                    {m.name}
                  </p>
                  {m.sub && (
                    <p className="text-[11px] font-['Inter'] text-[#8a7a5c] mt-0.5">
                      {m.sub}
                    </p>
                  )}
                </div>
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor:
                      paymentMethod === m.id ? PRIMARY_GOLD : "#d4c8b4",
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
            <p className="text-[10px] font-['Inter'] leading-relaxed text-[#8a7a5c]">
              Bằng cách đặt đơn hàng, bạn đồng ý với{" "}
              <span className="font-semibold" style={{ color: "#9a6b24" }}>
                Điều khoản sử dụng và bán hàng
              </span>{" "}
              của SaiGon Jewelry và đồng ý rằng dữ liệu của bạn sẽ được xử lý theo{" "}
              <span className="font-semibold" style={{ color: "#9a6b24" }}>
                Chính sách quyền riêng tư
              </span>
              .
            </p>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Sticky Bottom Order Confirmation Action (Màu trắng chủ đạo) */}
      <div
        className="shrink-0 px-4 pt-3 pb-5 bg-white"
        style={{
          borderTop: `1px solid ${BORDER_GOLD_LIGHT}`,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-['Inter'] text-[#6b6358]">
              Tổng ({totalItemCount} mặt hàng)
            </p>
            <p
              className="text-lg font-['Inter'] font-bold"
              style={{ color: "#9a6b24" }}
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
              boxShadow: "0 4px 14px rgba(184,146,42,0.32)",
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
// 10B. ORDERS HISTORY SCREEN (HÌNH 3 - TRANG ĐƠN HÀNG CỦA TÔI)
// ==========================================
function OrdersHistoryScreen({
  userId,
  orders,
  loading,
  onRefreshOrders,
  onOpenShop,
  onShowToast,
}: {
  userId: string;
  orders: DbOrder[];
  loading: boolean;
  onRefreshOrders: () => Promise<void>;
  onOpenShop: () => void;
  onShowToast: (msg: string) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<DbOrder | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    pending: "CHỜ XÁC NHẬN",
    processing: "ĐANG XỬ LÝ",
    shipped: "ĐANG GIAO",
    delivered: "ĐÃ GIAO",
    cancelled: "ĐÃ HỦY",
    returned: "ĐÃ TRẢ HÀNG",
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "returned":
        return {
          background: "#fae8e8",
          color: "#a82424",
          border: "1px solid #f3c7c7",
        };
      case "cancelled":
        return {
          background: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        };
      case "delivered":
        return {
          background: "#dcfce7",
          color: "#15803d",
          border: "1px solid #bbf7d0",
        };
      case "shipped":
        return {
          background: "#e0e7ff",
          color: "#3730a3",
          border: "1px solid #c7d2fe",
        };
      case "processing":
        return {
          background: "#e0f2fe",
          color: "#0369a1",
          border: "1px solid #bae6fd",
        };
      default:
        return {
          background: "#fef3c7",
          color: "#b45309",
          border: "1px solid #fde68a",
        };
    }
  };

  const METHOD_LABELS: Record<string, string> = {
    cod: "Thanh toán khi nhận hàng (COD)",
    bank_transfer: "Chuyển khoản",
    e_wallet: "Ví điện tử",
    credit_card: "Thẻ tín dụng",
  };

  const handleCancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      await cancelCustomerOrderInDb(orderId, userId);
      await onRefreshOrders();
      onShowToast(`Đã hủy đơn hàng #${orderId} thành công!`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: "cancelled" });
      }
    } catch (e: any) {
      onShowToast(e?.message || "Không thể hủy đơn hàng.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto relative"
      style={{ background: "#faf8f5", scrollbarWidth: "none" }}
    >
      {/* Header giống Hình 3: — LỊCH SỬ MUA HÀNG / Đơn hàng của tôi */}
      <div
        className="px-4 pt-10 pb-5 text-center bg-[#faf8f5] sticky top-0 z-10"
        style={{ borderBottom: `1px solid ${BORDER_GOLD_LIGHT}` }}
      >
        <p
          className="text-[10px] font-['Inter'] font-bold uppercase tracking-[0.22em]"
          style={{ color: "#9a6b24" }}
        >
          — LỊCH SỬ MUA HÀNG
        </p>
        <h1 className="text-2xl font-['Playfair_Display'] font-normal text-[#141210] mt-1">
          Đơn hàng của tôi
        </h1>
      </div>

      {/* Danh sách đơn hàng giống Hình 3 */}
      <div className="p-4 flex flex-col gap-3.5 pb-8">
        {loading ? (
          <div className="py-16 text-center text-xs font-['Inter'] text-[#6b6358]">
            Đang tải lịch sử đơn hàng từ Supabase...
          </div>
        ) : orders.length === 0 ? (
          <div
            className="bg-white rounded-2xl p-8 text-center shadow-2xs"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
          >
            <p className="text-base font-['Playfair_Display'] font-bold text-[#141210]">
              Bạn chưa có đơn hàng nào
            </p>
            <p className="text-xs font-['Inter'] text-[#6b6358] mt-1">
              Khám phá bộ sưu tập trang sức SaiGon Jewelry ngay hôm nay.
            </p>
            <button
              type="button"
              onClick={onOpenShop}
              className="mt-4 px-5 py-2.5 rounded-full text-xs font-['Inter'] font-bold text-white cursor-pointer active:scale-95"
              style={{ background: "#8c5e1a" }}
            >
              Mua sắm ngay
            </button>
          </div>
        ) : (
          orders.map((o) => {
            const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
            const firstItem = o.items[0];
            const summaryText = firstItem
              ? `${firstItem.productName}${
                  o.items.length > 1
                    ? ` và ${o.items.length - 1} sản phẩm khác`
                    : ""
                } (${totalQty} món)`
              : `Đơn hàng trang sức (${totalQty} món)`;
            const stStyle = getStatusStyle(o.status);

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl p-4 shadow-2xs transition-all"
                style={{
                  border: "1px solid #e2d6c1",
                }}
              >
                {/* Hàng trên: Đơn #48 · 12:21 12/11/26 + Badge trạng thái */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-['Inter']">
                    <strong className="text-[#141210] font-bold">
                      Đơn #{o.id}
                    </strong>{" "}
                    <span className="text-[#6b6358]">· {o.formattedDate}</span>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-['Inter'] font-bold uppercase tracking-wider shrink-0"
                    style={stStyle}
                  >
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                </div>

                {/* Hàng giữa: Hình ảnh thu nhỏ + Tên sản phẩm (X món) */}
                <div
                  className="flex items-center gap-3 py-3 my-2.5"
                  style={{
                    borderBottom: "1px dashed #e9e0cf",
                  }}
                >
                  <div className="flex -space-x-1.5 shrink-0">
                    {(o.items.length > 0 ? o.items.slice(0, 3) : []).map(
                      (item, idx) => (
                        <img
                          key={idx}
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-11 h-11 rounded-xl object-cover bg-[#faf8f5]"
                          style={{ border: "1px solid #e2d6c1" }}
                        />
                      )
                    )}
                  </div>
                  <span className="text-xs font-['Inter'] text-[#575047] leading-snug line-clamp-2">
                    {summaryText}
                  </span>
                </div>

                {/* Hàng dưới: Tổng tiền: 17.064.000đ + Nút XEM CHI TIẾT giống Hình 3 */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="text-xs font-['Inter'] text-[#3f3a34]">
                    Tổng tiền:{" "}
                    <strong
                      className="text-sm font-bold"
                      style={{ color: "#8c5e1a" }}
                    >
                      {formatCurrency(o.totalAmount)}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {o.status === "pending" && (
                      <button
                        type="button"
                        disabled={cancellingId === o.id}
                        onClick={() => handleCancelOrder(o.id)}
                        className="px-3 py-1.5 rounded-full text-[10px] font-['Inter'] font-bold uppercase tracking-wider cursor-pointer active:scale-95"
                        style={{
                          border: "1px solid #d4c4a8",
                          color: "#6b5327",
                          background: "#ffffff",
                        }}
                      >
                        {cancellingId === o.id ? "Đang hủy..." : "Hủy đơn"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="px-4 py-2 rounded-full text-[10px] font-['Inter'] font-bold uppercase tracking-wider text-white cursor-pointer active:scale-95 transition-transform"
                      style={{
                        background: "#141210",
                      }}
                    >
                      XEM CHI TIẾT
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Xem Chi Tiết Đơn Hàng / Hóa Đơn Điện Tử */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-[110] bg-black/55 flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-[360px] max-h-[84vh] flex flex-col overflow-hidden shadow-2xl"
            style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 bg-[#faf8f5]"
              style={{ borderBottom: `1px solid ${BORDER_GOLD_LIGHT}` }}
            >
              <div>
                <p
                  className="text-[10px] font-['Inter'] font-bold uppercase tracking-wider"
                  style={{ color: "#9a6b24" }}
                >
                  HÓA ĐƠN ĐIỆN TỬ #HD-{String(selectedOrder.id).padStart(6, "0")}
                </p>
                <h3 className="text-base font-['Playfair_Display'] font-bold text-[#141210]">
                  Đơn hàng #{selectedOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#141210] cursor-pointer"
                style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="p-4 overflow-y-auto flex flex-col gap-3"
              style={{ scrollbarWidth: "none" }}
            >
              {/* Trạng thái & Thời gian */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-['Inter'] text-[#6b6358]">
                  Thời gian: {selectedOrder.formattedDate}
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-['Inter'] font-bold uppercase"
                  style={getStatusStyle(selectedOrder.status)}
                >
                  {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>

              {/* Thông tin người nhận & Thanh toán */}
              <div
                className="rounded-2xl p-3 bg-[#faf8f5] text-xs font-['Inter'] flex flex-col gap-2"
                style={{ border: "1px solid #ebd9b5" }}
              >
                <div>
                  <strong className="text-[#141210]">Người nhận hàng:</strong>
                  <p className="text-[#3f3a34] mt-0.5">
                    {selectedOrder.cusName} · {selectedOrder.cusPhone}
                  </p>
                  <p className="text-[#6b6358] text-[11px] mt-0.5">
                    {selectedOrder.address}
                  </p>
                </div>
                <div
                  className="pt-2"
                  style={{ borderTop: "1px dashed #e2d3b5" }}
                >
                  <strong className="text-[#141210]">
                    Hình thức thanh toán:
                  </strong>
                  <p className="text-[#3f3a34] mt-0.5">
                    {METHOD_LABELS[selectedOrder.paymentMethod] ||
                      selectedOrder.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Danh sách sản phẩm trong đơn */}
              <div className="flex flex-col gap-2.5">
                {selectedOrder.items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 pb-2.5"
                    style={{ borderBottom: "1px solid #f1eadc" }}
                  >
                    <img
                      src={it.imageUrl}
                      alt={it.productName}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-[#faf8f5]"
                      style={{ border: `1px solid ${BORDER_GOLD_LIGHT}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-['Playfair_Display'] font-bold text-[#141210] truncate">
                        {it.productName}
                      </p>
                      <p className="text-[11px] font-['Inter'] text-[#6b6358] mt-0.5">
                        {it.variantLabel} · {formatCurrency(it.unitPrice)} ×{" "}
                        {it.quantity}
                      </p>
                    </div>
                    <strong
                      className="text-xs font-['Inter'] font-bold shrink-0"
                      style={{ color: "#8c5e1a" }}
                    >
                      {formatCurrency(it.subtotal)}
                    </strong>
                  </div>
                ))}
              </div>

              {/* Tổng kết tiền */}
              <div className="flex flex-col gap-1.5 text-xs font-['Inter'] pt-1">
                <div className="flex justify-between text-[#6b6358]">
                  <span>Phí vận chuyển</span>
                  <strong className="text-[#141210]">
                    {selectedOrder.shippingFee > 0
                      ? formatCurrency(selectedOrder.shippingFee)
                      : "Miễn phí"}
                  </strong>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-[#16a34a]">
                    <span>Giảm giá</span>
                    <strong>
                      −{formatCurrency(selectedOrder.discountAmount)}
                    </strong>
                  </div>
                )}
                <div
                  className="flex justify-between items-center pt-2 mt-1 text-sm font-bold"
                  style={{ borderTop: "1px solid #e9e0cf" }}
                >
                  <span className="text-[#141210]">
                    {selectedOrder.status === "returned"
                      ? "Tổng tiền hoàn trả"
                      : "Tổng thanh toán"}
                  </span>
                  <span style={{ color: "#8c5e1a" }}>
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="px-4 py-3 bg-[#faf8f5] flex items-center justify-end gap-2"
              style={{ borderTop: `1px solid ${BORDER_GOLD_LIGHT}` }}
            >
              {selectedOrder.status === "pending" && (
                <button
                  type="button"
                  disabled={cancellingId === selectedOrder.id}
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="px-4 py-2 rounded-full text-xs font-['Inter'] font-bold text-red-600 bg-red-50 cursor-pointer"
                  style={{ border: "1px solid #fecaca" }}
                >
                  {cancellingId === selectedOrder.id
                    ? "Đang hủy..."
                    : "Hủy đơn hàng"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-full text-xs font-['Inter'] font-bold text-white cursor-pointer"
                style={{ background: "#141210" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 11. BOTTOM NAVIGATION BAR (L1) - THÊM MỤC "ĐƠN HÀNG" (HÌNH 2 & HÌNH 3)
// ==========================================
function BottomNav({
  tab,
  setTab,
  unread,
}: {
  tab: "home" | "orders" | "notifications" | "profile";
  setTab: (tab: "home" | "orders" | "notifications" | "profile") => void;
  unread: number;
}) {
  const tabs = [
    { id: "home", icon: HomeIcon, label: "Trang chủ" },
    { id: "orders", icon: Package, label: "Đơn hàng" },
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
    "home" | "orders" | "notifications" | "profile"
  >("home");
  const [overlayScreen, setOverlayScreen] = useState<
    "main" | "shop" | "cart" | "order" | "product-detail"
  >("main");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );
  const [shopCategoryId, setShopCategoryId] = useState<number | null>(null);
  const [returnToShopAfterDetail, setReturnToShopAfterDetail] =
    useState<boolean>(false);

  // Supabase Store State
  const [categoriesList, setCategoriesList] =
    useState<DbCategory[]>(fallbackCategories);
  const [productsList, setProductsList] =
    useState<ProductItem[]>(fallbackProducts);
  const [favorites, setFavorites] = useState<number[]>([1, 4]);

  // Customer Auth & Session State (Supabase)
  const [currentUser, setCurrentUser] = useState<CustomerProfile | null>(null);
  const [loggedOutMessage, setLoggedOutMessage] = useState<string | null>(null);

  // Cart, Orders & Notifications State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [orderReturnScreen, setOrderReturnScreen] = useState<
    "cart" | "product-detail"
  >("cart");
  const [customerOrders, setCustomerOrders] = useState<DbOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<number[]>([5]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Load dữ liệu người dùng cụ thể từ Supabase & khôi phục trạng thái thông báo đã đọc
  const loadUserSessionData = async (uid: string) => {
    setOrdersLoading(true);
    try {
      const [profile, cart, notifs, ords] = await Promise.all([
        fetchCustomerProfileById(uid),
        fetchCustomerCart(uid),
        fetchCustomerNotifications(uid),
        fetchCustomerOrders(uid),
      ]);
      const restoredReadIds = getSavedReadNotificationIds(uid, notifs);
      setCurrentUser(profile);
      setCartItems(cart);
      setNotifications(notifs);
      setReadNotificationIds(restoredReadIds);
      setCustomerOrders(ords);
    } catch {
      // Nếu lỗi session thì để người dùng đăng nhập lại
    } finally {
      setOrdersLoading(false);
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
        appStorage.getItem("jewels_mobile_uid") ||
        localStorage.getItem("jewels_mobile_uid") ||
        localStorage.getItem("jewels_user_id");
      const loggedOutFlag =
        appStorage.getItem("jewels_mobile_logged_out") === "1" ||
        sessionStorage.getItem("jewels_mobile_logged_out") === "1";

      if (savedUid && !loggedOutFlag) {
        await loadUserSessionData(savedUid);
      } else if (!loggedOutFlag) {
        // Mặc định tự động đồng bộ tài khoản khách hàng đầu tiên trong Supabase nếu mở lần đầu tiên
        try {
          const defaultUid = "e79979c4-fcd3-48c9-b882-16f8f6ffbe2e"; // Nguyễn Văn A (vana@gmail.com)
          await loadUserSessionData(defaultUid);
          appStorage.setItem("jewels_mobile_uid", defaultUid);
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

  const handleMarkAllNotificationsRead = () => {
    const allIds = Array.from(
      new Set([...readNotificationIds, ...notifications.map((n) => n.id)])
    );
    setReadNotificationIds(allIds);
    if (currentUser) {
      saveReadNotificationIds(currentUser.id, allIds, true);
    }
  };

  const handleMarkSingleNotificationRead = (id: number) => {
    if (readNotificationIds.includes(id)) return;
    const nextIds = Array.from(new Set([...readNotificationIds, id]));
    setReadNotificationIds(nextIds);
    if (currentUser) {
      const isAllRead = notifications.every((n) => nextIds.includes(n.id));
      saveReadNotificationIds(currentUser.id, nextIds, isAllRead);
    }
  };

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
    appStorage.removeItem("jewels_mobile_uid");
    appStorage.removeItem("jewels_user_id");
    appStorage.removeItem("jewels_user_email");
    appStorage.removeItem("jewels_token");
    appStorage.setItem("jewels_mobile_logged_out", "1");
    sessionStorage.setItem("jewels_mobile_logged_out", "1");
    setCurrentUser(null);
    setCartItems([]);
    setCustomerOrders([]);
    setSelectedProduct(null);
    setOverlayScreen("main");
    setLoggedOutMessage(
      `Đã đăng xuất tài khoản ${prevName} thành công! Vui lòng đăng nhập lại.`
    );
    showToast("Bạn đã đăng xuất thành công!");
  };

  const handleLoginSuccess = async (profile: CustomerProfile) => {
    appStorage.removeItem("jewels_mobile_logged_out");
    sessionStorage.removeItem("jewels_mobile_logged_out");
    appStorage.setItem("jewels_mobile_uid", profile.id);
    setLoggedOutMessage(null);
    setCurrentUser(profile);
    setActiveTab("home");
    setOverlayScreen("main");
    showToast(`Chào mừng trở lại, ${profile.name}!`);
    try {
      const [cart, notifs, ords] = await Promise.all([
        fetchCustomerCart(profile.id),
        fetchCustomerNotifications(profile.id),
        fetchCustomerOrders(profile.id),
      ]);
      const restoredReadIds = getSavedReadNotificationIds(profile.id, notifs);
      setCartItems(cart);
      setNotifications(notifs);
      setReadNotificationIds(restoredReadIds);
      setCustomerOrders(ords);
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
            {/* Full-Screen Overlay: Shop / All Products (Hình 3) */}
            {overlayScreen === "shop" && (
              <div className="absolute inset-0 z-30 flex flex-col sm:rounded-[40px] overflow-hidden">
                <ShopScreen
                  categoriesList={categoriesList}
                  productsList={productsList}
                  initialCategoryId={shopCategoryId}
                  cartCount={cartItems.reduce((s, i) => s + i.qty, 0)}
                  onBack={() => setOverlayScreen("main")}
                  onOpenCart={() => setOverlayScreen("cart")}
                  onSelectProduct={(prod) => {
                    setSelectedProduct(prod);
                    setReturnToShopAfterDetail(true);
                    setOverlayScreen("product-detail");
                  }}
                  onAddToCart={(prod, q, v) => handleAddToCart(prod, q, v)}
                />
              </div>
            )}

            {/* Full-Screen Overlay 0: Product Detail */}
            {overlayScreen === "product-detail" && selectedProduct && (
              <div className="absolute inset-0 z-40 flex flex-col sm:rounded-[40px] overflow-hidden">
                <ProductDetailScreen
                  product={selectedProduct}
                  cartCount={cartItems.reduce((s, i) => s + i.qty, 0)}
                  onBack={() =>
                    setOverlayScreen(returnToShopAfterDetail ? "shop" : "main")
                  }
                  onOpenCart={() => setOverlayScreen("cart")}
                  onAddToCart={(prod, q, v) => handleAddToCart(prod, q, v)}
                  onBuyNow={async (prod, q, v) => {
                    const finalVariant = v || prod.variant;
                    const matchedVar =
                      prod.variantObjects?.find(
                        (vo) => vo.label === finalVariant
                      ) || prod.variantObjects?.[0];
                    const unitPrice = matchedVar
                      ? matchedVar.price
                      : prod.numericPrice;
                    const variantId = matchedVar
                      ? matchedVar.id
                      : (prod.defaultVariantId || prod.id);
                    const buyNowCartItem: CartItem = {
                      id: Date.now(),
                      variantId,
                      productId: prod.id,
                      name: prod.name,
                      price: unitPrice,
                      img: prod.img,
                      qty: q,
                      variant: finalVariant,
                      stock: matchedVar ? matchedVar.stock : prod.stock,
                    };
                    setCheckoutItems([buyNowCartItem]);
                    setOrderReturnScreen("product-detail");
                    setOverlayScreen("order");
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
                      selectedProduct
                        ? "product-detail"
                        : returnToShopAfterDetail
                          ? "shop"
                          : "main"
                    )
                  }
                  onOrder={(selectedList) => {
                    setCheckoutItems(selectedList);
                    setOrderReturnScreen("cart");
                    setOverlayScreen("order");
                  }}
                  onShowToast={showToast}
                />
              </div>
            )}

            {/* Full-Screen Overlay 2: Checkout / Order */}
            {overlayScreen === "order" && (
              <div className="absolute inset-0 z-50 flex flex-col sm:rounded-[40px] overflow-hidden">
                <OrderScreen
                  user={currentUser}
                  onBack={() => setOverlayScreen(orderReturnScreen)}
                  onGoHome={() => {
                    setSelectedProduct(null);
                    setReturnToShopAfterDetail(false);
                    setCheckoutItems([]);
                    setOverlayScreen("main");
                    setActiveTab("home");
                  }}
                  onViewOrders={() => {
                    setSelectedProduct(null);
                    setReturnToShopAfterDetail(false);
                    setCheckoutItems([]);
                    setOverlayScreen("main");
                    setActiveTab("orders");
                  }}
                  items={checkoutItems.length > 0 ? checkoutItems : cartItems}
                  onShowToast={showToast}
                  onOrderPlaced={async () => {
                    // Chỉ loại bỏ các món đã chọn đặt mua khỏi giỏ hàng
                    const purchasedKeys = new Set(
                      (checkoutItems.length > 0 ? checkoutItems : cartItems).map(
                        (i) => `${i.id}-${i.variant}`
                      )
                    );
                    setCartItems((prev) =>
                      prev.filter(
                        (i) => !purchasedKeys.has(`${i.id}-${i.variant}`)
                      )
                    );
                    setCheckoutItems([]);
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
                    setReturnToShopAfterDetail(false);
                    setOverlayScreen("cart");
                  }}
                  onSelectProduct={(prod) => {
                    setSelectedProduct(prod);
                    setReturnToShopAfterDetail(false);
                    setOverlayScreen("product-detail");
                  }}
                  onOpenShopCategory={(catId) => {
                    setShopCategoryId(catId);
                    setReturnToShopAfterDetail(true);
                    setOverlayScreen("shop");
                  }}
                />
              )}
              {activeTab === "orders" && (
                <OrdersHistoryScreen
                  userId={currentUser.id}
                  orders={customerOrders}
                  loading={ordersLoading}
                  onRefreshOrders={async () => {
                    await loadUserSessionData(currentUser.id);
                  }}
                  onOpenShop={() => {
                    setShopCategoryId(null);
                    setReturnToShopAfterDetail(true);
                    setOverlayScreen("shop");
                  }}
                  onShowToast={showToast}
                />
              )}
              {activeTab === "notifications" && (
                <NotificationsScreen
                  notifications={notifications}
                  readIds={readNotificationIds}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onMarkSingleRead={handleMarkSingleNotificationRead}
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
