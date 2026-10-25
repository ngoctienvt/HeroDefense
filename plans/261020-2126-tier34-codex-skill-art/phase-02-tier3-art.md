---
title: "Phase 2: Ảnh bậc 3"
status: pending
---

# Phase 2: Ảnh bậc 3 — 11 tướng

## Tổng quan

Hoàn tất mọi job trong [asset-tier3.md](asset-tier3.md). Các job Long Vương đã làm ở pilot được giữ, không tạo lại.

## Yêu cầu

- Phụ thuộc pha 1: generator, ledger và kết luận pilot.
- Roster: Trư Bát Giới h00J, Sa Ngộ Tịnh h00K, Tiểu Bạch Long h00L, Tinh Vệ h00M, Chung Quỳ h00N, Phán Quan h00O, Ngưu Ma Vương h00P, Long Vương h00Q, Trầm Hương h03Q, Khổng Tước h03R, Triệu Công Minh h03S.
- Trước khi làm một tướng, mở đúng `case` của tướng đó trong `tier3-combat.ts` và so với báo cáo chứng cứ.

## Các bước

1. Đọc ledger, lọc job đã `raw-ready`. Làm theo thứ tự trong inventory, từng job một.
2. Với từng tướng:
   - đọc mục inventory, master sprite và mã combat;
   - tạo lần lượt các job;
   - dựng contact sheet của cả bộ tướng trên nền sáng/tối;
   - đặt cạnh tướng trong cột "Khác với" để bắt lỗi trùng hình chính.
3. Điểm cần chú ý:
   - Bát Giới: `water-shield-rupture-sheet` chỉ dùng cho event nổ khiên; không vẽ dấu khiêu khích.
   - Tinh Vệ: đá hổ phách + lông vũ + nước biển, **không** đá ngũ sắc (tránh trùng Nữ Oa).
   - Chung Quỳ: ấn vuông và phù trận, **không** bát quái (tránh trùng Phục Hy).
   - Phán Quan: `verdict-ink-arc` chém về cạnh phải ảnh để runtime xoay theo `direction`.
   - Tiểu Bạch Long: không có dây leo trói trên quái.
   - Triệu Công Minh: `fortune-coin-spin-sheet` là xoay thật qua các góc, không phải ảnh dẹt co giãn.
4. Cập nhật ledger và metadata sau mỗi job. Ghi báo cáo tiến độ sau mỗi tướng.

## Việc cần làm

- [ ] 56 job có `raw-ready` hoặc `BLOCKED_ART` có lý do.
- [ ] Contact sheet từng tướng và so cặp nhận diện đã xem.
- [ ] Không có đòn thường/nội tại độc lập bị tạo nhầm.

## Tiêu chí thành công

- [ ] Toàn bộ job bậc 3 đạt `raw-ready`; nếu còn `BLOCKED_ART` thì pha chưa hoàn tất.
- [ ] Số file/job khớp inventory; pilot không bị tính hai lần.

## Rủi ro

Nhiều tướng bậc 3 có hình chính na ná (sen, vòng sóng, đá). Dùng cột "Khác với" khi viết prompt và khi QA. Nếu hai tướng vẫn giống nhau sau hai lượt sửa, ghi blocker nêu rõ cặp bị trùng, không tự đổi nhận diện đã ghi trong inventory.
