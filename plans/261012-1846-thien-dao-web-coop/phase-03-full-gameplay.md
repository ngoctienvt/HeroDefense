---
phase: 3
title: "Chuyển toàn bộ cơ chế và nội dung gameplay"
priority: P2
effort: "Đánh giá theo hợp đồng điều chỉnh; không dùng ước lượng full-parity cũ"
dependencies: [2]
---

# Phase 3: Chuyển toàn bộ cơ chế và nội dung gameplay

## Phạm vi hiện hành

Áp dụng [hợp đồng điều chỉnh](./reports/implementation-contract.md). [Lịch sử gate và giới hạn](./reports/pm-261012-2346-scope-history.md) bảo toàn quyết định kế hoạch ban đầu; các gate full-native parity cũ không được tính hoàn tất.

## Acceptance kiểm chứng được

- [x] 70 định nghĩa nhân vật; 5 ô/20 dự bị; triệu hồi, cửa hàng, bán, hợp nhất và 3 nhóm trang bị.
- [x] Combat/5 ability handlers theo role, AI, di chuyển, death/respawn, H/N lưu vị trí trong trận.
- [x] 27 duyên phận distinct-member và 8 trận pháp có activate/deactivate/cap regression.
- [x] 45/45/45/60 wave, 4 độ khó, 8 phụ bản boss, phần thưởng, thắng/thua và sao xếp hạng.
- [x] Core regressions và headless full progression/soak có báo cáo thật; hai exploit health-buff đã có regression.

## Bằng chứng và giới hạn

Nguồn: [tester-debugger](./reports/tester-debugger.md), [gameplay spec](../../docs/gameplay-spec.md). 142-case full suite pass rồi 5 focused cases pass sau regression ghế sảnh mới: tổng hiện 143 core cases, không ghi 143 full suite đã chạy. Mature-roster fixture thắng mọi độ khó; bốn undefended runs thua thật. Không chứng minh starting-economy balance hoặc mỗi tổ hợp 2/3/4 người chơi trọn trận.

## Thực hiện và xác minh

Dùng boundary hiện có content/, packages/game-core/, packages/contracts/, apps/server/, apps/client/, tests/, deploy/. Lệnh xác minh thuộc package.json; không tạo lệnh parity/replay/e2e không có trong manifest. Bất kỳ khác biệt fidelity hoặc phép đo chưa làm phải được nêu rõ trong báo cáo. [Trạng thái tổng](./plan.md).

