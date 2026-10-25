---
title: Vòng không giới hạn giờ và reset chiến đấu
status: in-progress
priority: P2
effort: medium
branch: feat/ui-ux-overhaul
tags: [gameplay, waves, combat]
created: 2026-10-25
---

# Vòng không giới hạn giờ và reset chiến đấu

Trạng thái: đã sửa nguồn, thêm test hồi quy và review tĩnh; chờ người dùng chạy kiểm tra và nghiệm thu. Chưa chạy test/typecheck/build/game. Thư mục kế hoạch chỉ có file này, không có phase riêng cần đồng bộ.

## Kết quả và giới hạn

- Combat không hết giờ; chỉ qua vòng khi sinh đủ quái và không còn quái trên sân (giết hoặc lọt trụ).
- Mỗi tướng hồi sinh 5/6/7… giây theo lần chết trong vòng; giữ thống kê chết cả trận.
- Qua vòng, cả vòng cuối: hồi đầy tướng kể cả đang chết/dự bị, xóa hồi chiêu, đưa Nộ về 0, xóa trạng thái, chiêu chờ, vùng, đạn và quân triệu hồi. Giữ đội hình, nâng cấp, vị trí tướng sống và HP Linh Trụ.
- Client nhận mốc reset qua snapshot, xóa VFX và không phát lại event cũ. HUD bỏ đếm ngược combat.
- Không đổi thưởng, lịch sinh quái, thời gian chuẩn bị, kỹ năng hồi sinh riêng hoặc luật thua.
- Không chạy test/typecheck/build/game theo AGENTS.md; chỉ rà tĩnh, viết test để người dùng chạy.

## Các bước

- [x] Sửa simulation, reset helper và đếm chết riêng trong vòng.
- [x] Đồng bộ snapshot/client cleanup, HUD và debug.
- [x] Viết test hồi quy: quá giờ cũ, đợt sinh chưa xong, giết/lọt trụ/hỗn hợp, reset toàn trạng thái, vòng cuối/thua, hồi sinh 5/6/7 và về 5; client dọn VFX theo mốc snapshot.
- [x] Review nguồn và cập nhật [gameplay-spec](../../docs/gameplay-spec.md); bàn giao lệnh kiểm tra. Review tĩnh không phát hiện lỗi cụ thể trong phạm vi sửa.
- [ ] Người dùng chạy typecheck, test tập trung, toàn bộ test và kiểm tra bản game mới.

## Kiểm tra chưa chạy

```powershell
npm run typecheck
npm test -- packages/game-core/test/wave-reset.test.ts packages/game-core/test/combat.test.ts packages/game-core/test/wave-spawning.test.ts apps/client/test/wave-reset.test.ts
npm test
```

Sau đó dừng server cũ → chạy lại `start-game.cmd` để build → trình duyệt `Ctrl+F5`. Kiểm tra vòng thường/boss qua thời hạn cũ vẫn tiếp tục, chết lặp lại 5/6/7 giây riêng từng tướng, qua vòng hồi tướng/xóa hiệu ứng nhưng không hồi trụ; thắng cuối có reset, thua không reset. Chưa có kết quả thực thi; không khẳng định test pass hoặc phiên game đang mở đã cập nhật.

Báo cáo: [pm-261025-0937-wave-reset](../reports/pm-261025-0937-wave-reset.md).
