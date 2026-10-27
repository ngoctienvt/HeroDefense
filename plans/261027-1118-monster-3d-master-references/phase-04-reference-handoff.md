---
phase: 4
title: "Bàn giao ảnh master và danh mục"
status: completed
priority: P1
dependencies: [3]
---

# Bàn giao ảnh master và danh mục

## Overview

Bàn giao ảnh master tra theo từng cá thể, family và vai trò quái/boss. Phần dựng model 3D do người khác thực hiện; không có bước thử tool 3D hoặc nghiệm thu model trong nhiệm vụ này.

## Requirements và Files

Tái dùng `assets/monster-source/masters/<id>/master.png`, `metadata.json`, `prompt.txt`; index ở `assets/monster-source/masters/index.json`. Archive giữ nguồn/phiên bản; supporting views cũ được đính kèm nếu có. Cập nhật hướng dẫn owning `docs/monster-boss-sprites.md` hoặc tài liệu master riêng nếu thực thi cần một workflow dài.

## Implementation Steps

1. Tạo gallery/contact sheet chia family và role; link mỗi ảnh về metadata/source. Ghi rõ accepted/needs-edit/reserved/rejected.
2. Kiểm tra tất cả path/hash, mở PNG, rà alpha sáng/tối; đối chiếu không có ID thiếu, đếm biến thể thành nhân vật, hoặc lẫn Ngũ Hành.
3. Bàn giao từng ID: master chính, tên/family/vai trò, nhận diện bất biến, số chi/cánh, vũ khí/phụ kiện/tay cầm và nguồn/prompt. Ghi rõ chi tiết chưa nhìn thấy, không tự đoán mặt sau.
4. Lập danh sách master đã duyệt và ảnh còn needs-edit. Kết thúc nhiệm vụ khi bộ ảnh/danh mục được bàn giao; không chờ bên dựng 3D tạo hoặc kiểm thử model.

## Success Criteria

- [x] Roster đã chốt có đủ master accepted, gallery và metadata khớp file/hash.
- [x] Archive local có chứng cứ hash; thiếu nguồn gốc được công khai, không che bằng bản phái sinh. Backup ngoài thiết bị chưa có đích lưu.
- [x] Người nhận chọn được một con và lấy đúng master cùng nhận diện/nguồn.
- [x] Không tuyên bố đã tạo model, retopology, rig, animation hoặc tích hợp game.

## Validation / Rollback

Chỉ kiểm tra tài liệu, ảnh, metadata và hash. Không chạy npm test/typecheck/build/game trong scope lập kế hoạch/master reference. Nếu index sai, sửa index/version master được chọn, giữ nguyên raw và không đụng runtime assets đang dùng.

## Kết quả thực thi

Xem [báo cáo sản xuất](./master-production-report.md) và [QA](./master-delivery-qa.json). Đủ 38 master được agent rà ảnh; accepted-reference không phải duyệt mỹ thuật cuối của người dùng. Archive local đã kiểm hash; chưa có backup ngoài thiết bị.
