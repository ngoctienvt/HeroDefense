# Hoàn thiện tướng Linh và Huyền

Trạng thái: đã bổ sung VFX riêng cho 12 chiêu Huyền sau phản hồi chất lượng; chờ người dùng chạy kiểm tra hình ảnh và test theo `AGENTS.md`.

## Kết quả cần đạt

- 8 tướng Linh dùng chỉ số và đặc tính đánh thường theo bản mô tả, không có kỹ năng chủ động hoặc thời gian lấy đà.
- 12 tướng Huyền dùng chỉ số, kỹ năng, trạng thái và thông số theo bản mô tả; mô phỏng do server quyết định.
- Client hiển thị đúng thông tin, hành động và VFX từ sự kiện chiến đấu; giữ giới hạn hiệu ứng và chế độ giảm chuyển động.
- Catalog tiếp tục được tạo từ nguồn, giữ nguyên danh tính và công thức ghép lấy từ map.

## Thực hiện

1. Khai báo dữ liệu thiết kế bậc 1–2 trong nguồn và cập nhật extractor/contract.
2. Bổ sung đặc tính đánh thường, các trạng thái và biến thể kỹ năng trong game-core.
3. Cập nhật HUD, animation và VFX theo sự kiện server.
4. Viết test hồi quy cho hành vi trọng yếu, đọc lại code và hướng dẫn người dùng tự chạy kiểm tra.
5. Thay VFX chung bằng chuỗi riêng theo chiêu và vị trí mục tiêu thực; giữ lốc nảy Thiết Phiến, quét thương lửa và các chiêu hộ vệ/hồi máu dễ nhận biết.

## Rủi ro và giới hạn

- Kỹ năng là thiết kế riêng của bản web, không được nhận là kỹ năng gốc Warcraft.
- Tệp mô tả không có tên trước từng mục; ánh xạ theo ID và thứ tự roster/công thức ghép hiện có.
- Agent không chạy game, typecheck, build hay test theo `AGENTS.md` của dự án.
