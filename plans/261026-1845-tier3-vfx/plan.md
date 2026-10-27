# VFX bậc 3 — làm chi tiết từng tướng

Trạng thái: Bát Giới đã sửa nguồn và review tĩnh; chưa chạy bản mới/nghiệm thu. Người dùng yêu cầu bỏ thiết kế/duyệt cả lô, làm kỹ từng tướng (26/10/2026).

## Kết quả cần đạt

11 tướng h00J–h00Q, h03Q–h03S: hình chính rõ vật chất, nhịp có lực, đúng event/targets/phạm vi/trạng thái, giữ tướng và HP rõ. Hoàn thiện từng tướng trước khi sang người tiếp theo. Giữ gameplay/server và nhận diện art. Không tự chạy game/build/test.

## Theo dõi

- Bát Giới: đã soi atlas và replay lịch sử; đã sửa nguồn, bổ sung regression và review. Reviewer tìm ra gate mất rupture khi mất actor và timing chưa tính mép cuộn; đã sửa cả hai, review lại không còn finding actionable. Không chạy kiểm thử.
- Sa Ngộ Tịnh, Tiểu Bạch Long, Tinh Vệ, Chung Quỳ, Phán Quan, Ngưu Ma Vương, Long Vương, Trầm Hương, Khổng Tước, Triệu Công Minh: chưa sửa. Ảnh replay lịch sử của mười tướng đã xem; không có replay Long Vương trong bộ này.
- Không coi kiểm tra ngày 23/10 là nghiệm thu thay đổi ngày 26/10.

## Bát Giới

Chứng cứ: `visual-bat-gioi.ts` ép guard thành 5×3,4 và vẽ toàn bộ ở pass world; `tideGuard` loop 4–11 bao gồm pose bắt đầu tan; replay lịch sử cho thấy vòng thấp chìm dưới đội hình. Atlas guard hiện có đủ nước/bọt/răng cào, giữ nguyên art.

Sửa: sóng cuộn mesh kit có thể tích R5; art bọt phụ và dấu đất; guard đúng tỷ lệ, chia UV + geometry thành nửa sau và mép trước dưới chân; giữ các frame nguyên vẹn khi buff tồn tại; tan theo snapshot. Vỡ khiên chỉ nhận trait thật, tọa độ event dùng được khi mất actor. Không tự tạo nổ khi guard hết.

Tiêu chí rà mã: R5 cứng, front lip dưới anchor chân, không mất retry cold-load, cap 8 sóng/8 guard, reduced không sóng bay/hạt, clear trả pool và bỏ queue. Viết test cho footprint, loop, crop, routing và cleanup khi phù hợp.

## Nguồn và giới hạn

WebP runtime của 11 tướng còn đủ tên file trong checkout. Không tìm thấy active-inventory.json của cả 11; nhiều thư mục raw/process-art mà tài liệu cũ dẫn tới không tồn tại. Không tự xóa hoặc thay nguồn. Bát Giới dùng nguyên 5 WebP hiện có (1.656.270 byte), không tạo art mới hoặc tuyên bố khôi phục provenance.

## Kiểm tra người dùng thực thi

`npm test -- apps/client/test/visual-bat-gioi.test.ts apps/client/test/battlefield-effects.test.ts apps/client/test/visual-hero-adapters.test.ts`

`npm run typecheck`

Dừng server cũ → `start-game.cmd` → `Ctrl+F5`. Tại `?debug=1`, có Bát Giới trong khu: `__vfxReplay('h00J')`, `__vfxReplay('h00J','burst')`. Sau đó dùng kỹ năng thật, phá/hết khiên, kiểm reduced motion, 4 hướng camera, nền sáng/tối, đội sát nhau, di chuyển khi đang guard, đổi khu. Chưa chạy các bước này trong phiên.
