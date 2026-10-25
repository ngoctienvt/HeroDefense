# Danh mục ảnh tuyệt kỹ — 11 tướng bậc 3

Đọc cùng [hợp đồng bổ sung](art-contract.md), [hợp đồng gốc](../261020-1054-tier56-codex-ultimate-art/art-contract.md) và [chứng cứ combat](../reports/scout-261020-2126-tier34-combat-evidence.md). Đây là **đặc tả cần tạo**, chưa có ảnh nào được nghiệm thu. Chỉ tuyệt kỹ và hệ quả trực tiếp; không làm đòn thường hay nội tại độc lập.

Mỗi dòng bảng = một ảnh gốc, một prompt, một job. Đường dẫn: `assets/vfx-source/tier34-codex-art/prompts/<tên>.txt` → `raw/<tên>.png`. Ký hiệu loại như hợp đồng gốc: S16/S8 one-shot; L8 loop không khung rỗng; P16 mọc 1–4, giữ 5–12, tan 13–16; D decal top-down; T dải 3:1 đầu bên phải; O vật thể tĩnh nhìn góc 42°. Câu `Cho phép:` và `Số lượng là mô-típ.` là quy ước cho generator (xem hợp đồng bổ sung mục 4 và 8).

**Art đã chốt:** stylized theo Cộng Công. HEX là định hướng màu prompt, không đổi bảng màu gameplay. Trạng thái chung theo ánh xạ ở hợp đồng bổ sung mục 7; không vẽ lại ở đây. Đích tích hợp là công thức `visual-kit-recipes-tier34.ts` của [giai đoạn 6 kit](../261019-1623-hero-vfx-kit/phase-06-tier-3-4-recipes.md), không tạo module riêng từng tướng.

## 1. Trư Bát Giới — h00J — `bat-gioi` — 5 ảnh

**Asset dùng chung:** shield chung (`tierShield` water 5s), `shared-slow-mark` (sau nổ khiên).

**Nguồn:** `tier3-combat.ts` case `h00J` + `burstTier3WaterShield`; ability tại caster R5 đẩy lùi 0,35; `blockBonus` 5s; event `water-shield-burst-h00J` khi khiên hết hạn hoặc vỡ, R5. **Không có khiêu khích**; không vẽ dấu taunt.

**Nhận diện:** sóng nước hàn băng từ cú vỗ bụng, vệt cào đinh ba chín răng bạc, bọt trắng xanh. **Khác với:** Tịnh Đàn h03T (cùng nhân vật, đã thành Phật: sen vàng, xoáy kim quang), Long Vương h00Q (sóng biển sâu lưỡi liềm theo làn), Hà Bá h00G (lao nước giam). Màu `#14263F #2F5F8F #6FB7D6 #CFF1F7 #D6B25A`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `belly-tide-burst-sheet` | S16 | Nước lạnh dồn về quanh chân → một vòng sóng dày bọt trắng bật tỏa ra đều mọi hướng → mép sóng vỡ thành bọt và hạt băng → tan. Tâm giữa trống cho thân tướng; không vẽ bụng hay thân người. Phát tại caster theo ability event. |
| `belly-tide-ground` | D | Gợn sóng đồng tâm nước băng xanh lam với các vệt cào song song của đinh ba cắt ngang mặt nước, mép bọt không đều; dư âm ngắn sau cú đẩy, runtime đặt R5. Số lượng là mô-típ. |
| `rake-tide-guard-sheet` | P16 | Vòng nước xoáy thấp sát đất quanh chân, vài bóng răng đinh ba bạc nhô lên rồi chìm theo nhịp; biểu hiện `blockBonus`. Giữ theo `blockBonus.remaining`, thoát khi hết. Chỉ ở dưới đầu gối, vẽ sau actor; không phải vỏ khiên. |
| `water-shield-rupture-sheet` | S16 | Bọc nước hình cầu đã nứt → vỡ tung thành cột bọt và giọt nước băng văng ra R5 → mảnh băng nhỏ rơi → tan. Chỉ phát theo event `water-shield-burst-h00J`; không thay hình shield chung lúc còn giữ. |
| `rupture-spray-hit-sheet` | S8 | Bọt nước hàn băng tạt vào một quái, đọng lớp sương giá mỏng rồi tan; đặt trên từng id trong `targets` của event nổ. |

