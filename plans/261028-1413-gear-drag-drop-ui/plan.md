---
title: "Kho đồ gọn và kéo thả trang bị lên tướng"
description: "Ba ảnh đồ dùng chung theo khe, viền phẩm; khay đồ nhanh, kho dạng lưới và kéo thả lên tướng trên sân hoặc chân dung."
status: in-progress
priority: P1
branch: feat/ui-ux-overhaul
effort: "12–18h kỹ thuật; art iteration tính riêng"
tags: [frontend, ui, ux, gear]
blockedBy: []
blocks: []
created: 2026-10-28
---

# Kho đồ gọn và kéo thả trang bị

## Kết quả và ranh giới

Một lần kéo liên tục từ icon đồ đến thân tướng trên chiến trường hoặc chân dung là gửi lệnh mặc. Người chơi xem kho bằng icon gọn; chi tiết, so sánh và các thao tác kinh tế chỉ hiện cho món đang chọn. Lấy cảm hứng thao tác từ TFT, dùng art gốc phù hợp game.

**Đã triển khai source và asset theo kế hoạch được duyệt.** Phase 1–3 đã hoàn thành phần triển khai; phase 4 đã có test và tài liệu, đang chờ người dùng chạy typecheck/test/build và nghiệm thu trong game. Agent chưa chạy các lệnh này hoặc quan sát UI runtime. Báo cáo: [implementation](../reports/implementation-261028-1849-gear-drag-drop-ui.md).

- Giữ cơ chế hiện có: 3 khe, 23 affix, 17 unique, 20 đợt; kho không giới hạn; mặc/tháo, cường hóa, tẩy luyện, phân giải và xác nhận phá hủy. Không có chỉ số block; `sea-anchor` là unique miễn nhiễm riêng.
- Không đổi contract, server, core, tỷ lệ rớt, cân bằng, ghép đồ hay luật thay đồ. Không tự mặc món tốt nhất, cộng dồn icon, mua bán/trade hoặc thiết kế lại HUD/shop/duyên phận.
- `HOLD SCOPE`, độ sâu `fast`: owner và dữ liệu đã có trong repo; không cần nghiên cứu ngoài. Bốn phase tách theo asset, bố cục, tương tác/network và nghiệm thu; làm tuần tự do cùng chạm `main.ts`, `gear-ui.ts` và CSS. Khoảng 10 file nguồn/CSS đã có + 2 module giao diện và 1 controller mới có ranh giới rõ; không thêm framework/service chung.

## Phases

| # | Phase | Trạng thái | Phụ thuộc | Ước lượng kỹ thuật |
|---|---|---|---|---|
| 1 | [Art và tile dùng chung](phase-01-gear-art-and-tiles.md) | Đã triển khai; hình ảnh chờ QA phase 4 | — | 2–3h |
| 2 | [Khay nhanh và kho lưới](phase-02-compact-tray-and-inventory.md) | Đã triển khai; viewport chờ QA phase 4 | 1 | 3–4h |
| 3 | [Kéo thả, Babylon và lệnh đang chờ](phase-03-drag-drop-and-pending.md) | Đã triển khai; runtime chờ QA phase 4 | 1, 2 | 5–7h |
| 4 | [Hồi quy, tài liệu và người dùng nghiệm thu](phase-04-regressions-and-user-qa.md) | Đang làm: test/docs đã viết, chờ người dùng chạy và nghiệm thu | 1–3 | 2–4h |

12–18h là ước lượng công kỹ thuật, không bảo đảm lịch hoàn thành; chưa gồm số vòng tạo/sửa/duyệt art hoặc thời gian người dùng kiểm tra.

## Thiết kế đã triển khai

