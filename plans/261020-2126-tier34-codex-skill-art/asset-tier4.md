# Danh mục ảnh tuyệt kỹ — 13 tướng bậc 4

Đọc cùng [hợp đồng bổ sung](art-contract.md), [hợp đồng gốc](../261020-1054-tier56-codex-ultimate-art/art-contract.md) và [chứng cứ combat](../reports/scout-261020-2126-tier34-combat-evidence.md). Quy ước dòng, loại, đường dẫn, `Cho phép:` và `Số lượng là mô-típ.` giống [inventory bậc 3](asset-tier3.md). Đây là đặc tả cần tạo, chưa có ảnh nào được nghiệm thu.

## 1. Tôn Ngộ Không — h00R — `ton-ngo-khong` — 6 ảnh

**Asset dùng chung:** `shared-armor-break-mark` (sunder 30% 4s), `shared-slow-mark` (50% 1,5s).

**Nguồn:** case `h00R` + `stepMonkeyClone`; đường thẳng dài 9 × rộng 3; xóa phân thân cũ rồi tạo **2** unit `monkey-clone` tại aim ±1,6, sống 6s; đòn phân thân là event `attack` `monkey-clone-h00R`, quét trước mặt R3,2. **Không choáng.** Thân phân thân dùng atlas h00R sẵn có.

**Nhận diện:** Như Ý Kim Cô Bổng đỏ son hai đầu bọc vàng, mây cân đẩu vàng, lông tơ khỉ thổi hóa phân thân. **Khác với:** Đấu Chiến h012 (thiết bổng vàng đồng, pháp thân Phật, ba phân thân, dấu chân pháp ấn), Lục Nhĩ h03Y (ma côn hắc kim, khói tím). Màu `#1C1410 #7A1E16 #C9932E #F2C94C #FFF3D1`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `ruyi-giant-staff` | T | Cây gậy dài thẳng nằm ngang, thân đỏ son có vân mây vàng, hai đầu bọc vàng, nhìn nghiêng nhẹ từ trên; đầu đập ở bên phải. Runtime đặt trên plane dọc làn, dựng đứng rồi quật xuống theo `direction`. Cho phép: cây gậy như vật thể không người cầm. |
| `ruyi-slam-burst-sheet` | S16 | Mây vàng bị nén → đá vỡ bật thành dải dọc theo chiều gậy → mây cân đẩu cuộn tung → bụi lắng. Chỉ lớp va chạm; gậy dựng riêng bằng ảnh trên. |
| `ruyi-lane-crack` | T | **Ngoại lệ T top-down:** vết gậy dập và đá nứt dài, mây vàng mỏng len trong khe, đầu bên phải; phân bố trên dải dài 9 rộng 3. Khác vết nứt `staff-lane-fracture` của Đấu Chiến ở mây vàng và màu đỏ son. |
| `hair-clone-puff-sheet` | S8 | Một nhúm lông tơ vàng bay xoáy → bùng thành khói mây vàng tròn → tan, để lộ chỗ phân thân. Không vẽ con khỉ; đặt tại vị trí từng unit `monkey-clone` mới xuất hiện trong snapshot. |
| `clone-sweep-slash-sheet` | S8 | Một vệt gậy vàng kim quét cung ngắn phía trước, bụi mây nhỏ → tan; cho từng event `monkey-clone-h00R`, xoay theo hướng tới `target`. |
| `clone-unravel-sheet` | S8 | Khói vàng xoáy thu lại thành lông tơ bay đi → tan; khi unit `monkey-clone` biến mất khỏi snapshot (hết 6s, chết hoặc bị thay). |

## 2. Đường Tăng — h00S — `duong-tang` — 5 ảnh

**Asset dùng chung:** `shared-stun-sheet` (1,2s, chỉ khi `tryHardControl` thành công), `shared-slow-mark` và `shared-vulnerable-mark` (vùng `tier-gold`).

**Nguồn:** case `h00S`; tròn R6 tại aim; vùng `groundEffects kind:'tier-gold'` R6, 4,5s, slow 50%, `pureLand` +25%. Không còn hút 8% Máu hiện tại.

