# Phase 01 — Art direction và tham chiếu

## Mục tiêu

Chốt ngôn ngữ hình ảnh của đảo trước khi tạo asset, để mesh, texture và bầu trời cùng một phong cách và hợp với sprite tướng.

## Việc cần làm

1. Xem master sprite đã duyệt ([Bàn Cổ](../../docs/pangu-sprites.md), [Linh và Huyền](../../docs/linh-huyen-sprites.md)): hướng rim light, độ bão hòa, độ dày nét viền và kiểu đổ bóng cel. Ghi hướng nắng thành vector world, theo phép chiếu camera Babylon LH với `alpha = π/2`.
2. Tạo hai concept top-down ở góc camera thật (beta khoảng 0,84): toàn đảo lơ lửng giữa trời, mặt trời, biển mây. Một bản nắng trưa trắng vàng, một bản chiều vàng cam. Người dùng chọn một.
3. Chốt palette dạng token:
   - **Đất đi được:** đất nện nâu vàng ấm, độ sáng trung bình (L khoảng 45–55), hai đến ba mảng tông lớn, vệt mòn sáng hơn dọc làn quái.
   - **Viền:** dải cỏ xanh tươi có mép cel rõ, đá viền xám ấm.
   - **Vách đảo:** đá phân tầng nâu đỏ chuyển xám, mặt trên sáng, mặt dưới lạnh tím; rễ và đá treo.
   - **Trời:** gradient xanh lam đậm ở trên, xanh nhạt gần chân trời; biển mây trắng kem có bóng tím nhạt.
   - **Mặt trời:** đĩa vàng trắng, quầng ấm, tia sáng cách điệu.
4. Kiểm tra độ tương phản: đặt sprite tướng/quái và ảnh chụp VFX lửa, nước, băng lên mẫu nền đất ở cỡ hiển thị thật. Nền phải tối hơn phần sáng của VFX cộng sáng và tách được silhouette của sprite.
5. Ghi kết quả vào `docs/floating-island-map.md`: palette, hướng nắng, concept đã chọn, prompt, nguồn và route tạo ảnh.

## Đầu ra

- Concept đã chọn và prompt lưu trong `assets/terrain/concept/`.
- `docs/floating-island-map.md` (bản đầu).

## Kiểm tra

Người dùng duyệt concept và palette trước khi sang phase 03–05.
