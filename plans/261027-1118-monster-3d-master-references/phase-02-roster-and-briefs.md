---
phase: 2
title: "Chốt roster và brief theo bốn nhóm cơ thể"
status: completed
priority: P1
dependencies: [1]
---

# Chốt roster và brief

## Overview

Chốt từng cá thể trong [roster đề xuất](./roster.md), không tạo một ảnh chung đại diện cả nhóm. Một master chính mỗi ID.

## Requirements

- Giữ ID/nhận diện cũ phù hợp; không đổi luật chơi hoặc tự gắn các art ID mới vào wave.
- Có quái và boss ở cả bốn nhóm; khác silhouette/vật chất/vũ khí, không chỉ đổi màu/kích cỡ.
- Tên và ngoại hình mới là concept bản web, không nhận là phục dựng Warcraft.
- Tỉ lệ cơ thể để dựng 3D, nhóm xương và vai trò combat là ba trường khác nhau; cùng family không bảo đảm cùng rig.

## Implementation Steps

1. Với từng ID cũ: nối vào nguồn audit, ghi keep-as-is / derive-3d-reference / master-missing. Không ghi dùng lại ảnh nếu mới chỉ giữ thiết kế.
2. Rà danh sách 38, thêm/bớt theo người dùng; cập nhật mọi bảng đếm trong plan/roster cùng lúc.
3. Mỗi brief có: role, family/subtype, số chi/cánh, đầu/đuôi, body proportions, trang phục, vũ khí/tay cầm, vật liệu, palette và ba điểm nhận diện.
4. Chọn một ảnh style anchor Bàn Cổ còn tồn tại và đại diện quái nếu có; rà cùng nhau. Khóa stylized vẽ tay/cel shading, mảng lớn, rim light vừa đủ; không clone mặt, thân hoặc vũ khí Bàn Cổ.
5. Chốt thứ tự boss trước và bố cục master để phụ kiện không che phần thân cần nhìn rõ.

## Success Criteria

- [x] Người dùng chốt roster và tên/brief mới, bao gồm phạm vi dơi/chim cơ khí.
- [x] Mỗi ID có source status và brief đủ rõ để sinh một master.
- [x] Không ép nhện, cua, quái nhiều tay hoặc giao long có chân vào rig khác bằng cách xóa chi.

## Risk / Rollback

Master đẹp nhưng che khớp: chỉnh bố cục của master, giữ concept gốc. Nếu family không khớp anatomy, chuyển dự trữ hoặc đổi family theo quyết định rõ, không tự redesign.

## Kết quả thực thi

Xem [báo cáo sản xuất](./master-production-report.md) và [QA](./master-delivery-qa.json). Đủ 38 master được agent rà ảnh; accepted-reference không phải duyệt mỹ thuật cuối của người dùng. Archive local đã kiểm hash; chưa có backup ngoài thiết bị.
