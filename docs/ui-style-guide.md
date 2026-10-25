# Hướng dẫn giao diện (HUD)

Áp dụng cho mọi thứ vẽ bằng DOM trong `apps/client/src` (sảnh, HUD, bảng) và cho các chỉ báo Babylon trên chiến trường (thanh máu, vòng dưới chân). Mục tiêu: nhìn một lần là biết đợt, thời gian, máu Linh Trụ, boss, tướng của mình và kỹ năng nào sẵn sàng.

## Bố cục

| Vùng | Module | Nội dung |
|---|---|---|
| Thanh trên | `hud-top.ts` | Trái: đợt, pha, đồng hồ. Giữa: thanh Linh Trụ. Phải: nút chính theo pha, độ khó (chủ phòng, ở sảnh), nhãn tốc độ khi khác 1×, ⚙ (đổi tốc độ nằm trong ⚙ vì thanh này dựng lại mỗi giây). Dòng phụ: mã phòng (chỉ ở sảnh), người chơi. |
| Dải boss | `hud-top.ts` `renderBossStrip` | Mỗi boss còn sống một hàng: tên, thanh máu dày, chiêu kế, Tiến quân / Giao chiến / Cuồng Nộ. |
| Dock (dưới trái) | `hud-summon-bar.ts`, `hud-dock.ts` | Thanh chiêu mộ nhanh 3 gói; badge tài nguyên; 5 thẻ tướng. |
| Thanh hành động | `hud-action-bar.ts` | Nút kỹ năng `[Q]` có quạt hồi chiêu; Neo, Hợp nhất, Về bộ sưu tập. Không có nút Bán. |
| Rail (phải) | `hud-rail.ts`, `hud-keymap.ts` | 5 nút: Chiêu Mộ, Ghép Tướng, Đội Hình, Duyên & Trận, Cẩm Nang. Chấm xanh khi có việc nên làm. |
| Drawer | `panels.ts` → `panel-*.ts` | Chiêu Mộ, Đội Hình, Duyên & Trận (tab T/F), Cẩm Nang (Điều khiển / Tàng Kinh Các), Admin. |
| Lớp nổi | `hud-overlay.ts` | Menu ⚙ (bật/tắt âm thanh, thanh âm lượng Nhạc và Hiệu ứng: kéo thì nghe thử ngay, thả tay thì lưu), chọn tướng khi chiêu mộ, tooltip, hộp xác nhận. |

Admin không có nút trên rail và không có trong Cẩm Nang; chỉ mở bằng phím `K`.

## Màu

- Nguồn duy nhất: `ui-palette.ts`. Lúc khởi động, `applyPaletteToCss()` ghi các màu thành biến `--c-<key>`. Babylon import trực tiếp từ module. Không viết hex trong CSS ngoài `styles/tokens.css`.
- **HP trong HUD**: `hp-high/mid/low` theo mức máu.
- **Thanh trên đầu nhân vật**: màu cho biết phe, độ dài cho biết máu.
  - `faction-self` (lục) kèm vạch vàng bên trái: tướng của mình.
  - `faction-ally` (lam ngọc): tướng đồng đội.
  - `faction-enemy` (đỏ): quái thường.
  - `faction-elite` (đỏ thẫm, khung vàng dày): đầu lĩnh và boss.
  - Dưới 35% máu, thanh sẫm đi nhưng vẫn giữ màu phe. Logic nằm ở `bar-style.ts`.
- **Năng lượng**: `mana` (lam) cho tướng hồi chiêu, `rage` (cam) cho tướng nộ. Thanh sáng lên khi kỹ năng sẵn sàng.
- **Hệ**: `element-1..5` (Kim, Mộc, Thủy, Hỏa, Thổ). Dùng cho viền trái thẻ tướng và icon hệ.
- **Phẩm**: `tier-1..6` theo thang xám → lục → lam → tím → cam → đỏ. Dùng cho viền dưới chân dung và nhãn phẩm.

## Bề mặt, chữ và nút

- **Panel**: nền `--surface` hoặc `--surface-strong`, viền `--edge` 1 px, cạnh trên vàng 2 px, `--shadow`. Không chồng nhiều lớp blur.
- **Chữ**: tiêu đề dùng `--display` (serif). Tiêu đề mục là `section-sub` in hoa nhỏ màu vàng. Số dùng `tabular-nums`.
- **Nút**:
  - `primary` (vàng): một hành động chính mỗi vùng.
  - `secondary`: hành động thường.
  - `ghost`: liên kết phụ.
  - `danger`: thao tác mất dữ liệu, luôn đi qua `overlay.confirm`.
  - `danger-solid`: chỉ dùng trong hộp xác nhận.
