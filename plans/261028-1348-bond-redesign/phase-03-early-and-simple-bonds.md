---
phase: 03
title: "Duyên phận đầu trận và độ khó A"
status: implemented-unverified
effort: 10h
dependsOn: [01, 02]
---

# Phase 03 — Duyên phận đầu trận và độ khó A

## Liên kết

- Hiệu ứng và số liệu nháp: [thiết kế](../reports/design-261028-1330-duyen-phan-redesign.md), mục 1, 2, 3, 6, 7, 9, 15, 19, 20, 21.
- Helper từ phase 01: `bond-runtime.ts`, `forceCast`, `grantShield`, `healAlly(source)`.
- Áp trạng thái lên quái: `combat-status.ts` (`applyEnemyStatus`, `applyAbilityStatus`).

## Tổng quan

Làm 10 duyên phận: ba duyên phận đầu trận (người chơi gặp sớm nhất) và các duyên phận chỉ cần chỉ số, cờ hoặc hook đơn giản. U Minh làm đầy đủ trong phase này.

## Danh sách

| # | Duyên phận | Thành viên (id) | Cách làm chính |
|---|---|---|---|
| 1 | Hỏa Diệm Sơn | h00B, h00C, h00P | Lốc Thiết Phiến lan `burn`; +25% lên quái cháy; vùng `tier-fire` sau cú giẫm; khiên cha cho con (một lần mỗi wave) |
| 2 | Trần Đường Quan | h009, h00A, h00V, h00W | `onCast` → người nhà Lý +15 Nộ / −1,5 giây hồi chiêu; khiên Kim Tra +40%; +25% lên quái bị trói; miễn sát thương + hồi 50% một lần mỗi wave; Na Tra tự hồi sinh |
| 3 | U Minh | h00H, h00I, h00N, h00O, h00Y | Bộ đếm Hồn từ `onKill` của thành viên; tốc đánh theo Hồn; Kết Án bằng `sunder` mỗi 8 giây; kết liễu quái thường < 12%; gọi Quỷ Sai (`h003`); hồi sinh bằng Hồn; hồi máu theo Hồn |
| 6 | Tiên Tử | h00F, h00M, h018, h01C | `onHeal` → hồi thừa thành khiên; +15% Công khi có khiên Tiên Lộ; người được hồi +8 Nộ |
| 7 | Lưỡng Tình Tương Duyệt | h017, h018 | Cờ `extra-targets` cho Hậu Nghệ (4 mũi × 40%); chí mạng chắc lên quái `frozen`; khiên Hằng Nga lên Hậu Nghệ +50% |
| 9 | Yêu Linh | h00P, h03R, h00X, h016 | `lifesteal` 8%; ảo tiễn Đát Kỷ giảm Công quái (dùng lại cơ chế đặc tính Mạnh Bà); `onKill` hồi 2%; Kim Sí cộng chí mạng theo số quái hạ |
| 15 | Thủy Thần | h00G, h014, h01G | `status-duration` cho `slow`; +20% lên quái chậm; phản kích 35%; sóng thần Cộng Công `frozen` quái đang chậm |
| 19 | Trục Nhật | h017, h01I | `boss-damage` +30%; Hậu Nghệ để lại `burn`; Khoa Phụ `taunt` đầu lĩnh/boss mỗi 15 giây; hạ đầu lĩnh/boss thì cả đội `haste` |
| 20 | Chiến Phủ Hồng Hoang | h011, h01B | Đòn Hình Thiên gây `sunder`; Khai Thiên +25%; Chiến Ý rộng hơn; một người tử trận thì người kia đầy Nộ |
| 21 | Bảo Liên Đăng | h03Q, h00U | Kỹ năng Trầm Hương → Dương Tiễn `empower` + `armorBuff`; Tam Tiêm gây `sunder` |

## Yêu cầu

