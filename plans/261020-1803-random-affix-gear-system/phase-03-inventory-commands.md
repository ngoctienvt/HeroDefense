# Phase 3 — Kho, lệnh và gỡ hệ trang bị cũ

## Lệnh mới (`packages/game-core/src/gear-commands.ts`, gọi từ `roster.ts` hoặc `commands.ts`)

| Lệnh | Kiểm tra | Tác dụng |
|---|---|---|
| `equip-item` | Món và tướng thuộc người gửi. Tướng không phải đơn vị triệu hồi. | Tháo món đang ở cùng khe của tướng đó về kho. Nếu món đang được tướng khác mặc thì chuyển sang. Được dùng bất kỳ lúc nào, kể cả trong combat hoặc phụ bản. |
| `unequip-item` | Món thuộc người gửi và đang được mặc. | Món về kho. |
| `enhance-item` | `enhance < 10` và đủ Linh Thạch. | Trừ tiền, tăng `enhance`. |
| `reroll-item` | Món có ít nhất 1 dòng thường, đủ Huyền Tinh và Linh Thạch. | Chọn ngẫu nhiên 1 dòng thường, thay bằng dòng mới không trùng các dòng còn lại, roll với q = 1 ở cấp món. Dòng độc nhất không bị tẩy. |
| `salvage-item` | Món đang ở kho. | Xóa món, cộng Huyền Tinh và hoàn Linh Thạch. |
| `admin-item` | Theo cách các lệnh admin hiện có. | Tạo một món theo khe, phẩm hoặc dòng độc nhất chỉ định, để thử nghiệm. |

Mọi lệnh làm đổi đồ đều tăng `player.gearVersion` rồi gọi `refreshStats(state, owner)`. `refreshStats` đã giữ tỷ lệ máu khi Máu tối đa đổi, nên đổi đồ không hồi máu.

## Trả đồ về kho

Hàm chung `releaseUnitGear(state, unit, reason)` được gọi ở bốn chỗ:
- `roster.ts` craft, trước khi xóa nguyên liệu.
- `roster.ts` merge, với 2 bản sao bị tiêu. Bản giữ lại vẫn mặc đồ của nó.
- `roster.ts` sell.
- Bất kỳ chỗ nào khác xóa tướng không phải đơn vị triệu hồi. Cần grep `delete state.units` để rà.

Không bao giờ được làm mất đồ.

Với craft và merge, nếu món có Truyền Thừa Ấn thì hấp thụ chỉ số trước khi trả về (phase 5).

## Gỡ hệ trang bị cũ

| Vị trí | Thay bằng |
|---|---|
| `rules.ts` `equipmentCost` | Xóa. Giá cường hóa nằm trong `gear-design.ts`. |
| `roster.ts` craft `highestGear` | Xóa. Đồ về kho qua `releaseUnitGear`. |
| `roster.ts` merge `Math.max(equipment)` | Xóa. |
| `roster.ts` sell hoàn tiền trang bị | Xóa. Đồ về kho thay cho hoàn tiền. |
| `roster.ts` lệnh `equip` | Xóa. |
| `stats.ts` `refreshStats` (+22% Công, +25% Máu, +4 Giáp mỗi cấp) | Chỉ số đồ (phase 4). |
| `stats.ts` `attackInterval` (+4% tốc đánh mỗi cấp pháp) | Tốc đánh từ đồ. |
| `combat.ts` 9 chỗ `hero.ability.cooldown / (1 + .1 * unit.equipment[2])` | `abilityCooldownFor(unit, base)` |
| `combat.ts:578`, `tier3-combat.ts:27`, `tier4-combat.ts:26` (`1 + equipment[2] × .25`) | Bỏ hệ số. Sát thương kỹ năng từ đồ đi qua `skillDamageMultiplier`. |
| `unit-factory.ts`, `shennong-combat.ts:38`, `combat.ts:723` (`equipment: [0,0,0]`) | Xóa trường. |
| `validation.ts` case `equip` | Thay bằng các lệnh mới. |

Hồi máu và khiên vẫn mạnh lên theo đồ. Phần theo Công của người dùng chiêu đọc `unit.attack` qua `effectiveUnitAttack`, và dòng % Công cùng chỉ số nền vũ khí đều đã nằm trong `unit.attack`. Thứ duy nhất mất đi là hệ số pháp lực cũ nhân thêm `1 + 0,25 × cấp` (tối đa ×2,25) lên `power` của kỹ năng chung và bậc 3–4. Phần theo % Máu người nhận không đổi. Phase 7 so sánh lượng hồi của Support với hệ cũ.

## Validation server (`apps/server/src/validation.ts`)

- `itemId` và `unitId` dùng `identifier()` hiện có.
- `admin-item`: `slot` và `rarity` chỉ nhận đúng giá trị liệt kê, `unique` chỉ nhận ID trong danh sách.

## Test

- Sửa `commands.test.ts`, `craft-recipes.test.ts`, `starting-economy.test.ts` và `test/fixtures.ts` (dòng 55 dùng `equip` để tăng sức mạnh). Fixture đổi sang cấp đồ bằng `admin-item` hoặc helper tạo món trực tiếp.
- Mới `gear-commands.test.ts`:
  - Mặc, tháo, chuyển món giữa hai tướng.
  - Không mặc được đồ hoặc lên tướng của người khác.
  - Craft, merge và sell trả đồ về kho, không mất món nào.
  - Đổi giáp không làm tăng tỷ lệ máu.
  - Cường hóa trừ đúng tiền và dừng ở +10.
  - Tẩy luyện chỉ đổi đúng 1 dòng, không đụng dòng độc nhất, giá tăng theo `rerolls`.
  - Phân giải từ chối món đang mặc.