- **Nút có tooltip**: khi nút cần giữ tooltip lúc chưa dùng được (gói chiêu mộ, kỹ năng đang hồi), dùng `aria-disabled` thay cho `disabled`, vì nút `disabled` không nhận sự kiện chuột.

## Thuật ngữ

| Khái niệm | Dùng |
|---|---|
| Bậc tướng 1–6 | Phẩm (`Phẩm 3`, viết tắt `P3` trong bộ lọc) |
| Sao hợp nhất | `★★★` (từ 7 trở lên viết `7★`) |
| Cấp trang bị | `+N` (`Vũ khí +3`) |
| 5 vị trí | Ô 1–5 |
| Tướng chưa xuất trận | Bộ sưu tập |
| Căn cứ | Linh Trụ |
| `formationPoints` | Điểm Trận Pháp |
| Bảo hiểm triệu hồi | Bảo hiểm `2/4` |

Hàm định dạng nằm trong `ui-labels.ts` (`starText`, `tierLabel`, `gearLabel`, `packOddsLines`…). Tỷ lệ gói chiêu mộ, ngưỡng bảo hiểm (`SUMMON_PITY`) và giá hoàn khi bán (`sellRefund`) đều lấy từ `packages/game-core/src/rules.ts`, không chép số sang client.

## Icon

- Bộ icon tự vẽ bằng SVG trong `ui-icons.ts`, khung 24×24, phong cách cel shading giống art tướng. Mỗi icon có:
  - Mảng màu chính (`ib`).
  - Bóng cứng (`is`).
  - Điểm nhấn vàng hoặc đỏ (`ig` / `ia`).
  - Viền mực vẽ dưới lớp màu (`paint-order`) để còn nét ở 16 px.
  - Nét mực bên trong (`io`).
  - Một nét rim sáng (`ir`).
- Icon phải đọc được bằng hình, không dùng chữ Hán và không dùng emoji.
- Màu mặc định của từng icon nằm trong `TINTS`. Gọi `icon(name, { tint })` để đổi màu theo hệ hoặc trạng thái.
- Thêm icon mới:
  1. Thêm path vào `ICONS` và màu vào `TINTS`.
  2. Mở game với `?icons=1` để xem cả bộ ở 16, 20 và 28 px trên nền tối và nền sáng (`icon-preview.ts`, `Esc` để đóng).
  3. Sửa đến khi silhouette không trùng với icon cùng nhóm.
- `apps/client/test/hud-icons-keymap.test.ts` kiểm tra mọi icon có mảng màu, không có script hay link, không còn emoji.

## Tooltip và lớp nổi

- **Đánh dấu phần tử**: phần tử muốn có tooltip gắn `data-tip-unit` (tướng), `data-tip-hero` (tướng trong catalog) hoặc `data-tip-pack` (gói chiêu mộ). `main.ts` bắt sự kiện rê chuột theo kiểu delegation, chờ 250 ms rồi hiện.
- **Rê chuột trên chiến trường**: `battlefield.onHover` gửi id kèm toạ độ con trỏ. Vòng hover dưới chân có màu theo phe.
- **Nội dung tooltip tướng**: dựng bằng `heroDetail()` (`hero-detail.ts`). Tàng Kinh Các và bảng Ghép Tướng dùng cùng hàm này.
- **Lớp nổi**: menu, tooltip và hộp xác nhận nằm trong `hud-overlay-layer`, ngoài các vùng mà `render()` dựng lại mỗi giây. Nhờ vậy chúng không bị đóng hay mất focus khi đồng hồ nhảy.
- **Bàn phím khi có lớp nổi**: khi hộp xác nhận hoặc menu ⚙ đang mở, bàn phím chỉ nhận `Esc`, và `Esc` chỉ đóng lớp trên cùng.
- **Chọn tướng khi chiêu mộ**: `Esc` thu khung chọn thành nút "Chọn tướng" trên thanh chiêu mộ, vì lựa chọn vẫn đang chờ.

## Kiểm tra sau khi sửa giao diện

1. Dừng server cũ.
2. Chạy `start-game.cmd`.
3. Bấm `Ctrl+F5`.
4. Xem các màn: sảnh, chuẩn bị, giao chiến có boss, Đội Hình, Ghép Tướng, kết quả.
5. Chạy `npm run typecheck` và `npx vitest run apps/client/test packages/game-core/test/sell-refund.test.ts`.
