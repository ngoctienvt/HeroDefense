# Thiết kế lại 27 Duyên Phận

Ngày: 2026-10-28. Bản sửa 2. Trạng thái: **đã viết mã, chưa kiểm chứng** (xem [plan](../261028-1348-bond-redesign/plan.md) và [bàn giao](../261028-1348-bond-redesign/reports/handoff-261028-1500-bond-redesign.md)); số liệu là nháp, cần cân bằng. Năm danh tính đã thay (h03W, h03X, h01I, h01J, h014) được thay bằng người kế nhiệm theo chủ đề, xem bàn giao.

Bản này thay thế brainstorm hệ/tộc kiểu ĐTCL (`brainstorm-261028-1316-he-thong-kich-he.md`).

## Kết luận

Mỗi duyên phận có một cơ chế riêng, mạnh dần theo mốc, nhưng **chỉ ghép từ những gì game đã có**:

- trạng thái sẵn có,
- vùng hiệu ứng (zone) và đơn vị triệu hồi sẵn có,
- kênh chỉ số trang bị,
- thi triển kỹ năng có sẵn của tướng.

Mọi hiệu ứng áp dụng **toàn bản đồ**, không có điều kiện đứng gần hay đứng xa, nên người chơi không phải điều khiển thêm. Đã bỏ toàn bộ nội dung liên quan Linh Trụ.

So với bản 1:

- Bỏ trạng thái **Ướt**, **Mê Hoặc** và các **dấu ấn** mới.
- Bỏ lông vũ trên đất, vùng chồng lớp và điều kiện khoảng cách.
- Thiết kế lại **Nữ Thần** và **Viêm Đế Huyết Mạch**.
- Sửa **Thiên Đình**, **Lưỡng Tình**, **Trục Nhật**, **Chiến Phủ**, **Thần Hỏa**, **Tiên Tử**, **Tam Đại Thần Điểu** để dùng lại cái có sẵn.
- Giữ nguyên **U Minh**.

## Vật liệu được dùng lại

- **Trạng thái:** `burn`, `poison`, `bleed`, `slow`, `stun`, `frozen`, `root`, `sealed`, `taunt`, `sunder` (Phá Giáp), giảm Công quái (đặc tính Mạnh Bà), `shield`, miễn sát thương (Bàn Cổ/Thái Bạch), hồi sinh (Nữ Oa/Thái Bạch), Nộ (`energy`), `empower`/`haste`.
- **Kênh chỉ số trang bị** (có code đọc trong combat): `attack-percent`, `attack-speed`, `crit-chance`, `crit-damage`, `armor-pierce`, `boss-damage`, `execute-damage`, `lifesteal`, `health-percent`, `damage-reduction`, `skill-damage`, `cooldown-reduction`, `rage-gain`, `status-duration`, `dot-damage`, `summon-duration`. Không dùng `block-cap` vì kênh này không có chỗ nào đọc.
- **Vùng hiệu ứng có sẵn:** `chucdung-lava`, `phoenix-carpet`, `golden-bowl`, `tier-fire`, `fuxi-bagua`, `phong-than`.
- **Đơn vị triệu hồi dùng lại sprite có sẵn:** Quỷ Sai (`h003`), Thiên Binh (`h004`), Kim Thân Hầu Vương (của Đấu Chiến Thắng Phật), Huyết Thi (của Tương Thần).
- **Thi triển cưỡng bức:** cho một thành viên tung ngay kỹ năng có sẵn của mình (dùng lại `castAbility`) mà không cần đầy Nộ hay chờ hồi chiêu.
- **Cái thật sự mới chỉ có hai thứ:**
  - **Bộ đếm hiện trên HUD:** Hồn, Kiếp Nạn, Long Uy, Thần Vị, Điền Hải.
  - **Event `bond-trigger`** để client dùng lại VFX có sẵn (lửa, băng, khiên, hồi máu, sét) và hiện toast ngắn.

## Ràng buộc

- **Thành viên duyên phận giữ đúng JASS.** Hiệu ứng mới nằm trong `content/bond-design.ts`, không sửa `catalog.json`. Mỗi hiệu ứng gắn nhãn `adapted` (phỏng theo mô tả map) hoặc `original` (bản web tự thiết kế).
- **Kỹ năng tự thi triển** (`combat.ts:1119`), nên không có cơ chế nào đòi người chơi canh thời điểm.
- **Bộ đếm sống trên `Player`** và giữ nguyên khi đem tướng đi ghép. Điều này cần cho Thỉnh Kinh → Hậu Tây Du, vì cả 5 thành viên Hậu Tây Du đều được ghép từ thành viên Thỉnh Kinh.
- **Giới hạn với boss:** sát thương theo % máu tối đa và hiệu ứng kết liễu không áp cho boss; với đầu lĩnh thì có trần. Nổ dây chuyền tối đa 2 bước.
- **Đầu trận (wave 1–5)** chỉ có 3 cặp bậc 2: Hỏa Diệm Sơn, Trần Đường Quan, U Minh. Mốc 2 của ba duyên phận này phải tự đủ mạnh.
- **Luật Duyên Tụ:** tướng thuộc từ 2 duyên phận đang kích hoạt trở lên được +15 Nộ đầu wave và +10% tốc hồi Nộ (kênh `rage-gain`).

