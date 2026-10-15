---
phase: 4
title: "Client desktop hoàn chỉnh và reconnect 4 người"
priority: P2
effort: "Đánh giá theo hợp đồng điều chỉnh; không dùng ước lượng full-parity cũ"
dependencies: [3]
---

# Phase 4: Client desktop hoàn chỉnh và reconnect 4 người

## Phạm vi hiện hành

Áp dụng [hợp đồng điều chỉnh](./reports/implementation-contract.md). [Lịch sử gate và giới hạn](./reports/pm-261012-2346-scope-history.md) bảo toàn quyết định kế hoạch ban đầu; các gate full-native parity cũ không được tính hoàn tất.

## Acceptance kiểm chứng được

- [x] Babylon scene và HUD có lobby, đội hình, triệu hồi/hợp nhất/trang bị, synergy/trận pháp, phụ bản, điều khiển/hotkey.
- [x] Policy reconnect 60 giây, RAM-only state, host transfer, no late join được ghi trong README/spec.
- [x] SDK transport regression kiểm chứng state/ownership/dedup và refresh reconnect.
- [x] Client debug log bounded, reconnect secret không được ghi log; typecheck và build pass.

## Bằng chứng và giới hạn

Nguồn: [README](../../README.md), [gameplay spec](../../docs/gameplay-spec.md), apps/client/src. Controller đã kiểm tra hai browser tabs production, refresh/reconnect cả hai, host transfer, gear/stop/resume và boss co-op thật; [browser QA](./reports/browser-qa.md). Screenshot được quan sát trong chat, không lưu file. Không coi đây là full browser match mọi độ khó.

## Thực hiện và xác minh

Dùng boundary hiện có content/, packages/game-core/, packages/contracts/, apps/server/, apps/client/, tests/, deploy/. Lệnh xác minh thuộc package.json; không tạo lệnh parity/replay/e2e không có trong manifest. Bất kỳ khác biệt fidelity hoặc phép đo chưa làm phải được nêu rõ trong báo cáo. [Trạng thái tổng](./plan.md).


## Gate browser đã xác minh

- [x] Hoàn tất browser QA nhiều client và layout desktop; screenshot quan sát trong chat, kết quả tương tác/reconnect được ghi báo cáo.
- [x] Chạy regression client closed-socket/manual reconnect mới và liên kết báo cáo cuối.
