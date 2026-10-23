# Bản sắc kỹ năng tướng bậc 1–4 theo khung Thánh/Thần

## Context

Đợt cân bằng ngày 19-10-2026 đã gán cho mỗi tướng bậc 5–6 một vai chính và chỉ để tướng chuyên khống chế giữ khống chế cứng (`docs/gameplay-spec.md`, mục "Cân bằng lại Thánh/Thần"). Bậc 1–4 đã có bộ chiêu giàu bản sắc (khiên phản đòn, Liên Đới, Linh Thạch, bất tử, truyền Nộ, giảm hồi chiêu...), nhưng còn ba vấn đề:

1. **Lỗi thời vì tính theo Công bản thân.** Công trung bình tăng gần gấp đôi mỗi bậc (khoảng 50 → 100 → 180 → 380 → 750 → 1.150). Hồi máu và khiên của hỗ trợ bậc thấp tính theo Công người dùng chiêu, hoặc theo Máu tối đa của người dùng chiêu thay vì người nhận. Về cuối trận, những phần này còn quá nhỏ để có ý nghĩa.
2. **Khống chế cứng ở tướng không chuyên khống chế:** Mộc Tra, Cự Linh Thần (choáng ẩn trong `combat.ts`), Tiểu Bạch Long, Tinh Vệ, Ngưu Ma Vương, Tôn Ngộ Không, Lôi Chấn Tử, Lý Tịnh, Đát Kỷ, Ứng Long, Bát Bộ Thiên Long.
3. **Sát thương theo % Máu kẻ địch:** hồ sơ gốc của Đát Kỷ và mô tả `stacking_mark`.

Mục tiêu: bậc thấp không đánh mạnh hơn bậc cao, nhưng **đôi khi** vẫn đáng giữ một ô nhờ đặc sản riêng. Người dùng đã chốt:

- **Giữ nguyên bộ chiêu và bản sắc từng tướng.** Chỉ sửa đúng các điểm vi phạm ở trên; viết lại mô tả cho khớp.
- Hai đòn bẩy: hỗ trợ tính theo chỉ số đồng minh, và tiện ích độc quyền (đã có sẵn trong bộ chiêu).
- Bậc 1 giữ nội tại đánh thường, không có kỹ năng chủ động.
- Luật khống chế cứng của bậc 5–6 áp dụng cho bậc 2–4.
- **Không làm VFX** trong đợt này.

## Quy tắc sửa (chỉ ba loại)

**R1 – Phần hỗ trợ tính theo người nhận.** Hồi máu và khiên cho đồng minh đổi sang `% Công người dùng chiêu + % Máu tối đa người nhận`. Phần theo Công được giữ, nên đầu trận vẫn như cũ; phần theo Máu người nhận giữ cho chiêu còn giá trị về sau. Mức % Máu theo bậc: bậc 2 khoảng 5–8%, bậc 3 khoảng 8–12%, bậc 4 khoảng 12–18%. Mức này thấp hơn bậc 5–6 (25–30%). Các buff tỷ lệ (% Công, % tốc đánh, % sát thương nhận, % phá giáp, giảm hồi chiêu, Nộ, Linh Thạch) vốn không phụ thuộc Công bản thân, nên **giữ nguyên số**.

**R2 – Khống chế cứng → khống chế mềm.** Ở tướng không chuyên khống chế, choáng/trói/đóng băng/khiêu khích đổi thành làm chậm, đẩy lùi hoặc giữ chân, là những hiệu ứng luôn trúng. Phần còn lại của chiêu giữ nguyên. Tướng chuyên khống chế bậc 2–4: **Chung Quỳ, Long Vương, Đường Tăng**. Ba tướng này giữ nguyên khống chế cứng, gieo tỷ lệ theo bậc.

**R3 – Không gây sát thương theo % Máu kẻ địch.** Đổi sang hệ số Công tương đương.

**Không cộng dồn cùng loại.** Buff hoặc debuff tỷ lệ cùng nhóm (tăng % Công, tăng % tốc đánh, giảm sát thương nhận, quái nhận thêm sát thương, phá giáp %, giảm Công quái) lấy giá trị lớn nhất và làm mới thời gian, không cộng. Tướng bậc thấp lấp nhóm buff mà đội đang thiếu, chứ không chồng thay được bậc 6.

