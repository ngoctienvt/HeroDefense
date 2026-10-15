---
phase: 1
title: "Chọn nhóm và lệnh RTS có xác thực"
status: in-progress
priority: P1
effort: "3–5 ngày kỹ thuật, ước lượng thô"
dependencies: []
---

# Giai đoạn 1: Chọn nhóm và lệnh RTS có xác thực

Triển khai xong phần điều khiển và xác thực; xem [QA gameplay](./reports/playability-qa.md). QA lifecycle nhiều client/zone vẫn mở.

## Bối cảnh và mục tiêu

[Tổng kế hoạch](./plan.md), [gameplay hiện tại](../../docs/gameplay-spec.md). Đầu ra là chọn/ra lệnh được cho tối đa năm quân của người chơi, đồng bộ với server và vẫn dùng được HUD. Chưa thay bản đồ ở giai đoạn này.

Source đã xác minh: `main.ts` giữ một chuỗi `selected`; `battlefield.ts` chỉ xử lý pointerdown và một vòng chọn. Phím Ctrl đang bị bỏ qua, `1–5` chọn ô, A chỉ cho chọn enemy. Move tới điểm rồi tự kiếm địch trong bán kính 19; S giữ `stopped` làm ngừng mọi đánh; H/N là vị trí trở về, không phải hold-position.

Người dùng đã chốt: **mỗi người chỉ điều khiển quân mình**. Giữ kiểm tra owner tại server cho từng ID trong lệnh nhóm; không cấp quyền điều khiển quân đồng đội.

## Yêu cầu thao tác

- Click quân thay selection; Shift+click bật/tắt quân trong selection. Kéo trái vượt ngưỡng nhỏ tạo khung screen-space; thả chọn quân có tâm chiếu nằm trong khung. Shift+kéo thêm các quân chưa chọn; Shift+click là thao tác bỏ riêng từng quân. Click nền trống xóa selection; Esc hủy khung/chế độ A, không gửi lệnh.
- Marquee chỉ lấy quân mình, sống, đang triển khai và đang ở zone được xem; không lấy bench, quái, quân ẩn/zone khác. Card bench vẫn chọn được làm chi tiết triển khai nhưng không trở thành selection chiến trường.
- Pointer capture xuyên ra ngoài canvas; pointerup ngoài canvas hoàn thành một lần nếu vị trí hợp lệ; pointercancel/lost capture/blur hủy sạch trạng thái kéo. Không chọn khi kéo camera bằng nút giữa; HUD overlay không khởi động drag.
- Selection là tập ID có thứ tự ổn định và một `primaryId` để hiện chi tiết/Q. Nhiều vòng chọn, HUD hiện số quân/chân dung/trạng thái; đổi primary bằng click chân dung không vô tình mất nhóm.
- Đã chốt: Ctrl+1–9 thay nhóm bằng selection hợp lệ; 1–9 gọi nhóm, singleton cũng như nhóm nhiều quân. Chuyển chức năng chọn ô cũ về click ô, không còn handler phím 1–5. Nhóm trống thông báo nhẹ.
- Chỉ bắt/preventDefault phím nhóm khi canvas thực sự giữ focus; không bắt khi gõ input/select/textarea/contenteditable, ở HUD, dùng Alt/Meta hoặc ngoài game. Xác minh thực tế Ctrl+digit vì trình duyệt dùng để đổi tab; không can thiệp toàn trang.
- Đề xuất nhóm lưu RAM ở client trong phiên tab, không hứa persistence qua refresh. ID bị bán/hợp nhất mất khỏi nhóm; bản được giữ sau hợp nhất giữ ID. Quân chết rời selection đang hoạt động, nhóm giữ ID để recall sau hồi sinh; recall bỏ quân chết/bench/khác zone. Không tự đổi zone để kéo quân từ nhiều bí cảnh.
- Khi mất mạng: khóa gửi lệnh, hủy drag/A; reconnect cùng phòng/identity chỉ giữ ID còn hợp lệ sau snapshot. Leave, đổi phòng/identity, refresh xóa selection/nhóm. Không dùng ID cũ điều khiển phiên mới.

## Kiến trúc và semantics lệnh đề xuất

Client chọn ID → một batch order tối đa 5 ID → envelope/ACK/dedup/rate limit hiện có → core xác thực toàn batch trước khi mutate → snapshot là nguồn trạng thái. Batch tránh biến một click thành năm command gây burst. Đề xuất reject toàn batch khi một ID không hợp lệ, có thông báo; client lọc lại snapshot rồi người dùng ra lệnh mới, không tự retry mù.

Tách order hiện hành thành union trạng thái rõ ràng, không chồng `target/destination/stopped` với nghĩa trái nhau. Giữ trạng thái idle tự chiến; migrate initializer, respawn, bench/deploy, dungeon enter/return cùng lúc.

