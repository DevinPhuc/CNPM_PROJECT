# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Khách hàng mua lẻ trang sức trực tuyến (Client Storefront):** Người dùng tìm kiếm, tra cứu thông số kim hoàn (chất liệu vàng 14K/18K/24K, bạc 925, kim cương tự nhiên, ngọc trai Akoya, kích thước, mã kiểm định GIA), đặt mua sản phẩm, áp mã khuyến mãi, thanh toán và theo dõi hóa đơn điện tử / tiến trình giao hàng.
- **Quản trị viên & Nhân viên vận hành cửa hàng (Admin ERP/POS):** Người dùng nội bộ quản lý toàn diện quy trình nghiệp vụ cửa hàng: danh mục sản phẩm & biến thể, tồn kho, phiếu nhập hàng, nhà cung cấp, đơn đặt hàng, hóa đơn GTGT, chương trình khuyến mãi, hồ sơ nhân sự/khách hàng, phân quyền tài khoản, xử lý yêu cầu mở khóa tài khoản và xem báo cáo thống kê doanh thu.

## Product Purpose

Jewels là hệ thống thương mại điện tử và quản trị nghiệp vụ ngành hàng trang sức cao cấp, đồng thời đóng vai trò là đồ án / hệ thống mẫu chuẩn mực về Công nghệ phần mềm (CNPM). Sản phẩm giúp số hóa khép kín vòng đời giao dịch kim hoàn: từ khâu nhập kho từ nhà cung cấp, định giá bán theo tỷ lệ lợi nhuận, trưng bày bán lẻ trực tuyến, xuất hóa đơn tài chính điện tử cho đến đối soát trạng thái đơn hàng và thống kê báo cáo.

Thành công của sản phẩm được đo bằng tính minh bạch, chính xác của dữ liệu nghiệp vụ giữa hai phân hệ (`client/` và `admin/`), luồng mua sắm – quản trị mượt mà không đứt gãy, và khả năng phản ánh tức thời các thay đổi trạng thái (tồn kho, khóa tài khoản, đơn hàng mới) theo thời gian thực.

## Positioning

Hệ thống thương mại điện tử kim hoàn tích hợp đầy đủ quy trình chuẩn Công nghệ phần mềm (CNPM) từ storefront khách hàng đến ERP/quản trị kho & hóa đơn: quản lý sản phẩm đến từng biến thể vật lý (chất liệu, đá quý, kích thước, mã kiểm định độc lập), tính giá và tồn kho tự động từ phiếu nhập hàng, phát hành hóa đơn GTGT điện tử có đọc số tiền bằng chữ tiếng Việt và đóng dấu trạng thái pháp lý (đã thanh toán, thu hồi/hoàn tiền, hủy bỏ), kết hợp đồng bộ trạng thái thời gian thực qua Server-Sent Events (SSE).

## Operating Context

- **Phân hệ Khách hàng (`client/`):** Duyệt danh mục và bộ lọc khoảng giá, xem chi tiết biến thể và chứng thư kiểm định, quản lý giỏ hàng, thanh toán đa phương thức (COD, VietQR, Ví điện tử MoMo/VNPay/ZaloPay, Thẻ quốc tế Visa/MasterCard/JCB), quản lý sổ địa chỉ, theo dõi tiến trình đơn hàng 4 bước (`pending` → `processing` → `shipped` → `delivered`), hủy đơn khi chờ xác nhận và xem/in hóa đơn GTGT điện tử.
- **Phân hệ Quản trị (`admin/`):** Vận hành trên bảng điều khiển 11 phân mục nghiệp vụ: Tổng quan (`#overview`), Quản lý tài khoản & vai trò (`#accounts`), Hồ sơ nhân viên (`#staff`), Hồ sơ khách hàng (`#customers`), Danh sách sản phẩm (`#products`), Danh sách hóa đơn (`#invoices`), Khuyến mãi (`#promotions`), Đơn đặt hàng (`#orders`), Nhập hàng (`#stock`), Nhà cung cấp (`#suppliers`), và Thống kê & Báo cáo (`#analytics`).
- **Tương tác liên phân hệ thời gian thực:** Khi quản trị viên khóa tài khoản, duyệt yêu cầu mở khóa, cập nhật sản phẩm hoặc thay đổi trạng thái đơn hàng/hoàn tiền, phân hệ khách hàng nhận sự kiện qua SSE (`/api/realtime`) để cập nhật giao diện hoặc thu hồi phiên đăng nhập ngay lập tức.

## Capabilities and Constraints

- **Kiến trúc & Công nghệ:**
  - Frontend: HTML5, CSS3 và Vanilla JavaScript thuần (không dùng framework frontend biên dịch), tích hợp chuyển trang mượt kiểu SPA trên phân hệ khách hàng (`client/js/app.js`).
  - Backend: Node.js + Express (`server/index.js`, `server/admin-routes.js`, `server/realtime.js`) phục vụ cả REST API (`/api/*`) và file tĩnh tại cổng mặc định `3000`.
  - Cơ sở dữ liệu: Supabase (PostgreSQL) bật Row-Level Security (RLS) chặn truy cập trực tiếp từ trình duyệt; toàn bộ truy vấn dữ liệu đi qua backend sử dụng `SUPABASE_SERVICE_ROLE_KEY` và xác thực bằng JWT (`jsonwebtoken`, `bcryptjs`).