Độ khó — A: chỉ chỉ số/cờ; B: hook sự kiện hoặc bộ đếm; C: hành vi kit mới.

---

## Ba duyên phận đầu trận

### 1. Hỏa Diệm Sơn — Thiết Phiến (2), Hồng Hài Nhi (2), Ngưu Ma Vương (3)

- **Ngách:** quái đông. **Độ khó:** B.
- **Mốc 2:**
  - Lốc của Thiết Phiến nảy qua quái đang cháy thì lan `burn` sang các mục tiêu nảy kế tiếp.
  - Hồng Hài Nhi gây thêm 25% sát thương lên quái đang cháy.
- **Mốc 3:**
  - Cú giẫm của Ngưu Ma Vương để lại vùng `tier-fire` 4 giây.
  - Khi Hồng Hài Nhi xuống dưới 30% máu, Ngưu Ma Vương tạo khiên 25% máu tối đa cho con (một lần mỗi wave, toàn bản đồ).
- **Dùng lại:** burn, tier-fire, shield. **Nguồn:** `adapted`.

### 2. Trần Đường Quan — Kim Tra (2), Mộc Tra (2), Na Tra (4), Lý Tịnh (4)

- **Ngách:** sống sót / tinh anh. **Độ khó:** B.
- **Mốc 2 — Huynh Đệ Đồng Tâm:** khi một người nhà Lý thi triển kỹ năng, mọi người nhà Lý khác nhận +15 Nộ hoặc giảm 1,5 giây hồi chiêu.
- **Mốc 3:**
  - Khiên Kim Tra mạnh thêm 40% khi đặt lên người nhà Lý.
  - Quái bị Mộc Tra trói chịu thêm 25% sát thương từ người nhà Lý.
- **Mốc 4 — Linh Lung Bảo Tháp:**
  - Lần đầu mỗi wave, người nhà Lý sắp tử trận được miễn sát thương 2,5 giây và hồi 50% máu.
  - Na Tra tự hồi sinh tại chỗ một lần mỗi wave.
- **Dùng lại:** Nộ, shield, root, miễn sát thương, hồi sinh. **Nguồn:** `adapted` (map: Lý Tịnh hồi 50%).

### 3. U Minh — Vô Thường (2), Mạnh Bà (2), Chung Quỳ (3), Phán Quan (3), Ngũ Đạo Tướng Quân (4)

Giữ cơ chế Thu Hồn, chỉ bỏ điều kiện bán kính.

- **Ngách:** quái đông → tinh anh. **Độ khó:** B.
- **Bộ đếm Hồn:** mỗi quái do thành viên hạ gục cho 1 Hồn. Tối đa 30, reset mỗi wave.
- **Mốc 2 — Câu Hồn:**
  - Mỗi Hồn cho thành viên +1% tốc đánh.
  - Vô Thường gây thêm 30% sát thương lên quái đang bị Mạnh Bà làm chậm.
- **Mốc 3 — Sinh Tử Bộ:**
  - Cứ 8 giây, Phán Quan **Kết Án** quái tinh anh hoặc đầu lĩnh nhiều máu nhất bằng `sunder` 25% trong 5 giây.
  - Quái thường dưới 12% máu bị thành viên đánh trúng thì chết ngay.
- **Mốc 4 — Âm Binh:** đủ 10 Hồn thì Chung Quỳ tiêu 10 Hồn để gọi một **Quỷ Sai** (`h003`) chiến đấu 8 giây.
- **Mốc 5 — Ngũ Đạo Luân Hồi:**
  - Thành viên tử trận khi đang có từ 15 Hồn: tiêu hết Hồn để hồi sinh ngay với 40% máu.
  - Lượng hồi của Ngũ Đạo Tướng Quân tăng 1% cho mỗi Hồn.
- **Dùng lại:** sunder, slow, `execute-damage`, triệu hồi h003, hồi sinh. **Mới:** bộ đếm Hồn. **Nguồn:** `adapted`.

---

## Giữa và cuối trận

### 4. Thỉnh Kinh — Trư Bát Giới (3), Sa Ngộ Tịnh (3), Tiểu Bạch Long (3), Tôn Ngộ Không (4), Đường Tăng (4)

- **Ngách:** tinh anh / boss, mạnh dần theo trận. **Độ khó:** B.
- **Bộ đếm Kiếp Nạn** (trên Player): +1 mỗi wave thắng, +1 mỗi đầu lĩnh hạ, +5 mỗi boss hạ. Chỉ tăng khi duyên phận đang kích hoạt. Mốc sẽ chốt lại theo `wave-plan.ts`.
- **Mốc 2 — Hộ Giá Sư Phụ:**
  - Bát Giới gánh thay 30% sát thương mà Đường Tăng nhận.
  - Sa Tăng ưu tiên hồi máu cho Đường Tăng.
  - Mỗi Kiếp cho thành viên +0,5% Công.
