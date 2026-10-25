# Phase 02 — Biên server cho đảo phụ bản và kẹp click

## Hiện trạng

- `unit-pathing.ts:9` `insideArena` trả `true` khi `zone !== 0`, nên trong phụ bản không có biên.
- `crowd-movement.ts:43` và `retreatFromTarget` chỉ kẹp zone 0.
- `commands.ts:104,132` kiểm tra mọi lệnh di chuyển bằng `withinArena` của zone 0, kể cả lệnh trong phụ bản.
- Phụ bản đặt boss ở (0, −10) và quân ở (−6..6, 7) (`dungeons.ts:21,27`).
- Client gửi điểm click thô. Click ra ngoài mép bị server từ chối, làm hỏng thao tác kiting sát biên.

## Thiết kế

Trong `packages/game-core/src/battlefield-layout.ts`:

- `DUNGEON_ISLET = { x: 0, z: -2, radius: 20 } as const`. Bán kính chứa vị trí spawn của boss và quân, cộng khoảng 8 đơn vị để kite; giá trị cuối khớp mesh ở phase 03.
- `withinZone(zone, x, z)`: zone 0 dùng `ARENA`, zone khác dùng vòng tròn.
- `clampToZone(zone, point)`: zone 0 kẹp theo hình chữ nhật, zone khác chiếu điểm về vòng tròn.
- Giữ `withinArena` và `ARENA` để không đổi hợp đồng hiện có.

Thay các chỗ dùng:

- `commands.ts`: lệnh nhóm dùng `withinZone(units[0].zone, …)`; offset đội hình dùng `clampToZone` thay cho clamp x cứng. Lệnh đơn dùng `withinZone(unit.zone, …)`.
- `unit-pathing.ts`: `insideArena` → `withinZone`; clamp cuối `walkAroundBlockers` dùng `clampToZone` cho mọi zone.
- `crowd-movement.ts`: tách va chạm và `retreatFromTarget` dùng `clampToZone` cho mọi zone.
- Hiệu ứng đẩy lùi hoặc dịch chuyển trong các file `*-combat.ts`: grep `ARENA.`/`Math.max(ARENA` và chuyển sang `clampToZone` nếu có.

Phía client (`battlefield.ts`, nơi chuyển click thành lệnh): kẹp điểm bằng `clampToZone(this.zone, point)` trước khi gửi, dùng chung hàm từ game-core (client đã import `battlefield-layout`). Server vẫn kiểm tra, client chỉ giúp click ngoài mép thành lệnh đi tới mép. Ghi `debug('battlefield.click-clamped', { zone, from, to })` khi có kẹp.

Contract mạng không đổi.

## Test hồi quy (người dùng chạy)

`packages/game-core/test/zone-bounds.test.ts`:

- `withinZone` với zone 0 khớp `withinArena`; zone phụ bản nhận điểm trong vòng tròn, từ chối điểm ngoài.
- `clampToZone` trả điểm nằm trong zone, giữ nguyên điểm đã nằm trong.
- Mọi vị trí spawn của boss và quân phụ bản nằm trong `DUNGEON_ISLET`.
- Đơn vị phụ bản đi về đích ngoài vòng tròn dừng ở biên, không vượt.
- Lệnh di chuyển phụ bản tới điểm hợp lệ trong vòng tròn được chấp nhận (ví dụ x = 15, nằm trong `ARENA` nhưng gần biên).

Cập nhật `rts-layout.test.ts`: cổng và route vẫn nằm trong đảo chính (hằng số mép đảo từ phase 03).

## Rủi ro

Kẹp vòng tròn có thể làm đơn vị bị đẩy lùi kẹt ở biên → kiểm tra các nhánh `retreatFromTarget` và đẩy lùi của boss Hùng Vương.
