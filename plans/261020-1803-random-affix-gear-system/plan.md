---
title: Hệ thống đồ dòng ngẫu nhiên
priority: P1
effort: large
branch: feat/ui-ux-overhaul
tags: [gameplay, gear]
status: in-progress
created: 2026-10-20
owner: user decisions in chat 2026-10-20
---

# Hệ thống đồ dòng ngẫu nhiên (kiểu đồ xanh)

## Trạng thái triển khai 28-10-2026

Đề xuất UI/UX nối tiếp: [kho icon và kéo thả đồ lên tướng](../261028-1413-gear-drag-drop-ui/plan.md). Phần này đang ở trạng thái kế hoạch, không thay các kết quả triển khai đã ghi bên dưới.

Đã triển khai nguồn cả 7 phase, test hồi quy và benchmark đã viết; đã rà mã độc lập. Chưa chạy typecheck/test/benchmark/build/game theo AGENTS.md. Trạng thái còn `in-progress` cho tới khi có kết quả kiểm tra của người dùng.

Quyết định mới của người dùng trong tác vụ này có ưu tiên hơn các bảng đề xuất 45/60 wave bên dưới và trong các phase:

- Giữ trận **20 wave**, điều chỉnh cấp món và kinh tế theo trận hiện tại. `levelScale` dùng mẫu số 20; giá cường hóa `3 × (k+1)²`, tổng +10 là 1.155; 15 món là 17.325 so với thu nhập wave 12.500.
- Quái thường rớt 5%; phẩm/quà boss co theo tiến trình 20 wave; chống xui 3 wave. Mục tiêu khoảng 25–35 món, 2–5 vàng mỗi trận solo, chờ benchmark xác nhận.
- Bỏ hoàn toàn chỉ số chặn và buff chặn. Định Hải Thần Châm chỉ giữ miễn choáng/đẩy lùi, không còn ×3 hoặc phạt tốc đánh. Vẫn đủ 17 dòng độc nhất.
- Hấp Tinh tăng 0,25% Công mỗi lượt tính, boss tính 20, trần 60% (240 lượt).
- Game không còn phụ bản: không tạo lại chế độ đã gỡ; helper thưởng theo người tham gia được giữ và có test.
- Nguồn số liệu hiện hành: [gear-design.ts](../../content/gear-design.ts). Báo cáo [triển khai và bàn giao](../reports/implementation-261028-1343-random-affix-gear.md), [rà mã](../reports/code-review-261028-1309-random-affix-gear.md).

## Mục tiêu

Mỗi trận rớt đồ khác nhau, tạo đa dạng kiểu roguelike. Người chơi phải nghĩ món nào mặc cho tướng nào, và không mất công đầu tư khi đổi tướng liên tục. Đồ thay thế hoàn toàn hệ trang bị cũ (công/thủ/pháp cấp 0–5 theo tướng).

## Quyết định đã chốt

| Mục | Chốt |
|---|---|
| Cách mặc | Kho đồ riêng từng người, không giới hạn số lượng. Ghép, hợp nhất hoặc bán tướng thì đồ tự về kho. Thay đồ bất kỳ lúc nào. |
| Khe đồ | 3 khe mỗi tướng: vũ khí, giáp, pháp khí. |
| Dòng | Dòng hiện ngẫu nhiên, không có Ngũ Hành và không có dòng ẩn. Có dòng chung (có ích với mọi tướng) và dòng theo cơ chế (chỉ tác dụng khi tướng có cơ chế đó). |
| Phẩm | Trắng 0 dòng, xanh 1–2, tím 3–4, vàng 5–6 cộng 1 dòng độc nhất. |
| Rớt đồ | Mỗi quái bị hạ có tỷ lệ rớt cho chủ của tướng hạ nó, kèm bảo đảm chống xui. Boss và phụ bản chắc chắn rớt; boss/phụ bản về sau cho phẩm và dòng tốt hơn. Phụ bản: mỗi người có tướng tham gia nhận một món. Đồ tự vào kho. |
| Nâng cấp | Cường hóa +0 đến +10 bằng Linh Thạch, không bao giờ thất bại. Tẩy luyện quay lại một dòng ngẫu nhiên. |
| Hệ cũ | Bỏ hẳn. |
| Kinh tế | Đồ là phần cộng thêm. Linh Thạch trước đây dùng cho trang bị cũ chuyển sang cường hóa và tẩy luyện. |
| Dòng độc nhất | 17 dòng, tất cả chỉ tác động lên chính tướng mặc, trừ Lưỡng Nghi hồi máu được cả đồng đội. |
| Không làm | Meta progression, bản đồ rẽ nhánh, relic theo người chơi, dòng tăng tỷ lệ khống chế cứng, sát thương theo % Máu kẻ địch. |