- **Mốc 3 — Khẩn Cô Chú:**
  - Kỹ năng của Đường Tăng gây `sunder` 15% trong 5 giây.
  - Nếu Đường Tăng tử trận, Ngộ Không +50% Công trong 8 giây.
- **Mốc 4–5 — Cột mốc Kiếp Nạn:**
  - 9 Kiếp: mỗi lần thi triển, Ngộ Không gọi 1 **Kim Thân Hầu Vương** trong 6 giây.
  - 18 Kiếp: thành viên +20% tốc chạy.
  - 36 Kiếp: thành viên +20% sát thương kỹ năng.
- **Dùng lại:** sunder, empower, triệu hồi Kim Thân Hầu Vương. **Mới:** bộ đếm Kiếp. **Nguồn:** `adapted`.

### 5. Hậu Tây Du Ký — Tịnh Đàn Sứ Giả (4), Kim Thân La Hán (4), Bát Bộ Thiên Long (4), Đấu Chiến Thắng Phật (5), Kim Thiền Tử (5)

- **Ngách:** boss / sống sót. **Độ khó:** B.
- **Mốc 2 — Chính Quả:** dùng tiếp bộ đếm Kiếp Nạn và nhận toàn bộ buff Kiếp của Thỉnh Kinh.
- **Mốc 3 — Kim Thân Bất Hoại:** mỗi thành viên, một lần mỗi wave, khi xuống dưới 30% máu được miễn sát thương 2 giây.
- **Mốc 4:** Bát Bộ Thiên Long và Tịnh Đàn Sứ Giả gây thêm 30% sát thương lên quái đang nằm trong `golden-bowl` của Kim Thiền Tử.
- **Mốc 5 — Ngũ Thánh:**
  - Đấu Chiến Thắng Phật gọi 4 Kim Thân Hầu Vương thay vì 3.
  - Mọi cột mốc Kiếp Nạn áp cho cả 5 thành viên.
- **Dùng lại:** miễn sát thương, golden-bowl, triệu hồi. **Nguồn:** `adapted`.

### 6. Tiên Tử — Mẫu Đơn Tiên Tử (2), Tinh Vệ (3), Hằng Nga (5), Nữ Oa (6)

- **Ngách:** sống sót. **Độ khó:** A–B.
- **Mốc 2 — Tiên Lộ:** lượng hồi máu thừa của thành viên biến thành `shield`, tối đa 20% máu tối đa của người nhận.
- **Mốc 3:** đồng minh đang có khiên Tiên Lộ được +15% Công (`empower`).
- **Mốc 4:** mỗi lần thành viên hồi máu, người được hồi nhận thêm 8 Nộ.
- **Dùng lại:** shield, empower, Nộ. **Nguồn:** `adapted` (map: Hằng Nga hồi 30%, Nữ Oa hồi đầy pháp lực).

### 7. Lưỡng Tình Tương Duyệt — Hậu Nghệ (5), Hằng Nga (5)

- **Ngách:** quái đông + boss. **Độ khó:** A–B.
- **Đủ 2 — Nhật Nguyệt** (toàn bản đồ):
  - Đòn thường của Hậu Nghệ bắn thêm 4 mũi phụ, mỗi mũi 40% sát thương.
  - Quái đang bị Hằng Nga đóng băng (`frozen`) mà trúng Hậu Nghệ thì chắc chắn chí mạng.
  - Khiên Ánh Trăng của Hằng Nga đặt lên Hậu Nghệ mạnh thêm 50%.
- **Dùng lại:** đa mục tiêu (`attackGeometry`), frozen, shield. **Nguồn:** `adapted` (map: Hậu Nghệ đánh 5 mục tiêu).

### 8. Phong Thần Diễn Nghĩa — Lôi Chấn Tử (4), Dương Tiễn (4), Na Tra (4), Khương Tử Nha (5)

- **Ngách:** tinh anh. **Độ khó:** B.
- **Mốc 2:** Dương Tiễn và Na Tra có 30% đánh hai lần.
- **Mốc 3:** Thiên Lôi của Lôi Chấn Tử nảy thêm 3 mục tiêu và gây thêm 20% sát thương.
- **Mốc 4 — Phong Thần Bảng:**
  - Mỗi lần thi triển, Khương Tử Nha `sealed` 2 giây và `stun` 1,2 giây con tinh anh hoặc đầu lĩnh nhiều máu nhất trong vùng.
  - Nếu con quái đó chết trong 6 giây, cả nhóm nhận 1 tầng **Thần Vị** (+6% Công, tối đa 5 tầng, reset mỗi wave).
- **Dùng lại:** sealed, stun, vùng phong-than, empower. **Mới:** bộ đếm Thần Vị. **Nguồn:** `adapted`.

### 9. Yêu Linh — Ngưu Ma Vương (3), Khổng Tước (3), Đát Kỷ (4), Kim Sí Đại Bằng (5)

