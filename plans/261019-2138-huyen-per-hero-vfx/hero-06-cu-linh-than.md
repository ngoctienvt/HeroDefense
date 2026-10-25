---
hero: h00E Cự Linh Thần
status: xong nguồn, chờ người dùng duyệt hình trong game
---

# Cự Linh Thần (h00E): Tuyên Hoa Thiết Bích Trấn

## Nguồn sự thật

- `content/catalog.ts` `skill-h00E`: 100 Nộ (nhận +12 khi đánh, +6 khi bị đánh). Khiên 200% ATK + 15% Máu tối đa người nhận, +8 Giáp, `ward` giảm 25% sát thương trong 4,5 s cho đồng minh trong 4,5.
- Server (`combat.ts` `castAbility`/`resolveAbility`): windup 0,25 s; `cast` tại Cự Linh (`x/z` của event là quái gần nhất, client dùng vị trí Cự Linh) có `direction`. `ability kind shield`: `x/z` = Cự Linh, `target` = người nhận đầu, `targets` = mọi đồng minh trong 4,5 (kể cả Cự Linh). Quái trong 3,0 quanh Cự Linh bị chậm 40% trong 1,2 s; ban đầu không có event, nay `combat.ts` phát thêm `trait quake-h00E` (`targets` = quái bị chậm, `value` 3,0; chỉ trình bày, không đổi luật). Snapshot: `unit.ward { remaining, reduction }`, `unit.shield`, `bonusArmor`.
- Đòn thường (`single`, nện búa một mục tiêu, đòn thứ 4 bùng 1,4x) ngoài phạm vi.

## Thiết kế

Thần thoại: Cự Linh Thần cầm búa khai sơn, nện búa dựng thiết bích. Hình chính: **búa ma sắt-đồng giáng xuống, tường phiến sắt-đá viền đồng trồi quanh bán kính 3,0 rồi lún; mỗi đồng minh được vòng phiến thiết bích dưới chân suốt ward**. Khác Kim Tra (chuông vàng úp lên người): Cự Linh là tường phẳng sắt-đá quanh vùng và vòng phiến dưới đất, không có vỏ che người.

Bảng nhịp, atlas, giảm chuyển động, cap, log, replay: xem mục Cự Linh Thần trong `docs/vfx-assets.md`.

## File

- Mới: `assets/vfx-source/culinh/` (`prompts/`, `raw/`, `process-codex-art.py`, `quake/` + `guard/`, `processed/`, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-culinh-{quake,guard,bulwark}.webp`, `apps/client/src/visual-culinh{,-quake,-bulwark,-timeline}.ts`, `apps/client/src/battlefield-culinh.ts`, `apps/client/test/culinh-vfx.test.ts`.
- Sửa server (theo yêu cầu thêm event): `packages/game-core/src/combat.ts` chỉ thêm một `event()` trong nhánh h00E, không đổi chỉ số hay luật.
- Sửa (tối thiểu, dùng chung): `visual-effects.ts` (đăng ký), `battlefield.ts` + `visual-actors.ts` (tracker, cờ `culinhBulwark`, marker `bulwark`, replay, clear), `visual-kit-atlases.json` (2 atlas), gỡ h00E khỏi `visual-kit-recipes-tier12.ts`, `visual-kit-recipe-skills.ts`, `visual-kit-recipes.test.ts` (bỏ test vòm khiên, test báo trước chuyển sang h00C), `docs/vfx-assets.md`.
- Không đụng contracts/content/luật chơi; `GameEvent.skillId` là chuỗi tự do nên không đổi contract.

## Kit cần bổ sung

- Decal texture màu: `visual-culinh-bulwark.ts` lại dựng plane `StandardMaterial` không chiếu sáng như Mộc Tra; đã có hai bản trùng, nên đưa vào kit (lớp decal texture).
- `codex-image.sh` lấy ảnh mới nhất trong `~/.codex/generated_images` nên chép nhầm ảnh của phiên khác khi chạy song song; cần lọc theo phiên hoặc tên file.

## Trạng thái

- Ảnh: Codex CLI `gpt-5.6-sol`, ba ảnh; sheet guard bị chép nhầm ảnh hoa mẫu đơn của phiên khác một lần (đã xóa, tạo lại). Dư âm bụi còn hơi hồng nhạt ở vài khung (đã ấm hóa về đồng).
- Chưa chạy test/typecheck/build/game (AGENTS.md). Chưa xem trong game: búa ma có nằm sau đầu tướng ở góc camera thật; tường 3,0 có che quái/đồng minh đứng sát; vòng thiết bích trên nền cỏ; giảm chuyển động; 4 người chơi.
- Cần duyệt nhất: (1) nhịp búa → tường có đủ nặng; (2) vòng thiết bích 4,5 s có rối khi nhiều đồng minh; (3) tường quanh vùng chậm 3,0 có khớp phạm vi quái bị chậm.
- Event: đã thêm `quake-h00E` cho phần chậm (test `packages/game-core/test/culinh-quake-event.test.ts`). Khiên hấp thụ/vỡ không thêm event: client đọc từ snapshot `shield` (giảm = ngân vòng, về 0 mà ward còn = vòng mờ).
- Mã chết còn lại: case h00E (cast/ability) trong `visual-tier-skills.ts` không còn chạy; case đòn thường (búa nện) vẫn dùng. Burst đòn thứ 4 (`nth-h00E`) rơi về painter chung.