- Ba ảnh raster gốc: kiếm / giáp / pháp khí; cùng ảnh cho mọi phẩm, viền trắng / lam / tím / vàng. Tile chung 32px ở dock, 44px ở khay, 48px ở lưới; nhãn `+N`, glyph unique và tên phẩm đọc được ngoài màu.
- Khay trái dưới cạnh badge: **4 cột × 2 hàng** = 8 món chưa mặc/trang, có số lượng, phân trang, thu gọn và nút `I`. Không thêm một dải lớn ngang màn hình phía trên thanh triệu hồi/dock.
- `I` mở drawer Kho Đồ 340–460px, giữ trần 460px hiện có, mặc định đồ chưa mặc; bộ lọc khe/phẩm, tab xem đồ đang mặc, một chi tiết món đang chọn và dải 5 chân dung nhận đồ. Giữ đường thao tác cho tướng dự bị qua chọn tướng ở Đội Hình + vùng chi tiết; không bắt dùng dropdown tướng.
- Theo phản hồi ngày 28/10: mở Kho Đồ vẫn giữ khay nhanh; chọn món trong khay chỉ chọn để mặc, không tự mở bảng lớn. Tại chiều ngang ≤1520px, khay lên trên hàng thẻ tướng để không nằm dưới drawer; màn rộng giữ hàng ngang. Giữ dock đủ 5 chân dung và ba khe/tướng.
- Mặc vào khe tự suy từ `item.slot`; thay cùng khe có preview món cũ về kho. Kéo đồ đang mặc về vùng kho trống để tháo. Chuyển giữa hai tướng mình giữ đúng luật thay đồ hiện tại, không đổi chỗ hai món.
- Nhấp món → nhấp tướng và Enter/Space/Escape là đường thay thế đầy đủ. Chỉ snapshot xác nhận đổi trang bị; pending/ack lỗi không làm client tự quyết trạng thái.

## Nguồn và quan hệ kế hoạch

- Đọc [README](../../README.md), [AGENTS](../../AGENTS.md), [hướng dẫn HUD](../../docs/ui-style-guide.md), `gear-panel.ts`, `gear-ui.ts`, `hud-dock.ts`, `hud-render-guard.ts`, `game-session.ts`, `main.ts` và pointer/picking của `battlefield.ts`.
- [Hệ đồ](../261020-1803-random-affix-gear-system/plan.md) và [HUD chung](../261023-1955-ui-ux-overhaul/plan.md) là nguồn cơ chế/kiến trúc đã có trong source, chưa phải bằng chứng runtime đã nghiệm thu. Kế hoạch này **thay phần bố cục/thao tác phase 6 client UI của hệ đồ**, giữ phần luật và kinh tế.
- Không tạo phụ thuộc chặn vào các bước nghiệm thu gameplay cũ. Nếu phát hiện lỗi cơ chế qua kiểm tra, ghi riêng và hỏi trước khi mở rộng phạm vi.
- [Wireframe tham khảo](wireframe.html) minh họa đề xuất bằng SVG placeholder và dữ liệu mẫu cục bộ; chưa mở/chạy bằng browser, chưa phải asset/game thật. Markdown phase là hợp đồng triển khai. Các kế hoạch cũ có backlink để đối chiếu phạm vi thay thế.

## Tiêu chí nghiệm thu

- [ ] Cả ba loại ảnh × bốn viền phẩm dùng cùng tile ở dock/khay/lưới; đọc được ở 32px và khi không phân biệt màu.
- [ ] Một lần kéo liên tục tới thân tướng/chân dung gửi đúng một lệnh; không cần dropdown, không đổi nhóm chọn RTS hay phát lệnh di chuyển/đánh.
- [ ] Hover báo khe và món bị thay; sai chủ/summon/nền/khe không khớp hiện lý do, không gửi lệnh. Dòng không hợp cơ chế chỉ cảnh báo, không cấm mặc.
- [ ] Kho 300 món chỉ render tối đa một trang 40 tile + một detail; khay tối đa 8 tile. Bộ lọc/phân trang không xóa món hay mất lựa chọn vô cớ.
- [ ] 1920×1080, 1366×768, 1280×720 không chồng control, tràn ngang hoặc che toàn sân; ba khe/tướng vẫn truy cập được.
- [ ] Snapshot trong lúc kéo tiếp tục cập nhật top/boss; ack lỗi, disconnect, timeout, hủy và đổi phiên dọn ghost/highlight/pending đúng, không gửi lặp hoặc xác nhận giả.
- [ ] Người dùng chạy lệnh và tình huống phase 4, xác nhận riêng trạng thái build/bản mới/ảnh trong game.

## Câu hỏi còn mở

Chờ người dùng chạy checks và nghiệm thu ảnh/bố cục/tương tác/co-op theo phase 4. Không còn quyết định gameplay cần đổi trong scope này.

<!-- slug: gear-drag-drop-ui -->
