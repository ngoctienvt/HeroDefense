# Hiên Viên (h01F) — VFX tuyệt kỹ trên kit, chuẩn Cộng Công

Trạng thái: **đã sửa nguồn + đã xử lý/đóng atlas asset**; chưa build, chưa chạy test/typecheck, chưa nghiệm thu trong game.

## Outcome và ràng buộc

- Tuyệt kỹ `skill-h01F` chạy trên kit (`HeroVfx`), dùng đủ 6 ảnh Codex stylized mới của inventory tier 6 (không dùng mesh code cũ của `visual-hienvien.ts`).
- Hệ Thổ + kiếm đế đạo, bảng màu `#34352F #85662D #CC9C36 #F4D46D #FFF0BA` (palette kit `xuanyuan`), khác Chúc Dung (dung nham phun trào) và Trương Đạo Lăng (trận kiếm băng-lôi).
- Không đổi gameplay/server/contract; VFX chỉ trình bày theo event/snapshot.
- Ghi chú lệch brief: tuyệt kỹ **không phải chém quét trước mặt**. Server là nova R8,5 tại điểm khóa + vùng 5 s + 15 mưa kiếm; "kiếm khí quét" là đòn thường (5 tia xuyên thẳng).

## Bảng event/snapshot → nhịp

| Nguồn thật | Báo trước | Hành động | Va chạm | Dư âm |
|---|---|---|---|---|
| `cast skill-h01F` (windup .25 s, x/z = điểm khóa) | cự kiếm khung 0–3 lơ lửng cao (rise 5), trận Cửu Đỉnh lớn dần, viền R8,5 sáng dần, khí vàng hút lên | — | — | — |
| `ability skill-h01F` (nova R8,5, targets, sunder 5 s) | — | kiếm cắm xuống .08 s (khung 4–6, overshoot) | khung 7–11 một lần: đất nứt + đá + bụi; vòng xung R8,5, vòng vàng tâm, đá văng, khí vàng | 8 đỉnh rơi lên 8 ô ngoài (so le .035 s), bụi `arrival` dưới mỗi đỉnh |
| ground `xuanyuan-sword` (remaining 5 s) | — | — | — | kiếm giữ khung 11 (thở nhẹ), trận + viền R8,5 mờ; hết vùng: khung 12–15 tan, đỉnh lún/mờ |
| `sword-rain-h01F` ×≤15 (focus, hit R1,5, chỉ phát khi có quái) | — | kiếm nhỏ rơi nén .09 s | hit sheet + vòng nứt R1,5 + đá vụn ở đúng điểm event | kiếm cắm mờ dần .36 s |
| `trait imperial-blessing-h01F` (targets = đồng minh) | — | — | vòng vàng + khí bốc trên từng đồng minh | — |
| snapshot `critBlessing` (6 s) | — | — | — | vòng phước vàng dưới chân + dấu chung `critical-up`, `haste` trên đầu |
| snapshot `sunder` | — | — | — | dấu chung `armor-break` (bảng toàn game của Bàn Cổ) |
| `attack trait-h01F` (direction, 5 tia, dài 10) | — | 5 dải kiếm khí `kitLink` theo đúng góc quạt server | hit nhỏ trên từng target | — |

Lobby: không có cast và không có ground → impact tự giữ 1,2 s rồi tan (`FALLBACK_HOLD`). Snapshot vào trễ → vào thẳng pha giữ (`zoneStartAge`). Cast mất impact → telegraph tự hủy sau windup + .6 s.

## Thứ tự vẽ

Decal trận, đỉnh, bụi đỉnh: world pass (quái vẽ đè lên). Cự kiếm: foreground chỉ .45 s đầu (cú đập), sau đó đổi sang material world `giant-hold` (`depthAlways`) để boss bị khóa dưới kiếm vẫn đọc được. Mọi billboard đặt bằng `billboardCenter` theo screen-up của camera (điểm neo = đường đất đo trên canvas). Mưa kiếm và hit: foreground (ngắn, nhỏ). Không ghi depth. Dấu trạng thái: module chung `visual-status-marks.ts`.

## File

- Mới: `apps/client/src/visual-hienvien.ts` (thay nội dung cũ), `visual-hienvien-timeline.ts`, `-strike.ts`, `-accents.ts`, `-marks.ts`, `-replay.ts`; `apps/client/test/hienvien-vfx.test.ts`; `assets/vfx-source/hienvien/` (`process-art.py`, `SOURCE.json`, `active-inventory.json`, frames, contact sheets, reference); runtime `vfx-hienvien-{giant,array,cauldron,arrival,rain,hit}.webp`, `vfx-status-{critical-up,haste}.webp`.
- Sửa nhỏ chung: `visual-effects.ts` (register, bỏ khỏi legacy, `markHienvienZone`, `replayHienvien`), `visual-hero-adapters-sage.ts` (bỏ block h01F), `battlefield.ts` (zone có remaining, marker blessing, crit/haste vào `panguStatuses`, replay h01F), `visual-kit-painted.ts` (`tint`), `visual-kit-palettes.json` (`xuanyuan`), `visual-kit-atlases.json` (4 atlas), `visual-status-marks.ts` (2 dòng), `test/visual-hero-adapters.test.ts`.

## Kiểm tra người dùng cần chạy

- `npm run typecheck`
- `npm test -- apps/client/test/hienvien-vfx.test.ts apps/client/test/visual-hero-adapters.test.ts apps/client/test/visual-kit-manifests.test.ts`
- Dừng server cũ → `start-game.cmd` → `Ctrl+F5`. `?debug=1`: `__vfxReplay('h01F')`, `('h01F','lobby')`, `('h01F','attack')`, `('h01F','blessing')`; xem cạnh `__vfxReplay('h01G')` và `('h01H')`.
- Rà: cự kiếm có che boss không khi giữ 5 s; 8 đỉnh có đè quái/đồng minh không; dấu crit/haste trên đầu có chồng thanh HP không; nền sáng/tối; reduced motion; 4 người cùng cast; đổi khu vực giữa vùng. Log `visual.hienvien.*`, `visual.kit.*`.

## Câu hỏi mở

1. Inventory ghi "Cửu Đỉnh" nhưng decal có 8 ô ngoài + 1 ô giữa; hiện 8 đỉnh + cự kiếm ở ô giữa. Có muốn đỉnh thứ chín (ví dụ ngay sau kiếm) không?
2. Dấu `haste` hiện chỉ gắn cho đồng minh có phước Hiên Viên; gắn cho mọi nguồn `haste.amount > 0` toàn game là việc của bước tích hợp trạng thái chung.
3. Cỡ cự kiếm 12 đv (~3× thân tướng): cần người dùng xem trong game để chốt.
4. Khung giữ 11 là khung tốt nhất còn kiếm nguyên nhưng vẫn có vài mảnh đá nhỏ lơ lửng (giữ ~4,5 s). Đề xuất một job Codex mới "cự kiếm cắm giữ, đất đã lắng, không đá bay" (O hoặc P16) nếu thấy khó chịu trong game.

Ghi chú duyệt: replay chỉ hiện vòng phước dưới chân; dấu crit/haste trên đầu đến từ snapshot `critBlessing` thật nên phải cast thật mới thấy. Reduced motion: kiếm đứng yên ở độ cao tụ (khung 3) tới lúc server va chạm.