**Nhận diện:** vòng kim cô mảnh chạm hoa văn chụp xuống rồi siết, pháp trận chữ Vạn, tiếng chuông chùa. **Khác với:** Kim Thiền h013 (cùng nhân vật kiếp trước: bát vàng úp, sen chín cánh, hút vào), Na Tra h00V (vòng Càn Khôn dày, rực lửa, nảy qua lại), Chung Quỳ h00N (ấn vuông chu sa). Màu `#3A1A12 #8E2A1E #C99A3A #F3D27A #FFF6DA`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `sutra-chant-sheet` | S8 | Hạt tràng gỗ đàn hương và vòng sóng âm vàng ngân ra từ một điểm → lan → tắt. Không vẽ người, không vẽ tích trượng. Tại caster. |
| `golden-fillet-tighten-sheet` | S16 | Vòng kim cô vàng mảnh rất lớn hiện trên cao (elip theo góc 42°) → hạ xuống → siết nhỏ lại nhanh → lóe → tan thành bụi vàng. Cho phép: vòng kim cô như vật thể. Tại aim, đường kính khung đầu khớp R6. |
| `swastika-dharma-ground` | D | Pháp trận vàng với chữ Vạn ở tâm và vòng hoa văn đơn giản, nét khối rõ, tâm chữ không che quái; giữ theo vùng `tier-gold` 4,5s, runtime đặt R6. |
| `bell-chime-ripple-sheet` | L8 | Gợn sóng âm chuông chùa vàng loang nhẹ trên mặt đất, nhịp lan nối vòng; runtime đặt vài điểm trong vùng suốt 4,5s. Không thành vòng sáng trắng. |
| `fillet-squeeze-hit-sheet` | S8 | Tia vàng nén ép quanh một quái, bụi vàng bật → tan; tại từng quái trong `targets`. |

## 3. Lôi Chấn Tử — h00T — `loi-chan-tu` — 5 ảnh

**Asset dùng chung:** không có (burn sét là vật chất riêng).

**Nguồn:** case `h00T` + `tier-skill-pulses.ts`; barrage tại aim R6,5, 10 nhịp trong 2,5s. Main event `targets` rỗng; mỗi nhịp có quái phát `tier3-tier4-pulse-h00T`, trúng R1,5, gắn `burn` chuẩn 3s trên quái. **Không choáng, không trường điện trên đất.**

**Nhận diện:** mây đen tích điện, sét vàng–tím phân nhánh như lông vũ của cánh Phong Lôi, đá Thổ vỡ. **Khác với:** Khương Tử Nha h019 (thần lôi trắng ngọc viền vàng, nét bút), Trương Đạo Lăng h040 (sét Bắc Đẩu), Tinh Vệ h00M (barrage đá). Màu `#1A1630 #3F3570 #7D5BD6 #F2C744 #FFF3B0`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `storm-wing-cloud-sheet` | L8 | Mây đen tím cuộn dày, tia điện vàng chạy trong bụng mây, mép mây như lông vũ xòe, vòng lặp liền; treo cao trên aim suốt 2,5s. |
| `storm-warning-ground` | D | Vòng cảnh báo tím sẫm với vết cháy điện và hoa văn lông vũ sấm ở mép, tâm thưa; runtime đặt R6,5, sống tối đa 2,5s. |
| `wingfeather-bolt` | T | Một tia sét vàng–tím ngoằn ngoèo có nhánh xòe như lông vũ, đầu đánh dày ở bên phải; runtime dựng dọc từ mây xuống tâm từng pulse. |
| `thunder-strike-hit-sheet` | S8 | Sét chạm đất → vòng điện tích nổ R1,5 kèm đá vỡ văng → khói tím tan; tại `x/z` của từng pulse event. |
| `static-burn-sheet` | P16 | Hồ quang tím vàng nhỏ bò quanh hai sườn và chân quái, tia lóe theo nhịp; giữ theo `burn` có `trueDamage` của nguồn h00T (`burn.casterId`), thoát khi burn hết. Không phủ sương tím cả thân. |

## 4. Dương Tiễn — h00U — `duong-tien` — 6 ảnh

**Asset dùng chung:** `shared-armor-pierce-up-mark` (`empower.armorPierce` 40% 6s). Tốc đánh +90% nằm trong `berserk`, thể hiện bằng `war-god-aura-sheet`, không dùng `shared-haste-mark`.

