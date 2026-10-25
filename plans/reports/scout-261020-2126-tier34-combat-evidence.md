# Chứng cứ combat tuyệt kỹ bậc 3–4 cho lô ảnh Codex

Ngày 20-10-2026. Nguồn đọc: `packages/game-core/src/tier3-combat.ts`, `tier4-combat.ts`, `tier-skill-pulses.ts`, `combat.ts`, `attack-geometry.ts`, `ally-scaled-support.ts`, `packages/contracts/src/types.ts`, `content/tier3-tier4-design.ts`, `content/tier3-tier4-rework.ts`. Đây là chỉ mục tìm nguồn; trước khi tạo prompt, đối chiếu lại mã hiện tại. Mã thắng mô tả.

## Cảnh báo chung

- `vfxDirection`/`skillEffect` trong `content/tier3-tier4-brief.json` là bản **trước rework 19-10-2026**. Nhiều khống chế cứng đã thành làm chậm/đẩy lùi. Không dùng các câu "choáng", "trói chân", "đóng băng", "khiêu khích", "hóa khổng lồ" của brief khi mã không còn.
- Mọi tuyệt kỹ phát một event `kind: 'ability'`, `skillId: 'tier3-tier4-<heroId>'`, có `x/z` = điểm aim, `direction` = hướng caster→aim, `targets` = danh sách `affected/ids` (nghĩa khác nhau theo tướng, xem bảng).
- Server broadcast nguyên `this.game` (`apps/server/src/game-room.ts`), nên mọi field trạng thái dưới đây đọc được ở client. Không có event cho chia sát thương liên đới, phản đòn `reflect`, nạp Nộ của La Hán và +25 Linh Thạch của Triệu Công Minh.
- `pureLand` (`{remaining, bonusDamage}`) là field chung cho "quái nhận thêm sát thương": do vùng `tier-fire`/`tier-gold` làm mới mỗi 0,2s và do `amplifyEnemyDamageMax` (Đát Kỷ) đặt.
- `attackWeak` (`{remaining, strength}`) là field chung "quái giảm Công".
- Khiên: `shield` (plain, không timer), `tierShield` (`kind 'water'`, 5s), `tierGoldShields[]` (5s mỗi nguồn). Tất cả dùng shield chung của lô bậc 5–6.

## Bậc 3

| Tướng | Hình dạng/vị trí | Kết quả server | `targets` của event | Event/snapshot phụ |
|---|---|---|---|---|
| h00J Trư Bát Giới | Tròn R5 quanh **caster** | Đẩy lùi 0,35; `blockBonus` +8 trong 5s; `shield` + `tierShield{kind:'water', remaining:5}` | Quái bị đẩy | Hết hạn/vỡ khiên → `kind:'trait'`, `skillId:'water-shield-burst-h00J'`, tại caster, R5, 220% + slow 50% 3s. **Không có taunt.** |
| h00K Sa Ngộ Tịnh | Tối đa 3 đồng minh thấp máu nhất trong R8 quanh caster, **trừ caster** | Hồi; `ward{remaining:4, reduction:.3}`; giảm 2s hồi chiêu | Người nhận | Không event riêng cho giảm hồi chiêu. |
| h00L Tiểu Bạch Long | Đường thẳng dài 12 × rộng 3,5 từ caster | 310%; quái **đã** có poison/slow nhận slow 60% 2s | Quái trúng | **Không root.** |
| h00M Tinh Vệ | Barrage tại aim R5,5: 8 nhịp trong 2s | Mỗi nhịp chọn ngẫu nhiên một quái làm tâm, trúng R1,25 quanh tâm; slow 40% 2s; lần trúng thứ 3: slow 70% 1,6s + sunder 6 Giáp 3s | **Rỗng** | Mỗi nhịp: `kind:'trait'`, `skillId:'tier3-tier4-pulse-h00M'`, `x/z` = tâm, `targets`. Nhịp không có quái thì **không phát event**. **Không stun.** |
| h00N Chung Quỳ | Tròn R5,2 tại aim | 280%; `silence` 3s qua `tryHardControl` (chỉ khi roll thành công); vùng `groundEffects kind:'tier-fire'` R5,2, 4s, 90%/s, đặt `pureLand` +20% | Quái trúng | Triệu quỷ tốt `tier3-tier4-summon-h00N` thuộc nội tại đốt chết — **ngoài lô**. |
| h00O Phán Quan | Nửa tròn phía trước: R4,8 và trong dải dài 4,8 rộng 9,6 | 340%; sát thương chuẩn nếu mục tiêu <35% Máu (không có cờ trong event); 5 quái đầu nhận `soulLink{remaining:4, group, sharePercent:.4}` | Quái trúng (thứ tự server) | Chia sát thương liên đới không phát event. |
| h00P Ngưu Ma Vương | Tròn R5,5 quanh caster | 350%, ×2 nếu quái đang slow/burn (không có cờ chí mạng trong event); đẩy lùi 1,5; slow 50% 1,8s | Quái trúng | **Không stun, không phóng to 25%.** |
| h00Q Long Vương | Đường thẳng dài 10 × rộng 6 từ caster | 270%; đẩy lùi 2,5; quái đã slow → `frozen` 2s qua `tryHardControl`; vùng `tier-water` **tại aim** R5, 4s, 60%/s, slow 50% | Quái trúng | Vùng nước ở aim, không ở cuối đường sóng. |
| h03Q Trầm Hương | Tròn R5 tại aim; đồng minh R6 quanh caster | 300% + sunder 35% 5s; đồng minh: hồi + `empower` +20% 5s | **Chỉ quái** | Người nhận buff đọc từ snapshot `empower`; không có trong `targets`. |
| h03R Khổng Tước | Mọi đồng minh R9 quanh caster | Hồi; `stun = 0`; `haste` +30% 5s; `tierBuff{kind:'poison', remaining:5}` | Đồng minh | Khi `tierBuff.kind==='poison'`, đòn đánh của đồng minh gắn `poison` lên mục tiêu (`attack-geometry.ts`). |
| h03S Triệu Công Minh | Đường thẳng dài 8 × rộng 2; đồng minh R8 có `block>0` | 220% + `attackWeak` 30% 4s; đồng minh: `shield` **plain, không timer** | **Trộn**: id quái trúng rồi id đồng minh nhận khiên | +25 Linh Thạch không có cờ trong event. |

