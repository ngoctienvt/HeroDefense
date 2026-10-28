---
phase: 06
title: "Tài liệu và bàn giao"
status: implemented-unverified
effort: 2h
dependsOn: [04, 05]
---

# Phase 06 — Tài liệu và bàn giao

## Tổng quan

Cập nhật tài liệu gameplay cho cơ chế duyên phận mới và chuẩn bị danh sách kiểm tra cho người dùng. Không cân bằng số liệu.

## Yêu cầu

- `docs/gameplay-spec.md`, mục duyên phận (dòng 21):
  - Thành viên vẫn lấy từ JASS.
  - Hiệu ứng đã thay bằng cơ chế riêng do bản web phỏng theo hoặc tự thiết kế (`content/bond-design.ts`).
  - Bỏ buff phẳng; luật Duyên Tụ; không duyên phận liên phòng.
  - Bộ đếm giữ qua ghép tướng.
- `docs/content-provenance.md`: thêm một dòng về nhãn `adapted` / `original` của hiệu ứng duyên phận.
- `README.md`: chỉ sửa câu "Xếp các thành viên duyên phận để nhận buff" nếu không còn đúng.
- Đánh dấu thiết kế là đã triển khai, kèm link plan.
- Báo cáo bàn giao `plans/261028-1348-bond-redesign/reports/`:
  - Các thay đổi.
  - Lệnh và tình huống người dùng cần kiểm tra.
  - Các kiểm tra chưa chạy.
  - Ghi chú rằng số liệu chưa cân bằng theo số wave mới.

## File liên quan

**Sửa:** `docs/gameplay-spec.md`, `docs/content-provenance.md`, `README.md` (nếu cần), `plans/reports/design-261028-1330-duyen-phan-redesign.md`, `plan.md` (trạng thái).

## Kiểm tra của người dùng

1. Dừng server cũ, chạy `start-game.cmd`, rồi Ctrl+F5.
2. Chạy `npm run typecheck` và `npm test`.
3. Chơi thử các đội mẫu trong thiết kế: Đầu trận, Tây Du, Thủy Lôi, Hỏa Ngục, Thần Nữ. Xác nhận toast, bộ đếm và VFX hiện đúng, và FPS ổn khi trận đông.

## Ghi chú (2026-10-28)

Đã cập nhật `docs/gameplay-spec.md`, `docs/content-provenance.md`, `README.md` và viết [báo cáo bàn giao](reports/handoff-261028-1500-bond-redesign.md). Chưa chạy kiểm tra nào.
