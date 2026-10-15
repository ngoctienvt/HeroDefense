---
phase: 3
title: "Thưởng wave, cân bằng, HUD và nghiệm thu trận thực"
status: in-progress
priority: P1
effort: "2–4 ngày kỹ thuật, ước lượng thô; chưa gồm host Internet"
dependencies: [1, 2]
---

# Giai đoạn 3: Thưởng wave, cân bằng, HUD và nghiệm thu trận thực

Thưởng wave, bỏ thưởng kill và cân bằng bắt đầu đã triển khai; xem [QA gameplay](./reports/playability-qa.md) và [đo hiệu năng](./reports/performance-qa.md). Browser trọn trận/tải cao chưa nghiệm thu.

## Bối cảnh và mục tiêu

[Tổng kế hoạch](./plan.md), [khảo sát/baseline](./reports/current-state-audit.md), [input RTS](./phase-01-start.md), [bản đồ hội tụ](./phase-02-converging-lanes.md), [gate phát hành cũ](../261012-1846-thien-dao-web-coop/phase-05-parity-release.md).

Đầu ra là trận local/LAN chơi từ kinh tế ban đầu, quân và lệnh đọc rõ khi tụ giữa, báo cáo đo hiệu năng và nghiệm thu trung thực. Không dựng lại 70 tướng/27 duyên phận/8 trận pháp/8 dungeon hay sửa hàng loạt chỉ số không có bằng chứng.

Baseline lượt lập kế hoạch: typecheck/build pass, 161 test pass trong 31,39 s. Browser cũ chỉ hai tab đến wave 15; full campaign fixture cấp mature roster nên chưa chứng minh starting economy. Chưa có FPS chứng nhận; không gọi soak server là kết quả GPU.

## Yêu cầu

- Chạy trận thực từ 500 Linh Thạch/18 Đạo Duyên/1 điểm trận pháp; chi tiêu/summon/merge/equip/formation/dungeon dùng lệnh thật. Không cấp roster cuối game, bơm tiền hay giảm máu quái để biến thành pass cân bằng.
- Bỏ mọi tài nguyên khi từng quái bị hạ: không cộng Linh Thạch, không có xác suất rơi Đạo Duyên 12%. Kill/damage vẫn ghi thống kê. Xóa hoặc bỏ `Enemy.reward` và giá trị thưởng trong death event nếu chỉ còn phục vụ logic/UI đã bị bỏ; kiểm hết chỗ dùng trong contract, fixture, spawn thường và boss phụ bản.
- Mỗi wave hoàn tất, từng thành viên tổ đội nhận cùng lượng Linh Thạch và Đạo Duyên, kể cả người không có last-hit. Công thức triển khai sau đo cân bằng là `180 + wave × 40` và `4 + floor(wave/10)` cho mỗi người. Thưởng hoàn thành phụ bản vẫn phát đều cho cả đội như hiện tại.
- Đo tài nguyên/kill/damage mỗi owner ở mốc wave, số lần chết, leak/HP base, thời gian, làn nguồn và tham gia dungeon. Nghiệm thu 1/2/3/4 làn theo số thành viên trong trận; mỗi người chỉ điều khiển quân của mình.
- HUD thấy rõ owner bằng vòng/chân/nhãn màu và ký hiệu ngoài màu, phân biệt selection/primary/target/đích/order/zone. Actors hiện có màu role nhưng chưa dùng màu owner rõ; ưu tiên sửa khả năng nhận diện khi 20 quân hội tụ.
- Hiển thị group 1–9, số quân hợp lệ, trạng thái move/attack/hold và lý do lệnh thất bại; thông báo không che quái/HUD quá lâu. Giữ typing focus qua snapshots.
- Desktop 1366×768 và 1920×1080: không overlap/cắt nút/timer/base HP, vùng canvas đủ chọn quân, cảnh main/dungeon/result/lobby đọc được. Không mở rộng thành mobile.
- Đo render và server trên tải tự nhiên lẫn stress; ngưỡng FPS phải kèm máy/browser/resolution và là mục tiêu đề xuất, không claim đã đạt.
- Nghiệm thu Internet là gate tùy chọn riêng, kế thừa phần chưa xong của kế hoạch cũ. Không thêm tài khoản/database để giải quyết release.

