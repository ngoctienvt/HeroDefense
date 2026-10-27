---
phase: 1
title: "Bảo toàn và chọn nguồn master"
status: completed
priority: P1
dependencies: []
---

# Bảo toàn và chọn nguồn master

## Overview

Giữ được nguồn thật trước khi tổ chức lại thư viện. [Audit ban đầu](./preservation-audit.json) là snapshot chỉ đọc, chưa phải bằng chứng đã backup.

## Requirements

- Giữ cả master của thiết kế ngoài roster mới; Ngũ Hành chỉ nằm rejected/archive.
- Không ghi đè raw, phục hồi đè file người dùng, xóa sprite/atlas hoặc dọn thư mục nguồn.
- Kiểm tra cả năm legacy PNG trong `assets/monster-source/`, ảnh master/hướng còn ở source sprite và reference Bàn Cổ.
- Không coi atlas, preview hoặc idle đã resample là master gốc.

## Related Files

- Read: audit, roster cũ, provenance/selected-review còn tồn tại, `.gitignore`.
- Create khi thực thi: `assets/monster-source/master-archive/<id>/`, manifest/hash và bản backup độc lập.
- Modify khi thực thi: audit để ghi selected source, missing, recovered/derived và review thật.

## Implementation Steps

1. Re-scan vì workspace có thể đổi sau snapshot; kiểm tra mỗi path/hash trước copy.
2. Copy master/hướng/raw/prompt/sidecar vào archive theo ID + phiên bản, giữ nguyên byte; đối chiếu SHA-256 nguồn/bản sao. Không di chuyển nguồn.
3. Tìm source thiếu trong đường backup được chỉ định. Git có thể không có ảnh vì source bị ignore; không khẳng định recover được từ Git. Nếu copy từ lịch sử, xuất ra archive mới, không khôi phục đè workspace.
4. Trường hợp chỉ còn idle phái sinh: đánh dấu rõ resampled/derived; xem chất lượng thực. Chỉ dùng nếu đủ nhận diện/hình khối, không gắn nhãn raw master.
5. Chọn master mạnh nhất từng ID bằng xem ảnh; direction cũ chỉ là supporting references, không đếm thành nhân vật mới.
6. Sau khi có archive khớp hash, tạo backup thứ hai tại vị trí người dùng chỉ định hoặc kho lưu trữ được xác nhận. Không mặc định thư mục local bị ignore là an toàn.

## Success Criteria

- [x] Các ảnh audit còn tồn tại có bản copy khớp hash và metadata gốc.
- [x] Đủ source cho từng ID muốn tái dùng hoặc ghi rõ missing/derived, chưa tự regenerate để che thiếu nguồn.
- [x] Archive local có manifest/hash; thiết kế rejected/dự trữ không lọt gallery active.
- [ ] Backup ngoài thiết bị chưa có đích lưu, nằm ngoài yêu cầu tạo master hiện tại.

## Risk / Rollback

Source thiếu: tìm backup rồi mới quyết định dùng phái sinh/tạo lại; không phục hồi mù. Copy lỗi/hash lệch: bỏ bản copy lỗi khỏi manifest, giữ nguyên nguồn. Toàn bộ bước là copy/additive; rollback chỉ bỏ bản sao mới do phase này tạo sau khi kiểm tra đường dẫn.

## Kết quả thực thi

Xem [báo cáo sản xuất](./master-production-report.md) và [QA](./master-delivery-qa.json). Đủ 38 master được agent rà ảnh; accepted-reference không phải duyệt mỹ thuật cuối của người dùng. Archive local đã kiểm hash; chưa có backup ngoài thiết bị.