## Bậc 4

| Tướng | Hình dạng/vị trí | Kết quả server | `targets` của event | Event/snapshot phụ |
|---|---|---|---|---|
| h00R Tôn Ngộ Không | Đường thẳng dài 9 × rộng 3 | 380% + sunder 30% 4s + slow 50% 1,5s; xóa phân thân cũ; tạo **2** unit `summonKind:'monkey-clone'` tại aim ±1,6 trên trục x, `summonDuration` 6 | Quái trúng | Đòn phân thân: `kind:'attack'`, `skillId:'monkey-clone-h00R'`, quét phía trước R3,2. Thân phân thân dùng atlas h00R. **Không stun.** |
| h00S Đường Tăng | Tròn R6 tại aim | 410%; `stun` 1,2s qua `tryHardControl`; vùng `tier-gold` R6, 4,5s, slow 50%, `pureLand` +25% | Quái trúng | Không có hút 8% Máu nữa. |
| h00T Lôi Chấn Tử | Barrage tại aim R6,5: 10 nhịp trong 2,5s | Mỗi nhịp trúng R1,5 quanh một quái ngẫu nhiên; gắn `burn` sát thương chuẩn 3s | **Rỗng** | `tier3-tier4-pulse-h00T` mỗi nhịp có quái. **Không stun, không vùng điện trên đất** (burn nằm trên quái). |
| h00U Dương Tiễn | Đường thẳng dài 12 × rộng 3 | 320% sát thương chuẩn; `berserk{remaining:6, attackSpeed:.9}`; `empower{armorPierce:.4}` 6s; xóa stun | Quái trúng | Khi `berserk`: đòn thường thành `multishot` 3 + `double_strike` xuyên 40% (`attack-geometry.ts`). Event `pet-h00U` thuộc nội tại chó — **ngoài lô**. |
| h00V Na Tra | Quái trong R6 quanh aim, sắp theo khoảng cách; 8 lần đánh lặp vòng `index % n` | 300% + nổ hết burn còn lại; `empower` +60% 5,5s; `tierBuff{kind:'nezha', remaining:5,5}` | Id quái theo thứ tự đánh, **có thể lặp** | Khi `nezha`: đòn thường quét 360° R5; hào quang lửa nội tại mở rộng R5 (`aura-fire-h00V`). |
| h00W Lý Tịnh | Tròn R6 tại aim; đồng minh R8 quanh caster | 280% + slow 50% 4,5s + `attackWeak` 50% 4,5s; đồng minh: `shield` + `tierGoldShields` 5s | Quái trúng rồi đồng minh nhận khiên | **Không stun, không ground effect** cho tháp; thời gian 4,5s chỉ là thời hạn trạng thái trên quái. |
| h00X Đát Kỷ | Tối đa 7 quái trong (tầm đánh + 5) quanh caster, ưu tiên boss rồi gần aim | 310%; đẩy lùi 1,8; slow 80% 1,8s; sunder 40% 4s; `pureLand` +25% 4s | Quái theo thứ tự chuỗi | Không có trạng thái "mê hoặc" riêng trong snapshot. |
| h00Y Ngũ Đạo Tướng Quân | Tối đa 8 quái trong R6,5 tại aim | 250%; `soulLink{remaining:5, sharePercent:.5}` cho nhóm; mọi đồng minh: `haste` +45% 5s; `berserk.lifesteal` 15% 5s | Quái trúng | **Không có ground effect** cho bánh xe; thời gian sống theo `soulLink`. |
| h00Z Ứng Long | Tròn R6,5 tại aim; barrage 8 nhịp trong 4s | Ngay khi cast: slow 70% 2,2s + sunder 30% 4s; mỗi nhịp trúng **mọi** quái trong R6,5 | Quái bị trạng thái lúc cast | `tier3-tier4-pulse-h00Z`, `x/z` là một quái ngẫu nhiên (không phải tâm vùng). **Không freeze.** |
| h010 Xích Tùng Tử | Tối đa 4 đồng minh thấp máu nhất R8,5, trừ caster; mọi đồng minh cùng khu | Người nhận: hồi + `shield`/`tierGoldShields` 5s + `stun=0` + `tierBuff{kind:'fire'}` 5s; mọi đồng minh `empower` +30% 5s | 4 người nhận | Khi `tierBuff.kind==='fire'`: đòn thường gắn `burn`, +25% sát thương chí mạng, liên tục xóa stun. |
| h03T Tịnh Đàn Sứ Giả | Quái R5,5 quanh caster; đồng minh R5,5 | Quái bị dời tức thời tới điểm cách caster 1,8 theo hướng aim; 240% + `attackWeak` 40% 5s; đồng minh: `shield` + `tierGoldShields` 5s + `ward` 40% 5s + `reflect{amount:.6}` | **Trộn**: id quái trúng rồi id đồng minh nhận khiên | `reflect` mất khi `shield<=0`; phản đòn không phát event. |
| h03U Kim Thân La Hán | Tối đa 4 đồng minh thấp máu nhất R8,5, trừ caster | Hồi + `tierImmortal{remaining:4, activeRemaining:0}` | Người nhận | Khi tụt về 1 Máu: `kind:'trait'`, `skillId:'immortal-h03U'`, `activeRemaining` 2s. Nạp +35 Nộ/−3s hồi chiêu cho đồng minh Công cao nhất **không có event/người nhận**. |
| h03V Bát Bộ Thiên Long | Đường thẳng dài 13 × rộng 5,5 | 370% + slow 70% 2,2s; bản thân `haste` +50% 4s | Quái trúng | **Không root.** Mô-típ "ba rồng" chỉ là hình. |