**Nguồn:** case `h00U` + `attack-geometry.ts`; tia thẳng dài 12 × rộng 3, sát thương chuẩn; `berserk` 6s: đòn thường `multishot` 3 + đánh đôi xuyên 40%. Event `pet-h00U` thuộc nội tại Hạo Thiên Khuyển, **ngoài lô**.

**Nhận diện:** Thiên Nhãn mở trên trán bắn chùm tia vàng lõi đặc, hào quang kiếm khí bạc, lưỡi trăng khuyết vàng bạc. **Khác với:** Hiên Viên h01F (cự kiếm hoàng đế), Nguyên Thủy h014 (kiếm khí hỗn độn), Hằng Nga h018 (trăng bạc lụa). Màu `#2B2A30 #7E8794 #D7DEE6 #E9C35A #FFF6D8`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `heaven-eye-open-sheet` | S8 | Một con mắt dọc bằng ánh vàng mở dần, mống mắt vàng cam có viền tối → trừng sáng → giữ. Chỉ con mắt phép, không mặt người. Đặt ngang trán caster trước khi bắn. |
| `heaven-eye-beam` | T | Chùm tia dày lõi vàng đặc, hai mép cam sẫm và vân sáng xoắn, đầu bên phải nhọn; không thành vệt trắng toàn phần. Runtime kéo dài dọc làn 12 theo `direction`. |
| `eye-beam-scorch-lane` | T | **Ngoại lệ T top-down:** vệt cháy vàng sẫm dọc mặt đất với mép tro, đầu bên phải; phủ dải dài 12 rộng 3, dư âm ngắn. |
| `war-god-aura-sheet` | P16 | Vài lưỡi kiếm khí bạc mảnh dựng quanh vai và hông, xoay chậm theo nhịp; bật theo ability event của chính h00U, giữ khi `berserk` còn, thoát khi hết. Không bật chỉ vì có field `berserk` (Ngũ Đạo h00Y cũng có thể tạo `berserk` trên Dương Tiễn). Vẽ sau actor, giữa thân và mặt thoáng. |
| `crescent-blade-wave` | T | Một lưỡi trăng khuyết vàng bạc, mép cắt sắc, đuôi khí bạc mỏng bên trái; runtime phát ba lưỡi xòe quạt theo đòn thường lúc `berserk`. Số lượng là mô-típ. |
| `crescent-blade-hit-sheet` | S8 | Hai vết cắt bạc chéo và mảnh giáp nhỏ bật ra tại mục tiêu → tan; chỉ cho attack event của h00U khi `berserk` còn. |

## 5. Na Tra — h00V — `na-tra` — 6 ảnh

**Asset dùng chung:** `shared-attack-up-mark` (`empower` +60% 5,5s).

**Nguồn:** case `h00V` + `attack-geometry.ts`; quái trong R6 quanh aim, đánh 8 lần lặp vòng theo thứ tự `targets` (id **có thể lặp**), nổ hết burn còn lại. `tierBuff{kind:'nezha'}` 5,5s: đòn thường quét 360° R5, hào quang lửa nội tại mở rộng R5 (`aura-fire-h00V`). Hai vòng lửa thường trực dưới chân là nội tại, **ngoài lô**.