## Thiết kế kiểm chứng

Giữ simulation authoritative, telemetry bounded qua debug client/server hiện có và bảng kết quả trong reports của kế hoạch. Đo snapshot/render/tick ở đúng bản build kiểm thử. Không gửi tên/token hoặc toàn payload session vào báo cáo; dùng owner seat/ID nội bộ khi cần phân tích. Regression bắt buộc: một kill trên làn chính không thay đổi `gold/souls`; kill boss phụ bản chỉ kích hoạt thưởng **hoàn thành phụ bản** đúng một lần, phát đều cho cả đội, không có thưởng per-kill riêng; hoàn tất wave tăng tài nguyên đúng một lần với cùng lượng cho mọi thành viên, kể cả người rớt mạng còn giữ chỗ.

| Loại | Kịch bản và chứng cứ |
|---|---|
| Browser thật | Phòng 1, 2, 3, 4 client: kiểm đúng số làn; kéo/chọn nhóm/ra lệnh, hỗ trợ lane, tụ chung khi nhiều người, split dungeon, chết/hồi sinh, disconnect/reconnect/host transfer, leave/reset. SDK tests bổ sung, không thay browser. |
| Trận từ đầu | Ít nhất một full match browser Bình Thường cho mỗi 1/2/3/4 người, người chơi/điều khiển thật dùng kinh tế khởi đầu. Ghi seed, chiến thuật, wave kết thúc, thắng/thua và nguyên nhân; một thất bại hợp lý không bị che. |
| Độ khó/tiến trình | Giữ full progression engine 45/45/45/60 và 8 dungeon; thêm starting-economy runs với các seed/chiến thuật rõ ràng trên mọi độ khó. Chứng cứ tự động không thay full browser match; không hứa mọi chiến thuật đều thắng. |
| Solo | Một làn giữa, không hợp lưu giả; chạy trọn trận từ kinh tế đầu và xác minh thưởng wave cho người chơi duy nhất. |
| Stress | Tải quái tụ merge tự nhiên ở wave cao, 20 quân, skills/VFX, 1×/2×/4×; stress synthetic có nhãn riêng, không gọi là peak gameplay đã đo. |
| Readability | Ảnh 1366×768/1920×1080 lúc hợp lưu đông, selection nhóm, dungeon, kết quả; kiểm owner/primary/target và click hitbox thực. |

Mục tiêu hiệu năng đề xuất để đánh giá: median ≥60 FPS, p95 frame time ≤33,3 ms trên cấu hình desktop kiểm thử 1080p; không freeze input >100 ms; server p99 tick <50 ms và snapshot không backlog khi 4 người ở 4×. Đây là ngưỡng cần đo/thống nhất với máy mục tiêu; ghi kết quả thấp hơn và nguyên nhân, không tự giảm ngưỡng sau thất bại để ký pass.

## Tệp liên quan

