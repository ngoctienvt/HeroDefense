---
hero: h00C Hồng Hài Nhi
status: chờ người dùng duyệt hình trong game
---

# Hồng Hài Nhi (h00C): Tam Muội Chân Hỏa Liên Kích

## Nguồn sự thật

- `content/catalog.ts`: `skill-h00C`, `kind: 'cleave'`, `effect { target: 'enemy', shape: 'radius', radius: 4.2, status: 'burn', statusSeconds: 4, sunder: 4 }`, power 2,6 (260% ATK).
- Server (`combat.ts`): windup (`WINDUP_HEROES` có h00C) → `cast` tại Hồng Hài Nhi; vùng trúng là **mọi quái cách chính nó ≤ 4,2** (nhánh `hero.id === 'h00C'`, không theo hướng); mỗi quái trúng nhận `burn { remaining 4, dps = 150% ATK / 4 }` và `sunder` 4 s (tan chảy 4 giáp). Event `ability skill-h00C` mang `x/z` = quái mục tiêu gần nhất (không phải tâm vùng), `targets` = các quái trúng; module dùng `origin` (người đánh) làm tâm.
- Không có event riêng cho burn/sunder: cột lửa đọc snapshot `enemy.burn` + `casterId` → hero id h00C (tracker `battlefield-honghainhi.ts`, marker `h00C/burn`).
- Đòn thường `trait-h00C` (đâm xuyên 4,0) và nội tại cộng dồn tốc đánh **ngoài phạm vi**: module chuyển tiếp painter công thức cũ qua `fallback`.

## Ảnh Codex gốc (đã xem từng ảnh)

| Ảnh | Kích thước thật | Kết quả |
|---|---|---|
| `sweep-sheet.png` | 1254², lưới 4×4 (313,5 px/ô), 16 khung | đúng chủ thể (gom lửa → vòng quét → vòng lửa → tàn), dùng được. Cảnh báo: khung 6–11 vòng lửa chạm mép ô, vài ngọn bị cắt phẳng ở trên/dưới. Không có hình thương rõ, chỉ là cung lửa |
| `fire-ring.png` | 1254², một decal | đúng (nền đá nứt dung nham + ngọn lửa quanh vòng), dùng được |
| `ignite-sheet.png` | 1774×887, lưới 4×2 (443,5 px/ô) | đúng chủ thể (cột lửa hai bên, cột giữa trống, mảnh giáp cam bong ra) nhưng chân lửa sát đáy ô (~99%) thay vì 72% như prompt; khung 2–3 chạm mép. Đã bù bằng `targetZ` |

Cả ba đã có alpha thật; quầng đỏ alpha thấp quanh hình hiện thành vệt đỏ trên nền sáng nên sàn alpha đặt 0,14. Không ảnh nào phải thay bằng bản tự dựng. Nếu muốn ngọn lửa không bị cắt phẳng: nhờ Codex vẽ lại sweep/ignite với lề ≥ 6% mỗi ô.

## Bảng nhịp

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại Hồng Hài Nhi | lửa gom quanh chân | sweep khung 1–3 (ô đất), giữ khung 3 tới ability |
| Quét | `ability` (tâm = người đánh) | cung lửa quét 360° → vòng lửa tới r 4,2 → tàn | sweep khung 4–16 @20 fps (0,65 s) + spray `lava` thả tia quanh vòng |
| Va chạm | khi vòng khép (0,2 s sau ability) | vòng đất cháy nở tới r 4,2 | decal `fire-ring` (1,8 s, nguội dần), `GROUND_ALPHA_INDEX` |
| Dư âm | snapshot `burn` h00C (4 s) | cột lửa trên từng quái | flipbook `honghainhi-ignite` billboard: leo (khung 1–4), lặp (4–6), tàn (6–8); thay marker `charged` chung |

Mặt phẳng sweep 8,9 và decal 8,57 tính từ số đo (`processed/measure.json`) để mép vòng đúng bán kính 4,2.

## File

- Mới: `assets/vfx-source/honghainhi/` (`process-codex-art.py`, `prompts/`, `raw/`, `processed/`, `sweep/` + `ignite/` frame và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-honghainhi-{sweep,ignite,fire-ring}.webp`, `apps/client/src/visual-honghainhi{,-timeline,-sweep,-burn}.ts`, `apps/client/src/battlefield-honghainhi.ts`, `apps/client/test/honghainhi-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký + `fallback` recipe h00C), `battlefield.ts` + `visual-actors.ts` (cờ `honghainhiBurn`, marker, clear, replay `h00C`), `visual-kit-atlases.json` (2 atlas), `docs/vfx-assets.md`, `plan.md`.
- Không đụng game-core/contracts/server/content; không sửa `visual-kit-spray.ts` (dùng preset `lava` sẵn có). Dòng h00C trong `TIER12_RECIPES` giữ nguyên vì còn vẽ đòn thường.

## Kit cần bổ sung

- Kit chưa có lớp "flipbook ô đất" (ảnh top-down cần UV theo khung trên mặt đất): module tự dựng quad + UV, giống Mẫu Đơn/Mộc Tra tự dựng plane texture màu. Nên đưa vào kit khi gom.
- Registry một module mỗi hero id nên `fallback` truyền thủ công (như Mẫu Đơn).

## Trạng thái

- Chưa chạy test/typecheck/game (AGENTS.md). Chưa xem trong game: vòng quét sát đất ở góc camera thật, vòng 8,9 trên nền cỏ sáng/tối, cột lửa trên quái nhỏ và boss, nhiều cột lửa cùng lúc (cap 24), giảm chuyển động.
- Người dùng cần duyệt nhất: (1) vòng quét có đọc là quét thương lửa 360° và đúng phạm vi 4,2 (ảnh Codex chỉ có cung lửa, không thấy thương rõ); (2) cột lửa 4 s có rối/che quái khi đông; (3) cạnh bị cắt phẳng của vòng lửa.
