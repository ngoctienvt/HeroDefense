---
title: "Phase 3: Ảnh bậc 4"
status: pending
---

# Phase 3: Ảnh bậc 4 — 13 tướng

## Tổng quan

Hoàn tất mọi job trong [asset-tier4.md](asset-tier4.md). Các job Tôn Ngộ Không và Kim Thân La Hán đã làm ở pilot được giữ, không tạo lại.

## Yêu cầu

- Phụ thuộc pha 1. Không phụ thuộc pha 2 về ảnh; vẫn chạy tuần tự từng job, không chạy hai phiên tạo ảnh cùng lúc.
- Roster: Tôn Ngộ Không h00R, Đường Tăng h00S, Lôi Chấn Tử h00T, Dương Tiễn h00U, Na Tra h00V, Lý Tịnh h00W, Đát Kỷ h00X, Ngũ Đạo Tướng Quân h00Y, Ứng Long h00Z, Xích Tùng Tử h010, Tịnh Đàn Sứ Giả h03T, Kim Thân La Hán h03U, Bát Bộ Thiên Long h03V.
- Trước khi làm một tướng, mở đúng `case` trong `tier4-combat.ts` (và `attack-geometry.ts` với h00U/h00V/h010) và so với báo cáo chứng cứ.

## Các bước

1. Quy trình như [pha 2](phase-02-tier3-art.md) bước 1–2 và 4.
2. Điểm cần chú ý:
   - Đường Tăng: vòng kim cô mảnh siết, khác vòng Càn Khôn dày của Na Tra; đặt hai bộ cạnh nhau khi QA.
   - Lôi Chấn Tử: sét vàng–tím nhánh lông vũ, khác thần lôi trắng ngọc của Khương Tử Nha h019.
   - Dương Tiễn: chùm tia có lõi vàng đặc, không thành mảng trắng.
   - Na Tra: `three-heads-six-arms-sheet` vẽ sau actor, không che mặt; số tay là mô-típ.
   - Lý Tịnh: tháp là one-shot, không có vùng tháp 4,5s.
   - Đát Kỷ: không tạo dấu mê hoặc riêng.
   - Ngũ Đạo: bánh xe sống theo `soulLink`, xung dọc xích chỉ theo hit event thật.
   - Ứng Long: không đóng băng; không dùng lồng băng.
   - Tịnh Đàn: `golden-lotus-whirl-ground` có điểm gom lệch về phía trước; ghi hướng trong metadata.
   - Bát Bộ Thiên Long: một ảnh rồng, runtime nhân ba; cột sáng chỉ là va chạm, không trói.
3. Cập nhật ledger, metadata và báo cáo tiến độ như pha 2.

## Việc cần làm

- [ ] 67 job có `raw-ready` hoặc `BLOCKED_ART` có lý do.
- [ ] Contact sheet từng tướng và so cặp nhận diện, gồm cả so với bậc 5–6 (Đấu Chiến, Lục Nhĩ, Kim Thiền, Khương Tử Nha).

## Tiêu chí thành công

- [ ] Toàn bộ job bậc 4 đạt `raw-ready`; nếu còn `BLOCKED_ART` thì pha chưa hoàn tất.
- [ ] Số file/job khớp inventory; pilot không bị tính hai lần.

## Rủi ro

Các lớp bao người (aura Dương Tiễn, pháp thân Na Tra, chuông La Hán, thân vàng, sóng âm Tịnh Đàn) dễ che actor. Giữ một layer sau actor, giữa thân thoáng; nếu không đạt sau hai lượt thì ghi blocker, không tự thêm lớp trước.
