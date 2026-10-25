# Kiểm kê asset runtime và phương án nén

## Cập nhật 2026-10-24: đã nén và tải trước

- Sheet stylized, chân dung và `hero-motion-h01B`: 139 file, 117,8 → 46,3 MB (WebP q90, alpha lossless, giữ nguyên canvas). Đã rà bằng mắt h03Z, h01K, h00G, h014 trên nền tối, có phóng 3× viền lửa. Bản q100 gốc còn trong git (`HEAD`).
- `round-one-pig.glb`: 5,3 → 1,8 MB. `pangu.glb`: 4,8 → 3,6 MB (dedup, resample, quantize scene volume để giữ skin chung, texture WebP). Đã giữ đủ clip, skin, 33 khớp và `mixamorig:RightHand`. Bản gốc **chưa được git theo dõi** và hiện là bản duy nhất: `assets/models/*-runtime-original.glb`.
- Tổng `public/assets` còn 155 MB. Danh sách tải trước có 569 file, 135 MB.
- Tải trước ở sảnh, URL có phiên bản, header cache 1 năm và nạp sẵn lên GPU: xem `deploy/README.md` mục Asset caching and lobby preload.
- Script kiểm kê chuyển sang TS: `tools/assets/asset-inventory.ts` (dùng chung `asset-references.ts` với plugin Vite).

Ngày 2026-10-24. Công cụ: `node tools/assets/asset-inventory.mjs [--json out.json]` (chỉ đọc).

## Kết luận chính

- Hầu hết 245 MB trong `apps/client/public/assets` vẫn được client tham chiếu, và client đã **tải lười**: sheet tướng tải khi actor xuất hiện, VFX tướng tải qua `heroKit.prepare(heroId)` khi tướng đó có mặt. Người chơi không tải cả 245 MB.
- **File thừa không làm chậm người chơi** (trình duyệt không bao giờ yêu cầu chúng); xóa chỉ làm nhẹ repo/bản build. Thứ thực sự giảm lag lúc vào game là **nén các file được tải**.
- Thử nén lossy WebP q90 (alpha giữ 100) trên sheet tướng giảm khoảng **60%**, không thấy khác biệt khi so cạnh nhau ở cỡ cell. Đây là đòn bẩy lớn nhất.

## Phân loại (sau khi dời file)

| Nhóm | Số file | Dung lượng |
|---|---|---|
| Tham chiếu trực tiếp (đường dẫn literal, manifest JSON) | 300 | 70,2 MB |
| Tham chiếu qua mẫu động (`hero-stylized-${heroId}`, `vfx-${slug}-${id}`…) | 365 | 161,0 MB |
| Không tham chiếu | 0 | 0 (đã dời 3 file, 14 MB) |

### Đã dời khỏi `public/` (git mv, khôi phục được)

| File | Lý do | Nơi lưu |
|---|---|---|
| `hero-h00G.glb` (11,3 MB) | Không mã nào tải; h00G dùng sheet stylized | `assets/models/` |
| `vfx-beidou-painted.webp` (2,2 MB) | Không mã nào tải; Bắc Đẩu dùng `vfx-truong-*` | `assets/vfx-archive/` |
| `terrain/island-dungeon.json` (0,5 MB) | `buildIsland` cố định `name = 'main'` | `assets/terrain/` |

Lưu ý: `tools/vfx/pack-beidou-painted.ps1` vẫn xuất ra `public/`; chạy lại sẽ tạo lại file thừa.

### Mã dự phòng chết (giữ nguyên, đề xuất dọn sau)

Cả 70 tướng đều nằm trong `MOTION_HEROES`, 69 tướng là stylized, còn h01B dùng `hero-motion-h01B`. Vì vậy:

- `hero-sprites-0..8.webp` (7,5 MB): chỉ dùng khi `hasHeroMotion` sai, điều này không xảy ra với roster hiện tại. Test `hero-portraits.test.ts:21` còn đòi file tồn tại.
- `hero-portraits-{0..4,6..8}.webp` (3,3 MB): chỉ atlas 5 còn cần, cho chân dung h01B.
- `hero-motion-{h001,h003,h006,h007,h00B,h00F,h018,h01A,h01C,h03W}.webp` (8,7 MB): bị sheet stylized che. Test `hero-motion.test.ts` chọn đúng file stylized nên không đòi các file này.

