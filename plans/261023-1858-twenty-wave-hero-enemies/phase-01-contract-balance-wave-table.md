---
phase: 1
title: Contract, đường cân bằng, bảng 20 vòng
status: pending
effort: 6h
depends: []
---

# Phase 1 — Contract, đường cân bằng, bảng 20 vòng

## Mục tiêu
Có dữ liệu thuần (không Babylon, không side effect) mô tả đủ 20 vòng, archetype quái và đường A_ref/H_ref/R, cùng contract Enemy tổng quát thay cho các trường riêng của `b001`.

## Bối cảnh
- `packages/game-core/src/horde-waves.ts` chỉ có 5 vòng; từ vòng 6 dùng công thức Ma Binh trong `simulation.ts`.
- `Enemy` (`packages/contracts/src/types.ts:228`) có `monsterId` cố định và `skillCooldown/quakeCooldown/shield/shieldWarning/quakeWarning` cho b001.
- Chỉ số tướng thật: Linh ~50 Công, Huyền ~100, bậc 5 ~600–800, bậc 6 ~1.000–1.280 (file `content/*-design.ts`). Hệ số bậc `2,4^(rank-1)`, trang bị +22% Công/+25% Máu mỗi cấp (`stats.ts`).

## File
- Sửa: `packages/contracts/src/types.ts`
- Tạo: `packages/game-core/src/balance-curve.ts`, `packages/game-core/src/enemy-archetypes.ts`, `packages/game-core/src/wave-plan.ts`
- Xóa sau phase 2: `packages/game-core/src/horde-waves.ts` (nội dung vòng 1–5 chuyển vào `wave-plan.ts`)
- Test: `packages/game-core/test/wave-plan.test.ts`, `packages/game-core/test/balance-curve.test.ts`

## Bước
1. **Đối chiếu chỉ số bậc 3–4** trong các file thiết kế (`content/tier3*`, `tier4*` hoặc `catalog.ts` overrides) trước khi chốt A_ref vòng 11–14. Ghi bảng kết quả vào comment đầu `balance-curve.ts`.
2. **Contract** (`types.ts`):
   - `Enemy.skinHeroId?: string` — sprite tướng mượn (loại trừ với `monsterId`).
   - `Enemy.rank?: 'minion' | 'elite' | 'chieftain' | 'boss'` (vắng = minion, giữ tương thích).
   - `Enemy.kit?: EnemyKitId` và `Enemy.skills?: EnemySkillState[]` với `EnemySkillState = { id: string; cooldown: number; windup?: number; target?: Vec; targets?: string[] }`.
   - `Enemy.linkId?: string` (cặp boss), `Enemy.enraged?: boolean`.
   - Giữ `shield`. Đánh dấu `skillCooldown/quakeCooldown/shieldWarning/quakeWarning` deprecated; xóa ở phase 4 khi kit `hac-phong` thay thế.
   - `EnemyKitId = 'hac-phong' | 'nguu-ma' | 'thiet-phien' | 'hinh-thien' | 'chuc-dung' | 'cong-cong'`; `EnemySkillTemplate = 'blast' | 'charge' | 'aura' | 'command' | 'blast-plus' | 'aura-plus'`.
3. **`balance-curve.ts`**: bảng `A_REF[1..20]`, `H_REF[1..20]`, `PRESSURE[1..20]` (0,80 → 1,40) và `BALANCE_SCALE = { hp: 1, attack: 1 }`. Hàm thuần:
   - `minionHp(w, armor)` = `12 × A_ref × (1 + armor×5/100) × scale.hp` (bù đúng công thức giáp `100/(100+giáp×5)`).
   - `enemyAttack(w, share)` = `share × H_ref × scale.attack`.
   - `bossHp(w, multiple, players)` = `multiple × A_ref × (1 + .75 × (players − 1))`.
4. **`enemy-archetypes.ts`**: mỗi archetype `{ id, skinHeroId | monsterId, role: 'melee'|'ranged', rank, hpMultiple, attackShare, armor, speed, range, interval, leak, scale }`. Minion melee 1× HP/3,5% H_ref; ranged 0,7×/3%; elite 3×/7%; chieftain 4×/6% + `template`; boss theo kit. Danh sách skin lấy từ bảng vòng trong brainstorm (h004, h005, h003, h001, h00E, h008, h00H, h00I, h00A, h00C, h00O, h00L, h00Q, h009, h00W, h00U, h00V, h03U, h03V, h016, h017, h03Y, h012, boss h00P/h00B/h011/h01H/h01G). Không dùng h01B (pipeline riêng).
5. **`wave-plan.ts`**: `WAVE_PLAN: readonly WaveDef[]` 20 phần tử; `WaveDef = { name, duration, focus, newElement, rowInterval, rowSize, groups: { archetype, count, beat: 'open'|'chieftain'|'surge' }[], boss?: { kits: EnemyKitId[], beat: number } }`. Vòng thường 75 giây, vòng boss 120 giây. Beat `chieftain` ra ở 40% thời lượng, `surge` ở 70%, boss ở 30%. Chuyển nguyên vòng 1–5 (giữ tên, monsterId) nhưng HP theo công thức mới.
6. Hàm `wavePressure(def)` tính áp lực ước lượng (tổng HP hiệu dụng / thời lượng + trọng số đầu lĩnh/boss) để test so với `PRESSURE`.

## Test (người dùng chạy)
- 20 vòng; boss ở 5/10/15/20 và chỉ ở đó.
- `PRESSURE` tăng nghiêm ngặt; `wavePressure` không giảm giữa hai vòng liền nhau (kể cả 5→6, 10→11, 15→16).
- Mỗi vòng có `newElement` khác vòng trước và tối đa một; `focus` của hai vòng liền nhau khác nhau.
- Với mọi archetype minion: `minionHp / (A_ref × hệ số giảm giáp)` ∈ [10, 15].
- Mọi `skinHeroId` tồn tại trong `HERO_BY_ID` và có `hero-stylized-<id>.json` (test client phase 5).

## Thành công
Dữ liệu biên dịch dưới `strict`, chưa đổi hành vi trận (phase 2 mới đọc bảng).

## Rủi ro / rollback
Chỉ thêm file + trường optional; rollback bằng xóa file mới.
