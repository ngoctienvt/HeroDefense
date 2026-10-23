---
phase: 6
title: Log combat.ttk, tài liệu, hướng dẫn chỉnh
status: pending
effort: 3h
depends: [2, 4]
---

# Phase 6 — Log combat.ttk, tài liệu, hướng dẫn chỉnh cân bằng

## Mục tiêu
Người dùng chơi thử rồi chỉnh độ khó bằng hai hệ số chung, dựa trên số liệu thật mỗi vòng.

## File
- Tạo: `packages/game-core/src/combat-ttk-telemetry.ts`.
- Sửa: `combat.ts` (đếm đòn thường/kỹ năng trúng theo enemy, server-only WeakMap), `simulation.ts` (`finishWave` ghi log), `docs/gameplay-spec.md` (mục Tiến trình, bỏ phụ bản, thêm 20 vòng/đầu lĩnh/boss, đánh dấu **thiết kế bản web**), `README.md` (cách chơi: 20 vòng, bỏ F1/phụ bản), tạo `docs/twenty-wave-balance.md` (bảng A_ref/H_ref/R, cách đọc log, cách chỉnh `BALANCE_SCALE`).
- Test: `packages/game-core/test/combat-ttk-telemetry.test.ts`.

## Bước
1. Ghi theo từng enemy: số đòn thường trúng, số kỹ năng trúng, thời gian sống. Khi chết, cộng vào tổng theo archetype.
2. `finishWave` log một dòng `combat.ttk` `{ wave, difficulty, players, archetypes: { id: { kills, avgBasicHits, avgSkillHits, avgLifeSec } }, bossKillSec, heroDeaths, leaked, baseHp }`. Không ghi tên người chơi/token.
3. Tài liệu: bảng 20 vòng, kit boss, mẫu đầu lĩnh, quy tắc boss chung; ghi rõ cơ chế không đến từ map.
4. Hướng dẫn chỉnh: `avgBasicHits` minion < 10 → tăng `BALANCE_SCALE.hp`; > 15 → giảm; boss chết < 40 giây → tăng `multiple` của kit.

## Test (người dùng chạy)
- Telemetry đếm đúng đòn thường/kỹ năng trên một quái giả lập; reset mỗi vòng.

## Bàn giao cho người dùng
Dừng server cũ → chạy `start-game.cmd` → `Ctrl+F5`. Chơi vòng 1–10 trên Bình Thường, gửi log `combat.ttk` để chỉnh.
