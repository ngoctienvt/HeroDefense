---
phase: 5
title: "Client: sprite mượn tướng, báo trước, VFX"
status: pending
effort: 7h
depends: [1, 4]
---

# Phase 5 — Client: quái mượn sprite tướng, báo trước, VFX kỹ năng

## Mục tiêu
Kẻ địch có `skinHeroId` hiện bằng sheet stylized của tướng (4 hướng, idle/walk/attack) đúng cỡ theo `rank`; kỹ năng đầu lĩnh/boss có báo trước rõ và dùng VFX tướng gốc. Mọi thứ chỉ trình bày.

## File
- Sửa: `apps/client/src/visual-actors.ts` (nhánh `skinHeroId` → `createHeroSprite`; scale minion 0,95, elite 1,1, chieftain 1,25, boss 1,5; thanh HP/khiên cho chieftain/boss theo `rank` thay vì `monsterId === 'b001'`), `visual-sprites.ts` (selection size theo rank), `battlefield.ts` + `battlefield-shared-status.ts` (khiên đá chỉ cho kit `hac-phong`), `visual-effects.ts` (định tuyến `cast/ability` của enemy; `boss-earthquake*` → theo `skillId`), `main.ts` (HUD boss tổng quát: tên kit, hồi chiêu kỹ năng lớn, thay khối b001 ở ~117–155).
- Tạo: `apps/client/src/visual-enemy-telegraph.ts` (decal vòng/vạch/quạt/dấu theo `cast.seconds`, pool, tái sử dụng texture `vfx-boss-quake` và vòng phép có sẵn), `apps/client/src/visual-enemy-skill-routing.ts` (bảng `skillId → adapter/replay`).
- Test: `apps/client/test/enemy-skill-routing.test.ts`, `apps/client/test/hero-skinned-enemy.test.ts`.

## Bước
1. **Sprite**: tái dùng đường tải sheet stylized; hướng nhìn theo hướng di chuyển/mục tiêu như tướng (Babylon LH). Idle tĩnh, walk theo đồng hồ liên tục, attack theo event `attack` của enemy. Thiếu pose hit/death → chớp trắng 80 ms khi trúng, chết thì mờ + lún 0,4 giây.
2. **Telegraph**: vẽ từ event `cast` (hình, bán kính, thời gian); vòng đỏ đặc viền sáng, vạch/quạt fill alpha 0,35, đổ dần theo thời gian. Nằm trên mặt đất, dưới nhân vật và thanh máu (quy tắc vẽ sau cùng của tướng giữ nguyên). Reduced motion: decal tĩnh, không pulse.
3. **VFX kit boss**: kiểm từng adapter `h00P`, `h00B`, `h011`, `h01H`, `h01G` khi `source` là enemy:
   - Gọi registry với `origin` = actor enemy; nếu trả `false`, dùng `replay(origin, reduced, kind)` / hàm phát-tại-điểm của adapter đó.
   - Ghi `visual.enemy.skill` `{ skillId, routed: 'registry'|'replay'|'fallback', ok }`.
   - Không vẽ VFX nổ lan cho chiêu đơn mục tiêu; Dung Nham Điểm Huyệt vẽ đúng trên từng tướng bị đánh dấu.
4. **VFX mẫu đầu lĩnh**: A/A+ dùng flipbook nổ theo nguyên tố của tướng skin (thư viện `vfx-lib-*` đã có), B dùng vệt bụi/đất, C dùng vòng aura màu theo đốt/chậm, D dùng cờ/hào quang nhỏ trên đầu đầu lĩnh + viền nhẹ dưới chân quái được buff. Đọc `docs/vfx-assets.md` trước khi chọn texture; không thêm asset ngoài.
5. **Giới hạn**: telegraph pool 8, aura liên tục 6; dọn khi enemy chết/đổi vòng.

## Test (người dùng chạy)
- Mọi `skinHeroId` trong `enemy-archetypes.ts` có `hero-stylized-<id>.json` + `.webp` (test đọc thư mục public).
- Bảng routing có mục cho mọi `vfxSkillId` của kit/mẫu.
- Kiểm tra trong game: vòng 6, 10, 15, 20 trên nền sáng và tối, trận đông, 1 và 4 người; boss to ×1,5 rõ ràng; tướng/thanh máu không bị VFX che.

## Rủi ro / rollback
Adapter đọc trạng thái unit → fallback replay; ghi cảnh báo trong log thay vì im lặng. Rollback: tắt nhánh `skinHeroId` (về hình khối dự phòng).
