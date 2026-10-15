---
phase: 4
title: "Hướng mỹ thuật và pipeline asset 3D"
status: todo
priority: P1
effort: "Dự toán sau mẫu hình đầu tiên"
dependencies: [1]
---

# Giai đoạn 4: Hướng mỹ thuật và pipeline

## Yêu cầu và đầu việc

Giữ Babylon.js và camera chiến thuật. [Ảnh tham chiếu do người dùng gửi](./references/art-reference.png) cho thấy nhân vật chibi đầu lớn, boss xương khổng lồ, gạch đá tím, pháp trận tím phát sáng và phép lửa/băng nổi rõ. Chuyển các đặc điểm đó thành hình khối, chất liệu, ánh sáng và hạt 3D mới; không sao chép sprite, bố cục UI hoặc độ rối nhãn chữ trong ảnh. Làm mẫu một khu địa hình/điểm phòng thủ, 5–8 hero và ba loại quái. Không tự nhập asset Warcraft.

1. Moodboard và style guide từ ảnh đã gửi: tỷ lệ chibi/silhouette, sàn đá tím, pháp trận, màu VFX theo nguyên tố, boss lớn; duyệt một khung cảnh và một hero trước khi sản xuất hàng loạt. Kiểm tra độ đọc của tên, thanh HP và lệnh RTS để tránh tình trạng chữ chồng như trong ảnh.
2. Manifest asset: tác giả/nguồn/license, định dạng, version, LOD, đường dẫn. Ưu tiên GLB tối ưu và texture phù hợp web; fallback hình khối nếu tải lỗi.
3. Tách loader/cache, actor factory, material, terrain khỏi `apps/client/src/battlefield.ts` theo ranh giới thực, không đổi simulation.
4. Đo baseline và đặt ngân sách tải, dung lượng, draw calls, FPS/VRAM tại 1366×768 và 1920×1080 với nhiều quân.

## Nghiệm thu

- [ ] Vai trò/quái/boss phân biệt nhanh, HP/vùng chọn/đường đi vẫn rõ.
- [ ] Asset mẫu có quyền dùng, manifest và fallback.
- [ ] Screenshot và số đo trước/sau trên cùng trận mẫu.

Rủi ro: 70 model riêng tốn công. Dùng biến thể có kiểm soát sau mẫu, không để mọi tướng trông giống nhau.