## 2. Sa Ngộ Tịnh — h00K — `sa-ngo-tinh` — 5 ảnh

**Asset dùng chung:** `shared-heal-sheet`, `shared-damage-reduction-mark` (`ward` 30% 4s).

**Nguồn:** case `h00K`; tối đa 3 đồng minh thấp máu nhất R8, trừ caster; `targets` = người nhận. Giảm 2s hồi chiêu không có event riêng; dùng chính ability event cho người trong `targets`.

**Nhận diện:** cát lưu sa vàng chảy, Hàng Yêu Bảo Trượng cắm đất, chuỗi đầu lâu vàng, cột kim quang hộ pháp. **Khác với:** Kim Thân La Hán h03U (cùng nhân vật thành Phật: xá lợi, chuông vàng, từ quang trắng vàng), Thiết Phiến h00B (bão cát quạt, không hộ pháp). Màu `#2A2133 #6B4B2A #C9963F #E8C77A #F4E6C0`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `quicksand-chant-sheet` | S16 | Cát lưu sa vàng xoáy vào một điểm cắm trượng ở chân → luồng kim quang bật thẳng lên → cát rơi lại thành vòng → tan. Cho phép: một cây bảo trượng năng lượng không người cầm. Phát tại caster. |
| `quicksand-ward-ground` | D | Vòng cát lưu sa chảy xoắn có hạt vàng và nét pháp ấn tròn đơn giản, tâm thưa; dư âm ngắn tại caster. Không chữ đọc được. |
| `skull-bead-guidance` | T | Một đoạn chuỗi hạt đầu lâu vàng ròng bay đầu bên phải, đuôi cát vàng và kim quang; nối caster tới từng người nhận thật (tối đa 3). Số lượng là mô-típ. |
| `golden-pillar-descent-sheet` | S8 | Cột kim quang hẹp giáng xuống một người nhận → chạm đất tỏa vòng cát nhỏ → tan; giữa thân thoáng, không che thanh máu. |
| `sand-quicken-sheet` | S8 | Dòng cát nhỏ chảy **ngược lên** quanh hai bên người nhận như đồng hồ cát đảo chiều → tan thành hạt vàng; biểu hiện giảm hồi chiêu, phát cùng lúc với cột kim quang. Không chữ/số. |

## 3. Tiểu Bạch Long — h00L — `tieu-bach-long` — 4 ảnh

**Asset dùng chung:** `shared-slow-mark` (chỉ quái đã bị poison/slow trước đó nhận thêm slow 60%).

**Nguồn:** case `h00L`; đường thẳng dài 12 × rộng 3,5 từ caster theo `direction`; `targets` = quái trúng. **Không trói chân**; dây leo chỉ là vật chất của hư ảnh rồng, không giữ trên quái.

**Nhận diện:** một hư ảnh rồng trắng–lục bảo bằng lốc gió và dây leo, lao thẳng như mũi tên. **Khác với:** Bát Bộ Thiên Long h03V (cùng dòng rồng, đã thành Phật: ba rồng vàng–lục xoắn helix và cột sáng), Mộc Tra h00A (kiếm dây leo). Màu `#173A33 #2E7D64 #6CCFA8 #D8F3EA #F7FBF8`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `dragon-bow-gale-sheet` | S8 | Gió xoắn lục bảo và lá non cuộn tụ vào một điểm trước tầm cung → nén lại → bung theo hướng bắn → tan. Không vẽ cung hay người; phát tại caster. |
| `white-dragon-spirit` | T | Một hư ảnh rồng trắng–lục bảo: đầu rồng có sừng ngọc ở bên phải, thân là lốc gió xoắn quấn dây leo mảnh kéo dài về trái. Cho phép: hư ảnh rồng bằng gió và năng lượng. Runtime cho bay dọc làn 12. |
| `dragon-gale-lane` | T | **Ngoại lệ T top-down:** vệt gió xoáy để lại trên mặt đất, lá và dây leo đứt bay dọc, đầu bên phải; phân bố đều trên dải dài 12 rộng 3,5, tan nhanh. |
| `dragon-gust-hit-sheet` | S8 | Lốc gió lục bảo cuốn lá cắt qua một quái với hai vệt cắt ngắn → tan; đặt tại từng quái trong `targets`. |

