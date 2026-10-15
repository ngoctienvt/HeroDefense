# Nghiệm thu gameplay local — 2026-10-13

## Đã kiểm chứng

- Browser production tại `127.0.0.1:2567`: phòng 1/2/3/4 người hiện đúng 1/2/3/4 làn; bốn làn ngoài đi từ phía trên, hội tụ vào tuyến giữa rồi tới Linh Trụ phía dưới. Một wave thật trong browser tăng từ 500/16 lên 720/20 sau khi triệu hồi 1 tướng, đúng thưởng wave 1 là 220 Linh Thạch và 4 Đạo Duyên.
- Kéo chuột chọn hai quân, HUD báo `2 quân chọn`; bấm chân dung đổi tướng xem chi tiết mà vẫn giữ nhóm. Trên bản build cuối, chuột phải xuống nền gửi một batch `move` với `count:2`; lệnh một quân có `count:1`. Trước khi sửa, mặt đất không pickable khiến nhấp phải không gửi lệnh. Tia camera cắt mặt đất đã sửa lỗi; browser không còn lỗi console sau thử lệnh.
- `Ctrl+1` lưu nhóm một quân và `1` gọi lại sau khi bỏ chọn đã được thử trong browser. Quân người khác bị lọc ở client và batch chứa ID khác owner bị server từ chối nguyên tử trong test.
- Mô phỏng trận Bình Thường từ 500 Linh Thạch/18 Đạo Duyên, seed `123456`, dùng lệnh mua/triển khai/bán/trang bị/trận pháp thật và tài nguyên kiếm được: 1/2/3/4 người đều thắng wave 45. HP Linh Trụ cuối lần chạy mới nhất: 44/100/98/100. Chiến thuật tự động của test tại `packages/game-core/test/starting-economy.test.ts`; kết quả này không đại diện cho mọi cách chơi.
- Sau khi bỏ thưởng kill, bộ thử kinh tế đầu trận không vượt được các wave cuối với đường cong HP quái cũ. Hệ số tăng HP theo wave đã cân lại từ `10` xuống `5,5` trong `simulation.ts`; test chạy từ tài nguyên gốc, không bơm roster/tiền.
- Progression trên cả bốn độ khó đi hết 45/45/45/60 wave; fixture này dùng đội hình mạnh sẵn, chỉ xác nhận tính ổn định cơ chế. Stress core: 20 quân, 120 quái, 30 phút mô phỏng.
- Sau chỉnh cuối: `npm test` 181/181, `npm run typecheck` và `npm run build` đều qua. Reviewer tìm hai lỗi lifecycle/primary; đã sửa và xác nhận lại bằng test chọn nhóm + browser.

## Chưa có chứng cứ nghiệm thu

- Chưa chơi trọn 45 wave trên browser cho từng phòng 1/2/3/4 người bằng thao tác người chơi; mô phỏng core không thay thế kịch bản này.
- Chưa lưu ảnh QA ở 1366×768 và 1920×1080. Đã quan sát trực tiếp hai kích thước, nhưng chưa có artifact ảnh để review lại.
- Chưa chạy browser nhiều client đầy đủ cho dungeon, reconnect, host transfer và kết quả cuối; test mạng thật và core bao phủ phần logic liên quan.
- Public Internet, Docker runtime, TLS/WSS, rollback và tải máy mục tiêu vẫn là gate phát hành riêng ở kế hoạch cũ.

## Câu hỏi còn mở

Không có quyết định gameplay đang chặn code. Cần lịch QA thực địa và máy mục tiêu trước khi chứng nhận hiệu năng/phát hành.
