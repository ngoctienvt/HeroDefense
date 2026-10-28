---
phase: 05
title: "Bộ đếm dài hạn và các duyên phận còn lại"
status: implemented-unverified
effort: 9h
dependsOn: [04]
---

# Phase 05 — Bộ đếm dài hạn và phần còn lại

## Liên kết

- Thiết kế: mục 4, 5, 8, 10, 14, 17.
- Công thức ghép: Hậu Tây Du được ghép từ Thỉnh Kinh (Ngộ Không → Đấu Chiến; Đường Tăng → Kim Thiền; Bát Giới → Tịnh Đàn; Sa Tăng → Kim Thân La Hán; Tiểu Bạch Long → Bát Bộ).

## Tổng quan

Làm 6 duyên phận còn lại: các duyên phận dùng bộ đếm giữ suốt trận (Kiếp Nạn, Điền Hải), bộ đếm Thần Vị, Phật Quang và nổ dây chuyền. Sau phase này đủ 27 duyên phận.

## Danh sách

| # | Duyên phận | Thành viên (id) | Cách làm chính |
|---|---|---|---|
| 4 | Thỉnh Kinh | h00J, h00K, h00L, h00R, h00S | Kiếp Nạn: +1 mỗi wave thắng, +1 mỗi đầu lĩnh, +5 mỗi boss (chỉ khi đang kích hoạt); Bát Giới gánh 30% sát thương của Đường Tăng; Sa Tăng ưu tiên Đường Tăng; +0,5% Công mỗi Kiếp; Đường Tăng gây `sunder` 15%; Ngộ Không +50% Công khi Đường Tăng tử trận; cột mốc 9/18/36 |
| 5 | Hậu Tây Du Ký | h03T, h03U, h03V, h012, h013 | Dùng chung Kiếp Nạn và nhận toàn bộ buff Kiếp; miễn sát thương 2 giây khi dưới 30% (một lần mỗi wave); +30% lên quái trong `golden-bowl`; Đấu Chiến gọi 4 Kim Thân; cột mốc áp cho cả 5 |
| 8 | Phong Thần Diễn Nghĩa | h00T, h00U, h00V, h019 | `double-strike` 30% cho Dương Tiễn và Na Tra; Thiên Lôi nảy thêm 3, +20%; Khương Tử Nha `sealed` 2 giây + `stun` 1,2 giây tinh anh nhiều máu nhất; quái đó chết trong 6 giây thì +1 Thần Vị (tối đa 5, reset mỗi wave) |
| 10 | Phật Quang Phổ Chiếu | h012, h013, h016 | `damage-reduction` 15% cho thành viên; `onCast` của thành viên → mọi tướng trong đội hồi 4% máu tối đa, quái trúng kỹ năng bị `sunder` 20% trong 4 giây |
| 14 | Chân Hỏa | h00C, h00V, h010, h01H | `status-duration` cho `burn` +50%; +20% lên quái cháy; tướng đang có khiên Xích Tùng Tử gây `burn` bằng đòn đánh thường; quái chết khi đang cháy nổ 15% máu tối đa của nó và gây `burn` (tối đa 2 bước, không boss); Hỏa Lưu Tinh +20% |
| 17 | Viêm Đế Huyết Mạch | h00M, h01E | Tinh Vệ `extra-targets` 5, +12% tốc đánh, đòn xuyên, gây `poison` của Thần Nông; quái chết khi trúng độc → +1 Điền Hải (+1% Công suốt trận, tối đa 30); Mộc Linh biến mất hồi 20% cho Thần Nông |

## Yêu cầu

- **Kiếp Nạn và Điền Hải** lưu trên `Player.bondState` theo trận, không gắn vào `Unit`, nên không mất khi ghép hoặc bán. Kiếp Nạn tăng khi Thỉnh Kinh **hoặc** Hậu Tây Du đang kích hoạt.
- **Mốc Kiếp Nạn** (9/18/36) và các điểm cộng là hằng số trong `content/bond-design.ts`, vì số wave sắp đổi.
- **Thần Vị:** cần lưu id quái bị Phong Thần và hạn 6 giây trên `bondState` (không phải trạng thái mới trên quái). Kiểm tra trong `bondOnKill`.
- **Gánh sát thương** của Bát Giới: chuyển 30% sát thương tướng nhận vào Bát Giới tại điểm trừ máu tướng trong `combat.ts`; không chuyển nếu Bát Giới đã chết.
- **Nổ dây chuyền:** chạy theo hàng đợi trong cùng tick, đếm độ sâu, tối đa 2; quái chết vì nổ chỉ nổ tiếp nếu độ sâu chưa vượt.

## File liên quan