## 4. Tinh Vệ — h00M — `tinh-ve` — 6 ảnh

**Asset dùng chung:** `shared-slow-mark`, `shared-armor-break-mark` (lần trúng thứ 3).

**Nguồn:** case `h00M` + `tier-skill-pulses.ts`; barrage tại aim R5,5, 8 nhịp trong 2s. Main event `targets` rỗng; mỗi nhịp có quái phát `tier3-tier4-pulse-h00M` với `x/z` = tâm rơi, trúng R1,25. **Không choáng.**

**Nhận diện:** chim thần lấp biển: tảng đá hổ phách mang theo lông vũ đỏ cam và bọt nước biển. **Khác với:** Nữ Oa h01C (đá ngũ sắc vá trời) — Tinh Vệ **không** dùng đá ngũ sắc dù brief cũ nhắc tới, để giữ hai tướng khác nhau; Lôi Chấn Tử h00T (barrage sét). Màu `#2E2118 #7A5230 #C98A3E #E4572E #BFE6E6`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `sea-filling-call-sheet` | S8 | Lông vũ đỏ cam xoáy lên cao kéo theo các mảnh đá hổ phách nhỏ và tia nước biển → bay vút lên → tan. Phát tại caster lúc ability. Không vẽ chim hay người. |
| `sea-filling-warning-ground` | D | Vòng cảnh báo đất vàng có mép đá vỡ, vài lông vũ đỏ cam và vệt nước mặn khô; runtime đặt R5,5 tại aim, sống tối đa 2s theo barrage. Tâm thưa để nhìn quái. |
| `sea-filling-boulder` | O | Một tảng đá hổ phách góc cạnh lớn, khe nứt phát sáng ấm, vài lông vũ đỏ cam bám và vệt nước biển chảy; runtime rơi chéo từ trên xuống và tái dùng cho mọi nhịp. |
| `boulder-fall-trail` | T | Vệt đuôi bụi đá, lông vũ và giọt nước kéo sau tảng đá rơi, đầu bên phải; gắn theo quỹ đạo rơi. |
| `boulder-impact-sheet` | S8 | Đá nện xuống một điểm → mảnh đá bật, bụi vàng và bọt nước tung ngắn trong bán kính nhỏ R1,25 → tan. Một tảng một lần, theo từng pulse event. |
| `boulder-crater-decal` | D | Hố nứt nhỏ top-down, đá vụn và vệt ẩm ở mép; dư âm ngắn tại tâm pulse, không thành vùng duy trì. |

## 5. Chung Quỳ — h00N — `chung-quy` — 5 ảnh

**Asset dùng chung:** `shared-seal-mark` (`silence` 3s, chỉ khi `tryHardControl` thành công), `shared-vulnerable-mark` (`pureLand` từ vùng `tier-fire`).

**Nguồn:** case `h00N`; tròn R5,2 tại aim; vùng `groundEffects kind:'tier-fire'` R5,2, 4s, đốt 90% Công/s. Quỷ tốt `tier3-tier4-summon-h00N` là nội tại đốt chết, **ngoài lô**.

