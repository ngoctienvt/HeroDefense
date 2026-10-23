# Phase 06 — Tích hợp client, camera, QA

## Tách module

`visual-terrain.ts` đang dựng cả nền, viền, cổng và Linh Trụ. Tách thành:

- `visual-terrain.ts`: điểm vào `buildTerrain(scene, palette, laneCount, zone)`, trả closure dọn dẹp như hiện tại.
- `visual-terrain-island.ts`: tải glb đảo chính hoặc đảo phụ bản, gán vật liệu vách và shader nền, đặt cổng quái/Linh Trụ (giữ bộ prop hiện có, có thể đổi vật liệu sang palette mới).
- `visual-terrain-ground.ts`: shader và texture nền đất (phase 04).
- `visual-terrain-sky.ts`: bầu trời, mặt trời, biển mây, ánh sáng (phase 05).

Bỏ tre và núi xa hiện có (`valley-edge`, `distant-peak`, `bamboo`), vì đảo lơ lửng thay cho thung lũng. Giữ hoặc tạo lại nhẹ vài cây/đá trang trí trên viền ngoài `ARENA`, không pickable.

## Thay đổi trong `battlefield.ts`

- Bỏ fog cũ và chỗ tạo `HemisphericLight` (chuyển sang module sky).
- Dựng lại terrain khi số làn đổi **hoặc** khi `setZone` đổi giữa zone 0 và phụ bản. Bầu trời có thể giữ nguyên giữa các lần dựng, chỉ đổi đảo.
- Clamp camera lấy từ `ARENA` hoặc `DUNGEON_ISLET` cộng lề, thay cho ±55 / −45..38 cứng ở hai chỗ (pan chuột và pan phím).
- Picking: chỉ mesh `island-top` pickable cho lệnh đất. Click trúng vách, mây hoặc trời dùng giao điểm mặt phẳng y = 0 (`groundAt`) rồi `clampToZone` (phase 02).
- Bóng blob và vòng chọn giữ y hiện tại.

## Tài nguyên và log

- Dọn mesh, material, texture qua closure (texture dùng chung cache trong `VisualMaterials` không dispose sai).
- Reduced motion: dừng mây trôi và tia mặt trời.
- Log: `terrain.built` (lanes, zone, island, groundTile, sky), `terrain.disposed`, `terrain.texture-ready` / `terrain.texture-fallback`, `terrain.model-fallback` (khi glb lỗi thì dựng mặt phẳng màu đất + viền đơn giản để vẫn chơi được), `battlefield.click-clamped`.

## Tài liệu

- `docs/floating-island-map.md`: hoàn thiện (asset, nguồn, script, cách dựng lại).
- `docs/gameplay-spec.md` dòng 58: thay mô tả "nền thung lũng tiên hiệp" bằng đảo lơ lửng; ghi biên đảo phụ bản.
- `README.md`: cập nhật câu mô tả địa hình.

## Bàn giao và các bước người dùng kiểm tra

Agent chỉ sửa nguồn và chép asset, không build hay chạy game. Người dùng:

1. `npm test` (đặc biệt `zone-bounds.test.ts`, `rts-layout.test.ts`, `unit-spacing.test.ts`) và `npm run typecheck`.
2. Đóng server cũ → chạy `start-game.cmd` để build → refresh `Ctrl+F5`.
3. Solo và 4 làn: xem toàn đảo ở camera mặc định, phóng to/thu nhỏ hết cỡ, phím Tab đặt lại camera.
4. Kite quái dọc mép trái/phải và phía sau đội hình; click ra vực và mây → tướng đi tới mép, không có thông báo lỗi.
5. Vào phụ bản wave 5: đảo nhỏ hiện đúng, kite quanh boss sát mép, chịu đẩy lùi Đại Địa Chấn Động gần mép mà không rơi ra ngoài.
6. Bật reduced motion: mây đứng yên. Bật/tắt nhiều lần vào/ra phụ bản và kiểm tra `window.__thienDaoDebug` không có lỗi tải.
7. So sánh độ đọc sprite, thanh máu và VFX lửa/nước/băng trên nền mới.
