# Bàn giao master reference — 27-10-2026

Đã tạo toàn bộ master còn cần trong roster: **38 cá thể, 33 ảnh mới và 5 ảnh tái dùng**, gồm 20 quái và 18 boss. Mỗi cá thể một PNG chính. Người/hình người 17, có cánh 7, bốn chân 9, rắn bò 5. Chỉ làm ảnh reference; người khác phụ trách 3D.

## Sản phẩm

- [Gallery](../../assets/monster-source/masters/index.html): lọc quái/boss, đổi nền sáng/tối, bấm ảnh mở PNG gốc; mở trực tiếp không cần server.
- [Gói ZIP](../../assets/monster-source/master-references-20261027.zip): 38 thư mục ID, master PNG, metadata, prompt, hai edit prompt, index và poster bốn nhóm trên nền sáng/tối.
- [QA từng ID](./master-delivery-qa.json), [kích thước và SHA-256 ZIP](./delivery-package.json).
- `assets/monster-source/master-archive/` giữ nguồn cũ và phiên bản sinh/sửa. File chọn vào master là bản copy nguyên byte, không resize/biến dạng; chỉ thumbnail gallery có crop/resize để xem.

## Sản xuất và rà ảnh

Tạo boss trước rồi quái, tổng 33 lượt tạo và 2 edit. Cú máy ban đầu giống chim ưng: sửa riêng đầu thành đĩa mặt cú với hai mắt tròn hướng trước. Thiềm Thừ Nấm có đuôi ngắn: bỏ đuôi, giữ bốn chân. Hai bản cũ vẫn ở archive.

Tái dùng `b001`, `art-gold-horn`, `art-silver-horn`, `art-ma-sword`, `art-cinder-qilin`. Ba ảnh đầu là still idle phái sinh, có ghi rõ sourceKind; không gắn nhãn raw master gốc. Các bản mới giữ phong cách stylized vẽ tay, tham chiếu phong cách Bàn Cổ, giữ ngoại hình riêng từng loài.

Đã xem ảnh từng con và tám poster sáng/tối: nhận diện, số chi/cánh, thân rắn, tay/vũ khí, đầu/đuôi. Đã đối chiếu 38 ID duy nhất với roster, PNG RGBA có nền alpha thật, SHA-256 master khớp nguồn đã chọn/archive; không có pixel alpha >127 trên cạnh canvas. 35 ảnh nguồn trong preservation manifest có bản copy khớp SHA-256. ZIP kiểm CRC và hash đủ 38 master sau đóng gói. Không lấy các phép kiểm số thay thế việc xem ảnh.

`accepted-reference` biểu thị agent đã rà ảnh theo brief, **chưa phải nghiệm thu mỹ thuật cuối của người dùng**. Mỗi ảnh là một góc nhìn; mặt sau/chi tiết khuất chưa có ảnh riêng. Model và chi phí công cụ không được trả nên metadata để null. Master Ngũ Hành bị loại không nằm trong thư viện active hoặc ZIP.

## Giới hạn và kiểm tra chưa chạy

Không tạo model, rig, animation, sprite action, hoặc tích hợp runtime. Không chạy build/test/game. Không thay đổi các phần gameplay/VFX đang được sửa khác trong workspace. Người nhận có thể mở gallery và PNG để duyệt mỹ thuật hoặc dùng làm reference.

Archive hiện nằm trên cùng máy; chưa có backup ngoài thiết bị vì chưa được chỉ định đích lưu. Ảnh tạo mới không được gọi là nguồn lịch sử đã phục hồi. Giữ nguyên audit ban đầu để phân biệt nguồn thiếu và nguồn phái sinh.
