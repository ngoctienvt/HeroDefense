---
title: "20 vòng với quái, đầu lĩnh và boss mượn tướng"
description: "Thay 45/60 wave bằng 20 vòng có áp lực tăng liên tục; quái/đầu lĩnh/boss dùng sprite và VFX tướng sẵn có, kỹ năng chạy qua một bộ chạy chung trên server."
status: completed
priority: P1
effort: 34h
branch: feat/hero-vfx-kit
tags: [gameplay, game-core, contracts, client, vfx, balance]
blockedBy: []
blocks: []
created: 2026-10-23
---

# 20 vòng — quái, đầu lĩnh, boss mượn tướng (Phương án A)

Nguồn quyết định: [brainstorm report](../reports/brainstorm-261023-1841-twenty-wave-hero-enemies.md).

## Đã chốt

- Mọi độ khó còn **20 vòng**; giữ hệ số HP/Công độ khó. **Bỏ phụ bản.** Kinh tế giữ nguyên.
- Quái thường chết sau 10–15 đòn thường / 2–3 kỹ năng: `HP = 12 × A_ref(w) × hệ số giáp`.
- Áp lực `R(w)` tăng đơn điệu 0,80 → 1,40; xoay đòn bẩy; ≤1 yếu tố mới mỗi vòng; nhịp trong vòng (đầu lĩnh ở 40%, đợt dồn ở 70%).
- Đầu lĩnh ×1,25 cỡ, 4× HP, kỹ năng từ mẫu A/B/C/D (+A+/C+ từ vòng 13). Boss ×1,5 cỡ ở vòng 5/10/15/20, **một boss chung ở đường giữa**, HP × `1 + 0,75 × (người − 1)`.
- Quái thường chỉ đánh thường. Mọi kỹ năng boss/đầu lĩnh do server quyết định; client chỉ vẽ.

## Phases

| # | Phase | Trạng thái | Phụ thuộc | Effort |
|---|---|---|---|---|
| 1 | [Contract, đường cân bằng, bảng 20 vòng](phase-01-contract-balance-wave-table.md) | completed | — | 6h |
| 2 | [Sinh quái theo bảng vòng + boss chung](phase-02-wave-spawning-shared-boss.md) | completed | 1 | 5h |
| 3 | [Gỡ phụ bản, cố định 20 vòng](phase-03-remove-dungeons-twenty-waves.md) | completed | 2 | 4h |
| 4 | [Bộ chạy kỹ năng chung + đầu lĩnh + kit boss](phase-04-skill-runner-chieftains-boss-kits.md) | completed | 1, 2 | 9h |
| 5 | [Client: sprite mượn tướng, báo trước, VFX](phase-05-client-hero-skinned-enemies-vfx.md) | completed | 1, 4 | 7h |
| 6 | [Log combat.ttk, tài liệu, hướng dẫn chỉnh](phase-06-ttk-telemetry-docs.md) | completed | 2, 4 | 3h |

Phase 3 và 4 có thể làm song song sau phase 2 (file khác nhau; cả hai chạm `simulation.ts` ở các hàm khác nhau, hợp nhất phase 3 trước).

## Kiến trúc

```
wave-plan.ts (20 vòng: nhóm quái, đầu lĩnh, boss, beat)
   │            balance-curve.ts (A_ref, H_ref, R, hệ số chung)
   ▼            enemy-archetypes.ts (skinHeroId, vai trò, bội số)
simulation.ts ──spawn──► Enemy { monsterId? | skinHeroId, rank: minion|elite|chieftain|boss, kit?, skills[] }
   │
combat.ts ──► enemy-skill-runner.ts ──► enemy-skill-templates.ts (A,B,C,D,A+,C+)
                                   └─► boss-kits/{hac-phong, nguu-ma-thiet-phien, hinh-thien, chuc-dung-cong-cong}.ts
   │  events: cast(telegraph) → ability(skillId skill-<heroId>|enemy-<template>) → status
   ▼
client battlefield/visual-effects ──► hero VFX registry (origin = actor enemy) + telegraph decals
```

## Tiêu chí nghiệm thu (toàn plan)

1. Mọi độ khó có đúng 20 vòng; thắng sau vòng 20; không còn phụ bản ở server, client, validation.
2. Log `combat.ttk` mỗi vòng: số đòn trung bình để hạ mỗi archetype, thời gian hạ boss, số tướng chết, lượng lọt.
3. Boss/đầu lĩnh đúng sprite tướng, cỡ ×1,5/×1,25; mỗi kỹ năng có báo trước → VFX tướng gốc → dư âm; quái thường không phát event kỹ năng.
4. Test hồi quy: R đơn điệu, ≤1 yếu tố mới mỗi vòng, HP/A_ref trong [10,15], kit tất định, contract/validation.
5. Người dùng chạy `npm run typecheck`, `npm test`, `npm run build`, `start-game.cmd` — agent không chạy.

## Rủi ro

- Adapter VFX đọc trạng thái unit (nộ, `state.units`) → trả `false` khi caster là enemy. Giảm: phase 5 kiểm từng kit, dùng hàm `replay(origin, …)` có sẵn của adapter khi cần.
- A_ref lệch tiến độ thật (kinh tế giữ nguyên, Thiên Mệnh vòng 15). Giảm: hệ số chung + log TTK.
- Sheet tướng thiếu pose hit/death → chớp + mờ/lún; người dùng nghiệm thu.

## Câu hỏi mở

- Không còn câu hỏi chặn. Hai mặc định (boss chung đường giữa; áp công thức cho vòng 1–4) đã ghi; người dùng đổi được trước khi làm phase 2.
