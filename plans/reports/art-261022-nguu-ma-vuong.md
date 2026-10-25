# Ngưu Ma Vương h00P — tuyệt kỹ địa chấn hắc kim

Status: DONE_WITH_CONCERNS — xong nguồn/asset/rà mã; chưa thực thi test/typecheck/build/game.

## Cơ chế thật và triển khai

`tier3-combat.ts` h00P đánh350% Công trong R5,5 quanh caster,×2 nếu enemy đã slow/burn (không có eventflag). Sau hit còn sống: knockback1,5, slow50%/1,8s từ rework. Không stun/bodyenlarge; eventtargets đều enemy, vị trí client có thể đã knockback. Không đổi gameplay/contracts/đòn thường hoặc module tướng trước.

4 pha: sừng khí/đá tụ đúng windup (hiện0,25s) + cố định viềnR5,5 → một hoof contact0,06s/quake0,8s tại caster → dust0,55s + đá thật có trọng lực + dấu đất0,7s trên targets thật →9 gai nội vùng (trồi0,24s, giữ0,72s, chìm0,52s với delay/size khác nhau) và fissure nguội1,65s. Gai là trang trí, không tự phát hit/pulse/zone. Slow dùng marker snapshot chung.

Charge core uTime/alpha/scale cập nhật mỗi tick, giữ cuối tới windup+0,3s rồi watchdog thu khi thiếu ability. Dust head phải theo vector origin→victim thật; overlap/mất caster bỏ directional dust nhưng giữ local material hit. Không suy crit/execute từ target HP/slow/burn ở client.

## Art và đo lại anchor

- 5 nguồn Codex có sẵn, raw/hash/prompt/route/sourceStatus/sourceWarning nguyên ở `active-inventory.json`. Không hình chính mượn Bàn Cổ hoặc phép chung; không tạo art mới.
- `process-art.py`: alpha<16 bỏ, common canvas/row anchor từng sheet, resize premultiplied. Charge hàng500, chân474/805; quake hàng330/650/960; hit470, chân438/835; spike chân1192. Cờ BLOCKED_ART charge/hit giữ lịch sử margin. Alpha mạnh biên ngoài cả5 raw bằng0; contact sáng/tối đã xem đủ pose, không thấy thiếu silhouette do tràn lưới danh nghĩa.
- Reviewer phát hiện anchor đáy sàn làm vòng quake lệch caster. Đã xem raw đo riêng **ring centers240/535/820/1095**, so với bottom291/594/895/1168. Re-anchor commoncanvas (mới0,679191), giữ đủ silhouette raised rocks, repack quake và xem contact sau sửa. Không fit bbox perframe.
- Runtime không dùng horizontal-only radius: convex hull mọi alpha>0/full texel corners +padding1px; `quakePlaneSize` theo camera elevation thật để cả painted burst trong projected circleR5,5. Fissure radialEdge0,497008. Spikes upright billboard world, các cụm bất quy tắc ở nội vùng, clip UV/geometry tại chân nên trồi/chìm không squash và không bay vương miện mép.
- Particle chip64×64 là viên đá tách nguyên RGBA từ quake frame1 rect195/159/213/181, có nguồn/hash trong inventory; đã xem riêng. Không có nguồn ngoài/giấy phép mới.

| Asset | Pixel | Bytes |
|---|---|---|
| charge |1536×768|255398|
| quake |1536×1536|323174|
| fissure |768×768|126132|
| spike |768×768|49148|
| hit |1536×768|255076|
| chip |64×64|3366|

5 atlas1.008.928bytes, cùng quality90/depthWritefalse; tổng kèmchip1.012.294bytes. Đã xử lý/pack asset, chưa build game.

## Tích hợp/rà mã và chưa chạy

Đã nối HeroVfx registry/replay/modernlist h00P và palette/spray riêng `nguumavuong`. Cap cast8/shock8/hit64/painted192, spray220/queue130. Primary charge/quake/hit foreground dưới heroes/HP; fissure/spike world. Reduced giữ size/pose/point tĩnh và alpha thu, bỏ quét/trồi/chìm/hạt;3 gai tĩnh. Clear reset dust quaternion, trả layer/plane, xóa delayed/replay/particle. Debug visual.nguu-ma-vuong.{layout,cast,resolve,replay}, kit load/cap.

Regression đã viết: routing giữ prior heroes, caster-center/aim khác/victims thật đã knockback, no customzone/status/crit, exactwindup hold/watchdog source,5 camera elevation hullR≤5,5, ring-center khác bottomfloor, irregularclusters trong vùng, staticreduced, dustcardinal/overlap, một impact duy nhất, manifest/chipprovenance/pass/UV/cleanup. Reviewer rà cuối: DONE, không finding mở.

Không chạy test/typecheck/build/game/browser/server. Người dùng chạy `npm test -- apps/client/test/visual-nguu-ma-vuong.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → Ctrl+F5. Replay tại ?debug=1: `__vfxReplay('h00P')`, syntheticTargets chỉ client.

Rà chéo ngày23-10: nhánh không có hướng trước đây chỉ còn spray/dấu đất, thiếu hình vật chất dù báo cáo đã yêu cầu local material hit. Đã thêm quake nhỏ tại đúng target (2,2 đơn vị, không có trục bay), chạy đoạn đá vỡ của atlas riêng; reduced giữ pose5. Regression nguồn mới kiểm hình vật chất + ground + spray khi không reduced, cùng thu hồi. Chưa thực thi.

Unresolved: cần nghiệm thu ringcenter/phạm vi ở camera thật, sắc nét với nền sáng/tối/trận đông/nhiều caster, dust theo knockback, reduced, cleanup đổi khu/4 người/FPS. Giữ cờ source BLOCKED_ART lịch sử; chỉ xong nguồn, dừng ở h00P.
