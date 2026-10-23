# Đề xuất v2: bỏ nổ lan/chém quét cho đa số tướng, passive đánh tay riêng cho carry gần và xa

Trạng thái: **ĐÃ DUYỆT và ĐÃ SỬA NGUỒN** (19-10-2026) — hộ vệ chuyển single, Phục Hy giữ nối Nhân Quả, chưa bù sức mạnh (chờ benchmark). Chưa chạy test/build. Mọi cơ chế ở đây là thiết kế web tự làm, không phải kỹ năng gốc Warcraft.

Người dùng đã chọn:
- Cách (b): chỉ bỏ `impact_splash` và `frontal_cleave`; nảy, đa tia, xuyên, khứ hồi giữ nguyên.
- Riêng tướng **support thuần**: đánh đơn mục tiêu với mọi kiểu đòn.
- Có cả carry đánh tay **gần** lẫn **xa**; mỗi tướng carry có passive riêng.

## 1. Quy tắc hình học đòn thường

| Nhóm | Quy tắc |
|---|---|
| Carry cận chiến (mục 3) | Giữ `frontal_cleave` (hoặc xuyên ngắn sẵn có). Mục tiêu phụ nhận **60%** (T1–T2: **50%**); hiện đa số đang 100%. |
| Xạ thủ (ranger) | Bỏ phần nổ lan; nảy/đa tia/xuyên giữ. |
| Pháp sư (mage) | Bỏ nổ lan quanh mục tiêu; nảy/xuyên giữ. Không có passive đánh tay (sức mạnh nằm ở kỹ năng). |
| Support | Mọi kiểu → `single`. Hiệu ứng hồi máu/khiên theo đòn đánh vẫn chạy trên một mục tiêu. |
| Hộ vệ (guardian) | Đề xuất `single` (tank giữ đường bằng chặn quái, aura và kỹ năng). Xem câu hỏi 2. |

## 2. Cơ chế passive đánh tay (máy chung, cấu hình riêng)

Trường tùy chọn mới `carryPassive` trong `HeroCombatProfile` (`combat-profiles.ts`), kiểu ở `types.ts`; không thay `onHitTrait`. Server áp ở một chỗ: lệnh gọi `basicAttack` trong `combat.ts` (bọc hàm `hurt` của đòn thường), nên chạy được cả cho tướng có file đánh riêng (Bàn Cổ, Hậu Nghệ…). Mọi thưởng sát thương và hút máu chỉ tính trên **mục tiêu chính** để không nhân lên theo số quái trúng cleave/đa tia.

Khối dựng (mỗi tướng chọn 2):
- **Hút máu**: hồi % sát thương thực gây cho mục tiêu chính (sau giáp).
- **Chiến Ý**: mỗi đòn thường +X% tốc đánh, tối đa N tầng, mất hết sau 3 giây không đánh.
- **Tập Trung**: đánh liên tiếp cùng một mục tiêu +X% sát thương mỗi đòn, tối đa N tầng; đổi mục tiêu thì về 0.
- **Viễn Kích**: +X% sát thương khi mục tiêu cách ≥ D.
- **Kết Liễu**: +X% sát thương lên mục tiêu dưới 30% Máu.
- **Diệt Thủ Lĩnh**: +X% sát thương lên tinh anh/Boss.
- **Thân Bất Hoại**: giảm X% sát thương nhận khi có ≥3 quái trong 3 đơn vị.
- **Thừa Thắng**: hạ quái bằng đòn thường → +X% tốc đánh trong 3 giây.

Tầng Chiến Ý/Tập Trung đưa vào snapshot để client có thể hiển thị (không bắt buộc đợt này).

## 3. Carry cận chiến — giữ cleave + passive riêng

