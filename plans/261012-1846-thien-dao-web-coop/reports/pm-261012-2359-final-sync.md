# PM final sync — 2026-10-12

Scope: [hợp đồng thích nghi](./implementation-contract.md), [lịch sử gate](./pm-261012-2346-scope-history.md).

| Phase | Done/total | Trạng thái |
|---|---:|---|
| 1 | 4/4 | Completed |
| 2 | 4/4 | Completed |
| 3 | 5/5 | Completed |
| 4 | 6/6 | Completed |
| 5 | 6/9 | In Progress |
| Tổng | 25/28 (CLI 89%) | In Progress |

Đã sweep cả năm phase. Checkbox/status cập nhật bằng ak plan check/reindex/update; phase 4 table phản ánh CLI-derived done. Phase frontmatter bỏ pending stale vì CLI hiện derive từ checkbox. 89% là checklist, không phải effort hoặc Warcraft fidelity.

[Browser QA](./browser-qa.md): hai tab production thật, từ 18 Đạo Duyên mỗi người triệu hồi/triển khai 5 quân, tới wave 15; refresh cả hai giữ state/ownership, host transfer, gear +1 tốn 80 gold, S/Tự chiến và Huyết Lâm boss co-op thắng. Desktop 1366×768/1920×1080 không overflow; mobile chỉ kiểm tra không tràn ngang. Screenshot được xem trong chat, không có file lưu/video. Không chứng nhận FPS hoặc WAN.

Full suite cuối controller: 161/161 (143 core, 6 content, 9 server, 3 client session adapter), typecheck/build PASS. [Review](./code-review.md): ba P2 đã sửa và regression; không còn finding chặn local/LAN. [Tester](./tester-debugger.md)/[server](../../../apps/server/server-implementation-report.md) giữ chi tiết fixture/soak và giới hạn. README có Windows launcher start-game.cmd.

Local/LAN artifact hoàn tất; plan không completed vì ba gate: Docker image build/run, public host/domain HTTPS/WSS mạng ngoài, blue/green drain/reconnect/rollback và host capacity. Không tính config deploy hoặc local drain test thành public release.

AgentKit runtime dùng D:/HeroDefense/.agentkit-runtime; không sửa global. ak plan validate PASS sau sync cuối; local plan links đều tồn tại. Docs impact chỉ state records, không chỉnh implementation.

## Journal

Đã đọc ak-journal skill. CLI create exited 1 không có diagnostic; runtime workspace không có project registry (ak projects list: 0 projects). Theo controller, lưu [journal local fallback](../../journals/2026-10-12-thien-dao-web-coop.md), đánh dấu không CLI-registered. Không sửa global config. AgentWiki publish skipped.

## Unresolved

Ba public-release gates trên. Ordinary-start balance cần playtest; browser wave 15 không chứng minh trọn chiến dịch.

