# Phượng Hoàng — Niết Bàn Phần Thiên Vũ

Trạng thái: **dựng lại 21-10-2026 (lần 2)**: đã sửa nguồn; chưa chạy typecheck/test/build/game; chờ người dùng nghiệm thu hình ảnh/FPS.

## Phạm vi và chứng cứ

- Theo yêu cầu: làm lại tuyệt kỹ, đủ 4 pha, tụ lực shader động, va chạm 3 lớp, dư âm bám snapshot, đúng vùng và giữ nhân vật rõ.
- Không đổi luật chơi, hệ số, windup, đòn thường hoặc trứng/tái sinh. Giữ trình bày cũ của đòn thường/trứng/tái sinh trong module điều phối.
- Skill: `.claude/skills/vfx-skill/SKILL.md` và ba reference; chuẩn `docs/vfx-kit.md`.
- Nguồn số liệu: `content/phuong-hoang-design.ts`; dispatch `combat.ts` → `phuongHoangAbility`; clock `stepPhoenixCarpet`.
- `cast skill-h041` mang `windup` server (hiện generic 0,25s), điểm khóa và direction. Không còn fallback bịa 0,35s.
- `ability skill-h041` đánh ngay toàn bộ quái cùng zone. Snapshot `phoenix-carpet` mới là vùng R9, mưa 4s và thảm 6s. Chuyển động chim không quyết định thời điểm sát thương.

## Vì sao bản trước xấu (chẩn đoán 21-10-2026, từ mã + ảnh, chưa chạy game)

1. **Draw order**: mọi plane Codex (chim, va chạm, mưa, lửa) đặt ở world pass với `alphaIndex = GROUND_ALPHA_INDEX + 8`, tức vẽ **trước mọi quái**; quái vẽ đè lên chim/hit/mưa. Cùng lỗi Đế Tuấn/Nguyên Thủy.
2. **Chim cỡ tướng và gần như không bay**: plane 8u (chim ~5u) so với tướng 7,6u; đường origin → điểm khóa +3u với `motion.settle` nên chỉ như bước nhảy chậm dần. Chiêu đánh cả làn mà chim không băng qua làn.
3. **Hit không gắn với chim**: mọi mục tiêu nổ cùng một lúc t=0, 2,8u, dưới quái.
4. **Quá thưa**: 3 cụm lửa + 5 cụm mưa trong đĩa R9 (18u).
5. Chung màu/spray với Chúc Dung (`lava`); `cast` bỏ `origin` nên không tụ chim trên tướng; replay `targets: []` nên không bao giờ thấy làn.
Ảnh nguồn Codex (16 pose chim, mưa lông, hit lông, decal thảm) đạt; không cần vẽ lại. Sheet lửa chỉ là nêm thấp ngang (chiếm ~40% chiều cao ô), dùng làm tường lửa chứ không phải hình chính.

## Nhịp 4 pha (bản dựng lại)

Mốc `t=0` là event `ability`. Damage server toàn zone, tức thời; mọi trễ dưới đây chỉ sắp xếp trình bày.

| Pha | Event/clock | Lớp |
|---|---|---|
| 1. Tụ lực | `cast skill-h041`, đúng `event.windup` | Viền R9 ở điểm khóa + lõi `kitGround/phoenix` tăng dần có `uTime`; **chim tụ trên đầu tướng** (sheet khung 0–3, foreground, to dần) + tàn lửa hút lên từ tướng. Hướng của `cast.direction` được giữ cho pha sau. |
| 2. Hành động | `ability` | Chim 17u (foreground: trên quái, dưới tướng/HP) băng **cả làn** từ tướng tới quá mục tiêu xa nhất (26–46u) trong 1,25s: gia tốc → lướt (`flightProgress`), vỗ cánh lặp theo lịch khung, 3 bóng trễ (0,1/0,2/0,31s) từ pose cũ, tàn lửa rơi sau đầu, vệt cháy mặt đất `kitLink` phoenix + vàng dọc cả đường bay. Hướng: `cast.direction` → tướng→điểm → trục chính của đám mục tiêu → screen-right. |
| 3. Va chạm | cùng `ability` | Mỗi mục tiêu thật (≤24, thưa đều theo thứ tự làn) nổ **khi chim bay qua** (trễ theo `strikeDelay`): sheet lông va chạm 4,8u (foreground) + vòng xung kích + dấu cháy + tàn lửa. Điểm khóa: nổ lớn 9u, vòng xung kích lan tới đúng R9, dấu cháy 5u. |
| 4. Dư âm | chỉ snapshot `phoenix-carpet` | Sàn dung nham shader `phoenix` + decal Codex (0,9); tường lửa 9 nêm trên biên R9 + 4 nêm trong (foreground 0,9s đầu rồi world); 9 cụm mưa lông phủ cả R9 khi `rainRemaining>0` (foreground, đóng 0,35s cuối); tàn xanh ngọc bốc lên (hồi máu); 0,6s cuối lửa gập/trượt vào tâm bốc tàn. Biên theo `radius` snapshot. |

## Nguồn và tích hợp

