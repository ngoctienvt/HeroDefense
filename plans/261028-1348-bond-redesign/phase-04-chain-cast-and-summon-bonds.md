---
phase: 04
title: "Duyên phận thi triển dây chuyền và triệu hồi"
status: implemented-unverified
effort: 12h
dependsOn: [03]
---

# Phase 04 — Thi triển dây chuyền và triệu hồi

## Liên kết

- Thiết kế: mục 11, 12, 13, 16, 18, 22, 23, 24, 25, 26, 27.
- `forceCast` (phase 01); tạo triệu hồi theo `douzhan-combat.ts` (Kim Thân Hầu Vương) và `tuong-than-combat.ts` (Huyết Thi).
- Vùng có sẵn: `chucdung-lava`, `phoenix-carpet`, `fuxi-bagua`.

## Tổng quan

Làm 11 duyên phận chủ yếu dựa vào thi triển cưỡng bức, Nộ dây chuyền và đơn vị triệu hồi có sẵn.

## Danh sách

| # | Duyên phận | Thành viên (id) | Cách làm chính |
|---|---|---|---|
| 11 | Thiên Đình | h00E, h03S, h015, h01A, h01J | Thiên Quy: `onShield`/tăng giáp → thành viên +4 giáp 5 giây; gọi 2 Thiên Binh (`h004`) đầu wave; Thái Bạch +10% giáp và hồi sinh nhanh hơn 30%; Tây Vương Mẫu `extra-targets` 4; Thiên Binh +50% ở mốc 5 |
| 12 | Nữ Thần | h014, h01A, h01C, h01J | `onCast` → cả đội +10 Nộ / −1 giây hồi chiêu; khiên và hồi máu của thành viên +30%; buff Tây Vương Mẫu dài hơn 50%; Nữ Oa hồi đầy khi dưới 50% (hồi chiêu 45 giây); Hậu Thổ mỗi 20 giây đánh 500% kèm `stun` 2 giây (boss 0,5 giây) |
| 13 | Long Tộc Huyết Mạch | h00L, h00Q, h00Z, h01K | Long Uy +1 mỗi `onCast`; `skill-damage` theo tầng; đủ 10 tầng → `forceCast` toàn bộ thành viên; Ứng Long thi triển thêm 2 lần; Chúc Long 15% trừ 8% máu tối đa (không boss, đầu lĩnh trần 3%) |
| 16 | Đạo Vô Nhai | h00D, h019, h01D | Khi Khương Tử Nha/Phục Hy thi triển, Lã Động Tân phóng 3 kiếm hỏa (dùng lại đặc tính Phi Kiếm); +50% lên quái có liên kết Nhân Quả; Phục Hy hồi 30% |
| 18 | Hoàng Thiên Ứng Long | h00Z, h01F | Hiên Viên thi triển → `forceCast` Ứng Long vào cùng mục tiêu; cự kiếm +30% sát thương chí mạng; Hiên Viên chí mạng → Ứng Long +10 Nộ |
| 22 | Tứ Hầu Hỗn Thế | h00R, h012, h03Y | Kim Thân Hầu Vương nhận 100% chỉ số; Ngộ Không gọi 1 Kim Thân mỗi lần thi triển; Lục Nhĩ `forceCast` chính kỹ năng của mình khi Ngộ Không/Đấu Chiến thi triển |
| 23 | Phong Vũ Lôi Điện | h00Q, h00T, h03W, h03X | `skill-damage` +10%; kỹ năng Long Vương/Phong Bá gây `slow` 30%; Lôi Chấn Tử/Điện Mẫu +30% lên quái chậm; điện tích Điện Mẫu cộng cho Cuồng Phong |
| 24 | Thiên Địa Nhân Đạo | h015, h019, h040 | Thần Lôi Phù rộng hơn, chí mạng 30%; bộ đếm Tam Tài: đủ 3 thành viên đã thi triển → `forceCast` Trương Đạo Lăng ×1,5 |
| 25 | Âm Khí Trùng Thiên | h00Y, h01K, h03Z | Mất 1%/giây khi giao tranh, +30% Công, +50% hồi nhận; Huyết Thi +50% Công và máu; thành viên tử trận để lại Huyết Thi; Chúc Long `burn` 6% máu tối đa (không boss) |
| 26 | Tam Đại Thần Điểu | h03R, h016, h041 | Khổng Tước hồi +30%; Kim Sí cộng sát thương Tật Phong khi bị đánh; Phượng Hoàng Niết Bàn một lần mỗi wave; Chân Hỏa 30% liên kích |
| 27 | Thần Hỏa | h01H, h041 | +30% lên quái cháy; vùng dung nham và thảm lửa kéo dài +50%; mỗi 35 giây `forceCast` Phượng Hoàng ×0,5 |

