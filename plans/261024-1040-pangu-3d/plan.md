# Bàn Cổ 3D thử nghiệm

Outcome: thay tướng Bàn Cổ h01B bằng model người dùng cung cấp, có rig, rìu gắn tay, walk và attack thật; idle tĩnh.
Constraints: Babylon/TypeScript hiện có; gameplay/server không đổi; không chạy game/build/test. Giữ nguồn và .blend; không sửa model gốc Downloads.
Non-goals: thay tướng khác, đổi kỹ năng/VFX, nghiệm thu hình ảnh trong game.
Acceptance: GLB có skin + idle/walk/attack, rìu theo tay, walk in-place liên tục, attack lấy đà/bổ/thu; tải lỗi có fallback/log; HP/picking/cleanup giữ hoạt động.

Scout: game Babylon.js 9.30, TypeScript strict. `visual-pig-model.ts` là mẫu container cache/instance/clip sampling; `visual-actors.ts` quản lý pose và HP. Nguồn Pixal3D là hai mesh T-pose ~200k mặt, không có skin/animation. Không đổi contracts.

Plan reviewed against source: reuse loader pattern, separate Pangu module; do not touch pig animation behavior.

- [x] Rig và animation Blender, tối ưu GLB, lưu nguồn/render tham khảo.
- [x] Tích hợp model h01B, idle/facing/clip/HP/fallback/cleanup, debug.
- [x] Viết test hồi quy (chưa chạy), static review, tài liệu.
- [ ] Người dùng chạy typecheck/test/build và nghiệm thu trong game.

Review: phát hiện cast→attack reset pose; đã sửa giữ đỉnh windup và tiếp tục strike từ .4. Nguồn + GLB đã xuất, chưa đồng nghĩa phiên game đã build/cập nhật.