- Mỗi duyên phận một file `packages/game-core/src/bonds/<ten>.ts`, đăng ký trong `bonds/index.ts`; điền `effects` tương ứng trong `content/bond-design.ts`.
- Hiệu ứng của từng mốc chỉ chạy khi `level` đạt mốc đó.
- Mọi kích hoạt nhìn thấy được đều phát `bond-trigger` với `kind` có trong bảng ánh xạ của phase 02.
- Kết liễu và % máu tối đa không áp cho boss; đầu lĩnh theo trần ghi trong thiết kế.
- **Cờ `extra-targets`:** đọc trong hệ đòn đánh thường (`attack-geometry.ts`) dưới dạng số mũi phụ và hệ số sát thương; dùng chọn mục tiêu sẵn có của đòn nảy/đa mục tiêu, không tạo đường đạn mới.
- **Đơn vị triệu hồi Quỷ Sai:** dùng cùng đường tạo đơn vị với Kim Thân Hầu Vương (`douzhan-combat.ts`, `summonKind`, `summonDuration`), sprite `h003`. Có `summonKind` riêng để không tính vào mốc.
- **Hồi sinh** (Na Tra, U Minh mốc 5): dùng lại cách hồi sinh của `nuwa-combat.ts` / `thaibach-combat.ts`, chèn trong hook tướng tử trận, trước khi đặt `respawn`.

## File liên quan

**Tạo mới:** `bonds/hoa-diem-son.ts`, `bonds/tran-duong-quan.ts`, `bonds/u-minh.ts`, `bonds/tien-tu.ts`, `bonds/luong-tinh-tuong-duyet.ts`, `bonds/yeu-linh.ts`, `bonds/thuy-than.ts`, `bonds/truc-nhat.ts`, `bonds/chien-phu-hong-hoang.ts`, `bonds/bao-lien-dang.ts`, `packages/game-core/test/bonds-early.test.ts`.

**Sửa:** `bonds/index.ts`, `content/bond-design.ts`, `attack-geometry.ts` (cờ `extra-targets`), `combat.ts` (chí mạng chắc lên quái `frozen`, hồi sinh), và call site khiên/hồi máu của các thành viên nếu phase 01 chưa đổi.

## Các bước

1. U Minh trước, vì đây là duyên phận người dùng muốn giữ và nó kiểm tra đủ bộ đếm, triệu hồi lẫn hồi sinh.
2. Trần Đường Quan và Hỏa Diệm Sơn (đầu trận).
3. Bảo Liên Đăng, Chiến Phủ, Trục Nhật (chỉ số, cờ, trạng thái).
4. Thủy Thần, Yêu Linh, Tiên Tử, Lưỡng Tình.
5. Test cho từng duyên phận.

## Test (agent viết, người dùng chạy)

- **U Minh:**
  - Hồn tăng khi thành viên hạ quái, reset ở `beginWave`, trần 30.
  - Kết Án áp `sunder` lên tinh anh nhiều máu nhất.
  - Kết liễu không áp cho đầu lĩnh và boss.
  - Quỷ Sai được gọi và không tính vào mốc.
  - Hồi sinh tiêu hết Hồn.
- **Trần Đường Quan:** người nhà Lý nhận Nộ khi một người thi triển; miễn sát thương + hồi chỉ một lần mỗi wave.
- **Hỏa Diệm Sơn:** lốc làm lan `burn`.
- **Lưỡng Tình:** số mũi phụ đúng; quái `frozen` luôn bị chí mạng.
- **Thủy Thần:** thời gian `slow` dài hơn; sóng thần đóng băng quái đang chậm.
- **Trục Nhật:** `taunt` có hồi chiêu; `haste` khi hạ đầu lĩnh.
- **Chiến Phủ / Bảo Liên Đăng:** có `sunder`; người còn lại đầy Nộ khi đồng đội tử trận.
- Mốc thấp không kích hiệu ứng của mốc cao.

## Kiểm tra của người dùng