- **Ngách:** sống sót / quái đông. **Độ khó:** A–B.
- **Mốc 2:** thành viên hút máu 8% (`lifesteal`).
- **Mốc 3 — Hồ Mị:** ảo tiễn của Đát Kỷ giảm 25% Công của quái trong 3 giây. Đây là cùng hiệu ứng với đặc tính của Mạnh Bà.
- **Mốc 4 — Yêu Vương Tụ Hội:**
  - Mỗi lần thành viên hạ quái, mọi thành viên hồi 2% máu.
  - Kim Sí Đại Bằng nhận +5% chí mạng cho mỗi quái hạ trong 5 giây gần nhất (tối đa 25%).
- **Dùng lại:** lifesteal, giảm Công quái, heal, crit. **Nguồn:** `adapted`.

### 10. Phật Quang Phổ Chiếu — Đấu Chiến Thắng Phật (5), Kim Thiền Tử (5), Kim Sí Đại Bằng (5)

- **Ngách:** boss / sống sót. **Độ khó:** A–B.
- **Mốc 2 — Kim Cang Bất Hoại:** thành viên nhận ít hơn 15% sát thương (`damage-reduction`).
- **Mốc 3 — Phổ Độ:** mỗi lần một thành viên thi triển, mọi tướng trong đội hồi 4% máu tối đa, và quái trúng kỹ năng đó bị `sunder` 20% trong 4 giây.
- **Dùng lại:** damage-reduction, heal, sunder. **Nguồn:** `original` (map gốc cho miễn choáng; bản web không dùng miễn khống chế).

### 11. Thiên Đình — Cự Linh Thần (2), Triệu Công Minh (3), Thái Bạch Kim Tinh (5), Tây Vương Mẫu (5), Hậu Thổ (6)

- **Ngách:** quân triệu hồi / tuyến đầu. **Độ khó:** B.
- **Mốc 2 — Thiên Quy:** mỗi khi một thành viên tạo khiên hoặc tăng giáp cho đồng minh, mọi thành viên Thiên Đình nhận +4 giáp trong 5 giây (`armorBuff`, làm mới, không cộng dồn).
- **Mốc 3 — Thiên Binh Thiên Tướng:** đầu mỗi wave gọi 2 **Thiên Binh** (`h004`) chiến đấu 20 giây.
- **Mốc 4:**
  - Kỹ năng của Thái Bạch tăng 10% giáp cho mục tiêu.
  - Thái Bạch hồi sinh đồng minh nhanh hơn 30%.
- **Mốc 5:** đòn thường của Tây Vương Mẫu đánh 5 mục tiêu; Thiên Binh gọi ra +50% chỉ số.
- **Dùng lại:** triệu hồi h004, armorBuff, đa mục tiêu. **Nguồn:** `adapted` (map: Tây Vương Mẫu 5 mục tiêu, Thái Bạch +10% phòng thủ). Không có thưởng kinh tế.

### 12. Nữ Thần — Thủy Mẫu (5), Tây Vương Mẫu (5), Nữ Oa (6), Hậu Thổ (6) — *thiết kế lại*

- **Kiểu:** Mẫu Thần ban ân. Cả nhóm là "ắc quy Nộ" cho đồng đội. **Ngách:** khuếch đại cả đội / boss. **Độ khó:** B.
- **Mốc 2 — Ân Điển:** mỗi khi một thành viên thi triển, **mọi tướng trong đội** nhận +10 Nộ hoặc giảm 1 giây hồi chiêu.
- **Mốc 3 — Mẫu Nghi:**
  - Khiên và lượng hồi máu do thành viên tạo cho đồng minh mạnh thêm 30%.
  - Tướng được Tây Vương Mẫu buff (3 đồng minh Công cao nhất) giữ buff thêm 50% thời gian.
- **Mốc 4 — Sáng Thế:**
  - Nữ Oa hồi đầy máu khi xuống dưới 50% (hồi chiêu 45 giây).
  - Cứ 20 giây, đòn kế tiếp của Hậu Thổ gây 500% Công diện rộng và `stun` 2 giây (quái thường và tinh anh; với boss chỉ 0,5 giây).
- **Dùng lại:** Nộ, cooldown, shield, heal, stun. **Nguồn:** `adapted` (map: Nữ Oa hồi đầy CD 45 giây, Hậu Thổ 500% và choáng 2 giây).

### 13. Long Tộc Huyết Mạch — Tiểu Bạch Long (3), Long Vương (3), Ứng Long (4), Chúc Long (6)

- **Ngách:** quái đông theo nhịp. **Độ khó:** B.
- **Bộ đếm Long Uy:** mỗi lần thành viên thi triển, +1 tầng (tối đa 10). Reset mỗi wave.
- **Mốc 2:** mỗi tầng +2% sát thương kỹ năng cho thành viên.
- **Mốc 3 — Long Ngâm:** đủ 10 tầng thì tiêu hết, và mọi thành viên thi triển ngay lập tức.
- **Mốc 4:**
  - Khi Long Ngâm kích hoạt, Ứng Long thi triển thêm 2 lần.
  - Quái trúng kỹ năng của Chúc Long có 15% mất thêm 8% máu tối đa (không áp cho boss; với đầu lĩnh tối đa 3%).
