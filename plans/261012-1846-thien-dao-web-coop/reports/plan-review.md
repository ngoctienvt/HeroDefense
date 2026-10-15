# Rà soát và xác minh kế hoạch

Ngày: 2026-10-12. Phạm vi: kế hoạch tổng, đủ 5 phase, khảo sát map và clip, nghiên cứu kiến trúc. Đây là review tài liệu; chưa có game để build/test.

## Kết quả

Ba vai trò độc lập: Security Adversary, Assumption Destroyer, Failure Mode Analyst. Hai finding medium độc lập được tiếp nhận; các finding deploy trùng nhau đã gộp. Không có finding critical/high. Không thay đổi lựa chọn phạm vi của người dùng.

| Finding | Chứng cứ trước sửa | Cập nhật |
|---|---|---|
| Quota command chưa chặn cấp phát room/seat trước gameplay | `phase-02-core-coop-slice.md:22` và `:32`; guest session + một host có thể bị create/join/reconnect flood | Phase 2/5 thêm quota trước cấp phát, host caps, timeout/cleanup cho lobby/reservation/handshake và test trận đang chạy |
| Drain/version handshake/reload thiếu hợp đồng giữ room/release cũ | `phase-05-parity-release.md:31`, `phase-02-core-coop-slice.md:32`, `phase-04-desktop-client-recovery.md:59` trước sửa | Phase 2/4/5 giữ room-owner routing và bundle/assets theo version; hai process overlap có budget, rollback không giết room; test V1 → V2 → refresh/reconnect/rollback |

Nguồn hợp đồng framework: [WebSocket transport](https://docs.colyseus.io/server/transport/ws), [room/process scalability](https://docs.colyseus.io/scalability). Reviewer failure đã đọc lại bản sửa và xác nhận hai tình huống được xử lý; reviewer nguồn không tìm thấy sai lệch count/scope high/medium.

## Whole-Plan Consistency Sweep

- Đã đọc lại `plan.md` và cả năm `phase-*.md`, kiểm tra source/version, room lifecycle, quota, deploy, oracle và chuỗi phụ thuộc.
- Decision deltas: quota trước cấp phát; routing room-owner/release; giữ client/assets cũ; overlap deployment/rollback. Đồng bộ overview, phases 2/4/5 và research.
- Loại bỏ các draft sai “mở thêm 60 wave”: nguồn gán **tổng** 45/60. Phân biệt 70 định nghĩa với 70 Warcraft hero, 7 mục trợ giúp với gameplay quest, H/N lưu vị trí RAM với save qua phiên.
- Chuỗi phụ thuộc 1 → 2 → 3 → 4 → 5; không cycle. Không còn stub hoặc liên kết Markdown tương đối bị hỏng trong plan/phase.
- Unresolved contradictions: **0**. Runtime oracle, native defaults, catalog equipment/ability/wave còn thiếu là gate đã công khai, không phải phần được coi đã hoàn tất.

## Kiểm tra đã chạy

- `ak plan validate`: valid, không lỗi cấu trúc.
- `ak plan parse`: nhận đủ 5 phase, toàn bộ checklist triển khai còn pending.
- 17/17 entry trong `archive-manifest.json` khớp SHA256 file đã trích xuất; roster JSON có 70 entry.
- SHA256 map gốc sau khảo sát vẫn `ddc4be147dc7afd262be6193b94f1f06f786e7222c4ea7dd444feeda63f9a8e8`.
- Khắc phục lỗi encoding của lệnh kiểm tra Python trên Windows bằng UTF-8; kiểm tra tài liệu chạy lại thành công. Chưa chạy hoặc tuyên bố pass test gameplay/performance.

## Giới hạn công cụ và bàn giao

- CLI scaffold thành công; index AgentKit ngoài workspace báo access denied. File kế hoạch vẫn là nguồn chính; chưa có Git worktree để pin active-plan pointer.
- Không có task tracker phiên riêng. Không khởi động server/watcher; tab video do agent mở đã đóng.
- `ak journal create` không tạo được journal cục bộ, trả exit 1 không có diagnostic; không sửa cấu hình toàn cục hoặc ghi journal thay bằng tay. Báo cáo này giữ lịch sử xác minh liên quan tới kế hoạch.
- Sẵn sàng bắt đầu khảo sát/catalog phase 1; chưa chốt ngày phát hành hoặc nghiệm thu full fidelity khi thiếu reference runtime 2.1.
