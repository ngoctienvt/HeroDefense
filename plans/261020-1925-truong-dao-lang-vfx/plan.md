# Trương Đạo Lăng — VFX mới

## Nâng chuẩn Cộng Công (Claude, 20-10-2026)

Review trước đó: thiếu tụ lực (shader rim đứng im `uTime=0`), va chạm chỉ một vòng vàng, trận kiếm giữ/rút gần như tĩnh, ấn đất chỉ phủ r≈6,75, buff chỉ là kiếm tĩnh. Đã sửa, giữ nguyên 5 kiếm/sheet đã chọn và lựa chọn kiếm vẽ trên quái:
- `visual-truong-dao-lang-array.ts` (mới): windup = viền r9 sáng dần + xoáy, ấn phóng to/xoay, kiếm tụ trên cao, hạt băng hút vào; vùng = kiếm đập xuống có overshoot, giữ alpha .72 để quái bị đóng băng vẫn đọc được, rút = kiếm bay lên + mờ; lớp băng `kitCrust` r9 loang từ tâm, vỡ ở .35 s cuối kèm mảnh băng. Ấn đất phủ đủ bán kính 9 (`SEAL_GROUND_SIZE`).
- `visual-truong-dao-lang-accents.ts`: `shock` = sét trời giữa tâm + hit lớn + vòng xung băng nở tới r9 + mảnh băng ở tâm và mép; mỗi tia sét có đầu lao từ trời xuống (UV reveal, không kéo giãn ảnh, không dùng rotation billboard), có mảnh băng; chuỗi đòn thường thêm hit nhỏ ở mỗi mắt xích.
- `visual-truong-dao-lang-blessing.ts` (mới): buff = vòng vàng xoáy nhanh dưới chân + kiếm Bắc Đẩu quay quanh nhanh + tia lóe; ảnh `shared-haste-mark.png` là icon UI nền trắng nên không dùng.
- `KitPainted.mapUvs` (kit) cho dải xoay/lộ dần; pool painted 200.
- Browser (dev riêng 5180/2580, `__vfxReplay('h040')`): đã xem lưới skill ở 60 fps (tụ → đập → băng → giữ → rút → sạch), sét đứng thẳng lao xuống, buff vòng + kiếm quay; không log lỗi shader/asset/cap. Chưa xem: reduced motion, trận đông có quái thật, chuỗi đòn thường (pane bị ẩn, 1 fps), nền tối.
- Luật (người dùng hỏi, 20-10): vùng Bắc Đẩu mới tạo trong bước server không còn bắn bù tia sét cho thời gian trước khi nó tồn tại (`stepTruongBolts` bỏ bước sinh ra). Trước đó bước 0,35 s nã 2–3 tia ngay khung va chạm, ở 4× tốc độ cũng bị. `truong-dao-lang-combat.test.ts` pass. Toàn game-core từ 76 xuống 75 fail, không thêm lỗi mới. Test chung `combat.test.ts` h040 (đòi trúng máu ngay khi hết windup) đã fail từ trước, chưa sửa.
- `battlefield-effects.test.ts`: bộ dựng Battlefield thiếu `truongStatus` (phụ thuộc h040 mới) → bổ sung.
- Test: `truong-dao-lang-vfx.test.ts` thêm pose/ice/seal/bolt UV. Đã chạy: vitest 5 file VFX/kit pass; 1 test gameplay `truong-dao-lang-combat.test.ts:22` fail (quái giữa mất máu ngay bước windup) — lỗi luật có sẵn, chưa sửa. tsc: không lỗi trong file đã sửa; sửa `truong-dao-lang-combat.ts` TS7022 (chú thích kiểu). Lỗi tsc khác thuộc file khác.

Outcome (người dùng sửa/chốt 20-10-2026): dùng đúng sheet `tier56-codex-art/raw/beidou-seven-swords-sheet.png` và toàn bộ asset h040 đã tạo cùng đợt; giữ gameplay/server. Người dùng chọn giữ hình sheet, chấp nhận năm kiếm nhìn rõ thay vì dựng lại bảy kiếm. Không thay bằng bộ generate mới khác.

Sửa theo ảnh trong game (20-10-2026): người dùng yêu cầu thu nhỏ và tránh quái che kỹ năng. Đã edit sheet được chọn thành `raw/array-air.png` (cùng nhận diện/năm kiếm, bỏ nền vàng), giữ raw gốc. Pháp trận nguồn v4 nằm riêng trên đất, tồn tại suốt snapshot vùng; cụm hình .75, bán kính gameplay9 và shader viền phạm vi giữ nguyên. Array atlas tăng288→384px, không phóng bbox từng frame. Array/hit chuyển SpriteManager sang plane atlas UV; sét/array/hit ở pass1, quái0, tướng/đồng minh2, HP/mana3. Giữ depth địa hình cho pass1/2; material foreground ALWAYS nhưng không ghi depth. Ground không vẽ đè quái. Đây là thay đổi lớp hiển thị chung actor/health, cần người dùng kiểm tra cả tướng khác.