| Hành động | Đường dẫn tuyệt đối | Nội dung |
|---|---|---|
| Sửa khi số đo/QA cần | `D:\HeroDefense\apps\client\src\battlefield.ts`, `D:\HeroDefense\apps\client\src\main.ts` | Owner/selection/order feedback, render performance. |
| Sửa khi QA cần | `D:\HeroDefense\apps\client\src\panels.ts`, `D:\HeroDefense\apps\client\src\styles.css` | HUD/cẩm nang/layout desktop; giữ focus. |
| Sửa khi đo cần | `D:\HeroDefense\apps\client\src\debug.ts`, `D:\HeroDefense\apps\server\src\debug-log.ts`, `D:\HeroDefense\apps\server\src\game-room.ts` | Bounded counters/timing không lộ session. |
| Sửa | `D:\HeroDefense\packages\game-core\src\combat.ts`, `D:\HeroDefense\packages\game-core\src\simulation.ts`, `D:\HeroDefense\packages\game-core\src\dungeons.ts`, `D:\HeroDefense\packages\contracts\src\types.ts` | Bỏ mọi tài nguyên per-kill, dọn reward field/event nếu không còn dùng; giữ thưởng wave đều và thưởng hoàn thành phụ bản cho cả đội. |
| Sửa khi cần policy thống nhất | `D:\HeroDefense\docs\gameplay-spec.md`, `D:\HeroDefense\README.md` | Điều khiển/map/kinh tế và giới hạn thật. |
| Sửa | `D:\HeroDefense\packages\game-core\test\progression.test.ts`, `D:\HeroDefense\packages\game-core\test\commands.test.ts`, `D:\HeroDefense\packages\game-core\test\combat.test.ts`, `D:\HeroDefense\packages\game-core\test\fixtures.ts` | Kill không tài nguyên, wave trả đều một lần, dungeon reward, starting economy/progression. |
| Sửa nếu có regression | `D:\HeroDefense\apps\server\test\network.test.ts`, `D:\HeroDefense\apps\client\test\game-session.test.ts` | Real networking/session. |
| Tạo khi thực thi QA | `D:\HeroDefense\plans\261013-0010-rts-controls-converging-lanes\reports\playability-qa.md`, `D:\HeroDefense\plans\261013-0010-rts-controls-converging-lanes\reports\performance-qa.md` | Kịch bản, measurements, screenshot paths, limitations. |
| Đọc; chỉ sửa nếu public gate được kích hoạt | `D:\HeroDefense\deploy\README.md`, `D:\HeroDefense\plans\261012-1846-thien-dao-web-coop\phase-05-parity-release.md` | Host/domain/TLS/WSS/Docker/rollback còn mở. |

Không xóa file; asset/model/animation/âm thanh nâng cấp không phải điều kiện bắt buộc trong yêu cầu hiện tại.

## Bước thực hiện

1. Ghi chính sách đã chốt vào spec triển khai: quyền quân riêng, N người/N làn, không tài nguyên per-kill, wave thưởng đều và hoàn thành phụ bản vẫn thưởng đều cho cả đội. Lập bảng seed/số người/độ khó/chiến thuật. Không dùng tiền fixture của progression test làm số liệu cân bằng.
2. Viết regression trước rồi bỏ `gold += enemy.reward`, xác suất `souls++` khi kill và metadata reward không còn dùng. Kiểm cả quái chính, boss wave, boss phụ bản; giữ thống kê kill/damage và death VFX. Xác nhận wave thưởng bằng nhau và đúng một lần cho từng thành viên, kể cả người mất kết nối tạm thời.
3. Chơi các trận từ đầu, đo tiến triển sau từng wave và difficulty pacing. Nếu công thức wave hiện tại không đủ để triệu hồi/nâng cấp, điều chỉnh mức wave bằng dữ liệu, vẫn thưởng đều mỗi người; chạy lại kiểm tra kinh tế từ đầu.
4. Sửa owner markings, group/primary/order/target feedback, lệnh invalid và camera focus cần thiết. Kiểm đầy đủ input phase 1 sau mỗi thay đổi HUD.
5. Đo CPU/GPU/render frame time/server tick/snapshot ở tải tự nhiên và stress riêng; ghi hardware/browser/build/số entities/speed/duration. Tối ưu nơi có profile: reuse ring/material/mesh, giới hạn VFX/log và DOM updates, không thêm worker/pooling framework khi chưa cần.
6. Chạy browser 1/2/3/4 client và capture hai kích thước; kiểm main/dungeon/reconnect/results. Full match cần thời gian quan sát thật, không kết thúc ở wave 15 rồi gọi toàn trận.
7. Test mục tiêu theo code sửa, full typecheck/test/build; security review batch ownership/bounds/dedup/version và review gameplay/docs. Nếu source contract thay đổi, phối hợp version/drain đồng bộ client/server.
8. Lập báo cáo pass/fail/chưa đo, link ảnh và log đã redact; giữ gate chưa có chứng cứ unchecked. Đóng nghiệm thu local/LAN khi đạt; xử lý public gate bên dưới nếu được chọn.

