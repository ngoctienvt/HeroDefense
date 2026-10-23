---
hero: h03O Nhiếp Tiểu Thiến
status: chờ người dùng duyệt hình trong game
---

# Nhiếp Tiểu Thiến (h03O): Lan Nhược U Hồn Khúc

## Nguồn sự thật

- `content/catalog.ts`: `skill-h03O`, hồi chiêu 9 s. Hồi 215% ATK + 5% Máu tối đa người nhận cho 3 đồng minh thấp máu nhất trong bán kính 7,5; hồi vượt máu tạo Khiên Băng Giá 5 s, kẻ địch đánh vào giảm 40% tốc đánh.
- Server (`combat.ts`): `WINDUP_HEROES` có h03O → event `cast` tại Tiểu Thiến (windup 0,25 s); `ability skill-h03O` có `ability: 'heal'`, `x/z` = vị trí Tiểu Thiến, `targets` = các đồng minh nhận (tối đa 3, có thể gồm cả bà). Khiên là `unit.frostShield { remaining 5, amount, attackSlow .4 }` trong snapshot, chỉ được đặt khi `overheal > 0`, nên "khiên băng" chỉ vẽ khi snapshot có `frostShield.remaining > 0` (không suy từ event cast).
- `battlefield.ts` gọi `effects.show(event, tâm, nguồn, vị trí đồng minh nhận)` nên module nhận đủ `extra.targets`.
- Giảm 40% tốc đánh của kẻ địch (`attackSlow` trên kẻ đánh khiên): không có marker riêng, VFX không vẽ.
- Đòn thường / âm ba `trait-h03O` và marker khác **ngoài phạm vi**: module chuyển tiếp cho painter công thức cũ (`fallback`, dòng h03O trong `TIER12_RECIPES` giữ nguyên).

## Bảng nhịp

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại Tiểu Thiến | vòng sóng đàn hình cung hợp lại, cánh lan và nốt nhạc nổi quanh tướng | flipbook `nhieptieuthien-music` khung 1–4, giữ khung 4 tới khi có ability |
| Kích hoạt | `ability` (tâm = Tiểu Thiến) | vòng hoa lan nở rộng, nốt nhạc tản ra | khung 5–16 @18 fps + spray `orchid` (18 hạt) |
| Di chuyển | cùng event, mỗi đồng minh trong `targets` | dải âm thanh ngọc trai, nốt nhạc bạc, đầu là đóa lan lớn, mọc 0,22 s, so le 0,08 s, tàn dần tới 0,6 s | texture `note-ribbon` (UV lộ dần, đầu dẫn), ngang thắt lưng, `GROUND_ALPHA_INDEX + 3` (dưới mọi nhân vật) |
| Va chạm | khi đầu dải tới (0,2 s) | đóa lan nở dưới chân, ánh xanh nhạt và cánh lan bay lên (không dấu cộng) | flipbook `nhieptieuthien-heal` (8 khung @16 fps) + 4 hạt `orchid`; nếu đồng minh là chính bà thì chỉ có đóa nở, không dải |
| Dư âm | snapshot `frostShield.remaining > 0` (5 s) | vỏ băng quanh đồng minh (cột giữa trống), không có vòng dưới chân (đã bỏ theo phản hồi: xấu và thừa), tàn 0,4 s sau lần mark cuối | flipbook `nhieptieuthien-frost` (khung 1–3 mọc một lần, 4–8 lặp); bỏ marker `frost` chung cho đồng minh này |

Số lấy từ catalog/combat: bán kính 7,5 và 3 mục tiêu (`HEAL_RADIUS`, `MAX_HEAL_TARGETS`), 5 s (`SHIELD_SECONDS`); test đối chiếu với `HERO_BY_ID`.

## Ảnh Codex gốc đã dùng

Xem từng ảnh trước khi dùng: cả 5 đều là RGBA có alpha thật sẵn (không còn nền magenta), nền sạch, không dính viền. Kích thước khác yêu cầu nên cắt theo lưới thực tế (`process-codex-art.py` pad về ô vuông, không kéo giãn):

