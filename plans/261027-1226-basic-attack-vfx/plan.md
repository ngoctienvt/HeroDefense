# VFX đánh thường — tướng và quái

Trạng thái: đã sửa nguồn toàn bộ 24 tướng bậc 3–4 và quái mặc skin tướng, có test hồi quy; chưa build/chạy/nghiệm thu (27/10/2026). Người dùng chốt: làm thí điểm trước rồi nhân rộng. Không tự chạy game/build/test; người dùng nghiệm thu theo mục cuối.

## Kết quả cần đạt

Mọi đòn đánh thường của tướng và quái đọc được **vật chất + kiểu đòn** (chém, đâm, đập, cắn, bắn, phóng phép) ở camera chiến đấu thật, đủ nhẹ để kỹ năng vẫn nổi hơn, và vẫn rõ khi trận đông (hàng chục đòn/giây). Hiệu ứng chỉ trình bày; sát thương, hình học đòn, chí mạng do server quyết.

Không làm: đổi gameplay/chỉ số, đổi art 3D hay sprite, VFX kỹ năng, hình lan quá phạm vi thật của đòn.

## Hiện trạng (đã đọc mã)

Đường đi của event `attack`/`trait` trong `apps/client/src/visual-effects.ts` (`show`, dòng ~398):

1. `heroKit.ability` — painter riêng từng tướng (Bàn Cổ, Cộng Công, Hậu Nghệ, Nhiên Đăng, Lục Nhĩ… mỗi người có `attack` replay `__vfxReplay(id,'attack')`). Chất lượng khác nhau, chưa ai rà lại.
2. `paintTier34Attack` (`visual-tier34-skills.ts:205`) — gom theo nhóm id: nước/lửa/sấm/đá/búa/rồng/chuông/hoa, **mọi tướng còn lại rơi vào `slash` màu ngà chung**.
3. `paintTierAttack` (`visual-tier-skills.ts:331`) — switch theo từng id, vài tướng có cầu bay + nổ, còn lại mặc định.
4. Nhánh legacy cuối `show`: `orb` + `glyph` + chồng `beam/ring/glyph` theo `event.geometry` (pierce, splash, bounce, boomerang, cleave). Chỉ là lớp phủ chung, không biết bán kính/góc thật của `AttackGeometryConfig` (`packages/contracts/src/types.ts`).
5. Quái (`showMonster`, dòng ~540): chỉ `m001` (cắn), `m002` (mũi tên xương), `m003`/`b001` (nện), `m004` (cào) có nhánh riêng; **mọi quái khác (20 tướng-địch theo wave, quái 3D riêng, boss mới) rơi vào `orb` + `slash_01` xanh xám chung**. Quái xa của tướng-địch (`monster-attack-h*`, khoảng cách > 3) dùng chung mũi tên xương.
6. Đã có: vệt vũ khí bám đầu vũ khí cho tướng 3D cận chiến (`docs/hero-3d-models.md`, "Vệt vũ khí"), `VisualMonsterProjectiles` (pool 48), `tierParticles`, `fire`, thư viện `assets/vfx-library` (`slash_01`, `spark_01`, `twirl_01`…). Hai việc cần tránh trùng: vệt vũ khí (phần thân/vũ khí) và VFX đánh thường (phần điểm chạm/đường bay).
7. Không có sự kiện windup cho đòn tướng; quái có `attackPhase: windup → strike` (`battlefield.ts` ~972–1072). Thời điểm trúng của tướng 3D lấy từ `modelAttackDuration`.

Điểm yếu cần xác nhận bằng audit (giai đoạn 0): nhiều tướng có cùng hình đánh thường; hình học đòn (quét, xuyên, nảy, đa tia) hiển thị lệch số thật; điểm phát chưa bám vũ khí/nòng; quái ngoài m001–m004 gần như không có nhận diện.

## Kết quả audit (đã đọc mã, thay phần giả định ở trên)

