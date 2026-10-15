---
phase: 3
title: "Kỹ năng mẫu và mở rộng theo chứng cứ"
status: todo
priority: P1
effort: "Phụ thuộc số skill xác minh được"
dependencies: [1, 2]
---

# Giai đoạn 3: Kỹ năng nhân vật

## Triển khai

Hoàn thành trước 5–8 hero mẫu: skill có chứng cứ bám map, skill thiếu chứng cứ được thiết kế riêng theo cốt truyện; tooltip đúng kết quả và hook VFX ổn định. Chơi thử solo/2 người ngay. Sau đó mở rộng theo cụm cơ chế dùng chung, ưu tiên hero xuất hiện sớm; không chờ 70/70 mới giao bản đẹp.

1. Mỗi skill lưu nguồn/mức tin cậy, định nghĩa hiệu ứng, test và mô tả HUD cùng lúc.
2. Đối chiếu trigger, mục tiêu, tầm, cooldown, tương tác trang bị/trận pháp/duyên phận. Số liệu không khôi phục được ghi là cân bằng web.
3. Với hero thiếu chứng cứ: tự thiết kế skill riêng dựa trên tên, vai trò, nguyên tố và dữ kiện cốt truyện có nguồn; mô tả fantasy, target, thời điểm, hiệu ứng, cooldown, điểm yếu/giới hạn, tương tác đội hình và tiêu chí test. Nếu cốt truyện không đủ, ghi rõ giả định sáng tạo. Fallback 5 vai trò chỉ dùng tạm trong thời gian triển khai, luôn có nhãn.
4. Chạy test core/content/server sau mỗi cụm; lệnh extract không xóa dữ liệu đã xác minh.

## Nghiệm thu

- [ ] Mẫu chơi được đầu trận, auto/Q, chết/hồi sinh, phụ bản, reconnect.
- [ ] Ma trận 70/70 có mức chứng cứ và loại skill “map / thiết kế mới”; mỗi nhân vật có skill riêng đã triển khai, không còn fallback vai trò trong bản hoàn tất; tooltip đúng.
- [ ] Chỉ gắn nhãn “đúng map” cho hành vi có chứng cứ.

Rủi ro: full parity có thể không khả thi từ nguồn hiện tại. Báo tỷ lệ thiếu chứng cứ và phân biệt rõ skill sáng tạo với skill khôi phục.
