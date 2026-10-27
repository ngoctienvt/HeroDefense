---
title: "Master stylized quái/boss làm reference 3D"
description: "Bảo toàn master hiện có; roster 38 cá thể thuộc bốn nhóm cơ thể, một master riêng mỗi con."
status: completed
priority: P1
effort: "Theo lô; chưa cam kết số lượt sinh ảnh hoặc chi phí"
tags: [assets, monsters, bosses, masters, 3d-reference]
created: 2026-10-27
supersedes: [261022-0002-monster-boss-assets]
---

# Master stylized quái/boss làm reference 3D

## Outcome và quyết định đã chốt

Ngày 27-10-2026, người dùng chuyển sang mô hình 3D: dừng sản xuất sprite walk/attack. Giữ master stylized làm reference dựng 3D. Bốn nhóm là **người/hình người, chim bay, thú bốn chân, rắn bò**; mỗi cá thể có một master riêng, không phải bốn ảnh đại diện cho cả roster. Giữ thiết kế cũ phù hợp và bổ sung quái/boss mới. Ưu tiên boss, giới hạn lượt sửa mỗi con.

**Ranh giới trách nhiệm:** nhóm này chỉ làm ảnh master reference; người khác dựng model 3D, rig, animation và tích hợp. Hoàn thành khi bàn giao bộ ảnh được duyệt cùng danh mục/nguồn, không phụ thuộc việc dựng hoặc thử model.

Phạm vi kế hoạch: kiểm kê/bảo toàn nguồn → chốt roster/brief → tạo hoặc chỉnh master còn thiếu → bàn giao reference. Không tạo model, rig, animation, sprite sheet, turnaround bốn hướng bắt buộc hoặc thay spawn/gameplay/runtime. Ảnh hướng cũ có thể dùng hỗ trợ dựng 3D; không sản xuất tiếp action. Không xóa atlas/source cũ hoặc public assets đang dùng.

## Roster đã đưa vào sản xuất

| Nhóm | Giữ thiết kế cũ | Thêm thiết kế mới | Quái | Boss | Tổng |
|---|---:|---:|---:|---:|---:|
| Người/hình người | 15 | 2 | 7 | 10 | 17 |
| Chim bay/có cánh | 3 | 4 | 5 | 2 | 7 |
| Thú bốn chân | 6 | 3 | 5 | 4 | 9 |
| Rắn bò không chân | 1 | 4 | 3 | 2 | 5 |
| **Tổng** | **25** | **13** | **20** | **18** | **38** |

[Danh sách từng cá thể và brief](./roster.md). 25 là số **thiết kế giữ**, không phải 25 master đã có hoặc dùng ngay. 13 là số thiết kế mới, không phải số ảnh chắc chắn phải sinh: còn master của thiết kế cũ cần tìm lại/chỉnh/tạo lần đầu. Không dùng recolor để tăng số lượng. Các ID mới chỉ dùng trong thư viện art, chưa được gắn vào gameplay.

14 thiết kế cũ ngoài bốn nhóm chuyển sang dự trữ sản xuất, vẫn giữ mọi master tìm thấy. Ngũ Hành tiếp tục rejected/archive-only; không đưa lại vào roster. Đế Giang không tiếp tục. Không đổi cua/nhện thành người hoặc bỏ chi của giao long chỉ để ép nhóm.

## Chứng cứ hiện tại

[Audit nguồn và SHA-256](./preservation-audit.json) kiểm tra roster cũ 39 ID và Ngũ Hành bị loại, tại `assets/sprites/monster-motion/` cùng `assets/monster-source/`. Tìm thấy **35 ảnh nguồn master/hướng** gồm biến thể và 5 ảnh Ngũ Hành; **12/39 ID có ảnh nguồn**, 1 ID chỉ thấy idle phái sinh, 26 ID chưa tìm thấy master ở các vị trí đã khảo sát. Đây không phải 35 master cá thể đã duyệt. Không kết luận file mất vĩnh viễn hoặc chưa từng tạo.

