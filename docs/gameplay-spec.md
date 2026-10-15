# Gameplay của bản web

Yêu cầu được cập nhật ngày 2026-10-12: giữ cơ chế tương tự map; đồ họa/UI và triển khai kỹ năng có thể khác. Danh tính nhân vật, công thức ghép, quan hệ duyên phận và các mốc đã đọc được từ map giữ theo catalog. Không tuyên bố tương đương tuyệt đối Warcraft.

## Luật hiện tại

Mỗi phòng có tối đa 4 người. Server giữ trạng thái trận, tiền, HP, lệnh điều khiển và kết quả; client chỉ gửi lệnh. Solo được cho phép để luyện. Có đúng một làn sinh quái cho mỗi người trong trận; quái đi riêng khoảng hai phần ba quãng đường rồi hội tụ vào đường giữa trước Linh Trụ. Quân có thể hỗ trợ đồng đội nhưng mỗi người chỉ ra lệnh cho quân của mình. Linh Trụ là HP chung.

Mỗi người có 5 ô triển khai; tướng chưa triển khai tích lũy không giới hạn trong bộ sưu tập để dùng khi ghép. Bắt đầu với 500 Linh Thạch, 18 Đạo Duyên, 0 Linh Đan và 1 điểm trận pháp. Không mua tướng trực tiếp hoặc đổi lượt cửa hàng. Ba gói triệu hồi dùng Đạo Duyên: **Phàm Chiêu** 2, mở từ wave 1, thành công 100%, rơi ngẫu nhiên bậc 1/2 theo tỷ lệ 85%/15%; **Tiên Chiêu** 4, mở từ wave 6, thành công 45%, khi thành công rút bậc 2/3 theo tỷ lệ 70%/30% và chọn 1 trong 3 tướng khác nhau cùng bậc; **Thiên Mệnh** 8, mở từ wave 15, thành công 25%, khi thành công rút bậc 3/4 theo tỷ lệ 65%/35% và chọn 1 trong 3. Thiên Mệnh không ra bậc 5. Trước wave đầu, Phàm Chiêu đã dùng được để chuẩn bị đội hình. Các hằng số nằm tại [rules.ts](../packages/game-core/src/rules.ts).

Tiên Chiêu trượt nhận 1 tướng bậc 1 ngẫu nhiên và 1 Linh Đan; trượt 4 lần liên tiếp thì lượt thứ 5 chắc chắn thành công. Thiên Mệnh trượt nhận 1 tướng bậc 1 và 3 Linh Đan; trượt 5 lần liên tiếp thì lượt thứ 6 chắc chắn thành công. Mỗi gói có bộ đếm pity riêng, đặt lại sau khi thành công. Khi có lựa chọn tướng đang chờ, phải chọn xong trước lượt triệu hồi hoặc đổi Linh Đan tiếp theo.

Linh Đan đổi rương tự chọn bậc 1 giá 2 (chọn bất kỳ trong 8), rương tự chọn bậc 2 giá 5 (bất kỳ trong 12), Tiên Thiên Linh Phôi bậc 3 giá 12, Hồng Mông Linh Phôi bậc 4 giá 25 (mua tối đa một lần mỗi trận). Rương cho phép chọn bản sao. Mỗi Linh Phôi thay đúng một nguyên liệu cùng bậc còn thiếu trong công thức ghép; server tiêu phôi khi ghép thành công.

**Ghép tướng theo công thức:** Bảng Ghép tướng mở trên chiến trường, hiển thị lưới 70 chân dung chia theo phẩm chất như bảng gốc; ô tướng chưa sở hữu được làm mờ. Chọn chân dung để xem một trong 62 công thức trích từ `MRxr.Ubertip` trong map. Chuẩn bị đúng ba nhân vật nguyên liệu theo ID trong công thức (có công thức cần hai bản sao cùng tên), hoặc hai nhân vật và một Linh Phôi bậc 3/4 thay nguyên liệu cùng bậc còn thiếu, rồi ghép. Server kiểm tra quyền sở hữu và nguyên liệu, tiêu nguyên liệu/phôi, tạo nhân vật kết quả trong bộ sưu tập. Cấp trang bị cao nhất của từng nhóm lấy từ các nhân vật nguyên liệu đã dùng theo quy tắc bản web. Không dùng nhân vật trong phụ bản làm nguyên liệu.

