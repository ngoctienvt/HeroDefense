# Thử phong cách thủy mặc tiên hiệp trên 5 tướng khác

Trạng thái: hoàn thành và đã sửa lỗi ô sprite tràn hàng. Tiếp nối [sprite top-down nhóm đầu](../261013-1845-topdown-five-hero-sprites/plan.md).

## Quyết định

- Tạo thử cho h00B Thiết Phiến, h018 Hằng Nga, h01A Tây Vương Mẫu, h01C Nữ Oa, h03W Điện Mẫu. Năm tướng này khác nhóm chibi đã làm, có trang phục, đạo cụ và năng lực dễ phân biệt.
- Dựa vào ảnh tham chiếu mới của người dùng để lấy nét vẽ mực/nước, màu ngọc lạnh, lụa nhiều lớp, tỷ lệ trưởng thành. Giữ nhận diện từng tướng từ catalog; không chép 5 nhân vật trong ảnh.
- Làm asset đi vào game: sprite sheet nền trong suốt, bốn hướng, bảy tư thế tương thích renderer hiện tại. Chỉ kiểm tra solo. Giữ nhóm chibi cũ để so trực quan.

## Thực hiện và nghiệm thu

1. Tạo sheet riêng cho 5 tướng, kiểm tra alpha, tư thế và hướng; lưu PNG nguồn cùng WebP dùng trong client.
2. Mở rộng bảng chọn motion sheet và chiều rộng đúng từng sheet; giữ atlas cũ cho 60 tướng chưa có motion và hình 3D fallback khi tải lỗi.
3. Kiểm thử ánh xạ, typecheck, build, xem ít nhất một tướng phong cách mới trong trận solo và cập nhật manifest nguồn.

Hoàn tất khi 5 sheet thực được đưa vào build; tên, HP, hitbox vẫn đúng; lối vẽ khác nhóm chibi nhìn rõ trong game.

## Kết quả

- Đã lưu 5 PNG nguồn và 5 WebP trong client; build có đủ 10 sheet chuyển động mẫu.
- Mỗi sheet mới có 28 tư thế/hướng. Renderer cắt theo rãnh alpha thực tế thay vì chia đều ảnh, nên chân nằm trong đúng frame và không còn mảnh nhân vật nổi phía trên.
- Ability event của sprite động chuyển sang tư thế cast; không đổi thời điểm tính sát thương.
- Kiểm thử client: 14/14 ngày 2026-10-14; TypeScript và build thành công. Đã xem trực tiếp Thiết Phiến ở 1920×1080: không còn mảnh thừa phía trên, chân nằm trong frame khi nhân vật ở giữa vùng nhìn.