**Nhận diện:** vòng Càn Khôn vàng dày rực lửa nảy qua lại, pháp thân ba đầu sáu tay bằng lửa vàng. **Khác với:** Đường Tăng h00S (vòng kim cô mảnh siết), Hồng Hài Nhi h00C (thương lửa), Chúc Dung h01H (núi lửa). Màu `#2A0F0B #8C1D12 #E0521E #F6A23A #FFE08A`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `qiankun-ring-spin-sheet` | L8 | Một vòng vàng dày bản rộng bốc lửa cam đỏ, xoay quanh trục qua đủ các góc, lưỡi lửa đổi hình thật, vòng lặp liền. Runtime cho nảy giữa các quái theo thứ tự `targets`. Cho phép: vòng Càn Khôn như vật thể. |
| `qiankun-ring-trail` | T | Vệt lửa cam đỏ uốn cong và tàn than đen, đầu bên phải; gắn sau vòng mỗi chặng nảy. |
| `ring-detonate-burst-sheet` | S8 | Vòng đập vào một quái → lửa cam đỏ nổ bung ngắn kèm tàn than → tan; mỗi lần đánh theo từng id trong `targets`, kể cả id lặp. |
| `three-heads-six-arms-sheet` | P16 | Nhiều cánh tay hư ảnh bằng lửa vàng mọc sau hai vai, cầm thương/vòng lửa, vung chậm theo nhịp; giữ theo `tierBuff.kind === 'nezha'`. Vẽ sau actor, không che mặt/thanh máu. Cho phép: cánh tay hư ảnh bằng lửa, không thân người. Số lượng là mô-típ. |
| `fire-wheel-sweep-sheet` | S8 | Một vòng quét lửa 360° phẳng sát đất quanh tâm, mép lửa cuộn → tan; cho mỗi attack event của h00V khi `nezha` còn, khớp R5. |
| `fire-wheel-expanded-ground` | D | Hai vòng lửa đồng tâm xoay ngược nhau top-down, mép tàn than, tâm trống; chỉ hiện khi `nezha` còn và runtime đặt R5. Không thay vòng lửa nội tại thường trực. |

## 6. Lý Tịnh — h00W — `ly-tinh` — 5 ảnh

**Asset dùng chung:** `shared-slow-mark` (50% 4,5s), `shared-attack-down-mark` (`attackWeak` 50% 4,5s), shield chung (`tierGoldShields` 5s).

**Nguồn:** case `h00W`; tròn R6 tại aim; đồng minh R8 quanh caster nhận khiên; `targets` trộn quái trúng rồi đồng minh. **Không choáng. Không có ground effect cho tháp**: 4,5s là thời hạn trạng thái trên quái, không phải vùng tháp. Tháp chỉ là one-shot; không giữ tháp trên sân suốt 4,5s.

**Nhận diện:** Linh Lung Bảo Tháp vàng nhiều tầng chụp xuống, nón sáng vàng ròng. **Khác với:** Kim Thiền h013 (bát úp hút), Như Lai h01J (núi năm ngón), Thần Nông h01E (vạc thuốc). Màu `#2C2214 #7A5A24 #D4A640 #F6E3A0 #A8252B`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `pagoda-toss-sheet` | S8 | Một ngọn tháp vàng nhỏ xoay bay vút lên, tia vàng tỏa → biến mất lên cao. Cho phép: ngọn tháp như vật thể. Tại caster. |
| `pagoda-descent-sheet` | S16 | Tháp vàng nhiều tầng khổng lồ hiện trên cao → chiếu nón sáng vàng xuống → dập xuống đất, bụi tung → nón sáng tắt, tháp tan thành bụi vàng. Thân tháp và nón sáng đủ thoáng để nhìn quái. Tại aim. Số lượng là mô-típ. |
| `pagoda-seal-ground` | D | Vòng ấn tháp vàng với vân gạch và tia sáng ngắn hướng tâm, tâm thưa; dư âm ngắn sau va chạm, runtime đặt R6. |
| `pagoda-crush-hit-sheet` | S8 | Lực nén vàng đè xuống một quái, bụi và mảnh gạch vàng bật → tan; tại từng quái trong phần quái của `targets`. |
| `pagoda-guard-ray` | T | Một tia sáng vàng ròng có đầu là chuông gió tháp nhỏ, đầu bên phải; nối caster tới từng đồng minh nhận khiên, ngay trước khi shield chung xuất hiện. |

## 7. Đát Kỷ — h00X — `dat-ky` — 4 ảnh

**Asset dùng chung:** `shared-slow-mark` (80% 1,8s), `shared-armor-break-mark` (40% 4s), `shared-vulnerable-mark` (`pureLand` +25% 4s).

**Nguồn:** case `h00X`; tối đa 7 quái trong (tầm đánh + 5) quanh caster, ưu tiên boss rồi gần aim; `targets` là thứ tự chuỗi. Đẩy lùi 1,8. Snapshot **không có** trạng thái "mê hoặc" riêng; không tạo dấu mê hoặc vì không phân biệt được với slow từ nguồn khác.

