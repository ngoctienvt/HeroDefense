---
phase: 3
title: "Kéo thả DOM, Babylon và xác nhận mạng"
status: pending
priority: P1
effort: "5–7h"
dependencies: [1, 2]
---

# Phase 3: Kéo thả DOM, Babylon và xác nhận mạng

[Kế hoạch](plan.md) · [Trước: bố cục](phase-02-compact-tray-and-inventory.md) · [Tiếp: hồi quy](phase-04-regressions-and-user-qa.md)

## Overview

Đã triển khai controller và tách policy, pointer adapter, pending store, presentation theo ranh giới hiện có. Kéo từ khay/lưới/ô đang mặc tới thân tướng, chân dung hoặc kho; client chỉ preview và gửi lệnh hiện có, server/snapshot xác nhận kết quả. Các tiêu chí dưới đây ghi nhận source/test đã viết, runtime chờ phase 4.

## Requirements

- Pointer Events, chuột trái primary, ngưỡng6 CSS px; ghost bám con trỏ, giữ kích thước, `pointer-events:none`, nằm ngoài vùng HUD bị replace. Không dùng HTML5 native drag/drop.
- Target hợp lệ: tướng thực thuộc mình từ snapshot mới nhất; nhận theo `item.slot`. Chân dung hoặc thân tướng tự tìm khe, ô cụ thể chỉ nhận cùng khe. Tướng đồng đội/địch/summon, ô trống không có tướng, terrain, HUD khác và khe sai đều không gửi lệnh; hiện lý do ngắn. Tướng mình chết/đang hồi sinh vẫn nhận đồ qua dock theo luật server hiện có; body pick chỉ nhận actor đang hiện/hợp lệ, không nhận xác/actor ẩn.
- Hover hợp lệ viền lục + tên tướng/khe + preview “món cũ → kho”; viền khác màu kèm chữ khi không hợp lệ. `gearLineFits` giữ warning/compare, không biến affix không hợp cơ chế thành khóa mặc.
- Đồ đang mặc → vùng kho trống được đánh dấu rõ = tháo. Không suy mọi pixel trống trên màn hình thành tháo. Chuyển sang tướng mình khác vẫn `equip-item`; món ở đích về kho, không swap. Thả lại đúng người đang mặc = no-op.
- Nhấp món rồi nhấp chân dung/thân tướng, Enter/Space trên tile/target, Escape hủy. Giữ hành động chi tiết “Mặc/Tháo” làm đường fallback cùng command pipeline; không tự chọn món mạnh nhất.

## Architecture

Tạo `gear-drag-controller.ts`: state gesture `idle → armed → dragging → pending`, target policy thuần có thể export từ cùng module; map pending riêng theo item và đích `(unitId,slot)` tránh lệnh cạnh tranh cùng khe. Chỉ một gesture đang diễn ra, các pending độc lập giữ source item ID và session generation; không giữ DOM ref làm nguồn dữ liệu.

**Render/input:** event delegation capture ở root ổn định. Trong press trước ngưỡng, giữ `HudRenderGuard` đủ cho click thường; khi bắt đầu drag, capture pointer ở root không bị replace rồi nhả guard control cũ. Ghost/compare gắn vào `HudOverlay.layer` hiện có, `pointer-events:none`, không thêm overlay framework; dock/panel/top/boss tiếp tục render từ snapshot. Sau rebuild, resolve source/target từ ID và gắn lại highlight; không giữ freeze toàn `render()` trong suốt gesture. `elementFromPoint` tìm target DOM thật vì event.target dưới pointer capture vẫn là root; chỉ gọi Babylon nếu điểm thực nằm trên canvas không bị HUD che. Tạm ngưng `setHover`/timer250ms/`refreshTooltip` và world `onHover` trong gear gesture để tooltip thường không che preview; hủy timer đang chờ rồi khôi phục sau gesture. Không bắt đầu khi overlay blocking (confirm/settings) đang mở; nếu modal blocking mở giữa kéo thì cancel trước commit.

**Battlefield:** đưa phần actor picking hiện có thành API dùng chung kiểu `pickActorAt(clientX,clientY)`; giữ predicate metadata/mesh, canvas rect và render scaling thống nhất. API trả ID, không phát selection/order. Highlight drop riêng với vòng chọn/hover thường; không xóa hay đổi nhóm RTS. Gear gesture chặn box-select, attack/move, camera pan/rotate và click tổng hợp; click fallback lên target cũng được consume trước selection. Lăn chuột trên kho khi kéo chỉ cuộn UI, không zoom camera; lăn trên sân trong gear gesture không zoom. Bình thường các gesture canvas giữ nguyên. Không mở thêm một dispatcher chiến đấu.

**Network:** `equip-item {itemId,unitId}` / `unequip-item {itemId}` giữ nguyên contracts và server validation. `GameSession.send` trả `number | null` theo command ID đã gửi thay cho `void`, callers cũ được bỏ qua return; thêm subscription ack hẹp và session-generation getter/event hoặc receipt phù hợp pattern sẵn có. Wrapper `send` ở main/context/controller phải truyền receipt khi cần; không đổi chữ ký command qua mạng. Trước gửi đọc lại item/owner/unit/slot từ snapshot, kiểm connected/generation và pending, rồi chỉ gửi một lần.

