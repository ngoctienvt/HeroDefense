---
title: "Master quái/boss chuyển sang reference 3D"
date: 2026-10-27
---

Người dùng dừng sprite action; giữ master stylized, mỗi cá thể một ảnh, bốn nhóm cơ thể và bổ sung thiết kế mới. Plan mới: [master reference 3D](../261027-1118-monster-3d-master-references/plan.md), roster đề xuất 38 (25 giữ/13 mới), chưa duyệt số lượng.

Audit tìm 35 ảnh nguồn gồm biến thể/rejected; 12/39 ID cũ có nguồn, 1 chỉ thấy idle phái sinh, 26 chưa tìm thấy master tại vị trí khảo sát. Backup thật còn là công việc phase 1, không coi source bị Git ignore là đã bảo toàn.

Plan sprite cũ cancelled/superseded; lịch sử và asset giữ nguyên. Chỉ lập tài liệu/audit, không sinh ảnh, di chuyển/xóa asset hoặc sửa model/runtime. Đã xác minh plan format, ID/count, local links và SHA-256 nguồn. Không chạy build/test/game.

CLI tạo plan/phase và validate được; global plan index không ghi được trong sandbox. CLI journal kết thúc mã 1 không thông báo và không tạo file, nên ghi journal trực tiếp dưới plans/journals. Các Markdown project là bản chính.

Còn mở: người dùng rà roster/brief; bảo toàn/backup nguồn, sau đó tạo master thiếu theo boss-first. Rig/model/animation nằm ngoài kế hoạch này.

## Sản xuất và bàn giao

Người dùng yêu cầu tạo toàn bộ master cần thiết. Đã tạo 33 master mới, giữ 5 still cũ, sửa cục bộ đầu cú máy và đuôi cóc. Đủ 38 ID (20 mob/18 boss), gallery sáng/tối và ZIP PNG/metadata/prompt. QA hash/alpha/ZIP đạt; không chạy build/test/game. 35 ảnh nguồn cũ có archive local khớp hash; backup ngoài thiết bị chưa có vị trí. Không đụng các thay đổi gameplay/VFX khác trong workspace.
