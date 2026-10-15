---
phase: 2
title: "Lõi gameplay và lát cắt co-op online thực"
priority: P2
effort: "Đánh giá theo hợp đồng điều chỉnh; không dùng ước lượng full-parity cũ"
dependencies: [1]
---

# Phase 2: Lõi gameplay và lát cắt co-op online thực

## Phạm vi hiện hành

Áp dụng [hợp đồng điều chỉnh](./reports/implementation-contract.md). [Lịch sử gate và giới hạn](./reports/pm-261012-2346-scope-history.md) bảo toàn quyết định kế hoạch ban đầu; các gate full-native parity cũ không được tính hoàn tất.

## Acceptance kiểm chứng được

- [x] Core authoritative độc lập renderer, seeded RNG và fixed step 0,05 giây/20 Hz.
- [x] Colyseus SDK thật: tạo/vào phòng mời, readiness, host start, tối đa 4 ghế, chặn late join.
- [x] Validation/ownership, sequence ACK/dedup, quota allocation và command rate limits có regression.
- [x] SDK network tests kiểm tra nhiều client thật, state sync, reconnect và drain cục bộ.

## Bằng chứng và giới hạn

Nguồn: apps/server/test/network.test.ts, apps/server/test/validation.test.ts, [tester report](./reports/tester-debugger.md). Controller/server validation báo 9 network/validation cases pass. Đây là network cục bộ qua transport thật; chưa chứng minh public TLS/WSS hoặc WAN.

## Thực hiện và xác minh

Dùng boundary hiện có content/, packages/game-core/, packages/contracts/, apps/server/, apps/client/, tests/, deploy/. Lệnh xác minh thuộc package.json; không tạo lệnh parity/replay/e2e không có trong manifest. Bất kỳ khác biệt fidelity hoặc phép đo chưa làm phải được nêu rõ trong báo cáo. [Trạng thái tổng](./plan.md).

