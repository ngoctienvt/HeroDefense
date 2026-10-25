# Chiều lưỡi rìu Bàn Cổ

Người dùng xác nhận phần còn sai là lưỡi quay về phía người, không phải hướng lên/xuống của cán. Nguyên nhân: bind đã xử lý trục dọc, chưa xoay roll của mesh bất đối xứng quanh cán.

Đã thêm half-turn cục bộ quanh trục Z nguồn trước khi đổi sang hệ bàn tay: đảo cả hai trục ngang, giữ trục cán. Đây là rotation determinant +1, không mirror. Điểm nắm, chỉnh carry cổ tay và animation giữ nguyên. Metadata ghi bladeRollDegrees180; log runtime đổi source thành user-fbx-2026-10-24-grip-up-blade-forward.

Đã xuất lại .blend/candidate, xem idle và pose bổ frame25 rồi chép vào runtime pangu.glb. Đã đọc lại transform và diff; chưa chạy test/typecheck/build/game. Test carry/up/down hiện có giữ nguyên vì trục cán không đổi. Người dùng cần dừng server → start-game.cmd → Ctrl+F5, xem mặt lưỡi khi đứng/đánh/Q và xoay camera.