Xác minh lượt sửa ảnh: xem contact sheet mới và ảnh ghép tĩnh có quái, review độc lập không phát hiện lỗi cụ thể. Đã viết test draw-group/UV/grid + size/gameplay radius, chưa chạy theo quy định. Không khởi động hoặc dừng server/game. Kiểm tra người dùng: `npm run typecheck`; `npm test -- apps/client/test/visual-kit-draw-order.test.ts apps/client/test/truong-dao-lang-vfx.test.ts apps/client/test/visual-kit-manifests.test.ts`; launcher mới/Ctrl+F5; xem lúc đông quái, các góc camera, HP/mana, reduced motion, đổi vùng và nhiều người thi triển.
Constraints: không chạy game/build/test; không sửa thay đổi có sẵn. Non-goals: cân bằng hoặc sửa luật.

| Event/snapshot | Báo trước → hành động → va chạm → dư âm |
|---|---|
| cast skill-h040 (.35s) | pháp trận rỗng tâm, Bắc Đẩu bảy điểm; không cho kiếm chạm trước ability |
| ability skill-h040 / ground beidou | sheet nguyên bản: va chạm4–7 → giữ8–11 theo remaining2.5s → thu12–15; không giả rằng pose lặp đã sửa thành chuyển động mượt |
| bolt-h040 (21 tia tối đa, .1s) | hình sét riêng vào điểm event → impact nhỏ → tắt; không nổ lan giả |
| trait-h040 (tối đa 6 mục tiêu) | bùa/nối theo thứ tự targets; không splash |
| thunderBlessing snapshot / blessing-hit-h040 | bùa bám đồng minh còn buff; sét bồi nhỏ theo event |

Acceptance: asset alpha sạch có nguồn/prompt; pooling/cap; thứ tự vẽ sau nền trước actor; reduced motion tĩnh còn phạm vi; timeline và routing có regression test; đọc lại mã. Chất lượng trong game chờ người dùng nghiệm thu.

Kit: đã thêm pool plane texture màu dùng chung (ground/billboard/link), tránh nhân bản painter từng tướng.

Kết quả hiện tại: đủ5 asset riêng inventory (sheet kiếm, lightning, hit, sword-v3, ground-v4) và2 shared status (freeze/armor). `active-inventory.json` ghi nguồn, các atlas đã đóng và xem contact sheet. Haste mark mới nằm trong kế hoạch, chưa có raw, buff dùng kiếm cùng bộ. Bộ generate nhầm ngừng tải runtime. Test bổ sung timeline array8/16frames, trạng thái thực/provenance kết thúc, chain/replay21tia và hủy khi clear. Không chạy test/build/game theo quy định. Chất lượng trong game chờ người dùng.

Review lần sửa này: sửa cắt sheet không đều để giữ đầy đủ nền vàng; giữ canvas/anchor chung; sửa cast đa người theo source, retry ảnh tải muộn; marker tách freeze/sunder và yêu cầu snapshot, xóa provenance khi status đã thấy kết thúc. Reviewer độc lập đã rà; hai finding đã xử lý. Chưa compiler/test nên không xác nhận pass.

Bàn giao: reviewer đã đọc lại hai bản sửa và không còn finding cụ thể. Đã xem đủ contact sheet array/hit/freeze và reference-light/dark mới, ImageMagick xác nhận RGBA cả7 texture, git diff --check không lỗi whitespace (chỉ cảnh báo LF→CRLF). Chưa test/typecheck/build/game; không chạy process nền nào. Cần người dùng nghiệm thu qua launcher mới, replay h040, trạng thái thật, reduced motion, góc camera và trận đông. Giữ giới hạn sheet gốc theo lựa chọn đã chốt.

Lịch sử lượt đầu (đã bị thay thế theo lựa chọn trên): tạo5 texture mới khác; dùng kit + snapshot buff + chain targets. Không có process game/server được khởi động.

Review: scout → review → sửa routing chuỗi h040 và cleanup đường nối sao → đọc lại mã. Kiểm tra thực thi để người dùng chạy: `npm run typecheck`; `npm test -- apps/client/test/truong-dao-lang-vfx.test.ts apps/client/test/visual-hero-adapters.test.ts apps/client/test/visual-kit-manifests.test.ts`; dừng server cũ → `start-game.cmd` → Ctrl+F5. Debug `__vfxReplay('h040')`, kind `attack`/`blessing`; rà đủ 21 tia, 7 kiếm, bùa theo buff, reduced motion và đổi vùng.

Review độc lập (ak-code-review): đã đọc lại các file h040/kit-painted và integration; không phát hiện lỗi nguồn cụ thể khác sau hai sửa trên. Đã bổ sung test helper chain giữ toàn bộ thứ tự targets, bỏ actor mất dấu, fallback target và pin kết nối battlefield → effects.show. `git diff --check` phần liên quan không báo lỗi whitespace; có cảnh báo Git LF→CRLF. Chưa chạy test hoặc compiler nên không coi review là chứng minh runtime/typecheck pass.
