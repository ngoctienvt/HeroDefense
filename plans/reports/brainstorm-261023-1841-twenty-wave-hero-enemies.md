# Brainstorm — 20 vòng, quái/boss dùng tướng có sẵn

Ngày: 2026-10-23 · Nhánh: `feat/hero-vfx-kit` · Trạng thái: chờ duyệt để chuyển `ak:plan`

## Quyết định đã chốt với người dùng

- 20 vòng **thay thế toàn bộ** 45/60 wave ở mọi độ khó (giữ hệ số HP/Công độ khó hiện có).
- **Bỏ phụ bản** khỏi trận.
- **Giữ nguyên kinh tế** (gói triệu hồi, vàng, điểm trận pháp). Ưu tiên combat ổn định để chơi được trước.
- Quái thường phải chịu **10–15 đòn đánh thường hoặc 2–3 kỹ năng** mới chết, không chết sau 1–2 đòn.
- Nhận diện: **boss to gấp 1,5 lần quái thường**. Quái thường to bằng hoặc nhỏ hơn tướng để vây đánh dễ.

## Hợp đồng

**Kết quả:** Một trận gồm 20 vòng. Vòng 1–4 dùng 4 loại quái có atlas sẵn. Vòng 5 có Hắc Phong Hùng Vương. Vòng 6–19 dùng quái mượn sprite tướng, chỉ đánh thường. Vòng 10, 15, 20 là boss mượn tướng: boss đơn hoặc một cặp gồm boss sát thương và boss hỗ trợ, đi kèm quái. Server quyết định mọi sát thương; VFX boss tận dụng flipbook/adapter của tướng gốc.

**Ràng buộc:**
- Luật nằm ở `packages/game-core`, kiểu dữ liệu ở `packages/contracts`, client chỉ hiển thị.
- Không sửa tay `content/data/catalog.json`.
- Cơ chế boss là thiết kế bản web; ghi rõ như vậy trong `docs/gameplay-spec.md`.
- Khống chế cứng lên boss chỉ trúng 0,5–5%. Vì vậy mỗi cơ chế khó chịu phải có cách đối phó rõ: báo trước để né, mục tiêu cần ưu tiên hạ, hoặc phải tản đội hình.
- Giới hạn VFX/hạt theo pool hiện có. Cả trận phải còn đọc được khi chơi 4 người.
- Agent không chạy build/test/game. Người dùng tự kiểm.

**Ngoài phạm vi:** nén kinh tế; tạo asset hay sprite mới; thêm animation hit/death cho sheet tướng; phụ bản; AI kỹ năng cho quái thường.

**Tiêu chí nghiệm thu:**
1. Chọn độ khó nào cũng có đúng 20 vòng; thắng sau vòng 20. UI và server không còn phụ bản.
2. Log `combat.ttk` cho mỗi vòng ghi số đòn trung bình để hạ từng loại quái, thời gian hạ boss, số tướng chết và lượng quái lọt. Với đội hình "đúng tiến độ", quái thường cần 10–15 đòn đánh thường.
3. Boss vòng 10/15/20 dùng đúng sprite tướng ở cỡ ×1,5. Mỗi kỹ năng có pha báo trước, VFX của tướng gốc và cách đối phó như mô tả bên dưới.
4. Quái mượn tướng chỉ đánh thường và không phát sự kiện kỹ năng.
5. Có test hồi quy cho việc R(w) không bao giờ giảm (kể cả vòng ngay sau boss), cho việc vòng nào cũng có tối đa một yếu tố mới, cho bảng vòng, công thức chỉ số, kit boss (tính tất định) và contract.

## Phương pháp cân bằng (không đặt số theo cảm tính)

Chỉ số quái tính theo hai đường tham chiếu, đặt trong một file cấu hình có thể chỉnh:

- `A_ref(w)`: Công trung bình của tướng gây sát thương ở vòng w.
- `H_ref(w)`: Máu của một carry máu giấy ở vòng w.

| Vòng | 1 | 3 | 5 | 8 | 10 | 12 | 15 | 18 | 20 |
|---|---|---|---|---|---|---|---|---|---|
| A_ref | 55 | 80 | 110 | 180 | 250 | 360 | 580 | 850 | 1050 |
| H_ref | 400 | 600 | 800 | 1400 | 2000 | 2800 | 4500 | 6500 | 8000 |

Các mốc neo vào chỉ số thật: tướng Linh có Công khoảng 50, tướng Huyền khoảng 100, bậc 5 khoảng 600–800, bậc 6 khoảng 1.000–1.280. Hệ số bậc là `2,4^(rank-1)`, trang bị +22% Công mỗi cấp.

