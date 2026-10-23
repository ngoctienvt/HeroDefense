---
phase: 3
title: Gỡ phụ bản, cố định 20 vòng
status: pending
effort: 4h
depends: [2]
---

# Phase 3 — Gỡ phụ bản, cố định 20 vòng

## Mục tiêu
Không còn phụ bản ở bất kỳ lớp nào; mọi độ khó có `maxWaves = 20`. Dữ liệu trích xuất `catalog.json` giữ nguyên.

## File (đã grep `dungeon|DUNGEONS`)
- game-core: `dungeons.ts` (xóa), `simulation.ts` (bỏ `dungeonStep`, sao không còn tính phụ bản), `commands.ts`, `state.ts`, `battlefield-layout.ts`, `hangnga-combat.ts` (kiểm tham chiếu zone), test `combat.test.ts`, `pangu-combat.test.ts`, `zone-bounds.test.ts`.
- contracts: `types.ts` (gỡ `dungeons` khỏi GameState và lệnh `enterDungeon`; giữ `DungeonDef` nếu catalog.ts còn export).
- server: `apps/server/src/validation.ts` + test.
- client: `main.ts` (F1, panel), `panels.ts`, `battlefield.ts`, `visual-sprites.ts` (`createDungeonBossSprite`), `visual-terrain.ts`, `visual-terrain-island.ts` (đảo phụ bản), test `dungeon-boss-visuals.test.ts`, `island-layout.test.ts`.
- content: `catalog.ts` giữ `DUNGEONS` export cho provenance hoặc bỏ export; **không** sửa `catalog.json`.

## Bước
1. Thêm hằng `RUN_WAVES = 20` ở game-core (`rules.ts`); `state.ts` và lệnh đổi độ khó đặt `maxWaves = RUN_WAVES`. Giữ `difficulty.attack/health`.
2. Lệnh `enterDungeon`: gỡ khỏi contract, command router và validation server (lệnh lạ bị từ chối như lệnh không hợp lệ khác).
3. Xóa `dungeonStep`, trạng thái `dungeons`, thưởng phụ bản. Sao: thay vế phụ bản bằng vế "không để boss lọt" (`state.bossLeaks === 0`) hoặc dồn vào HP — chọn vế đơn giản nhất, ghi vào gameplay-spec.
4. Client: gỡ phím F1, nút/panel bí cảnh, đảo phụ bản và sprite boss phụ bản; zone khác 0 không còn được vẽ.
5. Cập nhật test catalog: giữ khẳng định dữ liệu trích xuất 45/60 (provenance), thêm test game-core khẳng định `maxWaves = 20`.

## Test (người dùng chạy)
- Đổi từng độ khó trong sảnh → `maxWaves = 20`.
- Server từ chối `enterDungeon`.
- Thắng sau vòng 20, tính sao không lỗi khi không có phụ bản.

## Rủi ro / rollback
Nhiều file client; làm sau phase 2 để tránh xung đột `simulation.ts`. Rollback từng file theo git.