## Gate Internet riêng, tùy chọn

Kế hoạch cũ vẫn chịu trách nhiệm ba việc: build/chạy Docker image thật; provision host/domain và HTTPS/WSS từ mạng ngoài; rehearsal blue/green drain/reconnect/rollback, công bố capacity host từ đo thật. Config có sẵn chưa chứng minh các bước này.

Chỉ kích hoạt khi người dùng chọn public release và có host/domain. Không tự mua/provision hay mở server ra Internet. Public pass không được suy từ localhost/LAN. Việc kế hoạch này hoàn tất chỉ gỡ dependency về gameplay/UX; ba checkbox public cũ vẫn mở tới khi có chứng cứ riêng.

## Kiểm tra

Từ `D:\HeroDefense`: chạy file Vitest gần change trước, rồi `npm run test:core`, `npm run test:server`, `npx vitest run apps/client/test`, `npm run typecheck`, `npm test`, `npm run build`. Sau build kiểm tra local production `npm start` và health/API/WebSocket cùng artifact; kiểm tra port/process trước khi chạy, reuse process đúng dự án và dừng process do phiên tạo khi QA kết thúc.

## Điều kiện hoàn tất

- [x] Quyền quân riêng, N người/N làn và không tài nguyên per-kill được giữ đúng trên server, client, tests, docs.
- [x] Kill quái thường/boss không có thưởng per-kill; wave trả cùng mức cho mọi người đúng một lần; thắng phụ bản phát khoản thưởng hoàn thành hiện có đều cho cả đội đúng một lần.
- [ ] Full matches browser 1/2/3/4 người từ kinh tế đầu có chứng cứ, có số liệu tiến trình/thắng thua; kết luận cân bằng nêu seed/chiến thuật/giới hạn.
- [x] Progression mọi độ khó và phụ bản còn pass; không dùng mature-roster fixture chứng nhận cân bằng.
- [ ] HUD/owner/group/order đọc rõ, không overlap ở 1366×768 và 1920×1080; screenshots lưu và link trong báo cáo QA.
- [ ] FPS/frame time/tick/snapshot đo thực có cấu hình và tải; so sánh mục tiêu đề xuất, ghi hạn chế nếu chưa đạt.
- [x] Test/typecheck/build/local production pass; regression input/session/security review không còn blocker; docs đúng source.
- [x] Báo cáo local/LAN tách riêng public pending; không đánh dấu Docker/TLS/WSS/rollback đã hoàn tất khi chưa chạy.

## Rủi ro và rollback

- Thắng full match cần chiến thuật đặc biệt không được chỉ dẫn: ghi đường chơi thật, điều chỉnh hướng dẫn/pacing dựa số đo; nếu đụng policy kinh tế xin quyết định trước. Không cấp tài nguyên bí mật để pass.
- Bỏ tài nguyên per-kill khiến cả đội thiếu tiến triển: đo khả năng triệu hồi/nâng cấp theo wave và chỉnh mức thưởng wave đều cho mọi người; không thêm thưởng kill trở lại để làm test pass.
- Máy kiểm thử đạt FPS nhưng chưa có minimum spec: báo máy đã đo, không chứng nhận mọi máy; cần thêm máy mục tiêu trước claim rộng.
- 4×/merge tạo tick backlog: profile và sửa bottleneck; nếu vượt effort ước lượng, cập nhật rủi ro/ước lượng, không bỏ test hoặc giảm phạm vi được yêu cầu.
- Rollback từng thay đổi UI/balance đã xác định, giữ log/báo cáo để so before/after; rollback release có contract đồng bộ và drain phòng RAM. Public rehearsal/rollback giữ theo runbook cũ, không diễn tập production tự ý.