- **HP quái thường** = `12 × A_ref × hệ số giáp`. Hệ số giáp bù phần giáp quái giảm, để vẫn ra đúng 12 đòn. Ví dụ: vòng 1 khoảng 660 HP (bây giờ là 280); vòng 10 khoảng 3.000; vòng 20 khoảng 12.600.
- **Quái tinh anh** (to, nhiều giáp) có 3× HP quái thường. Quái đánh xa có 0,7×.
- **Công quái**: quái cận chiến đánh khoảng 3,5% H_ref, quái xa khoảng 3%, tinh anh khoảng 7%. Áp lực đến từ số đông bu vào, không phải từ việc giết ngay một tướng.
- **Boss** (khi chơi solo): boss đơn có 160× A_ref HP. Trong cặp, boss sát thương có 100× và boss hỗ trợ 70×. Đòn thường của boss khoảng 25% H_ref; kỹ năng có báo trước gây 40–70% H_ref.
- **Áp lực chính là kiểm tra DPS cộng với quái lọt.** Tướng chết sẽ hồi sinh sau `5 + số lần chết × 0,3` giây. Giết carry chỉ có tác dụng làm đội mất sát thương, nên kỹ năng boss thiết kế để làm gián đoạn và gây hao máu, không giết sạch.
- **Thời lượng**: vòng thường 75 giây, vòng boss 120 giây. Mục tiêu là đội hình đúng tiến độ xong trong 60–80% thời lượng.
- **Kênh hiệu chỉnh**: hai đường A_ref/H_ref đều có hệ số nhân chung. Người dùng chơi thử, đọc log `combat.ttk`, rồi chỉnh hai đường này. Không cần sửa từng con quái.

## Đường áp lực liên tục (cập nhật theo phản hồi người dùng)

Người dùng muốn độ khó tăng liên tục và đổi nhiều thứ, không chỉ cộng dần chỉ số. Thiết kế dùng bốn nguyên tắc:

1. **Chỉ số áp lực R(w) luôn tăng.** R là tỷ lệ "khối lượng quái cần xử lý / sức mạnh đội tham chiếu". Mỗi vòng tăng khoảng 3–4%, đi từ 0,80 ở vòng 1 lên 1,40 ở vòng 20. Không vòng nào có R thấp hơn vòng trước, kể cả vòng ngay sau boss. Quái thường luôn cần 10–15 đòn; phần R dư ra đến từ các đòn bẩy khác.
2. **Mỗi vòng xoay đòn bẩy chính:** số đông → trâu/giáp → nguy hiểm (sát thương, tốc độ, quái xa) → đầu lĩnh → boss. Hai vòng liền nhau không cùng trọng tâm.
3. **Mỗi vòng thêm tối đa một yếu tố mới.** Yếu tố cũ vẫn ở lại và cộng dồn. Người chơi học từng thứ một, và đến cuối trận thì mọi thứ xuất hiện cùng lúc.
4. **Trong một vòng cũng có nhịp tăng:** mở đầu bằng quái thường, khoảng 40% thời lượng thì đầu lĩnh xuất hiện, 70% thì có đợt dồn cuối. Vòng boss: boss xuất hiện ở khoảng 30%, quái tiếp tục ra kèm theo.

**Đầu lĩnh:** mượn sprite tướng, to ×1,25, có 4× HP quái thường và một kỹ năng từ bốn mẫu dùng chung, mở dần theo vòng:
- **A – Nổ vùng có báo trước:** vòng bán kính 3, báo trước 1,2 giây, gây 30% H_ref.
- **B – Lao thẳng:** vẽ vạch rồi lao, hất tướng trên đường.
- **C – Aura:** đốt hoặc làm chậm 30% tướng ở gần.
- **D – Hiệu lệnh:** quái quanh nó +25% tốc đánh và +5 Giáp. Đây là mục tiêu cần ưu tiên hạ.

Bản nâng cấp (A+: nổ hai lần, C+: bán kính lớn hơn) mở từ vòng 13. Kỹ năng đầu lĩnh dùng chung bộ chạy kỹ năng với boss.

**Quy tắc sau boss:** quái hoặc đồng bọn của boss vừa hạ quay lại làm đầu lĩnh ở vòng ngay sau, nên vòng đó vẫn mang dư âm trận boss và R không tụt.

## Bảng 20 vòng (mỗi làn; số con sẽ chốt trong plan)

