# Bàn Cổ — FBX người dùng

Outcome: dùng đúng Walking.fbx và Standing Melee Attack Downward.fbx mới cung cấp, gắn rìu Bàn Cổ vào tay và thay GLB game.
Constraints: giữ skin/animation nguồn; không dùng rig/chuyển động tự dựng bị từ chối; idle tĩnh, server/gameplay không đổi; không chạy test/build/game.
Acceptance: source FBX lưu đầy đủ; shared rig khớp; walk in-place giữ nhịp; rìu bám tay khi đi và bổ; idle/attack chuyển hợp lý; GLB giữ clip contract và runtime picking/HP/cleanup.
Scout: hai FBX cùng Mixamo rig, 96.909 vertices/mesh, texture nhúng 2048; walk 1–32, attack 1–69, 30fps. Pipeline heo có mẫu ghép action cùng rig. Renderer Bàn Cổ đã đọc idle/walk/attack, cần rà timing dài hơn animation cũ.
Plan reviewed: thay script animate-pangu hiện có bằng converter nguồn FBX; xuất candidate, xem render trước khi chép runtime. Không chạm luật chơi.

- [x] Ghép nguồn và gắn rìu theo bàn tay.
- [x] Rà render chu kỳ đi/đánh, timing/idle, xuất runtime.
- [x] Cập nhật test nguồn/tài liệu, static review.
- [ ] Người dùng chạy typecheck/test/build/game và nghiệm thu.

Delivery: `pangu.glb` 4.848.428 byte, rig Mixamo 33 xương, 2 mesh, idle/walk/attack. Rìu gắn RightHand, frame 19 giơ và frame 25 bổ. Animation window bám attackInterval/speed để không bị reset trước impact ở 4×. Chưa chạy game/build/test.

Fix carry: người dùng báo đầu rìu cầm ngược; đã chỉnh rotation cổ tay carry + blend về pha bổ nguồn, xuất lại runtime. Xem [báo cáo](../reports/fix-261024-1316-pangu-axe-grip.md). Số byte lần xuất đầu ở trên là lịch sử; số mới trong runtime-export.json.
