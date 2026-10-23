---
hero: h00H Vô Thường
status: chờ người dùng duyệt hình trong game
---

# Vô Thường (h00H): Hắc Bạch Đoạt Mệnh Xích

## Nguồn sự thật

- `content/catalog.ts`: `skill-h00H`, `kind: 'chain'`, `effect.shape: 'single'`, hồi chiêu 0 (Nộ `rage_on_attack`, đầy 100). 380% ATK vào MỘT quái thấp máu nhất; ×1,75 (coi như chí mạng) nếu mục tiêu bị Phá Giáp (`sunder`) hoặc <35% máu; kết liễu hoàn 70 Nộ.
- Server (`combat.ts`): `h00H` nằm trong `WINDUP_HEROES` → event `cast` (windup 0,25 s, `target` + `x/z` = quái bị chọn, Nộ về 0) → `ability skill-h00H` (`target`, `x/z` = quái, `targets` = [quái]). Bắn là tức thời: thời gian xích bay chỉ để trình bày.
- Kết liễu: không có cờ trong event `ability`. Server phát `death` (target = quái) NGAY TRƯỚC `ability` cùng tick (`hurtEnemy` → `event death`), nên `battlefield.ts` ghi `death` vào `visual-vothuong-kills.ts` và module hỏi lại khi nhận `ability`. Hoàn 70 Nộ là năng lượng của tướng, không có event riêng.
- Đòn thường `trait-h00H` và marker khác **ngoài phạm vi**: module chuyển cho painter công thức cũ (`fallback`, đăng ký riêng nên tự tick/clear).
- Không có event nào cho "kết liễu thất bại"; mục tiêu bị chọn theo "máu thấp nhất trong tầm" của server, client chỉ xấp xỉ bằng "máu thấp nhất trong khu" (xem Vòng dấu tử).

## Thiết kế

Hình chính: **xích móc liềm đen-trắng quất tới mục tiêu, vòng bùa tử siết lại, nhát chém chữ X nổ sao ngà, hồn bị rút khỏi mực rồi bay về nhập Vô Thường** (Hắc Bạch Vô Thường câu hồn). Máu = KHÔNG: toàn mực đen/ngà/bạc, vải đỏ chỉ là tua của móc. Khác Mộc Tra (dây gai), Mẫu Đơn (cánh hoa), Cự Linh (khiên).

| Pha | Event | Hình | Cách dựng |
|---|---|---|---|
| Báo trước | `cast` (0,25 s) tại quái bị chọn (`event.x/z`) | vòng bùa mực khói siết lại, bùa lơ lửng | flipbook `vothuong-reap` khung 1–4, giữ khung 4 tới khi xích chạm |
| Xích bay | `ability`, từ tay Vô Thường tới quái | dải xích + móc liềm, đầu móc dẫn, tay xích theo sau, 0,14 s tới nơi, tan 0,5 s | dải texture màu `vfx-vothuong-chain-strip.webp` (UV lộ dần), ngang thắt lưng (cao 1,1), dưới mọi nhân vật (`GROUND_ALPHA_INDEX + 3`) |
| Chém / va chạm | khi đầu móc tới (0,126 s sau ability) | móc quét, chém chữ X, nổ sao ngà + mảnh bùa | flipbook `vothuong-reap` khung 5–8 @20 fps; quái sống: tắt dần 0,15 s sau khung 9 |
| Hồn rút lên | `death` cùng tick (kết liễu) | hồn trắng bị kéo lên khỏi mực, tan | `vothuong-reap` khung 9–16 (chỉ khi kết liễu) |
| Hồn về / hoàn Nộ | cùng điều kiện, từ giây 0,25 sau va chạm | hồn bay cong từ quái về ngực Vô Thường (0,5 s), tan vào người (0,5 s) | flipbook `vothuong-soul` 16 khung 8×2; đáy hồn đi theo cung parabol |
| Dấu tử | snapshot: quái máu thấp nhất của khu thỏa Phá Giáp hoặc <35% máu, và có Vô Thường đủ ≥60% Nộ | vòng âm dương đỏ-đen-ngà dưới chân, xoay chậm, héo 0,3 s khi hết điều kiện | decal `vfx-vothuong-mark-ring.webp` ở `GROUND_ALPHA_INDEX + 2`, đường kính 3,6 |

Số từ catalog/combat: ngưỡng 35% (`CRIT_HP_RATIO`), windup 0,25 (`DEFAULT_WINDUP`). Ngưỡng ≥60% Nộ để hiện dấu (`MARK_ENERGY_RATIO`) là lựa chọn trình bày của client, không phải luật chơi: bỏ nếu muốn dấu hiện bất cứ lúc nào có Vô Thường trong khu.

