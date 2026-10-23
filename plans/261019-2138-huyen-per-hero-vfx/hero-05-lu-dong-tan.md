---
hero: h00D Lã Động Tân
status: xong nguồn + asset, chờ người dùng duyệt hình trong game
---

# Lã Động Tân (h00D): Thuần Dương Thiên Kiếm Trận

## Nguồn sự thật

- `content/catalog.ts`: `skill-h00D` (`kind: nova`), hồi chiêu 9 s, `effect.radius 4,2`, `groundBurnSeconds 3`. Cự kiếm rơi cụm quái gây 240% ATK; kiếm trận tồn tại 3 s thiêu 80% ATK/s. (`content/tier-hero-design.ts` ghi số khác, 235% và 2,5 s; VFX theo catalog.)
- Server (`combat.ts`): windup 0,25 s (`WINDUP_HEROES` có h00D) → event `cast` tại **mục tiêu** (`x/z` = quái được chọn); `ability skill-h00D` có `ability: 'nova'`, `x/z` = mục tiêu, `source` = Lã Động Tân. Kiếm trận là `state.groundEffects` **không có `kind`/`id`**: `{ x, z, zone, radius 4,2, remaining 3, damagePerSecond 0,8·ATK, casterId }`. Snapshot gửi mỗi tick nên client nuôi VFX theo nó; chủ sở hữu nhận ra bằng `actors.get(casterId).heroId === 'h00D'`.
- Đòn thường `trait-h00D` (phi kiếm xuyên 3 quái) **ngoài phạm vi**: module chuyển cho painter công thức cũ qua `fallback`. Marker khác cũng qua `fallback`.
- Hiệu ứng "đánh trúng ≥2 quái giảm 0,5 s hồi chiêu" không có event riêng nên không trình bày.

## Ảnh Codex gốc (đã xem từng ảnh)

| Ảnh | Kích thước thật | Kết luận |
|---|---|---|
| `fall-sheet.png` | 1254² (ô 313,5) | Đúng chủ thể và lưới 4×4, 16 khung đổi rõ từng nhịp: vòng talisman + mũi kiếm → rơi (vệt tốc độ) → cắm đất, mảnh đá → sóng nổ → tàn lửa → gần trống. Dùng được. Cự kiếm đồng đỏ rất lớn (~70% ô). |
| `array-ring.png` | 1254² | Đúng: nhìn từ trên, 8 kiếm tỏa như la bàn nối vòng son-vàng, giữa trống, có alpha thật. Có viền lửa vàng/đỏ mờ lẫn hạt bẩn nhỏ (đã lọc ngưỡng alpha). Dùng được. |
| `array-flame-sheet.png` | 1774×887 (ô 443,5) | Đúng 4×2, lặp liền (khung 8 nối khung 1), vòng lửa + 2–3 kiếm vàng, giữa trống. Khác prompt: khung 8 không "gần trống", vòng ở ~68% ô thay vì 72%. Dùng được. |

Không ảnh nào phải thay bằng bản tự dựng.

## Thiết kế

Hình chính: **cự kiếm đồng đỏ rơi cắm xuống tâm cụm quái, sóng nổ lửa vàng bung ra rồi kiếm tan nhanh; để lại kiếm trận 8 thanh nối vòng đỏ, lửa cháy quanh vòng đúng suốt thời gian ground effect của server.**

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại cụm quái | vòng sáng vàng + ấn son trên đất, cự kiếm rơi từ trên xuống (vệt tốc độ) | flipbook `ladongtan-fall` khung 1–6 phát hết trong windup (0,9·windup/6 mỗi khung), giữ khung 6 chờ ability |
| Va chạm | `ability` tại cụm quái (tâm = mục tiêu, bán kính 4,2) | lưỡi kiếm cắm đất, mảnh đá văng, sóng nổ; kiếm tan thành ánh sáng ngay | khung 7–12 ở 26 fps (0,23 s) rồi 13–16 ở 14 fps; tổng 0,52 s; spray `gold` 16 tia; decal `array-ring` bung từ r 1,1 tới 4,2 trong 0,32 s |
| Dư âm | snapshot `groundEffects` không `kind` của caster h00D | kiếm trận 8 kiếm xoay chậm dưới chân quái, lửa vòng cháy trên vòng, tàn lửa bay lên mỗi 0,5 s | decal ở `GROUND_ALPHA_INDEX + 1` (dưới mọi nhân vật) + flipbook `ladongtan-flame` lặp 12 fps (cao ×1,25 vì tranh dẹt hơn góc camera); mất 0,45 s sau khung snapshot cuối |

