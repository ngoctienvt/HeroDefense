# Combat mượt kiểu Warcraft 3 — quái bao vây, không bị giật khi trúng đòn

Trạng thái: **đã sửa nguồn Pha 1–6 (23/10/2026)**; chưa chạy typecheck/test/build, chưa nghiệm thu trong game. Lệch so với kế hoạch: đẩy lùi vẫn dịch vị trí ngay trên server (giữ hợp đồng test hiện có), độ trượt do nội suy client tạo ra; event lấy đà dùng `cast` + `skillId: 'monster-windup'` thay vì kind mới `attack-start`; trạng thái vòng/lấy đà nằm trên `Enemy.engage`/`Enemy.windup` (có broadcast) thay vì WeakMap. Chưa làm: làm mượt gia tốc 0,1s và nhả ô khi quái bị kẹt lâu — theo dõi khi chơi thử. Chỉ số chặn/`blockBonus` tạm chỉ còn tác dụng ưu tiên mục tiêu (chờ người dùng chốt).

## Mục tiêu (acceptance)

1. Quái đang bị đánh vẫn giữ nhịp đánh/tung chiêu như bình thường; không còn pose "trúng đòn" chiếm hoạt ảnh, không bị đẩy giật mỗi đòn.
2. Quái cận chiến đông sẽ **vây quanh tướng 360°** theo vòng ở khoảng đánh; số quái đánh được cùng lúc tỉ lệ với chu vi, không chỉ 1 con.
3. Di chuyển quái liền mạch trên client: không giật theo nhịp snapshot 10Hz, không chớp walk/idle, không đổi chỗ/đổi hướng loạn khi quái xung quanh chết.
4. Server vẫn quyết định toàn bộ kết quả; client chỉ trình bày.
5. 150+ quái trong một vùng vẫn trong ngân sách tick 50ms (log `slow-tick` không xuất hiện ở fixture soak).

Ngoài phạm vi: cân bằng chỉ số, AI kỹ năng boss mới, asset sprite mới.

## Nguyên nhân hiện tại (đã đọc mã)

| # | Hiện tượng | Nguyên nhân | Vị trí |
|---|---|---|---|
| A | Quái bị đánh "giật", trông như không đánh lại | Mỗi event trúng đòn: `action='hit'` 0,2s ghi đè `attack/cast`, đẩy root 0,3 đơn vị, ability thêm `hitStop` đóng băng cả vị trí. Bị nhiều tướng đánh ⇒ gần như luôn ở pose hit | `apps/client/src/battlefield.ts:957-964`, `visual-actors.ts:250-262,299,353-355` |
| B | Quái bị lùi khỏi tầm, phải đi lại | Trait `nth_strike` đẩy lùi 0,6 mỗi đòn thứ 3 (3 profile); `knockEnemyBack` ở vùng 0 **dịch tức thời về waypoint trước của đường quái**, không phải hướng ngược người đánh ⇒ quái đuổi tướng bị kéo ngang | `packages/contracts/src/combat-profiles.ts:86,112,310`, `packages/game-core/src/combat-status.ts:33-44` |
| C | Đông quái nhưng chỉ 1 con đánh | `surroundSlotGoal` xếp hàng 5 cột phía trước (z ≤ prey.z), cách cột 3,3. Với m001: tầm với ≈ 2,95, cột ±1 cách ≈ 4,3, hàng sau +3,3 ⇒ chỉ ô giữa hàng đầu đánh được; comment cố ý chặn vòng ra sau | `crowd-movement.ts:60-72` |
| D | Quái đổi chỗ, cắt ngang nhau | `meleeTargetMap` dựng lại mỗi tick, chỉ số ô theo thứ tự duyệt ⇒ có con chết/đến nơi là cả nhóm đổi ô | `combat.ts:1041,1202-1206,1237-1246` |
| E | Mục tiêu nhảy liên tục | `enemy.target` chọn lại tướng gần nhất mỗi tick, không có độ dính | `combat.ts:1189-1202` |
| F | Đi khựng/zig-zag | `walkAroundBlockers` thử góc lệch 45/90/135° mỗi tick + soft collision đẩy 0,35/lượt; ô đích có thể nằm trong footprint con khác ⇒ dao động | `unit-pathing.ts:60-100`, `crowd-movement.ts:80-122` |
| G | Client giật theo snapshot | Snapshot 100ms, client lerp mũ `dt*11` về vị trí mới ⇒ chạy-dừng mỗi 100ms; ngưỡng `moving` chớp walk/idle | `game-room.ts:92-95`, `visual-actors.ts:250-258` |
| H | Đòn quái không có nhịp | Sát thương áp ngay khi cooldown = 0; anim attack phát sau sát thương | `combat.ts:1215-1222` |
| I | Chi phí O(N²) | Mỗi quái dựng blocker list toàn bộ + `Object.values(state.enemies)` mỗi tick | `unit-pathing.ts:43-57`, `combat.ts` vòng quái |

