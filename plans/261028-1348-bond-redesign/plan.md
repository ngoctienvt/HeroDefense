---
title: "Thiết kế lại 27 Duyên Phận"
description: "Thay buff chỉ số phẳng của 27 duyên phận bằng cơ chế riêng, dựng hoàn toàn từ trạng thái, vùng, triệu hồi và kỹ năng có sẵn."
status: implemented-unverified
priority: P2
effort: 46h
branch: feat/ui-ux-overhaul
tags: [gameplay, game-core, contracts, client, bonds]
blockedBy: []
blocks: []
created: 2026-10-28
---

# Thiết kế lại 27 Duyên Phận

Nguồn thiết kế: [design-261028-1330-duyen-phan-redesign.md](../reports/design-261028-1330-duyen-phan-redesign.md). Mỗi hiệu ứng cụ thể, số liệu nháp và nguồn gốc đều ghi ở đó; plan này chỉ mô tả cách triển khai.

## Kết quả mong muốn

- Mỗi duyên phận có cơ chế riêng, kích hoạt theo mốc số thành viên khác nhau đang triển khai, áp dụng toàn bản đồ.
- Bỏ hoàn toàn buff phẳng cũ (+8% Công/Máu/tốc đánh, +3 giáp, +1,5% hồi máu).
- Luật Duyên Tụ: tướng thuộc ≥ 2 duyên phận đang kích hoạt được thêm Nộ đầu wave và tốc hồi Nộ; không giới hạn số duyên phận.
- Người chơi nhìn thấy mốc hiện tại/kế tiếp, bộ đếm và mỗi lần kích hoạt.

## Ràng buộc

- Thành viên duyên phận giữ đúng JASS; không sửa `content/data/catalog.json`. Hiệu ứng gắn `adapted` hoặc `original`.
- Chỉ dùng trạng thái, vùng, đơn vị triệu hồi, kênh chỉ số trang bị và kỹ năng có sẵn. Thứ mới duy nhất: bộ đếm trên `Player` và event `bond-trigger`.
- Server quyết định mọi kết quả; client chỉ hiển thị.
- Bộ đếm sống trên `Player`, giữ nguyên khi ghép tướng.
- Không duyên phận liên phòng; không thưởng kinh tế.
- Không cân bằng theo 20 wave; số liệu là hằng số nháp, dễ chỉnh.
- Agent không chạy build, test hay game. Người dùng chạy theo mục kiểm tra của từng phase.

## Ngoài phạm vi

- Cân bằng số liệu theo số wave mới.
- Lục Nhĩ sao chép kỹ năng của người khác (phương án độ khó C).
- Trạng thái mới (Ướt, Mê Hoặc, dấu ấn), điều kiện khoảng cách, hiệu ứng liên quan Linh Trụ.
- Miễn khống chế cho tướng ở bất kỳ duyên phận nào.

## Các phase

| # | Phase | Trạng thái | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| 01 | [Khung dữ liệu và runtime](phase-01-bond-framework-and-runtime.md) | implemented-unverified | 8h | — |
| 02 | [Đồng bộ và giao diện](phase-02-bond-sync-and-ui.md) | implemented-unverified | 5h | 01 |
| 03 | [Duyên phận đầu trận và độ khó A](phase-03-early-and-simple-bonds.md) | implemented-unverified | 10h | 01, 02 |
| 04 | [Thi triển dây chuyền và triệu hồi](phase-04-chain-cast-and-summon-bonds.md) | implemented-unverified | 12h | 03 |
| 05 | [Bộ đếm dài hạn và phần còn lại](phase-05-counter-and-remaining-bonds.md) | implemented-unverified | 9h | 04 |
| 06 | [Tài liệu và bàn giao](phase-06-docs-and-handoff.md) | implemented-unverified | 2h | 04, 05 |

Phase 04 và 05 độc lập về duyên phận nhưng cùng sửa `bonds/index.ts` và vài hook trong `combat.ts`. Làm tuần tự, không song song.

## Tiêu chí nghiệm thu

- Cả 27 duyên phận có handler hoặc dữ liệu hiệu ứng theo thiết kế; không còn tham chiếu `SynergyDef.bonus`/`amount` trong tính chỉ số.
- Bản sao và đơn vị triệu hồi không tính vào mốc.
- Bộ đếm Kiếp Nạn giữ nguyên qua ghép tướng Thỉnh Kinh → Hậu Tây Du.
- Hiệu ứng % máu tối đa, kết liễu và nổ dây chuyền không áp lên boss.
- Thi triển cưỡng bức không tạo vòng lặp.
- Mỗi handler có ít nhất một test kích hoạt; người dùng chạy `npm run typecheck` và `npm test` đều qua.
- Bảng Duyên Phận hiển thị văn bản mới, mốc và bộ đếm; mỗi lần kích hoạt có toast hoặc VFX có sẵn.

## Rủi ro chính

- Thi triển cưỡng bức đi vào luồng windup (`pendingAbility`), có thể bị bỏ qua hoặc kích đệ quy.
- Cache của `gearModsOf` theo `gearVersion` sẽ trả mods cũ nếu không làm mới khi đội hình đổi.
- Kích thước snapshot tăng vì `bondState`; cần giữ gọn.
