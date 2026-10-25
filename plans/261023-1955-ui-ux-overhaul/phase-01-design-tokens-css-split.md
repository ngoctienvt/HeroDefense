# Phase 1 — Token màu và tách styles.css theo bề mặt

## Hiện trạng

- `styles.css` dài 1736 dòng. Có token oklch ở `:root`, nhưng khoảng 100 mã hex kiểu Tailwind (`#22c55e`, `#fbbf24`, `#06b6d4`…) bỏ qua token, cùng 26 `!important`.
- Màu nộ `#f97316` được gán inline trong TS ở 3 chỗ (`ui.ts:45`, `ui.ts:110`, `panels.ts:415`). Babylon tự đặt màu riêng tại `battlefield.ts:788` và `:812-814`.
- Màu hệ (element) và màu phẩm (tier) được định nghĩa lặp ở dock (`.deployed-card[data-element]`), ở `.tag-elem` và ở `.craft-tier-section`.

## Thiết kế

- `ui-palette.ts` là nguồn duy nhất:
  - Màu nền và chữ: `ink-0..4`, `text`, `muted`, `line`.
  - Màu nhấn: `gold`, `jade`, `danger`.
  - Thanh: `hp-high/mid/low`, `shield`, `mana`, `rage`.
  - Phe: `faction-self/ally/enemy/elite`.
  - Hệ: `element-1..5` (Kim, Mộc, Thủy, Hỏa, Thổ).
  - Phẩm: `tier-1..6`.
- Lúc khởi động, `applyPaletteToCss()` ghi các màu thành biến `--c-*` trên `:root`. Babylon import trực tiếp từ module, nên DOM và chiến trường luôn cùng màu.
- Quy tắc bề mặt (ghi vào style guide ở phase 7):
  - **Panel nền mực**: `ink-1` với độ trong 0,92, viền `line` 1 px và một viền vàng mảnh ở cạnh trên. Bỏ `backdrop-filter` chồng nhiều lớp.
  - **Hai cỡ chữ tiêu đề**: tiêu đề bảng dùng `--display` cỡ `lg`, tiêu đề mục dùng `sm` in hoa vàng.
  - **Ba kiểu nút**: `primary` (vàng), `secondary` (mực, viền) và `ghost`. Nút nguy hiểm là `danger` và luôn có bước xác nhận.
  - **Thang khoảng cách**: chỉ dùng `--s*`, không dùng số lẻ 6px hay 10px.
- Tách `styles.css` thành `styles/*.css` như trong kiến trúc đích. `main.ts` chỉ import `styles/index.css`.

## Bước

1. Tạo `ui-palette.ts` và `applyPaletteToCss()`; gọi hàm này đầu `main.ts`.
2. Tách CSS theo bề mặt mà không đổi hình, rồi để người dùng kiểm tra lần 1 xem có gì hỏng không.
3. Thay hex bằng `var(--c-*)`. Xóa inline `style.backgroundColor = '#f97316'` và dùng class `.rage`.
4. Bỏ dần `!important`; chỉ giữ `[hidden]`.
5. Gộp ba nơi định nghĩa màu hệ và màu phẩm thành `[data-element]` và `[data-tier]` dùng chung.

## Người dùng kiểm tra

Màn hình nhìn gần như ảnh gốc, không vỡ bố cục. `rg "#[0-9a-fA-F]{3,8}\b" apps/client/src/styles` chỉ còn trong `tokens.css`, hoặc không còn.

## Rủi ro

Tách file CSS có thể đổi thứ tự cascade. Giữ thứ tự import đúng như thứ tự các khối trong file cũ.
