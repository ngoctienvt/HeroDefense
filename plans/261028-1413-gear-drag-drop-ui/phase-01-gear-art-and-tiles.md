---
phase: 1
title: "Art trang bị và tile dùng chung"
status: pending
priority: P1
effort: "2–3h kỹ thuật; art iteration riêng"
dependencies: []
---

# Phase 1: Art trang bị và tile dùng chung

[Kế hoạch](plan.md) · [Tiếp: bố cục](phase-02-compact-tray-and-inventory.md)

## Overview

Đã tạo ba master PNG gốc và xuất ba WebP 128×128; một renderer tile dùng chung thay icon trang bị. Nguồn, prompt, manifest và script xuất giữ ở `assets/ui/gear/`; ảnh 32px nền sáng/tối đã chuẩn bị. Người dùng nghiệm thu hình ảnh ở phase 4.

## Requirements

- Đề xuất chốt art: kiếm mũi rộng, giáp thân và pháp khí dạng bùa/ngọc; fantasy phương Đông vẽ tay, cel shading, silhouette tách rõ ở 32px, nền alpha sạch. Không dùng đồ/ảnh Warcraft hoặc sao chép TFT.
- Một ảnh/loại dùng chung trắng–lam–tím–vàng; phẩm nằm ở border CSS, không vẽ border/chữ/+N vào ảnh. Glyph unique nhỏ dùng bộ icon sẵn có, không tạo 17 ảnh riêng.
- Tile có item ID ổn định, khe, phẩm, `+N`, tên accessible gồm phẩm/cấp/tên/đang mặc; ảnh `alt=""` khi tên đã có trên control. Phẩm đồ có nhãn riêng, không nhầm thang tier tướng; unique có glyph riêng. Pending/selected/drop state là lớp CSS, không đổi item trong snapshot.

## Architecture

Dùng `gear-ui.ts` cho `gearSlots`, `gearDetail`, compare/filter sẵn có; tile dùng chung tách sang `gear-tile.ts` nếu giúp giữ module gọn. 32px dock, 44px khay, 48px lưới. Ba ô dock luôn có nhận diện khe và trạng thái trống. Chốt thẻ tối thiểu112px border-box: padding4px mỗi bên + border trái3px/phải1px =12px chrome, còn100px; hàng gear 3×32px + 2×2px gap =100px. Tile32px đã gồm border của chính nó. Giữ112px cả media query thấp/hẹp, không trở lại88px; kiểm ngân sách phase2, giữ affordance viền hệ hiện tại.

Màu phẩm lấy token của dự án; di chuyển hex hiện nằm trong `styles/gear.css` về nguồn palette/token đúng hướng dẫn, giữ giá trị hiện tại. Raster dành cho đồ; bộ SVG HUD chung vẫn dùng như cũ.

## Related Code Files

- Sửa: `apps/client/src/gear-ui.ts`, `styles/gear.css`, `ui-palette.ts` hoặc `styles/tokens.css` theo owner màu hiện có.
- Tạo nếu cần: `apps/client/src/gear-tile.ts` (renderer trình bày, không controller).
- Nguồn: `assets/ui/gear/` gồm master, prompt `.txt`, manifest `.json` ghi route/model/ngày/bản sửa, `SOURCE.txt` ghi quyền nguồn; runtime chỉ 3 WebP đã tối ưu trong `apps/client/public/assets/gear/`. Tài liệu Markdown chỉ đặt trong `plans/` hoặc `docs/`.
- Đọc khi thực hiện: skill `imagegen`; dùng công cụ tạo ảnh, giữ nguồn/prompt. Không dùng code/SVG giả hình ảnh đồ đã đề xuất.

## Implementation Steps

1. Chốt ba silhouette và palette ở cùng camera/icon framing; tạo master qua imagegen, sửa ảnh gần đạt để giữ phong cách.
2. Xuất alpha/padding đồng nhất, không cắt kiếm/giáp/bùa; giữ bản master và ghi nguồn. Tạo bản 96px hoặc 128px đủ cho tile/DPR, không tải master lớn khi chơi.
3. Tạo renderer tile và thay hình trong `gearSlots`; giữ `data-tip-gear`, callback mở lọc khe và sự kiện không bubble lên chọn hero ngoài ý muốn.
4. Lỗi tải ảnh dùng icon khe sẵn có + accessible label; log `client.gear-art-fallback` một lần theo URL/loại. Không nuốt lỗi hay spam mỗi render.
5. Đọc lại map 3 khe × 4 phẩm và test/markup; chuẩn bị ảnh review ở 32/44/48px nền sáng/tối cho người dùng duyệt sau.

## Todo

- [x] Ba master và nguồn/prompt được lưu.
- [x] Tile dùng chung có trạng thái empty/selected/pending và fallback.
- [x] Border phẩm từ token; ba ô không tràn card.

## Success Criteria

- [x] Chỉ ba URL ảnh runtime, không nhân bản theo rarity; không mất +N/unique/tên phẩm.
- [x] Có ba silhouette riêng và ảnh review 32px trên nền sáng/tối; việc người dùng phân biệt đúng loại chờ nghiệm thu phase 4, chưa khẳng định đạt.
- [x] Chưa tuyên bố nghiệm thu trước người dùng kiểm tra; agent không tự chạy test/build/game.

## Risk Assessment

- Pháp khí nhìn như vũ khí/giáp ở 32px: dấu hiệu là review nhầm loại; chỉnh silhouette/crop trong phase này, không thêm bộ ảnh phẩm.
- Ba tile32px không vừa thẻ88px hiện bị CSS thu và ẩn gear ở chiều cao ≤820px: bỏ quy tắc ẩn đó cho gear flow, giữ card112px và padding/gap đúng ngân sách; drawer/badge thích ứng theo phase2, không thu icon đến mất đọc.
- Rollback: giữ nguồn và renderer cũ trong lịch sử Git; chỉ đổi mapping asset/tile khi phải phục hồi, không chạm inventory.
