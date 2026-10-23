# Bảng đặc tả VFX bậc 1–2 (20 tướng) — CHỜ DUYỆT

Nguồn: `content/tier-hero-design.ts`, `packages/contracts/src/combat-profiles.ts`, `attack-geometry.ts`, `combat.ts`. Nguyên tố: 1 Kim, 2 Mộc, 3 Thủy, 4 Hỏa, 5 Thổ. Lib = flipbook `vfx-lib-<nt>-<burst|shards|pillar|hit>`. Chưa có code nào được viết.

## Event thật (đã dò server)

| Nguồn | skillId | Ghi chú |
|---|---|---|
| Đánh thường | `trait-<id>` kind `attack`, có `geometry`, `isCrit`, `traitType` | mọi tướng |
| Nảy | `bounce-<id>` | h002 h00F h00I |
| Đòn thứ n | `nth-<id>` kind `trait` | h005 h00B h00E (h008: xem rủi ro 1) |
| Ấn nổ | `mark-detonate-<id>` | h002 h00C h00I h03P |
| Hiệp kích | `follow-up-<id>`, `follow-up-heal-<id>` | h006 h03O |
| Hào quang | `aura-ice-<id>` mỗi 0,5 s mỗi quái | h003? h007 h00F h00G |
| Nổ thiêu | `burst-h003` | h003 |
| Tuyệt kỹ | `cast`/`ability` `web-<id>` | tier 2 (trừ h03O…): có số liệu bên dưới |

## Bậc 1 (chỉ nội tại + đánh thường)

| ID | Tướng (nt) | Hình chính | Quỹ đạo / hình học | Nhịp 4 pha | Dấu trạng thái | Khác gì cùng hệ/archetype |
|---|---|---|---|---|---|---|
| h001 | Thiên Lý Nhãn (Kim) | tia nhìn vàng mảnh + mắt/ấn tròn trên mục tiêu | đạn thẳng `single`, ưu tiên máu cao nhất | ngắm (vòng khóa) → tia → chạm (lib-kim-hit) → vết Giáp vỡ khi crit | vết nứt Giáp 3,5 s (sunder) | tia thẳng mảnh, không nảy/không lan |
| h002 | Thuận Phong Nhĩ (Mộc) | sóng âm xanh lục lan thành vòng, nảy sang quái gần nhất | `bounce` 2, bán kính 4 | sóng đi → chạm → nảy (cung 4 đv) → dư âm độc | giọt độc + dấu ấn xếp lớp (5 nổ) | nảy bằng sóng âm (h00F nảy bằng cánh hoa) |
| h003 | Quỷ Sai (Hỏa) | lưỡi liêm âm hỏa chém cung 120° ngọn lửa xanh-tím | `frontal_cleave` r2,2 | lấy đà → chém cung → hỏa bám quái → nổ khi chết (`burst-h003`, r2) | ngọn lửa bám 3 s | cung chém nhỏ; lửa tím khác h00C (lửa cam, đường thẳng) |
| h004 | Thiên Binh (Kim) | mũi thương vàng đâm thẳng, đâm thêm lần 2 | `linear_pierce` dài 3,5 | thu thương → đâm → xuyên → đâm bồi 30% | vết chảy máu | đường đâm ngắn thẳng; h00D dài 8 |
| h005 | Xạ Nhân (Thổ) | mũi tên nặng đất + nện ra đá vụn | `impact_splash` r2; đòn 3 gây choáng 0,4 s | giương → bắn → nổ đá r2 → bụi mờ; đòn 3: đá bật + đẩy lùi | choáng (sao quay) ở đòn 3 | splash đá vụn; h00E là búa kim loại |
| h006 | Tiên Nữ (Mộc) | cánh hoa nở trên mục tiêu + dải sinh khí tới đồng minh | `impact_splash` r2,5 + hiệp kích hồi 20 HP | hoa rơi → nở → hồi (sợi sáng lục tới đồng minh) | sinh khí 1 nhịp | splash hoa, hồi bằng sợi sinh khí; h00F là tuyệt kỹ hồi diện rộng |
| h007 | Quy Thừa Tướng (Thủy) | mai rùa băng quanh chủ thể, vòng sương chạm quái đến gần | `single` + `orbit_aura` r2,8 | mai hình thành (cố định) → sóng sương mỗi 0,5 s trên quái chạm | quái chậm: sương bám chân | mai rùa tĩnh tại người; h00G nước xoáy bay |
| h008 | Thổ Hành Tôn (Thổ) | trồi đất ở chân quái, nứt đất r2,5 mỗi đòn 4 | `single`; nth_strike 4 earthquake | lướt/độn thổ → trồi → nứt đất → bụi dư âm | giáp +4 (vầng đất) | vết nứt tĩnh; h005 bụi đá bay |

## Bậc 2 (đánh thường + tuyệt kỹ)

