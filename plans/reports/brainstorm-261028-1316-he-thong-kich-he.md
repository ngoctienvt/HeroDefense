# Brainstorm: hệ thống kích hệ kiểu Đấu Trường Chân Lý

Ngày: 2026-10-28. Trạng thái: đề xuất, chưa chốt. Đây là **thiết kế riêng của bản web**, không lấy từ map `ThienDao v2.1.w3x`.

## Kết luận

Dùng hai trục đã có sẵn trên mọi tướng — **Vai trò** (`role`, 5 loại) và **Ngũ Hành** (`element`, 5 loại) — làm "hệ" và "tộc" như ĐTCL. Thêm mốc thưởng **Ngũ Hành Viên Mãn** khi đội có đủ 5 nguyên tố. Mỗi hiệu ứng chỉ là một gói chỉ số **thuộc các kênh trang bị đã chạy trong combat**, nên không cần viết code chiến đấu mới. Duyên phận vẫn giữ nguyên vai trò là lớp combo đặt tên theo nhân vật cụ thể.

## Hiện trạng liên quan

- Mỗi người chơi có 5 ô. 70 tướng, mỗi tướng có đúng 1 nguyên tố (Kim/Mộc/Thủy/Hỏa/Thổ, 13–16 tướng mỗi loại) và 1 vai trò (warrior 16, ranger 17, mage 15, guardian 11, support 11). Hiện cả hai trục này chỉ dùng cho nhãn và âm thanh, chưa ảnh hưởng gameplay.
- Duyên phận (27 nhóm, nguồn map) đếm tướng duy nhất đang triển khai, cộng phẳng +8% công/máu/tốc đánh, +3 giáp hoặc +1,5% hồi máu mỗi mốc. Bonus `speed` của duyên phận là tốc đánh và đang có hiệu lực (`stats.ts:78`).
- Trang bị có 24 kênh chỉ số. Đã rà và thấy các kênh sau có code đọc trong game-core: `attack-percent`, `crit-chance`, `crit-damage`, `armor-pierce`, `boss-damage`, `execute-damage`, `lifesteal`, `health-percent`, `armor-flat`, `damage-reduction`, `health-regen`, `respawn-reduction`, `wave-shield`, `melee-reflect`, `attack-speed`, `skill-damage`, `cooldown-reduction`, `rage-gain`, `status-duration`, `dot-damage`, `summon-duration`. Riêng **`block-cap` không có chỗ nào đọc**, nên hệ không được dùng kênh này.

## Phân bố tướng (nguyên tố × vai trò)

| Nhóm bậc | Nguyên tố | Chiến | Xạ | Pháp | Hộ Pháp | Hộ Trì |
|---|---|---|---|---|---|---|
| Bậc 1–2 (trước wave 6) | Kim | 1 | 1 | 0 | 2 | 0 |
| | Mộc | 1 | 1 | 2 | 0 | 1 |
| | Thủy | 0 | 1 | 1 | 1 | 1 |
| | Hỏa | 2 | 0 | 1 | 0 | 0 |
| | Thổ | 1 | 3 | 0 | 0 | 0 |
| Toàn bộ 70 | Kim | 5 | 2 | 3 | 3 | 3 |
| | Mộc | 1 | 5 | 4 | 2 | 3 |
| | Thủy | 0 | 2 | 3 | 4 | 4 |
| | Hỏa | 5 | 3 | 3 | 1 | 1 |
| | Thổ | 5 | 5 | 2 | 1 | 0 |

Những gì bảng này cho thấy:

- **Mốc 2 nguyên tố** có thể đạt ngay từ đầu, vì mỗi nguyên tố có 3–5 tướng bậc 1–2.
- **Mốc 3–4** thực tế đạt được ở khoảng wave 6–15, khi Tiên Chiêu cho chọn 1 trong 3.
- **Thuần 5** là phần thưởng lớn của cuối trận.
- Hộ Trì bậc 1–2 chỉ có 2 tướng, Hộ Pháp có 3. Vì vậy hai hệ này nên dừng ở mốc 2/3.
- Mỗi nguyên tố có điểm yếu tự nhiên: Thổ không có Hộ Trì, Thủy không có Chiến Tướng, Hỏa gần như không có tướng đỡ đòn. Đây là đánh đổi có sẵn, không cần thiết kế thêm.