- `npm run typecheck`, `npm test`.
- Trong game:
  - Kim Tra + Mộc Tra: thấy Nộ truyền khi một người thi triển.
  - Vô Thường + Mạnh Bà: dải bộ đếm hiện Hồn và tăng dần.
  - Thiết Phiến + Hồng Hài Nhi: lửa lan theo lốc.

## Rủi ro

- Hồi sinh trong hook tử trận chạy trước phần reset buff, khiến trạng thái bị dọn sai. Đặt hook sau phần reset và trước khi đặt `respawn`.
- `extra-targets` làm đổi hành vi đòn đánh của Hậu Nghệ khi không có duyên phận. Chỉ áp khi có cờ.

## Ghi chú triển khai (2026-10-28)

Đã viết mã và test (`packages/game-core/test/bonds-early.test.ts`); chưa chạy typecheck/test/game. Mười duyên phận có handler trong `bonds/`, đăng ký ở `bonds/index.ts`. Hook mới trong runtime: `damageMultiplier`, `executes`, `onHit`, `shieldMultiplier`, `onHeroHit`, `rescue` (cứu tướng khi sắp chết, thay cho hồi sinh sau khi chết), `onAttack`, `onTick`. Hiệu ứng theo bộ đếm và chỉ số nằm trong `TIER_EFFECTS` của `content/bond-design.ts`.

Xấp xỉ so với thiết kế (cần người dùng đánh giá khi chơi):

- Hỏa Diệm Sơn: lốc "nảy" được xấp xỉ bằng việc lan Bỏng từ quái đang cháy gần mục tiêu sang tối đa 2 quái lân cận mỗi con.
- Lưỡng Tình: chí mạng chắc chắn lên quái đóng băng thành nhân sát thương bằng hệ số chí mạng của Hậu Nghệ (có thể chồng lên chí mạng tự nhiên); 4 mũi phụ qua hook `onAttack`, không dùng cờ `extra-targets`.
- Thủy Thần mốc 2: `status-duration` +50% cũng kéo dài Phá Giáp và Bỏng của thành viên, không chỉ làm chậm.
- Tiên Tử: chỉ nghe được hồi máu đi qua `healAlly`/nhánh heal chung (Mẫu Đơn, Tinh Vệ, Hằng Nga, Khổng Tước, Xích Tùng Tử, Kim Thân La Hán, Sa Tăng, Trầm Hương); Nữ Oa chưa nối.
- Trần Đường Quan: "trói" của Mộc Tra hiểu là trạng thái `root` bất kỳ; Linh Lung Bảo Tháp dùng `rescue` (hp 50%, miễn sát thương 2,5 giây, một lần mỗi đợt cho cả đội); Na Tra tự cứu một lần mỗi đợt.
- Quỷ Sai là `summonKind: 'bond-summon'` (ẩn khỏi danh sách dự bị, không chọn được, không tính mốc), dùng AI tướng thường; chỉ số = 60% Công, 50% máu của Chung Quỳ.
- Chiến Phủ: Phá Giáp của Hình Thiên 20% trong 3 giây (số nháp).

Chưa làm (ghi để phase sau hoặc quyết định):

- U Minh mốc 5: "lượng hồi của Ngũ Đạo Tướng Quân +1%/Hồn".
- Chiến Phủ: "Chiến Ý mở rộng phạm vi".
- Yêu Linh: ngoài kill-window dùng `critBlessing` làm xấp xỉ cho "5% mỗi quái hạ trong 5 giây".
- VFX của `bond-trigger` (hiện chỉ toast).

### Cập nhật cùng ngày

Đã làm thêm: Ngũ Đạo hồi +1%/Hồn (`healMultiplier`), Chiến Ý mở rộng 25% (`areaScale`), VFX vòng sáng cho `bond-trigger` (`visual-bond-trigger.ts`). **Trục Nhật không thể kích hoạt** trong catalog hiện tại, xem báo cáo bàn giao.
