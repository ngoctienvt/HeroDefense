# Quái xuất hiện, di chuyển và giao chiến rõ ràng

- **Trạng thái:** đã sửa nguồn, atlas giữ nguyên; chờ người dùng chạy kiểm tra và nghiệm thu trong game.
- **Mục tiêu:** quái sinh theo đội hình có khoảng cách, không chồng footprint khi di chuyển/giao chiến; ưu tiên tướng gần nhất trong tầm phát hiện, giữ vai trò Hộ Vệ/Chiến Binh hút quái khi ở gần tương đương. Mọi đơn vị đang hiện diện, gồm tướng và triệu hồi, cần khoảng cách khi triển khai, đi theo nhóm và cùng đánh một mục tiêu.
- **Ràng buộc:** server quyết định vị trí và sát thương; giữ số lượng, chỉ số, làn và thời lượng wave; bảo toàn thay đổi chưa commit; không tự chạy game/build/test theo AGENTS.md.
- **Ngoài phạm vi:** tạo lại tranh quái, thay kỹ năng boss hoặc sửa hệ thống chiến đấu của tướng.
- **Bước:** rà atlas và footprint → chặn spawn khi cửa làn chưa trống → tách va chạm và phân bố vị trí áp sát → ưu tiên mục tiêu gần → tách tướng và nới đội hình → thêm test hồi quy, đọc lại diff và tài liệu.
- **Chấp nhận:** các vị trí spawn có khoảng cách tối thiểu; quái cùng/khác làn không xuyên chồng tại điểm hội tụ; tướng gần hơn được ưu tiên khi hợp lệ; tướng và đơn vị triệu hồi cùng vùng được tách theo footprint; sprite và footprint tương xứng; không thay public contract.
- **Kiểm tra người dùng:** chạy `npm run typecheck`, `npm test`, `npm run build`, khởi động lại `start-game.cmd`, làm mới trình duyệt và xem wave 1, 4, 5 trên 1–4 làn.
