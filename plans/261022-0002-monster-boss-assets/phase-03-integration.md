---
title: "Tích hợp và nghiệm thu"
status: in_progress
priority: P1
dependencies: [2]
---

# Phase 3: Tích hợp và nghiệm thu

## Overview

Xây tuyến manifest runtime và mở rộng từ pilot sang thư viện 39. Theo yêu cầu người dùng, phần resolver/atlas consumer được làm song song khi art tiếp tục sản xuất; chỉ tích hợp asset sau khi đủ source/action/QA. Chưa có nghiệm thu trong game.

## Requirements

- [ ] Giữ gameplay, 5 network ID cũ, một enemy mỗi phụ bản và server authority.
- [ ] Dùng manifest theo asset cho rect/anchor/timing/direction; loại giả định 7 cell và mirror khỏi tuyến bộ mới.
- [ ] 23 thiết kế chưa có slot vẫn có preview/bundle sẵn dùng, không tự đưa vào spawn pool.
- [ ] Tải theo nhu cầu, dùng chung texture, dọn actor/group/material theo vòng đời project.

## Architecture

Enemy snapshot → resolver art ID ổn định → manifest/texture cache → một sprite hoặc group children → action theo event. Quái cũ dùng monsterId; dungeon chọn visual ID từ zone/dungeon definition qua mapping rõ ràng, không suy tên hiển thị. Nếu cần trường giao thức mới, cập nhật đồng bộ contract/server/client và validation; ưu tiên mapping hiện có đủ dùng trước.

Kim/Ngân Giác và Ma Gia giữ 2/4 sprite con, một root/HP/hitbox và một timeline combat. Không thay vòng thắng/thua ở `dungeons.ts`. Với asset tải lỗi, có fallback nhìn thấy được và log một lần có giới hạn.

## Related Code Files

- Modify: `apps/client/src/monster-motion.ts`, `visual-sprites.ts`, `visual-actors.ts`, `visual-materials.ts`.
- Add: `apps/client/src/dungeon-boss-visuals.ts` for presentation-only zone mapping; keep zone/entity protocol unchanged.
- Inspect trước khi sửa: nơi dựng enemy trong `apps/client/src/battlefield.ts` và các module liên quan; nơi xử lý chết/hit/cast trong `visual-effects.ts`.
- Read: `packages/contracts/src/types.ts`, `packages/game-core/src/dungeons.ts`, `horde-waves.ts`, `combat.ts`, `crowd-movement.ts`. Chỉ sửa protocol khi mapping client hiện tại không đủ và phạm vi đã rõ.
- Modify/add: tests gần `apps/client/test/monster-motion.test.ts` và `apps/client/test/dungeon-boss-visuals.test.ts`; test lifecycle/resolver tại chỗ phù hợp sau scout.
- Runtime: `apps/client/public/assets/`; contract và cách tải được ghi trong [docs/monster-boss-sprites.md](../../docs/monster-boss-sprites.md), liên kết từ README.

## Implementation Steps

1. [x] Thay frame resolver cho bộ mới bằng manifest; giữ legacy fallback cho asset chưa chuyển. Cỡ plane/HP theo metadata từng asset, không hardcode số boss vào nhánh kích thước chung.
2. [x] Nối anchor mặt đất/camera LH, clock walk liên tục, idle cố định, action event, hit-stop và reduced motion. Không điều khiển damage bằng animation event client.
3. [x] Nối 5 ID cũ và mapping 8 phụ bản. Boss nhóm dùng offset cố định trong cùng ground space, thứ tự vẽ ổn định và một hitbox `actorId` chung theo pattern chọn actor hiện hữu.
4. [x] Hit dùng cue hiện có mà không yêu cầu pose mới; cast giữ pose lấy đà attack nếu cần. Khi server xóa enemy thì dọn toàn bộ visual/group theo luồng hiện có, không thêm death animation/corpse hoặc kéo dài boss AI/reward.
5. [x] Thêm log giới hạn `sprite.monster-config`, tải thành công/fallback, asset thiếu direction/clip và cleanup group. Không log tên người chơi/token.
6. Cache texture theo art ID, preload theo encounter; không dispose texture còn actor khác dùng. Đo texture resident/overdraw cùng hero và VFX khi người dùng chạy pilot; chọn ngân sách sau số đo.
7. Viết hồi quy cho direction/UV, idle, timing/loop, anchor/scale, reduced motion, missing-asset fallback, group một entity và cleanup; đọc lại đường event → actor → VFX → dispose. Không chạy test thay người dùng.
8. Sau mỗi lô, chép asset runtime thực dùng và cập nhật trạng thái từng bộ. Các bộ chưa có slot chỉ ở thư viện/preview, không tải sẵn trong trận.
9. Người dùng chạy typecheck/test/build và restart launcher theo plan.md. Nghiệm thu 1–4 làn, bốn hướng, boss đôi/tứ tướng, nền sáng/tối, zoom/camera, reduced motion, chết/đổi dungeon và texture lỗi.

