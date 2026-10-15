# Thiên Đạo — web co-op

Bản web desktop lấy cơ chế từ `ThienDao v2.1.w3x`: phòng 1–4 người (solo để luyện), đội hình 5 ô, 70 nhân vật, 27 duyên phận, 8 trận pháp, triệu hồi/hợp nhất, ba nhóm trang bị, wave và phụ bản boss. Tám tướng bậc Linh dùng đặc tính đòn đánh thường, không có kỹ năng chủ động; mười hai tướng bậc Huyền có tuyệt kỹ Ngũ Hành, trạng thái và chỉ số riêng. Các bậc cao hơn dùng kỹ năng do bản web thiết kế; chưa xác minh được kỹ năng riêng tương ứng từ map. Trên chiến trường Babylon.js, 70 tướng dùng sprite toàn thân có nền trong suốt; boss và địa hình vẫn là 3D. Mười một tướng mẫu có sheet chuyển động: năm tướng chibi và năm tướng vẽ tiên hiệp thủy mặc (Thiết Phiến, Hằng Nga, Tây Vương Mẫu, Nữ Oa, Điện Mẫu) dùng 4 hướng × 7 tư thế; [Bàn Cổ](docs/pangu-sprites.md) dùng 4 hướng × 3 hành động × 4 khung. Mười hai tướng Huyền có động tác lấy đà 0,25 giây trước khi kỹ năng tác động, VFX theo chiêu và phản ứng va chạm; tướng không có sheet chuyển động dùng hoạt ảnh biến dạng sprite khi đi, đánh, trúng đòn và tung chiêu. Kỹ năng hỏa dùng flipbook lửa 16 khung, lóe sáng, khói và tàn lửa; mục tiêu chịu bỏng tiếp tục hiện lửa. Chế độ giảm chuyển động rút gọn hiệu ứng. Trong sảnh chờ, kỹ năng tác động ngay vì đồng hồ trận chưa chạy. Âm thanh tổng hợp có nút bật/tắt. [Bàn Cổ — Khai Thiên Tổ Thần](docs/pangu-combat.md). [Chi tiết gameplay](docs/gameplay-spec.md), [nguồn dữ liệu](docs/content-provenance.md).

## Chạy trên máy

Cần Node.js 22.12 trở lên và npm.

```powershell
npm ci
npm run dev
```

Mở [localhost:5173](http://localhost:5173). Nhập tên → tạo phòng → gửi mã phòng cho bạn bè. Mỗi người triệu hồi nhân vật, chọn nhân vật dự bị rồi chọn một trong 5 ô để triển khai. Tất cả bấm **Sẵn sàng**, chủ phòng bấm **Khai trận**. Quái xuất hiện ở một làn cho mỗi người rồi hội tụ vào đường giữa.

Người cùng mạng LAN truy cập `http://IP-MAY-CHU:5173`, nhập cùng mã phòng. Máy chủ cần cho phép cổng 5173 qua firewall. Mã phòng chỉ dùng trong cùng server.

## Cách chơi

- Đạo Duyên dùng ba gói triệu hồi Phàm Chiêu (2, wave 1), Tiên Chiêu (4, wave 6), Thiên Mệnh (8, wave 15). Hai gói sau có xác suất trượt, pity và thưởng Linh Đan để đổi rương tướng tự chọn hoặc Linh Phôi. Linh Thạch dùng nâng trang bị. Qua wave và thắng phụ bản để nhận tài nguyên đều cho cả đội; hạ từng quái chỉ cộng chỉ số chiến đấu.
- Mở bảng **Ghép tướng** để chọn nhân vật kết quả, xem công thức ba nhân vật cụ thể từ map gốc và ghép khi đã có đủ nguyên liệu. Linh Phôi có thể thay một nguyên liệu cùng bậc. Tướng nhận được tích lũy không giới hạn trong bộ sưu tập; chỉ 5 tướng được triển khai. Ba bản sao cùng nhân vật/cùng bậc vẫn có thể hợp thành bậc cao hơn; tối đa bậc 3. Không triển khai hai bản sao từ bậc 2 của cùng nhân vật.
- Xếp các thành viên duyên phận để nhận buff. Chọn trận pháp và dùng điểm thưởng mỗi 4 wave/phụ bản để nâng cấp.
- Chuột trái chọn hoặc kéo khung chọn nhiều tướng của mình; giữ `Shift` khi kéo để thêm quân. Chuột phải di chuyển/đánh mục tiêu; `A` rồi chuột phải xuống đất để đánh khi di chuyển. Giữ nút giữa chuột để kéo góc nhìn, lăn chuột để phóng to/thu nhỏ. `Ctrl+1–9` lưu nhóm, `1–9` gọi nhóm (kể cả một tướng). `S` hủy lệnh, `D` giữ vị trí, `Q` kỹ năng tướng đang xem, `H/N` lưu/xóa vị trí trở về.
- `B` chiêu mộ, `T` duyên phận, `F1` bí cảnh, `Tab` khi canvas đang focus để đặt lại camera. Cẩm nang trong game giải thích thêm các điều khiển.
- Phụ bản mở từ wave 5, rồi mỗi 5 wave. Gửi đội hình vào bí cảnh làm làn chính thiếu quân; đồng đội có thể tham gia chung một boss.
- Bình Thường/Ác Mộng/Địa Ngục có 45 wave; Tối Thượng có 60. Chủ phòng đổi tốc độ 1×/2×/4×. Linh Trụ về 0 HP thì thua.

Khi rớt mạng, phiên giữ chỗ 60 giây. Dùng **Kết nối lại** trên cùng tab hoặc sau refresh trong cùng phiên trình duyệt. Đội hình và tài nguyên nằm trong RAM server; server khởi động lại sẽ kết thúc các trận đang chạy.

## Build và kiểm tra

```powershell
npm run typecheck
npm test
npm run build
npm start
```

Production chạy tại [localhost:2567](http://localhost:2567), cùng process phục vụ client, API và WebSocket. `PORT` đổi cổng; xem [hướng dẫn triển khai](deploy/README.md) để mở Internet bằng HTTPS/WSS. Khi chạy production, không cần Vite.

Trên Windows, nhấp đúp `start-game.cmd` để cài gói cần thiết (lần đầu), build bản mới nhất, chạy server và tự mở game trong trình duyệt. Nếu game đang chạy trên cùng cổng, file sẽ mở lại trang hiện có; dừng server cũ rồi nhấp đúp lại để lấy bản mới. Giữ cửa sổ launcher mở khi chơi; `Ctrl+C` dừng server. Nếu gặp lỗi khởi động, xem cửa sổ và `logs/start-game.log`. Người cùng LAN dùng `http://IP-MAY-CHU:2567` khi chạy cổng mặc định.

```powershell
npm run extract:content
```

Lệnh trên tạo lại catalog từ chứng cứ đã trích offline. Không cần chạy Warcraft và không thực thi script JASS của map. File `.w3x` gốc được giữ nguyên.

## Cấu trúc

`content/` chứa catalog có nguồn; `packages/game-core/` chứa simulation độc lập renderer; `packages/contracts/` định nghĩa giao thức; `apps/server/` kiểm tra lệnh và quản lý phòng; `apps/client/` chứa chiến trường và HUD. [Kế hoạch và báo cáo](plans/261012-1846-thien-dao-web-coop/plan.md).

Log server dạng JSON ở terminal; log client giới hạn vòng đệm trong console và `window.__thienDaoDebug`. Log không chứa reconnect token. Báo cáo kiểm thử nằm trong thư mục `plans/.../reports/`.