| Ảnh | Kích thước | Lưới | Kết quả |
|---|---|---|---|
| `music-sheet.png` | 1254² | 4×4 = 16 khung | đúng chủ thể; khung 1–3 hình thành, 4–11 vòng đầy đủ, 12–16 tan; cột giữa trống. Dùng nguyên |
| `heal-sheet.png` | 1774×887 | 4×2 = 8 khung | đúng (đĩa → lan nở → khép → ánh mờ). Dùng nguyên |
| `frost-shell-sheet.png` | 1774×887 | 4×2 = 8 khung | đúng; khung 4–8 gần như giống hệt nhau (lặp liền), cột giữa trống. Dùng nguyên |
| `note-ribbon.png` | 2172×724 | 3:1 | đúng, đầu lan bên phải. Dùng nguyên |
| `frost-ring.png` | 1254² | decal | đúng chủ thể nhưng KHÔNG dùng trong game: vòng dưới chân bị người dùng loại. Ảnh gốc, `processed/` và webp vẫn còn |

Không có ảnh nào sai chủ thể/lưới nên không dựng bản thay. Lưu ý chất lượng: khung 16 của `music` và khung 8 của `heal` gần như chỉ còn hạt/ánh mờ (đúng ý đồ tan biến); đóa lan ở khung heal 3–4 khá đặc và sát chân đồng minh (che phần chân khi vẽ sau sprite tướng, xem mục duyệt).

## File

- Mới: `assets/vfx-source/nhieptieuthien/` (`prompts/`, `raw/`, `process-codex-art.py`, `processed/`, `music/`, `heal/`, `frost/` khung + contact sheet tối/sáng, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-nhieptieuthien-{music,heal,frost,note-ribbon,frost-ring}.webp`, `apps/client/src/visual-nhieptieuthien{,-timeline,-music,-streams,-shell}.ts`, `apps/client/src/battlefield-nhieptieuthien.ts`, `apps/client/test/nhieptieuthien-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký + truyền recipe h03O làm `fallback`), `battlefield.ts` + `visual-actors.ts` (cờ `nhiepShield`, marker `frostshield`, clear, replay `h03O`), `visual-kit-spray.ts` (preset `orchid`), `visual-kit-atlases.json` (3 atlas), `docs/vfx-assets.md`, `plan.md`.
- Không đụng game-core/contracts/server/content.

## Kit cần bổ sung

- Lớp ribbon/decal texture màu vẫn thiếu (lần thứ tư dựng plane `StandardMaterial` riêng: Mộc Tra, Cự Linh, Mẫu Đơn, Tiểu Thiến): `visual-nhieptieuthien-streams.ts` gần như bản sao `visual-mandon-streams.ts`. Nên gom thành lớp kit "ribbon" khi dọn.
- Flipbook bám theo đơn vị (vỏ băng quanh đồng minh) phải tự `place()` mỗi frame và đặt `sprite.color.a` để tàn dần; kit chưa có tiện ích "buff shell" dùng chung.
- Registry vẫn chỉ cho một module mỗi hero id: giữ đòn thường bằng `fallback` thủ công.

## Trạng thái

- Đã sửa nguồn + xử lý ảnh + đóng 3 atlas + chép texture. Chưa chạy test/typecheck/build/game (AGENTS.md).
- Chưa xem trong game: kích thước vỏ băng so với tướng thật (`ortho 4,6 / targetZ 2,1`, chỉnh trong `visual-kit-atlases.json` rồi đóng lại atlas `nhieptieuthien-frost`), vòng sóng đàn `ortho 6 / targetZ 1,6`, độ che chân của đóa heal, dải ngang thắt lưng ở góc camera thật, nền sáng/tối, giảm chuyển động, 4 người chơi, vỏ băng xuất hiện đúng khi hồi vượt máu (đồng minh đầy máu không có khiên).
- Người dùng cần duyệt nhất: (1) vỏ băng không che tướng và chỉ hiện khi có khiên, đúng 5 s; (2) dải âm đọc là dải âm thanh + lan, tới đúng 3 đồng minh; (3) hồi máu là ánh sáng xanh nhạt + cánh lan, không rối khi 3 mục tiêu sát nhau.