- Sprite flipbook là billboard `depthWrite: false`, vẽ trước pass trong suốt của nhân vật: cự kiếm không che quái, tướng hay thanh máu. Kiếm chỉ sống 0,52 s sau va chạm.
- Va chạm chưa có snapshot (tick đầu): sóng nổ chờ tối đa 0,8 s; không có ground effect thì chỉ để lại sóng nổ. Snapshot khớp impact trong 1,5 đơn vị.
- Giảm chuyển động: khung tĩnh (kiếm đang rơi = khung 3, cắm đất = khung 8) 0,35 s, decal đủ cỡ không xoay, một khung lửa tĩnh, bỏ hạt.

## File

- Mới: `assets/vfx-source/ladongtan/` (`raw/`, `prompts/` ảnh/prompt Codex gốc, `process-codex-art.py`, `processed/`, `fall/` + `flame/` frame và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-ladongtan-{fall,flame,array-ring}.webp`, `apps/client/src/visual-ladongtan{,-timeline,-fall,-array}.ts`, `apps/client/src/battlefield-ladongtan.ts`, `apps/client/test/ladongtan-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký, công thức h00D làm `fallback`), `battlefield.ts` (tracker, replay `h00D`, nhánh ground effect trước `markGround`, clear), `visual-kit-atlases.json` (2 atlas), `docs/vfx-assets.md`, `plan.md`.
- Không đụng game-core/contracts/server/content. Dòng h00D trong `TIER12_RECIPES` giữ nguyên vì còn vẽ đòn thường.

## Kit cần bổ sung

- Lớp decal texture màu và flipbook co giãn không đều (flame ×1,25 chiều cao) vẫn tự dựng trong module: nên đưa vào kit khi gom (cùng ghi chú Mẫu Đơn/Mộc Tra).
- Ground effect server không có `kind`/`id` nên client suy chủ sở hữu từ `casterId` và tự tạo id; nếu sau này server gắn `kind` riêng thì chỉ cần đổi `isLadongtanArray`.
- Tranh Codex vẽ vòng/sóng dẹt hơn góc camera thật (sin 51° ≈ 0,78); đã bù bằng decal nhìn từ trên cho sóng nổ + trận, còn vòng trong khung `fall` vẫn dẹt.

## Trạng thái

- Chưa chạy test/typecheck/game (AGENTS.md). Đã chạy `process-codex-art.py` + `pack-flipbooks.ps1` (atlas `ladongtan-fall` 569 KB, `ladongtan-flame` 348 KB, decal 91 KB) và xem `reference-{light,dark}.png`.
- Chưa xem trong game: cự kiếm cao ~6 đơn vị có quá lớn so với tướng/quái không, anchor chân (vòng ở 73%/68% ô) có khớp mặt đất, sóng nổ trong khung `fall` chạm mép ô (viền đã cắt 3 px), độ cao lửa ×1,25, nền sáng, giảm chuyển động, 4 người chơi, snapshot thật (id kiếm trận, thời gian 3 s).
- Người dùng cần duyệt nhất: (1) cự kiếm có đọc là "cự kiếm rơi" mà không che quái; (2) kiếm trận 8 kiếm + lửa nằm đúng bán kính 4,2 và tắt đúng lúc ground effect hết; (3) màu lửa đỏ/vàng có lẫn với tướng lửa khác không.
