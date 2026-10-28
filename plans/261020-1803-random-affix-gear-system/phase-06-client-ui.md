# Phase 6 — Giao diện client

## Đề xuất cải thiện UI/UX tiếp theo

[Kế hoạch kho icon và kéo thả 28-10-2026](../261028-1413-gear-drag-drop-ui/plan.md) đề xuất thay danh sách thẻ dài bằng lưới, ba ảnh đồ theo khe và kéo thả lên tướng/chân dung. Kế hoạch mới chỉ thay phần trình bày/thao tác, giữ nguyên lệnh và cơ chế đồ. Hiện mới lập kế hoạch; source/runtime chưa được đổi theo thiết kế này.

## File

- Mới `apps/client/src/gear-panel.ts`: bảng Kho đồ. Không nhét thêm vào `panels.ts`, file đó đã 813 dòng.
- Sửa:
  - `panels.ts`: thêm `Panel = 'gear'`; bỏ nút nâng trang bị trong bảng Đội hình, thay bằng 3 ô đồ có thể bấm.
  - `ui.ts`: `deployedHeroCard` hiện 3 ô đồ theo phẩm; bỏ `gearIcons`/`gearNames` cũ hoặc đổi nghĩa; công thức `maxCd` dùng `abilityCooldownFor`.
  - `main.ts`: phím `I` mở Kho đồ (phím I đang trống); thêm vào `railItems`; khóa `hudKey` và `panelState` thay `u.equipment` bằng phiên bản đồ của người chơi.
  - `styles.css`: màu viền theo phẩm (trắng, xanh, tím, vàng).
  - Cẩm nang trong `panels.ts`: thêm phím `I` và một đoạn giải thích đồ.

## Bảng Kho đồ (phím `I`)

- **Trên cùng**: 5 tướng xuất trận, mỗi tướng 3 ô đồ. Bấm ô để lọc kho theo khe đó.
- **Danh sách kho**: lọc theo khe và phẩm, sắp xếp theo phẩm rồi cấp. Hiện Huyền Tinh và tổng số món. Kho không giới hạn nên cần cuộn danh sách, và có nút phân giải nhanh toàn bộ món trắng trong kho.
- **Thẻ món**:
  - Tên và phẩm.
  - Cấp và mức cường hóa.
  - Chỉ số nền.
  - Từng dòng ghi giá trị đã nhân cường hóa.
  - Dòng độc nhất nổi bật, kèm mô tả đầy đủ.
- **Đánh dấu hợp/không hợp** theo tướng đang chọn, dùng `gearLineFits`:
  - Dòng hợp có dấu ✓.
  - Dòng không hợp bị gạch mờ, kèm chú thích lý do, ví dụ "Tướng không dùng Nộ".
- **So sánh**: chênh lệch với món đang mặc cùng khe của tướng đang chọn, cho Công, Máu, tốc đánh và các dòng chung.
- **Nút**: Mặc cho [tướng đang chọn], Tháo, Cường hóa (giá), Tẩy luyện (giá), Phân giải (lượng nhận). Nút bị vô hiệu khi không đủ tài nguyên, và có tooltip giải thích.

## Thông báo nhặt đồ

Event `reward` có `owner` trùng người xem thì hiện toast "Nhặt được …". Món tím và vàng có màu nổi bật.

Phải xem trước client đang hiện event `reward`/`info` ở đâu (grep cho ra rỗng), để không hiện thông báo cho người khác.

## Admin (phím `K`)

Thêm nút tạo món theo khe, phẩm và dòng độc nhất để người dùng thử nhanh từng dòng.

## VFX

Nhẹ, theo `vfx-skill` và AGENTS.md, dùng texture có sẵn trong `apps/client/public/assets/`:
- Sét của Dẫn Lôi.
- Vòng nổ của Thôn Thiên.
- Dấu bẫy dưới đất của Thiên La.
- Vệt lửa của Phong Hỏa (dùng lại flipbook lửa hiện có).
- Lóe gương của Bát Quái.
- Lóe đồng hồ của Thời Quang.

VFX không được che tướng hoặc thanh máu. Có chế độ giảm chuyển động.

VFX nằm cuối phase, sau khi gameplay đã đúng.

## Log client

`debug('client.gear-*', { itemId, slot, rarity })` cho các thao tác. Không ghi tên người chơi.


## Triển khai 28-10-2026

Kho I, 3 khe, lọc/phẩm/so sánh, thao tác và admin; toast riêng chủ sở hữu, VFX sét/nổ/gương/hồi tố/bẫy/vệt lửa theo event/snapshot và có giới hạn.

- [x] Hoàn tất thay đổi nguồn của phase; đã rà tĩnh, chưa chạy kiểm thử.