## Ba phương án, xếp theo công sức

1. **Chỉ Vai trò** (5 hệ). Ít việc nhất, nhưng dễ đoán và ít lựa chọn thú vị.
2. **Vai trò + Ngũ Hành** (10 hệ). Thêm một bảng dữ liệu, cùng cơ chế đếm. *Đề xuất.*
3. **Phương án 2 + Viên Mãn tương sinh.** Thêm khoảng chục dòng code. Tạo thế khó xử "đánh sâu một nguyên tố hay đánh rộng đủ năm". *Đề xuất làm cùng phương án 2.*

## Thiết kế đề xuất (số liệu nháp, cần cân lại theo `docs/twenty-wave-balance.md`)

### Trục Vai trò — chỉ buff thành viên trong hệ, riêng Hộ Trì buff cả đội

| Hệ | Mốc | Hiệu ứng |
|---|---|---|
| Chiến Tướng (warrior) | 2/3/4 | +10/18/28% công; ở mốc 4 thêm 10% hút máu |
| Xạ Thủ (ranger) | 2/3/4 | +12/22/35% tốc đánh; ở mốc 4 thêm 15% chí mạng |
| Pháp Sư (mage) | 2/3/4 | +15/25/40% sát thương kỹ năng; ở mốc 4 thêm 15% giảm hồi chiêu |
| Hộ Pháp (guardian) | 2/3 | +4/8 giáp, +8/15% giảm sát thương; ở mốc 3 thêm phản đòn cận chiến |
| Hộ Trì (support) | 2/3 | Cả đội +1/2% máu/giây và hồi sinh nhanh hơn 20/35%; ở mốc 3 có khiên đầu wave |

### Trục Ngũ Hành — buff thành viên; thuần 5 nghĩa là cả đội đều là thành viên

| Hệ | Mốc 2/3/4 | Thuần 5 |
|---|---|---|
| Kim · Sắc bén | Xuyên giáp + sát thương chí mạng | Thêm +15% chí mạng |
| Mộc · Sinh trưởng | Hồi máu + hút máu | Hồi máu ×2 |
| Thủy · Nhu thủy | Tăng thời gian trạng thái + giảm hồi chiêu | Thêm +20% sát thương kỹ năng |
| Hỏa · Thiêu đốt | Sát thương theo thời gian + % công | Thêm +20% sát thương lên boss |
| Thổ · Vững chãi | % máu + giảm sát thương | Thêm khiên đầu wave |

### Ngũ Hành Viên Mãn — đủ 5 nguyên tố khác nhau

Mỗi tướng nhận hiệu ứng mốc 2 của nguyên tố **sinh ra** mình: Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc, Mộc sinh Hỏa, Hỏa sinh Thổ. Như vậy đội đánh rộng mất buff nguyên tố sâu nhưng mỗi tướng đều có thưởng. Không cần thêm loại hiệu ứng mới, chỉ tra lại bảng của nguyên tố.

### Ví dụ đội hình 5 ô

- **Đầu trận (bậc 1–2):** Thổ Hành Tôn, Xạ Nhân, Thiết Phiến, Vô Thường, Thiên Lý Nhãn → **Thổ 4 + Xạ Thủ 4**. Đội đạt được ngay từ Phàm Chiêu.
- **Thuần Hỏa (cuối trận):** Chúc Dung, Na Tra, Hình Thiên, Hậu Nghệ, Chúc Long → **Hỏa 5 + Chiến Tướng 3**. Sát thương rất mạnh, nhưng gần như không có hồi máu.
- **Ngũ sắc:** Bàn Cổ (Kim), Thần Nông (Mộc), Nữ Oa (Thủy), Phượng Hoàng (Hỏa), Hiên Viên (Thổ) → **Viên Mãn + Chiến Tướng 2 + Hộ Trì 2**. Mỗi tướng được thưởng ít hơn nhưng cân bằng hơn.