`.gitignore` bỏ qua `assets/sprites/**/source/`; không coi Git là backup đầy đủ. Năm ảnh legacy vẫn ở `assets/monster-source/{m001,m002,m003,m004,b001}.png`. Master Bàn Cổ hiện thấy ở `assets/hero-concepts/pangu-master/master_rgba.png`; đường style-ref sprite cũ `assets/sprites/pangu-topdown/source/south-master.png` không còn file. Cần rà style anchor trước khi sinh lô mới; không áp duyệt lịch sử vào file khác.

## Phases

| # | Phase | Status | Phụ thuộc |
|---|---|---|---|
| 1 | [Bảo toàn và chọn nguồn](./phase-01-start.md) | Completed | Không |
| 2 | [Chốt roster và brief 3D](./phase-02-roster-and-briefs.md) | Completed | 1 |
| 3 | [Sản xuất master theo lô](./phase-03-master-production.md) | Completed | 2 |
| 4 | [Bàn giao reference](./phase-04-reference-handoff.md) | Completed | 3 |

## Lưu trữ đã bàn giao

Tái dùng `assets/monster-source/`: `masters/<id>/master.png`, `metadata.json`, `prompt.txt`; `master-archive/<id>/` giữ raw/biến thể/nguồn cũ, bao gồm thiết kế dự trữ và rejected. `masters/index.json` là gallery manifest. Tệp `.md` chỉ trong `plans/` hoặc `docs/`. Đã copy bảo toàn 35 ảnh nguồn theo manifest/hash, giữ nguyên nguồn ban đầu; thêm 33 master mới và 2 bản edit có lịch sử. Đây là archive trên cùng máy, chưa phải backup ngoài thiết bị.

## Acceptance

- [x] 35 ảnh nguồn trong audit được copy bảo toàn và kiểm hash; nguồn gốc/thiếu nguồn được ghi rõ.
- [ ] Backup ngoài thiết bị: chưa có vị trí được chỉ định; không thuộc bước tạo ảnh đã yêu cầu, chưa tuyên bố hoàn thành.
- [x] File thiếu, bản idle phái sinh và nguồn gốc được phân biệt; không ghi "đã giữ đủ" khi còn mất dấu nguồn.
- [x] Roster/brief được chốt; mỗi ID có một master chính và nhận diện riêng.
- [x] Master cho thấy đầy đủ giải phẫu, vũ khí/phụ kiện, phù hợp reference 3D; không yêu cầu action/bốn hướng mới.
- [x] Có metadata/prompt/provenance, poster gallery, trạng thái accepted/needs-edit/reserved/rejected rõ.
- [x] Boss làm trước; số lượt sửa và nguyên nhân có log; không chạy vòng lặp sinh ảnh vô hạn.
- [x] Không thay runtime/gameplay; không tuyên bố đã có model hoặc nghiệm thu game từ ảnh master.

## Kết quả 27-10-2026

Người dùng yêu cầu “tạo toàn bộ ảnh master mới cần thiết”, cho phép triển khai roster trong kế hoạch. Đã bàn giao **38 master: 33 ảnh mới + 5 ảnh tái dùng**, một ảnh mỗi cá thể. Tạo boss trước, sau đó quái; chỉ có hai edit: đầu cú máy và bỏ đuôi cóc. Trạng thái accepted-reference là QA của agent, chưa thay thế nghiệm thu mỹ thuật của người dùng.

- [Gallery tương tác](../../assets/monster-source/masters/index.html), đổi nền sáng/tối và lọc boss/quái.
- [Gói ZIP bàn giao](../../assets/monster-source/master-references-20261027.zip), PNG gốc + metadata + prompt.
- [QA danh mục/hash](./master-delivery-qa.json), [hash gói bàn giao](./delivery-package.json).
- [Báo cáo sản xuất](./master-production-report.md).

Mỗi ảnh chỉ xác định góc nhìn hiện có; mặt sau/chi tiết khuất chưa được mô tả bằng ảnh riêng. Không tạo model, rig, animation hoặc tích hợp. Không chạy build/test/game.

## Còn ngoài bàn giao ảnh

Backup ngoài thiết bị chưa có đích lưu. Nguồn không tìm thấy ở audit ban đầu vẫn là thiếu nguồn lịch sử, không gọi ảnh tạo mới là nguồn phục hồi.