**Nhận diện:** chín đuôi cáo trắng hồng xòe, hồ hỏa hồng ngọc hình lửa trái tim, đường bay zigzag. **Khác với:** Khổng Tước h03R (đuôi công mắt ngọc), Nhiếp Tiểu Thiến h03O (lan hồn, đàn băng), Phượng Hoàng h041 (lửa chim). Màu `#2A1530 #7B2E6E #D25C9A #F5B7D0 #3E8F72`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `nine-tails-unfurl-sheet` | S16 | Chùm đuôi cáo lông trắng ánh hồng xòe dần thành quạt sau lưng → đầu đuôi bừng hồ hỏa hồng → phóng hỏa cầu → khép lại tan. Vẽ sau actor, giữa trống cho thân tướng. Cho phép: đuôi cáo năng lượng không thân. Số lượng là mô-típ. |
| `fox-fire-orb-sheet` | L8 | Một quả hồ hỏa hồng tím hình ngọn lửa đầu tròn như trái tim, lưỡi lửa uốn đổi hình, vòng lặp liền; runtime bay zigzag theo thứ tự `targets`. |
| `fox-fire-zigzag-trail` | T | Vệt lửa hồng ngọc gấp khúc, tàn lửa hồng và khói tím nhạt, đầu bên phải; gắn sau hỏa cầu mỗi chặng. |
| `charm-burst-hit-sheet` | S8 | Hồ hỏa nổ hồng tím tại một quái, khói hồng xoáy ngắn đẩy về phía sau → tan; tại từng quái trong `targets`, hướng theo vector caster→quái. |

## 8. Ngũ Đạo Tướng Quân — h00Y — `ngu-dao` — 5 ảnh

**Asset dùng chung:** `shared-haste-mark` (+45% 5s).

**Nguồn:** case `h00Y`; tối đa 8 quái trong R6,5 tại aim nhận `soulLink` 5s chia 50%; mọi đồng minh cùng khu được haste + `berserk.lifesteal` 15% 5s. **Không có ground effect** cho bánh xe; vùng hiển thị sống theo `soulLink` của nhóm. Chia sát thương liên đới **không phát event**; chỉ phát xung dọc xích khi có attack/ability event thật trúng một quái trong nhóm.

**Nhận diện:** Luân Hồi Bàn sắt đen ngọc xanh, xích phược hồn ma trơi xanh lam, cửa luân hồi. **Khác với:** Phán Quan h00O (xích vàng sẫm, mực đen), Mạnh Bà h00I (dây và nước Vong Xuyên), Phục Hy h01D (bát quái). Màu `#0F1A24 #22384A #3E8C93 #8FE3D5 #C9D6DE`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `samsara-wheel-cast-sheet` | S16 | Bánh xe sắt đen ngọc xanh xoay ra từ sau lưng → phình lớn, các cửa luân hồi mở với ma trơi xanh phụt ra → thu lại tan. Vẽ sau actor. Cho phép: bánh xe pháp luân như vật thể. Số lượng là mô-típ. Tại caster. |
| `samsara-wheel-ground` | D | Bánh xe luân hồi top-down: vành sắt đen, nan ngọc xanh, các cửa hình vòm, ma trơi ở mép, tâm thưa; runtime xoay chậm tại aim R6,5, sống theo `soulLink` còn lại của nhóm. Số lượng là mô-típ. |
| `soul-shackle-chain` | T | Xích sắt đen mắt tròn quấn ma trơi xanh lam, căng ngang, đầu bên phải có móc khóa; runtime nối các quái trong `soulLink.group`. |
| `ghost-chain-pulse` | T | Một đốm ma trơi sáng với vệt đuôi lam lục, đầu bên phải; chạy dọc xích khi có hit event thật trên một quái của nhóm. Không tự phát theo timer. |
| `soul-frenzy-aura-sheet` | P16 | Ma trơi xanh lục nhỏ quấn quanh tay/vũ khí đồng minh, nhịp hút nhẹ về thân; bật trên unit có `berserk.lifesteal` vừa xuất hiện hoặc tăng ngay sau ability event h00Y, giữ theo `berserk` còn, thoát khi hết. Field không ghi nguồn; ghi hạn chế này, không tự chọn người nhận theo khoảng cách ở client. Không phủ cả thân. |

