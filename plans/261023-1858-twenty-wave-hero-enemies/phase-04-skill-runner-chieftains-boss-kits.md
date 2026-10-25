---
phase: 4
title: Bộ chạy kỹ năng chung + đầu lĩnh + kit boss
status: pending
effort: 9h
depends: [1, 2]
---

# Phase 4 — Bộ chạy kỹ năng chung, đầu lĩnh, kit boss

## Mục tiêu
Một bộ chạy kỹ năng tất định trên server cho cả đầu lĩnh và boss: hồi chiêu → báo trước (event `cast`) → va chạm (event `ability`) → trạng thái kéo dài. Chuyển Hắc Phong Hùng Vương sang kit, xóa nhánh `b001` trong `combat.ts`.

## File
- Tạo: `packages/game-core/src/enemy-skill-runner.ts`, `enemy-skill-templates.ts`, `boss-kits/hac-phong.ts`, `boss-kits/nguu-ma-thiet-phien.ts`, `boss-kits/hinh-thien.ts`, `boss-kits/chuc-dung-cong-cong.ts`, `boss-kits/index.ts`.
- Sửa: `combat.ts` (thay khối `b001` ở ~1102–1140 bằng `enemySkillStep(ctx, enemy, dt)`), `enemy-behavior.ts` (nhận debuff tốc chạy/tốc đánh lên tướng nếu chưa có; boss đứng yên khi đang báo trước), `contracts/types.ts` (xóa trường b001 deprecated), `combat-status.ts` (trạng thái đặt lên tướng: chậm, đốt, đẩy lùi đã có — tái sử dụng).
- Test: `enemy-skill-runner.test.ts`, `boss-kits.test.ts`, cập nhật `horde-waves.test.ts`, `divine-heroes-combat.test.ts`, `khuongtu-nha-combat.test.ts`, `enemy-engagement.test.ts` (fixture b001 dùng `kit: 'hac-phong'`).

## Hợp đồng bộ chạy
- `EnemySkillDef = { id, cooldown, initialCooldown, windup, vfxSkillId, telegraph: 'circle'|'line'|'cone'|'marks'|'none', pick(ctx, enemy) → target, resolve(ctx, enemy, target) }`.
- Đồng hồ chỉ chạy khi kẻ địch ở khu giao chiến hoặc cách tướng ≤ 12 (giữ quy tắc Hùng Vương). `silence`/khống chế cứng (theo tỷ lệ bậc hiện có) hoãn kỹ năng.
- Sát thương = `% H_ref(w) × độ khó`, chốt khi sinh (`skills[].power`), đi qua giáp tướng và hàm nhận sát thương sẵn có (khiên, giảm sát thương Như Lai, miễn choáng Boss).
- Event: `cast` với `skillId`, `source`, `x/z`, `radius`, `seconds` (thời gian báo trước); `ability` với `targets`. `skillId` = `skill-<heroId>` khi dùng VFX tướng gốc, `enemy-<template>` cho mẫu chung.
- Giới hạn: tối đa 6 kỹ năng đang báo trước cùng lúc trên toàn sân (đầu lĩnh thừa chờ lượt), để VFX và người chơi đọc được.

## Mẫu đầu lĩnh (`enemy-skill-templates.ts`)
| Mẫu | Hành vi | Số | Đối phó |
|---|---|---|---|
| A blast | vòng r3 quanh tướng đông nhất, báo 1,2 giây | 30% H_ref, hồi 8 giây | bước ra |
| B charge | vạch dài 8, báo 1,0 giây, lao + đẩy 2 | 35% H_ref, hồi 9 giây | né vạch |
| C aura | r3,5 liên tục: chậm 30% hoặc đốt 1,5% H_ref/0,5 giây | — | đánh từ xa |
| D command | quái r6 +25% tốc đánh, +5 Giáp khi đầu lĩnh còn sống | — | hạ trước |
| A+ | A nổ hai lần cách 0,6 giây | 2 × 22% H_ref | bước ra hẳn |
| C+ | C bán kính 5 | — | — |

## Kit boss
- **hac-phong** (vòng 5): giữ nguyên Vạn Quân Hộ Thể (hồi 10 giây, khiên 2.000 → đổi thành `% A_ref` để giữ tương quan, +4 giáp quái làn) và Đại Địa Chấn Động (hồi 12 giây, báo 1 giây, r4, choáng 1 giây, gọi 8 Thanh Lang). Hành vi test hiện có phải giữ.
- **nguu-ma + thiet-phien** (vòng 10): Man Ngưu Xung Phong (hồi 9 giây, vạch 1,2 giây, 55% H_ref, hất), Chấn Địa (hồi 12 giây, r4, 45%, chậm); Ba Tiêu Phiến (hồi 8 giây, quạt đẩy 3, Ngưu Ma +30% tốc đánh 5 giây). Liên kết: Thiết Phiến sống → Ngưu Ma hồi 1% Máu/giây; một con chết → con kia `enraged` +25% Công.
- **hinh-thien** (vòng 15): Lốc Lửa Bất Diệt (aura r5, mỗi 0,5 giây 2,5% H_ref, không hồi chiêu; dưới 30% Máu r6,5), Bất Khuất (+8% tốc đánh mỗi 10% Máu mất), Phủ Phá Thiên (hồi 10 giây, quạt báo 1 giây, 70%).
- **chuc-dung + cong-cong** (vòng 20): Dung Nham Điểm Huyệt (hồi 7 giây, đánh dấu `min(5, 2 + số người)` tướng, báo 1,5 giây, 50%/vòng, chồng thì cộng), Hỏa Thần Giáng (hồi 16 giây, r7,5 báo 2 giây, 65%, đất cháy 5 giây); Hắc Thủy (aura r5 chậm 40% tốc chạy/tốc đánh), Thủy Thuẫn (hồi 12 giây, khiên Chúc Dung 8% Máu tối đa), Sóng Thần (hồi 14 giây, báo, đẩy tướng quanh Chúc Dung). Một con chết → con kia +30% Công, hồi chiêu −25%.

## Bước
1. Viết runner + mẫu A–D với test tất định (dùng `random(state)` sẵn có, không `Math.random`).
2. Chuyển Hùng Vương sang `hac-phong`; xóa nhánh b001 trong `combat.ts` và trường deprecated; sửa fixture test.
3. Viết 3 kit boss còn lại; liên kết cặp qua `linkId`.
4. Log `boss.skill` `{ kit, skill, targets, damage }` và `enemy.skill.deferred` khi chạm giới hạn 6.

## Test (người dùng chạy)
- Từng mẫu: báo trước đúng thời gian, tướng ra khỏi vùng trước khi nổ thì không mất máu.
- Thiết Phiến sống → Ngưu Ma hồi máu; chết → Ngưu Ma `enraged`.
- Hình Thiên aura không có hồi chiêu, tick mỗi 0,5 giây; bán kính đổi dưới 30% Máu.
- Dung Nham Điểm Huyệt chồng hai vòng lên một tướng → nhận hai lần.
- Quái thường không bao giờ phát `cast/ability`.
- Test b001 cũ vẫn đúng hành vi dưới kit mới.

## Rủi ro / rollback
`combat.ts` 1.262 dòng — chỉ thay đúng khối b001, không tái cấu trúc thêm. Rollback: revert runner + khối combat.