Pending ghi commandId + generation + expected item.unitId + source/destination ID, không mutate `player.gear`. Ack lỗi dọn pending và giữ slot snapshot; ack thành công chờ snapshot khớp. Snapshot có thể tới trước ack: matcher xác nhận và dọn indicator ngay, late ack đúng ID/generation chỉ hoàn tất bookkeeping, không render đúp/lùi state. Bỏ ack cũ sau leave/reconnect/đổi room. Không gắn “thành công” chỉ dựa ack hoặc animation.

Sau khoảng5s chưa xác nhận: báo đang đồng bộ, gọi lại đường `sync` hiện có một lần qua method hẹp; không tự gửi lại equip. Nếu vẫn không có state mới/đứt mạng, dọn preview và chỉ dẫn kết nối lại; giữ dữ liệu snapshot cuối cùng. Timeout không được unlock để spam cùng lệnh vô hạn; chỉ cho thao tác lại khi đã có snapshot/session mới xác định trạng thái.

## Related Code Files

- Tạo: `apps/client/src/gear-drag-controller.ts` (state/policy/cleanup, không framework mới).
- Sửa: `apps/client/src/main.ts`, `battlefield.ts`, `game-session.ts`, `hud-render-guard.ts`, `gear-ui.ts`, `gear-panel.ts`, `hud-dock.ts`, `hud-gear-tray.ts`, `styles/gear.css`; tái dùng `hud-overlay.ts` hiện có.
- Chỉ đọc: `packages/contracts/src/gear-types.ts`, `types.ts`, server validation và `packages/game-core/src/gear-commands.ts` theo owner thực tìm bằng `rg`; không sửa các lớp này.

## Implementation Steps

1. Viết target policy dựa snapshot sống và no-op/replace/unequip/invalid reason; dùng cùng policy cho drag, click và keyboard. Không thêm điều kiện HP/hero mechanic trái luật server.
2. Tạo gesture delegation, root capture và ghost; xác định target qua DOM trước, scene sau. Suppress click của gesture đã vượt ngưỡng, giữ click ngắn cho detail/arming; không giữ source node cũ.
3. Tách actor picker trong Battlefield và khóa RTS đúng thời gian gear gesture; phối hợp cancel trước khi rightclick có thể thành order. Tạo highlight/replacement preview, dọn lại mỗi target đổi.
4. Phối hợp render guard: gọi end khi root đã capture và drag được xác lập; snapshot trong drag không được bị `hudRenderGuard.defer()` chặn. Click/key thông thường vẫn giữ guard đến native click.
5. Bổ sung send receipt/ack subscription/generation/sync hẹp; pending theo item+đích, snapshot matcher và xử lý thứ tự ack/snapshot. Dọn subscription/timer ở dispose/leave.
6. Hủy trước commit khi Escape, rightclick, blur, pointercancel, lostpointercapture, rời phòng/mất kết nối, kết thúc trận/phase không còn cho phép, source không tồn tại hoặc mất quyền sở hữu: gửi0 lệnh, dữ liệu theo snapshot xác nhận. Sau pointerup đã gửi, Escape chỉ đóng preview; vẫn theo dõi pending đến ack/snapshot hoặc session cleanup, không giả vờ hoàn tác thao tác server. Nếu release capture bình thường phát lostcapture sau commit, không gửi/hủy lặp.
7. `pagehide` dọn listener/ghost/highlight/pending/timer và khóa input. Snapshot gearVersion mới resolve ID; hero bán/hợp nhất/rút quân hoặc đổi zone giữa kéo phải đánh giá lại, không dùng tọa độ cũ để gửi.
8. Debug `client.gear-drag.begin/drop/cancel/rejected`, thêm pending/confirmed/timeout khi cần: stable item/unit/command ID, slot, reason, duration; không player name/token, không log pointermove từng frame.

## Todo

- [x] Controller và picker không đổi RTS selection hoặc luật gear.
- [x] Một command/gesture, ownership check mới nhất và pending tương quan receipt.
- [x] Mọi đường cancel/dispose giải phóng capture, guard, ghost và highlight.

## Success Criteria

- [x] Drag khay/lưới → hero body/dock portrait và equipped → kho trống hoạt động cùng policy; cùng khe có replace preview.
- [x] Không gửi khi target invalid, item biến mất, disconnect hay gesture hủy; không tự retry equip.
- [x] Top/boss/HP vẫn cập nhật trong drag; render source lại không làm mất gesture.
- [x] Ack lỗi và snapshot trước/sau ack đều giữ đúng trạng thái server, pending không tồn tại qua session generation.

## Risk Assessment

- Babylon picking lệch do DPI/zoom/render scaling: dấu hiệu highlight lệch thân tướng; đối chiếu picker dùng chung, rect/camera/engine scaling và QA ở100/125/150% với DPR1/2. Không sửa bằng offset đoán.
- Guard/input handlers chạy thứ tự sai: dấu hiệu HUD đóng băng, mất capture hoặc phát lệnh di chuyển khi drop; khoanh listener capture và trạng thái gesture, viết hồi quy trước khi chỉnh.
- Source item đổi người do lệnh khác: đánh giá lại trước drop và snapshot; nếu state không còn phù hợp thì cancel rõ lý do, không đoán hoàn tác server.
- API ack là thay đổi client xuyên module: giữ subscriber cleanup và return tương thích callers bỏ qua receipt; review riêng generation/race trước bàn giao. Authorization vẫn ở server, client check chỉ phục vụ UX.
- Rollback: khôi phục wiring controller/picker, giữ click equip cũ qua chi tiết; không sửa dữ liệu server để hoàn tác một preview.