**Nhận diện:** ấn chu sa vuông khổng lồ đóng xuống, phù trận trấn quỷ, âm hỏa đỏ đen pha tím. **Khác với:** Phục Hy h01D (bát quái), Khương Tử Nha h019 (bảng lụa vàng ngọc), Đường Tăng h00S (vòng kim cô và chữ Vạn) — Chung Quỳ dùng **ấn vuông và lá bùa**, không dùng bát quái dù brief cũ nhắc. Màu `#1B0F14 #5A1424 #B3202E #E8553B #9A4DB0`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `talisman-flight-strip` | T | Một lá bùa chu sa dài bốc âm hỏa ở mép, đầu bên phải, đuôi khói đỏ đen; bay từ caster tới aim trước khi ấn xuất hiện. Nét bùa trang trí, không chữ đọc được. |
| `cinnabar-seal-slam-sheet` | S16 | Ấn vuông chu sa khổng lồ hiện trên không → rơi tăng tốc → dập xuống đất → cột lửa đỏ tím bốc lên → tắt thành tro. Mặt ấn là hoa văn trừu tượng, không chữ đọc được. Cho phép: ấn chu sa vuông như một vật thể. |
| `exorcism-sigil-ground` | D | Phù trận chu sa vuông lồng tròn, các nét bùa và dấu ấn đỏ cháy viền đen, tâm thưa; giữ theo vùng `tier-fire` 4s, runtime đặt R5,2. Không bát quái, không chữ đọc được. |
| `ghost-fire-flame-sheet` | L8 | Ngọn âm hỏa đỏ đen có lõi tím, lưỡi lửa đổi hình thật, vòng lặp liền; runtime rải vài ngọn trong vùng suốt 4s. Có bóng tối, không thành vệt sáng rỗng. |
| `seal-burn-hit-sheet` | S8 | Lửa chu sa tạt vào một quái, tàn bùa cháy bay lên → tan; tại từng quái trong `targets` của ability. |

## 6. Phán Quan — h00O — `phan-quan` — 5 ảnh

**Asset dùng chung:** không có; liên đới `soulLink` dùng xích riêng dưới đây.

**Nguồn:** case `h00O`; nửa tròn phía trước caster R4,8 (dải dài 4,8 rộng 9,6 theo `direction`); 5 quái đầu nhận `soulLink` 4s chia 40%. Sát thương chuẩn khi mục tiêu dưới 35% Máu **không có cờ** trong event; không vẽ hiệu ứng xử trảm riêng.

**Nhận diện:** Sổ Sinh Tử đá đen chữ vàng, bút phán quan, nét mực đen viền vàng, xích vàng sẫm. **Khác với:** Ngũ Đạo h00Y (xích ma trơi xanh và bánh xe luân hồi), Mạnh Bà h00I (dây và canh Vong Xuyên), Vô Thường h00H (đường dẫn âm phủ). Màu `#141218 #3B2A45 #6B4A2B #C9A14A #F0DFA8`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `life-death-ledger-sheet` | S8 | Cuốn sổ đá đen lơ lửng mở ra → trang lật nhanh phát ánh vàng → gập lại tan thành khói mực. Cho phép: cuốn sổ như một đạo cụ không người cầm. Nét chữ trang trí, không đọc được. Phát tại caster. |
| `verdict-ink-arc` | D | Nét bút mực đen viền vàng hình lưỡi liềm nửa vòng nhìn top-down, nét đậm ở giữa, đuôi mực văng ở hai đầu, **chiều chém hướng về cạnh phải ảnh**; runtime xoay theo `direction`, lộ dần bằng mask rồi tan. |
| `verdict-ink-burst-sheet` | S8 | Mực đen nổ tung kèm vết nứt vàng và vài ký hiệu triện trừu tượng vỡ vụn → tan; tại từng quái trong `targets`. |
| `soul-ledger-chain` | T | Xích vàng sẫm mắt dẹt có khắc vân mực, căng ngang, đầu bên phải có khóa nhỏ; runtime nối các quái trong cùng `soulLink.group`, sống theo `soulLink.remaining`. |
| `soul-shackle-sheet` | P16 | Vòng cùm xích vàng sẫm khép quanh mắt cá chân một quái, mực đen nhỏ giọt; mọc → giữ lắc nhẹ nối vòng → rơi rụng tan khi `soulLink` hết. Chỉ quanh chân, không che thân. |

## 7. Ngưu Ma Vương — h00P — `nguu-ma-vuong` — 5 ảnh

**Asset dùng chung:** `shared-slow-mark`.