| Vòng | R | Trọng tâm | Đầu lĩnh (số × mẫu) | Yếu tố mới |
|---|---|---|---|---|
| 1 | 0,80 | số đông | 0 | làm quen |
| 2 | 0,84 | quái xa | 0 | quái đánh xa đứng sau |
| 3 | 0,88 | giáp | 1 tinh anh, không kỹ năng | giáp |
| 4 | 0,92 | tốc độ/đông | 1 × A | kỹ năng báo trước đầu tiên |
| 5 | 0,97 | **boss** | — | boss đầu |
| 6 | 1,00 | đông + đầu lĩnh | 2 × A (Trư Yêu của Hùng Vương) | quái mượn tướng |
| 7 | 1,03 | tốc độ | 2 × A, B | lao thẳng |
| 8 | 1,06 | trâu/giáp | 2 × C | aura |
| 9 | 1,09 | quái xa dày | 3 × A, D | hiệu lệnh, ưu tiên hạ |
| 10 | 1,13 | **boss cặp** | +2 | chọn mục tiêu trong cặp boss |
| 11 | 1,15 | đông | 3 (Hồng Hài Nhi) | đầu lĩnh ra theo hai đợt |
| 12 | 1,17 | quái xa nhiều máu | 3 (đầu lĩnh đánh xa) | đầu lĩnh xa |
| 13 | 1,20 | trâu | 4 × A+, C | kỹ năng nâng cấp |
| 14 | 1,22 | sát thương | 4 | quái cuồng nộ khi dưới 30% Máu |
| 15 | 1,26 | **boss** | +2 | aura đốt liên tục |
| 16 | 1,28 | hỗn hợp | 4 (Ngưu Ma tinh anh) | hai trọng tâm cùng lúc |
| 17 | 1,30 | phân tán | 5 × A+ | buộc tản đội hình |
| 18 | 1,33 | tinh anh | 5 + Thiết Phiến làm đầu lĩnh | boss cũ quay lại |
| 19 | 1,36 | tổng tấn | 6, đủ mọi mẫu | mọi yếu tố cùng lúc |
| 20 | 1,40 | **boss cặp cuối** | +3 | trận cuối |

### Đội hình chi tiết theo vòng

| Vòng | Tên | Thành phần | Thử thách |
|---|---|---|---|
| 1 | Lang Đàn Xuất Động | Thanh Lang m001 | làm quen |
| 2 | Mưa Tên Hắc Sơn | m001 + Cốt Cung m002 | quái đánh xa đứng sau |
| 3 | Trọng Giáp | Trư Yêu m003 (tinh anh) + m001/m002 | giáp |
| 4 | Lốc Huyết Dơi | m004 bầy nhanh, hút máu | dọn quái diện rộng |
| 5 | **BOSS** Hắc Phong Hùng Vương | b001 (kit hiện có) + quái | boss đầu |
| 6 | Thiên Binh Phản Nghịch | Thiên Binh h004 + Xạ Nhân h005 | quái mượn tướng đầu tiên |
| 7 | Quỷ Môn Mở | Quỷ Sai h003 (nhanh, đông) + Thiên Lý Nhãn h001 | tốc độ |
| 8 | Cự Linh Áp Trận | Cự Linh Thần h00E (tinh anh) + Thổ Hành Tôn h008 | giáp nặng |
| 9 | Âm Phủ Xạ Trận | Vô Thường h00H + Mạnh Bà h00I + Mộc Tra h00A | quái xa dồn dập |
| 10 | **BOSS CẶP** Hỏa Diệm Sơn | Ngưu Ma Vương h00P + Thiết Phiến h00B, kèm Hồng Hài Nhi h00C | chọn mục tiêu hạ trước |
| 11 | Phán Quan Tuần Âm | Phán Quan h00O + Vô Thường h00H | — |
| 12 | Long Cung Nổi Sóng | Tiểu Bạch Long h00L + Long Vương h00Q (xa) + Kim Tra h009 | quái xa nhiều máu |
| 13 | Thác Tháp Thiên Binh | Lý Tịnh h00W (tinh anh) + Thiên Binh h004 đông | đội hình dày |
| 14 | Tam Tiêm Truy Kích | Dương Tiễn h00U + Na Tra h00V (cận, nhanh) | tấn công dồn dập |
| 15 | **BOSS** Bất Diệt Chiến Thần | Hình Thiên h011, kèm Ngưu Ma h00P làm tinh anh | aura đốt liên tục |
| 16 | Phật Quang Ma Hóa | Kim Thân La Hán h03U + Bát Bộ Thiên Long h03V | — |
| 17 | Kim Sí Che Trời | Kim Sí Đại Bằng h016 (tinh anh) + Hậu Nghệ h017 (xa) | phân tán |
| 18 | Lục Nhĩ Loạn Trận | Lục Nhĩ h03Y + Đấu Chiến h012 (tinh anh) | thử thách trước vòng cuối |
| 19 | Thiên Đình Tổng Tấn | trộn tinh anh vòng 13–18 | tổng duyệt |
| 20 | **BOSS CẶP** Thủy Hỏa Song Thần | Chúc Dung h01H (sát thương) + Cộng Công h01G (hỗ trợ), kèm quái bậc 5 | trận cuối |

