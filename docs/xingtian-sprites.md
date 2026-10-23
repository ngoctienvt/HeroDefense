# Hình Thiên: sprite top-down

Bộ ảnh vẽ tay cel shading theo ngôn ngữ hình ảnh của master Bàn Cổ, nhưng giữ nhận diện Hình Thiên: không đầu, mặt trên ngực và bụng, lửa đỏ tím ở cổ, rìu tay phải và khiên tay trái. Nguồn ảnh do `image_gen` trong Codex tạo (`art_source: host_image`, route `host-image_gen`); công cụ không công bố model hay chi phí.

## Nguồn và atlas

- Bốn master riêng theo hướng và bốn sheet walk/attack: `assets/sprites/tier5-tier6/h011/source/`.
- Prompt và đường tạo: `assets/sprites/tier5-tier6/h011/source/master-prompt.json`.
- `compose-sheets.py` ghép nguồn bốn hướng, sau đó `assets/sprites/linh-huyen-stylized/pack-sprites.py --root assets/sprites/tier5-tier6 --hero h011` đóng atlas.
- Atlas `assets/sprites/tier5-tier6/h011/web/atlas.webp`, manifest `atlas.json`, ảnh rà `review.png` và `qa.json`; bản runtime ở `apps/client/public/assets/hero-stylized-h011.webp`, chân dung `hero-portrait-h011.webp`.

Atlas 1536×1536 gồm 36 khung: mỗi hướng một idle đứng im, bốn walk, bốn attack. Canvas mỗi khung 256×256, anchor chân `[128, 224]`; 12 clip trong JSON ghi thứ tự, thời gian và vòng lặp. Bản đóng gói cuối có `warnings: []`; ảnh đi hướng đông từng chạm biên đã được sửa, giữ nguồn bị loại để truy lại. Rà định lượng không chứng minh chân tiếp đất hoặc động tác đủ mượt ở kích thước game.

Client dùng `stylized-motion.ts` và `stylized-layout.json` để chọn UV, mặt phẳng, chân dung, idle tĩnh và hướng theo camera Babylon LH. VFX lốc và trạng thái bất tử ở `visual-xingtian.ts` bám event/snapshot server. Chưa chạy build, test, game hoặc nghiệm thu hình ảnh/FPS. Người dùng dừng server cũ, chạy lại `start-game.cmd`, nhấn `Ctrl+F5`, rồi kiểm tra Hình Thiên ở bốn hướng: đứng, đi, chém, lấy đà, lốc, bất tử, trúng đòn, chết và giảm chuyển động; xem log `sprite.*` và `visual.xingtian.*` khi texture tải lỗi.
