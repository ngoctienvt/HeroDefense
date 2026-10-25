# Bàn Cổ cầm ngược đầu rìu

Người dùng xác nhận: đầu rìu chúc xuống, đuôi cán hướng lên khi cầm. Outcome: đầu rìu hướng lên trong idle/walk, vẫn giơ/bổ đúng chiều. Không đổi gameplay, không chạy game/build/tests.

Nguyên nhân: bind theo trục -X bàn tay để khớp pha bổ của FBX nhưng rotation cổ tay ở carry lại hướng trục đó xuống. Đảo riêng geometry toàn clip sẽ làm pha bổ sai.

Sửa nguồn: `pangu-weapon-grip.py` chỉnh rotation bàn tay mang rìu đến shaft world hướng lên, giữ vị trí cổ tay; animation gốc thân/chân/vai/khuỷu giữ nguyên. Blend sửa ở đầu/cuối attack, giữ native frame17–32. Idle lấy từ carry đã sửa, walk duy trì shaft hướng lên. Rìu vẫn skin theo tay, không lật vũ khí độc lập.

Sản xuất đã xuất lại .blend/GLB và chép candidate vào runtime pangu.glb. Log production: minimum carry up Z ~0.989759 ở toàn32 khung walk và pose idle. Đã xem render idle, walk9, raise19, impact25; đầu rìu hướng lên khi cầm, pha bổ xuống giữ nguyên. Có test hồi quy đọc rotation/hierarchy trực tiếp từ GLB cho idle,32 frame walk,raise/impact; chưa chạy test.

Đã đọc lại nguồn, rà binding/palm position và keyframe fade; chưa chạy typecheck/test/build/game, chưa nghiệm thu trực tiếp trong game. Người dùng dừng server → start-game.cmd → Ctrl+F5, kiểm tra đứng/đi/đánh/Q. Test: `npm test -- apps/client/test/visual-pangu-model.test.ts`.
