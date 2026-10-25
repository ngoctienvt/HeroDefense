# Phase 4 — Dock, thanh hành động, tooltip kỹ năng

## Hiện trạng

- **Thẻ dock** (`ui.ts:56-156`) chứa: chữ HP%, thanh HP, thanh năng lượng, chân dung, sao, tên, 【hệ】【vai】 và 3 nút trang bị. Nút trang bị bấm là nâng cấp luôn: không hiện giá, không kiểm tra vàng (khác với bảng Đội Hình), dễ bấm nhầm khi đang chọn tướng.
- **Badge người chơi**: dùng emoji, và "Tiên Khí" thực ra là điểm trận pháp.
- **Thanh hành động** (`panels.ts:334-385`): nút "Bán" nằm cạnh nút kỹ năng và không có xác nhận. Nút kỹ năng chỉ là chữ.
- Logic phần trăm HP và năng lượng bị chép 3 lần (`ui.ts:28-34`, `ui.ts:102-106`, `panels.ts:398-402`) và chép thêm lần nữa ở `battlefield.ts:800-809`.
- Muốn xem mô tả kỹ năng chỉ có cách đọc `title` gốc của trình duyệt.

## Thiết kế

### `hero-status.ts`

Gồm các hàm thuần, có test:

- `hpState(unit)` trả về `{ percent, level }`.
- `energyState(unit, hero)` trả về `{ kind: 'rage' | 'cooldown' | 'none', percent, ready, label }`.

Dock, thanh hành động, tooltip và battlefield đều gọi các hàm này.

### Thẻ dock (gọn, nhìn là phân biệt được)

```
┌───────────┐  viền trái = màu hệ; khung chân dung = màu phẩm
│ [chân dung]│  góc trên trái: số ô (1–5) = phím tắt
│ ★★★   Q● │  chấm Q sáng + viền nhấp nháy nhẹ khi kỹ năng sẵn sàng
│ Tên tướng  │
│ ███████░░  │  HP (màu hp-*)
│ ▅▅▅▅░░░░  │  năng lượng: xanh mana / cam nộ
│ ⚔+3 🛡+1 ◈+0│  icon trang bị + cấp, chỉ để xem
└───────────┘
```

- Bỏ chữ 【hệ】【vai】; thay bằng icon hệ và vai cỡ 16 px đặt cạnh tên.
- Khi tướng chết, phủ xám chân dung và hiện đếm ngược hồi sinh nếu snapshot có `respawn`.
- Ô trống: viền nét đứt, icon `xuat-tran`, chữ "Ô N · Xuất trận". Bấm vào mở Đội Hình.

### Badge người chơi

Ba dòng tài nguyên, mỗi dòng có icon và nhãn cố định: Linh Thạch, Đạo Duyên, Linh Đan. Thêm dòng Điểm Trận Pháp, chỉ hiện khi lớn hơn 0. Bỏ nút "Đội Hình [P]" trùng với rail.

### Thanh chiêu mộ nhanh (`hud-summon-bar.ts`)

Mục tiêu: người chơi luôn thấy là có thể chiêu mộ, và mua bằng một cú nhấp mà không cần mở bảng.

- **Vị trí**: dải ngang ngay trên dock, sát badge tài nguyên, để số Đạo Duyên nằm cạnh nút mua. Không che thẻ tướng hay toast.
- **Ba nút gói** Phàm Chiêu / Tiên Chiêu / Thiên Mệnh, mỗi nút gồm:
  - icon gói (phase 2);
  - tên gói;
  - giá kèm icon Đạo Duyên;
  - thanh bảo hiểm nhỏ (`2/4`) cho Tiên Chiêu và Thiên Mệnh.
- **Trạng thái**: tính bằng `summonPackState()` từ `SUMMON_PACKS`, `summonWave(state)`, `player.souls` và `player.summonFailures`.
  - **Mua được**: viền vàng sáng; nhấp nhẹ một lần khi vừa chuyển sang trạng thái này (tắt khi bật reduced motion).
  - **Thiếu Đạo Duyên**: nút mờ, hiện "Thiếu N".
  - **Chưa mở**: icon `khoa` và đợt mở, ví dụ "Đợt 6".
  - **Đang chờ chọn tướng**: khóa cả ba nút, hiện "Chọn tướng".
- **Nhấp vào gói**:
  - Gửi `{ type: 'summon', pack }`, giống bảng Chiêu Mộ.
  - Ghi `debug('client.summon-request', { pack, wave, source: 'quick-bar' })`.
  - Server quyết định kết quả; client không tự trừ Đạo Duyên.
- **Khi có `pendingChoice`** (Tiên Chiêu, Thiên Mệnh, rương Linh Đan):
  - Mở popover chọn tướng ngay trên thanh, trong `hud-overlay-layer`, gồm 3 thẻ tướng: chân dung, phẩm, icon hệ và vai, tên kỹ năng.
  - Rê chuột lên thẻ thì hiện `heroDetail`. Nút "Chọn" gửi `choose-hero`.
  - Popover giữ nguyên qua các lần render cho tới khi `pendingChoice` hết.
  - `Esc` chỉ thu popover lại thành nút "Chọn tướng" nhấp nháy, vì lựa chọn vẫn đang chờ.
