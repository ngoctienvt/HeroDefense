# Phase 6 — Chỉ báo chiến trường: phe, vòng chọn, rê chuột

## Hiện trạng

- Thanh máu trên đầu tướng của mình, tướng đồng đội và quái **cùng dùng màu xanh/vàng/đỏ theo % máu** (`battlefield.ts:785-790`). Vì vậy trong trận đông không phân biệt được phe.
- Boss và đầu lĩnh dùng cùng kiểu thanh với quái thường; chỉ có sprite to hơn.
- Vòng chọn là torus vàng (`battlefield.ts:1579`). Hiện chưa có trạng thái "đang rê chuột".
- Màu thanh mana và nộ đặt cứng (`#38bdf8`, `#f97316`) và lệch với DOM.

## Thiết kế

### Thanh máu theo phe

Màu thanh nói lên phe; mức máu đọc qua độ dài thanh.

- `faction-self` (lục): tướng của mình.
- `faction-ally` (lam ngọc): tướng của đồng đội.
- `faction-enemy` (đỏ): quái thường.
- `faction-elite` (đỏ thẫm, khung vàng, thanh dày ×1,4 và rộng ×1,3): đầu lĩnh và boss.
- Khi máu ≤35%, thanh sẫm đi và nháy một lần lúc vừa vượt ngưỡng. Khi bật reduced motion thì không nháy.

### Thanh năng lượng

Chỉ có ở tướng. Dùng `mana`/`rage` từ `ui-palette.ts`. Khi kỹ năng sẵn sàng, thanh sáng hẳn lên. Đây là cùng tín hiệu với chấm Q ở dock.

### Vòng dưới chân

- Đang chọn: vòng vàng liền như cũ.
- Đang rê chuột:
  - Vòng mảnh màu phe: lục cho tướng mình, lam cho đồng đội, đỏ cho quái.
  - Con trỏ đổi thành `crosshair` khi rê lên quái lúc đang có tướng được chọn, và khi đang ở chế độ tấn công (`attackMode`).
- Chỉ dùng một mesh vòng hover, tái sử dụng; không tạo mesh mới mỗi lần.

### Hook rê chuột

- Thêm `battlefield.onHover(id | null, clientX, clientY)`. Pick trong `pointermove`, giới hạn khoảng 60 ms một lần, chỉ pick mesh có `metadata.actorId`. Không pick khi đang kéo khung chọn hoặc kéo camera.
- `main.ts`: nếu `id` là tướng (của mình hoặc đồng đội) thì gọi `showHeroTooltip` (phase 4) tại vị trí con trỏ. Nếu là quái, boss hoặc đầu lĩnh thì hiện tooltip ngắn gồm tên, hạng, % máu và kỹ năng sắp dùng (nếu snapshot có).
- Log `visual.hover` chỉ ở debug, kèm id và kind, giới hạn tần suất.

## Bước

1. Đọc `palette.get(key, hex, alpha)` để xem cách cache material. Thêm các key theo phe, lấy màu từ `ui-palette.ts`.
2. Ở chỗ tạo actor (`visual-actors.ts:198-250`), thêm biến thể thanh elite (scale và khung).
3. Thêm mesh vòng hover và hook `onHover`; gỡ listener trong `dispose`.
4. Thêm test đơn vị cho hàm thuần `barStyleFor(entity, selfId)`, trả về `{ colorKey, scale, frame }`.

## Người dùng kiểm tra

- Trận co-op 2 người: phân biệt được tướng mình, tướng bạn và quái chỉ bằng màu thanh.
- Đợt 5: boss có thanh to, có khung, nhìn khác quái thường.
- Rê chuột lên tướng hoặc quái: vòng hiện đúng màu và tooltip đúng.
- FPS không giảm rõ khi rê chuột liên tục trong trận đông.