| ID | Tên | Bậc | Đòn thường sau sửa | Passive (tên — chỉ số) | Ghi chú |
|---|---|---|---|---|---|
| h003 | Quỷ Sai | 1 | cleave 120° r2.2, phụ 50% | Câu Hồn Liêm — Hút máu 8%; Thừa Thắng +20% | |
| h004 | Thiên Binh | 1 | xuyên 3.5 (giữ) | Thiên Quân Trận Bộ — Chiến Ý 5%×4; Thân Bất Hoại 10% | |
| h008 | Thổ Hành Tôn | 1 | single + nứt đất đòn 4 (giữ) | Địa Mạch Cường Thân — Hút máu 6%; Thân Bất Hoại 12% | |
| h00A | Mộc Tra | 2 | cleave 150° r2.2, phụ 50% | Song Kiếm Liên Hoàn — Chiến Ý 6%×5; Hút máu 8% | bỏ `healOnHit` 12 HP (thay bằng hút máu) |
| h00C | Hồng Hài Nhi | 2 | xuyên 4 (giữ) | Hỏa Nhi Bất Diệt — Hút máu 8%; Thân Bất Hoại 10% | giữ tầng nhiệt +10% tốc đánh sẵn có |
| h00O | Phán Quan | 3 | cleave 180° r2.5, phụ 60% | Sinh Tử Bộ — Kết Liễu 30%; Hút máu 10% | |
| h00P | Ngưu Ma Vương | 3 | cleave 180° r3.2 + đẩy, phụ 60% | Đại Lực Ngưu Ma — Thân Bất Hoại 15%; Hút máu 10% | |
| h03Q | Trầm Hương | 3 | cleave 180° r3, phụ 60% | Phách Sơn Chí — Chiến Ý 6%×5; Hút máu 8% | |
| h00R | Tôn Ngộ Không | 4 | cleave 180° r3.2, phụ 60% | Tề Thiên Đại Thánh — Hút máu 10%; Diệt Thủ Lĩnh 20% | đã có +5% tốc đánh/đòn đến 40% |
| h00U | Dương Tiễn | 4 | xuyên 5.5 (giữ); cuồng nộ multishot 3 (giữ) | Thiên Nhãn Phá Ma — Tập Trung 6%×5; Hút máu 8% | |
| h00V | Na Tra | 4 | cleave 180° r3.2, phụ 60%; nezha 360° r5 giữ | Liên Hoa Hóa Thân — Chiến Ý 7%×5; Thân Bất Hoại 12% | |
| h011 | Hình Thiên | 5 | quét r3.5, phụ 60% | Bất Khuất Chi Khu — Thân Bất Hoại 15%; Kết Liễu 25% | đã có hút máu/tốc đánh theo máu mất |
| h012 | Đấu Chiến Thắng Phật | 5 | quét r3.8, phụ 60% | Kim Cang Chiến Phật — Hút máu 12%; Diệt Thủ Lĩnh 20% | |
| h016 | Kim Sí Đại Bằng | 5 | quét r3.5, phụ 60% | Bằng Dực Cuồng Phong — Chiến Ý 7%×5; Hút máu 10% | |
| h03Y | Lục Nhĩ Mỹ Hầu | 5 | sóng âm xuyên 6 (giữ) | Lục Nhĩ Tỏa Địch — Tập Trung 6%×5; Hút máu 10% | |
| h01B | Bàn Cổ | 6 | chém 180° r3.8, phụ 60%; Hỗn Độn Chấn đòn 3 giữ | Khai Thiên Thần Lực — Hút máu 12%; Thân Bất Hoại 15% | |
| h03Z | Tương Thần | 6 | cào r3.6, phụ 60% | Thi Tổ Cuồng Huyết — Chiến Ý 8%×5; Kết Liễu 25% | đã hồi 35% sát thương nên không thêm hút máu |
| h01I | Đế Tuấn | 6 | single 130% (giữ) | Thái Dương Đế Uy — Diệt Thủ Lĩnh 25%; Tập Trung 5%×6 | |

## 4. Carry tầm xa (xạ thủ) — passive riêng

