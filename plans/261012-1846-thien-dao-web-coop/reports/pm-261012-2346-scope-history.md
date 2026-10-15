# Đồng bộ phạm vi và lịch sử gate — 2026-10-12

Kế hoạch ban đầu (19:05) đặt full Warcraft parity làm gate: resolve native/defaults, map 2.1 runtime oracle, mọi trigger reachable, pathing/timing/công thức gốc, full match 2/3/4 người và rollout V1/V2 có reconnect giữ bundle. Năm phase ban đầu đều pending với 72 checkbox. Đây là lịch sử thiết kế, không phải các gate đã pass.

Người dùng sau đó cho phép clone không tuyệt đối, cơ chế tương tự và yêu cầu thực hiện toàn bộ nhóm cơ chế. [Hợp đồng điều chỉnh](./implementation-contract.md) là nguồn thay thế gate parity. [Gameplay spec](../../../docs/gameplay-spec.md) và [provenance](../../../docs/content-provenance.md) công khai thích nghi: terrain, công thức, economy/wave pacing, 5 role handlers thay cho từng Warcraft ability, generic synergy/formation buffs. Không ghi full-native parity là complete.

| Phase | Gate cũ được thay | Gate hiện tại |
|---|---|---|
| 1 | Resolve mọi native/base data; runtime oracle; recover RNG/pathing gốc | Offline evidence/provenance + catalog identities; thích nghi công khai |
| 2 | Runtime-equivalent slice và public online spike trước nhập content | Authoritative fixed-step core + SDK transport thật cục bộ; public online nằm phase 5 |
| 3 | 100% reachable JASS/custom abilities/recipe; fixture parity từng mechanic | Đủ nhóm cơ chế chốt trong contract, 70/27/8/8 content, real regression + progression |
| 4 | Mọi mechanic qua UI và full V1/V2 reload/reconnect rollout | Desktop UI + session correctness; browser QA còn đang làm; rollout nằm phase 5 |
| 5 | Oracle full fidelity, full browser matches mọi player count, host budgets, WSS rollout | Local release/regression/progression/soak; public deployment/TLS/Docker rehearsal chưa xong |

Không thêm persistence/account/PvP/mobile/thanh toán. H/N chỉ nhớ vị trí trong trận. Không có nguồn Warcraft runtime thì không chứng nhận fidelity; nay không chặn triển khai đã được người dùng duyệt.

Các ước lượng 40–75 ngày công và phase 3 chưa chốt là ước lượng khảo sát lịch sử, không phải thời lượng thực hoặc cam kết release hiện tại. Các đường dẫn source/lệnh giả định cũ được thay bằng boundary và scripts thực từ package.json.

Chứng cứ nhận từ controller: typecheck/build pass, 9 network/validation cases pass, local production/health pass. Tester report: full 142 core pass, tiếp đó focused 5 pass sau thêm case mới (143 tổng), 4 mức khó thắng bằng mature roster, 4 undefended loss, saturation 36.000 calls/1.800 simulation seconds. Không nâng thành 143 full rerun, normal-economy balance, WAN/performance host guarantee hay full browser-match evidence.

Docs impact: chỉ cập nhật records kế hoạch; evergreen gameplay/provenance/deploy đã được owner khác cập nhật. Không cần delegation docs-manager thêm.

## Còn lại

Browser QA cuối và closed-socket client regression do controller sở hữu. Public host/domain/HTTPS/WSS chưa có kết quả; Docker build và rollout/rollback rehearsal chưa thực thi. Plan giữ in-progress.