- **Dùng lại:** thi triển cưỡng bức, `skill-damage`. **Mới:** bộ đếm Long Uy. **Nguồn:** `adapted`.

### 14. Chân Hỏa — Hồng Hài Nhi (2), Na Tra (4), Xích Tùng Tử (4), Chúc Dung (6)

- **Ngách:** quái đông. **Độ khó:** B.
- **Mốc 2:** `burn` do thành viên gây kéo dài thêm 50% (`status-duration`), và thành viên gây +20% sát thương lên quái đang cháy.
- **Mốc 3:** tướng đang có khiên của Xích Tùng Tử gây `burn` bằng đòn đánh thường.
- **Mốc 4 — Phần Thiên:**
  - Quái chết khi đang cháy nổ 15% máu tối đa của chính nó lên quái xung quanh và gây `burn` cho chúng. Tối đa 2 bước nảy; boss không nổ.
  - Hỏa Lưu Tinh của Chúc Dung +20% tỉ lệ kích hoạt.
- **Dùng lại:** burn, VFX lửa. **Nguồn:** `adapted`.

### 15. Thủy Thần — Hà Bá (2), Thủy Mẫu (5), Cộng Công (6)

- **Ngách:** khống chế đám đông. **Độ khó:** A–B.
- **Mốc 2:** `slow` do thành viên gây kéo dài thêm 50%, và thành viên gây +20% sát thương lên quái đang bị chậm.
- **Mốc 3 — Nộ Hải:**
  - Thủy Mẫu và Cộng Công khi bị đánh có 35% phản kích 125% Công.
  - Sóng thần của Cộng Công `frozen` 1,5 giây các quái đang bị chậm.
- **Dùng lại:** slow, frozen, phản đòn (`melee-reflect`). **Nguồn:** `adapted` (map: phản kích 35%).

### 16. Đạo Vô Nhai — Lã Động Tân (2), Khương Tử Nha (5), Phục Hy (6)

- **Ngách:** tinh anh / boss. Ở đây Lã Động Tân bậc 2 vẫn có giá trị cuối trận. **Độ khó:** B.
- **Mốc 2 — Kiếm Tùy Pháp:** mỗi khi Khương Tử Nha hoặc Phục Hy thi triển, Lã Động Tân phóng 3 kiếm hỏa (dùng lại đặc tính Phi Kiếm của chính Lã Động Tân) vào mục tiêu của kỹ năng đó.
- **Mốc 3 — Thiên Cơ:**
  - Kỹ năng của Khương Tử Nha gây +50% sát thương lên quái đang bị Bát Quái của Phục Hy liên kết Nhân Quả.
  - Mỗi lần Khương Tử Nha thi triển, Phục Hy hồi 30% máu.
- **Dùng lại:** kiếm hỏa, fuxi-bagua, heal. **Nguồn:** `adapted` (map: Thiên Kiếp 900%, Phục Hy hồi 40%).

### 17. Viêm Đế Huyết Mạch — Tinh Vệ (3), Thần Nông (6) — *thiết kế lại*

- **Kiểu:** Độc thảo và ý chí lấp biển, mạnh dần trong trận. **Ngách:** quái đông, mạnh dần. **Độ khó:** B.
- **Đủ 2:**
  - Tinh Vệ đánh 6 mục tiêu, +12% tốc đánh, đòn xuyên (theo map).
  - Đòn của Tinh Vệ gây `poison` của Thần Nông.
  - Mỗi quái chết khi đang trúng độc cho Tinh Vệ 1 tầng **Điền Hải**: +1% Công, giữ suốt trận, tối đa 30 tầng.
  - Mộc Linh của Thần Nông khi biến mất hồi 20% máu cho Thần Nông.
- **Dùng lại:** poison, đa mục tiêu, heal. **Mới:** bộ đếm Điền Hải. **Nguồn:** `adapted` (map: 6 mục tiêu +12%, xuyên phá; Mộc Linh hồi 50%).

### 18. Hoàng Thiên Ứng Long — Ứng Long (4), Hiên Viên (6)

- **Ngách:** boss / quái đông. **Độ khó:** B.
- **Đủ 2:**
  - Mỗi khi Hiên Viên tung tuyệt kỹ, Ứng Long thi triển ngay kỹ năng của mình vào cùng mục tiêu.
  - Cự kiếm của Hiên Viên +30% sát thương chí mạng.
  - Mỗi lần Hiên Viên chí mạng, Ứng Long nhận +10 Nộ.
- **Dùng lại:** thi triển cưỡng bức, crit, Nộ. **Nguồn:** `adapted` (map: chí mạng 100%, +30%).

### 19. Trục Nhật — Hậu Nghệ (5), Khoa Phụ (6)

- **Ngách:** boss. **Độ khó:** A–B.
- **Đủ 2:**
  - Cả hai +30% sát thương lên boss và đầu lĩnh (`boss-damage`).
  - Bách Bộ Xuyên Dương của Hậu Nghệ để lại `burn` 100% Công mỗi giây trong 5 giây.
  - Khoa Phụ `taunt` đầu lĩnh hoặc boss gần nhất trong 3 giây, một lần mỗi 15 giây.
  - Mỗi khi đội hạ đầu lĩnh hoặc boss, cả đội +20% tốc đánh trong 8 giây.
