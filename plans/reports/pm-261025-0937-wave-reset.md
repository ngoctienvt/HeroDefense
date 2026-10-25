# Wave reset — bàn giao 2026-10-25

Status: DONE_WITH_CONCERNS

Summary: Đã sửa nguồn và test hồi quy, review tĩnh hoàn tất. Đã đồng bộ gameplay-spec và checklist kế hoạch; kế hoạch giữ `in-progress` vì chờ kiểm tra thực thi từ người dùng.

- Combat không hết giờ; sinh đủ quái và xử lý hết quái bằng giết/lọt trụ mới qua vòng.
- Hồi sinh 5/6/7… giây riêng từng tướng trong vòng; giữ tổng lần chết.
- Qua vòng/cả thắng cuối hồi đầy tướng, reset kỹ năng/Nộ/trạng thái và dọn đạn/vùng/triệu hồi; giữ trụ, đội hình, nâng cấp và vị trí tướng sống. Thua không reset.
- Client dùng `combatResetEventId`; log `wave-combat-reset` / `visual.wave-reset` hỗ trợ truy lỗi.
- Nhịp/thứ tự sinh quái, thưởng và chuẩn bị 35/25 giây giữ nguyên.

Concerns: Chưa chạy test, typecheck, build, server, browser hoặc game; chưa nghiệm thu hình ảnh. Review tĩnh không thay thế kiểm tra thực thi.

Người dùng chạy:

```powershell
npm run typecheck
npm test -- packages/game-core/test/wave-reset.test.ts packages/game-core/test/combat.test.ts packages/game-core/test/wave-spawning.test.ts apps/client/test/wave-reset.test.ts
npm test
```

Dừng server cũ → chạy lại `start-game.cmd` để build → `Ctrl+F5`. Thử vòng thường/boss quá hạn cũ, hồi sinh nhiều lần, qua vòng bằng giết/lọt trụ/hỗn hợp, reset hero/VFX, HP trụ giữ nguyên, thắng cuối và thua.

Câu hỏi chưa giải quyết: không có; chờ kết quả kiểm tra của người dùng.