**Hợp nhất bản sao:** Ba bản sao cùng nhân vật/cùng bậc hợp nhất thành một; bậc tối đa 3. Bản được chọn giữ ô; trang bị mỗi nhóm lấy cấp cao nhất trong ba bản. Không triển khai hai bản sao từ bậc 2 cùng nhân vật. Bán hoàn Đạo Duyên theo bậc và 50% giá nâng trang bị; không bán/hợp nhất nhân vật đang trong phụ bản.

Ba nhóm trang bị tăng công, thủ và pháp lực, mỗi nhóm tối đa cấp 5. Giá nâng từ cấp `n` là `80 × (n+1)²` Linh Thạch. Cấp công tăng 22% công nền/bậc, thủ tăng 25% HP và 4 giáp, pháp lực tăng sức mạnh kỹ năng và giảm hồi chiêu.

27 duyên phận dùng đúng thành viên từ JASS. Đếm nhân vật duy nhất đang triển khai; bản sao không cộng thêm. Mốc kích hoạt từ 2 thành viên, tăng theo số thành viên của nhóm. Buff và mức tăng đã được thích nghi; không suy diễn rằng các buff này khớp script Warcraft.

8 trận pháp có cấp 0–3, cấp 4 mở từ wave 40. Chọn một trận pháp đang dùng; nâng bằng điểm, nhận mỗi 4 wave và mỗi phụ bản thắng. Điểm không tự mất khi đổi trận pháp.

Nhân vật tự tìm mục tiêu, di chuyển vào tầm và đánh. Mỗi vị tướng sở hữu 1 Hình học Đòn đánh (`attackType` / `attackGeometry`) kết hợp với 1 Nội tại Đánh tay (`onHitTrait`):
- **7 Kiểu Hình Học Đòn Đánh (Attack Geometries):**
  1. `single` (Đơn Mục Tiêu): 100% sát thương vào 1 mục tiêu duy nhất.
  2. `frontal_cleave` (Chém Quét Hình Quạt): Quét góc 180 độ phía trước mặt (Bán kính 2.0 - 4.0), gây sát thương cho toàn bộ quái trước mặt.
  3. `linear_pierce` (Đâm / Bắn Xuyên Thấu): Đòn bay thẳng một đường dài (6.0 - 12.0 đơn vị), xuyên qua tất cả quái xếp hàng dọc.
  4. `multishot` (Bắn Đa Tia Hình Nón): Bắn đồng thời 2 đến 7 tia đạn vào các mục tiêu khác nhau trong tầm bắn; mỗi tia tính hiệu ứng riêng.
  5. `impact_splash` (Nổ Chấn Động Quanh Mục Tiêu): Đánh trúng mục tiêu chính tạo nổ tròn xung quanh (Bán kính 2.5 - 4.0), gây 40% - 80% sát thương lan cho quái kế cận.
  6. `bounce` (Bắn Nảy Dây Chuyền): Đòn đánh nảy sang 1 - 3 mục tiêu lân cận (sát thương giảm dần 20% mỗi lần nảy).
  7. `boomerang` (Vũ Khí Bay Khứ Hồi): Phóng pháp bảo bay xuyên qua quái tới đích rồi bay ngược về tay tướng, cắt sát thương 2 lần (lượt đi và lượt về).
- **6 Đặc Tính Đánh Tay (On-Hit & Passive Traits):**
  1. `crit_pierce` (Bạo Kích & Xuyên Giáp): Tỷ lệ nổ Chí Mạng (150% - 250% sát thương) hoặc bỏ qua Giáp cố định / % Giáp của địch.
  2. `nth_strike` (Đòn Đánh Thứ N): Mỗi 3 hoặc 4 đòn đánh thường cường hóa đòn tiếp theo (sát thương chuẩn, choáng nhẹ, hoặc bắn chùm/burst).
  3. `double_strike` (Liên Kích): 20% - 40% xác suất đánh bồi thêm 1-2 đòn ngay lập tức không tốn hồi chiêu.
  4. `stacking_mark` (Cộng Dồn Ấn Ký): Đánh cùng 1 mục tiêu tăng sát thương mỗi cộng dồn (+8%), đủ 5 cộng dồn kích nổ theo % Máu tối đa của mục tiêu.
  5. `orbit_aura` (Hào Quang Quanh Thân): Vòng lửa/kiếm khí/hàn băng xoay quanh tướng, tự động gây sát thương hoặc làm chậm quái áp sát mỗi 0.5s.
  6. `follow_up` (Hiệp Kích): Khi đồng minh đứng cạnh tung Kỹ năng hoặc nổ Chí Mạng, tướng tự động bắn bồi thêm 1 đòn đánh thường miễn phí vào mục tiêu đó.