## Todo

- [ ] Xác minh kết quả tích hợp/nghiệm thu pilot từ phase 1 còn được bảo toàn khi mở rộng.
- [ ] Nội dung hiện có có art phù hợp; 23 mẫu chưa có slot đóng gói đầy đủ và báo rõ chưa spawn tự nhiên.
- [ ] Một boss nhóm = một enemy/HP/selection; không có impact/damage cue nhân lên.
- [ ] Có test hồi quy và log; agent đọc source/manifest/diff, người dùng chạy kiểm tra.
- [ ] Đo tài nguyên và cleanup tại encounter thật; không kết luận FPS khi chưa đo.

## Progress log

- 2026-10-22: Bắt đầu runtime foundation song song với sản xuất art. Packer và client cùng dùng manifest `monster-motion-runtime.v1`; resolver hỗ trợ nhiều page, clip theo bốn hướng, frame count/duration, một movement action, reduced motion, anchor/scale metadata và ID slug validation. Legacy atlas còn fallback đến khi bundle mới sẵn sàng. Đã thêm hồi quy selector/UV nhưng không chạy test, typecheck hay build theo AGENTS.md. Không có runtime manifest/asset mới để kiểm tra end-to-end.
- 2026-10-22: Thêm mapping client zone 1–8 theo roster đã duyệt. Kim/Ngân và Ma Gia được dựng thành sprite child cùng root/timeline, một hitbox selection; child có thứ tự alpha ổn định, và fallback generic còn dùng cho tới khi tất cả manifest của nhóm tải xong. Đã thêm test mapping, chưa chạy; hình ảnh nhóm chưa thể nghiệm thu vì các bundle chưa có.
- 2026-10-22: Source review xác nhận boss phụ bản vẫn đi qua một `Enemy`/`VisualActor`, group children chia sẻ root/timeline và hitbox có cùng `actorId`; không đổi server combat. Sửa parser runtime để chấp nhận frame ở atlas origin `(0,0)` do packer phát ra, thêm hồi quy fetch-manifest. Siết packer với asset slug, profile status/action shape và số hữu hạn. Chỉ chạy Python AST parse và `git diff --check`; không chạy test/typecheck/build/game theo AGENTS.md. Chưa có `source/export-manifest.json`, nên chưa thể pack hoặc tích hợp art thật.
- 2026-10-22: Gom actor teardown vào một helper dùng cho snapshot removal và clear; group nhiều sprite phát log `sprite.monster-boss-group-cleanup`, root dispose đệ quy child/hitbox. Boss đơn được vùng click client lớn hơn; không đổi collision gameplay. Source event handler chỉ phát theo một server event/actor, cast của manifest dùng anticipation frame attack. Source review hoàn tất bước 3–5; chưa có runtime art để xác nhận bằng encounter.
- 2026-10-22: Khi đổi zone, client gọi preloader theo encounter: zone 0 nạp legacy texture của 5 ID horde; dungeon chỉ nạp roster visual của zone đó. Manifest promise và material cache dùng chung với actor resolver; manifest bundles thì yêu cầu mọi page, legacy fallback nạp hai atlas hiện có. Missing/invalid manifest đi qua log fallback giới hạn. Chưa đo thời gian tải hoặc bộ nhớ vì chưa có bundle runtime.
- 2026-10-22: Bổ sung resolver regression cho manifest 404, frame origin, thiếu direction/clip, page filename traversal và preloader chỉ yêu cầu asset đúng encounter (5 legacy ở zone 0 hoặc boss theo mapping). Preload hủy thao tác vật liệu sau khi scene owner dispose; có hồi quy cho lifecycle này. Test đã viết, không chạy theo AGENTS.md.
- 2026-10-22: Thêm [docs/monster-boss-sprites.md](../../docs/monster-boss-sprites.md) và README link cho manifest, fallback, preload, group/server invariant, cleanup và asset source. Ghi rõ bundle chưa có manifest chưa phải art đã tích hợp hay nghiệm thu.
- 2026-10-22: Source review packer phát hiện `pack_profile()` đọc biến `status` ngoài scope sau khi đã nhận `profile`; đường `--asset` sẽ lỗi `NameError` trước khi đóng gói. Đổi sang `profile["status"]` (đã kiểm tra là object trong `_load_manifest`) và thêm unit regression cho bundle runtime cùng chặn directions chưa duyệt. Chỉ parse AST cho hai file Python; không chạy unit/npm tests, typecheck, build hoặc game theo AGENTS.md. Chưa có export manifest để pack art thật.
- 2026-10-22: Đóng vòng đời cache monster texture: actor và preload giữ lease theo asset/page; đổi zone/clear giải phóng preload, actor removal/scene dispose giải phóng lease của actor; chỉ dispose material/texture khi reference cuối cùng được thả. Preloader bỏ qua cả material request hoàn tất sau zone change lẫn request cũ bị khớp lại do quay về zone trước. Cập nhật test refcount/preload và docs. Chưa đo RAM/GPU vì chưa có bundle art; test chưa chạy theo AGENTS.md.
- 2026-10-22: Rà race lúc đổi zone cho thấy preloader chờ đủ page 0 có thể bật mesh trong khi clip đầu tiên nằm page khác; sửa `ready()` chờ mọi page của manifest trước khi bật sprite. Manifest thành công giờ không tải song song atlas motion/static legacy; procedural fallback giữ chỗ tới khi trang runtime sẵn sàng, legacy chỉ được tải khi manifest thiếu/lỗi. Không typecheck/build/test theo giới hạn AGENTS.md.
- 2026-10-22: Review snapshot/render xác nhận constructor của actor ở zone ẩn vẫn tự fetch manifest dù preloader chỉ chọn zone hiện hành. Chuyển manifest fetch sang `activate()`, truyền active-zone lúc tạo actor, gọi activate trên zone change/update, và thêm regression dùng Babylon `NullEngine` kiểm tra actor off-zone không fetch trước khi activate. Cập nhật docs. Test chưa chạy theo AGENTS.md.
- 2026-10-22: Mở rộng `--asset` để ngoài atlas runtime còn tạo atlas/manifest cạnh nhau trong `web/`, preview từng clip trên nền sáng/tối, contact sheet có nhãn và `web/qa.json`. QA ghi trạng thái kiểm tra dữ liệu riêng, luôn để duyệt hình `pending-human-review`; không đánh pass chất lượng art bằng số liệu packer. Chạy Python AST parse và đọc lại code/docs; chưa chạy test, build hoặc game. Chưa có export manifest/art motion-approved nên chưa thể kiểm tra output bằng dữ liệu thật.
- 2026-10-22: Rà biên ghi preview phát hiện tên action trong profile chưa bị giới hạn trước khi ghép vào đường dẫn file. Thêm slug validation cho action; preview resize RGBA premultiplied để tránh viền màu alpha. Route report mới vẫn cho thấy chưa có API route và quota host image chưa reset. Chưa chạy test/build/game; packer vẫn chưa có nguồn motion-approved để thử tạo bundle thực.

## Success Criteria

Nguồn và asset tích hợp nhất quán; đủ thư viện 39; gameplay hiện tại giữ nguyên. Phân biệt completion của sản xuất art với nghiệm thu chạy thật; không tuyên bố tất cả 39 đã xuất hiện tự nhiên khi 23 mẫu chưa có slot gameplay.

## Risk Assessment

Client generic enemy và dungeon chưa có art ID có thể bỏ qua resolver: scout luồng dựng actor trước khi sửa. Group che nhân vật/HP hoặc không vừa đảo: giảm spacing/pose/scale theo cùng profile, kiểm tra camera thật; không đổi collision. Nếu budget không đạt, chia atlas/load theo khu vực và giảm overdraw, không bỏ hướng hoặc giả animation bằng biến dạng.

- 2026-10-25 current-state audit: `dungeon-boss-visuals.ts` không tồn tại; `visual-actors.ts` chọn hero qua skinHeroId hoặc monsterId, preloader chỉ lấy legacy ở zone0. Các ghi chép mapping nhóm trước đó là lịch sử, không là bằng chứng đã tích hợp. Kim Giác đã có library bundle; chưa tự khôi phục mapping hoặc đổi spawn/gameplay, cần đối chiếu encounter hiện tại khi làm routing.
