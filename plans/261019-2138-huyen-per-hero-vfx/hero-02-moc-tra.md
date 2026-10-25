---
hero: h00A Mộc Tra
status: chờ người dùng duyệt hình trong game
---

# Mộc Tra (h00A): Ngô Câu Mộc Ảnh Vũ

## Nguồn sự thật

- `content/catalog.ts` (đang chạy): `skill-h00A`, 100 Nộ. Cuồng Vũ 5 s: +75% Tốc đánh, +20% Hút máu; mỗi đòn phóng 2 kiếm khí dây leo dài 4,5, làm chậm 40% trong 1,5 s và gây độc.
- Server (`combat.ts`): windup 0,25 s (`WINDUP_SECONDS`), event `cast` tại Mộc Tra có `direction`. `ability skill-h00A` có `ability: 'cleave'` nên `x/z`/`target` là quái gần nhất, `targets = [Mộc Tra]`. Trạng thái `unit.berserk.remaining` (5,0) nằm trong snapshot.
- Kiếm khí (`attack-geometry.ts`): mỗi đòn chính (không phải đòn đúp/follow-up) khi đang Cuồng Vũ phát tối đa 2 event `attack vine-beam-h00A` (nguồn Mộc Tra → quái trong 4,5, không phải mục tiêu chính). Quái nhận `slow 40% 1,5 s` + `enemy.poison { remaining 2,0, casterId }` (có trong snapshot).
- Không trói: server chỉ làm chậm + độc, nên VFX không vẽ dây quấn/lồng.
- Đánh thường (`trait-h00A`, chém quét 150° r2,2, chém đúp 25%) **ngoài phạm vi**: vẫn do công thức bậc 2 vẽ.

## Thiết kế

Thần thoại: Ngô Câu song kiếm + mộc khí. Hình chính: **kiếm khí dây leo bện gai, mũi là lưỡi móc Ngô Câu ngọc bích viền vàng**, và bóng hai thanh móc kiếm chém chéo khi thức tỉnh. Khác các tướng Mộc khác: h006/h00F là hoa/sinh khí, h03P là hạt/nở hoa; Mộc Tra là dây gai + lưỡi móc, chuyển động quất.

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s, tại Mộc Tra) | nứt sáng + mầm gai quanh chân | flipbook `moctra-awaken` 1–4 |
| Kích hoạt | `ability skill-h00A` (tâm = Mộc Tra) | dây gai cuộn lên, bóng hai móc kiếm chém chéo X, dây quất ra, lá bung | flipbook 5–16 + spray `jade` |
| Trạng thái | snapshot `berserk.remaining` | vòng gai + hai lưỡi móc xoay dưới chân suốt Cuồng Vũ, nảy theo mỗi phát kiếm khí, tàn 0,35 s sau khi hết | decal màu `wreath` ở `GROUND_ALPHA_INDEX`, xoay theo thời gian |
| Kiếm khí | `attack vine-beam-h00A` (≤2/đòn) | dây gai mũi móc kiếm phóng từ Mộc Tra tới quái (mũi móc đi trước), thu về | dải texture màu `vine-lash` (UV lộ dần), ngang thắt lưng, dưới mọi nhân vật |
| Va chạm | cùng event | vệt móc kiếm chéo, mảnh gai + lá, giọt độc | flipbook `moctra-hit` |
| Dư âm | snapshot `enemy.poison` (caster h00A) | bào tử độc xanh vàng bốc lên khỏi quái | spray `toxin`, tối đa 1 lần/0,45 s mỗi quái; chậm vẫn do marker `slow` chung |

## File

- Mới: `assets/vfx-source/moctra/` (`prompts/`, `raw/` ảnh Codex gốc, `process-codex-art.py`, `processed/`, `awaken/` + `hit/` frame và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-moctra-{awaken,hit,vine-lash,wreath}.webp`, `apps/client/src/visual-moctra{,-timeline,-frenzy,-lash}.ts`, `apps/client/src/battlefield-moctra.ts`, `apps/client/test/moctra-vfx.test.ts`.
- Sửa: `visual-effects.ts` (đăng ký), `battlefield.ts` + `visual-actors.ts` (cờ `moctraFrenzy`/`moctraPoison` từ snapshot, marker, bỏ marker `berserk` chung cho Mộc Tra, replay), `visual-kit-spray.ts` (preset `toxin`), `visual-kit-atlases.json` (2 atlas, khóa `quality`), `tools/vfx/pack-flipbooks.ps1` (WebP lossy khi có `quality`), gỡ h00A + archetype `buff` + nhánh `vine-beam` khỏi `visual-kit-recipes-tier12.ts`/`visual-kit-recipe-skills.ts`/`visual-kit-recipe-runner.ts`/`visual-kit-recipes.test.ts`, `docs/vfx-assets.md`, `docs/vfx-kit.md`.
- Không đụng game-core/contracts/server/content.

## Kit cần bổ sung

- Kit chưa có lớp ribbon/decal **texture màu** (chỉ shader toon + mask alpha). Mộc Tra dùng plane `StandardMaterial` không chiếu sáng trong module riêng; nên đưa vào kit nếu tướng sau cần.
- Đã thêm vào kit: preset spray `toxin`, khóa manifest `quality` cho atlas tranh vẽ.

## Trạng thái

- Ảnh: Codex CLI (`codex exec -m gpt-5.6-sol`; model mặc định `gpt-6-sol` trong config không chạy với tài khoản ChatGPT; chạy song song bị 429). Bốn ảnh, mỗi ảnh tạo một lần, không phải vẽ lại.
- Chưa chạy test/typecheck/build/game (AGENTS.md). Chưa xem trong game: độ đọc của kiếm khí phẳng ngang thắt lưng ở góc camera thật, vòng gai trên nền cỏ xanh, giảm chuyển động, 4 người chơi.
- Người dùng cần duyệt nhất: (1) flipbook thức tỉnh có đè/che tướng không (depthWrite false, cột giữa để trống); (2) kiếm khí dây leo có đọc là "móc kiếm + dây gai" ở cỡ thật; (3) vòng gai xoay suốt 5 s có rối mắt khi đánh nhanh không.
- Mã chết còn lại để dọn sau: nhánh `web-h00A` trong `visual-effects.ts`, motif `vines` của h00A trong `visual-tier-skills.ts`; `battlefield.ts` ánh xạ trạng thái `poison` từ `burn` của h00A (vine dùng `poison`, không phải `burn`).
