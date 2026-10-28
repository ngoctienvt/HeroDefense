# Nút HUD mất click

- Mục tiêu: một click hợp lệ vào Sẵn sàng, Khai trận, Bắt đầu đợt, Về bộ sưu tập và các control HUD phải tới handler; giữ kiểm tra lệnh ở server.
- Chứng cứ mã: `main.ts` thay toàn bộ vùng top/dock/summon/action bằng `replaceChildren`; nhánh timer gọi `render(true)` sau 200 ms. Snapshot đổi tài nguyên, HP, cooldown hoặc trạng thái có thể thay nút giữa pointerdown và click. `ui.ts` chỉ gọi hành động ở click, nên nút bị tháo trước đó không nhận hành động.
- Sửa: guard cài ở window capture trước handler đóng popover; hoãn render kể cả forced trong khi nhấn control. Click giải phóng trước action; render tồn đọng chạy sau event, đọc trạng thái mới nhất. Pointerup/keyup không có click, pointercancel, blur và pagehide đều có đường giải phóng/dọn dẹp. Không gửi lệnh ở pointerdown, không tự gửi lại lệnh.
- Debug: `ui.render-deferred` ghi một lần cho lượt hoãn, không ghi nội dung control hoặc dữ liệu người chơi. `command.sent` hiện có giúp đối chiếu handler đã gửi lệnh.
- Đã rà tĩnh luồng snapshot → render → guard và cleanup; `git diff --check` không báo lỗi whitespace. Giữ nguyên các thay đổi VFX có sẵn trong workspace.
- Thêm 7 test cho cập nhật trong khi giữ nút, gộp refresh, nhả ngoài nút, hủy thao tác, nhấn tiếp trước refresh, render bình thường, dispose. Chưa thực thi test/typecheck/build/game theo AGENTS.md.

## Người dùng kiểm tra

1. `npx vitest run apps/client/test/hud-render-guard.test.ts` và `npm run typecheck`.
2. Dừng server cũ → chạy lại `start-game.cmd` → Ctrl+F5.
3. Thử một click và nhấn giữ ngắn rồi nhả trên Sẵn sàng/Hủy sẵn sàng, Khai trận, Bắt đầu đợt, Về bộ sưu tập khi HP/cooldown/tài nguyên đang đổi.
4. Nhấn rồi kéo ra ngoài nút và nhả: không kích hoạt nút; HUD tiếp tục cập nhật. Nhấn giữ rồi Alt+Tab: quay lại HUD phải tiếp tục cập nhật.
5. Khi mở menu ⚙, click một nút HUD bên ngoài; rà thêm Chiêu Mộ/Đội Hình/Ghép Tướng và hộp xác nhận. Chưa nghiệm thu click trên trình duyệt thực.