## Từng tướng: bộ chiêu giữ nguyên và điểm sửa

Cột "Giữ nguyên" là toàn bộ bộ chiêu hiện có. Cột "Sửa" chỉ ghi điểm vi phạm R1/R2/R3; ô "—" nghĩa là không đổi.

**Bậc 2 – Huyền** (`content/tier-hero-design.ts`)

| Tướng | Giữ nguyên | Sửa |
|---|---|---|
| h009 Kim Tra | Chặn 6, 20% phá 3 Giáp; Kim Quang Hộ Thể: khiên cho bản thân và đồng minh thấp máu nhất, phản 35% sát thương cận chiến | R1: khiên dùng 10% Máu tối đa của **người nhận** thay vì của Kim Tra |
| h00A Mộc Tra | Hồi 8 HP mỗi đòn; quét kiếm khí 230%, độc 30/giây trong 3 giây | R2: trói 1,8 giây → chậm 40% trong 1,8 giây |
| h00B Thiết Phiến | Đẩy nhẹ quái gần; lốc nảy 4 quái, đẩy lùi 1,8, chậm 35% | — |
| h00C Hồng Hài Nhi | +15% sát thương lên quái đang cháy; quét lửa 250% + thiêu đốt | — |
| h00D Lã Động Tân | 20% phóng kiếm hỏa; cự kiếm nổ 235% + vùng kiếm hỏa | — |
| h00E Cự Linh Thần | Chặn 7, chấn động khi bổ búa; tường kim khí: khiên, +6 Giáp, giảm 25% sát thương nhận | R1: khiên dùng 15% Máu người nhận. R2: bỏ choáng ẩn 1,2 giây trong `combat.ts` |
| h00F Mẫu Đơn Tiên Tử | Hào quang +8% tốc đánh; hồi 3 đồng minh thấp máu, +25% tốc đánh | R1: hồi 200% Công + 6% Máu người nhận |
| h00G Hà Bá | Đòn làm chậm 15%; xoáy nước 215%, hút về tâm, chậm 55% | — |
| h00H Vô Thường | +20% sát thương lên quái dưới 40% Máu; xích nảy 4 quái, gọt 4 Giáp, chậm 40% | — |
| h00I Mạnh Bà | Đòn giảm 15% Công quái; canh nảy 5 quái, chậm 60% tốc chạy và 30% tốc đánh | — |
| h03O Nhiếp Tiểu Thiến | Chuyển 20% sát thương thành máu cho tuyến trước; hồi vùng, phần dư thành khiên | R1: hồi 210% Công + 5% Máu người nhận |
| h03P Bảo Quả Tử | Độc khi đánh; thần quả nổ 230%, bào tử độc, giảm 25% Giáp | — |

**Bậc 3 – Siêu** (giữ hồ sơ `content/tier3-tier4-brief.json`; phần ghi đè đặt ở file mới `content/tier3-tier4-rework.ts`)