Tám tướng **Linh** (`h001`–`h008`) có chỉ số và đặc tính đánh thường riêng, không có kỹ năng chủ động, hồi chiêu kỹ năng hay windup; nút Q bị vô hiệu. Mười hai tướng **Huyền** (`h009`–`h00I`, `h03O`, `h03P`) có kỹ năng riêng với windup 0,25 giây trong trận. Các bậc cao hơn giữ thiết kế kỹ năng web hiện có. Năm cách tung chiêu là chém quét, bắn nảy, nổ vùng, tạo khiên và hồi máu. Trạng thái được mô phỏng trên server gồm thiêu đốt, làm chậm, choáng, trói, đẩy lùi theo hướng ngược đường quái, phá giáp, hộ thể và tăng tốc đánh. Giáp giảm sát thương theo `100 / (100 + giáp × 5)`; các đòn xuyên giáp hoặc sát thương chuẩn nêu rõ trong thiết kế áp dụng ngoại lệ. Hộ vệ Linh/Huyền thu hút quái trong giới hạn chặn của từng tướng. Các nhãn sát thương phép vẫn dùng một công thức phòng thủ chung vì quái chưa có chỉ số kháng phép riêng. Chưa xác minh được hành vi kỹ năng riêng từ map; đây là thiết kế bản web. `Q` gọi cùng kỹ năng và hồi chiêu với tự động đối với tướng có kỹ năng. Chết hồi sinh sau `5 + số lần chết × 0,3` giây. Lưu vị trí chỉ tồn tại trong trận.

## Tiến trình

Độ khó giữ tổng wave 45/45/45/60 và hệ số công/HP đã xác minh 1/1; 1,1/1,3; 1,2/1,6; 1,2/1,6. Mỗi wave phát sinh quái thực, boss mỗi 5 wave. Chuẩn bị đầu trận 35 giây, các lần sau 25 giây; chủ phòng có thể gọi sớm. Năm wave đầu theo thiết kế biển quái riêng: 75 giây cho wave 1–4, 90 giây cho wave 5; quái ra theo hàng 5 con trong khoảng 2–4 giây đầu. Từ wave 6 trở đi giữ giới hạn 50 giây, wave boss 70 giây và cách sinh quái cũ. Quái chưa hạ khi hết thời gian làm mất HP Linh Trụ. Nhịp này được rút gọn so với map gốc; nút tốc độ tác động đồng bộ toàn phòng.

Năm wave đầu là thiết kế riêng của bản web, không phải nội dung được xác minh từ map. Mỗi làn có: wave 1, 30 Thanh Lang (280 HP); wave 2, 25 Thanh Lang (360 HP) và 15 Cốt Cung Thủ (240 HP); wave 3, 10 Trư Yêu Thiết Giáp (1.150 HP), 15 Thanh Lang (420 HP), 10 Cốt Cung Thủ (290 HP); wave 4, 65 Huyết Dơi (380 HP, cắn hồi 8 HP); wave 5, 10 Trư Yêu (1.400 HP), 25 Thanh Lang (480 HP), 15 Cốt Cung Thủ (350 HP) và Hắc Phong Hùng Vương (12.000 HP). Đồng hồ chiêu của Hùng Vương bắt đầu khi tiến đến khu giao chiến hoặc cách tướng tối đa 12 đơn vị. Sau đó Vạn Quân Hộ Thể hồi mỗi 10 giây: tạo 2.000 khiên cho Boss và +4 giáp trong 5 giây cho toàn bộ tiểu yêu cùng làn còn sống. Đại Địa Chấn Động hồi mỗi 12 giây: cảnh báo 1 giây rồi chấn địa bán kính 4, gây 45 sát thương vật lý theo hệ số độ khó và giáp mục tiêu; tướng trúng đòn có thể chết, tướng sống bị choáng 1 giây và đẩy lùi nhẹ. Mỗi lần chấn địa gọi 8 Thanh Lang từ mép đầu làn. Quái nhỏ lọt trừ 1 HP Linh Trụ; Trư Yêu trừ 2 và boss trừ 10. Quái trong năm wave đầu tách nhẹ khi di chuyển, rẽ theo tướng gần trong tầm phát hiện rồi đánh khi vào tầm; khi không có tướng gần chúng đi tiếp theo làn. Hộ Vệ ưu tiên hút tối thiểu 12 quái, Chiến Binh ưu tiên hút tối thiểu 8 quái; quái dư vẫn đánh tướng ở gần. Phần cấu hình nằm ở [horde-waves.ts](../packages/game-core/src/horde-waves.ts).

