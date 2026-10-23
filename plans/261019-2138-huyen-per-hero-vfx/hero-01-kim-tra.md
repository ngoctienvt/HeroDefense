---
hero: h009 Kim Tra
status: chờ người dùng duyệt hình trong game
---

# Kim Tra (h009): Kim Chung Phản Kích Trận

## Nguồn sự thật

- `content/catalog.ts` (đang chạy): `skill-h009`, 100 Nộ, khiên 220% Công + 12% Máu người nhận cho bản thân + 1 đồng minh thấp máu nhất trong bán kính 4,5; phản 50%.
- Server (`combat.ts`): windup 0,25 s; event `ability` mỗi người nhận (ở client là một `show` mỗi đồng minh). Khiên **không hết hạn theo thời gian** (mô tả ghi 5 s); chuông theo snapshot khiên. Khi Kim Tra còn khiên mà bị quái cận chiến đánh: Chảy Máu + 50% sát thương cho quái trong 3,0.
- Đánh thường: `frontal_cleave` r2,2, 120°, một event `trait-h009` mỗi quái trúng, không có `direction`; 25% phá 3 Giáp.

## Quyết định của người dùng (19-10-2026)

Thêm event hiển thị `reflect-h009`; giữ windup 0,25 s; giữ luật khiên (chuông theo khiên); phạm vi = tuyệt kỹ + đánh thường.

## Thiết kế

Thần thoại: Kim Chung (chuông vàng hộ thể) + trận đồ. Hình chính: **chuông đồng vàng kiểu phạn chung** có đai đúc, núm, quai rồng; khác Cự Linh Thần (tường kim khí) và mọi tướng Kim khác.

| Pha | Hình | Cách dựng |
|---|---|---|
| Báo trước | trận đồ sen + chuông khắc dưới chân r4,5; chuông thành hình trên đầu | `kitGround` + mask Blender; flipbook `kimtra-bell` 1–4 |
| Di chuyển | chuông rơi; sợi kim quang tới đồng minh | flipbook 5–6; `kitLink` |
| Va chạm | chuông úp đất, sóng vàng, bụi, mảnh vàng | flipbook 7–10 + spray `gold` |
| Dư âm | vỏ chuông fresnel theo khiên; vỡ khi khiên hết | `createLatheShellLayer` (kit mới); flipbook `kimtra-shatter` |
| Phản kích | chuông giật + sóng vàng r3,0 | `kitGround` vòng + `ringPulse` |
| Đánh thường | cung chém kiếm vàng 120°, crit có mảnh vàng | `kitSlash` palette `kimtra` |

## File

- Mới: `assets/vfx-source/kimtra/` (author.py, .blend, frame, contact sheet, ảnh ghép tham khảo), `apps/client/public/assets/vfx-kimtra-{bell,shatter,array-mask}.webp`, `apps/client/src/visual-kimtra{,-timeline,-ultimate,-status}.ts`, `apps/client/src/battlefield-kimtra.ts`, `apps/client/test/kimtra-vfx.test.ts`.
- Sửa: `packages/game-core/src/combat.ts` (event `reflect-h009`), `packages/game-core/test/lower-tier-identity.test.ts`, `visual-kit-layers.ts` (lathe), `visual-kit-atlas-manifest.ts` + `visual-kit-flipbooks.ts` (`depthWrite`), `visual-kit-atlases.json`, `visual-kit-palettes.json`, `visual-effects.ts` (đăng ký), `battlefield.ts` + `visual-actors.ts` (tracker, marker, event, replay), gỡ h009 khỏi `visual-kit-recipes-tier12.ts`/`visual-kit-recipe-skills.ts`/`visual-kit-recipes.test.ts`, `docs/vfx-assets.md`, `docs/vfx-kit.md`.

## Chưa làm / cần duyệt

- Chưa chạy test/typecheck/build/game (AGENTS.md). Người dùng kiểm tra theo mục bàn giao.
- Vì khiên không hết hạn, chuông có thể ngồi trên đồng minh không bị đánh rất lâu. Vỏ chuông giữ cỡ đầy 1,2 s rồi thu về vành mảnh, mờ (alpha ~0,45); phản kích làm bùng lại. Đây là trạng thái người dùng cần xem kỹ nhất.
- Chưa xem: chuông vỏ fresnel trong game (chỉ thấy ở flipbook), reduced motion, 4 người chơi, camera khác.
- Khung cuối flipbook còn alpha tối đa 3/255 ở vài hạt rất nhỏ (gần như trong suốt).
- Nhánh `web-h009` cũ trong `visual-effects.ts` và motif chuông trong `visual-tier-skills.ts` là mã chết (skill id thật là `skill-h009`); để dọn ở giai đoạn dọn dẹp.
