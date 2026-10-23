---
phase: 2
title: Sinh quái theo bảng vòng + boss chung
status: pending
effort: 5h
depends: [1]
---

# Phase 2 — Sinh quái theo bảng vòng + boss chung

## Mục tiêu
`simulation.ts` sinh quái hoàn toàn từ `WAVE_PLAN`, có nhịp trong vòng và boss chung ở đường giữa. Xóa công thức Ma Binh.

## File
- Sửa: `packages/game-core/src/simulation.ts`, `packages/game-core/src/crowd-movement.ts` (bán kính theo `rank`/`scale` thay vì `monsterId === 'b001'`), `packages/game-core/src/battlefield-layout.ts` (điểm sinh boss ở đầu đường giữa nếu chưa có).
- Xóa: `packages/game-core/src/horde-waves.ts`; chuyển `monsterName` sang `enemy-archetypes.ts`.
- Test: sửa `packages/game-core/test/horde-waves.test.ts` → `wave-spawning.test.ts`.

## Bước
1. `beginWave`: đọc `WAVE_PLAN[wave-1]`; `spawnBudget` = tổng count nhóm `open`; lưu `waveBeats` server-only (WeakMap hoặc trường state không broadcast) cho `chieftain`, `surge`, `boss`.
2. `spawnBatch`: sinh nhóm `open` theo hàng như hiện tại (giữ `availableSpawnPoints`, `rowSize`). Khi `elapsed trong vòng ≥ beat × duration` thì đẩy nhóm beat vào hàng đợi sinh; vẫn mỗi làn một bản cho minion/elite/chieftain.
3. **Boss chung**: sinh một lần, `owner: 'party'`, tại điểm đầu đường giữa sau điểm hội tụ, HP qua `bossHp(w, multiple, players)`. Cặp boss: sinh cạnh nhau, cùng `linkId`.
4. Factory `createEnemy(archetype, wave, owner, pos, difficulty, players)` gom việc tạo Enemy (HP, Công, giáp, `skills` khởi tạo từ template/kit) — một chỗ duy nhất, không lặp trong simulation.
5. Leak: minion 1, elite 2, chieftain 3, boss 10 (giữ mức hiện có cho boss).
6. Điều kiện kết thúc vòng: hết quái cả `open` lẫn beat đã kích hoạt; nếu hết giờ, beat chưa ra thì bỏ, quái còn lại trừ HP Linh Trụ như hiện tại.
7. Ghi log `wave.begin` / `wave.beat` (`{ wave, beat, count }`) theo kiểu `console.debug(JSON.stringify(...))` đang dùng trong game-core.

## Test (người dùng chạy)
- Vòng 6: đầu lĩnh xuất hiện ở ~40% thời lượng, đợt dồn ở ~70%.
- Vòng 10 với 1 và 4 người: đúng 2 boss (một cặp) tổng cộng, không nhân theo làn; HP tăng theo số người.
- Minion vòng w có HP = `minionHp(w)` × hệ số độ khó.
- Hết giờ trước beat: vòng vẫn kết thúc, không treo.

## Thành công
Trận chạy hết vòng theo bảng mới (người dùng xác nhận bằng `start-game.cmd`).

## Rủi ro / rollback
Boss chung dùng `owner: 'party'` như boss phụ bản cũ — kiểm các chỗ lọc `enemy.owner === player` (aggro, lane routing) để boss không bị bỏ qua. Rollback: revert `simulation.ts`.