Thắng một wave thưởng đều mỗi người `180 + wave × 40` Linh Thạch và `4 + floor(wave/10)` Đạo Duyên. Hạ từng quái không cho tài nguyên, chỉ cộng chỉ số hạ gục và sát thương. Hết wave cuối và còn HP thì thắng, HP về 0 thì thua. Kết quả 1–7 sao dựa trên HP còn lại, số phụ bản và thời gian.

8 phụ bản giữ tên boss và mốc mở 5/10/15/20/25/30/35/40; phụ bản thứ 8 chỉ Tối Thượng. Phụ bản là vùng chiến đấu riêng, boss có HP/AI thật và giới hạn 90 giây. Nhiều người có thể cùng gửi quân; không còn quân sống hoặc hết thời gian thì thất bại, có thể thử lại. Thắng thưởng cho toàn phòng và quân trở về làn chính.

## Khác map gốc có chủ đích

Địa hình 1–4 làn hội tụ, collision, tầm nhìn, kỹ năng thiết kế riêng trên năm handler chung, công thức kinh tế/chiến đấu, nhịp wave, thành phần wave và buff không phải bản dịch đầy đủ Warcraft natives. Client dùng sprite toàn thân cho 70 tướng trên chiến trường Babylon.js, boss dạng hình khối 3D tự dựng, nền thung lũng tiên hiệp bằng texture AI với khoảng đất điều quân rộng, pháp trận, tia phép, vòng phạm vi, chớp trúng đòn, vòng bảo hộ và âm thanh tổng hợp tại chỗ. Khi sprite tải lỗi, tướng hiện hình khối dự phòng; khi atlas chân dung giao diện tải lỗi, glyph vai trò vẫn hiện. Texture nền tải lỗi sẽ dùng màu đá rêu dự phòng. Không dùng model, texture hay audio Warcraft. Hiệu ứng hình ảnh rút ngắn khi người chơi bật reduced motion, âm thanh chỉ chạy khi bật nút **Âm thanh**. Nhóm `faction` trong contract là alias lịch sử của **phẩm chất**, không phải phe. Bảy quest trong script là mục trợ giúp, nên bản web có Cẩm nang thay vì tự thêm nhiệm vụ.

Đây là bản thích nghi đủ các nhóm cơ chế đã chốt, không phải chứng nhận mọi trigger trong 16.000 dòng JASS đã được tái hiện. Nguồn và đánh dấu chỉ số thích nghi nằm trong [content-provenance.md](content-provenance.md).

## Kết nối và lưu trữ

Chỉ chủ phòng đổi độ khó trong sảnh, khai trận, gọi wave sớm và đổi tốc độ. Mọi người phải sẵn sàng trước khi khai trận. Không nhận người mới khi trận đã bắt đầu; reconnect được giữ 60 giây. Quân của người mất kết nối tiếp tục chiến đấu. Chủ phòng chuyển cho người đang kết nối. Trạng thái ở RAM; chưa có tài khoản, lưu bền hay phục hồi khi process chết.

## Bàn Cổ — Khai Thiên Tổ Thần

Bàn Cổ h01B dùng bộ chỉ số và cơ chế riêng theo yêu cầu: đòn thứ ba bổ xuyên hàng, Nộ từ đánh và bị đánh, lấy đà miễn sát thương, nổ/phá giáp/choáng, khe nứt và dư chấn co-op. Xem [đặc tả và kiểm tra](pangu-combat.md). Nguồn chỉ số trong `content/pangu-design.ts` và override `content/catalog.ts`; kết quả chiến đấu thuộc game-core.
