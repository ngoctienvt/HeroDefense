# Bàn Cổ 3D thử nghiệm

- Đã chép hai GLB nguồn người dùng, rig 17 xương, skin weight mượt theo vùng cơ thể; rìu skin vào tay phải. Lưu `.blend`, script và metadata nguồn.
- GLB runtime 4.820.956 byte, tổng 35.768 tam giác, texture 1024, clip idle/walk/attack. Đi in-place, đứng im, bổ rìu có lấy đà/thu thế.
- Tướng h01B dùng model trong `visual-actors.ts`; module riêng tải/cache/instance, heading, HP, picking, hit-stop, reduced motion, log và cleanup. Quái heo, tướng khác và contracts/gameplay giữ đường hiện có.
- Review độc lập tìm lỗi cast→attack reset pose; đã sửa giữ axe ở .4 và tiếp tục strike. Test hồi quy bổ sung nhưng chưa chạy.
- Review tiếp tìm khoảng trống cast → idle → attack do snapshot: tách `pangu-model-motion.ts`, giữ pose chờ tối đa .5s, hủy khi di chuyển/hành động khác/timeout; thêm test chuyển trạng thái thực.
- Đã xem render idle, một số pose đi/đánh và contact sheet toàn chu kỳ từ Blender. Preview `../261024-1040-pangu-3d/pangu-motion-preview.gif`; không phải capture trong game.
- Blender bone heat thất bại trên surface nguồn: chuyển sang anatomical weights. Lần nén JPEG đầu gặp thư mục temp bị chặn: chuyển temp vào thư mục asset trong workspace, xuất thành công. Cảnh báo thumbnail ngoài workspace không ảnh hưởng `.blend`/GLB. Exporter cảnh báo nhiều node texture; cần đối chiếu vật liệu thực trong game.
- Đã đọc lại nguồn và rà diff whitespace; chưa chạy typecheck/test/build/game, chưa nghiệm thu FPS/hình ảnh. Cần xem cổ tay/vai/tóc/giáp và độ trượt chân trong game trước khi coi đây là rig hoàn thiện.

Người dùng: `npm run typecheck`; `npm test -- apps/client/test/visual-pangu-model.test.ts apps/client/test/visual-pig-model.test.ts apps/client/test/pangu-motion.test.ts apps/client/test/hero-skinned-enemy.test.ts`; dừng server → `start-game.cmd` → Ctrl+F5. Kiểm tra đi/dừng tám hướng, đánh liên tiếp, Q, HP/chọn tướng, reduced motion, chết/rời trận. Hướng dẫn: `docs/pangu-3d.md`.