- **Dùng lại:** boss-damage, burn, taunt, haste. **Nguồn:** `adapted` (map: thiêu 150%/giây trong 5 giây).

### 20. Chiến Phủ Hồng Hoang — Hình Thiên (5), Bàn Cổ (6)

- **Ngách:** boss / tinh anh. **Độ khó:** A.
- **Đủ 2:**
  - Đòn của Hình Thiên gây `sunder` 3 giây. Kit của Bàn Cổ vốn đã chắc chí mạng ×2,2 lên quái bị phá giáp.
  - Khai Thiên của Bàn Cổ +25% sát thương.
  - Chiến Ý của Hình Thiên mở rộng phạm vi.
  - Khi một trong hai tử trận, người còn lại lập tức đầy Nộ.
- **Dùng lại:** sunder, chí mạng sẵn có trong kit. **Nguồn:** `adapted` (map: +25%, bỏ qua né, Chiến Ý rộng hơn).

### 21. Bảo Liên Đăng — Trầm Hương (3), Dương Tiễn (4)

- **Ngách:** tinh anh. **Độ khó:** A.
- **Đủ 2:**
  - Kỹ năng của Trầm Hương cho Dương Tiễn +30% Công và giáp trong 10 giây.
  - Quái trúng Tam Tiêm của Dương Tiễn bị `sunder` 20% trong 4 giây.
- **Dùng lại:** empower, armorBuff, sunder. **Nguồn:** `adapted` (map: +30% trong 15 giây).

### 22. Tứ Hầu Hỗn Thế — Tôn Ngộ Không (4), Đấu Chiến Thắng Phật (5), Lục Nhĩ Mỹ Hầu (5)

- **Ngách:** quái đông / boss. **Độ khó:** B (sao chép kỹ năng thì C).
- **Mốc 2:**
  - Kim Thân Hầu Vương nhận 100% chỉ số bản thể (thay vì một phần như bình thường).
  - Mỗi lần thi triển, Ngộ Không gọi 1 Kim Thân Hầu Vương trong 6 giây.
- **Mốc 3 — Chân Giả Mỹ Hầu Vương:**
  - Khi Ngộ Không hoặc Đấu Chiến thi triển, Lục Nhĩ thi triển ngay kỹ năng của chính mình (thi triển cưỡng bức).
  - Phương án nâng cao, độ khó C: Lục Nhĩ sao chép kỹ năng của họ với 70% sức mạnh.
- **Dùng lại:** triệu hồi, thi triển cưỡng bức. **Nguồn:** `adapted`.

### 23. Phong Vũ Lôi Điện — Long Vương (3), Lôi Chấn Tử (4), Điện Mẫu (5), Phong Bá (5)

- **Ngách:** quái đông. **Độ khó:** B.
- **Mốc 2:** sát thương kỹ năng của thành viên +10%.
- **Mốc 3 — Phong Vũ:** kỹ năng của Long Vương và Phong Bá gây `slow` 30% trong 3 giây. Kỹ năng của Lôi Chấn Tử và Điện Mẫu gây +30% sát thương lên quái đang bị chậm.
- **Mốc 4:** mỗi đòn đánh của Điện Mẫu cộng 1 điện tích; mỗi điện tích +5% Cuồng Phong của Phong Bá (tối đa 50%, hết khi Phong Bá thi triển).
- **Dùng lại:** slow, skill-damage. **Nguồn:** `adapted` (map: +10% kỹ năng, điện tích Điện Mẫu).

### 24. Thiên Địa Nhân Đạo — Thái Bạch Kim Tinh (5), Khương Tử Nha (5), Trương Đạo Lăng (6)

- **Ngách:** boss. **Độ khó:** B.
- **Mốc 2:** Thần Lôi Phù của Trương Đạo Lăng rộng thêm 20% và có 30% chí mạng.
- **Mốc 3 — Tam Tài Quy Nhất:**
  - Sau khi cả 3 thành viên đều đã thi triển ít nhất một lần (thứ tự bất kỳ), Trương Đạo Lăng lập tức thi triển thêm một lần với +50% sức mạnh.
  - Bộ đếm sau đó reset.
- **Dùng lại:** thi triển cưỡng bức, VFX băng-lôi của Trương Đạo Lăng. **Nguồn:** `adapted`.

### 25. Âm Khí Trùng Thiên — Ngũ Đạo Tướng Quân (4), Chúc Long (6), Tương Thần (6)

- **Kiểu:** khế ước máu, đánh đổi rủi ro. **Ngách:** quái đông / boss. **Độ khó:** B.
- **Mốc 2:** khi đang giao tranh, thành viên mất 1% máu mỗi giây nhưng được +30% Công và +50% lượng hồi máu nhận được.
- **Mốc 3:**
  - Huyết Thi của Tương Thần +50% Công và máu.
  - Thành viên tử trận để lại 1 Huyết Thi trong 10 giây.
  - Kỹ năng của Chúc Long gây `burn` 6% máu tối đa của quái (không áp cho boss).