**Nguồn:** case `h00P`; tròn R5,5 quanh caster; đẩy lùi 1,5; slow 50% 1,8s. **Không choáng, không phóng to 25%.** Chí mạng ×2 trên quái đang slow/burn không có cờ trong event; không tạo ảnh chí mạng riêng.

**Nhận diện:** địa chấn hắc kim pha đỏ đất, gai đá trồi, tiếng gầm đầu bò. **Khác với:** Bàn Cổ h01B (khai thiên, vết nứt hỗn độn), Cự Linh Thần h00E (búa kim loại nện đất bậc thấp), Tôn Ngộ Không h00R (gậy dọc làn). Màu `#17130F #4A2C1C #9B3B22 #D49A3A #F3D58A`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `bull-roar-windup-sheet` | S8 | Hơi thở đỏ đất xoáy quanh chân, bụi đá bị hút vào, hai luồng khí cong như sừng bò dựng lên → nén → bùng. Phát tại caster trước va chạm. Không vẽ đầu bò hay người. |
| `iron-axe-quake-sheet` | S16 | Mặt đất bị nén lõm → sóng xung kích vàng kim pha đỏ đất bật ra thành vòng → đá vụn và bụi cuộn → tan. Va chạm nặng tại caster, chỉ một nhịp. |
| `quake-fissure-ground` | D | Vết nứt tỏa tia từ tâm, mép đá đỏ đất và kẽ sáng vàng sẫm, tâm thưa; dư âm ngắn, runtime đặt R5,5. |
| `iron-rock-spike` | O | Một gai đá đen nhọn có vân kim loại vàng và mảnh đất đỏ bám chân; runtime đặt nhiều gai quanh vòng R5,5, trồi lên rồi vỡ. |
| `quake-knockback-dust-sheet` | S8 | Bụi đỏ đất và mảnh đá bắn ngược chiều vào một quái bị đẩy lùi → tan; tại từng quái trong `targets`, hướng theo vector caster→quái do runtime xoay. |

## 8. Long Vương — h00Q — `long-vuong` — 6 ảnh

**Asset dùng chung:** `shared-freeze-sheet` (chỉ quái đã slow và `tryHardControl` thành công), `shared-slow-mark` (vùng nước).

**Nguồn:** case `h00Q`; đường thẳng dài 10 × rộng 6 từ caster; đẩy lùi 2,5. Vùng `tier-water` **tại aim** R5, 4s, slow 50%, 60% Công/s.

**Nhận diện:** Định Hải Châu, bức tường sóng biển sâu lưỡi liềm có bọt trắng, vàng san hô. **Khác với:** Cộng Công (chuẩn style nước, không phải hình để chép), Bát Giới h00J (vòng sóng băng quanh thân), Ứng Long h00Z (bão tuyết). Màu `#0E2A47 #1F5F8B #3FA7C9 #E9F7FA #D9A441`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `sea-pearl-surge-sheet` | S8 | Một quả châu xanh lam lơ lửng hút nước biển cuộn quanh → nước dâng thành ngọn → phóng theo hướng chiêu. Cho phép: quả châu như vật thể. Tại caster. |
| `tidal-crescent-wave-sheet` | S16 | Bức tường sóng xanh thẫm hình lưỡi liềm dâng lên → đỉnh cuộn bọt trắng đổ về phía trước → vỡ thành bọt và tan. Runtime đẩy sheet dọc đường dài 10 theo `direction`; thân sóng che thấp, đỉnh bọt không che thanh máu. |
| `tidal-lane-wash` | T | **Ngoại lệ T top-down:** vệt nước tràn và bọt trắng kéo dài trên mặt đất, mép sóng ở bên phải; phủ dải dài 10 rộng 6, tan nhanh. |
| `sea-pool-ground` | D | Vũng nước biển xanh sâu với gợn tròn, vài mảnh san hô vàng và vảy rồng nhỏ ở mép, tâm đủ thoáng; giữ theo vùng `tier-water` 4s tại aim, R5. |
| `sea-pool-churn-sheet` | L8 | Bọt và gợn nước cuộn trên mặt vũng, xoáy nhẹ đổi hình thật, vòng lặp liền; runtime rải vài điểm trong vùng suốt 4s. |
| `wave-crash-hit-sheet` | S8 | Sóng nhỏ tạt vào một quái, bọt bắn ngược và giọt nước rơi → tan; tại từng quái trong `targets`. |