| ID | Tướng (nt) | Chiêu · số liệu | Hình chính (tuyệt kỹ) | Nội tại/đánh thường | Khác gì cùng hệ |
|---|---|---|---|---|---|
| h009 | Kim Tra (Kim) | Kim Quang Hộ Thể Trận · khiên r5, 2 đồng minh, phản 35% | chuông vàng úp lên đồng minh (kitShell fresnel + lib-kim-pillar) | cung chém r2,2 vết vàng; crit vỡ giáp | khiên vàng phản đòn; h00E tường kim khí |
| h00A | Mộc Tra (Mộc) | Ngô Câu Mộc Khí Trảm · cleave r3,8, trói 1,8 s | kiếm khí xanh lục + dây leo trói quái (lib-moc-shards) | song kiếm cung 180°, hút máu | kiếm cung 180° + dây leo; h00F không có chém |
| h00B | Thiết Phiến (Thổ) | Ba Tiêu Cuồng Phong Toàn · chain 4, tầm 5,5, đẩy lùi 1,8, chậm 35% | lốc cát nảy giữa 4 quái | 2 mũi quạt gió; đòn 3 đẩy | lốc cát xoáy (khác h00H đường đạn đơn) |
| h00C | Hồng Hài Nhi (Hỏa) | Tam Muội Chân Hỏa Thương · cleave r4 360°, thiêu 4 s | thương lửa quét vòng tròn (kitGround lava + lib-hoa-burst) | đâm thẳng dài 4, ấn xếp | vòng quét 360° (h00D là cự kiếm rơi) |
| h00D | Lã Động Tân (Hỏa) | Thuần Dương Vạn Kiếm Quyết · nova r4,2, kiếm hỏa 2,5 s | cự kiếm rơi cắm đất, kiếm hỏa cháy (lib-hoa-pillar) | phi kiếm xuyên dài 8, 3 mục tiêu | cắm kiếm tĩnh; h00C quét |
| h00E | Cự Linh Thần (Kim) | Cự Linh Thiết Bích Trấn · khiên r4,5, giảm 25% | tường kim khí dựng lên che đồng minh (kitWall dạng bức) | búa nện splash r2,2; đòn 4 chấn | bức tường (h009 chuông) |
| h00F | Mẫu Đơn Tiên Tử (Mộc) | Bách Hoa Hồi Xuân Khúc · hồi 3 đồng minh r7,5, haste 4 s | mưa cánh mẫu đơn rơi vào 3 đồng minh | cánh hoa nảy 2 lần; aura r3,5 | hoa mẫu đơn hồi diện rộng (h006 đơn thể) |
| h00G | Hà Bá (Thủy) | Hoàng Hà Cuộn Sóng · nova r4,5, hút, chậm 55% | xoáy nước (đã làm chuẩn "chân thực" trong thư viện) | cầu nước splash r2,5; aura r2,5 | xoáy hút vào tâm (h007 mai rùa) |
| h00H | Vô Thường (Thổ) | Hắc Bạch Tỏa Hồn Xích · chain 4, giảm 4 Giáp, chậm 40% | xích đen-trắng nối 4 quái | tia đơn; +30% khi máu thấp | xích nối (h00I canh nối) |
| h00I | Mạnh Bà (Thủy) | Vong Xuyên Mê Hồn Thang · chain 5, chậm 60% | dòng canh Vong Xuyên nối 5 quái | nảy 3 lần; làm yếu công 15% | dòng nước đục; h00G xoáy |
| h03O | Nhiếp Tiểu Thiến (Thủy) | U Lan Minh Khúc · hồi 210% Công r7, dư → khiên sương 5 s | âm ba huyền cầm + khiên sương băng quanh đồng minh | đòn đơn; hút 35% sang tuyến trước | sương lam hồi (h00F hoa) |
| h03P | Bảo Quả Tử (Mộc) | Linh Quả Bạo Liệt · nova r4,2, độc 3,5 s, giảm 25% Giáp | quả thần rơi nổ + bào tử độc | splash r2,2; ấn độc | quả nổ bào tử độc (h00F hoa hồi) |

## Quyết định cần bạn chốt (trước khi code)

1. **Bảng trên có đạt?** Đặc biệt cột "khác gì" và hình chính từng tướng.
2. Event `burrow-earthquake` của h008 không chứa hero id (registry không định tuyến được). Đề xuất đổi skillId server thành `burrow-h008` (chỉ đổi nhãn event, không đổi luật). Đồng ý?
3. Phạm vi lô: làm cả 20 tướng một lần, hay chia **bậc 1 (8)** rồi **bậc 2 (12)**? Đề xuất: chia hai lô để duyệt replay từng lô.
4. Kit chưa có sẵn: dây xích nối nhiều mục tiêu (h00H/h00I/h00B), vòng sương tĩnh quanh chủ (h007), tường kim. Đề xuất bổ sung vào kit dưới dạng archetype `chain` và `aura`, không vá riêng module tướng.
5. Cần flipbook mới ngoài thư viện nguyên tố? Đề xuất: **không** ở lô này, chỉ dùng 20 atlas `vfx-lib-*`.

## Rủi ro đã thấy
- `TIER_VISUALS`/motif cũ còn dùng cho 12 tướng bậc 2; sẽ thay sau khi duyệt (nghiệm thu của phase).
- Bậc 1 hiện chỉ có `TIER_VISUALS` (texture phép chung) — đúng loại "đồ chơi" plan cần bỏ.
