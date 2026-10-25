# Bản đồ đảo lơ lửng

Chiến trường là một đảo đá lơ lửng giữa trời nắng trưa; mỗi phụ bản boss có một đảo nhỏ riêng. Kế hoạch: [plans/261020-1420-floating-island-map](../plans/261020-1420-floating-island-map/plan.md).

## Hợp đồng với gameplay

- Mặt đi được phẳng ở y = 0. `ARENA` (x −44..44, z −36..28), làn, route, vị trí triển khai và tốc độ quái **không đổi**. Vách, đá, mây chỉ nằm ngoài `ARENA`.
- `packages/game-core/src/battlefield-layout.ts`: `withinZone`, `clampToZone`, `DUNGEON_ISLET = { x: 0, z: -2, radius: 20 }`. Server dùng chúng cho lệnh di chuyển, đội hình, va chạm, tránh vật cản và đẩy lùi. Zone 0 giữ hình chữ nhật `ARENA`, zone phụ bản là hình tròn.
- Client kẹp điểm click về zone trước khi gửi (`battlefield.click-clamped`), nên click ra vực, mây hoặc trời đưa tướng tới mép. Chỉ mesh `island-top` hứng click; server vẫn kiểm tra.

## Hướng nắng và palette

- Camera Babylon LH ở +z: bên trái màn hình là **+x**, phía trên màn hình là **−z**. Nắng đến từ góc trên-trái: `SUN_TO = normalize(0.5, 0.75, −0.45)` (hướng tới mặt trời) cho đá/vách; đĩa mặt trời ở độ cao thấp hơn (`SKY.sunDirection`).
- Giờ: trưa trắng vàng. Hướng nắng do người dùng chốt thay cho phân tích rim light vì các master không nhất quán.
- Đất đi được: nâu vàng ấm, độ sáng trung bình, ba mảng tông, vệt mòn sáng hơn dọc route. Viền: cỏ rộng 4, đá xám ấm rộng 1,2 ở mép (kẻ viền tối). Vách: đỏ nâu → xám ấm → tím lạnh, cel ba bậc theo hướng nắng. Trời: xanh lam → xanh nhạt, mây kem có bóng tím.

## Nguồn asset và cách dựng lại

Không dùng ảnh AI hay asset ngoài; mọi thứ do script trong repo sinh ra (CC0 theo repo).

| Thành phần | Nguồn | Lệnh |
|---|---|---|
| Mesh đảo (`island-main.json`; `island-dungeon.json` lưu ở `assets/terrain/` vì client hiện chỉ tải đảo `main`) | `assets/terrain/island_geometry.py` (flat top + viền + vách phân tầng flat-shaded, màu đỉnh cel baked) | `python assets/terrain/island_geometry.py apps/client/public/assets/terrain` |
| `.blend` + render preview | `assets/terrain/build-floating-island.py` (Blender 5.2, nền) | `blender -b -P assets/terrain/build-floating-island.py -- assets/terrain/preview` |
| Tile đất/cỏ liền mạch | `assets/terrain/ground/make-ground-tiles.py` (WebP 1024/512) | `python assets/terrain/ground/make-ground-tiles.py` |
| Mask vệt mòn theo route | Vẽ lúc chạy từ `enemyRoute` (`visual-terrain-ground.ts`), nên khớp 1–4 làn | — |
| Bầu trời, mặt trời, biển mây | Shader gradient + canvas texture lúc chạy (`visual-terrain-sky.ts`) | — |

Mesh xuất JSON (không thêm `@babylonjs/loaders`); client dựng bằng `VertexData` và kiểm tra dữ liệu trước khi dùng. Ngân sách: ≤ 15k tam giác mỗi đảo.

## Mã client

`visual-terrain.ts` (điểm vào) → `visual-terrain-island.ts` (tải mesh, vật liệu vách, mặt phẳng dự phòng) · `visual-terrain-ground.ts` (shader đất) · `visual-terrain-props.ts` (cổng quái, đền Linh Trụ) · `visual-terrain-sky.ts` (trời, mặt trời, mây; dựng một lần). Terrain dựng lại khi đổi số làn hoặc khi vào/ra phụ bản.

Log: `terrain.built`, `terrain.disposed`, `terrain.texture-ready`, `terrain.texture-fallback`, `terrain.model-fallback`, `terrain.shader-error`, `terrain.sky-built`, `battlefield.click-clamped`.

## Rìa đảo và ngoại cảnh

`visual-terrain-rim.ts` dựng phần sống động ở rìa, đều nằm ngoài `ARENA` và không hứng click:

- Đá vệ tinh tách thành phần `rocks` trong JSON (toạ độ cục bộ) nên nhấp nhô; đá số 1 của đảo chính đứng yên vì có cầu treo nối vào.
- Thác nước theo `meta.waterfalls`: dòng suối trên viền cỏ, dải nước cong loe dần và mờ vào mây, bọt ở mép, sương ở chân thác.
- Thông, đèn lồng (có đom đóm cộng sáng), bia đá, cột đổ đặt trên dải cỏ (khoảng cách mép 1,6–3,4), tránh cổng quái, đền, đầu cầu và thác.
- Cánh hoa bay từ rìa ra ngoài rồi rơi xuống mây. Mây, sương, chim: `visual-terrain-clouds.ts`; núi đá xa mờ dần: `visual-terrain-spires.ts`.
- Bật giảm chuyển động thì mọi chuyển động trên dừng lại. Log: `terrain.rim-built`.

## Giới hạn đã biết

- Camera mặc định nhìn xuống, nên trời và mặt trời chỉ vào khung khi thu xa hoặc nghiêng gần chân trời; mây dưới đảo thấy ở 3–4 làn.
- Chưa có DirectionalLight: đảo dùng màu baked và shader không chịu đèn; props (cổng, đền) vẫn dùng `HemisphericLight`.
- Chưa nghiệm thu hình ảnh trong game; xem các bước kiểm tra ở phase 06 của kế hoạch.