`hurtEnemy`/`hurtAbilityEnemy` không đụng `cooldown/target/stun`/vị trí ⇒ server không ngắt đòn quái khi trúng đòn thường; "giật" đến từ A + B.

## Pha 1 — Client: bỏ flinch, nội suy mượt (không đổi gameplay)

Files: `apps/client/src/battlefield.ts`, `visual-actors.ts`, `monster-motion.ts`, module mới `apps/client/src/actor-interpolation.ts`.

- Trúng đòn chỉ còn **flash trắng** (+ squash nhẹ không dịch vị trí, tắt khi reduced motion). Không gán `action='hit'` nếu actor đang `attack/cast/walk`; bỏ đẩy root 0,3. Áp cho cả tướng và quái.
- `hitStop` chỉ dừng clock hoạt ảnh/sprite frame, **không** dừng bắt kịp vị trí.
- Nội suy snapshot: mỗi actor giữ 2–3 mẫu `(t, x, z)`; render chậm ~110ms, nội suy tuyến tính giữa hai mẫu, ngoại suy tối đa 1 khoảng snapshot rồi giữ. Teleport (khoảng cách > ngưỡng, ví dụ 4) thì snap. Nhận timestamp phía client khi nhận snapshot (chưa cần đổi contract).
- Trạng thái `moving` lấy từ vận tốc nội suy có trễ (bật > 0,25 u/s, tắt < 0,1 u/s sau 120ms) ⇒ hết chớp walk/idle; hướng nhìn lấy từ vận tốc, khi đánh thì quay về mục tiêu.
- Attack của quái: sau Pha 5, anim lấy đà phát theo event `attack-start`, va chạm theo event `attack` từ server; thời lượng clip co theo `windup`.
- Log `visual.interp` (số snap/teleport/ngoại suy quá hạn) giới hạn tần suất qua `debugLog`.

Test (người dùng chạy): `apps/client/test/actor-interpolation.test.ts` (nội suy, ngoại suy có kẹp, snap teleport, hysteresis moving); test hit không ghi đè attack/cast.

## Pha 2 — Server: vây vòng kiểu WC3

Files: `packages/game-core/src/crowd-movement.ts`, module mới `packages/game-core/src/enemy-engagement.ts`, `combat.ts` (vòng quái gọi sang module mới).

- **Vòng tấn công**: bán kính `r = contactDistance(prey, enemy) + 0,1` (≤ attackReach). Sức chứa `floor(2πr / (2·enemyRadius + 0,2))` (m001 vs tướng thường ≈ 5–6, boss lớn hơn ít ô). Ô = góc đều quanh tướng.
- **Gán ô ổn định theo góc**: quái mới nhận ô trống gần góc tiếp cận của nó nhất; giữ ô cho tới khi đổi mục tiêu/chết/tướng dịch xa > 1,5 thì dò lại ô gần nhất. Lưu trong `WeakMap`/Map server-side (như `blockedSteps`), **không** thêm field vào `Enemy` broadcast.
- **Vòng đầy (chốt Q3)**: quái chọn tướng khác gần đó còn ô (trong aggro); nếu không có thì **tiếp tục chạy theo đường quái về Linh Trụ** (giữ `pathIndex`), mỗi 0,5s dò lại xem có ô trống trong aggro để quay vào đánh. Không đứng chờ vòng ngoài.
- **Độ dính mục tiêu**: giữ target hiện tại nếu còn sống, còn trong aggro, và mục tiêu mới không gần hơn ≥ 1,5 đơn vị; hộ vệ (guardian) vẫn được ưu tiên.
- Hộ vệ (chốt Q4): số quái vây **chỉ do chỗ trống trên vòng** quyết định. Hộ vệ vẫn được quái ưu tiên chọn làm mục tiêu khi còn ô trống; hết ô thì quái áp luật Q3 (tướng khác còn ô, không có thì đi tiếp). Con số chặn 8/12/25 và `blockBonus` không còn giới hạn số quái trong luồng vây; bỏ `guardianBlocks` khỏi vòng quái.
- Quái tầm xa: đứng dải `range*0,75..range` sau vòng cận chiến, tản theo góc; giữ logic lùi khi bị áp sát.
- Ô đích không được nằm trong footprint của quái đã giữ ô khác ⇒ bỏ dao động của pathing.
- Log `combat.engagement` mỗi wave: số quái đang đánh / chờ / đổi mục tiêu, giới hạn tần suất.

Test: `packages/game-core/test/enemy-engagement.test.ts` — 12 quái cận chiến vs 1 tướng: ≥ sức chứa vòng cùng gây sát thương trong 3s, có quái ở z > tướng.z (vòng ra sau); một quái trong vòng chết ⇒ các quái khác giữ ô; target không đổi khi hai tướng cách đều. Cập nhật `horde-waves.test.ts`, `unit-spacing.test.ts` nếu đang khẳng định đội hình phía trước.

## Pha 3 — Knockback mượt, không phá nhịp đánh

Files: `combat-status.ts`, `combat.ts`, `attack-geometry.ts`, `combat-traits.ts`, các `*-combat.ts` gọi `knockEnemyBack`.