## Ảnh Codex gốc: kết quả xem

- `chain-strip.png` 2172×724 (đúng 3:1): đạt. Móc liềm bên phải, xích mảnh bên trái, vải tua đỏ nhỏ, khói xanh lơ. Cắt nền sạch; dải ở cỡ thật khá mảnh nên chiều rộng mặt phẳng kẹp 2,2–3,4 đơn vị.
- `reap-sheet.png` 1254² 4×4 = 16 khung: đạt đúng thứ tự (vòng bùa 1–4, chém 5–8, hồn rút 9–16). Có bụi cyan/trắng quanh khung; script xóa theo ngưỡng alpha 10% + loại đốm <40 px.
- `mark-ring.png` 1254²: đạt. Vòng âm dương có nút thắt đỏ + tua, khói bạc ở rìa.
- `soul-return-sheet.png` 1774×887: **lưới thực tế là 8×2 = 16 khung (ô 222×443)**, không phải 4×2 = 8 như prompt. Dùng 16 khung, đệm vuông 443² (đáy giữ nguyên) rồi thu về 256². Khung 1–8 hồn bay, 9–16 tan thành hạt. Không lỗi chủ thể.
- Không cần dựng bản thay; không gọi Codex.

## File

- Mới: `assets/vfx-source/vothuong/` (`raw/`, `prompts/`, `process-codex-art.py`, `processed/`, `reap/` + `soul/` frame và contact sheet, `reference-{light,dark}.png`), `apps/client/public/assets/vfx-vothuong-{reap,soul,chain-strip,mark-ring}.webp`, `apps/client/src/visual-vothuong{,-timeline,-kills,-reap,-soul,-chain,-marks}.ts`, `apps/client/src/battlefield-vothuong.ts`, `apps/client/test/vothuong-vfx.test.ts`.
- Sửa (tối thiểu): `visual-effects.ts` (đăng ký + `fallback` = recipe h00H), `battlefield.ts` (tracker, ghi `death`, marker `mark` cho quái, replay `h00H`, clear), `visual-kit-atlases.json` (2 atlas), `docs/vfx-assets.md`.
- Không đụng game-core/contracts/server/content. Dòng h00H trong `TIER12_RECIPES` giữ nguyên vì còn vẽ đòn thường.

## Kit cần bổ sung

- Lớp ribbon/decal texture màu vẫn thiếu (lần thứ tư tự dựng plane `StandardMaterial`): nên đưa vào kit khi gom.
- Registry chỉ cho một module mỗi hero id nên vẫn truyền `fallback` thủ công.
- `visual-kit-spray.ts` không có preset mực/khói âm phủ nên bản này không dùng hạt: hai lớp flipbook đã có mảnh bùa/hạt hồn. Nếu muốn thêm mảnh mực văng, cần thêm preset `ink` vào kit (file dùng chung, không sửa từ module tướng).
- Sự kiện `ability` thiếu cờ kết liễu và crit; client suy ra từ `death` cùng tick. Nếu muốn chính xác tuyệt đối (ví dụ chí mạng 175%), cần thêm trường vào event ở server (đổi contract, cần quyết định).

## Trạng thái

- Đã xử lý nguồn, đóng 2 atlas (`reap` 1280² 414 KB, `soul` 2048×512 113 KB), tạo texture đơn (dải 1536×512 176 KB, vòng 512² 90 KB), viết module + test hồi quy. Chưa chạy test/typecheck/build/game (AGENTS.md).
- Chưa xem trong game: kích thước thật của móc/vòng bùa trên quái lớn/nhỏ (ortho reap 5,6, soul 5,2, dấu 3,6 là ước theo cỡ tướng 9,4/27 px mỗi đơn vị, cần chỉnh), dải ngang thắt lưng ở góc camera thật khi bắn xa/gần, hồn bay về có che Vô Thường không (sprite không ghi depth, alpha 35→100%), nền sáng/tối, giảm chuyển động (khung tĩnh 4, 7, hồn khung 10), 4 người chơi.
- Người dùng cần duyệt nhất: (1) xích + móc có đọc là xích Hắc Bạch, dải có che quái/tướng không; (2) hồn bay về đúng nhịp kết liễu, hoàn Nộ dễ thấy; (3) vòng dấu tử chỉ hiện khi sắp có phát chí mạng, không rối khi đông quái.
- Duyệt nhanh: `start-game.cmd` → `Ctrl+F5` → `?debug=1` → `__vfxReplay('h00H')` (kết liễu) hoặc `__vfxReplay('h00H', 'hit')` (quái sống).
