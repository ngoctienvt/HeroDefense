---
phase: 5
title: "Nghiệm thu bản thích nghi và chuẩn bị phát hành online"
priority: P2
effort: "Đánh giá theo hợp đồng điều chỉnh; không dùng ước lượng full-parity cũ"
dependencies: [4]
---

# Phase 5: Nghiệm thu bản thích nghi và chuẩn bị phát hành online

## Phạm vi hiện hành

Áp dụng [hợp đồng điều chỉnh](./reports/implementation-contract.md). [Lịch sử gate và giới hạn](./reports/pm-261012-2346-scope-history.md) bảo toàn quyết định kế hoạch ban đầu; các gate full-native parity cũ không được tính hoàn tất.

## Acceptance kiểm chứng được

- [x] Full progression thắng/thua theo simulation time và core soak có số đo, fixture/giới hạn được công khai.
- [x] Network/security/admission/dedup/drain regression bằng SDK thật pass.
- [x] Production build phục vụ client/API/WebSocket cùng process; local artifact và health đã được controller xác minh.
- [x] README/gameplay/provenance/deploy runbook mô tả đúng bản thích nghi và RAM-only crash limitation.
- [x] Dockerfile/Compose/Caddy config được chuẩn bị như artifact triển khai.

## Bằng chứng và giới hạn

Nguồn: [tester report](./reports/tester-debugger.md), [deploy runbook](../../deploy/README.md). Có source/config không đồng nghĩa Docker build hoặc public deployment đã chạy. Local drain test không thay thế blue/green routing, rollback và TLS/WSS staging rehearsal.

## Thực hiện và xác minh

Dùng boundary hiện có content/, packages/game-core/, packages/contracts/, apps/server/, apps/client/, tests/, deploy/. Lệnh xác minh thuộc package.json; không tạo lệnh parity/replay/e2e không có trong manifest. Bất kỳ khác biệt fidelity hoặc phép đo chưa làm phải được nêu rõ trong báo cáo. [Trạng thái tổng](./plan.md).


## Gate còn lại

- [x] Đóng gate browser QA cuối sau phase 4; chưa tính full browser matches mọi độ khó/player count.

- [ ] Build/chạy Docker image thật trên host tương thích; hiện mới có config.
- [ ] Provision hostname/host và xác minh HTTPS/WSS từ mạng ngoài.
- [ ] Diễn tập public blue/green drain/reconnect/rollback; công bố giới hạn host từ phép đo thực.