Mọi sheet stylized đều có 4 hướng × idle/walk/attack. Sheet không có pose trúng đòn và chết, nên client dùng chớp sáng khi trúng đòn và mờ/lún khi chết. Bàn Cổ dùng pipeline riêng nên không đưa vào danh sách.

## Kit boss (thiết kế bản web)

**Vòng 5 — Hắc Phong Hùng Vương:** giữ nguyên kit hiện có (Vạn Quân Hộ Thể, Đại Địa Chấn Động). Chỉ cân lại HP/Công theo công thức mới.

**Vòng 10 — Ngưu Ma Vương (sát thương) + Thiết Phiến (hỗ trợ):**
- *Ngưu Ma – Man Ngưu Xung Phong* (hồi 9 giây): vẽ vạch đường thẳng 1,2 giây rồi lao tới, gây 55% H_ref và hất tướng trên đường đi. Đối phó: tránh khỏi vạch.
- *Ngưu Ma – Chấn Địa* (hồi 12 giây): vòng báo trước bán kính 4, gây 45% H_ref và làm chậm.
- *Thiết Phiến – Ba Tiêu Phiến* (hồi 8 giây): cơn gió hình quạt đẩy tướng lùi 3 đơn vị và cho Ngưu Ma +30% tốc đánh trong 5 giây.
- *Ràng buộc cặp*: khi Thiết Phiến còn sống, Ngưu Ma hồi 1% Máu mỗi giây. Đối phó: hạ Thiết Phiến trước. Khi một con chết, con còn lại cuồng nộ +25% Công.
- VFX: lấy từ adapter `h00P` và `h00B` (gió quạt).

**Vòng 15 — Hình Thiên (đơn):**
- *Lốc Lửa Bất Diệt* (liên tục, không hồi chiêu): aura bán kính 5, cứ 0,5 giây gây 2,5% H_ref cho mọi tướng trong vòng. Đây là kiểu sát thương liên tục khó chịu. Đối phó: tướng xa đứng ngoài để đánh, hộ vệ thay nhau đỡ, hồi máu.
- *Bất Khuất*: cứ mất 10% Máu thì +8% tốc đánh. Dưới 30% Máu, aura nở lên bán kính 6,5.
- *Phủ Phá Thiên* (hồi 10 giây): vẽ hình quạt 1 giây, gây 70% H_ref. Đối phó: đi vòng sang hai bên.
- VFX: lốc lửa và chém quét từ kit `h011`.

**Vòng 20 — Chúc Dung (sát thương) + Cộng Công (hỗ trợ):**
- *Chúc Dung – Dung Nham Điểm Huyệt* (hồi 7 giây): đánh dấu 3–5 tướng (tùy số người chơi) bằng vòng lửa báo trước 1,5 giây, mỗi vòng gây 50% H_ref. Đối phó: tản ra, vì các vòng chồng lên nhau thì cộng dồn.
- *Chúc Dung – Hỏa Thần Giáng* (hồi 16 giây): nổ bán kính 7,5 quanh boss, báo trước 2 giây, gây 65% H_ref, để lại đất cháy trong 5 giây.
- *Cộng Công – Hắc Thủy*: aura bán kính 5 giảm 40% tốc chạy/tốc đánh của tướng. Cứ 12 giây, Cộng Công cho Chúc Dung khiên bằng 8% Máu tối đa. Đối phó: phá khiên hoặc hạ Cộng Công trước.
- *Cộng Công – Sóng Thần* (hồi 14 giây): sóng có báo trước, đẩy lùi các tướng đang vây Chúc Dung.
- *Thủy Hỏa*: khi một con chết, con còn lại nhận +30% Công và hồi chiêu ngắn hơn 25%.
- VFX: lấy từ kit `h01H` (dung nham, vòng lửa) và `h01G` (sóng, khiên nước).

## Phương án kỹ thuật