## 9. Trầm Hương — h03Q — `tram-huong` — 5 ảnh

**Asset dùng chung:** `shared-armor-break-mark` (sunder 35% 5s), `shared-heal-sheet`, `shared-attack-up-mark` (`empower` +20% 5s).

**Nguồn:** case `h03Q`; tròn R5 tại aim; đồng minh R6 quanh caster được hồi và buff. `targets` **chỉ có quái**; người nhận buff đọc từ snapshot `empower`, không suy ra bằng khoảng cách ở client.

**Nhận diện:** Bảo Liên Đăng lục–vàng, rìu Khai Sơn bổ núi thẳng đứng, khe núi tách đôi. **Khác với:** Kim Thiền h013 (bát vàng, sen chín cánh), Tịnh Đàn h03T (sen vàng xoáy nước), Ngưu Ma h00P (địa chấn tròn). Màu `#22352F #5E8F6E #A8D59A #E8C766 #FFF4D2`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `lotus-lamp-flare-sheet` | S8 | Một chiếc đèn hoa sen ngọc bích lơ lửng bùng ánh lục–vàng → tia sáng tỏa → dịu lại. Cho phép: đèn hoa sen như đạo cụ. Đặt ngang vai caster lúc cast. |
| `mountain-splitting-axe-sheet` | S16 | Một lưỡi rìu ánh sáng vàng trắng lớn hiện trên cao → bổ thẳng xuống → mặt đất tách đôi, đá bật hai bên → ánh sáng tan. Cho phép: lưỡi rìu năng lượng không người cầm. Tại aim. |
| `mountain-split-fissure` | D | Khe núi thẳng nứt sâu với hai mép đá tách ra, vụn đá và tia vàng trong khe; dư âm ngắn, runtime đặt theo R5 tại aim. |
| `lantern-lotus-bloom-ground` | D | Một bông sen ánh sáng lục–vàng nở dẹt trên mặt đất, cánh to rõ khối, tâm thưa; đặt ngắn dưới chân từng đồng minh có `empower` mới. Số lượng là mô-típ. |
| `axe-split-hit-sheet` | S8 | Đá vỡ và tia vàng trắng bắn lên từ chân một quái → tan; tại từng quái trong `targets`. |

## 10. Khổng Tước — h03R — `khong-tuoc` — 6 ảnh

**Asset dùng chung:** `shared-heal-sheet`, `shared-haste-mark` (+30% 5s).

**Nguồn:** case `h03R`; mọi đồng minh R9 quanh caster; `targets` = đồng minh. `tierBuff{kind:'poison'}` 5s làm đòn thường của đồng minh gắn độc (`attack-geometry.ts`). Xóa choáng không có event riêng.