- Đòn đánh thường tới client là event `attack` với `skillId: trait-<hero>` (hoặc `bounce-`, `splash-`, `nth-`), mỗi mục tiêu một event, cùng `at` trong một tick; có `geometry`, `isCrit`, `source`.
- Bậc 1–2: đã data-driven (`visual-kit-recipes-tier12.ts`, có bảng định danh và test) — **không đụng**. Các mô-đun riêng bậc 3 (Bát Giới, Chung Quỳ, Phán Quan, Long Vương, Na Tra, Đát Kỷ, Ứng Long, Dương Tiễn…) không xử lý `trait-`, nên đòn đánh thường của họ rơi xuống `paintTier34Attack`.
- Trong `paintTier34Attack`, 4 tướng nước (h00J, h00Q, h00Z, h03T) vẽ y hệt nhau dù hình học khác (đơn, xuyên, đa tia); 5 tướng lửa (h00N, h03S, h00V, h00X, h010) y hệt nhau; 5 tướng (h00O, h03Q, h00S, h00U, h00Y) dùng chung vệt chém ngà.
- Lệch dữ liệu cần hỏi sau thí điểm: Trầm Hương (h03Q, tầm 7) có hình học `frontal_cleave`.

## Thí điểm (8 tướng, đã làm)

Mô-đun mới `visual-basic-attack.ts` + `visual-basic-attack-profiles.ts`, gắn vào `visual-effects.ts` trước `paintTier34Attack`; id không có profile giữ đường cũ. Dùng lại `TierSkillPainter`, không thêm hạ tầng.

| Tướng | Hình học | Kiểu | Vật chất |
|---|---|---|---|
| h00J Bát Giới | đơn | đập từ trên | nước bùn |
| h00Z Ứng Long | đa tia 3 | phi tiêu bay, mỗi tia một event | nước |
| h00Q Long Vương | xuyên 6 | giáo nước dài đúng độ dài xuyên | nước |
| h00V Na Tra | quét 180°, r3,2 | ba nhát quét lệch nhịp trên quạt | lửa |
| h00X Đát Kỷ | nảy | cung lửa hồ ly nối mục tiêu | lửa tím |
| h00N Chung Quỳ | đơn | cầu quỷ hỏa bay | linh hỏa lục |
| h00O Phán Quan | quét 180°, r2,5 | nhát bút quét | mực/vàng |
| h00U Dương Tiễn | xuyên 5,5 | đâm ba mũi | thép |

Quy tắc đã cài: quét/đâm chỉ vẽ một lần mỗi attacker mỗi tick (các event phụ chỉ có điểm trúng); chí mạng ×1,35 + chớp vàng; reduced motion chỉ còn vòng + điểm trúng; log `visual.basic.attack`.

Replay: `__vfxReplay('<id>','attack')` (cần tướng đó đang trong khu). Test: `apps/client/test/visual-basic-attack.test.ts`.

## Hoàn thiện (27/10/2026, sau khi người dùng duyệt thí điểm)

- 16 tướng bậc 3–4 còn lại có profile (thêm vật chất lá/đất/sét và `motif` Huyền ở điểm trúng); test cấm hai tướng trùng cùng hình+màu+texture.
- Quái mặc skin tướng (thủ lĩnh, tinh anh, tà linh; server không gắn `skillId` cho đòn thường): `battlefield.ts` đặt `monster-attack-<skin>` chỉ ở lời gọi `effects.show`; `showMonster` dùng hình của tướng skin (nhỏ 15%, không chí mạng, giáo không quá mục tiêu); skin chưa có profile lấy hình từ hệ + tầm + hình học (`skinnedEnemyProfile`).
- Không đổi: bậc 1–2 (bộ công thức riêng, có test định danh), bậc 5–6 (module riêng), quái gốc m001–m004/b001 (nhánh riêng sẵn). Quái 3D riêng chưa có id trong runtime nên chưa có gì để gắn.
- Chưa làm / cần quyết: bậc 5–6: đã rà code, 8 tướng (h011–h015, h03W, h01J, h041) chuyển sang profile, 18 tướng còn lại giữ module riêng — chờ ảnh replay để chỉnh; nâng cấp m001–m004/b001; Trầm Hương lệch tầm–hình học.