## Yêu cầu

- **`forceCast` dây chuyền:** handler đặt cờ `bondTriggered`, nên các lần thi triển sinh ra từ duyên phận không kích lại duyên phận đó. Long Ngâm, Hoàng Thiên Ứng Long, Tứ Hầu và Thiên Địa Nhân đều phải có test chặn vòng lặp.
- **Hệ số sức mạnh** (×0,5, ×1,5): truyền qua tham số của `forceCast`, nhân vào `skillDamageMultiplier` cho lần thi triển đó. Không đổi số liệu kit.
- **Thời gian vùng:** kéo dài tại nơi tạo vùng (`chucdung-combat.ts`, `phuong-hoang-combat.ts`) bằng hệ số đọc từ mods duyên phận; không viết lại kit.
- **Đơn vị triệu hồi:** Thiên Binh (`h004`) dùng đường tạo đơn vị như Kim Thân Hầu Vương, có `summonKind` riêng và `summonDuration`. Triệu hồi không thuộc ô, không tính mốc, và được dọn khi kết thúc wave như các triệu hồi hiện có.
- **Phượng Hoàng Niết Bàn:** đã có `phoenixEgg` trong kit. Kiểm tra cơ chế đó trước khi thêm; nếu kit đã có hồi sinh, duyên phận chỉ thêm một lần nữa mỗi wave hoặc tăng sức mạnh, không làm trùng lặp.
- **Nữ Oa hồi đầy:** dùng hook nhận sát thương của tướng (`combat.ts`, nơi trừ máu tướng) với cờ hồi chiêu trên `bondState`.

## File liên quan

**Tạo mới:** `bonds/thien-dinh.ts`, `bonds/nu-than.ts`, `bonds/long-toc-huyet-mach.ts`, `bonds/dao-vo-nhai.ts`, `bonds/hoang-thien-ung-long.ts`, `bonds/tu-hau-hon-the.ts`, `bonds/phong-vu-loi-dien.ts`, `bonds/thien-dia-nhan-dao.ts`, `bonds/am-khi-trung-thien.ts`, `bonds/tam-dai-than-dieu.ts`, `bonds/than-hoa.ts`, `packages/game-core/test/bonds-chain.test.ts`.

**Sửa:** `bonds/index.ts`, `content/bond-design.ts`, `bond-runtime.ts` (hệ số sức mạnh cho `forceCast`), `combat.ts` (hook nhận sát thương của tướng), `douzhan-combat.ts` (chỉ số Kim Thân theo cờ), `tuong-than-combat.ts` (Huyết Thi theo cờ, Huyết Thi khi thành viên tử trận), `chucdung-combat.ts`, `phuong-hoang-combat.ts` (thời gian vùng), `lucnhi-combat.ts` nếu cần cho `forceCast`.

## Các bước

1. Thêm hệ số sức mạnh cho `forceCast` và test chặn đệ quy chung.
2. Nữ Thần và Long Tộc (Nộ / thi triển toàn đội).
3. Hoàng Thiên Ứng Long, Tứ Hầu, Thiên Địa Nhân, Đạo Vô Nhai.
4. Thiên Đình và Âm Khí (triệu hồi).
5. Phong Vũ Lôi Điện, Tam Đại Thần Điểu, Thần Hỏa.
6. Test từng duyên phận.

## Test (agent viết, người dùng chạy)

- Long Ngâm thi triển mỗi thành viên đúng một lần và không tự cộng Long Uy từ các lần thi triển cưỡng bức.
- Nữ Thần: một lần thi triển cho mỗi tướng trong đội +10 Nộ; Nữ Oa hồi đầy đúng theo hồi chiêu.
- Thiên Địa Nhân: chỉ kích khi đủ 3 thành viên khác nhau đã thi triển, rồi reset.
- Thiên Binh và Huyết Thi không tính vào mốc và biến mất khi hết thời gian.
- Âm Khí: chỉ mất máu khi giao tranh; Chúc Long không đốt % máu boss.
- Thần Hỏa: vùng kéo dài đúng hệ số; Phượng Hoàng thi triển theo chu kỳ.

## Kiểm tra của người dùng

- `npm run typecheck`, `npm test`.
- Trong game:
  - Long Vương + Tiểu Bạch Long: dải hiện Long Uy, và đủ 10 thì cả hai cùng thi triển.
  - Hiên Viên + Ứng Long: Ứng Long thi triển ngay sau tuyệt kỹ của Hiên Viên.

## Rủi ro

