---
title: "Thiên Đạo 2.1 — web co-op 2–4 người"
description: "Bản web desktop thích nghi đầy đủ nhóm cơ chế đã chốt, authoritative co-op và artifact triển khai."
status: in-progress
priority: P2
effort: "Triển khai local xong; public release còn lại"
tags: [feature, frontend, backend, multiplayer]
blockedBy: [261013-0010-rts-controls-converging-lanes]
blocks: []
created: 2026-10-12
---

# Thiên Đạo 2.1 — kế hoạch web co-op

## Outcome và hợp đồng hiện hành

Đã dựng bản web desktop có phòng mời 1–4 người (2–4 co-op, solo luyện), đội hình 5 ô, 70 nhân vật, 27 duyên phận, 8 trận pháp, triệu hồi/hợp nhất, ba nhóm trang bị, chiến đấu/kỹ năng, 45/60 wave, 8 phụ bản boss và kết quả xếp hạng. Server quyết định trạng thái; UI/đồ họa và công thức được thích nghi theo yêu cầu.

[Hợp đồng triển khai điều chỉnh](./reports/implementation-contract.md) thay gate bắt buộc full Warcraft parity. [Lịch sử gate](./reports/pm-261012-2346-scope-history.md) giữ tóm tắt mục tiêu ban đầu và các điều kiện chưa chứng minh; không tính chúng là pass. Không có chứng nhận runtime Warcraft/native fidelity. Không thêm PvP/mobile/thanh toán/tài khoản/database.

## Nguồn và boundary thực

Nguồn là ThienDao v2.1.w3x, SHA-256 ddc4be147dc7afd262be6193b94f1f06f786e7222c4ea7dd444feeda63f9a8e8; clip 2.0 chỉ tham khảo UI/flow. [Khảo sát map](./reports/map-inspection.md) và [content provenance](../../docs/content-provenance.md) phân biệt danh tính/quan hệ giữ từ nguồn với stats/handlers thích nghi. Không chạy JASS trong web runtime.

TypeScript; Babylon.js scene/HUD; Colyseus Node authoritative room; fixed simulation 20 Hz, snapshot 10 Hz. Boundary hiện có: content/, packages/contracts/, packages/game-core/, apps/server/, apps/client/, tests/, deploy/. State ở RAM; reconnect 60 giây không phục hồi server crash. [Gameplay và session policy](../../docs/gameplay-spec.md), [setup](../../README.md), [deploy](../../deploy/README.md).

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Khôi phục luật và catalog đối chiếu](./phase-01-start.md) | Completed |
| 2 | [Simulation và co-op thật](./phase-02-core-coop-slice.md) | Completed |
| 3 | [Đủ nhóm gameplay thích nghi](./phase-03-full-gameplay.md) | Completed |
| 4 | [Client desktop và phục hồi kết nối](./phase-04-desktop-client-recovery.md) | Completed |
| 5 | [Nghiệm thu bản thích nghi và phát hành](./phase-05-parity-release.md) | In Progress |

## Acceptance và chứng cứ

Checkbox trong cả năm phase là nguồn progress; CLI parse/status tính từ chúng. Phase 1–4 hoàn tất theo hợp đồng điều chỉnh; phase 5 còn ba gate public release. 25/28 checkbox (CLI 89%); không biểu thị phần trăm effort hoặc full-native parity. [Tester report](./reports/tester-debugger.md): controller xác minh full suite cuối 161/161 pass (143 core + 6 content + 9 server + 3 client adapter); full progression thắng với mature roster trên 4 độ khó, undefended loss, saturation 36.000 calls/1.800 simulation seconds.

[Server implementation report](../../apps/server/server-implementation-report.md): 9 network/validation cases pass bằng SDK/TCP thật; 4-client local soak 15,01 giây, 600 snapshots, 300 simulation ticks, event-loop p99 18,56 ms. Đây là smoke soak, chưa chứng minh production capacity. Controller xác minh typecheck/build và local production artifact/health; [browser QA](./reports/browser-qa.md) và 3 regression client lifecycle đã pass. Hai browser tabs cùng room production đi tới wave 15, boss co-op thắng, refresh/reconnect giữ state và host transfer đúng. Screenshot quan sát trong chat; không lưu file. [Code review](./reports/code-review.md) có ba P2 đã sửa, không còn finding chặn local/LAN.

## Gate còn lại và giới hạn

Public hostname/host chưa provision; Docker image chưa build/chạy; TLS/WSS từ mạng ngoài và blue/green rollback chưa diễn tập. Các file Docker/Compose/Caddy là artifact chuẩn bị. Local/LAN dùng được theo README; public Internet release chưa nghiệm thu.

Full-match fixture chứng minh engine progression, không bảo đảm starting-economy balance hoặc full browser matches mọi tổ hợp 2/3/4 người. Cấu hình máy tối thiểu/FPS và capacity host chưa được chứng nhận. Không mô tả saturation fixture là peak tự nhiên của map.

## Tiếp tục

Yêu cầu ngày 2026-10-13 bổ sung [điều khiển RTS và làn hội tụ theo số người](../261013-0010-rts-controls-converging-lanes/plan.md): Ctrl+1–9 lưu nhóm, 1–9 gọi nhóm; mỗi người chỉ điều khiển quân mình; N người có N làn hiện/sinh quái (N=1–4), khi có nhiều làn đi riêng khoảng 2/3 đường rồi nhập đường giữa, hướng trên xuống dưới màn hình. Quái bị hạ không cho tài nguyên, mỗi wave thưởng cùng mức cho từng người, hoàn thành phụ bản vẫn thưởng đều cho cả đội. Kế hoạch mới đang pending, gameplay hiện tại chưa thay đổi. Chứng cứ nghiệm thu cũ vẫn là lịch sử bản bốn làn thẳng, chưa nghiệm thu các yêu cầu mới.

Nghiệm thu gameplay mới trước khi đóng gate phát hành cuối; chuẩn bị host/domain có thể làm độc lập. Sau đó chạy Docker/TLS/WSS và rollout rehearsal. Plan giữ in-progress tới khi gate release còn lại có bằng chứng.

<!-- slug: thien-dao-web-coop -->