Bước tiếp (đã làm ở phần thí điểm; giữ để tham khảo): người dùng xem thí điểm → chỉnh kích thước/palette/nhịp trong profile → nhân rộng sang 16 tướng còn lại của nhóm bậc 3–4 (h03Q, h03S, h03T, h00S, h00Y, h010, và các nhóm motif) rồi bậc 5–6 sau audit từng tướng.

## Nguyên tắc thiết kế

- Mỗi đòn có tối đa 3 lớp nhỏ: **phát** (mũi vũ khí/nòng/tay), **đi** (cung chém, đường bay, vệt đâm), **trúng** (hình va chạm đúng vật chất + vài mảnh). Dư âm chỉ khi vật chất cần (băng, cát, nhựa, lửa nhỏ). Lớp chính còn đọc được khi bỏ hạt phụ.
- Kích thước ≈ 25–40% kỹ năng cùng tướng; sáng/additive chỉ cho phần phát sáng, phần đặc dùng alpha có bóng tối để không thành mảng trắng trên nền sáng. Không che tướng, mục tiêu, thanh máu.
- Chí mạng = biến thể của cùng hình (to hơn, thêm mảnh/tia, nhịp trúng nặng hơn), không phải hiệu ứng khác.
- Hình học đòn lấy từ dữ liệu thật: quét theo `radius/angle`, xuyên theo `length`, đa tia theo `shots`, nảy theo `bounceRadius/bounces`, boomerang có đi và về.
- Quái dùng bảng màu và hình thù riêng theo thân thể (cắn, vuốt, nện, húc, mổ, đuôi chích, phun, bắn), nhìn khác tướng; có khớp với pha `windup → strike`.
- Ngân sách: cap theo loại, pool, giới hạn spawn/frame, giảm lớp phụ khi đông (LOD theo số đòn đang sống), reduced motion chỉ giữ vòng/điểm trúng ngắn, `visual.*` log vừa đủ, dọn khi đổi trận/khu.

## Giai đoạn

### 0. Audit và chốt danh sách (làm trước, chưa sửa mã)

- Lập `roster.md` trong thư mục plan: 70 tướng + toàn bộ quái/boss, mỗi dòng gồm id, vai trò, tầm, `attackGeometry`, trait đánh thường, painter đang sở hữu (riêng / tier34 / tier / legacy), điểm chất lượng 0–2, kiểu đòn đích và bảng màu.
- Chụp ảnh replay `?debug=1` hiện tại (người dùng chạy) để có chứng cứ "trước" cho các nghi vấn ở trên; không kết luận hình khó đọc khi chưa xem ảnh.
- Chốt gói kiểu đòn dùng chung (khoảng 8–10): chém cung, chém dọc, đâm/xuyên, đập/nện, đạn phép, tên, cầu nước/lửa, sét, đòn thuật bay, cắn/vuốt, mổ/húc, đuôi chích.
- Tiêu chí ra: người dùng duyệt roster và danh sách kiểu đòn.

### 1. Lõi dùng chung `visual-basic-attack*`

- Module mới (kebab-case, mỗi file < 200 dòng): bảng profile data-driven theo id (kiểu đòn, palette, kích thước, tốc độ bay, hình trúng, biến thể crit), một runner dùng lại `tierParticles`, `beam`, `spawn`, `VisualMonsterProjectiles` mở rộng thành đạn đa kiểu (tên, cầu, sét, phi tiêu), pool/cap.
- Hợp đồng với `show`: `show` hỏi runner trước nhánh legacy; tướng có painter riêng tốt (qua audit) giữ nguyên và chỉ được gọi runner khi cần lớp chung (crit, hình học). Gỡ dần nhánh `slash` mặc định của tier34 và `orb/flare` legacy khi mọi tướng đã có profile.
- Lớp hình học: cung quét/tia/chùm/nảy/quay về dựng từ `AttackGeometryConfig` thật; mở rộng đường event hoặc snapshot phía client chỉ nếu thiếu dữ liệu (nếu cần thêm trường vào contract thì tách sang bước riêng và hỏi người dùng).
- Neo phát: dùng điểm vũ khí/nòng đã có của mô hình 3D (`visual-hero-model.ts`), fallback về tay/ngực; không trùng vệt vũ khí hiện có.
- Test hồi quy: định tuyến id → profile (không còn id rơi vào fallback), cap/pool/cleanup, reduced motion, hình học khớp config.