- Thi triển cưỡng bức tướng windup bị từ chối khi đang có `pendingAbility`. Handler phải bỏ qua lặng lẽ và chỉ ghi log debug.
- Quá nhiều triệu hồi làm giảm FPS. Giữ trần số triệu hồi mỗi người chơi theo mức hiện có.

## Ghi chú triển khai (2026-10-28)

Đã viết mã và test (`packages/game-core/test/bonds-chain.test.ts`); chưa chạy typecheck/test/game. Mười một handler mới trong `bonds/`, đăng ký ở `bonds/index.ts`.

Hạ tầng thêm:

- `forceCast(state, unit, targetId, scale)`: hệ số sức mạnh đi theo `pendingAbility.bondScale` và được áp qua `gearRuntime.castScale` đúng lúc kỹ năng giải quyết.
- Hook `healMultiplier` (qua `healAlly` có `{ state, source }`; nhánh heal chung của `combat.ts` nay cũng đi qua đó, nên không còn gọi `bondOnHeal` riêng).
- `cooldownReady` (hồi chiêu theo `state.elapsed`) và `summonBondUnit` nhận hệ số Công/máu. Triệu hồi của duyên phận có `abilityCooldown` rất lớn nên không bao giờ thi triển kỹ năng (tránh Kim Thân Hầu Vương mượn kit Đấu Chiến để sinh phân thân).

Xấp xỉ so với thiết kế:

- Nữ Thần: Hậu Thổ mỗi 20 giây tung một đợt địa chấn 500% Công quanh quái gần nhất (không chờ "đòn kế tiếp"); Nữ Oa hồi đầy qua `rescue` và qua hook bị đánh khi dưới 50% máu, chung hồi chiêu 45 giây.
- Long Tộc: Ứng Long thi triển thêm 2 lần sẽ bị từ chối lặng lẽ nếu lần đầu đang windup; đòn "mất 8% máu tối đa" là sát thương chuẩn một lần.
- Đạo Vô Nhai: 3 kiếm hỏa là 3 đòn 70% Công cộng Bỏng 3 giây (chưa dùng đúng đặc tính Phi Kiếm); +50% áp lên mọi đòn của Khương Tử Nha vào quái đang liên kết Nhân Quả của Phục Hy.
- Tứ Hầu: Kim Thân Hầu Vương là bản triệu hồi của Đấu Chiến (`h012`) với 100% Công/máu của Ngộ Không.
- Thiên Địa Nhân: bộ đếm Tam Tài lưu bằng cờ `24:tam:<heroId>` trong `usedThisWave`, nên cũng reset đầu mỗi đợt.
- Âm Khí: mất máu tối thiểu còn 1 HP, không bao giờ tự giết.
- Tam Đại Thần Điểu: Niết Bàn của duyên phận là mạng thêm một lần mỗi đợt sau khi kit tự có trứng Phượng Hoàng đã dùng hết.
- Thần Hỏa: kéo dài vùng bằng cách nhân thời gian còn lại lúc quét thấy vùng mới, không sửa kit.

Chưa làm (cần quyết định hoặc phase sau):

- Thiên Đình: Thái Bạch hồi sinh nhanh hơn 30%; Tây Vương Mẫu đánh 5 mục tiêu (cần hook đòn thường của bà).
- Nữ Thần: buff của Tây Vương Mẫu kéo dài thêm 50%.
- Hoàng Thiên Ứng Long: Ứng Long +10 Nộ khi Hiên Viên chí mạng.
- Phong Vũ Lôi Điện mốc 4 (điện tích Điện Mẫu → Cuồng Phong); Thần Lôi Phù rộng thêm 20% (Thiên Địa Nhân mốc 2).
- Âm Khí: +50% hồi máu nhận; Huyết Thi +50% và Huyết Thi khi thành viên tử trận.
- Tam Đại Thần Điểu: Kim Sí cộng Tật Phong khi bị đánh; Chân Hỏa liên kích 30%.

### Cập nhật cùng ngày

Đã làm thêm các mục chưa làm: Thái Bạch (hồi chiêu −30% ở mốc 4, xấp xỉ "hồi sinh nhanh hơn"), Tây Vương Mẫu đánh 5 mục tiêu (mốc 5), buff Tây Vương Mẫu +50% thời gian, Ứng Long +Nộ khi Hiên Viên chí mạng, điện tích Điện Mẫu → Cuồng Phong, Thần Lôi Phù rộng 20%, Âm Khí (+50% hồi nhận, Huyết Thi +50% và Huyết Thi khi tử trận), Kim Sí cộng Tật Phong, Phượng Hoàng liên kích 30%. **Một số mốc không đạt được** vì danh tính bị thay thế, xem báo cáo bàn giao.
