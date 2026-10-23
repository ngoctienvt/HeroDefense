# Sprite quái và boss

Client Babylon.js đọc sprite quái từ manifest theo art ID. Rendering không quyết định hướng đánh, sát thương, HP, thắng/thua hoặc quyền chọn mục tiêu; các trạng thái đó vẫn lấy từ snapshot/event server.

## Runtime manifest

Bundle runtime theo `monster-motion-runtime.v1` gồm một JSON `/assets/monster-motion-<id>.json` và các trang WebP `monster-motion-<id>-NN.webp`. Manifest mô tả `displayHeightWorld`, `visibleHeightWorld`, anchor chung, kích thước cell, page sizes, action, số frame, hướng và clip. Mỗi frame có page, rect, anchor và `durationMs`.

Resolver yêu cầu đủ bốn hướng `south/west/north/east`, đúng một action idle, một action di chuyển và attack. Idle có một frame đứng yên; movement loop theo đồng hồ liên tục; attack chạy theo tiến độ event; cast dùng frame chuẩn bị của attack. Reduced motion thay movement bằng idle. Asset mới không lật gương để thay hướng. Hit/death không cần sprite riêng; hiệu ứng hit vẫn theo event hiện có, còn pose manifest trở về idle.

Nếu manifest vắng hoặc không hợp lệ, client ghi log fallback giới hạn. Năm ID horde cũ (`m001`–`m004`, `b001`) dùng atlas legacy khi chưa có manifest; các actor mới còn procedural fallback cho tới khi art bundle sẵn sàng. Texture quái được cache chung theo ID/page, giữ khi actor hoặc encounter preloader còn tham chiếu, rồi dispose khi hết tham chiếu.

## Mapping boss phụ bản

`dungeon-boss-visuals.ts` ánh xạ zone 1–8 sang art ID được roster dự kiến. Đây chỉ là mapping trình bày client; không thêm `monsterId`, enemy hoặc trường giao thức. Kim/Ngân Giác và bốn Ma Gia là sprite child với offset cố định, cùng root/timeline và hitbox `actorId`; server vẫn giữ một boss/HP và một luồng combat. Một server event không bị nhân số lần theo số child.

Khi vào zone 0, client yêu cầu preload năm atlas horde cũ. Khi vào dungeon, chỉ yêu cầu manifest và page của boss trong zone đó. Actor quái/boss ngoài zone đang xem chưa bắt đầu tải; sprite được kích hoạt khi zone trở thành hiện hành. Zone change giải phóng lease preload trước; actor đang dùng texture giữ reference riêng. Nếu zone đổi hoặc battlefield bị dispose trước khi request xong, preloader bỏ qua việc tạo material mới. Actor removal dispose root và các child/hitbox rồi release material; texture cuối cùng được dispose khi không còn actor hay preload nào dùng.

## Asset source

Packer duy nhất là `tools/assets/pack-monster-motion.py`: mặc định giữ đường legacy, còn `--asset <id>` đọc `assets/sprites/monster-motion/<id>/asset.json` cùng `source/export-manifest.json`. Chế độ manifest chỉ pack profile đã duyệt hướng/chuyển động, đủ clip và full-canvas PNG có alpha thật cùng vùng pixel trong suốt. Atlas/manifest runtime được chép vào `apps/client/public/assets/` và `web/`; preview từng clip cùng contact sheet nền sáng/tối nằm trong `web/previews/` và `web/`, với `web/qa.json`. QA của packer chỉ xác nhận cấu trúc, alpha và rect/anchor; trường `visualReview` vẫn chờ người xem.

Unit regression cho manifest packer chạy riêng bằng `python -m unittest tools/assets/test_pack_monster_motion.py`; đây là kiểm tra bổ sung ngoài `npm test`.

Roster, art brief và tiến độ sản xuất là stateful records trong [kế hoạch 40 quái và boss](../plans/261022-0002-monster-boss-assets/plan.md), không phải chứng cứ rằng art đã hoàn tất hoặc được nghiệm thu trong game. Bundle chưa có manifest sẽ tiếp tục dùng fallback. Để nghiệm thu hình ảnh, chạy build mới rồi kiểm tra theo checklist trong kế hoạch; client source hoặc QA số không thay thế việc xem game thật.