**Nhận diện:** đuôi công xòe với mắt ngọc, thần quang năm màu, độc lục tím của Minh Vương. **Khác với:** Phượng Hoàng h041 (lông lửa), Kim Sí h016 (lông kim loại cắt), Bồ Đề h03X (lá bồ đề thanh khí). Màu `#123B34 #1F7A6A #3DA0C8 #E2B84B #8A4FB5`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `peacock-fan-sweep-sheet` | S16 | Đuôi công khổng lồ bằng ánh sáng xòe dần thành quạt tròn với các mắt ngọc → quét một vòng thần quang năm màu → khép lại tan thành lông vũ. Giữa trống cho thân tướng. Cho phép: đuôi công năng lượng không thân chim. Số lượng là mô-típ. Tại caster. |
| `five-radiance-ground` | D | Vòng quạt cầu vồng năm dải màu (vàng, lục, lam, đỏ, tím) top-down, mép lông vũ, tâm thưa; dư âm ngắn, runtime đặt R9. |
| `peacock-eye-feather` | O | Một lông đuôi công lớn với mắt ngọc lam–lục phát sáng nhẹ, sống lông vàng; runtime rơi nhẹ xuống từng đồng minh trong `targets`. |
| `radiance-blessing-sheet` | S8 | Lông vũ nhỏ rơi tụ quanh người nhận → bùng tia năm màu ngắn → tan; giữa thân thoáng. Phát trên từng người trong `targets`. |
| `venom-plume-aura-sheet` | P16 | Vài lông vũ lục độc và hơi tím bám quanh tay/vũ khí đồng minh, nhịp phập phồng nhẹ; giữ theo `tierBuff.kind === 'poison'`, thoát khi hết. Không phủ cả thân. |
| `venom-plume-hit-sheet` | S8 | Một lông vũ độc cắm vào mục tiêu, hơi tím lục tỏa nhỏ → tan; chỉ cho attack event của đồng minh đang mang `tierBuff` poison, không thay đạn/vũ khí của người đó. |

## 11. Triệu Công Minh — h03S — `trieu-cong-minh` — 4 ảnh

**Asset dùng chung:** `shared-attack-down-mark` (`attackWeak` 30% 4s), shield chung (`shield` plain, **không timer**).

**Nguồn:** case `h03S`; đường thẳng dài 8 × rộng 2 từ caster; đồng minh R8 có `block > 0` nhận khiên. `targets` **trộn** id quái rồi id đồng minh; runtime tách theo `state.enemies`/`state.units`. +25 Linh Thạch **không có cờ** trong event; không vẽ hiệu ứng thưởng.

**Nhận diện:** đồng tiền vàng lỗ vuông Lạc Bảo Kim Tiền xoay tít, lửa đỏ vàng, xu nhỏ văng. **Khác với:** Đường Tăng h00S (vòng kim cô mảnh), Na Tra h00V (vòng Càn Khôn lửa nảy), Hậu Nghệ h017 (đĩa mặt trời). Màu `#1E1410 #6E1E1A #C0392B #E8A93B #FFE59A`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `fortune-coin-spin-sheet` | L8 | Một đồng tiền vàng khổng lồ lỗ vuông, viền lửa đỏ, quay quanh trục đứng qua đủ các góc (mặt chính → nghiêng → cạnh → mặt sau → về), vòng lặp liền. Runtime cho bay dọc đường 8 rồi quay về caster. Cho phép: đồng tiền như vật thể. |
| `coin-fire-trail` | T | Vệt lửa vàng đỏ uốn lượn với các đồng xu nhỏ lấp lánh rơi khỏi đuôi, đầu bên phải; gắn sau đồng tiền khi bay. |
| `coin-strike-hit-sheet` | S8 | Tia lửa và xu vàng nhỏ văng ra khi đồng tiền cắt qua một quái → tan; tại từng quái trong phần quái của `targets`. |
| `coin-return-guard-sheet` | S8 | Đồng tiền quay về tan thành vòng tia vàng hẹp rơi xuống quanh chân người nhận khiên → tan; chỉ báo trước, sau đó shield chung đảm nhận. |

## Tổng và thứ tự

11 tướng, **56 job riêng**. Shield chung, 13 dấu cũ và 2 dấu mới không tính ở đây. Pilot (xem [pha 1](phase-01-setup-pilot.md)) dùng chính các dòng Long Vương trong bảng này. Sau pilot: Bát Giới → Sa Ngộ Tịnh → Tiểu Bạch Long → Tinh Vệ → Chung Quỳ → Phán Quan → Ngưu Ma Vương → Trầm Hương → Khổng Tước → Triệu Công Minh. Một job bị chặn thì chuyển job độc lập tiếp theo; không đánh dấu bộ thiếu là đủ.

## Câu hỏi còn mở

Không còn quyết định phạm vi/phong cách chặn lập prompt. Hạn chế event/snapshot ghi ở [báo cáo chứng cứ](../reports/scout-261020-2126-tier34-combat-evidence.md); không sửa gameplay trong lô ảnh.