## 9. Ứng Long — h00Z — `ung-long` — 5 ảnh

**Asset dùng chung:** `shared-slow-mark` (70% 2,2s), `shared-armor-break-mark` (30% 4s).

**Nguồn:** case `h00Z` + `tier-skill-pulses.ts`; tròn R6,5 tại aim; trạng thái gắn ngay lúc cast; 8 nhịp trong 4s, mỗi nhịp trúng **mọi** quái trong R6,5 (`x/z` pulse là một quái ngẫu nhiên, không phải tâm). **Không đóng băng**; không dùng `shared-freeze-sheet`.

**Nhận diện:** bão tuyết thượng cổ xoáy cao, gai băng thép xanh, cánh rồng băng vỗ gió. **Khác với:** Cộng Công (lồng băng, chuẩn style không phải hình), Hằng Nga h018 (sương băng trăng), Long Vương h00Q (sóng biển). Màu `#0F2236 #2D5C86 #6FA9D8 #CDE9F7 #F6FCFF`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `ice-wing-gust-sheet` | S8 | Hai cánh rồng băng bán trong vỗ xuống một lần → gió tuyết bật ra theo hướng chiêu → tan. Cho phép: cánh rồng băng không thân. Tại caster. |
| `blizzard-vortex-sheet` | L8 | Lốc xoáy tuyết trắng–xanh lam cuộn cao, mảnh băng nhỏ quay theo, khối gió có mảng tối rõ, vòng lặp liền; đặt tại aim suốt 4s. Thân lốc đủ thoáng để nhìn quái. |
| `blizzard-frost-ground` | D | Mặt đất phủ sương giá xoáy và vệt tuyết dạng vòng xoắn top-down, tâm thưa; runtime đặt R6,5, sống 4s theo barrage. |
| `ice-lance-fall` | T | Một mũi gai băng thép xanh dài, đầu nhọn bên phải, đuôi bụi tuyết; runtime rơi nghiêng từ trên xuống theo từng pulse. |
| `ice-spike-burst-sheet` | S8 | Cụm gai băng tinh thể trồi lên đâm từ mặt đất → vỡ thành mảnh băng → tan; runtime phát tại một số quái trúng mỗi pulse (có giới hạn). |

## 10. Xích Tùng Tử — h010 — `xich-tung-tu` — 5 ảnh

**Asset dùng chung:** `shared-heal-sheet`, shield chung (`tierGoldShields` 5s), `shared-attack-up-mark` (`empower` +30% 5s cho mọi đồng minh cùng khu).

**Nguồn:** case `h010` + `attack-geometry.ts`; tối đa 4 đồng minh thấp máu nhất R8,5, trừ caster; `targets` = 4 người nhận. `tierBuff{kind:'fire'}` 5s: đòn thường gắn burn, +25% sát thương chí mạng, liên tục xóa choáng.

**Nhận diện:** bầu hồ lô ngọc đỏ, mưa cam lộ vàng cam ấm, chân hỏa vàng bốc trên vũ khí. **Khác với:** Chúc Dung h01H (dung nham núi lửa), Khổng Tước h03R (aura độc lông vũ), Thần Nông h01E (thuốc thảo mộc xanh). Màu `#3A140E #A3341C #E8742E #F7C25A #FFF0C8`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `gourd-pour-sheet` | S16 | Bầu hồ lô ngọc đỏ lơ lửng nghiêng → phun sương vàng cam cuộn lên cao → sương tách thành hạt rơi → tan. Cho phép: hồ lô như đạo cụ. Tại caster. |
| `sweet-dew-stream` | T | Dòng cam lộ vàng cam trong như mật có hạt sáng, đầu bên phải là giọt lớn; nối caster tới từng người nhận trong `targets`. |
| `sweet-dew-rain-sheet` | S8 | Mưa hạt cam lộ vàng cam rơi xuống quanh một người nhận → đọng thành vòng sáng nhỏ ở chân → tan; giữa thân thoáng. |
| `true-fire-weapon-sheet` | P16 | Ngọn lửa vàng rực bám vào tay/vũ khí đồng minh, lưỡi lửa đổi hình; giữ theo `tierBuff.kind === 'fire'`, thoát khi hết. Không phủ thân. |
| `true-fire-hit-sheet` | S8 | Một bông lửa vàng ngắn bùng tại mục tiêu → tàn; chỉ cho attack event của đồng minh đang mang `tierBuff` fire, không thay đạn/vũ khí của người đó. |

