# Mở game test bằng một lần nhấp

Trạng thái: hoàn tất 2026-10-13.

## Kết quả cần đạt

Nhấp đúp `start-game.cmd` trên Windows sẽ build bản mới nhất, chạy game và tự mở trình duyệt sau khi server sẵn sàng. Nếu server đã chạy, mở lại phiên hiện có.

## Giới hạn

Giữ kiến trúc server production hiện có, mặc định cổng 2567 và hỗ trợ biến `PORT`; không thay gameplay, asset hay giao thức. Nếu thiếu npm packages thì cài theo lockfile. Không tạo server trùng khi game đang chạy.

## Thực hiện

1. Cập nhật launcher: kiểm tra Node/npm, dùng lại server game đang chạy, cài package khi thiếu, build trước khi khởi động server mới.
2. Thêm tác vụ ngắn chờ `/health` rồi mở trình duyệt và ghi log lỗi khởi động.
3. Cập nhật hướng dẫn chạy; thử build, chạy launcher và xác minh HTTP, rồi kiểm tra không còn tiến trình thử nghiệm.

## Nghiệm thu

- Một cú nhấp đúp từ Explorer mở trang game mới nhất, không cần nhập lệnh. Nếu server đã chạy, mở phiên hiện có.
- Lỗi thiếu Node, lỗi cài đặt/build hoặc cổng bận được báo rõ.
- Cửa sổ launcher giữ server sống; đóng hoặc Ctrl+C dừng server.

Đã thử nhánh khởi động mới trên cổng 2568: build qua, `/health` và trang chủ trả 200, log xác nhận browser được mở; Ctrl+C dừng server test. Nhánh server sẵn có đã mở lại trang ở cổng 2567.
