---
phase: 2
title: "Khay nhanh và kho dạng lưới"
status: pending
priority: P1
effort: "3–4h"
dependencies: [1]
---

# Phase 2: Khay nhanh và kho dạng lưới

[Kế hoạch](plan.md) · [Trước: tile](phase-01-gear-art-and-tiles.md) · [Tiếp: kéo thả](phase-03-drag-drop-and-pending.md)

## Overview

Thay danh sách thẻ dài bằng khay đồ nhanh và một lưới chọn món; chi tiết chỉ dựng cho món đang chọn. Giữ mọi thao tác kinh tế hiện có và đường xem đồ đang mặc/dự bị.

## Requirements

- Khay trái dưới cạnh badge, **4 cột × 2 hàng**, 44px/tile, gap6px, khoảng208px rộng ×130px cao cả header/padding; 8 món chưa mặc/trang, số tổng, trước/sau, thu gọn, `I`. Thứ tự giữ logic `filterGear` (phẩm → cấp → +N → ID), không tự stack nhiều món cùng ảnh.
- Drawer `I` tối đa460px từ1366px ngang; ở1280px luôn dùng340px. Lưới48px/tile, ít nhất5 cột ở drawer340px; tối đa40 món/trang, không dùng “Xem thêm” tích lũy DOM.
- Mặc định chỉ đồ trong kho; tab/bộ lọc “Đang mặc” giữ đầy đủ truy cập trước đây. Bộ lọc khe/phẩm, số kết quả và trạng thái trống. Trang được clamp khi snapshot xóa/chuyển món, không mất selection còn tồn tại.
- Một detail cho món chọn: `gearDetail`, `gearComparison`, người đang mặc, giá cường hóa/tẩy luyện/phân giải đọc từ helpers. Giữ confirm cho salvage và salvage trắng theo queue hiện có; không tự phân giải.
- Dải 5 chân dung trong kho làm drop target; dock vẫn 3 khe/tướng. Chọn tướng dự bị từ Đội Hình vẫn dùng detail/nhấp để mặc; không vô tình giới hạn server command về chỉ 5 tướng xuất trận.

## Architecture

`hud-gear-tray.ts` chỉ render 8 tile + pager; `gear-panel.ts` sở hữu lưới/selection/filter. ID món, page/filter và target preview là state trình bày tách khỏi RTS `selected`/group selection. Bổ sung những input này vào render signature/invalidation ở `main.ts`; callback đổi page/filter phải refresh ngay, snapshot chỉ đổi giá trị liên quan. Focus và scroll khôi phục theo ID/key, không giữ node cũ.

Ngân sách ngang (CSS px, border-box): rail + khoảng phải68; dock chuẩn badge148 + 5×112 + 5×6 gap = **738px**. Trái12 + dock738 + gap8 + drawer460 + phải68 = **1286px**: không vừa1280, vừa1366. Vì thế ở1280 luôn dùng drawer340px, tổng **1166px**, còn114px; từ1366 có thể dùng460px. Khi đóng kho, thêm khay208 + gap6 vào dock = **952px**, vẫn dưới phần HUD khả dụng1188px. Các số là ngân sách thiết kế từ source, chưa đo runtime.

Theo phản hồi ngày 28/10: khi Kho Đồ mở vẫn giữ khay nhanh. Ở chiều ngang ≤1520px, khay chuyển lên trên hàng thẻ tướng để giữ footprint ngang738px; trên1520px có thể giữ khay và dock cùng hàng. Counter vẫn wrap trong badge. Thanh triệu hồi và action không bành sang drawer. Với chiều ngang dưới1366px, drawer về340px; nếu dưới ngân sách1166px thì badge thu gọn. Không giảm tile32/44/48px hay ẩn ba khe. Chiều cao khay có thêm dải tháo đồ32px, chưa gồm xác nhận bố cục runtime. Không cam kết touch gameplay.

Ngân sách dọc ở720px: top76 + gap4; drawer từ80 đến708 =628px. Header40 + mục tiêu60 + filter/tab64 + grid200 + pager28 + khoảng/viền24 =416px, còn khoảng212px detail. Grid/detail cuộn nội bộ riêng hoặc detail bật mở thu grid; luôn thấy nút đóng, chân dung nhận đồ và control chính. Nội dung unique dài cuộn, không cắt chữ/giá.

## Related Code Files

- Sửa: `apps/client/src/gear-panel.ts`, `gear-ui.ts`, `hud-dock.ts`, `main.ts`, `styles/gear.css`, `styles/hud-dock.css`, `styles/hud-rail-drawer.css`.
- Tạo: `apps/client/src/hud-gear-tray.ts` (chỉ bề mặt HUD nhỏ).
- Tái dùng: `panel-context.ts`, `gearLineFits`, helpers giá/so sánh và `GameSession.queueWhiteSalvage`.

## Implementation Steps

1. Tạo state chọn item/filter/page và hàm lấy một trang không mutate `player.gear`; stable item ID phân biệt đồ cùng hình.
2. Đổi `gear-panel.ts` sang grid + detail; bỏ dropdown nhận tướng và card chi tiết cho từng món. Giữ chức năng mặc/tháo bằng click, target riêng và thao tác tướng dự bị.
3. Giữ khay cả khi kho mở; số món/phân trang/thu gọn có accessible label. Chọn món trong khay không tự mở bảng lớn. Tái dùng tile và tooltip cùng detail, không renderer chi tiết thứ hai.
4. Gắn `data-gear-item-id`, `data-gear-target-unit-id`, `data-gear-slot` và vùng `data-gear-bag-drop` rõ ràng. Không lồng button trong button; tile con không kích hoạt chọn thẻ ngoài ý muốn.
5. Sửa CSS theo ngân sách trên; giữ top/boss/action/rail đúng thứ tự z-index, khay không phủ thanh triệu hồi. Dọn CSS `.card-gear { display:none }` xung đột.
6. Ghi debug gọn `client.gear-inventory-view` khi đổi chế độ/filter/page (count, page), không log mỗi render/tên người chơi.

## Todo

- [x] Khay 8 món, grid tối đa40, một detail.
- [x] Tướng xuất trận/dự bị và món đang mặc vẫn thao tác được.
- [x] Chế độ kho mở vẫn giữ khay, giữ dock và giải quyết counter ngang; đã cập nhật nguồn theo phản hồi ngày 28/10, runtime chờ người dùng kiểm tra.

## Success Criteria

- [x] Bộ 300 món render ≤40 tile inventory + 1 detail, khay ≤8; chuyển trang vẫn truy cập được mọi ID.
- [x] Giá/compare/unique/fit warning giữ nguyên helper, không tạo luật mới.
- [x] CSS đã đặt drawer340px, grid ít nhất5 cột48px và ba khe dock32px ở1280px; kiểm chồng/tràn thực tế tại1280×720 chuyển sang QA phase 4, chưa kết luận đạt.

## Risk Assessment

- Counter hoặc chuỗi tiếng Việt vượt ngân sách: dấu hiệu là rect dock chạm drawer/rail; thu drawer về340px và wrap counter trong badge trước, chỉ thu badge nếu vẫn thiếu. Không giấu cả dock hoặc đẩy kho thành toàn màn hình.
- Snapshot thay selected item: nếu item biến mất, xóa detail và thông báo ngắn; nếu item còn, giữ ID/page khi hợp lệ và cập nhật data mới.
- Rollback: chuyển bề mặt render về panel cũ qua Git; dữ liệu món và lệnh không thay.