| ID | Tên | Bậc | Đòn thường sau sửa | Passive (tên — chỉ số) |
|---|---|---|---|---|
| h001 | Thiên Lý Nhãn | 1 | single (giữ) | Thiên Lý Truy Tung — Viễn Kích +20% (≥6); Tập Trung 4%×5 |
| h002 | Thuận Phong Nhĩ | 1 | nảy 2 (giữ) | Phong Thanh Tốc Xạ — Chiến Ý 5%×4 |
| h005 | Xạ Nhân | 1 | **single** (bỏ nổ r2) | Trọng Cung Bách Bộ — Viễn Kích +15% (≥6); Tập Trung 5%×4 |
| h00B | Thiết Phiến | 2 | đa tia 2 (giữ) | Ba Tiêu Cuồng Vũ — Chiến Ý 6%×4 |
| h00H | Vô Thường | 2 | single (giữ) | Câu Hồn Liên Đoạt — Thừa Thắng +25%; Tập Trung 5%×5 |
| h00I | Mạnh Bà | 2 | nảy 3 (giữ) | Vong Xuyên Dẫn Hồn — Chiến Ý 5%×5 |
| h00L | Tiểu Bạch Long | 3 | đa tia 3 (giữ) | Long Ngâm Liên Xạ — Chiến Ý 6%×5 |
| h00M | Tinh Vệ | 3 | **single** (bỏ nổ r2.2) | Tinh Vệ Điền Hải — Tập Trung 6%×5; Viễn Kích +15% (≥6) |
| h00X | Đát Kỷ | 4 | nảy 2 (giữ) | Hồ Mị Đoạt Phách — Thừa Thắng +25% |
| h00Z | Ứng Long | 4 | đa tia 3 (**bỏ nổ r2.5** mỗi mũi) | Ứng Long Phá Không — Chiến Ý 6%×5; Viễn Kích +15% (≥6) |
| h03V | Bát Bộ Thiên Long | 4 | đa tia 3 × xuyên 4 (giữ) | Thiên Long Bát Bộ — Chiến Ý 6%×5 |
| h017 | Hậu Nghệ | 5 | xuyên 12 (giữ) | Xạ Nhật Thần Nhãn — Viễn Kích +25% (≥7); Diệt Thủ Lĩnh 15% |
| h01A | Tây Vương Mẫu | 5 | 5 trâm (giữ) | Dao Trì Kim Trâm — Chiến Ý 7%×5 |
| h01F | Hiên Viên | 6 | 5 kiếm khí (giữ) | Hiên Viên Đế Kiếm — Tập Trung 5%×6; Diệt Thủ Lĩnh 15% |
| h041 | Phượng Hoàng | 6 | 4 lông (**bỏ nổ r2.8** mỗi lông) | Phượng Vũ Cửu Thiên — Chiến Ý 7%×5; Viễn Kích +20% (≥7) |

## 5. Tướng bị đổi đòn thường, không có passive