Muốn dọn các file này cần sửa nhánh fallback và test. Lợi ích chỉ nằm ở repo/bản build, không giảm tải cho người chơi.

## Đo nén thử

Thử bằng ImageMagick `-quality Q -define webp:alpha-quality=100 -define webp:method=6`. File thử nằm ở scratchpad, chưa đụng tới asset.

| File | Gốc | q90 | q82 |
|---|---|---|---|
| `hero-stylized-h041.webp` (1536², q100) | 2640 KB | 1088 KB | 940 KB |
| `hero-stylized-h008.webp` | 752 KB | 316 KB | 264 KB |
| `hero-motion-h01B.webp` (2560×1920) | 2716 KB | 1032 KB | 864 KB |
| `hero-portrait-h001.webp` (512²) | 228 KB | 80 KB | 64 KB |
| `vfx-shennong-cauldron.webp` | 808 KB | 692 KB | 584 KB |

Sheet tướng/chân dung đang lưu q100. VFX vốn đã nén nên lợi ích ít hơn (~15%). Model:

| Model | Tổng | Texture | Hình học + animation |
|---|---|---|---|
| `models/round-one-pig.glb` (quái wave 1) | 5,1 MB | 2 PNG, 3,3 MB | 1,8 MB |
| `models/pangu.glb` | 4,6 MB | 5 JPEG, 1,7 MB | 2,9 MB |

## Phương án nén đề xuất

Thứ tự ưu tiên theo tỉ lệ lợi ích trên rủi ro:

1. **Sheet tướng stylized + chân dung (~116 MB → ~45 MB).** Xuất lại WebP lossy q90, alpha 100, method 6, giữ nguyên kích thước canvas/cell, rect và anchor. Viết script mới `tools/assets/recompress-webp.mjs`: đọc từ bản gốc, ghi đè `public/` và ghi danh sách vào báo cáo. Lưu ý theo AGENTS.md: rà bằng mắt từng nhóm ở cỡ hiển thị thật, trên cả nền sáng lẫn nền tối (viền alpha, tóc, đầu vũ khí). Bản gốc q100 phải còn trong nguồn: nếu `assets/sprites/` chưa có, chép sang trước khi ghi đè.
2. **`round-one-pig.glb`.** Chuyển texture PNG → WebP qua extension `EXT_texture_webp` (loader Babylon hỗ trợ sẵn), resample animation, dùng `KHR_mesh_quantization` (không cần decoder). Dự kiến 5,1 → ~1,2 MB. Công cụ: `@gltf-transform/cli` (cần cài, chưa cài).
3. **`pangu.glb`.** Tương tự: quantize, resample, texture WebP. Dự kiến 4,6 → ~1,5 MB.
4. **Meshopt/Draco (tùy chọn).** Giảm thêm phần hình học, nhưng Babylon tải decoder từ CDN mặc định. Nếu dùng, phải tự host decoder trong `public/` để không phụ thuộc Internet ngoài.
5. **VFX sheet > 400 KB.** Thử q85, chỉ áp dụng khi rà hình không thấy mất chi tiết ở các pha sáng (theo mục VFX của AGENTS.md).
6. **Nhạc nền 2,9 MB.** Giữ nguyên, hoặc chuyển sang OGG/Opus ~96 kbps nếu cần thêm (giảm ~1,5 MB). Nhạc chỉ tải một lần.

Ước tính tổng sau bước 1–3: một trận 4 người với khoảng 20 tướng khác nhau tải chừng 30 MB sheet tướng thay vì ~75 MB.

## Việc tiếp theo cần người dùng kiểm tra

- Chạy `npm test` (đặc biệt `island-layout`, `hero-motion`, `hero-portraits`) để xác nhận việc dời 3 file không làm hỏng test. Theo phân tích, không test nào đọc 3 file này, nhưng chưa chạy để xác nhận.
- Build lại (`start-game.cmd`) và vào trận để xác nhận không có log `*-fallback` mới.

## Câu hỏi chưa giải quyết

1. Có đồng ý nén lossy q90 cho sheet tướng không, kèm rà mắt mẫu khoảng 10 tướng trước khi áp dụng cho cả 69?
2. Có cho cài `@gltf-transform/cli` (devDependency) để tối ưu glb không?
3. Có muốn dọn nhánh fallback chết (`hero-sprites-*`, `hero-motion-*` bị che, atlas chân dung cũ) không? Việc này phải sửa code và test.