## 11. Tịnh Đàn Sứ Giả — h03T — `tinh-dan` — 5 ảnh

**Asset dùng chung:** `shared-attack-down-mark` (`attackWeak` 40% 5s), shield chung (`tierGoldShields` 5s), `shared-damage-reduction-mark` (`ward` 40% 5s).

**Nguồn:** case `h03T`; quái R5,5 quanh caster bị dời tức thời tới điểm cách caster 1,8 theo hướng aim; đồng minh R5,5 nhận khiên, ward, `reflect`. `targets` trộn quái rồi đồng minh. Phản đòn **không có event**; chỉ thể hiện trạng thái `reflect` (mất khi `shield <= 0`).

**Nhận diện:** hào quang Vạn Phật, sen vàng tám cánh trên nước, xoáy kim quang hút gom, thân đồng đúc. **Khác với:** Trư Bát Giới h00J (cùng nhân vật trước khi thành Phật: sóng băng xanh), Kim Thiền h013 (bát vàng), Như Lai h01J (núi năm ngón). Màu `#2D2012 #8E6A2B #E2B54E #3C8FB0 #FFF1C6`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `buddha-aura-flare-sheet` | S8 | Vầng hào quang vàng tròn sau lưng bùng sáng, tia Phật quang ngắn → dịu. Vẽ sau actor. Tại caster. |
| `golden-lotus-whirl-ground` | D | Sen vàng nhiều cánh nở trên mặt nước lam, vệt xoáy kim quang hướng vào một điểm lệch về phía trước; runtime xoay để điểm gom trùng hướng aim, R5,5. Số lượng là mô-típ. |
| `lotus-pull-current-sheet` | S16 | Luồng nước vàng lam xoắn từ rìa cuốn vào một điểm → nén lại → bung nhẹ khi quái tới → tan. Runtime đặt tâm tại điểm gom (caster + 1,8 theo hướng aim). Không vẽ quái. |
| `gathered-impact-sheet` | S8 | Nước và kim quang nén ép tại điểm gom, bọt vàng bật → tan; một lần tại điểm gom, cộng nhẹ trên từng quái trong phần quái của `targets`. |
| `dharma-echo-aura-sheet` | P16 | Hai ba vòng sóng âm Phật pháp vàng mỏng nhịp ra quanh thân ở ngang hông, nối vòng; bật trên các id đồng minh trong `targets` của ability event h03T (phần sau id quái), giữ khi `reflect` còn, thoát khi mất. Không bật chỉ vì có field `reflect` (khiên phản đòn bậc 2 như Kim Tra h009 cũng đặt field này). Vẽ sau actor, không phải vỏ khiên. |

## 12. Kim Thân La Hán — h03U — `kim-than-la-han` — 6 ảnh

**Asset dùng chung:** `shared-heal-sheet`.

**Nguồn:** case `h03U` + `combat.ts`; tối đa 4 đồng minh thấp máu nhất R8,5, trừ caster; `tierImmortal{remaining:4}`. Khi tụt về 1 Máu: event `trait` `immortal-h03U`, `activeRemaining` 2s. Nạp +35 Nộ/−3s hồi chiêu cho đồng minh Công cao nhất **không có event/người nhận**; không tạo ảnh vì client không được tự chọn người đó.

