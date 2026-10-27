# Xem trước VFX ngoài game

Render một hiệu ứng trong một scene Babylon tối giản: cùng camera, góc nhìn và thứ tự vẽ như trận đấu, dùng đúng module VFX của client. Đây **không phải** game: không có server, quái hay HUD. Mục đích là xuất ảnh duyệt từng pha mà không phải mở trận.

Bước 3 cần Playwright và Chromium. Trên máy người dùng có thể thay bằng cách mở `index.html` qua `npx vite tools/vfx-preview` rồi xem `window.__shots`.

```bash
# 1. đóng gói trang preview (esbuild có sẵn trong node_modules của repo)
node_modules/.bin/esbuild tools/vfx-preview/kimtra-bell3d-preview.ts --bundle --format=iife --loader:.json=json --outfile=OUT/bundle.js
# 2. chép tools/vfx-preview/index.html và các asset cần (models/kim-tra.glb, vfx-kimtra-bell3d.glb, vfx-circle_03.webp,
#    vfx-kimtra-array-mask.webp) vào OUT/ và OUT/assets/
# 3. chụp ảnh từng pha (Chromium headless, WebGL bằng SwiftShader); query: r=bán kính camera, yaw=xoay camera
node tools/vfx-preview/capture.mjs OUT OUT/shots "r=22"
```

`kimtra-bell3d-preview.ts`: chuông Kim Tra hình thành → rơi → úp → tan thành vỏ → vỡ. Thời gian chạy theo bước dt cố định, nên ảnh luôn lặp lại được.

`hero-trail-preview.ts`: một tướng 3D đánh thường kèm vệt vũ khí, qua đúng loader `createHeroModel`. Query `hero=h009` (bảng `HERO_MODELS`), `face=side|front`, `r=13`. Cần chép `assets/models/<key>.glb` của tướng đó.

## Sân thật, chạy offline

`battle-preview.ts` dựng **renderer trận thật** (`Battlefield`) nhưng lấy dữ liệu từ mô phỏng `game-core` chạy ngay trong trang, không cần server. Tướng được cấp bằng lệnh admin rồi xuất trận. `battle-capture.mjs` dùng đồng hồ giả của Playwright (`page.clock`, dừng thời gian thật), gọi `__vfxReplay(hero)` rồi chụp canvas ở đúng các mốc giây. Nhờ vậy renderer phần mềm chậm vẫn cho đúng khung.

```bash
node_modules/.bin/esbuild tools/vfx-preview/battle-preview.ts --bundle --format=iife --loader:.json=json --loader:.css=empty --outfile=OUT/bundle.js
# OUT/index.html: <canvas> toàn trang + bundle.js; OUT/assets = apps/client/public/assets
node tools/vfx-preview/battle-capture.mjs OUT OUT/shots "heroes=h009,h008,h00A" "h009" "0.1,0.4,0.8,1.5,3.5"
```

Query: `heroes` (tối đa 5, đứng vào ô 1–5), `rank`, `live=1` (để sóng quái chạy).

Xem quái trên sân (ví dụ đo quái mượn hình tướng 3D):

- `wave=N`: nhảy thẳng vào sóng N theo kế hoạch sóng thật (tự bật `live`).
- `pull=K`: chạy bộ sinh quái tới khi có K con, rồi xếp chúng thành hàng 6 con trước mặt các tướng (`ahead=7`), máu ×40 để không chết trong lúc chụp. Chỉ dùng để duyệt hình.
- Thay `h009` bằng `-` để không gọi replay mà chỉ chụp sân ở các mốc giây. Mỗi mốc in `__dev.stats()`: số quái, mesh đang vẽ, tam giác, draw call.
- `ZOOM=0..3` (mặc định 2) chỉnh số nấc kéo camera lại gần.

```bash
ZOOM=1 node tools/vfx-preview/battle-capture.mjs OUT OUT/w8 "heroes=h009,h008,h00A,h00E,h00C&wave=8&pull=12&rank=1" "-" "0.5,1.5"
```