| Tướng | Giữ nguyên | Sửa |
|---|---|---|
| h00J Trư Bát Giới | Hồi 1,5% Máu khi cào quái đang chậm; sóng nước đẩy lùi, khiên Thủy Mạc 5 giây, nổ 220% + chậm 50% khi khiên vỡ | R2: khiêu khích → **+8 giới hạn chặn trong 5 giây**. Hộ vệ đã thu hút quái theo giới hạn chặn, nên đây là bản "hút đòn" không gieo tỷ lệ |
| h00K Sa Ngộ Tịnh | Tràng hạt khứ hồi gọt 3 Giáp; hồi 3 đồng minh, ward 30%, **giảm 2 giây hồi chiêu** | R1: hồi 260% Công + 9% Máu người nhận |
| h00L Tiểu Bạch Long | 3 tên độc; rồng xuyên làn 310% | R2: trói quái đang độc/chậm → chậm 60% trong 2 giây |
| h00M Tinh Vệ | Đá nổ lan; mưa 8 tảng, chậm 40%, trúng từ 3 tảng phá 6 Giáp | R2: viên thứ tư choáng 0,4 giây → phá 3 Giáp; trúng từ 3 tảng choáng 1,6 giây → chậm 70% trong 1,6 giây (giữ phá 6 Giáp) |
| h00N Chung Quỳ | Bùa âm hỏa nổ; ấn chu sa 280%, câm lặng/phong ấn Boss, vùng đốt và **+20% sát thương nhận** | — (chuyên khống chế) |
| h00O Phán Quan | +35% chí mạng lên quái chậm/cháy; chữ "Tử" 340%, sát thương chuẩn dưới 35% Máu, **Liên Đới** chia 40% sát thương | — |
| h00P Ngưu Ma Vương | Bổ rìu phá 15% Giáp, đẩy nhẹ; địa chấn 350%, chắc chắn chí mạng lên quái chậm/cháy | R2: choáng 1,8 giây → đẩy lùi 1,5 và chậm 50% |
| h00Q Long Vương | Sóng rồng chậm 30%; Đại Hồng Thủy 270%, đẩy cả làn 2,5, đóng băng quái đang chậm, vùng nước chậm 50% | — (chuyên khống chế) |
| h03Q Trầm Hương | Hiệp kích khi đồng minh dùng chiêu, giảm 1 giây hồi chiêu; bổ núi 300%, phá 35% Giáp, **+20% Công cho đồng minh trong vùng** | R1: hồi 100% Công + 5% Máu người nhận |
| h03R Khổng Tước | Lông vũ rút máu hồi đồng minh; Ngũ Sắc Thần Quang hồi toàn đội, **xóa choáng/chậm từ Boss**, +30% tốc đánh, +15% sát thương Mộc | R1: hồi 280% Công + 10% Máu người nhận |
| h03S Triệu Công Minh | Roi lửa nổ; đồng tiền 220%, giảm 30% Công quái, khiên vàng cho tuyến trước, **+25 Linh Thạch** khi trúng từ 10 quái hoặc Boss | R1: khiên 260% Công + 15% Máu **người nhận** |

**Bậc 4 – Tiên**

| Tướng | Giữ nguyên | Sửa |
|---|---|---|
| h00R Tôn Ngộ Không | 25% chí mạng, cộng dồn tốc đánh; gậy 380%, phá 30% Giáp, 2 phân thân 6 giây | R2: bỏ choáng 1,5 giây, thay bằng chậm 50% |
| h00S Đường Tăng | Đòn thường +4 Nộ cho đồng minh; Kim Cô 410% (đã bỏ % Máu), choáng, vùng chậm 50% và **+25% sát thương nhận** | — (chuyên khống chế) |
| h00T Lôi Chấn Tử | Sét nảy 4 (7 nếu quái ướt); 10 cột sét, trường điện từ | R2: bỏ choáng 0,3 giây mỗi nhịp |
| h00U Dương Tiễn | Kiếm khí xuyên, liên kích 35%, Hạo Thiên Khuyển cắn Boss phá 30% Giáp; tia Thiên Nhãn sát thương chuẩn, Chiến Thần 6 giây | — |
| h00V Na Tra | Vòng lửa quanh thân; Càn Khôn Quyển nảy 8 lần, Ba Đầu Sáu Tay | — |
| h00W Lý Tịnh | Hào quang tuyến trước +8 Giáp, giảm 15% sát thương Boss; tháp vàng 280%, chậm và giảm 50% Công quái, khiên toàn đội | R1: khiên 280% Công + 20% Máu người nhận. R2: bỏ choáng 1,5 giây (giữ chậm/giảm Công) |
| h00X Đát Kỷ | Hồ hỏa nảy 3, ấn Mê Hồn Hương 4 tầng nổ và hồi máu; sóng nảy 7, giảm 40% Giáp, +25% sát thương nhận | R2: mê hoặc/trói 1,8 giây → chậm 80% trong 1,8 giây. R3: ấn nổ 5% Máu hiện tại → nổ theo Công (đề xuất 150% Công) |
| h00Y Ngũ Đạo Tướng Quân | 5 u hồn tiễn, hồi 1% Máu và cộng dồn tốc đánh cho đồng minh; Phược Hồn Xích nối 8 quái chia 50% sát thương, +45% tốc đánh và 15% hút máu toàn đội | — |
| h00Z Ứng Long | 3 thương băng nổ chậm 35%, ×2 sát thương lên quái đóng băng; bão tuyết 360%, phá 30% Giáp | R2: đóng băng 2,2 giây → chậm 70%. Nội tại ×2 lên quái đóng băng giữ nguyên, dùng băng của Long Vương, Cộng Công, Chúc Long |
| h010 Xích Tùng Tử | Dẫn Hỏa +15% chí mạng cho đồng minh; cam lộ hồi và khiên miễn chậm/choáng, +30% Công, +25% sát thương chí mạng, đòn thường gây bỏng | R1: hồi 270% Công + 12% Máu người nhận |
| h03T Tịnh Đàn Sứ Giả | Mỗi đòn tạo khiên 2% Máu; hút gom quái 240%, giảm 40% Công quái, ward 40%, phản 60% | — |
| h03U Kim Thân La Hán | Xá Lợi khứ hồi giảm 25% Giáp, hồi tuyến trước; hồi 4 đồng minh, **Kim Thân Hộ Mệnh bất tử 2 giây**, **+35 Nộ / −3 giây hồi chiêu** cho tướng Công cao nhất | R1: hồi 320% Công + 12% Máu người nhận |
| h03V Bát Bộ Thiên Long | 3 tên xuyên 4 quái, độc, chậm 25%; 3 rồng 370% có chí mạng, +50% tốc đánh | R2: trói 2,2 giây → chậm 70% |

