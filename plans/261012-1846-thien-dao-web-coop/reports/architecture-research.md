# Nghiên cứu kiến trúc — Thiên Đạo web co-op

Ngày kiểm tra: 2026-10-12. Đây là khuyến nghị triển khai, chưa có prototype/performance benchmark. Nguồn gameplay: [khảo sát map 2.1](./map-inspection.md), [clip tham khảo 2.0](./video-reference.md). Chưa có reference runtime 2.1 chạy được; kế hoạch sẵn sàng cho khảo sát, chưa đủ làm baseline full-fidelity đã xác minh.

## Đề xuất

TypeScript cho core/contracts/client/server; Babylon.js cho cảnh top-down 3D thay đồ họa; HTML/CSS cho HUD; Node + Colyseus cho server authoritative phòng 2–4 người. Một server process/host khi vận hành bình thường; deploy/drain có thể overlap hai release tạm thời nếu host đủ tài nguyên. Không tự thêm database, tài khoản, Redis hoặc Kubernetes nếu gameplay và số đo chưa yêu cầu.

```text
Desktop browser: Babylon scene + HTML HUD
        | intent đã định nghĩa / snapshot + ACK
        v
Colyseus room: admission, session, ownership, rate limit, reconnect
        |
        v
Headless gameplay core: command -> scheduler/systems -> state/events
        ^
Versioned map-derived catalog + base Warcraft semantics
        |
Source provenance -> fixtures -> parity matrix -> replay/checkpoints
```

Core không import Babylon/Colyseus/DOM. Server kiểm tra quyền và luật rồi gọi core; renderer chỉ thể hiện kết quả. Lõi tái hiện đội hình 5 ô/người, combat, 27 synergy, 8 trận pháp, wave/phụ bản/boss và xếp hạng theo catalog, không dựng game single-hero thay thế. Client không có thẩm quyền đối với HP/gold/position/reward.

## So sánh lựa chọn

| Lựa chọn | Điểm mạnh / chi phí | Quyết định |
|---|---|---|
| Babylon.js + HTML HUD | Hợp cảnh 3D top-down, picking/animation; phải benchmark animated crowd | Ưu tiên, kiểm chứng tại phase 2 |
| Phaser/Pixi 2D | Phù hợp nếu chọn hình 2D/isometric; thay cách biểu đạt depth/asset | Phương án thay renderer nếu prototype 3D không đạt; không đổi core/gameplay |
| Godot/Unity web export | Có editor nhưng thêm toolchain và runtime tải; phải kiểm chứng web/network riêng | Chưa chọn vì không có dự án engine hiện hữu để tái dùng |
| Colyseus authoritative | Room/state sync/reconnect có sẵn; vẫn phải viết validation/game rules | Ưu tiên, pin phiên bản trước implementation |
| Peer host/lockstep client | Khó giữ authority/rejoin và hành vi trình duyệt nhất quán | Không dùng cho bản đầu |
| Tự chạy W3X/JASS trong browser | Parser/viewer không tương đương Warcraft runtime hoàn chỉnh | Không chọn; chỉ tái dùng công cụ offline cho nguồn |

Các so sánh là phán đoán thiết kế; lựa chọn renderer phải được xác nhận bằng prototype với workload map thật.

## Kết quả kiểm tra tài liệu chính thức

