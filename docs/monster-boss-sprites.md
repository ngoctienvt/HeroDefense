# Sprite quái và boss

> Từ 27-10-2026, người dùng chuyển sản xuất quái/boss sang mô hình 3D và giữ ảnh master stylized làm reference. [Kế hoạch bảo toàn nguồn và roster mới](../plans/261027-1118-monster-3d-master-references/plan.md) đã bàn giao 38 master (33 mới, 5 tái dùng); xem [gallery master](../assets/monster-source/masters/index.html) hoặc [gói reference](../assets/monster-source/master-references-20261027.zip). Chỉ tạo ảnh reference, không tạo tiếp sprite action. Các mục dưới mô tả asset/runtime sprite và model đã có, không phải lệnh tiếp tục sản xuất sprite. Đợt master này không thay runtime hoặc xóa asset cũ. Mặt sau và chi tiết khuất chưa có ảnh riêng; accepted-reference là QA của agent, chưa phải người dùng duyệt mỹ thuật cuối.

Client Babylon.js đọc sprite quái từ manifest theo art ID. Rendering không quyết định hướng đánh, sát thương, HP, thắng/thua hoặc quyền chọn mục tiêu; các trạng thái đó vẫn lấy từ snapshot/event server.

## Ngoại lệ 3D round 1

Quái thường `m001` được tạo ở wave 1, zone 0 dùng `/assets/models/round-one-pig.glb`. Quái `m001` ở wave sau vẫn dùng sprite; tên và chỉ số server giữ nguyên. Model dùng chung geometry/material, mỗi actor có rig và animation riêng. Clip `walk` lặp khi di chuyển, idle giữ frame đầu, clip `attack` theo tiến độ windup/strike server. Có picking, HP, hit flash, hit-stop và reduced motion; tải lỗi giữ hình procedural và ghi `visual.pig.fallback`. Container giữ trong scene, rig/animation dọn khi actor bị xóa.

Nguồn do người dùng cung cấp: `assets/3D model/heo/Walking.fbx` và `Zombie Attack.fbx`; không có URL hoặc giấy phép phân phối kèm theo, không suy diễn giấy phép. Script `tools/assets/convert-round-one-pig.py` chạy bằng Blender 5.2, gộp clip trên cùng rig, bỏ dịch chuyển ngang của hips, giảm mesh với ratio 0.12 và texture xuống 1024px, chuẩn hóa chiều cao/anchor chung. GLB khoảng 5.3 MB, 23,594 polygons. Exporter giữ bốn trọng số xương lớn nhất mỗi vertex rồi chuẩn hóa; cần xem biến dạng khi đánh trong game. Thông số nguồn/xuất nằm ở `assets/3D model/heo/runtime-export.json`.

Chiều cao runtime heo là `4.1` world units, gần bằng phần thân nhìn thấy của sprite `m001` cũ sau scale minion (`7.6 × 362/533 × 0.8 ≈ 4.13`). Bóng chân và vị trí HP theo kích thước model. Bản đầu dùng `2.1` khiến heo nhỏ rõ so với tướng trong video người dùng cung cấp; đã sửa nguồn thành `4.1`.

Chưa nghiệm thu hình ảnh/FPS của bản chỉnh kích thước trong game. Sau khi build mới, kiểm tra round 1: chân chạm đất, hướng đi/đánh, animation, chọn mục tiêu, HP và chết; sang round 2 kiểm tra `m001` vẫn là sprite.

## Runtime manifest

Bundle runtime theo `monster-motion-runtime.v1` gồm một JSON `/assets/monster-motion-<id>.json` và các trang WebP `monster-motion-<id>-NN.webp`. Manifest mô tả `displayHeightWorld`, `visibleHeightWorld`, anchor chung, kích thước cell, page sizes, action, số frame, hướng và clip. Mỗi frame có page, rect, anchor và `durationMs`.

Resolver yêu cầu đủ bốn hướng `south/west/north/east`, đúng một action idle, một action di chuyển và attack. Idle có một frame đứng yên; movement loop theo đồng hồ liên tục; attack chạy theo tiến độ event; cast dùng frame chuẩn bị của attack. Reduced motion thay movement bằng idle. Asset mới không lật gương để thay hướng. Hit/death không cần sprite riêng; hiệu ứng hit vẫn theo event hiện có, còn pose manifest trở về idle.

Nếu manifest vắng hoặc không hợp lệ, client ghi log fallback giới hạn. Năm ID horde cũ (`m001`–`m004`, `b001`) dùng atlas legacy khi chưa có manifest; các actor mới còn procedural fallback cho tới khi art bundle sẵn sàng. Texture quái được cache chung theo ID/page, giữ khi actor hoặc encounter preloader còn tham chiếu, rồi dispose khi hết tham chiếu.

## Routing boss và bundle thư viện

Actor hiện chọn hero sprite nếu enemy có `skinHeroId`, hoặc monster manifest nếu có `monsterId`. Preloader hiện yêu cầu năm ID legacy khi `zone === 0`; không có art ID phụ bản cho zone khác. File `dungeon-boss-visuals.ts` và mapping nhóm Kim/Ngân Giác/Ma Gia không có trong client hiện tại. Không xem bundle sản xuất là đã gắn vào encounter.

Khi tích hợp boss đôi/nhóm theo kế hoạch asset, cần giữ một enemy/HP/hitbox và combat server, dùng các sprite child để trình bày; không nhân mục tiêu hay sát thương. Đây là việc còn lại, chưa phải hành vi đã có. Texture được cache/release theo consumer hiện có trong `visual-sprites.ts` và `visual-materials.ts`.

## Asset source