**Bậc 1 – Linh:** giữ tám nội tại, không thêm kỹ năng, chỉ chỉnh số nếu benchmark cho thấy một tướng lệch hẳn khỏi nhóm.

## Triển khai

0. Chép kế hoạch này sang `plans/261019-1557-lower-tier-skill-identity/plan.md`.
1. **Contract** (`packages/contracts/src/types.ts`): thêm trường tùy chọn `recipientMaxHpRatio` vào `AbilityEffect` và trạng thái tướng `blockBonus?: { remaining; amount }`. Không đổi trường cũ.
2. **Helper** – file mới `packages/game-core/src/ally-scaled-support.ts`:
   - `healAlly` và `shieldAlly`: Công người dùng chiêu × hệ số + Máu tối đa người nhận × tỷ lệ.
   - `applyAllyBuffMax` và `applyEnemyDebuffMax`: giữ giá trị lớn nhất cho các trường `empower`, `haste`, `ward`, `bonusArmor`, `pureLand`, `sunder` đã có.
3. **Nguồn thiết kế:**
   - Sửa số và mô tả bậc 1–2 trong `content/tier-hero-design.ts`.
   - Phần ghi đè mô tả/số bậc 3–4 đặt trong `content/tier3-tier4-rework.ts`, áp trong `content/tier3-tier4-design.ts`. Giữ nguyên file brief làm bản ghi hồ sơ gốc.
   - Sửa mô tả `stacking_mark` trong `packages/contracts/src/combat-profiles.ts`.
   - Không sửa `content/data/catalog.json`.
4. **Game-core:**
   - `combat.ts`, nhánh heal/shield chung (khoảng dòng 580–625): dùng helper và bỏ choáng ẩn của h00E.
   - `tier3-combat.ts` và `tier4-combat.ts`: chỉ thay các lời gọi `tryHardControl` của tướng không chuyên khống chế bằng `applyEnemyStatus`/`knockEnemyBack`, đổi hồi/khiên sang helper, đổi khiêu khích của Bát Giới thành `blockBonus` và đổi ấn ký của Đát Kỷ sang theo Công.
   - Áp `blockBonus` ở chỗ tính giới hạn chặn khi quái chọn mục tiêu.
   - Dùng `grep` dò mọi lời gọi `tryHardControl` để không sót.
   - Thêm log debug ngắn cho `blockBonus`.
