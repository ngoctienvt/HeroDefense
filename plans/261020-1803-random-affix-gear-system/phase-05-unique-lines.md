# Phase 5 — 17 dòng độc nhất

## File

- Mới `packages/game-core/src/gear-uniques.ts`. Module nhận callback `hurt`, không import `combat.ts`.
- Gắn vào `combat.ts` (`hurtEnemy`, `hurtUnit`, chỗ gọi `basicAttack`, cuối `combatStep`), `attack-geometry.ts` (Nghịch Thiên, báo chí mạng gốc cho Dẫn Lôi), `stats.ts` (`refreshStats`, `attackInterval`, `effectiveUnitAttack`), `simulation.ts` (`beginWave`) và `roster.ts` (Truyền Thừa).
- Mỗi lần kích hoạt cộng vào `state.gearStats` và phát event `trait` với `skillId: 'gear-<id>'` để client vẽ VFX nhẹ.

## Danh sách và cách làm

| Khe | Dòng | Luật | Gắn vào |
|---|---|---|---|
| Giáp | **Càn Khôn Đảo Chuyển** | +Công bằng 6% Máu tối đa, cộng vào Công gốc | `refreshStats`, sau khi tính Máu |
| Giáp | **Định Hải Thần Châm** | Giới hạn chặn ×3 (tướng không có chặn được tính gốc 8), miễn choáng và đẩy lùi, tốc đánh −40% (nhịp đánh ×1/0,6) | `baseBlockCap`, choáng chấn địa của boss (`combat.ts:1091`), `attackInterval` |
| Giáp | **Thời Quang Hồi Tố** | Một lần mỗi wave, khi Máu xuống dưới 20%, kể cả đòn chí tử: hồi về Máu ghi đầu wave, xóa hồi chiêu và nạp đầy Nộ | `hurtUnit`, trước kiểm tra Phượng Hoàng và tướng chết. Ghi Máu ở `beginWave` |
| Giáp | **Bát Quái Kính** | 25% chặn hoàn toàn đòn của quái đánh xa và Boss, phản 150% Công vào kẻ tấn công | Đầu `hurtUnit`; dùng `gearRandom` |
| Giáp | **Truyền Thừa Ấn** | Tướng đang mặc bị dùng làm nguyên liệu ghép hoặc hợp nhất thì món hấp thụ 15% Công và Máu **gốc** (theo bậc sao, không tính đồ) của tướng đó, lưu vĩnh viễn trên món, cộng phẳng cho người mặc. Không hấp thụ khi bán. | `releaseUnitGear` với lý do craft/merge. `refreshStats` cộng phẳng |
| Vũ khí | **Nghịch Thiên Cải Mệnh** | Đòn thường thành đòn nảy 3 lần (bán kính 5, giảm 15% mỗi lần) và bỏ qua đòn riêng của tướng. Đây chính là cái giá. | `executeAttackGeometry` nhận `context.geometryOverride` để bỏ qua nhánh tướng tự cài đòn |
| Vũ khí | **Hấp Tinh Đại Pháp** | Mỗi quái tướng mặc hạ thì món +0,12% Công, Boss tính 20 quái, trần +60%. Tướng gây sát thương chính hạ khoảng 350 quái và 9 Boss mỗi trận (≈ 530 lượt tính), nên mặc từ đầu thì chạm trần khoảng wave 40. Nhặt ở wave 20 thì cuối trận khoảng +35–40%, vẫn cao hơn dòng % Công tốt nhất (+32% ở +10). Tầng tích lưu trên món. Cường hóa không tăng phần đã tích. | Hook hạ quái. Cứ mỗi 1% tích thêm thì gọi `refreshStats` một lần |
| Vũ khí | **Huyết Khế** | Hồi máu, khiên và hút máu nhận vào giảm 60%. Mỗi 1% Máu đã mất cho +1,2% sát thương. Hồi đầy Máu đầu mỗi wave. | Bước gear cuối tick: phần Máu và khiên tăng so với `hpSeen`/`shieldSeen` chỉ giữ 40%. Hồi sinh từ 0 Máu không bị giảm. `hurtEnemy`: hệ số sát thương. `beginWave`: hồi đầy |
| Vũ khí | **Ma Tâm** | +80% tốc đánh. Mất 1,5% Máu tối đa mỗi giây khi có mục tiêu trong combat, và có thể tự làm tướng chết. | `attackInterval`. Bước gear gọi `hurtUnit` không có kẻ tấn công, để tướng chết đi đúng luồng hồi sinh, còn khiên và giảm sát thương không chặn được phần mất máu này. Cần một cờ "mất máu tự thân" để bỏ qua giáp và khiên |
| Vũ khí | **Thất Sát** | Mỗi đòn thường thứ 7 tung kỹ năng với 40% sức mạnh, không tốn hồi chiêu hoặc Nộ. Tướng không có kỹ năng thì đòn thứ 7 gây ×3 sát thương. | Sau `basicAttack`: lưu hồi chiêu và Nộ, đặt `gearCastScale = 0.4` (đọc trong `effectiveUnitAttack`), gọi `resolveAbility(…, deferred = true)`, rồi khôi phục |
| Vũ khí | **Dẫn Lôi Phù** | Mỗi đòn chí mạng (chí mạng chung của đồ và chí mạng gốc của tướng) phóng sét nảy qua 3 quái trong bán kính 5, mỗi lần 50% sát thương đòn đó | `processSingleHit` báo chí mạng vào hàng chờ `gearRuntime`. `combatStep` xử lý sau đòn đánh để tránh vòng import |
| Pháp khí | **Tọa Vong** | Không thể di chuyển, đứng như lệnh giữ vị trí. +60% tầm, +40% Công. | `refreshStats` (tầm, Công). `combatStep` ép `mode = 'hold'` và bỏ lệnh di chuyển |
| Pháp khí | **Lưỡng Nghi** | Đòn thường luân phiên: Dương +50% sát thương, Âm hồi cho tướng thấp % Máu nhất trong bán kính 8, kể cả bản thân và tướng của người chơi khác, bằng 30% sát thương gây ra | Bọc `hurt` của đòn thường |
| Pháp khí | **Thôn Thiên Hồ Lô** | Quái chết trong bán kính 6 quanh tướng mặc, ai hạ cũng được, cho 1 linh hồn. Đủ 25 linh hồn thì nổ bán kính 5, gây 60% Công × 25. | Hook hạ quái |
| Pháp khí | **Tụ Bảo Bồn** | Quái do tướng mặc hạ có 4% cho 15 Linh Thạch. Tướng −25% Công. | Hook hạ quái, `refreshStats` |
| Pháp khí | **Thiên La Địa Võng** | Quái do tướng mặc hạ để lại bẫy, tối đa 6 bẫy mỗi tướng, tồn tại 20 giây. Quái kế tiếp đi vào bán kính 1,3 bị chậm 50% trong 2 giây và chịu 80% Công, rồi bẫy biến mất. | `state.gearTraps`, bước gear |
| Pháp khí | **Phong Hỏa Luân** | Tốc chạy ×2. Mỗi 3 đơn vị di chuyển để lại vệt lửa bán kính 1,4 trong 4 giây, gây 40% Công mỗi giây. Tối đa 8 vệt mỗi tướng. | Thay `hero.speed` trong `combatStep` bằng `unitSpeed(unit)`. Vệt lửa dùng `groundEffects` với `kind: 'gear-fire-trail'` |