| ID | Tên | Vai | Trước → sau | Xử lý |
|---|---|---|---|---|
| h006 | Tiên Nữ | support | nổ r2.5 → single (giữ hồi 20 HP) | chung |
| h00F | Mẫu Đơn Tiên Tử | support | nảy 2 → single | chung |
| h00K | Sa Ngộ Tịnh | support | khứ hồi 6 → single (giữ phá giáp) | chung |
| h03R | Khổng Tước | support | đa tia 3 → single (giữ hút sinh lực) | chung |
| h00Y | Ngũ Đạo Tướng Quân | support | đa tia 5 → single (giữ hồi/tốc đánh đồng minh mỗi đòn) | chung |
| h010 | Xích Tùng Tử | support | nảy 2 → single (giữ Dẫn Hỏa) | chung |
| h03U | Kim Thân La Hán | support | khứ hồi 7 → single | chung |
| h018 | Hằng Nga | support | nảy 4 → single (giữ chậm) | `hangnga-combat.ts` |
| h03X | Bồ Đề Tổ Sư | support | nảy 4 → single (giữ hồi máu) | `divine-support-combat.ts` |
| h014 | Nguyên Thủy Thiên Tôn | support | xuyên 10 → single (giữ gọt giáp, đánh dấu) | `divine-god-combat.ts` |
| h01C | Nữ Oa | support | 3 đá nảy → 1 đá single (giữ chậm, hồi/khiên đồng minh) | `nuwa-combat.ts` |
| h01D | Phục Hy | support | nảy 6 + Nhân Quả → xem câu hỏi 3 | `fuxi-combat.ts` |
| h00G | Hà Bá | mage | nổ r2.5 → single (giữ chậm) | chung |
| h03P | Bảo Quả Tử | mage | nổ r2.2 → single (giữ độc) | chung |
| h00N | Chung Quỳ | mage | nổ r2.8 → single (giữ bỏng; nổ khi đủ 8 linh hồn là nội tại, giữ) | chung |
| h00S | Đường Tăng | mage | nổ r2.5 → single | chung |
| h013 | Kim Thiền Tử | mage | nổ r3.2 → single (giữ Tịnh Độ trên mục tiêu) | `kimthien-combat.ts` |
| h01E | Thần Nông | mage | nổ r3.5 → single (giữ độc, hồi đồng minh) | `shennong-combat.ts` |
| h01H | Chúc Dung | mage | nổ r3.5 → single (giữ nổ khi quái cháy chết và vệt lửa) | `chucdung-combat.ts` |
| h040 | Trương Đạo Lăng | mage | nảy 6 giữ, **bỏ nổ r2.5** tại mỗi điểm | `truong-dao-lang-combat.ts` |
| h009, h00E, h00J, h03S, h00W, h03T | hộ vệ T2–T4 | guardian | cleave/nổ → single | chung |
| h03W, h01G, h01J | Nhiên Đăng, Cộng Công, Như Lai | guardian | đèn/quét/ấn → single (aura giữ) | file riêng; Cộng Công là mẫu VFX |

Không đổi: h001, h007, h00H, h03O, h015 (đã single); h00D, h00T, h019, h00Q, h01K (pháp sư nảy/xuyên, cách b giữ).

## 6. Ảnh hưởng và việc kèm theo

- Viết lại mô tả trait có nhắc nổ lan/chém quét/nảy (`content/catalog.ts`, `content/tier-hero-design.ts`, design file riêng như `new-divine-design.ts`), thêm dòng passive cho carry. Không sửa `content/data/catalog.json`.
- Docs: `docs/gameplay-spec.md` (hình học + passive carry), `docs/tai-lieu-co-che-game-chi-tiet.md`.
- Ghi chú bàn giao cho phiên VFX (không tự sửa `apps/client` visual-*): `attackType` của tướng bị đổi thành `single`; event `splash-*` và nổ phụ không còn phát; cleave giữ nguyên event.
- Test: sửa `attack-geometry.test.ts`, `lower-tier-identity.test.ts`, `tier-heroes.test.ts`, `tier3-tier4-combat.test.ts` và test riêng các tướng file riêng bị đổi; thêm test: support/mage không trúng quái bên cạnh, cleave đúng góc/bán kính/tỉ lệ phụ, từng khối passive đúng chỉ số (hút máu chỉ mục tiêu chính, Chiến Ý phân rã 3s, Tập Trung reset khi đổi mục tiêu…). `hero-balance-benchmark.test.ts` sẽ đổi số — người dùng chạy để chỉnh cân bằng.

## Câu hỏi cần trả lời

1. Duyệt bảng passive mục 3 và 4 (tên, khối, chỉ số)?
2. Hộ vệ chuyển single như đề xuất, hay giữ cleave/nổ hiện tại?
3. Phục Hy: (khuyến nghị) đòn thường đánh 1 mục tiêu nhưng Nhân Quả vẫn nối quanh mục tiêu (bán kính 4, tối đa 5) và chia 35% sát thương — hay bỏ hẳn nối, chỉ còn đơn mục tiêu?
4. Pháp sư/support mất nổ lan có cần bù (vd +15–20% Công) ngay, hay để sau khi chạy benchmark?
