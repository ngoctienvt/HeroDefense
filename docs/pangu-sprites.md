# Bàn Cổ: sprite top-down

Từ bản thử nghiệm 2026-10-24, tướng Bàn Cổ trên sân dùng [model 3D có walk/attack](pangu-3d.md). Bộ sprite bên dưới vẫn giữ cho các nơi dùng art cũ, gồm quái mượn ngoại hình và pháp tướng; tài liệu này mô tả đường sprite.

Bộ ảnh vẽ tay cel shading từ master Bàn Cổ, camera trực giao nhìn xuống khoảng 45°. Nguồn ảnh do công cụ `image_gen` trong Codex tạo (`art_source: host_image`, route `host-image_gen`); công cụ không công bố model hoặc chi phí. Đây là bộ keyframe vẽ riêng, không phải video hay rig code.

## File

- [Gói web ZIP](../assets/sprites/pangu-topdown/pangu-web-sprites.zip).
- [WebP atlas](../assets/sprites/pangu-topdown/web/pangu-atlas.webp), [PNG atlas](../assets/sprites/pangu-topdown/web/pangu-atlas.png), [JSON](../assets/sprites/pangu-topdown/web/pangu-atlas.json).
- [Nguồn 4 hướng và các sheet](../assets/sprites/pangu-topdown/source/), [prompt](../assets/sprites/pangu-topdown/prompt-set.json), [QA](../assets/sprites/pangu-topdown/web/qa.json).
- Xem chuyển động: [idle](../assets/sprites/pangu-topdown/web/previews/idle.gif), [walk](../assets/sprites/pangu-topdown/web/previews/walk.gif), [attack](../assets/sprites/pangu-topdown/web/previews/attack.gif).

## Đọc atlas

Có 48 khung: 4 hướng `south`, `west`, `north`, `east`, mỗi hướng 3 hành động × 4 pose. Cả bốn hướng được tạo riêng từ ảnh hướng tương ứng. Ô cố định 320×320 px, origin `[160, 280]`, atlas 2560×1920 px. Rest pose cao khoảng 200 px tính cả pháp luân. Ảnh alpha thẳng; dùng sampling tuyến tính.

`frames[name].frame` cho hình chữ nhật trong atlas. Khi vẽ vào canvas, lấy source rect đó và đặt ô tại `[worldX - 160, worldY - 280]`. `animations[direction + '.' + action]` chứa thứ tự khung, `durationsMs`, `loop` và event trình bày.

| Hành động | Thời lượng từng khung | Lặp |
|---|---|---|
| idle | 220, 220, 220, 220 ms | có |
| walk | 140, 140, 140, 140 ms | có |
| attack | 160, 120, 150, 200 ms | không |

Attack có event `hit` ở khung 2 (đếm từ 0). Event chỉ là mốc hiển thị; server/game-core vẫn quyết định sát thương. GIF attack lặp để xem trước; runtime phải dùng `loop: false` trong JSON. Walk diễn tại chỗ; game điều khiển di chuyển.

## Xử lý và giới hạn

`pack-sprites.py` dùng soft matte của generate2dsprite, despill mép 1 px, phân vùng theo quyền sở hữu từng hình để giữ đầu rìu vượt ô lưới nguồn. Mỗi hướng dùng một tỉ lệ cố định cho mọi hành động; giữ dịch chuyển pose thay vì tự fit từng bbox. `review-and-package.py` xuất ảnh xem trước và kiểm tra số khung, timing, rect, WebP/PNG và pixel mỗi khung atlas.

Bốn keyframe mỗi hành động là chuỗi thưa. Ảnh tạo sinh có thể thay đổi chi tiết nhỏ giữa pose; chưa xác nhận độ mượt, điểm tiếp đất, timing hoặc FPS trong game.

## Tích hợp runtime

Client dùng texture `apps/client/public/assets/hero-motion-h01B.webp` và manifest `apps/client/src/pangu-atlas.json`, đọc qua `pangu-motion.ts`. Khi idle, Bàn Cổ giữ khung 0 để đứng im; các khung idle khác vẫn giữ trong bộ nguồn. Walk lặp theo thời lượng JSON; attack dùng chuỗi attack chuẩn hóa trong 0,38 giây; cast giữ pose giơ rìu trong 0,35 giây lấy đà rồi phát chuỗi attack khi bổ xuống. Mốc `hit` của atlas không quyết định sát thương. Hit/death dùng khung idle đầu tiên; việc dọn actor khi chết giữ theo luồng hiện có. Trái/phải được chọn theo trục màn hình của camera Babylon LH, không theo dấu X thế giới.

Hình học plane đặt tâm tại anchor `[160, 280]` để chân giữ vị trí khi billboard quay theo camera. Sau khi texture sẵn sàng, thanh HP gắn theo billboard để nằm trên đầu thay vì cắt ngang thân do camera nghiêng. Hit-stop đóng băng đồng hồ chuyển động. Chế độ giảm chuyển động giữ khung đầu idle/walk và hiện khung va chạm attack (khung 2) cho attack/cast. Log `sprite.pangu-config` ghi cấu hình; `sprite.motion-ready` / `sprite.motion-fallback` báo trạng thái tải texture.

Đã rà tĩnh luồng chọn khung, anchor và vòng đời texture/actor; chưa chạy typecheck, test, build hoặc game. Người dùng chạy:

```powershell
npm run typecheck
npm test -- apps/client/test/hero-motion.test.ts apps/client/test/pangu-motion.test.ts
npm run build
```

Kiểm tra Bàn Cổ ở cả bốn hướng khi đứng, đi, đánh và tung chiêu; vị trí chân khi xoay camera; trúng đòn/chết; hit-stop và giảm chuyển động. Xem log khi texture tải thành công hoặc lỗi, rồi kiểm tra ở camera chiến đấu thật trước khi chốt asset.

Bộ kỹ năng mới và pháp tướng dùng atlas này: [Khai Thiên Tổ Thần](pangu-combat.md).
