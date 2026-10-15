---
phase: 1
title: "Khôi phục đặc tả gameplay và nền tảng kiểm chứng"
priority: P2
effort: "Đánh giá theo hợp đồng điều chỉnh; không dùng ước lượng full-parity cũ"
dependencies: []
---

# Phase 1: Khôi phục đặc tả gameplay và nền tảng kiểm chứng

## Phạm vi hiện hành

Áp dụng [hợp đồng điều chỉnh](./reports/implementation-contract.md). [Lịch sử gate và giới hạn](./reports/pm-261012-2346-scope-history.md) bảo toàn quyết định kế hoạch ban đầu; các gate full-native parity cũ không được tính hoàn tất.

## Acceptance kiểm chứng được

- [x] Khôi phục nguồn offline, manifest/hash và catalog có xuất xứ.
- [x] Catalog giữ 70 danh tính/role, 27 quan hệ, 8 trận pháp, 4 độ khó và 8 phụ bản; giá trị thích nghi được đánh dấu.
- [x] Scaffold TypeScript, validator, extraction debug log và kiểm thử content đã có.
- [x] Khóa hợp đồng thích nghi; nguồn thiếu/native chưa chứng minh được công khai trong provenance.

## Bằng chứng và giới hạn

Nguồn: [map inspection](./reports/map-inspection.md), [content provenance](../../docs/content-provenance.md), [gameplay spec](../../docs/gameplay-spec.md). File map không bị sửa; extractor đọc bounded evidence text/SLK, không chạy JASS. Không tuyên bố reader MPQ hoàn chỉnh hoặc runtime Warcraft parity.

## Thực hiện và xác minh

Dùng boundary hiện có content/, packages/game-core/, packages/contracts/, apps/server/, apps/client/, tests/, deploy/. Lệnh xác minh thuộc package.json; không tạo lệnh parity/replay/e2e không có trong manifest. Bất kỳ khác biệt fidelity hoặc phép đo chưa làm phải được nêu rõ trong báo cáo. [Trạng thái tổng](./plan.md).