- 5 ảnh Codex đã có trong `assets/vfx-source/tier56-codex-art/raw/`; không sinh ảnh mới hoặc dùng texture Warcraft/thư viện chung làm hình chính.
- `assets/vfx-source/phuong-hoang/process-art.py`: alpha floor16, premultiplied downscale, hash khớp metadata, canvas chung. Chim tràn lưới được tách bằng connected components rồi giữ offset theo tâm ô danh nghĩa; không cắt đầu/cánh, không fit từng pose. Hai sheet 4×2 chia đúng khe trống y469/y610, neo đất chung theo hàng.
- Output: 4 atlas WebP + một decal, ~1,42MiB; metadata/route/prompt/hash/crop trong `active-inventory.json`, layout runtime được script sinh.
- `visual-phuong-hoang.ts` implements `HeroVfx`; bỏ adapter legacy để không tick/clear hai lần. Tách art/ultimate/ground/timeline/replay, mỗi module TS dưới 200 dòng.
- Pass: `sweep`, `hit`, `rain`, `flameFront` là **foreground** (trên quái, dưới tướng và HP); `carpet` và `flame` bền là world (`depthAlways`). Reduced motion giữ viền, vùng, khung chim/hit/mưa/lửa tĩnh; bỏ hạt, bóng trễ, vệt cháy và chuyển động.
- Cap: 8 charge, 4 carpet, 3 chuyến bay (mỗi chuyến 1 chim + 3 bóng), 32 hit, 32 scorch, 128 plane màu (23 plane/thảm), `KitFxBank` (ring 40, ribbon 24), spray `phoenix` (capacity520/maxQueued260) và `jade`. Thu hồi từng lớp trong `clear()` khi đổi trận/khu vực.
- File: `visual-phuong-hoang-flight-math.ts` (toán thuần), `-flight.ts` (chim/bóng/vệt), `-ultimate.ts` (tụ lực + hit trễ theo làn), `-ground.ts` (thảm), `-art.ts` (pass + hit), `-timeline.ts`, `-replay.ts`.
- Replay `?debug=1` (bản ultimate nhồi 7 mục tiêu **giả** dọc làn để thấy hit trễ theo chim; chỉ debug): `__vfxReplay('h041')`, `('h041','ground')` (snapshot vào muộn), `('h041','lobby')` (không có trạng thái đất), `('h041','ultimate',x,z)`.

## Rà đã thực hiện và phần chưa xác nhận

- Đã xử lý/đóng asset, xem contact sáng/tối, xem ảnh ghép tham chiếu theo hero plane7,6u và camera beta0,84. Ảnh ghép là bố cục tĩnh, không chứng minh thứ tự vẽ/animation/FPS trong game.
- Đã rà routing cast/ability, snapshot radius/remaining/rainRemaining, cleanup và giới hạn pool. Có test hồi quy cho nhịp/hướng/snapshot/reduced motion và adapter không chiếm h041.
- Review độc lập theo `ak-code-review`: phát hiện callback replay chưa được unregister khi dispose chiến trường; đã lưu hàm unregister và gọi trong `this.unsubscribe`, khớp các replay hiện hữu. Review không chạy game/test/build.
- Chưa chạy test/typecheck/build/game. Người dùng chạy `npm run typecheck`; `npm test -- apps/client/test/phuong-hoang-vfx.test.ts apps/client/test/visual-hero-adapters.test.ts`.
- Dừng server cũ → `start-game.cmd` → Ctrl+F5. Kiểm góc ±x/±z, sáng/tối, 4 người, R9, mưa dừng ở 4s nhưng thảm còn 2s, kết thúc có gập/thu lửa, lobby/reconnect/đổi zone/reduced motion. Log `visual.phoenix.*`, `visual.kit.*`.
- Giới hạn tranh nguồn: sheet lửa có vài motif giống đầu chim và ping-pong chỉ giảm giật vòng; chuyển động mưa/chim vẫn cần xem trong game trước khi gọi đạt chất lượng. Giữ nguyên metadata nguồn `style-review-required`, không tự ghi đã duyệt.

## Bổ sung replay Niết Bàn theo yêu cầu kiểm tra

- `__vfxReplay('h041','rebirth')`: actor ẩn thân/bóng → trứng2s → hiện thân + hiệu ứng hồi sinh đang có. Chỉ override trình bày bằng ID actor, không ghi vào `actor.phoenixEgg` hoặc snapshot/server.
- Theo vị trí actor đang hiển thị; `clear()` hủy override khi đổi trận/khu vực. Đã thêm test cho đúng2s, đúng actor, event hồi sinh một lần, không tạo thảm và hủy giữa chừng.
- Chưa chạy test/typecheck/build/game/replay. Chạy lại launcher và Ctrl+F5 trước khi dùng lệnh mới.

## Kit cần bổ sung

Đã thêm (chỉ append, tương thích ngược): palette `phoenix` (`visual-kit-palettes.json`: đỏ thẫm/vàng/xanh ngọc làm điểm mắt lông) và spray preset `phoenix` (`visual-kit-spray.ts`), để khác Chúc Dung dùng `lava`. Chưa có: hạt hình lông (spray hiện dùng chấm tròn); nếu cần, cắt một lông từ sheet mưa của Codex làm texture preset. Không đổi shader/gameplay.

## Lớp còn yếu (chưa làm trong lần này)

Đòn thường, trứng Niết Bàn và vòng hồi sinh vẫn là `StandardMaterial`/torus/cầu/trụ tạo-hủy theo event (`visual-phuong-hoang.ts`), chưa đạt chuẩn kit; ngoài phạm vi tuyệt kỹ.