- **Quy tắc tài chính & đơn hàng cố định:**
  - Ngôn ngữ hiển thị: Tiếng Việt (`vi-VN`).
  - Đơn vị tiền tệ: Đồng Việt Nam (`VNĐ` / `đ`), kèm hàm đọc số tiền thành chữ tiếng Việt chuẩn hóa đơn tài chính (`docSoThanhChu`).
  - Thuế giá trị gia tăng (VAT): Cố định `8%` tính trên tổng tiền hàng sau khi trừ khuyến mãi.
  - Phí vận chuyển: Mặc định `30.000đ`, miễn phí vận chuyển (`0đ`) cho đơn hàng có giá trị từ `10.000.000đ` trở lên.
- **Quy tắc nghiệp vụ & bảo mật tài khoản:**
  - Email đăng ký tài khoản khách hàng bắt buộc theo cú pháp `@gmail.com`; mật khẩu tối thiểu 6 ký tự; độ tuổi khách hàng chuẩn hóa từ đủ 18 tuổi trở lên.
  - Tài khoản bị khóa bởi quản trị viên sẽ bị chặn thao tác tức thời và chỉ được gửi tối đa 1 yêu cầu xin mở khóa cho mỗi lần bị khóa.
  - Phiên làm việc gắn với `SERVER_INSTANCE_ID` để kiểm soát tính toàn vẹn phiên khi khởi động lại máy chủ.

## Brand Commitments

- **Tên thương hiệu:** Jewels — Cửa hàng trang sức & phụ kiện cao cấp.
- **Giọng điệu (Voice):** Sang trọng, chuẩn mực, minh bạch về thông số kiểm định trên bề mặt khách hàng; rõ ràng, chính xác về thuật ngữ kế toán – kho vận trên bề mặt quản trị.
- **Tài sản thương hiệu hiện có:** Logo chính tại `shared/images/main-logo.png`, bộ ảnh sản phẩm trang sức tại `shared/images/products/`, bộ biểu tượng điều hướng quản trị tại `shared/images/Icons/`.
- **Bản quyền giao diện gốc:** Tôn trọng ghi chú bản quyền mẫu gốc TemplatesJungle trong `docs/readme.txt` ở những nơi còn sử dụng tài nguyên gốc.

## Evidence on Hand

- **Dữ liệu và tài nguyên thực tế trong kho mã:**
  - Bộ ảnh chụp sản phẩm trang sức thực tế tại `shared/images/products/` (`nhan-vang-18k.jpg`, `nhan-vang-18k-detail.jpg`, `nhan-cuoi-14k.jpg`, `day-chuyen-bac.jpg`, `lac-tay-vang-24k.jpg`, `bong-tai-ngoc-trai.jpg`) và `shared/images/product-item1..12.jpg`.
  - Dữ liệu danh mục, biến thể, tồn kho, đơn hàng, hóa đơn, phiếu nhập kho và nhà cung cấp được lưu trữ trực tiếp trên cơ sở dữ liệu Supabase.
  - Các cam kết dịch vụ đã xác nhận: kiểm định GIA / đá quý thiên nhiên, bảo hành làm mới trọn đời, giao hàng niêm phong bảo hiểm, mã ưu đãi thành viên mới `WELCOME10`.
- **Giới hạn không được tự bịa đặt:** Không tự ý thêm các chứng nhận pháp lý ngoài ngành, đối tác kiểm định giả định hoặc các cổng thanh toán chưa có trong danh mục 4 phương thức đã hỗ trợ (`cod`, `bank_transfer`, `e_wallet`, `credit_card`).

## Product Principles

1. **Minh bạch từng biến thể kim hoàn:** Mọi quyết định mua hàng của khách đều dựa trên thông số rõ ràng của từng phiên bản (chất liệu, đá quý, kích thước, mã kiểm định và số lượng tồn kho thực tế).
2. **Chuẩn mực chứng từ và dòng tiền:** Mọi giao dịch đặt hàng, áp mã giảm giá, tính thuế VAT 8%, phí vận chuyển và hoàn tiền/hủy đơn đều phải khớp số liệu tuyệt đối giữa giỏ hàng, hóa đơn GTGT điện tử và sổ cái quản trị.
3. **Đồng bộ tức thời giữa Quản trị và Khách hàng:** Thay đổi nghiệp vụ từ phía Admin (khóa/mở khóa tài khoản, cập nhật tồn kho, duyệt đơn, hoàn trả hàng) phải phản ánh ngay lập tức sang trải nghiệm của Client mà không cần tải lại trang thủ công.
4. **Tách biệt rõ vai trò nhưng thống nhất nguồn sự thật:** Giao diện khách hàng ưu tiên cảm xúc tôn vinh vẻ đẹp chế tác và sự an tâm khi mua sắm giá trị cao; giao diện quản trị ưu tiên tốc độ tra cứu, kiểm soát quy trình CNPM và độ chính xác vận hành, nhưng cả hai cùng đọc/ghi trên một mô hình dữ liệu chuẩn duy nhất.