**Tạo mới:** `bonds/thinh-kinh.ts`, `bonds/hau-tay-du-ky.ts`, `bonds/phong-than-dien-nghia.ts`, `bonds/phat-quang-pho-chieu.ts`, `bonds/chan-hoa.ts`, `bonds/viem-de-huyet-mach.ts`, `packages/game-core/test/bonds-counters.test.ts`.

**Sửa:** `bonds/index.ts`, `content/bond-design.ts`, `combat.ts` (gánh sát thương, `double-strike`, nổ dây chuyền), `khuongtu-nha-combat.ts` (phong ấn mục tiêu theo cờ), `kimthien-combat.ts` (nhận biết quái trong Bình Bát), `shennong-combat.ts` (Mộc Linh hồi Thần Nông), `attack-geometry.ts` (Tinh Vệ đòn xuyên nếu chưa có).

## Các bước

1. Kiếp Nạn và Thỉnh Kinh, rồi Hậu Tây Du, kèm test ghép tướng giữ bộ đếm.
2. Phật Quang (giảm sát thương, hồi máu cả đội và phá giáp khi thi triển).
3. Phong Thần (Thần Vị, `double-strike`).
4. Chân Hỏa (nổ dây chuyền có giới hạn).
5. Viêm Đế (Điền Hải).
6. Test từng duyên phận.

## Test (agent viết, người dùng chạy)

- **Thỉnh Kinh / Hậu Tây Du:**
  - Kiếp tăng đúng nguồn và chỉ khi đang kích hoạt.
  - Ghép Ngộ Không ×2 + Tiểu Bạch Long → Đấu Chiến vẫn giữ Kiếp.
  - Cột mốc mở đúng lúc.
- **Bát Giới:** gánh 30% chỉ khi còn sống.
- **Phật Quang:** thành viên giảm 15% sát thương nhận; mỗi lần thành viên thi triển, cả đội hồi 4% và quái trúng kỹ năng bị `sunder`; lần thi triển do `forceCast` của duyên phận khác vẫn tính, nhưng không kích đệ quy.
- **Chân Hỏa:** tướng có khiên Xích Tùng Tử gây `burn` bằng đòn thường; mất khiên thì thôi.
- **Phong Thần:** Thần Vị chỉ tăng khi quái bị phong chết trong 6 giây; trần 5; reset mỗi wave.
- **Chân Hỏa:** nổ tối đa 2 bước; boss không nổ.
- **Viêm Đế:** Điền Hải tăng khi quái chết lúc trúng độc, trần 30, giữ qua các wave.

## Kiểm tra của người dùng

- `npm run typecheck`, `npm test`.
- Trong game:
  - Đội Tây Du: dải hiện Kiếp Nạn tăng sau mỗi wave.
  - Ba tướng Phật: mỗi lần một người thi triển, cả đội hồi máu và quái trúng kỹ năng có hiệu ứng phá giáp.

## Rủi ro

- Nổ dây chuyền gây đột biến sát thương khi trận đông. Giữ trần độ sâu và loại boss; đo FPS khi người dùng kiểm tra.
- Gánh sát thương tạo vòng lặp nếu cả hai cùng nhận sát thương chuyển. Chỉ chuyển một chiều, từ Đường Tăng sang Bát Giới.

## Ghi chú triển khai (2026-10-28)

Đã viết mã và test (`packages/game-core/test/bonds-counters.test.ts`); chưa chạy typecheck/test/game. Sáu handler: `thinh-kinh`, `hau-tay-du-ky`, `phong-than-dien-nghia`, `phat-quang-pho-chieu`, `chan-hoa`, `viem-de-huyet-mach`; phần Kiếp Nạn dùng chung ở `kiep-shared.ts` (khi cả hai duyên cùng kích hoạt chỉ Thỉnh Kinh cộng, tránh đếm đôi).

Hạ tầng thêm: kênh `move-speed` (chỉ duyên phận dùng, đọc ở `unitSpeed`), hiệu ứng `counter-threshold`, và các hook `onBasicAttack`, `redirect` (Bát Giới gánh sát thương, một chiều), `extraClones`, `onCrit`, `areaScale`, `summonScale`, `onSummonEnd`. Contract thêm `BondState.dienTich` và `BondState.thanViMark`.

Xấp xỉ: "đánh hai lần" của Phong Thần là 30% đòn thường thêm một đòn; Thiên Lôi nảy thêm 3 mục tiêu là 3 đòn riêng cộng 20% lên mục tiêu chính; Tinh Vệ "đánh 6 mục tiêu" là đòn thường thêm 5 đòn 50% (đòn xuyên chưa thêm riêng); Phật Quang chỉ tính cú thi triển thật (cú thi triển do duyên phận ép không kích duyên phận nào, nên không có đệ quy). Bỏ: "Hỏa Lưu Tinh +20% tỉ lệ" của Chân Hỏa, vì kit Chúc Dung hiện không có tỉ lệ kích hoạt để tăng.