- Colyseus mô tả server-authoritative fixed timestep và input validation; tài liệu hiện tại là 0.18+, có `setFixedTimestep`. Chốt phiên bản tương thích ở implementation, không sao chép hướng dẫn lifecycle cũ. Framework sanitizer không thay kiểm tra ownership/cooldown/transaction. [Server Input & Fixed Timestep](https://docs.colyseus.io/netcode/server-input).
- Reconnect giữ seat ở server; refresh cần manual reconnect và token còn hiệu lực. Tài liệu mô tả snapshot đầy đủ sau quay lại, nhưng ứng dụng vẫn cần xử lý ACK/lệnh stale và presentation state. Đây không phải khôi phục process crash. [Reconnection](https://docs.colyseus.io/room/reconnection).
- Transport mặc định là WebSocket; room cần process đang sống. Khả năng scale phải đối chiếu topology và số đo, không giả định HTTP serverless ngắn hạn giữ active room. [WebSocket transport](https://docs.colyseus.io/server/transport/ws), [Scalability](https://docs.colyseus.io/scalability).
- Babylon regular instances chia sẻ geometry/material và có object riêng; thin instances giảm object overhead nhưng có trade-off culling, thêm/xóa. Tài liệu khuyến nghị thin instances cho nhiều vật thể tĩnh ít đổi. Vì vậy ưu tiên thin instances cho scenery, benchmark actor có animation riêng. [Instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances), [Thin Instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances).
- Babylon có bones/skeleton animation; khả năng render không bảo đảm FPS trên peak roster/creep/FX của map. [Bones and Skeletons](https://doc.babylonjs.com/features/featuresDeepDive/mesh/bonesSkeletons).
- StormLib là thư viện xử lý MPQ có thể tham khảo cho extraction; protected header vẫn cần reader bounded và kiểm chứng manifest. [StormLib](https://github.com/ladislav-zezula/StormLib).
- Viewer/parser W3X/MDX chỉ hỗ trợ khảo sát offline; dự án cảnh báo không còn được duy trì tích cực, JASS context không chạy đầy đủ map. Không dùng nó làm Warcraft runtime production. [mdx-m3-viewer](https://github.com/flowtsohg/mdx-m3-viewer).

Kiểm tra lại tài liệu [Deployment](https://docs.colyseus.io/deployment) và [Phaser](https://docs.phaser.io/) khi chốt hosting hoặc đổi renderer; so sánh trên đây không phải benchmark đã chạy.

## Hợp đồng cần khóa sớm

| Hợp đồng | Nội dung |
|---|---|
| Nguồn | Hash file, entry/rawcode/dòng script, base Warcraft version, static/runtime confidence; video 2.0 bổ sung, map 2.1 ưu tiên |
| Gameplay | Tất cả content reachable, đội hình 5 ô/người, công thức/timing/pathing/ordering; catalog chưa hoàn chỉnh không có count giả |
| Network | Version handshake theo room đích, command ID/seq, ACK/reject, ownership, deduplication; quota trước cấp phát room/seat và cho message; timeout/cleanup; không tin state client |
| Reconnect | Grace hữu hạn, đúng seat, token rotate/expire, offline/leave/expired policy và full snapshot reconciliation; policy phải chốt trước nghiệm thu |
| Determinism | Seed/lệnh/core/catalog version và checkpoint để tái hiện server web; không hứa cùng RNG với Warcraft khi chưa chứng minh |
| Deploy | Persistent WSS; join/reconnect gắn process/release đích; giữ client/assets cũ trong room/grace; admission drain và overlap tạm có capacity; rollback giữ mọi room sống; crash reporting tách khỏi reconnect |

20–30 Hz server và 60 FPS desktop chỉ là giả thuyết benchmark ban đầu. Timing granularity lấy từ map; có thể cần scheduler/substep khác. Chốt máy/browser/GPU/RTT mục tiêu và đo tick p95/p99, frame time, RAM, bandwidth, asset load, số room trên host. Workload peak phải lấy từ wave/entity/pathfinding/FX thật và 4 đội hình × 5 ô, thêm summon chỉ nếu nguồn có.

## Khoảng trống và tín hiệu phải lập lại kế hoạch

- Chưa trace đủ custom ability dispatch, virtual equipment catalog (UI có 3 nhóm, không được áp mặc định inventory 6 slot), wave composition, NPC ownership và toàn bộ asset dependency.
- Position save đã thấy là tọa độ trong hashtable RAM; không có bằng chứng cross-session persistence. Chỉ thêm storage/auth bền nếu trace sau xác nhận.
- Full runtime parity chưa có oracle. Script/SLK giúp chứng minh tĩnh, trailer 2.0 giúp flow; không cái nào thay được kiểm chứng native behavior và toàn trận 2.1.
- Nếu source/base semantics không giải quyết được trong khảo sát đầu, báo chính xác lỗ hổng và yêu cầu nguồn/oracle; không giảm scope thành game defense “tương tự”.
- Nếu render/pathing/timing không đạt peak ở phase 2, đổi adapter hoặc mô hình triển khai trước phase 3; core/catalog độc lập giảm chi phí đổi.
- Effort phase 3 = chi phí primitive chung + tổng custom handler/content theo nhóm × throughput thực đo + interaction/QA + bất định chưa resolve. Không suy ra deadline bằng 70 roster ID.

## Cổng chấp nhận

1. Phase 1: catalog/source closure và kế hoạch oracle; unknown gameplay được nêu rõ, chưa coi là baseline triển khai full fidelity khi thiếu chứng cứ quan trọng.
2. Phase 2: hai client online thật, lát cắt đội hình/ability/synergy/equipment/wave/instance và performance kiến trúc đạt target chốt.
3. Phase 3: 100% catalog reachable chuyển đủ; test static/runtime được tách, không che hàng còn chờ oracle.
4. Phase 4: trải nghiệm desktop đủ, 4 client ownership/reconnect/snapshot/reload đúng policy.
5. Phase 5: full match 2/3/4 người, toàn khó/wave/instance/rating, parity oracle, security/load/soak, WSS drain/rollback. Thiếu bất kỳ cổng nào thì không tuyên bố hoàn tất.