## Luật chung

- Mỗi món vàng có đúng 1 dòng độc nhất. Hai món cùng dòng độc nhất trên một tướng không cộng dồn.
- Sát thương sinh ra từ dòng độc nhất (sét, nổ, bẫy, vệt lửa, phản đòn) không kích hoạt lại Thất Sát, Dẫn Lôi hay Lưỡng Nghi, chỉ đi đúng một tầng.
- Bẫy, vệt lửa, linh hồn và hàng chờ sét đều có trần số lượng. Event VFX không phát cho từng tick.
- Không dòng nào gieo khống chế cứng. Chậm từ bẫy luôn trúng, giống các hiệu ứng chậm khác.

## Test (`packages/game-core/test/gear-uniques.test.ts`)

Mỗi dòng có ít nhất 1 test cho luật chính và 1 test cho giới hạn. Ví dụ:
- Hấp Tinh dừng ở 60%, và vẫn giữ tầng sau khi chuyển món sang tướng khác.
- Thời Quang chỉ kích hoạt 1 lần mỗi wave.
- Huyết Khế chỉ giữ 40% lượng hồi máu từ Support và hồi đầy đầu wave.
- Ma Tâm làm tướng chết khi Máu cạn, và tướng hồi sinh bình thường.
- Truyền Thừa không hấp thụ khi bán và không cộng dồn kiểu lãi kép.
- Tọa Vong không di chuyển kể cả khi nhận lệnh move.
- Nghịch Thiên thay đòn riêng của Bàn Cổ bằng đòn nảy.
- Thất Sát không làm mất Nộ hay hồi chiêu đang có.
- Bát Quái chỉ chặn đòn của quái đánh xa và Boss.


## Triển khai 28-10-2026

Đủ 17 độc nhất. Định Hải chỉ miễn choáng/đẩy lùi, không phạt tốc đánh; Hấp Tinh 0,25% mỗi quái, boss 20, trần 60%. Đã sửa tương tác khiên, đòn trễ, chí mạng và tính hạ quái.

- [x] Hoàn tất thay đổi nguồn của phase; đã rà tĩnh, chưa chạy kiểm thử.