5. **Client:** mô tả mới hiện qua catalog. Không làm VFX mới. Nếu VFX trói/choáng cũ còn bám vào trạng thái đã bỏ, chỉ gỡ điều kiện.
6. **Test** (viết hoặc cập nhật; người dùng tự chạy):
   - Cập nhật `tier-heroes.test.ts` và `tier3-tier4-combat.test.ts`.
   - Test mới `lower-tier-identity.test.ts`:
     - Với `controlChanceOverride = 1`, tướng không chuyên khống chế không ghi lần gieo nào.
     - Lượng hồi/khiên tăng theo Máu người nhận.
     - Buff cùng nhóm lấy giá trị lớn nhất.
     - `blockBonus` hết hạn đúng thời gian.
     - La Hán vẫn bất tử và truyền Nộ.
     - Triệu Công Minh vẫn cộng Linh Thạch.
   - Mở rộng `hero-balance-benchmark.test.ts` ra bậc 2–6 và khẳng định trung vị sát thương tăng theo bậc.
7. **Tài liệu:**
   - `docs/gameplay-spec.md`: thêm mục "Cân bằng lại Linh–Tiên" gồm R1–R3, luật không cộng dồn và danh sách tướng chuyên khống chế. Sửa mục Tier 3–4 cho khớp.
   - `docs/content-provenance.md`: ghi chú các điểm lệch khỏi hồ sơ gốc.

## Kiểm tra (người dùng chạy)

```bash
npm run typecheck
```
```bash
npx vitest run packages/game-core/test/lower-tier-identity.test.ts packages/game-core/test/tier-heroes.test.ts packages/game-core/test/tier3-tier4-combat.test.ts packages/game-core/test/crowd-control.test.ts packages/game-core/test/hero-balance-benchmark.test.ts
```

Sau đó dừng server cũ, chạy `start-game.cmd`, rồi `Ctrl+F5`. Thử Khổng Tước hoặc Kim Thân La Hán cùng tướng bậc 5–6 ở wave 20 trở lên, kiểm tra panel mô tả mới và log `crowd-control` (tướng không chuyên khống chế không có lần gieo nào). Agent không chạy các bước này.

## Câu hỏi mở

- Xạ Nhân h005 (bậc 1) có choáng 0,4 giây ở nội tại. Mặc định giữ, theo quyết định giữ nội tại bậc 1. Cần người dùng xác nhận.
- Hệ số ấn ký mới của Đát Kỷ (150% Công) và các mức % Máu ở R1 là đề xuất, chỉnh sau bằng benchmark.

## Trạng thái (19-10-2026)

- Đã sửa nguồn theo R1–R3 cho bậc 2–4; chưa chạy typecheck, test, build hay game theo `AGENTS.md`. VFX không đổi; client vẽ trạng thái từ snapshot.
- Lệch so với kế hoạch:
  - Chỉ số và chiêu bậc 1–2 lúc chạy lấy từ `HERO_STATS_OVERRIDES` trong `content/catalog.ts`, không lấy từ `content/tier-hero-design.ts` (file đó chỉ phục vụ bộ trích xuất). Vì vậy sửa ở `catalog.ts`.
  - Mộc Tra lúc chạy dùng Cuồng Vũ; phần trói nằm ở dây leo của đòn thường cuồng hóa (`attack-geometry.ts`), nay đổi thành chậm 40%.
  - Thiết Phiến có choáng ẩn ở đòn thứ ba (`combat-profiles.ts`), nay đổi thành thổi lùi 0,6 qua `nthEffect: 'knockback'` mới.
  - Đường Tăng: code đã tính 410% Công, nhưng mô tả vẫn ghi 8% Máu hiện tại; nay sửa mô tả.
  - Ấn ký của Đát Kỷ vốn đã tính 300% sát thương đòn gốc; chỉ sửa mô tả.
  - Ngũ Đạo trước đây ghi đè cuồng chiến của đồng minh (xóa Chiến Thần của Dương Tiễn); nay chỉ nâng hút máu.
  - Buff mạnh hơn đang có hiệu lực được giữ nguyên, không bị kéo dài thời gian.
  - Không thêm log riêng cho `blockBonus` vì game-core không có logger. Trạng thái này nằm trong snapshot và event `ability` sẵn có.