| Lệnh | Hành vi đề xuất cần thể hiện rõ trong HUD |
|---|---|
| Move / phải nền | Tới điểm, không tự đuổi dọc đường; tới nơi về idle tự chiến. |
| Attack-target / phải quái hoặc A+quái | Tập trung mục tiêu hợp lệ cùng zone, đuổi trong biên map; mục tiêu chết/mất hợp lệ thì về idle. |
| Attack-move / A+nền | Đi tới điểm; gặp địch thì đánh/đuổi theo giới hạn; xong tiếp tục đích cũ. Không biến thành attack-target cố định. |
| Stop / S | Hủy order/target/đích, dừng ngay rồi về idle; tự đánh lại từ tick sau. Đây là thay đổi có chủ đích so với S ngừng đánh vĩnh viễn hiện tại. |
| Hold / nút Giữ vị trí | Đứng nguyên, chỉ đánh địch trong tầm, không chase. Chưa gán H vì H đang có nghĩa khác. Lệnh mới giải phóng hold. |
| H / N | Giữ lưu/xóa vị trí trở về theo hiện trạng, thao tác với quân hợp lệ đang chọn; không đổi thành hold. |
| Q | Đề xuất cast cho primary đang sống/cùng zone; không xả kỹ năng toàn nhóm. |

Tự dùng kỹ năng giữ mặc định hiện có và cùng cooldown authoritative với Q; HUD nói rõ tự dùng + Q thủ công. Chưa thêm mode manual-only/toggle hàng loạt nếu người dùng chưa yêu cầu. Cast trong hold không kéo quân khỏi chỗ đứng. Giữ thao tác sửa trang bị/bán/hợp nhất trên primary để tránh thao tác kinh tế cả nhóm ngoài ý muốn.

Move nhóm dùng offset nhỏ theo thứ tự ID/slot ổn định, clamp theo vùng hợp lệ trên server, tránh cùng một điểm hoàn toàn. Attack-target có điểm tiếp cận/offset giới hạn để giảm chồng hình, không tự dịch target. Không xây hệ collision/pathfinder tổng quát.

## Tệp liên quan

| Hành động | Đường dẫn tuyệt đối | Nội dung |
|---|---|---|
| Sửa | `D:\HeroDefense\apps\client\src\main.ts` | Selection/groups, hotkey focus, phân phối order. |
| Sửa | `D:\HeroDefense\apps\client\src\battlefield.ts` | Drag/capture/project screen-space, vòng chọn, pointer cleanup. |
| Sửa | `D:\HeroDefense\apps\client\src\panels.ts` | HUD nhóm, primary, nút hold, cẩm nang. |
| Sửa | `D:\HeroDefense\apps\client\src\styles.css` | Khung kéo/nhóm/trạng thái; không che canvas. |
| Sửa | `D:\HeroDefense\packages\contracts\src\types.ts` | Batch order, order state, version compatibility. |
| Sửa | `D:\HeroDefense\packages\game-core\src\commands.ts` | Xác thực order/nhóm nguyên tử. |
| Sửa | `D:\HeroDefense\packages\game-core\src\combat.ts` | State machine và resume attack-move. |
| Sửa | `D:\HeroDefense\packages\game-core\src\roster.ts`, `D:\HeroDefense\packages\game-core\src\dungeons.ts` | Khởi tạo/reset order khi lifecycle đổi. |
| Sửa | `D:\HeroDefense\apps\server\src\validation.ts`, `D:\HeroDefense\apps\server\src\game-room.ts` | Boundary schema, ACK/dedup/limit batch. |
| Sửa | `D:\HeroDefense\apps\client\src\game-session.ts` | Version/reconnect/mismatch; không replay lệnh đã ACK. |
| Sửa | `D:\HeroDefense\apps\client\src\debug.ts`, `D:\HeroDefense\apps\server\src\debug-log.ts` | Log có giới hạn, không tên/token. |
| Sửa | `D:\HeroDefense\packages\game-core\test\commands.test.ts`, `D:\HeroDefense\packages\game-core\test\combat.test.ts`, `D:\HeroDefense\packages\game-core\test\fixtures.ts` | Semantics/lifecycle/regression core. |
| Sửa | `D:\HeroDefense\apps\server\test\validation.test.ts`, `D:\HeroDefense\apps\server\test\network.test.ts`, `D:\HeroDefense\apps\client\test\game-session.test.ts` | Payload abuse, mạng thật và reconnect. |
| Tạo khi tách giảm phức tạp | `D:\HeroDefense\apps\client\src\selection.ts`, `D:\HeroDefense\apps\client\test\selection.test.ts` | Helper selection/groups thuần, test không giả vờ thay browser. |
| Cập nhật khi hoàn tất behavior | `D:\HeroDefense\README.md`, `D:\HeroDefense\docs\gameplay-spec.md` | Phím và semantics mới đúng source. |

