---
phase: 5
title: "Animation, VFX và âm thanh trong trận"
status: in-progress
priority: P1
effort: "Dự toán sau art mẫu"
dependencies: [2, 4]
---

# Giai đoạn 5: Animation và feedback chiến đấu

## Lát cắt hiện tại

Năm tướng có sprite động (`h001`, `h003`, `h006`, `h007`, `h00F`) đã có sự kiện bắt đầu cast, 0,25 giây lấy đà trước tác động do server quyết định khi trận chạy, VFX riêng theo chiêu, chớp sáng và hạt va chạm, khựng hình ngắn và âm thanh tổng hợp. Trong sảnh chờ kỹ năng tác động ngay vì đồng hồ trận chưa chạy. Kiểm thử thời điểm trúng, mục tiêu biến mất, đổi zone, typecheck và build đã qua. Chưa nghiệm thu bằng video trận đông ở nhiều kích thước và chưa mở rộng animation cho cả 70 tướng.

Nhóm tám kỹ năng hỏa đã có flipbook va chạm 16 khung, ngọn lửa phụ, tàn lửa và ánh sáng lóe dùng pool/cap; lửa bỏng tiếp tục theo trạng thái server. Khi giảm chuyển động, va chạm dùng ảnh tĩnh ngắn và bỏ hạt/đèn. Đã kiểm tra kỹ năng Thiết Phiến trong trận solo: atlas tải, cast và impact được log, không có lỗi trình duyệt. Chưa đo tải 4 người hoặc FPS trên thiết bị yếu.

Chiêu hỏa từ xa giờ dùng lõi lửa và hai vệt lửa bay từ vị trí tướng tới mục tiêu (0,16–0,42 giây theo khoảng cách), sau đó mới phát flipbook nổ. Nhánh hỏa bỏ tia trắng và quầng cầu trắng của VFX chung; tối đa 16 đường đạn đồng thời, đường đạn cũ hoàn tất nổ nếu vượt giới hạn. Đã thử Thiết Phiến trong trận solo: log đường đạn xuất hiện trước log nổ, không có lỗi trình duyệt. Damage vẫn do server quyết định tại sự kiện kỹ năng; hoạt ảnh đường đạn là phản hồi phía client.

Ngày 14-10-2026, lớp va chạm được bổ sung texture Kenney CC0: chớp tại điểm chạm, khói trễ và vòng xung kích sát mặt đất cho kỹ năng hỏa dạng bán kính; vẫn giữ flipbook nổ chính. Tọa độ nổ dùng điểm mục tiêu trên mặt đất sau khi đạn bay cao. Giới hạn 24 overlay tái sử dụng mesh và bỏ lớp phụ khi giảm chuyển động. [Nguồn và giấy phép](../../docs/vfx-assets.md). Thay đổi này mới được rà mã và asset; chưa chạy typecheck/test/build, chưa kiểm tra hình ảnh hoặc FPS trong game theo quy trình bàn giao của dự án.

## Yêu cầu và đầu việc

Điều khiển idle/chạy/đánh/cast/trúng/chết/hồi sinh từ snapshot và event server. VFX đúng thời điểm, hướng, skill ID; phân biệt cast, impact, vùng, heal/shield/status. SFX ngắn nếu nguồn có quyền dùng, có volume/mute. Bốn người cùng đánh vẫn đọc được trận.

1. Ánh xạ event/tick sang animation; nội suy vị trí, không phát lại event sau reconnect/chuyển zone.
2. VFX theo họ hiệu ứng có biến thể hero/nguyên tố; pháp trận/rune tím và phép lửa/băng nhiều lớp theo ảnh tham chiếu, nhưng giới hạn diện tích phát sáng và thời lượng để không che quân hoặc nhãn. Pooling/cap hạt, giới hạn đèn ở trận đông. Server vẫn quyết định hit.
3. Đồng bộ damage/HP/shield/status icon và cooldown; reduced-motion, flash cap, tùy chọn tắt hiệu ứng mạnh.
4. Ghép terrain sau khi [làn hội tụ](../261013-0010-rts-controls-converging-lanes/phase-02-converging-lanes.md) hoàn tất; không che đường chung/HUD.

## Nghiệm thu

- [ ] Video/screenshot mẫu: chạy, đánh, cast, hit, chết/hồi sinh, boss, co-op; VFX khớp kết quả server.
- [ ] Không nhân đôi hiệu ứng khi reconnect; pool ổn với 4 người, nhiều quái, 4× speed.
- [ ] Đạt ngân sách hiệu năng phase 4, reduced-motion dùng được.

Rủi ro: snapshot 10 Hz có thể lệch animation 60 FPS. Dùng event có mốc thời gian; khi đến muộn ưu tiên HP đúng và animation ngắn.