- **Dùng lại:** triệu hồi Huyết Thi, burn, chỉ số. **Nguồn:** `adapted` (map: Thi Binh +550/+5500, Hỏa Long 13%).

### 26. Tam Đại Thần Điểu — Khổng Tước (3), Kim Sí Đại Bằng (5), Phượng Hoàng (6)

- **Ngách:** sống sót / quái đông. **Độ khó:** B.
- **Mốc 2:**
  - Khổng Tước hồi máu thêm 30%.
  - Kim Sí Đại Bằng mỗi lần bị đánh cộng +5% sát thương cho Tật Phong (tối đa 50%, hết khi thi triển).
- **Mốc 3 — Niết Bàn:**
  - Phượng Hoàng khi tử trận hồi sinh tại chỗ sau 2 giây với 50% máu và nổ lửa 300% Công (một lần mỗi wave).
  - Chân Hỏa của Phượng Hoàng có 30% liên kích hai lần.
- **Dùng lại:** heal, hồi sinh, VFX lửa. **Nguồn:** `adapted` (map: 30% liên kích, Kim Sí +5%).

### 27. Thần Hỏa — Chúc Dung (6), Phượng Hoàng (6)

- **Ngách:** quái đông / boss. **Độ khó:** A–B.
- **Đủ 2:**
  - Thành viên gây +30% sát thương lên quái đang cháy.
  - Biển dung nham (`chucdung-lava`) và thảm lửa (`phoenix-carpet`) tồn tại lâu hơn 50%.
  - Cứ 35 giây, Phượng Hoàng tự thi triển thêm kỹ năng của mình với 50% sức mạnh (map: Thiên Hỏa Phượng Vũ 180%).
- **Dùng lại:** burn, vùng có sẵn, thi triển cưỡng bức. **Nguồn:** `adapted`.

---

## Ma trận đa dạng

| Kiểu cơ chế | Duyên phận |
|---|---|
| Bộ đếm tài nguyên | U Minh (Hồn), Thỉnh Kinh và Hậu Tây Du (Kiếp Nạn), Long Tộc (Long Uy), Phong Thần (Thần Vị), Viêm Đế (Điền Hải) |
| Thi triển dây chuyền | Trần Đường Quan, Nữ Thần, Long Tộc, Hoàng Thiên Ứng Long, Đạo Vô Nhai, Tứ Hầu, Thiên Địa Nhân |
| Khai thác trạng thái | Hỏa Diệm Sơn, Chân Hỏa, Thần Hỏa (cháy); Thủy Thần, Phong Vũ Lôi Điện (chậm); Chiến Phủ, Bảo Liên Đăng (phá giáp); Lưỡng Tình (đóng băng) |
| Sống sót / hồi sinh | Trần Đường Quan, Hậu Tây Du, Tiên Tử, Tam Đại Thần Điểu, Phật Quang |
| Triệu hồi | U Minh, Thiên Đình, Tứ Hầu, Âm Khí, Thỉnh Kinh |
| Rủi ro / đánh đổi | Âm Khí Trùng Thiên |
| Săn boss | Trục Nhật, Chiến Phủ, Thiên Địa Nhân, Phật Quang |

## Phối hợp chéo qua trạng thái có sẵn

- **Cháy:** Hỏa Diệm Sơn lan lửa, Chân Hỏa cho nổ, Thần Hỏa tăng sát thương lên quái đang cháy.
- **Chậm:** Thủy Thần cùng Phong Vũ Lôi Điện; Long Vương có mặt ở cả hai.
- **Phá giáp:** Chiến Phủ, Bảo Liên Đăng, Kết Án của U Minh và Khẩn Cô Chú của Thỉnh Kinh đều mở đường cho Bàn Cổ và các tướng xuyên giáp.

## Đội hình mẫu 5 tướng

- **Đầu trận:** Kim Tra, Mộc Tra, Thiết Phiến, Hồng Hài Nhi + 1 tướng tự do.
  - Bật Trần Đường Quan 2 + Hỏa Diệm Sơn 2.
  - Muốn có U Minh thì phải bỏ một cặp để lấy cả Vô Thường lẫn Mạnh Bà.
- **Tây Du:** Ngộ Không, Đường Tăng, Bát Giới, Sa Tăng, Tiểu Bạch Long → Thỉnh Kinh 5.
  - Đổi Bát Giới lấy Long Vương thì được Thỉnh Kinh 4 + Long Tộc 2. Đội mạnh hơn ngay, nhưng mất mốc 36 Kiếp và bị mất hộ vệ cho Đường Tăng.
- **Thủy Lôi:** Hà Bá, Cộng Công, Long Vương, Lôi Chấn Tử, Điện Mẫu.
  - Bật Thủy Thần 2 + Phong Vũ Lôi Điện 3.
  - Long Vương được Duyên Tụ.
- **Hỏa Ngục:** Chúc Dung, Phượng Hoàng, Na Tra, Hồng Hài Nhi, Xích Tùng Tử.
  - Bật Chân Hỏa 4 + Thần Hỏa 2.
  - Rất mạnh với quái đông, yếu sống sót.