**Phương án A (khuyến nghị) — bảng dữ liệu cộng một bộ chạy kỹ năng boss chung:**
- **Contracts:** thêm `Enemy.skinHeroId?`, `Enemy.bossKit?` và một trạng thái kỹ năng chung `bossSkills?: {id, cooldown, windup}[]`. Chuyển ba trường viết riêng cho b001 (`skillCooldown`, `quakeCooldown`, `shield`) sang kit `hac-phong`, không thêm trường lẻ nào nữa.
- **Game-core:**
  - `wave-plan.ts` gồm 20 vòng, thay cho `horde-waves.ts` và công thức Ma Binh.
  - `enemy-archetypes.ts` khai báo sprite mượn, vai trò, và bội số của A_ref/H_ref.
  - `balance-curve.ts` chứa A_ref/H_ref và hệ số nhân.
  - `boss-kits/` dành mỗi kit một file.
  - `boss-skill-runner.ts` lo hồi chiêu, báo trước, chọn mục tiêu và gây sát thương.
  - Đặt `maxWaves = 20`. Gỡ phần mở khóa phụ bản và thưởng phụ bản.
- **Boss xuất hiện một lần ở đường giữa** (nơi các làn hội tụ), HP nhân `1 + 0,75 × (số người − 1)`. Quái thường vẫn sinh theo từng làn. Cách này tránh cảnh 8 boss cùng VFX khi chơi 4 người.
- **Client:**
  - Enemy có `skinHeroId` dùng đường `createHeroSprite`, quái thường ×0,9–1,0 và boss ×1,5, kèm thanh HP địch.
  - Kỹ năng boss phát event `ability` với `skillId = skill-<heroId>`, đi qua registry VFX sẵn có. Registry xác định tướng từ `skillId` và lấy vị trí gốc từ actor, nên actor là enemy vẫn chạy được.
  - Decal báo trước dùng lại `boss-quake-warning`.
  - Gỡ UI phụ bản (F1, panel).
- **Log:** `combat.ttk` theo vòng và `boss.skill` (cast, số mục tiêu, sát thương). Không ghi tên người chơi.

**Phương án B — viết code riêng cho từng boss** như `b001` hiện nay. Đưa ra nhanh hơn cho một boss, nhưng mỗi boss lại thêm trường vào contract và không có chỗ chỉnh chung. Phương án này hỏng đầu tiên khi tới boss thứ ba.

## Trade-offs

- **A** dựa trên giả định nặng nhất: adapter VFX của tướng không đọc `state.units`, `unit.heroId` hay nộ của caster. Registry định tuyến bằng `skillId` và `battlefield.ts:846` lấy actor từ `event.source`, nên đường chính khả thi. Nhưng vẫn có adapter có thể đọc trạng thái unit. Điều kiện hỏng đầu tiên: một adapter trả về `false` một cách im lặng khi caster là enemy. Cách giảm rủi ro: kiểm từng kit trong plan, và adapter nào hỏng thì bọc lại bằng hàm "phát tại vị trí" của chính adapter đó.
- **B** dựa trên giả định số boss ít và không đổi. Hỏng ngay khi người dùng muốn thêm hoặc đổi boss.
- **Cân bằng** dựa trên giả định A_ref khớp tốc độ lên bậc thật khi kinh tế giữ nguyên. Thiên Mệnh mở ở vòng 15 nên bậc 5–6 có thể đến muộn hơn A_ref vòng 15–20. Cách giảm rủi ro: hệ số nhân chung cộng log `combat.ttk`.

Better approaches: không có. Hướng khuyến nghị đúng là hướng người dùng yêu cầu (tận dụng tướng và VFX sẵn có). Chỉ thêm boss chung ở đường giữa để giữ hiệu năng khi chơi 4 người.

## Rủi ro còn mở

- Chỉ số tướng bậc 3–4 trong combat chưa đối chiếu hết (giá trị trung bình trong catalog có thể đã bị file thiết kế ghi đè). Plan cần đọc file thiết kế trước khi chốt A_ref.
- Sheet tướng không có pose trúng đòn/chết, nên quái chết bằng hiệu ứng mờ; cần người dùng xem có chấp nhận không.
- Quái mượn tướng có thể bị nhầm với tướng của mình khi trận đông. Người dùng chọn chỉ phân biệt bằng kích thước; nếu chơi thử thấy nhầm thì thêm thanh HP màu địch.

## Câu hỏi chưa giải quyết

Đang dùng mặc định cho hai câu dưới, chờ người dùng xác nhận:
1. Boss chung ở đường giữa, HP tăng theo số người chơi (thay cho mỗi làn một boss).
2. Áp công thức 10–15 đòn cho cả vòng 1–4 (vòng 1 lên khoảng 660 HP).

Câu hỏi về boss nhỏ ở vòng 13/18 đã được thay bằng hệ đầu lĩnh và quy tắc boss cũ quay lại.
