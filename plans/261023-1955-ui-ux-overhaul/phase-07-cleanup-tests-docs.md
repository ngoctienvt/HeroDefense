# Phase 7 — Dọn mã chết, test hồi quy, tài liệu

## Xóa (grep xác nhận trước khi xóa)

- `unitCard` (`ui.ts:24-52`): `panels.ts` có import nhưng không gọi.
- `renderSelected` và `renderSquad` (`panels.ts:387-435`): được ghi là "backward compat" nhưng không có nơi gọi.
- CSS mồ côi: `.selected-wc3-bars`, `.selected-bar-*`, `.unit-card*`, `.expedition-squad*`, `.dungeon`, `.stats`, cùng các class dock/badge cũ không còn dùng sau phase 4.
- Hằng `gearIcons` (emoji) và `roleMark` (chữ Hán), đã được thay bằng icon.

## Test hồi quy

Đặt trong `apps/client/test/`, theo mẫu `craft-board.test.ts`. Người dùng tự chạy.

- `ui-labels.test.ts`: `starText`, `tierLabel`, `gearLabel`.
- `summon-pack-state.test.ts`: đủ tiền / thiếu tiền / chưa tới đợt / đang chờ chọn.
- `hero-status.test.ts`: phần trăm HP, năng lượng nộ, năng lượng hồi chiêu có pháp khí, trạng thái sẵn sàng.
- `ui-icons.test.ts`: đủ icon, đúng viewBox, không có script hoặc href ngoài.
- `hud-rail.test.ts`: rail không chứa `admin`; bản đồ phím có `k → admin`.
- `guide-keys.test.ts`: mọi phím liệt kê trong Cẩm Nang đều có trong bản đồ phím của `main.ts`. Để test được, tách bản đồ phím ra `hud-keymap.ts`.
- `bar-style.test.ts`: chọn màu và kiểu thanh theo phe và hạng.

## Tài liệu

- Tạo `docs/ui-style-guide.md`, gồm:
  - Token màu.
  - Quy tắc icon và cách thêm icon.
  - Ba kiểu nút và nút nguy hiểm.
  - Bảng thuật ngữ.
  - Cấu trúc HUD.
  - Quy tắc tooltip.
  - Màu phe trên chiến trường.
- Cập nhật README, mục Cách chơi: phím mới (`T`/`F` mở cùng một bảng, bỏ dòng `K`), menu ⚙, rê chuột để xem kỹ năng, thanh chiêu mộ nhanh, đổi "Thần Điện" thành "Linh Trụ" ở mọi chỗ còn sót (`rg -i "thần điện"`).

## Bàn giao

- Báo lại theo từng phase: các file đã sửa, những gì đã xóa, các test đã viết nhưng chưa chạy.
- Ghi rõ trạng thái: mới **sửa nguồn**, chưa build, chưa chạy bản mới, chưa nghiệm thu hình ảnh.
- Hướng dẫn người dùng: dừng server → chạy `start-game.cmd` → `Ctrl+F5`. Sau đó chạy `npm run typecheck` và `npx vitest run apps/client/test`, rồi kiểm tra từng mục "Người dùng kiểm tra" của phase 1–6.