- **Thần Nữ:** Nữ Oa, Hằng Nga, Hậu Nghệ, Tây Vương Mẫu, Hậu Thổ.
  - Bật cùng lúc Nữ Thần 3, Lưỡng Tình 2, Tiên Tử 2 và Thiên Đình 2.
  - Nhiều duyên phận, mỗi cái ở mốc thấp; Nộ xoay vòng rất nhanh.

## Kiến trúc implement

- **Dữ liệu — `content/bond-design.ts`:** mỗi duyên phận có `tiers[]`. Hiệu ứng thuộc một trong các loại:
  - `member-stats` / `team-stats`: kênh `GearStatId`, cộng vào `gearModsOf`; cache phải làm mới khi đội hình đổi.
  - `flag`: `extra-targets`, `double-strike`.
  - `hook`: tên handler.
  - Mỗi hiệu ứng kèm văn bản hiển thị và `provenance`.
- **Game-core — `bond-runtime.ts`:**
  - Phát các sự kiện `onCast`, `onShield`, `onHeal`, `onKill`, `onDeath`, `onCcApplied`, `onWaveStart`, `onWaveClear`.
  - Mỗi duyên phận có handler nhỏ trong `packages/game-core/src/bonds/`, theo mẫu thư mục `boss-kits/`.
  - Handler chỉ gọi helper có sẵn: áp trạng thái, `castAbility`, tạo đơn vị triệu hồi, hồi máu/khiên.
- **Contracts:**
  - `Player.bondState`: `kiep`, `souls`, `longUy`, `thanVi`, `dienHai`, `dienTich`, `tamTai`, các cờ "một lần mỗi wave".
  - Event `bond-trigger`.
  - Không thêm trạng thái mới trên `Unit`.
- **Client:**
  - Bảng Duyên Phận đọc văn bản từ `bond-design.ts`, hiện mốc hiện tại/kế tiếp và bộ đếm.
  - Dải bộ đếm nhỏ cạnh dock.
  - Khi kích hoạt, hiện toast ngắn và dùng lại VFX trạng thái/kỹ năng có sẵn.
- **Log:** `bond.trigger` / `bond.refresh` dạng debug, chỉ ghi id duyên phận và giá trị bộ đếm.
- **Test:**
  - Đếm mốc; bản sao không cộng.
  - Bộ đếm giữ nguyên qua ghép tướng.
  - Giới hạn với boss.
  - Thi triển cưỡng bức không tạo vòng lặp vô hạn: mỗi lần chỉ kích một tầng, không kích lại chính duyên phận đó.
  - Mỗi handler có ít nhất một test kích hoạt.

## Lộ trình

1. **Khung chung:**
   - Dữ liệu, runtime, event, bảng UI, luật Duyên Tụ.
   - Các duyên phận độ khó A: Chiến Phủ, Bảo Liên Đăng, Trục Nhật, Thủy Thần mốc 2, Yêu Linh mốc 2–3, Tiên Tử.
   - Ba duyên phận đầu trận.
2. **Thi triển dây chuyền và triệu hồi:** Trần Đường Quan, Nữ Thần, Hoàng Thiên Ứng Long, Đạo Vô Nhai, Tứ Hầu mốc 2–3, Thiên Đình, Âm Khí, Thần Hỏa, Tam Đại Thần Điểu.
3. **Bộ đếm:** U Minh đầy đủ, Thỉnh Kinh, Hậu Tây Du, Long Tộc, Phong Thần, Viêm Đế, Phong Vũ Lôi Điện, Thiên Địa Nhân.
4. **Phần còn lại:** Chân Hỏa mốc 4 (nổ dây chuyền), Phật Quang mốc 3, tùy chọn Lục Nhĩ sao chép kỹ năng.
5. **Tài liệu và rà soát:** cập nhật `docs/gameplay-spec.md`. Hoãn cân bằng số liệu đến khi chốt số wave mới.

## Quyết định đã chốt (2026-10-28)

1. **Bỏ hẳn** buff chỉ số phẳng +8% / +3 giáp / +1,5% hồi máu; mọi duyên phận chỉ dùng hiệu ứng mới.
2. **Chưa cân bằng theo 20 wave**, vì số wave sắp đổi. Số liệu giữ ở mức nháp trong `content/bond-design.ts`; mốc Kiếp Nạn là hằng số cấu hình.
3. **Không** có duyên phận liên phòng; mỗi người chơi chỉ tính tướng của mình.
4. **Thiên Đình không có thưởng kinh tế** (bỏ Linh Thạch và Linh Đan); mốc 2 đổi thành Thiên Quy.
5. **Duyên Tụ không giới hạn** số duyên phận được tính.
6. **Không dùng miễn khống chế** ở bất kỳ duyên phận nào. Phật Quang Phổ Chiếu được thiết kế lại; Chân Hỏa, Tứ Hầu và Âm Khí bỏ phần miễn khống chế.

Plan triển khai: [plans/261028-1348-bond-redesign/plan.md](../261028-1348-bond-redesign/plan.md).
