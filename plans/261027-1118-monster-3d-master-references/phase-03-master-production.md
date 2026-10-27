---
phase: 3
title: "Tạo master stylized riêng từng con, ưu tiên boss"
status: completed
priority: P1
dependencies: [2]
---

# Sản xuất master

## Overview

Chỉ sinh/chỉnh ảnh còn thiếu để đạt brief 3D. Tái dùng ảnh tốt; không sinh lại tất cả 38 vì chuyển pipeline.

## Art Contract

- Một nhân vật toàn thân, một master chính/ID, nền alpha sạch hoặc nền đơn nhất khi công cụ đích cần. Không cảnh, chữ, UI, hạt, vòng sáng hoặc shadow che silhouette.
- Nét stylized vẽ tay/cel shading, mảng vật liệu lớn; ánh sáng trung tính đủ đọc khối, rim vừa đủ. Giảm texture vụn và chi tiết dính silhouette. Không bake vệt chém/phép vào thân.
- Master mới dùng góc 3/4 rõ thể tích, gần tầm mắt hoặc hơi cao; không bắt buộc camera top-down 45° của sprite. Không biến toàn bộ art cũ thành pose mới nếu đã đủ dùng.
- Người/hình người: đứng trung tính hoặc A-pose nhẹ, tay/chân tách thân để đọc khớp; tránh vũ khí/áo choàng che cả ngực, hông, bàn tay. Tay cầm và phụ kiện bất đối xứng phải ghi rõ.
- Chim/cánh: thấy gốc cánh và cấu trúc cánh, mở vừa đủ, hai chân và đuôi tách hình; không dùng quầng sáng thay lông/cánh. Dơi có màng và chim cơ khí là subtype riêng.
- Thú bốn chân: đủ bốn chân có khoảng tách, lưng/ngực/hông đọc được; sừng, gạc, mai hay bờm không che khớp. Không biến mọi con thành sói đổi màu.
- Rắn bò: thân liền không chân, cổ/đầu/đuôi rõ; đường cong S thoáng, hạn chế cuộn kín/chồng thân gây khó dựng 3D. Cobra có hood đúng giải phẫu; không tự thêm chân rồng.
- Giữ trọn vũ khí, đầu cánh, gạc và đuôi trong khung. Không áp tỷ lệ lề trống tùy ý; chỉ sửa clipping thật/occlusion ảnh hưởng dựng 3D.

## Implementation Steps

1. Boss trước: tận dụng Kim/Ngân Giác, Ma Gia Kiếm, Hắc Phong; ưu tiên boss chim và rắn mới để bù khoảng trống family. Sau đó boss còn lại, rồi quái theo lô 4–6 con.
2. Mỗi lần gọi image tool tạo một cá thể từ đúng brief + style reference; luôn lưu prompt, raw, route, actual dimensions, source/ref hash. Model/chi phí không được trả thì ghi unknown/null.
3. Mặc định một lượt tạo. Nếu gần đạt, tối đa hai edit có mục tiêu; không thay cả danh tính để sửa một tay/đuôi. Sau giới hạn, ghi needs-edit và chuyển con khác; không auto-approve lỗi để đủ số lượng.
4. Rà ảnh thật: nhận diện, số chi, gốc cánh, liên tục thân rắn, tay/vũ khí, chi bị che, đầu/đuôi bị cắt, alpha trên sáng/tối. RGB dưới alpha 0 không phải lỗi nền.
5. Chọn `master.png` làm bản chính; lưu metadata có family/subtype/role/identity/source/parent/hash/status và prompt. Master dự trữ/rejected không đưa vào index active.
6. Bàn giao một master chính mỗi ID. Supporting views cũ được giữ nếu có; không mặc định tạo thêm body/weapon reference, turnaround hoặc góc phụ. Chỉ bổ sung ảnh nếu người dùng yêu cầu riêng.

## Success Criteria

- [x] Mỗi ID được duyệt có một master accepted và bộ dữ liệu nguồn; mọi needs-edit còn lại được giải quyết trước kết thúc sản xuất.
- [x] Có master riêng cho quái và boss trong cả bốn nhóm, khác biệt hình khối rõ.
- [x] Không có sprite action sheet hoặc image-to-video mới.
- [x] Lượt tạo/sửa và lỗi còn lại ghi trong progress log; không nói đạt chỉ vì QA alpha/số lượng pass.

## Risk / Rollback

Drift style/identity: so với master và style anchor, dùng edit gần đạt. Vũ khí che thân: chỉnh bố cục master để đọc được thân và pháp khí, không tự bỏ pháp khí. Giữ version accepted trước; raw/biến thể luôn ở archive.

## Kết quả thực thi

Xem [báo cáo sản xuất](./master-production-report.md) và [QA](./master-delivery-qa.json). Đủ 38 master được agent rà ảnh; accepted-reference không phải duyệt mỹ thuật cuối của người dùng. Archive local đã kiểm hash; chưa có backup ngoài thiết bị.
