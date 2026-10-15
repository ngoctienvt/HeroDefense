# Sprite top-down cho năm nhân vật mẫu

Trạng thái: hoàn thành. Kế thừa hướng mỹ thuật và danh sách mẫu từ [kế hoạch kỹ năng, asset, animation](../261013-0017-hero-skills-assets-animation/plan.md).

## Mục tiêu và giới hạn

- Thay hình đứng quay qua lại bằng sprite có hướng và tư thế thật cho h001 Thiên Lý Nhãn, h003 Quỷ Sai, h006 Tiên Nữ, h007 Quy Thừa Tướng, h00F Mẫu Đơn Tiên Tử; đủ năm vai trò.
- Giữ renderer Babylon.js, góc nhìn chiến thuật và phong cách chibi của asset hiện có. Ảnh tham chiếu của người dùng chỉ dùng định hướng, không sao chép hình nhân vật Warcraft.
- Chỉ nghiệm thu chơi đơn; không dành thời gian kiểm co-op trong lát cắt này. 65 nhân vật còn lại tiếp tục dùng sprite hiện có.

## Cách làm

1. Tạo sprite sheet trong suốt cho từng nhân vật với các hướng nhìn và tư thế idle, đi, đánh, tung chiêu, trúng đòn, ngã. Kiểm tra trực quan alpha, bố cục và tính nhất quán nhân vật.
2. Ánh xạ hướng từ chuyển động hoặc mục tiêu, trạng thái từ sự kiện chiến đấu, chọn frame bằng UV. Có fallback nếu sheet tải lỗi và giảm chuyển động khi người chơi bật reduced motion.
3. Kiểm tra typecheck/test/build, chạy solo trong trình duyệt để xem hướng và động tác trong trận, ghi log lỗi và cập nhật manifest asset.

## Nghiệm thu

- Năm nhân vật có sprite thực cho nhiều hướng; di chuyển chéo và tấn công không còn chỉ lật một hình đứng.
- Idle, đi, đánh, cast, hit, death dùng khung hình có tư thế riêng; hướng quay đúng theo thế giới game và camera.
- Chơi đơn chạy ổn, fallback của 65 nhân vật và selection/hitbox không hỏng.

Năm sheet chibi đã vào game và được kiểm tra solo; năm sheet thử phong cách thủy mặc khác được ghi ở [kế hoạch tiếp theo](../261013-1920-painterly-five-hero-art/plan.md).
