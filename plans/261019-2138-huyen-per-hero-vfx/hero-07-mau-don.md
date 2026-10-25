---
hero: h00F Mẫu Đơn Tiên Tử
status: chờ người dùng duyệt hình trong game
---

# Mẫu Đơn Tiên Tử (h00F): Bách Hoa Hồi Xuân Khúc

## Nguồn sự thật

- `content/catalog.ts`: `skill-h00F`, hồi chiêu 10 s. Hồi 220% ATK + 6% Máu tối đa của người nhận cho tối đa 4 đồng minh trong bán kính 8, xóa 1 debuff, buff +35% Tốc đánh và +15% Công kích 4,5 s.
- Server (`combat.ts`): windup (`WINDUP_HEROES` có h00F) → event `cast` tại Mẫu Đơn; `ability skill-h00F` có `ability: 'heal'`, `x/z` = vị trí Mẫu Đơn, `targets` = các đồng minh nhận (tối đa 4, có thể gồm cả bà). Buff là `unit.haste { remaining 4.5, amount .35, attackBonus .15 }` trong snapshot; `attackBonus .15` chỉ h00F đặt (`hasteAllyMax`), nội tại +12% có `amount .12` nên không bị nhầm.
- `battlefield.ts` gọi `effects.show(event, tâm, nguồn, vị trí các đồng minh nhận)` nên module nhận đủ `extra.targets`.
- Thiếu event để trình bày: "xóa 1 debuff" không có event riêng, VFX không vẽ phần này.
- Đòn thường `trait-h00F` (đạn hoa) và marker khác **ngoài phạm vi**: module chuyển tiếp cho painter công thức cũ (`fallback`).

## Thiết kế

Hình chính: **một đóa mẫu đơn khổng lồ nở quanh Mẫu Đơn, cánh hoa san hô/kem, ruy băng ngọc bích**; dải cánh hoa đầu mẫu đơn bay tới từng đồng minh và nở thành mẫu đơn nhỏ hồi máu; buff tốc đánh là vòng cánh hoa xoay dưới chân. Khác Mộc Tra (dây gai + móc kiếm) và các tướng Mộc khác (h03P hạt/hoa ăn thịt).

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại Mẫu Đơn | vòng ký tự cánh hoa + nụ mọc quanh chân | flipbook `mandon-bloom` khung 1–4 |
| Kích hoạt | `ability` (tâm = Mẫu Đơn) | mẫu đơn nở, cánh hoa xoáy ra, ruy băng | flipbook khung 5–16 + spray `petal`; sóng cánh hoa mặt đất lan tới bán kính 8 (decal `petal-ring`) |
| Di chuyển | cùng event, mỗi đồng minh trong `targets` | dải ruy băng + cánh hoa, mũi là mẫu đơn nở, mọc 0,2 s, so le 0,07 s | dải texture màu `petal-ribbon` (UV lộ dần), ngang thắt lưng, dưới mọi nhân vật |
| Va chạm | khi mũi dải tới | mẫu đơn nhỏ nở dưới chân, cánh hoa và ánh xanh bay lên | flipbook `mandon-heal` (8 khung) |
| Dư âm | snapshot `haste` (+35% / attackBonus .15) | vòng cánh hoa xoay dưới chân suốt 4,5 s, tàn 0,35 s khi hết, cánh hoa trôi lên | decal `petal-ring` ở `GROUND_ALPHA_INDEX + 2`; bỏ marker `haste` chung cho đồng minh này |

## File

- Mới: `assets/vfx-source/mandon/` (`make-prompts.py`, `prompts/`, `raw/` ảnh Codex gốc, `generate-all.sh`, `process-codex-art.py`, `processed/`, `bloom/` + `heal/` frame và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-mandon-{bloom,heal,petal-ribbon,petal-ring}.webp`, `apps/client/src/visual-mandon{,-timeline,-bloom,-streams,-rings}.ts`, `apps/client/src/battlefield-mandon.ts`, `apps/client/test/mandon-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký + truyền recipe h00F làm `fallback`), `battlefield.ts` + `visual-actors.ts` (cờ `mandonHaste`, marker, clear, replay), `visual-kit-spray.ts` (preset `petal`), `visual-kit-atlases.json` (2 atlas), `docs/vfx-assets.md`.
- Không đụng game-core/contracts/server/content. Dòng h00F trong `TIER12_RECIPES` giữ nguyên vì còn vẽ đòn thường.

## Kit cần bổ sung

- Lớp ribbon/decal texture màu vẫn thiếu (Mẫu Đơn lại tự dựng plane `StandardMaterial`, giống Mộc Tra và Cự Linh): nên đưa vào kit khi gom.
- Registry chỉ cho một module mỗi hero id: muốn ghi đè một skill mà vẫn giữ painter cũ cho đòn thường phải truyền `fallback` thủ công.
- `tools/vfx/codex-image.sh` lấy ảnh "mới nhất" trong `~/.codex/generated_images`, nên khi nhiều phiên tạo ảnh cùng lúc có thể chép nhầm ảnh phiên khác (xảy ra 2 lần ở đây). Cách chữa tạm: đường dẫn ảnh thật nằm trong `$TMPDIR/codex-image-<tên>.log`; luôn xem ảnh trước khi dùng.

## Trạng thái

- Chưa chạy test/typecheck/game (AGENTS.md). Chưa xem trong game: độ che nhân vật của đóa nở (cột giữa để trống, `depthWrite: false`), dải ngang thắt lưng ở góc camera thật, vòng cánh hoa trên nền cỏ, giảm chuyển động, 4 người chơi.
- Người dùng cần duyệt nhất: (1) đóa mẫu đơn có đọc là mẫu đơn và không đè/che tướng; (2) dải cánh hoa tới đúng 4 đồng minh; (3) vòng cánh hoa 4,5 s có rối mắt khi đông đồng minh không.
