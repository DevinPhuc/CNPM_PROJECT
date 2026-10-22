# Jewels - Cửa hàng trang sức (CNPM_PROJECT)

## Cấu trúc thư mục

```
CNPM_PROJECT/
├─ client/            Giao diện khách hàng (HTML thuần + JS)
│  ├─ home.html, shop.html, product.html, cart.html,
│  │  checkout.html, orders.html, user.html
│  ├─ css/store.css   Style dùng chung cho mọi trang khách hàng
│  └─ js/
│     ├─ app.js       Lõi: API, đăng nhập, header/footer, toast
│     └─ pages/       Script riêng của từng trang
├─ admin/             Giao diện quản trị (đăng nhập, dashboard)
├─ server/            Backend Node.js + Express (API + phục vụ file tĩnh)
│  ├─ index.js        Toàn bộ API: auth, sản phẩm, giỏ hàng, voucher, đơn hàng
│  └─ .env            Khóa Supabase (tự tạo từ .env.example, KHÔNG commit)
├─ shared/            Tài nguyên dùng chung: Bootstrap, style gốc, ảnh, logo
├─ docs/              Tài liệu
└─ _legacy/           File cũ/không còn dùng (template gốc, mock đăng nhập localStorage)
```

## Chạy dự án

1. `cd server`
2. Sao chép `.env.example` thành `.env`, điền `SUPABASE_SERVICE_ROLE_KEY` và `JWT_SECRET`.
3. `npm install` (lần đầu) rồi `npm start`.
4. Mở http://localhost:3000 (khách hàng) hoặc http://localhost:3000/admin/login.html (quản trị).

Cơ sở dữ liệu nằm trên Supabase; toàn bộ bảng bật RLS chặn truy cập trực tiếp từ trình duyệt,
nên mọi thao tác dữ liệu đi qua backend.