## Các phase

| # | Phase | Phụ thuộc |
|---|---|---|
| 1 | [Dữ liệu thiết kế và hợp đồng](phase-01-data-contracts.md) | — |
| 2 | [Sinh đồ và rớt đồ](phase-02-generation-drops.md) | 1 |
| 3 | [Kho, lệnh và gỡ hệ trang bị cũ](phase-03-inventory-commands.md) | 1, 2 |
| 4 | [Chỉ số dòng chung và dòng theo cơ chế](phase-04-stat-integration.md) | 3 |
| 5 | [17 dòng độc nhất](phase-05-unique-lines.md) | 4 |
| 6 | [Giao diện client](phase-06-client-ui.md) | 3 (làm dần theo 4–5) |
| 7 | [Test, log, tài liệu và cân bằng](phase-07-tests-docs-balance.md) | 1–6 |

Phase 1→2→3→4→5 nối tiếp vì cùng chạm `combat.ts`, `stats.ts` và `types.ts`. Phase 6 có thể làm song song từ sau phase 3, vì chỉ chạm `apps/client/`.

## Ranh giới

- Roll đồ, rớt đồ, chỉ số và mọi hiệu ứng đều tính trên server (`packages/game-core/`). Client chỉ gửi lệnh và hiển thị.
- Dữ liệu thiết kế nằm trong `content/gear-design.ts`, không sửa `content/data/catalog.json`. Đây là thiết kế bản web, không phải nội dung map gốc.
- RNG của đồ dùng luồng riêng `gearSeed`, theo tiền lệ `controlSeed`, để không làm lệch kết quả triệu hồi, sinh quái và khống chế hiện có.
- Không thêm tham chiếu chéo gây vòng import: module đồ nhận callback `hurt`, giống cách các module `*-combat.ts` đang làm.
- Agent không chạy build, test hay game. Người dùng chạy `start-game.cmd`.

## Tiêu chí nghiệm thu

- Hai trận khác seed cho ra đồ khác nhau. Cùng seed và cùng chuỗi lệnh thì cho cùng đồ.
- Ghép, hợp nhất hoặc bán tướng không bao giờ làm mất đồ.
- Dòng theo cơ chế chỉ tác dụng trên tướng có cơ chế đó, và UI chỉ rõ điều này.
- Đổi đồ không hồi máu: tỷ lệ máu được giữ như luật `refreshStats` hiện có.
- Benchmark cho thấy đội có đồ cuối trận mạnh tương đương đội có trang bị cũ cấp tối đa, không vượt quá xa.
- Có test hồi quy cho tính tất định, lệnh, gỡ hệ cũ và từng dòng độc nhất.

## Chốt bổ sung (20-10-2026)

- **Huyết Khế** thiết kế lại: chỉ giảm lượng hồi máu và khiên nhận vào, không cấm hẳn. Hồi đầy Máu đầu mỗi wave.
- **Ma Tâm** được phép tự làm tướng chết vì mất máu.
- **Kho** không giới hạn số lượng. Không có tự phân giải.
- Tạm bỏ dòng **+1 lần nảy** và **+1 tia**.
- Dòng **% Nộ nhận vào** gắn tại một điểm chung trong bước gear mỗi tick.

- Giá cường hóa và tỷ lệ rớt do agent tính từ kinh tế hiện có (người dùng giao ngày 20-10-2026): cường hóa `15 × (k+1)²`, quái thường 1,4%, chống xui sau 3 wave. Kỳ vọng khoảng 35 món và 5 món vàng mỗi trận 45 wave. Cách tính ở phase 1 và phase 2; benchmark ở phase 7 sẽ kiểm chứng.

## Câu hỏi còn mở

1. Kho không giới hạn nên `player.gear` sẽ lớn dần trong snapshot gửi cho cả phòng. Ước tính khoảng 40 món mỗi người cuối trận vẫn chấp nhận được. Nếu thấy chậm, có thể chỉ gửi kho đầy đủ cho chủ của kho.
