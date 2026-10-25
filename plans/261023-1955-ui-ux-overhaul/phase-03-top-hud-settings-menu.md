# Phase 3 — Thanh trên và menu Cài đặt

## Hiện trạng (`main.ts:136-207`)

Thanh trên cao 52 px đang chứa 14 thứ:

- Bên trái: logo, nút mã phòng, các chip người chơi.
- Giữa: đợt, đồng hồ, Thần Điện (đổi thành Linh Trụ) kèm progress, boss.
- Bên phải: sẵn sàng/khai trận, độ khó, tốc độ, âm thanh, góc nhìn, rời phòng.

Hệ quả:

- Boss chỉ là một dòng chữ `HP x% · Chiêu ys`.
- "Rời phòng" nằm sát nút góc nhìn và không có bước xác nhận.
- Người không phải chủ phòng vẫn thấy ô tốc độ bị khóa.

## Bố cục mới

```
[⚑ Đợt 7/20 · Giao chiến · ⏱ 42s] [🏛 Linh Trụ ███████░░ 1.240/1.800] [ (nút chính) ][⚙]
                  [ Boss: Ngưu Ma Vương ████████░░ 78% · Chiêu kế: 3s · Cuồng Nộ ]   ← dải riêng, chỉ khi có boss
```

- **Trái**: icon đợt, `Đợt N/20`, pha trận dạng chữ ngắn, đồng hồ. Đổi màu vàng khi còn ≤10 giây ở pha chuẩn bị.
- **Giữa**: thanh Linh Trụ rộng, màu theo `hp-*`, có số. Thanh nhấp nháy viền đỏ một lần khi mất máu (tắt khi bật reduced motion).
- **Phải**:
  - Một nút hành động chính theo pha: `Sẵn sàng` / `Hủy sẵn sàng` / `Khai trận` / `Bắt đầu đợt`.
  - Ô tốc độ, chỉ hiện với chủ phòng.
  - Ô độ khó, chỉ hiện ở sảnh với chủ phòng.
  - Nút ⚙.
- **Dải boss**: nằm ngay dưới thanh trên, có tên boss, thanh máu dày màu `faction-elite`, đếm ngược chiêu kế và nhãn trạng thái (Tiến quân / Cuồng Nộ). Khi chiêu sắp ra (≤1 giây) thì viền dải sáng lên. Hai boss thì hiện hai thanh.
- **Mã phòng**: ở pha `lobby` luôn hiện trên thanh trên kèm nút Sao chép, để gửi cho bạn bè. Từ pha chuẩn bị trở đi mới chuyển vào menu ⚙.
- **Người chơi**: chip người chơi dời vào một dòng mảnh dưới thanh trên, chỉ gồm chấm trạng thái và tên. Giữ hành vi bấm vào để xem làn.
- **Menu ⚙** (popover, `Esc` để đóng) gồm:
  - Mã phòng và nút Sao chép.
  - Bật/tắt âm thanh.
  - Đổi góc nhìn `[Tab]`.
  - Đổi tốc độ (chỉ chủ phòng).
  - Mở Cẩm Nang.
  - Rời phòng, có hộp xác nhận "Rời phòng? Đội hình sẽ được giữ 60 giây để kết nối lại".

## Bước

1. Tách phần render thanh trên từ `main.ts` sang `hud-top.ts`: `renderTopHud(state, view, handlers)`.
2. Viết `confirmDialog(message, confirmLabel)` dùng chung (cho Rời phòng, Bán tướng). Có focus trap và `Esc` để hủy.
3. Viết `popover(anchor, content)` cho menu ⚙, gắn vào `hud-overlay-layer` (xem ràng buộc chung trong plan.md). Giữ trạng thái mở trong `main.ts` để menu không bị đóng khi `render()` chạy mỗi giây. Dùng lại được cho tooltip ở phase 4. Khi popover hoặc hộp xác nhận đang mở, keymap chỉ nhận `Esc`.
4. Giữ nguyên các lệnh gửi đi (`ready`, `start`, `next-wave`, `speed`, `difficulty`).
5. Ghi log `debug('ui.settings', { action })` khi đổi âm thanh, góc nhìn hoặc rời phòng. Không ghi tên người chơi.

## Người dùng kiểm tra

- Ở sảnh, khi là chủ phòng và khi không phải chủ phòng: nút chính đúng theo pha, ô độ khó chỉ chủ phòng thấy.
- Đợt boss 5: dải boss hiện, đếm ngược chạy, khi Cuồng Nộ thì đổi nhãn.
- ⚙ → Rời phòng → Hủy: vẫn ở trong trận. Chọn Rời: về sảnh.