**Nhận diện:** chín xá lợi vàng bay vòng, từ quang trắng vàng, chuông vàng hộ mệnh, thân vàng bất hoại. **Khác với:** Sa Ngộ Tịnh h00K (cùng nhân vật trước khi thành Phật: cát lưu sa, chuỗi đầu lâu), Thái Bạch h015 (sao Trường Canh cứu một người), shared invulnerable (miễn sát thương, khác "không chết"). Màu `#2E2618 #8A6E36 #D9B25A #F3E5B5 #FBF7EA`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `sarira-relic-bead` | O | Một viên xá lợi vàng trong như hổ phách, lõi sáng ấm, viền tối rõ; runtime xếp nhiều viên bay vòng quanh caster lúc cast. |
| `compassion-light-cast-sheet` | S8 | Từ quang trắng vàng tỏa thành các cánh sáng mềm từ một điểm → lan → dịu. Không người, không trượng. Tại caster. |
| `compassion-ray` | T | Cột từ quang vàng trắng mềm có đầu là hạt xá lợi nhỏ, đầu bên phải; nối caster tới từng người nhận trong `targets`. |
| `golden-bell-vow-back-sheet` | P16 | Vòm chuông vàng hộ mệnh phía sau người nhận: chỉ phần đỉnh, vòm trên và hai cung sườn trên; tâm chuông để rỗng alpha hoàn toàn, không sương hay hạt bên trong. Giữ theo `tierImmortal.remaining > 0`, thoát khi hết hoặc khi kích hoạt. Layer sau actor. |
| `golden-bell-vow-front-sheet` | P16 | Vành miệng chuông loe và hai cung sườn dưới ở trước người nhận; không có đỉnh/vòm trên. Tâm và vùng thân bên trong để alpha hoàn toàn rỗng, không sương hay hạt. Cùng canvas, anchor và nhịp 4 frame hiện → frame 5–12 giữ nối vòng → frame 13–16 tan như layer sau. Layer trước actor. |
| `deathless-body-sheet` | P16 | Lớp vàng đồng nứt sáng bám hai vai và chân như tượng đúc, vệt kim quang chạy trong khe; mọc theo event `immortal-h03U`, giữ theo `tierImmortal.activeRemaining`, tan khi hết 2s. Giữa mặt và thân thoáng. |

## 13. Bát Bộ Thiên Long — h03V — `bat-bo-thien-long` — 4 ảnh

**Asset dùng chung:** `shared-slow-mark` (70% 2,2s), `shared-haste-mark` (bản thân +50% 4s).

**Nguồn:** case `h03V`; đường thẳng dài 13 × rộng 5,5. **Không trói chân.** "Ba rồng" là mô-típ hình: runtime nhân ba một ảnh rồng theo quỹ đạo xoắn, không phải ba lần sát thương.

**Nhận diện:** thần cung, ba hư ảnh rồng vàng–lục bảo xoắn helix, cột sáng trồi trên làn. **Khác với:** Tiểu Bạch Long h00L (một rồng trắng–lục bằng gió và dây leo), Đế Tuấn h01I (Kim Ô), Hậu Nghệ h017 (tên xạ nhật). Màu `#1E2E1E #2E7A55 #4FC08D #E5B640 #FFF2C2`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `heavenly-bow-draw-sheet` | S8 | Hư ảnh rồng vàng nhỏ cuộn vòng quanh một điểm tụ lực trước tầm cung, ánh lục bảo nén → bung theo hướng bắn. Không vẽ cung hay người. Tại caster. |
| `golden-dragon-spirit` | T | Một hư ảnh rồng vàng–lục bảo: đầu rồng có sừng vàng bên phải, thân ánh sáng vảy lục kéo dài về trái. Cho phép: hư ảnh rồng bằng ánh sáng. Runtime nhân ba theo helix dọc làn 13. |
| `dragon-helix-lane` | T | **Ngoại lệ T top-down:** vệt đất nổ và ánh vàng lục xoắn dọc làn, mảnh đất bật, đầu bên phải; phủ dải dài 13 rộng 5,5, tan nhanh. |
| `light-pillar-burst-sheet` | S8 | Một cột sáng vàng lục trồi lên quanh chân quái → giữ chớp ngắn → vỡ tan nhanh; tại từng quái trong `targets`. Chỉ là va chạm, không giữ như trói chân. |

## Tổng và thứ tự

13 tướng, **67 job riêng**. Pilot dùng các dòng Tôn Ngộ Không và Kim Thân La Hán trong bảng này. Sau pilot: Đường Tăng → Lôi Chấn Tử → Dương Tiễn → Na Tra → Lý Tịnh → Đát Kỷ → Ngũ Đạo → Ứng Long → Xích Tùng Tử → Tịnh Đàn → Bát Bộ Thiên Long.

## Câu hỏi còn mở

Không còn quyết định phạm vi/phong cách chặn lập prompt.