Không xóa file; không tạo abstraction service mới. Tệp mới chỉ khi trách nhiệm selection đủ độc lập; tránh làm `main.ts` phình quá mức.

## Bước thực hiện

1. Repro input hiện tại trong browser local: focus canvas/HUD, nút chuột, A/S/H/N; ghi baseline và các khác biệt đã nêu. Kiểm tra process/port hiện có trước khi khởi server; chỉ dừng process do phiên này tạo.
2. Viết regression semantics core trước; định nghĩa union order và batch schema. Server kiểm tra 1–5 ID duy nhất, identifier hợp lệ, quyền sở hữu, deployed/alive, cùng zone, finite/bounds tọa độ, mục tiêu còn sống cùng zone. Sai bất kỳ phần nào không mutate.
3. Cập nhật order engine, lifecycle, offsets deterministic và version; giữ Q cooldown/tự cast. Không cho client chọn speed/position/state trực tiếp.
4. Làm helper selection/groups rồi drag/capture/screen projection; integrate primary và HUD. Screen projection phải tính canvas bounding rect/DPI; không trộn CSS pixels với render pixels.
5. Chuyển hotkeys 1–9, scope focus, bỏ slot hotkey cũ. Hoàn chỉnh blur/cancel/leave/dispose và snapshot cleanup; bảo toàn listener lifecycle đang có test.
6. Dùng log hiện có: `selection.changed` số lượng/zone, `group.assign/recall` số nhóm/số ID hợp lệ, `order.sent/rejected` loại/count/reason; không log mỗi pointermove/tick hoặc payload đầy đủ. Log không chứa reconnect token/tên người chơi.
7. Chạy test mục tiêu, kiểm tra browser một/two-client, cập nhật guide/docs; review schema/ownership/input cleanup trước khi chuyển phase 2.

## Kiểm tra

Chạy từ `D:\HeroDefense`: `npx vitest run packages/game-core/test/commands.test.ts packages/game-core/test/combat.test.ts`. Sau đó `npm run test:server`, `npx vitest run apps/client/test`, `npm run typecheck`, `npm test`, `npm run build`.

| Nhóm | Case bắt buộc |
|---|---|
| Selection/group | Click/Shift/drag 0,1,5 quân; drag ngược; CSS scale/DPI; ngoài canvas/blur/cancel; HUD typing; Ctrl1/Ctrl9 chỉ canvas; singleton; merge/sell/death/respawn/bench. |
| Orders | Move không chase trước đích; attack-move đánh rồi tiếp tục; target chết/khác zone; stop khác hold; hold không chase; Q primary; H/N không mất. |
| Boundary | Empty/6 ID/duplicate/unknown/other owner/dead/bench/mixed zone; NaN/Infinity/out of map/unknown fields; reject không mutate một phần. |
| Network | Một click nhóm một envelope/ACK; duplicate ID envelope không làm hai lần; stale sequence/rate burst; reconnect giữ identity/version hợp lệ; version cũ báo reload. |

## Điều kiện hoàn tất

- [x] Click/drag/Shift, primary và nhóm 1–9 đúng UX; không xung đột input HUD/browser ngoài canvas.
- [x] Server sở hữu state, từ chối batch trái quyền/không hợp lệ; dedup/ACK/rate limit vẫn có test mạng thật.
- [x] Các order có test semantics, offset không stack tại một tọa độ, Q không cast cả nhóm.
- [ ] Lifecycle selection/groups/order qua dungeon, respawn, merge/sell, reconnect/leave không sót ID.
- [x] Test mục tiêu và full typecheck/test/build pass; log bounded và docs/cẩm nang đúng hành vi.

## Rủi ro và rollback

- Canvas focus/preventDefault không chặn được một shortcut trình duyệt cụ thể: ghi browser/version và repro; sửa scope listener/focus trước, không đổi Ctrl+1–9 đã chốt âm thầm. Nếu browser không hỗ trợ thực sự, báo cần quyết định UX thay vì tuyên bố pass.
- Batch khiến ACK mơ hồ hoặc từ chối vì ID vừa chết: server reject nguyên tử, thông báo và refresh selection; không bỏ ownership để dễ pass.
- State union tác động nhiều lifecycle: các test deploy/respawn/dungeon/reconnect là gate. Không ship nếu còn đường tạo unit thiếu state.
- Hợp lưu khiến người chơi chọn nhầm quân đồng đội: lọc owner ngay từ selection và bắt buộc xác thực owner lần nữa ở server. Test batch có một ID của người khác phải bị từ chối toàn bộ, không điều khiển một phần.
- Rollback cả client/contracts/server/core tương thích cùng version; không trộn bundle cũ mới. Với state RAM không hứa hot-migrate trận đang chạy; drain kết thúc phòng trước khi thay release. Không revert thay đổi người dùng.
