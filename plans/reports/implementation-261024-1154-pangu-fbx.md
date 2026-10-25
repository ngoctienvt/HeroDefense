# Bàn Cổ dùng hai FBX mới

- Đã chép nguyên bản Walking.fbx và Standing Melee Attack Downward.fbx vào `assets/3D model/pangu/animation-source/`, lưu hash trong runtime-export.json.
- Giữ rig/skin Mixamo nguồn, đối chiếu rest matrices của cả 33 bone trước khi ghép. Walk 32 khung, attack 69 khung ở 30fps. Idle là pose tĩnh từ đầu attack. Loại bỏ net root drift, giữ sway/transferred weight.
- Rìu GLB gốc skin vào mixamorig:RightHand, shaft -X, grip [0,3.5,0] trong local FBX. Đã xem render frame giơ/bổ từ trước và bên, cùng contact sheet toàn walk/attack. Bộ Rigify tự dựng bị thay thế.
- Xuất `.blend`, candidate trong thư mục asset nguồn; đã chép GLB mới vào `apps/client/public/assets/models/pangu.glb`: 4.848.428 byte, 2 mesh, 33 joint, texture embedded1024, 29.723+11.992 tam giác. Runtime không tải candidate.
- Điều chỉnh pose lấy đà 18/68, impact24/68. Tối đa .85s cho đòn ở 1×; thời gian giới hạn 95% attack interval tính từ snapshot và chia game speed; walk dt theo game speed. Gameplay/server không đổi.
- Review phát hiện fixed .85s làm đòn reset trước impact ở4×; đã sửa và thêm regression scenarios cho1×/2×/4×, interval .9/.45/.18. Lượt static review sau không tìm thêm lỗi cụ thể.
- Đã rà nguồn/diff whitespace và đọc cấu trúc GLB. Chưa chạy test/typecheck/build/game, chưa nghiệm thu FPS hoặc hình ảnh thực. Preview là render Blender; vẫn cần kiểm tra xuyên áo/giáp do vũ khí riêng và camera game.

Người dùng: xem lệnh trong `docs/pangu-3d.md`; dừng server cũ → `start-game.cmd` → Ctrl+F5. Thử đi/dừng, đánh/Q, 1×/2×/4×, buff tốc đánh, reduced motion, HP/chọn tướng và rời trận.