### 2. Tướng theo lô (mỗi lô: sửa → rà tĩnh → người dùng nghiệm thu rồi mới sang lô sau)

- Lô A — cận chiến carry/warrior/guardian (chém quét, nện): ưu tiên vì xuất hiện nhiều nhất.
- Lô B — xạ thủ và pháp sư tầm xa (tên, đạn phép, xuyên, đa tia, nảy).
- Lô C — support/guardian/tướng có trait đánh thường đặc biệt (nhảy, hút, đánh dấu, hồi máu theo đòn): chỉ làm phần đánh thường, không đụng kỹ năng.
- Lô D — tướng đã có painter riêng (Bàn Cổ, Cộng Công, Hậu Nghệ…): đối chiếu với tiêu chuẩn mới, chỉ sửa chỗ lệch kích thước/độ đọc, không viết lại.
- Mỗi tướng: cập nhật dòng `roster.md`, thêm vào danh sách replay `__vfxReplay(id,'attack')` nếu chưa có.

### 3. Quái và boss

- Nhóm theo thân thể thay vì từng con: thú (cắn/vuốt), humanoid vũ khí, nện/húc, bay (dơi/chim), côn trùng/bò sát (đuôi chích, mổ), thủy sinh, linh thể, boss. Mỗi nhóm có profile + palette thù địch.
- Bao phủ quái cũ m001–m004 + b001 (nâng cấp), 20 tướng-địch theo wave (cận/xa), quái 3D riêng và boss mới theo `plans/261027-1118-monster-3d-master-references`. Chỉ làm cho id đang có trong runtime; id kế hoạch chưa có trạng thái gameplay thì để trống và ghi chú.
- Đạn quái xa: thay mũi tên xương duy nhất bằng đạn theo loại (xương, độc, lửa, sét…), vẫn ≤ 48 đồng thời.
- Khớp `windup → strike`: VFX trúng đúng event `attack`; không vẽ vùng/damage mà server không có.
- Boss đôi/nhóm: một cue chính mỗi event.

### 4. Hoàn thiện và bàn giao

- Rà tĩnh toàn tuyến event → profile → spawn → cleanup; log `visual.basic.*` vừa đủ (không tên người chơi/token).
- Cập nhật `docs/vfx-assets.md` (bảng đánh thường theo nhóm) và mục liên quan trong `docs/hero-3d-models.md`; nguồn/giấy phép cho mọi texture mới theo mục VFX của AGENTS.md.
- Lệnh kiểm tra cho người dùng (chưa chạy): `npm test -- apps/client/test/battlefield-effects.test.ts` cùng test mới của lõi, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`; `?debug=1` replay từng tướng/quái ở nền sáng/tối, đội đông, 4 hướng camera, tốc độ 1×/2×/4×, buff tốc đánh, crit, reduced motion.

## Rủi ro

- Spam hiệu ứng khi nhiều tướng đánh nhanh: bắt buộc cap + LOD, đo FPS do người dùng.
- Hình đánh thường lấn át kỹ năng: giữ ngưỡng kích thước/độ sáng, chốt bằng ảnh thật.
- Trùng với vệt vũ khí hoặc painter riêng: phân vai rõ (vệt = thân vũ khí, VFX = phát/đi/trúng).
- Thiếu dữ liệu geometry ở event: có thể cần chạm contract; dừng và hỏi trước khi đổi.

## Câu hỏi mở

1. Phạm vi: làm cả 70 tướng theo lô A→D, hay chọn trước một nhóm (ví dụ chỉ bậc 3–4 như đợt trước)?
2. Hình chính của nhóm đánh thường: chấp nhận dựng bằng mesh/decal/particle + thư viện hiện có (nhanh, nhẹ), hay muốn flipbook mới (Blender/ảnh) cho một số kiểu đòn?
3. Quái: muốn bao phủ cả 20 tướng-địch theo wave và boss mới ngay, hay chỉ quái/boss đã có model 3D riêng?
4. Nếu phải thêm dữ liệu vào contract/event (bán kính, điểm trúng, số tia) thì có đồng ý đổi hợp đồng mạng không?
