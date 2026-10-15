# Browser QA và nghiệm thu local

Ngày kiểm chứng: 2026-10-12. Bản production `npm run build` → `npm start`, cổng 2567. Controller dùng CUA với hai trình duyệt/tab thật; không đưa state giả vào client. Ảnh đã được quan sát trong kết quả CUA của cuộc trò chuyện; chưa lưu file screenshot riêng. Không có video recording.

## Kết quả quan sát

- A tạo phòng UDDJNY, B vào cùng mã. Hai người mỗi người triệu hồi 5 nhân vật ngẫu nhiên từ 18 Đạo Duyên, còn 8; triển khai đủ 5 ô, không cấp thêm tiền hoặc chỉnh simulation qua devtools.
- Nút khai trận khóa và ghi `Chờ sẵn sàng` trước khi mọi người ready. A/B sẵn sàng → Khai trận → chuẩn bị → gọi wave → chủ phòng đặt 4×; B nhận cùng tốc độ và không được thay đổi.
- Hai tab cùng thấy wave, HP thần điện và trạng thái phụ bản. Đã chơi qua wave 15 từ tài nguyên khởi đầu. HP đầu 100; sau các wave và gửi quân vào phụ bản còn 74 ở thời điểm quan sát. Đây không phải bằng chứng thắng đủ 45 wave bằng kinh tế khởi đầu.
- Refresh A rồi B; dùng `Kết nối lại phiên trước`. Cả hai giữ đúng đội hình, tài nguyên, quyền sở hữu; chủ phòng chuyển khi mất kết nối. Sau reconnect vẫn gửi lệnh được.
- A nâng vũ khí +0 → +1: trừ 80 Linh Thạch, công Quỷ Sai 48 → 59. Phím S dừng, nút đổi thành `Tự chiến`; bấm lại tiếp tục hoạt động.
- Huyết Lâm mở đúng sau wave 5, Thủy Vực sau wave 10. A chọn một quân vào Huyết Lâm, B bấm `Gia nhập` gửi đội cùng đánh boss. Cả hai thấy `Đã chinh phục`, nhận thưởng, quân trở về. Có nút trở lại chiến trường chính.
- Console error/warning ở kiểm tra đầu trận: rỗng. Một số thao tác automation gặp node thay trong lúc HUD render; kiểm tra state/ACK rồi thao tác lại thành công. Đã thêm cache state HUD để không thay node khi snapshot không đổi và tách key panel để giữ focus tìm kiếm.

## Bố cục

| Viewport | DOM page | Kết quả |
|---|---|---|
| 1366×768 | 1366×768 | Không overflow ngang/dọc trang; canvas 1046×336; sidebar và chi tiết có scroll nội bộ |
| 1920×1080 | 1920×1080 | Không overflow trang; HUD, đội hình, sidebar và chiến trường tách vùng |
| 375×812 | 360×1541 | Không overflow ngang, scroll dọc; đây không phải chứng nhận mobile gameplay |

Babylon scene, quân, HP và hiệu ứng hiển thị thật. Không đo frame time/GPU/FPS nên không cam kết 60 FPS hoặc cấu hình tối thiểu. Hai tab cùng máy không thay thế kiểm thử Internet có latency/loss thực.

## Regression và build cuối

`npm test`: **161/161 đạt**, 7 file: 143 core, 6 content, 9 server, 3 client session adapter. 31,43 giây wall ở lần chạy toàn bộ. Cảnh báo SDK 4002 thuộc negative test seat hết hạn; test đó đạt.

Ba test client adapter dùng SDK, HTTP và WebSocket thật trên cổng test 2569. Chỉ thay adapter location/storage và cách resolve URL tương đối như trình duyệt; không mock room/game/network. Chứng minh rời socket đóng không treo, tạo phòng mới sau drop, và refresh reconnect giữ tài nguyên/sequence mua tiếp.

Typecheck đạt sau các sửa UI cuối; production build đạt. Bundle main từ khoảng 7,2 MB xuống 1,44 MB (gzip khoảng 367 kB) bằng import Babylon theo module cần dùng. Không tăng ngưỡng cảnh báo để giấu bundle lớn.

Xem [test core](tester-debugger.md), [review độc lập](code-review.md), [server](../../../apps/server/server-implementation-report.md). Full-campaign fixtures dùng đội hình cuối game hợp lệ và stress dùng quái sống lâu có chủ đích; báo cáo không coi chúng là bằng chứng cân bằng tiến trình tự nhiên.

## Giới hạn phát hành

Local/LAN artifact hoàn tất. Docker/Compose/Caddy và drain có source/test; chưa build/chạy image, chưa cấp public host/domain hoặc xác minh HTTPS/WSS từ Internet. Chưa diễn tập blue/green/rollback. Các gate này giữ chưa hoàn thành trong kế hoạch.

Các process kiểm thử do controller mở được dừng sau QA; khởi động lại bằng `start-game.cmd` hoặc `npm start`. File `.w3x` gốc được giữ nguyên.
