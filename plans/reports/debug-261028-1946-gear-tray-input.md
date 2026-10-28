# Chọn/kéo đồ từ khay trái và giữ khay khi mở Kho Đồ

## Nguyên nhân trong nguồn

- `GearDragPointer.listen` mặc định capture. Listener `window.blur` cũ vì vậy nhận cả blur của control con rồi gọi abort vô điều kiện. Đổi focus lúc pointerdown, hoặc thay control đang focus khi HUD render, có thể xóa press/gesture trước ngưỡng kéo. Listener hiện chỉ nhận window blur và kiểm tra target là window.
- Main chỉ render khay khi panel khác `gear`; callback chọn bất kỳ món nào lại tự mở panel `gear`. Một click vào khay do đó khiến chính khay biến mất. Theo phản hồi người dùng, khay phải giữ nguyên và chọn món ở khay không tự mở bảng lớn.

## Sửa nguồn

- Tách blur control và blur cửa sổ; giữ Escape/chuột phải/pointercancel/lostcapture/window blur để hủy đúng.
- Callback chọn món nhận ý định mở bảng: khay chỉ chọn/arm, ô đang mặc vẫn mở Kho Đồ như trước. Phím Enter/Space theo cùng quy tắc.
- Khay luôn được render. Khi Kho Đồ mở ở chiều ngang ≤1520px, khay nằm trên hàng thẻ tướng để tránh lấn drawer; màn rộng giữ khay cạnh dock. Thu gọn khay vẫn là thao tác do người chơi chọn.
- Ghost tìm đúng kích thước tile nguồn theo ID + size khi cùng món xuất hiện ở cả khay và lưới; không giữ DOM node làm nguồn state. Tắt text/native touch selection trên tile để giữ pointer gesture.
- Thêm debug `client.gear-drag.armed` / `arm-rejected` với lý do chặn, không log pointermove hay tên người chơi.
- Thêm regression vào `gear-drag-pointer.test.ts`: blur control trước ngưỡng và giữa drag không hủy; vẫn gửi một drop. Test window blur hủy thật đã có. Adapter không chứng minh native DOM propagation.

## Kiểm tra

Đã đọc lại chuỗi pointerdown → focus → threshold/capture → drop → snapshot và callback chọn món; `git diff --check` không báo lỗi. Chưa chạy typecheck/test/build/game/browser theo AGENTS. Chưa xác nhận sửa đúng trong phiên game của người dùng.

Người dùng dừng bản cũ → `start-game.cmd` → Ctrl+F5, rồi thử:

1. Click một control khác, nhấn giữ món ở khay trái và kéo lên thân tướng/chân dung. Phải còn ghost sau khi focus đổi; đúng một lệnh, không phát lệnh RTS.
2. Nhấp một món ở khay: chỉ đánh dấu chọn, không bật bảng lớn; nhấp tướng để mặc.
3. Mở `I`: khay vẫn hiện, vẫn chọn/kéo được. Thử cả nguồn khay44px và lưới48px, 1280/1366/1920px.
4. Snapshot khi kéo không hủy vì nút cũ mất focus; chuyển sang cửa sổ khác, Escape hoặc chuột phải vẫn hủy và dọn ghost.

Lệnh kiểm tra chưa chạy:

```powershell
npm run typecheck
npx vitest run apps/client/test/gear-drag-pointer.test.ts apps/client/test/gear-drag-controller.test.ts apps/client/test/gear-presentation.test.ts
```

Nếu còn lỗi trên bản mới, dùng các event `client.gear-drag.*` trong `window.__thienDaoDebug()` để phân biệt không arm, capture thất bại, cancel hay server từ chối.

## Còn mở

Kết quả test và nghiệm thu thực tế của người dùng.