## Vì sao hợp với game này

- Lựa chọn "1 trong 3" của Tiên Chiêu và Thiên Mệnh, cùng rương tướng tự chọn, có thêm ý nghĩa: người chơi chọn theo hệ chứ không chỉ theo bậc.
- Tướng bậc thấp vẫn có chỗ dùng để lấp mốc hệ. Cuối trận xuất hiện căng thẳng thật giữa tướng mạnh lẻ hệ và đủ mốc hệ.
- Đội hình chỉ có 5 ô nên người chơi buộc phải đánh đổi: không đội nào vừa thuần một nguyên tố vừa đủ năm nguyên tố.
- Duyên phận vẫn là combo đặt tên (lớp "đặc biệt"). Hệ là lớp rộng mà hiện game còn thiếu. Hai lớp bổ sung cho nhau, không trùng nhau.

## Cách implement dễ nhất

- **Dữ liệu:** tạo `content/trait-design.ts` (không sửa `catalog.json`, vì file đó được sinh tự động). Mỗi hệ gồm `{ id, axis: 'role'|'element', key, name, thresholds, levels: Partial<Record<GearStatId, number>>[], scope: 'members'|'team' }`, cộng bảng tương sinh.
- **Game-core:** tạo `trait-stats.ts` để đếm `heroId` duy nhất có `slot >= 0`, theo đúng quy tắc của duyên phận (bản sao không cộng). Module này trả về mods cho từng unit. Cộng mods đó vào `gearModsOf`, khi đó toàn bộ combat tự áp dụng. **Lưu ý cache:** cache của `gearModsOf` đang dùng khóa `gearVersion` + `heroId`, nên `refreshStats` phải tăng một `traitVersion` (hoặc tăng `gearVersion`) mỗi khi đội hình đổi.
- **Contracts:** thêm `activeTraits: { id, count, level }[]` vào Player, đi qua snapshot như `activeSynergies`.
- **Client:** thêm tab "Hệ" vào bảng Duyên Phận/Trận Pháp sẵn có, không tạo bảng mới. Thêm một dải nhỏ theo dõi hệ cạnh dock, và icon nguyên tố/vai trò trên thẻ tướng (đã có `ELEMENT_LABELS` và glyph vai trò).
- **Test:** đếm mốc; bản sao không cộng; tướng triệu hồi không cộng; Viên Mãn; hệ Hộ Trì áp cho cả đội; cache được làm mới khi đổi đội hình.
- **Log/Docs:** ghi log `traits.refresh` với các id hệ và mốc (không ghi tên người chơi). Ghi chú trong `docs/gameplay-spec.md` rằng đây là hệ do bản web thiết kế.

## Để dành cho giai đoạn sau (không làm ngay)

- **Ấn hệ trên trang bị** (giống emblem trong ĐTCL): một dòng trang bị cho tướng thêm một nguyên tố. Rẻ, vì dùng lại hệ thống trang bị.
- **Thiên Địa Hợp Nhất (co-op):** cả phòng cộng lại đủ 5 nguyên tố thì toàn bộ người chơi nhận buff nhỏ. Cách tính đơn giản, giúp người chơi phối hợp.
- **Tương khắc với quái:** cần gán nguyên tố cho quái, thêm VFX và UI. Tốn công nhất, nên bỏ qua lúc này.

## Câu hỏi chưa giải quyết

1. Có giữ nguyên số liệu duyên phận không, hay giảm xuống để tổng sức mạnh không phình quá? (Hệ + duyên phận + trận pháp + trang bị đều cộng dồn.)
2. Hệ vai trò chỉ buff thành viên (đề xuất) hay buff cả đội?
3. Có làm Viên Mãn tương sinh ngay trong đợt đầu không?
4. Có làm ấn hệ trên trang bị và hệ co-op ở giai đoạn sau không?