Packer duy nhất là `tools/assets/pack-monster-motion.py`: mặc định giữ đường legacy, còn `--asset <id>` đọc `assets/sprites/monster-motion/<id>/asset.json` cùng `source/export-manifest.json`. Chế độ manifest chỉ pack profile đã duyệt hướng/chuyển động, đủ clip và full-canvas PNG có alpha thật cùng vùng pixel trong suốt. Atlas/manifest runtime được chép vào `apps/client/public/assets/` và `web/`; preview từng clip cùng contact sheet nền sáng/tối nằm trong `web/previews/` và `web/`, với `web/qa.json`. QA của packer chỉ xác nhận cấu trúc, alpha và rect/anchor; trường `visualReview` vẫn chờ người xem.

Unit regression cho manifest packer chạy riêng bằng `python -m unittest tools/assets/test_pack_monster_motion.py`; đây là kiểm tra bổ sung ngoài `npm test`.

Roster, art brief và tiến độ sản xuất là stateful records trong [kế hoạch 39 quái và boss](../plans/261022-0002-monster-boss-assets/plan.md), không phải chứng cứ rằng art đã hoàn tất hoặc được nghiệm thu trong game. Bundle chưa có manifest sẽ tiếp tục dùng fallback. Để nghiệm thu hình ảnh, chạy build mới rồi kiểm tra theo checklist trong kế hoạch; client source hoặc QA số không thay thế việc xem game thật.

## Hắc Phong b001 — bundle ngày 2026-10-25

Đã chép manifest và hai trang WebP mới vào public assets: 12 clip, 68 frame (mỗi hướng: idle tĩnh ×1, walk ×8, attack ×8). Tổng WebP 808.850 byte; texture RGBA giải nén 18 MiB, chưa tính mipmap. Consumer hiện có chọn manifest qua `monsterId: b001`, không đổi gameplay. Giữ cỡ thân rest theo bộ cũ; canvas lớn hơn chứa tư thế giơ tay. Nguồn, mốc chân, hash và QA tại `assets/sprites/monster-motion/b001/source/` và `web/`.

Profile có thể khai báo `motionBoundsPx: [left, top, right, bottom]` để dành chỗ cho pixel chiếu xuống dưới anchor. Bounds phải ở trong source canvas, đúng kích thước `motionEnvelopePx`, có tâm ngang tại anchor và chứa độ cao anchor. Packer giữ một scale/root chung; profile cũ thiếu trường này giữ cách đặt cũ. Đây là bố trí canvas, không fit bbox từng frame.

Đã rà contact sheet và dữ liệu atlas; chưa chạy unit test, typecheck, build hoặc game. Cần kiểm tra sau build mới: hướng đi/đánh, chân/HP, chuyển idle–walk–attack, thời điểm nện tay so với event strike, reduced motion và tải/fallback. Chưa nghiệm thu hình ảnh trong game.

Timing attack b001 đã căn theo `swingProgress`: overhead frame 3 giữ tới 0,50, downstroke frame 4 từ 0,50–0,52, contact frame 5 bắt đầu ở strike 0,52. Chỉ đổi duration trong source manifest rồi pack lại; không đổi server damage. Regression dùng manifest thật tại `apps/client/test/monster-boss-timing.test.ts`, chưa chạy. Vẫn cần xem nhịp chuyển trong game.

## Kim Giác — bundle thư viện ngày 2026-10-25

`assets/sprites/monster-motion/art-gold-horn/package/` chứa runtime-format manifest và hai WebP, 68 frame/12 clip. `web/` giữ bản sao, QA, contact sheet sáng/tối và preview từng clip; `web/animations/` có tám WebP preview walk/attack từ atlas đã decode. Idle một frame, walk 933 ms loop, attack 1.000 ms với contact frame 4 ở tiến độ 0,52.

Chuỗi nguồn: `source/canonical-v1/prepare-canonical.py` → `source/prepare-export.py` → `source/pack-library.py`. Adapter cuối gọi packer project hiện có với destination nội bộ asset; không chép texture chưa routing vào public. Export giữ fixed walk translation mỗi hướng, source scale chung mỗi nhóm và guard cho Lanczos, không fit bbox/cắt silhouette từng frame. Hash/alpha/rect/timing được lưu trong `source/package-verification-v1.json`.

Kim Giác chưa có encounter routing, chưa build hoặc nghiệm thu game. Khi ghép với Ngân Giác cần rà camera thật, chuyển idle/walk/attack, spacing nhóm, HP/hitbox và thời điểm event trước khi chép các texture thực dùng vào public.


## Ngân Giác — bundle thư viện ngày 2026-10-25

`assets/sprites/monster-motion/art-silver-horn/package/` chứa manifest và hai WebP 924.602 byte, 68 frame/12 clip; decoded RGBA 18 MiB trước mipmap. `web/animations/` có tám preview walk/attack từ atlas; timing giống Kim Giác: walk 933 ms, attack 1.000 ms/contact 520 ms. Idle tĩnh; recovery east dùng đúng direction master để tránh tay áo bị cắt ở candidate sheet.

Dùng canonical prep riêng cho landmark nguồn; exporter và packer tái sử dụng đường hiện có của Kim Giác/project. Canonical prep của cả hai đọc immutable direction-source review để không lấy output export làm source khi chạy lại. Pixel-copy/hash/rect/anchor/timing và giới hạn nằm trong `source/motion-source-review-v1.json` cùng `source/package-verification-v1.json`. Chưa routing encounter, chưa chép public, chưa build hoặc nghiệm thu game; cần rà cặp Kim/Ngân trong camera trận sau khi tích hợp.
