# Triệu hồi theo gói và cửa hàng Linh Đan

Trạng thái: đã sửa mã, contract, giao diện, test hồi quy và tài liệu; chờ người dùng chạy kiểm tra theo quy định dự án.

## Outcome

Thay cửa hàng tướng hiện tại bằng ba gói triệu hồi dùng Đạo Duyên và cửa hàng Linh Đan. Tướng nhận được tích lũy không giới hạn để dùng trong bảng ghép; chỉ 5 tướng được triển khai.

## Constraints

- Xác suất, mở khóa wave, pity, thưởng trượt và giá đúng yêu cầu người dùng.
- Server quyết định kết quả và kiểm tra mọi lệnh. Không sửa catalog sinh tự động.
- Linh Phôi thay đúng một nguyên liệu cùng bậc trong một công thức; phôi bậc 4 mua tối đa một lần mỗi trận.
- Không chạy game, test, typecheck hay build trong tác vụ này theo AGENTS.md.

## Non-goals

- Không đổi thưởng wave, trang bị, chiến đấu, công thức map hoặc tài nguyên Linh Thạch ngoài việc bỏ đổi lượt cửa hàng.

## Steps

1. Đổi contract/state và luật triệu hồi, pity, Linh Đan, lựa chọn, Linh Phôi. Bỏ cửa hàng tướng và giới hạn dự bị.
2. Đổi kiểm tra lệnh ở server và giao diện Chiêu Mộ, Ghép Tướng, tài nguyên.
3. Cập nhật test hồi quy và docs gameplay/README; đọc lại luồng lệnh và diff mã.

## Acceptance

- Gói 2/4/8 Đạo Duyên mở ở wave 1/6/15, rơi đúng bậc và tỷ lệ; gói 3 không ra bậc 5.
- Pity độc lập cho gói 2/3; trượt nhận tướng bậc 1 và 1/3 Linh Đan.
- Thành công gói 2/3 cho chọn một trong ba tướng khác nhau cùng bậc; các lệnh khác không làm mất lựa chọn đang chờ.
- Linh Đan đổi rương/phôi theo giá 2/5/12/25; rương cho chọn bất kỳ tướng cùng bậc. Phôi được tiêu đúng một đơn vị khi ghép và không làm mất nguyên liệu khác.
- Không còn mua tướng trực tiếp hay đổi lượt bằng Linh Thạch.

## Validation

Đọc lại mã và kiểm tra nhất quán contract → server → core → client → docs/tests. Người dùng tự chạy `npm run typecheck`, `npm test`, `npm run build` và thử trong game.