## Hạn chế cho tích hợp

- Field dùng chung nhiều nguồn: `reflect` cũng do khiên phản đòn bậc 2 đặt (`combat.ts`, nhánh `effect.reflect`, ví dụ Kim Tra h009); `berserk` cũng do Ngũ Đạo h00Y tạo cho đồng minh chưa có. Aura riêng tướng phải bật theo ability event của chính tướng đó, không chỉ theo field.
- **Hiệu ứng phụ gameplay cần người dùng xem:** cổng `attack-geometry.ts` là `heroId === 'h00U' && unit.berserk`, và `combat.ts` xóa choáng của h00U khi có `berserk`. Vì h00Y tạo `berserk{attackSpeed:0, lifesteal:.15}` cho mọi đồng minh, buff Ngũ Đạo cũng bật bắn ba tia + đánh đôi xuyên 40% + miễn choáng cho Dương Tiễn mà không cần tuyệt kỹ của Dương Tiễn. Lô ảnh không sửa gameplay; chỉ ghi nhận.

- Không vẽ hiệu ứng kết quả không có chứng cứ: chí mạng Ngưu Ma, sát thương chuẩn Phán Quan, +25 Linh Thạch, nạp Nộ La Hán, phản đòn Tịnh Đàn (chỉ hiển thị trạng thái `reflect` dạng aura).
- Barrage (h00M/h00T/h00Z): nhịp va chạm theo event pulse thật; không tự hẹn giờ ở client. Nhịp rỗng không có event.
- Trạng thái chung (slow, sunder, stun, freeze, seal, haste, attack-up, armor-pierce-up, damage-reduction, heal, shield) không ghi nguồn trong snapshot; một dấu cho mỗi tác dụng, không gán là "của chiêu này".