- **Sau khi mua**: dùng toast/message có sẵn từ server. Nếu bộ sưu tập có tướng mà dock còn ô trống, ô trống hiện chấm "Có tướng chờ xuất trận".
- **Rê chuột lên nút gói**: tooltip hiện tỷ lệ thành công và tỷ lệ theo phẩm, luật trượt (tướng bậc 1 + Linh Đan) và bảo hiểm. Chữ lấy từ `ui-labels.ts`, cùng nguồn với bảng Chiêu Mộ.
- **Pha sảnh**: kiểm tra `summonWave` và lệnh `summon` trong game-core trước. Nếu ở sảnh mua được thì vẫn hiện thanh; nếu không thì ẩn.
- Bảng Chiêu Mộ `[B]` vẫn giữ để xem đầy đủ và đổi Linh Đan. Thanh nhanh có link nhỏ "Chi tiết [B]".

### Thanh hành động

- **Nút kỹ năng lớn** (icon `ky-nang`, tên chiêu, `[Q]`) có lớp phủ hồi chiêu kiểu quạt (`conic-gradient`) hoặc thanh nộ. Góc quạt tính từ snapshot qua biến CSS `--cd`, không dùng animation CSS, để không bị reset khi dựng lại. Tướng không có kỹ năng chủ động thì hiện ô "Bị động: tên đặc tính", không bấm được.
- Các nút phụ: Neo `[H]`, Hợp nhất `N/3`, Về bộ sưu tập.
- **Bỏ nút Bán** khỏi thanh hành động. Chỉ bán trong Đội Hình, có hộp xác nhận.

### Tooltip kỹ năng (`hud-tooltip.ts`)

- Hiện khi rê chuột 250 ms lên thẻ dock, nút kỹ năng, hoặc tướng trên sân (hook ở phase 6). Cũng hiện khi focus bằng bàn phím trên thẻ dock.
- Nội dung:
  - Dòng đầu: chân dung nhỏ, tên, phẩm, sao, icon hệ và vai.
  - Kỹ năng: tên, mô tả, `hồi Ns` hoặc `cần 100 Nộ`, trạng thái hiện tại ("Sẵn sàng" / "Còn 4s" / "Nộ 62/100").
  - Đặc tính, kiểu đòn đánh, hiệu ứng trúng đòn: mỗi mục một dòng có icon.
  - Chỉ số: Công, Giáp, HP, khiên, buff đang có (ward/haste) với thời gian còn lại.
  - Tỷ lệ khống chế (`controlLine`).
- Tooltip gắn vào `hud-overlay-layer`, không nằm trong dock. Id đang được rê chuột lưu trong `main.ts`; sau mỗi lần render, tìm lại anchor theo `data-slot`/`data-unit-id` và làm mới nội dung. Dùng `pointerover`/`pointerout` delegation trên container dock.
- Định vị: tooltip neo vào phần tử, tự lật khi chạm mép màn hình. Đặt `pointer-events: none` để không chặn chuột trên canvas.
- Nội dung dựng từ cùng một hàm `heroDetail(hero, unit?)`. Tàng Kinh Các (phase 5) và Ghép Tướng cũng dùng hàm này để mô tả đồng nhất.

## Bước

1. Viết `hero-status.ts` và test, rồi thay 4 chỗ đang chép logic.
2. Viết hàm thuần `summonPackState(pack, player, state)`, trả về `available | short | locked | choosing`, số Đạo Duyên còn thiếu và bảo hiểm. Viết test; bảng Chiêu Mộ và thanh nhanh cùng dùng hàm này.
3. Viết `hud-summon-bar.ts` và popover chọn tướng.
4. Tách `hud-dock.ts` và `hud-action-bar.ts` ra khỏi `ui.ts`/`panels.ts`.
5. Viết `hud-tooltip.ts` và `heroDetail()`.
6. Toast: đặt `bottom: calc(var(--dock-h) + var(--s4))`, với `--dock-h` đo bằng `ResizeObserver` thay cho số cứng 210 px.

## Người dùng kiểm tra

- Rê chuột lên từng thẻ dock: tooltip đúng tướng, hồi chiêu đếm đúng, không che thanh máu Linh Trụ.
- Bấm thẻ dock không làm nâng trang bị.
- Thanh hành động không còn nút Bán.
- Thanh chiêu mộ nhanh:
  - Đợt 1: chỉ Phàm Chiêu mua được; hai gói kia hiện khóa với đúng đợt mở.
  - Nhấp Phàm Chiêu: Đạo Duyên giảm và tướng vào bộ sưu tập.
  - Từ đợt 6, nhấp Tiên Chiêu: popover chọn tướng hiện ra trong khi trận vẫn chạy, và không bị đóng khi đồng hồ nhảy giây.
- Tướng nộ và tướng hồi chiêu hiện khác màu và khác nhãn.