- Đổi chữ ký `knockEnemyBack(state, enemy, amount, from)` — đẩy **ngược hướng nguồn** (fallback ngược đường quái khi không có nguồn), không về waypoint.
- Áp thành **trượt** 0,2s (state server-side, giảm dần), đi qua kẹp vùng và chặn footprint; không reset `cooldown`, không đổi `target`, ô vòng giữ nguyên.
- Trait `nth_strike` đẩy lùi (Thiết Phiến và 2 profile khác): **giữ 0,6, chuyển thành trượt mượt** (chốt Q1).
- Boss nhận **25% quãng đẩy** (chốt Q2), áp chung trong `knockEnemyBack` cho `kind === 'boss'`.

Test: hướng đẩy ngược nguồn; quái đang đánh bị đẩy 0,6 vẫn đánh ở chu kỳ kế; boss theo luật chốt.

## Pha 4 — Chuyển động & hiệu năng server

Files: `unit-pathing.ts`, `crowd-movement.ts`, module mới `packages/game-core/src/spatial-grid.ts`.

- Lưới không gian ô 4 đơn vị dựng một lần mỗi tick cho quái + tướng; blocker/soft collision chỉ xét ô lân cận ⇒ bỏ `Object.values(state.enemies)` trong vòng quái.
- Steering: ưu tiên hướng thẳng tới ô, khi bị chặn giữ **bên vòng đã chọn** trong 0,5s (không đổi bên mỗi tick); thêm lực tách nhẹ giữa các quái cùng đang đi thay cho đẩy cứng 0,35; quái đã giữ ô và đứng đánh được ưu tiên đứng yên (người đi phải vòng).
- Tốc độ quái làm mượt gia tốc ngắn (0,1s) để không bật/tắt tức thời.

Test: fixture soak hiện có (`progression.test.ts` 120 quái) + mới 150 quái một vùng: thời gian tick trung bình in ra; không quái nào chồng thân > 30% bán kính sau 5s.

## Pha 5 — Điểm sát thương quái (chốt Q5: server windup)

- Server thêm `attackWindup` (≈ 35% `attackInterval`): bắt đầu đòn → phát event `attack-start` → sau windup mới gây sát thương nếu mục tiêu còn trong tầm + 0,5; choáng/đóng băng trong windup hủy đòn. Đổi contract event, server, client cùng lúc; test hủy đòn khi choáng và nhịp DPS giữ nguyên.

## Pha 6 — Tài liệu và bàn giao

- Cập nhật `docs/gameplay-spec.md` dòng 7 (di chuyển/vây) và 44 (đẩy lùi), comment `crowd-movement.ts`.
- Bàn giao: liệt kê test mới; người dùng chạy `npm run typecheck`, `npm test`, rồi dừng server cũ → `start-game.cmd` → `Ctrl+F5`; tình huống kiểm tra: wave 1–5 để 1 tướng giữa biển quái (quái vây đủ vòng, vẫn đánh khi bị tập trung đánh), Thiết Phiến đánh liên tục (không giật), boss wave 5 (kỹ năng vẫn ra khi bị đánh).

## Thứ tự & phụ thuộc

Pha 1 độc lập (client). Pha 2 → 3 → 4 cùng sửa vòng quái trong `combat.ts`/`crowd-movement.ts` ⇒ làm tuần tự. Pha 5 sau Pha 2 (sửa cùng nhánh đánh của vòng quái) và nối client của Pha 1. Pha 6 cuối.

## Rủi ro

- Vây 360° làm tướng tầm xa bị kẹp nhanh hơn ⇒ độ khó wave đầu tăng; cần người dùng chơi thử wave 1–5.
- Đổi knockback ảnh hưởng thiết kế đã chốt (đẩy lùi thay choáng) — chỉ đổi theo câu trả lời Q1/Q2.
- Nội suy chậm ~110ms làm hiển thị trễ thêm; event VFX phải đặt theo vị trí hiển thị, không theo snapshot thô.

## Quyết định đã chốt (23/10/2026)

- Q1: giữ đẩy lùi 0,6 của `nth_strike`, chuyển thành trượt 0,2s, không ngắt đòn.
- Q2: boss nhận 25% quãng đẩy.
- Q3: vòng đầy ⇒ tìm tướng gần còn ô; không có thì chạy tiếp theo đường quái.
- Q4: quanh tướng không đủ chỗ thì quái đi tiếp; giới hạn chặn không còn quyết định số quái vây.
- Q5: server windup (đổi contract event).

## Câu hỏi còn mở

- Hệ quả Q4: hiệu ứng "+8 giới hạn chặn" của Trư Bát Giới (`blockBonus`) và chỉ số chặn trong catalog/UI mất tác dụng trong luồng vây. Khi triển khai Pha 2 cần chọn: bỏ hiển thị chỉ số chặn, hay đổi `blockBonus` sang hiệu ứng khác (ví dụ khiêu khích quái quanh đó).
- Tỉ lệ windup 35% `attackInterval` là giá trị agent đề xuất, chỉnh sau khi chơi thử.
