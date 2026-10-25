---
hero: h00B Thiết Phiến
status: chờ người dùng duyệt hình trong game
---

# Thiết Phiến (h00B): Ba Tiêu Cuồng Phong Toàn

## Nguồn sự thật

- `content/catalog.ts` (đang chạy): `skill-h00B`, hồi chiêu 9,5 s, `ability: 'cleave'`, bán kính 4,5, đẩy lùi 2,2, 230% ATK; quái đang cháy thì kích nổ thêm 150% ATK và cháy 3 s. (`hero-abilities.ts` và `tai-lieu-co-che` còn mô tả cũ "chuỗi nảy 35% chậm" — không dùng.)
- Server (`combat.ts` ~644): windup 0,25 s, event `cast` có `x/z` = mục tiêu, `direction`, `windup`. Event `ability` có `x/z` = mục tiêu, `targets` = mọi quái trúng, KHÔNG có `direction`. Vùng trúng: mục tiêu xa hơn 4,5 → hình tròn r4,5 quanh mục tiêu (hay gặp vì tầm đánh 8,5); gần hơn → nón ~151° r4,5 từ Thiết Phiến.
- Đẩy lùi (`knockEnemyBack`) đi ngược lộ trình quái, không hướng tâm → VFX không vẽ gió tỏa tâm.
- Kích nổ lửa KHÔNG có event riêng; chỉ suy ra từ snapshot: `enemy.burn` có `casterId` là h00B (chỉ kích nổ mới gây cháy cho h00B).

## Thiết kế (hình chính: bão cát cuộn từ quạt lá chuối)

| Pha | Nguồn | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` tại điểm mục tiêu | cát bốc lên thành vòng xoáy nhỏ | flipbook `thietphien-storm` khung 1–2 |
| Hành động | `ability`, tại tay Thiết Phiến | quạt lá chuối ngọc viền đồng quét mở theo hướng ném | decal `vfx-thietphien-fan-arc.webp` dưới mọi nhân vật |
| Di chuyển | cùng event | luồng gió cát, đầu dày đi trước, từ quạt xuyên qua vùng | dải `vfx-thietphien-sand-gust.webp` ngang thắt lưng, dưới nhân vật |
| Vùng | cùng event | lốc cát dạng vòng, giữa rỗng để quái nhìn rõ, đúng vùng server (tròn, hoặc nón vẽ dạng tròn lùi về phía trước) | flipbook `thietphien-storm` khung 3–16 + hạt `earth` |
| Va chạm | `targets` | bụi cát hất theo hướng ném, lần lượt từ gần ra xa (26 đv/s) | flipbook `thietphien-hit` |
| Dư âm | snapshot `burn` caster h00B | một lần lửa bùng nuôi bằng gió + cát cháy, rồi tàn lửa | flipbook `thietphien-ignite`, hạt `lava`; ngọn lửa liên tục do painter lửa chung |

## File

- Mới: `assets/vfx-source/thietphien/` (`prompts/`, `raw/` ảnh Codex gốc, `process-codex-art.py`, `codex-safe.sh` + `run-safe.sh`, `storm|hit|ignite/` khung + contact sheet, `processed/`, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-thietphien-{fan-arc,sand-gust,storm,hit,ignite}.webp`, `apps/client/src/visual-thietphien{,-timeline,-storm,-gust}.ts`, `apps/client/src/battlefield-thietphien.ts`, `apps/client/test/thietphien-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký, nhận recipe h00B làm `fallback` cho đòn thường), `battlefield.ts` (tracker, replay `__vfxReplay('h00B'[, 'near'])`, marker `ignite`/`ember`, clear), `visual-actors.ts` (cờ `thietphienEmber`), `visual-kit-atlases.json` (3 atlas), `docs/vfx-assets.md`.
- Công thức recipe h00B giữ nguyên cho đòn thường/`web-h00B`; chỉ `skill-h00B` do module riêng.
- Không đụng game-core/contracts/content/server.

## Trạng thái

- Ảnh: Codex (`gpt-5.6-sol`): fan-arc, sand-gust, storm, hit, ignite, mỗi ảnh một lần. Lần đầu `tools/vfx/codex-image.sh` lấy nhầm ảnh của phiên khác khi bị 429 (ảnh storm là vòng hoa Mẫu Đơn) → đã bỏ, dùng `codex-safe.sh` chỉ chép ảnh từ thư mục phiên của chính nó. Nên sửa wrapper chung.
- Chưa chạy test/typecheck/bản dựng/game (AGENTS.md).
- Người dùng cần duyệt: (1) lốc cát r4,5 trên đám quái đông có che HP/quái không (giữa rỗng, nhưng thành vòng cao); (2) hit puff không có cột trống giữa nên có thể phủ thân quái nhỏ; (3) hình nón vẽ dạng tròn r2,6 nhỏ hơn nón thật; (4) viền hồng nhẹ ở sợi mảnh của dải gió trên nền sáng.
- Thiếu event: không có event kích nổ → suy từ snapshot `burn`; `ability` không có `direction` → suy từ tay → mục tiêu.
