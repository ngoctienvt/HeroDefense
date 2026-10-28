# TÀI LIỆU ĐẶC TẢ CHI TIẾT CƠ CHẾ GAME THIÊN ĐẠO (THIEN DAO WEB CO-OP)
> **Mục đích tài liệu:** Cung cấp toàn bộ dữ liệu, hằng số, công thức toán học, thuật toán mô phỏng, logic kinh tế, cơ chế điều khiển và danh mục thực thể của game Thiên Đạo phiên bản Web Co-op.
> Tài liệu được cấu trúc chuẩn hóa (Markdown/Plain-text) nhằm phục vụ trực tiếp cho các mô hình AI/LLM phân tích chiến thuật, cân bằng chỉ số (Game Balancing), xây dựng Bot tự động chơi (RTS AI/Game Agent), hoặc mô phỏng xác suất (Monte Carlo Simulation).

---

## 1. TỔNG QUAN HỆ THỐNG VÀ BỐI CẢNH (SYSTEM OVERVIEW & ARCHITECTURE)

### 1.1. Bản chất trò chơi
- **Thể loại:** Co-op Hero Defense / Tower Defense tiên hiệp thời gian thực kết hợp yếu tố Auto-battler (triệu hồi, hợp nhất sao, kích hoạt duyên phận, trận pháp).
- **Nguyên bản:** Được trích xuất và chuyển thể từ custom map kinh điển Warcraft III `ThienDao v2.1.w3x`.
- **Triết lý bản Web:** Giữ nguyên danh tính 70 nhân vật, ngũ hành, 27 mối quan hệ Tiên Duyên, 8 Trận Pháp, 62 công thức Ghép Tướng và nhịp độ wave từ bản gốc. Các chỉ số chiến đấu và kỹ năng riêng biệt được thiết kế và cân bằng lại độc lập để tương thích hoàn hảo với môi trường trình duyệt web hiện đại.
- **Quy mô:** 1 đến 4 người chơi trong một phòng (hỗ trợ Solo để luyện tập và Co-op 2-4 người phối hợp chiến thuật).

### 1.2. Mục tiêu và thắng/thua

Bảo vệ Linh Trụ chung 100 Máu qua đúng 20 wave ở mọi độ khó. Máu về 0 thì thua; dọn hết wave 20 và còn Máu thì thắng. Tối đa bảy sao: một sao nền, mỗi ngưỡng Máu 25/50/75/90/100 thêm một sao, hoàn thành dưới `20×65` giây thêm một sao. Luật chính xác ở [simulation.ts](../packages/game-core/src/simulation.ts).

### 1.3. Kiến trúc Mạng & Vòng lặp Mô phỏng (Simulation Loop)
- **Mô hình Server-Authoritative:** Toàn bộ logic trò chơi (kinh tế, sinh quái, sát thương, hồi chiêu, di chuyển, va chạm) được xử lý tập trung trên Node.js server. Client (trình duyệt) chỉ là tầng hiển thị (renderer Babylon.js) và gửi các lệnh điều khiển (commands).
- **Trạng thái bộ nhớ (In-Memory State):** Trạng thái trận đấu được lưu trực tiếp trong RAM của máy chủ; không dùng cơ sở dữ liệu đĩa trung gian trong lúc trận diễn ra.
- **Vòng lặp con ổn định (Deterministic Sub-stepping):**
  ```typescript
  // Mỗi frame cập nhật với dt, server chia nhỏ thành các bước sub-step <= 0.05s
  let pending = dt * state.speed;
  while (pending > 0.000001 && state.phase !== 'won' && state.phase !== 'lost') {
    const delta = Math.min(0.05, pending);
    pending -= delta;
    state.tick++;
    state.elapsed += delta;
    // Cập nhật đợt quái, hồi chiêu, chiến đấu, phụ bản
  }
  ```
  Điều này đảm bảo dù chạy ở tốc độ 1x, 2x hay 4x, hoặc khi mạng bị lag giật đột ngột, kết quả vật lý và sát thương vẫn hoàn toàn nhất quán (deterministic).
- **Bộ sinh số ngẫu nhiên giả lập (PRNG Deterministic):**
  Sử dụng thuật toán Xorshift32:
  ```typescript
  let x = state.seed | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
  ```
- **Cơ chế Giữ chỗ Kết nối lại (Reconnect Window):**
  Nếu người chơi bị rớt mạng hoặc tải lại trang, phiên chơi được bảo lưu trong 60 giây. Các nhân vật đã triển khai của người chơi đó vẫn giữ nguyên trên sân và tiếp tục tự động chiến đấu bảo vệ căn cứ. Quyền chủ phòng (Host) sẽ tự động chuyển cho người chơi còn đang kết nối.

---

## 2. BẢN ĐỒ CHIẾN TRƯỜNG & HỆ THỐNG ĐIỀU KHIỂN (BATTLEFIELD & CONTROLS)

### 2.1. Hệ tọa độ và Giới hạn Đấu trường (Arena Dimensions)
Đấu trường chính nằm trên mặt phẳng tọa độ $X$ và $Z$ (trong không gian 3D của Babylon.js, trục $Y$ là độ cao):
- **Trục ngang ($X$):** Từ `-44.0` đến `+44.0` (Độ rộng tổng: 88 đơn vị).
- **Trục dọc ($Z$):** Từ `-36.0` (Cửa xuất hiện quái phía Bắc) đến `+28.0` (Vị trí Linh Trụ phía Nam).
- **Vị trí Linh Trụ (Base):** Tọa độ cố định $(X = 0, Z = 27)$.

### 2.2. Cơ chế Phân làn (Lane Distribution)
Số lượng làn quái xuất hiện bằng chính xác số lượng người chơi kết nối trong phòng ($N \in \{1, 2, 3, 4\}$):
- $N = 1$: Làn đơn tại tâm: $X = 0$.
- $N = 2$: Hai làn song song tại: $X = [-20, 20]$.
- $N = 3$: Ba làn song song tại: $X = [-30, 0, 30]$.
- $N = 4$: Bốn làn song song tại: $X = [-30, -10, 10, 30]$.

### 2.3. Lộ trình Di chuyển của Quái vật (Monster Pathfinding & Choke-point)
- **Điểm xuất phát:** $(X = \text{laneX}, Z = -34)$.
- **Giai đoạn 1 (Làn riêng):** Quái vật di chuyển dọc theo làn riêng của từng người chơi từ $Z = -34$ xuống $Z = -22$. Ở giai đoạn này người chơi tự phụ trách dọn quái trên làn của mình.
- **Giai đoạn 2 (Hội tụ - Choke Point):** Từ $Z = -22$, quái vật bắt đầu bẻ hướng hội tụ về điểm giao cắt trung tâm $(X = 0, Z = 5)$.
- **Giai đoạn 3 (Đường cuối):** Từ $(X = 0, Z = 5)$, toàn bộ quái vật còn sống từ tất cả các làn đổ dồn thẳng về Linh Trụ tại $(X = 0, Z = 27)$.
- **Hành vi rò rỉ (Leak):** Nếu quái vật đi tới mốc cuối đường ($Z \ge 27$), nó sẽ tự hủy và trừ trực tiếp vào máu Linh Trụ:
  - Quái thường (Melee / Ranged): Trừ **2 HP** Linh Trụ.
  - Quái trùm (Boss): Trừ **10 HP** Linh Trụ.

### 2.4. Bố trí Ô Đội Hình (Deployment Slots Grid)
Mỗi người chơi sở hữu đúng **5 ô triển khai** trên chiến trường (đánh số `slot` từ `0` đến `4`). Vị trí triển khai được tính toán tự động dựa trên chỉ số làn của người chơi:
$$\text{spread} = \left(\text{laneIndex} - \frac{N - 1}{2}\right) \times 15$$
$$X_{\text{slot}} = \text{clamp}\big(-40, 40, \text{spread} + (\text{slot} \% 3 - 1) \times 3.2\big)$$
$$Z_{\text{slot}} = 9 + \lfloor \text{slot} / 3 \rfloor \times 4$$
- Hàng trước: Gồm 3 ô (slot 0, 1, 2) tại $Z = 9$.
- Hàng sau: Gồm 2 ô (slot 3, 4) tại $Z = 13$.

### 2.5. Hệ thống Điều khiển Vi mô (Micro RTS Commands)
Người chơi có toàn quyền điều khiển vi mô các tướng do mình sở hữu (không thể ra lệnh cho tướng của đồng đội):
- **Chế độ lệnh (`orderMode`):**
  1. `auto`: Chế độ tự hành mặc định. Tướng tự động quét mục tiêu trong bán kính 19 đơn vị quanh vị trí phòng ngự (`guardPosition`). Nếu mục tiêu đi xa quá 18 đơn vị so với vị trí phòng ngự, tướng sẽ bỏ đuổi và quay về giữ vị trí.
  2. `move`: Di chuyển thuần túy đến tọa độ chỉ định $(X, Z)$, bỏ qua kẻ địch trên đường đi. Khi đến đích, điểm đó trở thành vị trí phòng ngự mới và chuyển về `auto`.
  3. `attack`: Tập trung hỏa lực truy sát một mục tiêu cụ thể. Nếu mục tiêu chết hoặc biến mất, chuyển về `auto`.
  4. `attack-move`: Tấn công trên đường di chuyển (Phím A + Click). Tướng di chuyển về đích; nếu phát hiện kẻ địch trong bán kính 10 đơn vị, tướng dừng lại giao chiến. Khi dọn sạch kẻ địch trong bán kính 12 đơn vị từ điểm bắt đầu giao tranh (`engageAt`), tướng tiếp tục hành trình tới đích.
  5. `hold`: Giữ nguyên vị trí (Phím D). Tướng đứng yên tuyệt đối tại chỗ, không di chuyển dù mục tiêu ở ngoài tầm; chỉ tấn công các mục tiêu lọt vào đúng tầm đánh (`range`) của mình.
- **Lưu vị trí trở về (`save-position` - Phím H / Phím N):**
  Người chơi có thể lưu tọa độ hiện tại của tướng làm vị trí hồi sinh/trở về sau phụ bản. Nhấn H để ghim tọa độ, N để hủy ghim.
- **Hủy lệnh (`stop` - Phím S):** Tướng lập tức hủy mọi hoạt động đang dở dang và dừng lại.
- **Kích hoạt Kỹ năng thủ công (`cast` - Phím Q):** Ra lệnh cho tướng đang chọn lập tức thi triển kỹ năng đặc định (nếu kỹ năng không đang trong thời gian hồi).
- **Phím tắt đạo quân (Control Groups):** Hỗ trợ lưu nhóm `Ctrl + 1..9` và gọi nhanh `1..9`.

---

## 3. HỆ THỐNG KINH TẾ & QUẢN LÝ QUÂN (ECONOMY & ROSTER ENGINE)

### 3.1. Tiền tệ và vật liệu
1. **Linh Thạch (Gold):**
   - Tiền tệ công nghệ và trang bị.
   - Bắt đầu trận: Cấp cho mỗi người chơi **500 Linh Thạch**.
   - Mục đích sử dụng: Cường hóa và tẩy luyện đồ.
   - Nguồn thu: Thưởng wave `180+40×wave`, hoàn 50% đầu tư khi phân giải đồ và một số kỹ năng/dòng độc nhất. Hạ quái thường không có tiền cơ bản; Tụ Bảo Bồn có thưởng riêng. Bán tướng trả đồ về kho, không hoàn tiền cường hóa.
2. **Đạo Duyên (Souls):**
   - Điểm nhân duyên chiêu mộ tiên nhân.
   - Bắt đầu trận: Cấp cho mỗi người chơi **18 Đạo Duyên**.
   - Mục đích sử dụng: Ba gói triệu hồi giá 2/4/8 Đạo Duyên.
   - Nguồn thu: Thưởng vượt qua Wave ($4 + \lfloor \text{wave} / 10 \rfloor$); Bán tướng hoàn trả theo bậc.
3. **Linh Đan:**
   - Nhận 1 khi Tiên Chiêu thất bại, 3 khi Thiên Mệnh thất bại.
   - Dùng đổi rương tướng tự chọn hoặc Linh Phôi; không mua bằng Linh Thạch.

4. **Huyền Tinh (gearDust):** Vật liệu tẩy luyện nhận từ phân giải đồ; không dùng để triệu hồi.

### 3.2. Ba Gói Triệu Hồi và Cửa Hàng Linh Đan
- **Phàm Chiêu:** 2 Đạo Duyên, dùng được từ wave 1 (kể cả chuẩn bị trước wave đầu), thành công 100%; rơi tướng bậc 1/2 ngẫu nhiên theo 85%/15%.
- **Tiên Chiêu:** 4 Đạo Duyên, mở từ wave 6, thành công 45%; thành công rút bậc 2/3 theo 70%/30%, rồi chọn một trong ba tướng khác nhau cùng bậc. Thất bại nhận tướng bậc 1 ngẫu nhiên và 1 Linh Đan. Sau 4 lần trượt liên tiếp, lần 5 chắc chắn thành công.
- **Thiên Mệnh:** 8 Đạo Duyên, mở từ wave 15, thành công 25%; thành công rút bậc 3/4 theo 65%/35%, rồi chọn một trong ba tướng khác nhau cùng bậc. Không thể rơi bậc 5. Thất bại nhận tướng bậc 1 và 3 Linh Đan. Sau 5 lần trượt liên tiếp, lần 6 chắc chắn thành công.
- Pity của hai gói độc lập và đặt lại khi gói tương ứng thành công. Phải hoàn tất lựa chọn tướng đang chờ trước khi triệu hồi hoặc đổi Linh Đan tiếp.
- **Đổi Linh Đan:** Rương tự chọn bậc 1 giá 2 (chọn bất kỳ trong 8 tướng), rương tự chọn bậc 2 giá 5 (bất kỳ trong 12, được chọn bản sao), Tiên Thiên Linh Phôi bậc 3 giá 12, Hồng Mông Linh Phôi bậc 4 giá 25 và chỉ mua một lần mỗi trận. Mỗi phôi thay đúng một nguyên liệu cùng bậc còn thiếu trong một công thức ghép.

### 3.3. Bộ Sưu Tập Tướng
- Tướng triệu hồi hoặc ghép xong tích lũy không giới hạn trong bộ sưu tập/bảng ghép. Tối đa 5 tướng được triển khai cùng lúc.

### 3.4. Hệ thống đồ ngẫu nhiên (thiết kế bản web)

Ba khe: vũ khí, giáp, pháp khí. Mỗi người có kho riêng không giới hạn; phím `I` mở Kho Đồ. Mặc/tháo/chuyển giữa tướng cùng chủ bất kỳ lúc nào; đơn vị triệu hồi không mặc đồ. Đổi Máu tối đa giữ nguyên tỷ lệ Máu. Trắng 0 dòng, xanh 1–2, tím 3–4, vàng 5–6 và 1 dòng độc nhất. Không có dòng trùng trên cùng món, không có Ngũ Hành hay dòng ẩn. Chỉ số chặn đã bỏ hoàn toàn; Định Hải Thần Châm chỉ miễn choáng/đẩy lùi, không giảm tốc đánh.

Dữ liệu số dùng chung nằm tại [gear-design.ts](../content/gear-design.ts), hợp đồng tại [gear-types.ts](../packages/contracts/src/gear-types.ts). Mô tả đầy đủ và quy tắc 17 dòng độc nhất xem [hệ thống đồ](gameplay-spec.md#hệ-thống-đồ-thiết-kế-web-20-10-2026).

- Nền: vũ khí +40% Công; giáp +45% Máu và +6 Giáp; pháp khí +8% tốc đánh và +20% sát thương kỹ năng.
- Hệ số cấp `S=.5+.5×min(1.2,level/20)`, cấp món bằng wave rớt. Nền và dòng thường nhân thêm `E=1+.06×enhance`; dòng độc nhất không tăng theo cường hóa. Giá trị phần trăm trong `GearLine` là điểm phần trăm (12 nghĩa là 12%).
- Roll dòng theo `min+(max−min)×r^(1/q)`, rồi nhân S. Quái thường q=1; Boss chung q tăng theo tiến trình. `gearSeed` riêng không làm lệch RNG chiến đấu/triệu hồi.
- Quái có 5% rớt cho chủ tướng hạ. Sáu Boss chung ở các mốc 5/10/15/20 chắc chắn rớt ít nhất xanh. Ba wave trắng tay tự bù ít nhất xanh. Món rớt vào kho; thông báo chỉ gửi đúng chủ. Không có phụ bản đang hoạt động.
- Cường hóa +0–10 không thất bại. Giá lên +k+1 là `3×(k+1)²`; một món +10 tốn 1.155 Linh Thạch, 15 món tốn 17.325. Thu nhập chắc chắn 20 wave là 12.500 gồm 500 ban đầu; phải ưu tiên đầu tư.
- Tẩy luyện thay một dòng thường ngẫu nhiên, giữ dòng độc nhất; tốn `2+rerolls` Huyền Tinh và `50×(rerolls+1)` Linh Thạch. Phân giải chỉ món trong kho, trả 1/2/5/12 Huyền Tinh theo trắng/xanh/tím/vàng và 50% tiền cường hóa, làm tròn xuống.

### 3.5. Hợp Nhất Bản Sao (Star Merge - Nâng Bậc Tướng)
- **Cơ chế:** Khi sở hữu **3 bản sao** của cùng một tướng ở cùng một bậc sao (và không đang ở trong phụ bản), người chơi có thể ra lệnh hợp nhất thành 1 bản sao ở bậc cao hơn (Bậc 1 -> Bậc 2 -> Bậc 3).
- **Bậc tối đa:** **10 sao**.
- **Vị trí và đồ:** Bản được chọn giữ ô và đồ đang mặc; đồ hai bản bị tiêu trở về kho, không mất cường hóa hoặc tầng tích.
- **Luật Hạn Chế Triển Khai (Anti-Stacking Rule):**
  Không được phép triển khai đồng thời trên 5 ô chiến trường từ 2 bản sao bậc 2 trở lên của cùng một nhân vật. (Người chơi vẫn có thể giữ nhiều bản sao ở hàng dự bị, nhưng không thể cùng lúc đưa 2 con bậc 2 ra sân).
- **Hệ số Tăng Trưởng Chỉ Số Khủng (Rank Scaling Multiplier):**
  $$\text{RankMultiplier} = 2.4^{\text{rank} - 1}$$
  - **Bậc 1:** $2.4^0 = \mathbf{1.0\times}$ (Chỉ số cơ bản).
  - **Bậc 2:** $2.4^1 = \mathbf{2.4\times}$ (+140% HP và Sát thương!).
  - **Bậc 3:** $2.4^2 = \mathbf{5.76\times}$ (+476% HP và Sát thương!).

### 3.6. Ghép Tướng Theo Công Thức (Crafting Recipes)
- Bản game tích hợp chính xác **62 công thức ghép tướng** trích xuất từ map gốc Warcraft 3.
- Toàn bộ 8 tướng Bậc 1 (h001 đến h008) là tướng cơ bản sơ cấp, không có công thức ghép.
- Mọi tướng từ Bậc 2 đến Bậc 6 đều có công thức ghép cố định gồm đúng **3 tướng nguyên liệu theo ID và bậc ghi trong catalog** (có công thức đòi hỏi bản sao cùng tên). Công thức bậc cao dùng nguyên liệu bậc cao, không chỉ bậc 1.
- **Điều kiện ghép:**
  - Sở hữu đủ 3 nguyên liệu đúng công thức (đang ở trên sân hoặc trong bộ sưu tập, không được ở trong phụ bản); có thể thay đúng 1 nguyên liệu bậc 3 hoặc 4 còn thiếu bằng Linh Phôi cùng bậc.
- **Kết quả:** Tiêu thụ nguyên liệu và Linh Phôi nếu dùng, tạo tướng mới trong bộ sưu tập; toàn bộ đồ nguyên liệu trở về kho. Truyền Thừa Ấn hấp thụ 15% Công/Máu gốc theo sao của tướng bị tiêu.

### 3.7. Cơ Chế Bán Tướng (Sell Dynamics)
- Không thể bán tướng khi đang ở trong phụ bản.
- **Hoàn trả Đạo Duyên:**
  $$\text{SoulsRefund} = \max\left(1,\; \left\lfloor \frac{2 \times 3^{\text{rank} - 1}}{2} \right\rfloor\right)$$
  - Bán tướng Bậc 1: Nhận lại **1 Đạo Duyên**.
  - Bán tướng Bậc 2: Nhận lại **3 Đạo Duyên**.
  - Bán tướng Bậc 3: Nhận lại **9 Đạo Duyên**.
- **Trang bị:** Trả về kho nguyên vẹn; không hoàn Linh Thạch, Truyền Thừa Ấn không hấp thụ khi bán. Phân giải đồ là thao tác riêng.

---

## 4. CÔNG THỨC TOÁN HỌC & CƠ CHẾ CHIẾN ĐẤU (COMBAT FORMULAS)

Mọi tính toán sát thương và thuộc tính đều được server thực thi theo các phương trình toán học chuẩn xác dưới đây:

### 4.1. Máu tối đa

`MaxHP=round((HPbase×2.4^(rank−1)+absorbedHp)×(1+gearHealth+bonusHealth))`. `gearHealth` gộp nền giáp và dòng % Máu; `absorbedHp` là phần Truyền Thừa lưu trên món. Đổi đồ/buff giữ tỷ lệ Máu hiện tại, không hồi máu.

### 4.2. Công

`Attack=round((ATKbase×2.4^(rank−1)+absorbedAttack+healthAttack)×(1+gearAttack+bonusAttack+uniqueAttack))`. Càn Khôn Đảo Chuyển cho `healthAttack=.06×MaxHP`; Tọa Vong +40% Công, Tụ Bảo Bồn −25%. Các hệ số và thứ tự chính xác xem [stats.ts](../packages/game-core/src/stats.ts), [gear-stats.ts](../packages/game-core/src/gear-stats.ts).

### 4.3. Giáp & Công Thức Giảm Trừ Sát Thương (Armor & Damage Mitigation)
`Armor=ArmorBase+gearArmor+bonusArmor`
Giáp đồ gồm nền +6 đã nhân hệ số cấp/cường hóa, cộng dòng Giáp phẳng.

Khi phải nhận một lượng sát thương thô ($Damage_{\text{raw}}$), lượng sát thương thực tế xuyên qua giáp được tính theo hệ số phi tuyến chuẩn Warcraft:
$$\mathbf{DamageFactor} = \frac{100}{100 + \text{Armor} \times 5}$$
- Nếu tướng có Hộ Giáp Hộ Vệ (`ward`):
  $$\mathbf{DamageReduced} = \max\left(1,\; Damage_{\text{raw}} \times \frac{100}{100 + \text{Armor} \times 5} \times (1 - \text{Ward}_{\text{reduction}})\right)$$
- **Cơ chế Khiên Chắn (Shield Buffer):**
  Lượng sát thương sau khi đã giảm trừ bởi Giáp và Ward sẽ bị trừ vào Khiên ảo (`shield`) trước:
  $$\text{Absorbed} = \min(\text{Shield}, \text{DamageReduced})$$
  $$\text{Shield} = \text{Shield} - \text{Absorbed}$$
  $$\text{HP} = \text{HP} - (\text{DamageReduced} - \text{Absorbed})$$

*Bảng tra cứu hiệu quả của Giáp đối với mức giảm sát thương:*
| Điểm Giáp (Armor) | Tỉ lệ sát thương gánh chịu | Phần trăm giảm sát thương | Máu hiệu dụng (EHP Multiplier) |
|:---:|:---:|:---:|:---:|
| 0 | 100.0% | 0.0% | 1.00x |
| 5 | 80.0% | 20.0% | 1.25x |
| 10 | 66.7% | 33.3% | 1.50x |
| 20 | 50.0% | 50.0% | 2.00x |
| 40 | 33.3% | 66.7% | 3.00x |
| 60 | 25.0% | 75.0% | 4.00x |

### 4.4. Tốc độ đánh

Nhịp đánh bằng nhịp gốc chia cho tổng `1+bonusSpeed+gearSpeed+haste+buff/nội tại`; Ma Tâm cộng 80% tốc đánh. Định Hải Thần Châm không giảm tốc đánh. Xem `attackInterval` trong [stats.ts](../packages/game-core/src/stats.ts).

#### 4.4.1. Đánh Lan & Nội Tại Carry (bản web, 19-10-2026)
- Đòn đánh thường không còn nổ lan quanh mục tiêu. Chỉ carry cận chiến giữ chém quét: mục tiêu chính 100%, quái bên cạnh 60% (Quỷ Sai, Mộc Tra: 50%).
- Support và Hộ vệ đánh một mục tiêu với mọi kiểu đòn; xạ thủ và pháp sư giữ nảy/đa tia/xuyên nếu có.
- 33 carry (18 cận chiến, 15 tầm xa) có nội tại đánh tay riêng (`carryPassive`). Thưởng sát thương và hút máu chỉ áp lên mục tiêu chính; Chiến Ý/Thừa Thắng hết sau 3 giây không đánh; Thân Bất Hoại giảm sát thương khi có từ 3 quái trong 3 đơn vị. Số liệu: `packages/contracts/src/carry-passives.ts`; máy xử lý: `packages/game-core/src/carry-passive.ts`.

### 4.5. Hồi Máu Tự Nhiên (Health Regeneration)
Các tướng được hưởng hiệu ứng hồi phục từ Tiên Duyên (`regen`) sẽ tự hồi phục sinh lực theo mỗi chu kỳ mô phỏng $dt$:
$$\Delta HP = \text{Bonus}_{\text{regen}} \times \mathbf{MaxHP} \times dt$$
*(Ví dụ với mốc regen 0.015, tướng hồi 1.5% máu tối đa mỗi giây)*.

### 4.6. Cơ Chế Tử Trận & Hồi Sinh (Death & Respawn Mechanics)
- Khi máu tướng bị tụt về `0`: Tướng chết, biến mất khỏi chiến trường, số lần tử trận tăng 1 (`deaths++`). Xóa bỏ toàn bộ hiệu ứng bùa chú, khiên chắn và hủy lệnh di chuyển.
- **Thời gian đếm ngược hồi sinh:**
  $$\mathbf{RespawnTime} = 5.0 + \text{Deaths} \times 0.3 \text{ (giây)}$$
- Khi hết thời gian hồi sinh: Tướng tự động hồi phục $100\%$ Max HP và xuất hiện trở lại tại vị trí đã ghim (`savedPosition`) hoặc ô đội hình ban đầu (`slotPosition`).

---

## 5. CƠ CHẾ KỸ NĂNG & HIỆU ỨNG TRẠNG THÁI (ABILITIES & STATUS)

Tám tướng Linh chỉ có đặc tính đòn đánh thường; 62 tướng còn lại có kỹ năng chủ động. Năm bộ xử lý chung là `cleave`, `chain`, `nova`, `shield`, `heal`; đặc tính và trạng thái đặc thù được mô phỏng trên server. Bảng mục 10.1–10.2 ghi chỉ số và tên kỹ năng hiện hành của hai phẩm chất đầu; thông số chi tiết nằm trong `content/tier-hero-design.ts`.

### 5.1. Vòng Đời Tung Chiêu & Động Tác Lấy Đà (Windup Phase)
- **Kích hoạt:** Tướng có kỹ năng chủ động tự tung khi hết hồi chiêu và có mục tiêu hợp lệ, hoặc dùng **Q**; hai cách dùng chung hồi chiêu. Tướng Linh không có Q.
- **Động tác lấy đà (Windup 0.25s):**
  Mười hai tướng Huyền có động tác lấy đà **0,25 giây** (`pendingAbility`). Nếu tướng tử trận hoặc rời chiến trường trong thời gian này, chiêu thức bị ngắt. Các tướng bậc cao hơn hiện xuất chiêu tức thời. Trong sảnh chờ, kỹ năng tác động ngay vì đồng hồ mô phỏng chưa chạy.

### 5.2. Sức mạnh kỹ năng

Sát thương dùng Công thực của tướng và `skillDamageMultiplier`, gồm dòng sát thương kỹ năng. Hệ số pháp lực cũ ×(1+.25×cấp) đã bỏ. Hồi máu/khiên vẫn nhận phần theo Công đã tăng bởi vũ khí; phần theo % Máu tối đa người nhận không đổi. [ally-scaled-support.ts](../packages/game-core/src/ally-scaled-support.ts) giữ phép cộng hai phần.

### 5.3. Hồi chiêu

`Cooldown=base×(1−min(1,gearCooldownReduction))`, chỉ dòng hợp tướng dùng hồi chiêu. Dùng chung `abilityCooldownFor`; tướng dùng Nộ hưởng dòng Nộ nhận vào ở một điểm xử lý cuối tick.

### 5.4. Năm Bộ Xử Lý Kỹ Năng (The 5 Ability Handlers)
1. **Quét Diện Rộng (Cleave):**
   - Tác động lên kẻ địch chính và toàn bộ kẻ địch lân cận trong bán kính quét (mặc định $3.5$ đơn vị).
   - Gây $100\%$ sát thương SkillPower lên tất cả các mục tiêu trúng đòn.
2. **Giật Tia Dây Chuyền (Chain):**
   - Bắt đầu từ mục tiêu ban đầu, tia phép phóng lan qua các mục tiêu kẻ địch kế tiếp (mặc định 3 bước nhảy, một số tướng 4-5 bước nhảy).
   - Khoảng cách tối đa giữa 2 bước nhảy liên tiếp mặc định **6.0 đơn vị**; Thiết Phiến dùng 5,5.
   - Không giật lặp lại mục tiêu đã trúng trong cùng một lượt tung chiêu.
3. **Nổ Xung Kích (Nova):**
   - Phát nổ tỏa ra xung quanh mục tiêu hoặc quanh tướng với bán kính lớn (mặc định **6.0 đơn vị**).
   - Gây sát thương toàn bộ vùng và thường gắn kèm hiệu ứng Làm chậm (Slow 50% trong 3 giây).
4. **Khiên Hộ Vệ (Shield):**
   - Hướng vào đồng minh có tỉ lệ máu thấp nhất trong bán kính 12 đơn vị.
   - Cung cấp một lớp khiên ảo hấp thụ sát thương tương đương đối với các tướng ngoài Huyền:
     $$\mathbf{ShieldAmount} = \mathbf{SkillPower} \times 0.6$$
   - Khiên Huyền dùng hệ số riêng, có thể kèm phản đòn hoặc hộ thể. Khiên thường tồn tại đến khi vỡ hoặc bị khiên lớn hơn thay thế; khiên hồi dư của Nhiếp Tiểu Thiến hết sau 5 giây.
5. **Hồi Máu (Heal):**
   - Tìm kiếm đồng minh bị thương tổn nặng nhất trong bán kính 12 đơn vị.
   - Hồi phục trực tiếp lượng HP bằng $\mathbf{SkillPower}$.
   - Có thể lan truyền qua nhiều mục tiêu bị thương (Chain Heal) hoặc hồi toàn bộ vùng (Radius Heal).

### 5.5. Hiệu Ứng Trạng Thái (Status Effects Engine)
1. **Làm Chậm (Slow):**
   - Áp dụng lên quái vật. Giảm tốc độ di chuyển đi theo tỉ lệ `strength` (thường là 0.5, tức giảm 50% tốc chạy).
   - Lưu trữ danh sách đa nguồn (`slows`), lấy giá trị làm chậm mạnh nhất đang còn hiệu lực:
     $$Speed_{\text{actual}} = Speed_{\text{base}} \times \big(1 - \max(\text{SlowStrengths})\big)$$
2. **Thiêu Đốt (Burn):**
   - Gây sát thương theo thời gian (Damage Over Time); chỉ Tam Muội Chân Hỏa Thương ghi rõ sát thương chuẩn xuyên giáp.
   - Sát thương mỗi giây:
     $$\mathbf{DPS} = \frac{\text{SkillPower} \times \text{StatusStrength}}{\text{Duration}}$$
   - Đặc tính Quỷ Sai/Bảo Quả Tử và độc Ngô Câu có thông số riêng trong dữ liệu tướng; công thức trên chỉ áp dụng khi trạng thái dùng hệ số sức mạnh kỹ năng.
   - Ghi nhận chính xác ID tướng tung chiêu để tính chỉ số hạ gục và tổng sát thương.
3. **Hộ Giáp (Ward):**
   - Buff phòng thủ cho đồng minh. Giảm trực tiếp phần trăm sát thương gánh chịu (ví dụ `reduction = 0.35` tức giảm 35% sát thương sau giáp).
4. **Cuồng Nộ / Tăng Tốc (Haste):**
   - Buff tăng tốc độ đánh cho đồng minh trong thời gian ngắn (tăng trực tiếp vào mẫu số của công thức Attack Interval).
5. **Choáng / Trói (Stun / Root):** Choáng chặn di chuyển và đánh; trói chỉ chặn di chuyển. Mỗi trạng thái hết khi bộ đếm thời gian về 0.
6. **Đẩy Lùi (Knockback):** Di chuyển quái ngược về điểm trước trên lộ trình của làn, không làm lệch quyền quyết định khỏi server.
7. **Phá Giáp (Sunder):** Trừ Giáp cố định hoặc theo phần trăm trong thời gian hiệu lực; toàn đội hưởng lợi ở các đòn sau.

---

## 6. HỆ THỐNG 8 TRẬN PHÁP (FORMATIONS SYSTEM)

Người chơi có thể kích hoạt **1 trong 8 trận pháp**. Điểm trận pháp (`formationPoints`) được nhận miễn phí **mỗi 4 Wave** và **mỗi khi chiến thắng một Phụ bản**.
- Cấp độ trận pháp: Từ cấp 0 đến tối đa **cấp 3** (Cấp 4 được mở khóa từ Wave 40 trở đi).
- Thay đổi trận pháp đang dùng không làm mất điểm nâng cấp đã tích lũy.

| ID | Tên Trận Pháp | Mô Tả Tác Dụng | Thuộc Tính Buff Bản Web | Chỉ Số Tăng Mỗi Cấp |
|:---:|:---|:---|:---:|:---:|
| 1 | **Tam Tài Trận** | Sát thương gây ra +5%/cấp | `attack` | **+5% Công kích** |
| 2 | **Tứ Tượng Trận** | Sát thương hứng chịu giảm | `armor` | **+3 Giáp vật lý** |
| 3 | **Ngũ Hành Trận** | Sát thương bạo kích +5%/cấp | `attack` | **+5% Công kích** |
| 4 | **Lục Hợp Trận** | Tỉ lệ bạo kích +5%/cấp | `speed` | **+5% Tốc độ đánh** |
| 5 | **Thất Tinh Trận** | Tỉ lệ xuyên phá +5%/cấp | `attack` | **+5% Công kích** |
| 6 | **Bát Quái Trận** | Tỉ lệ chống đỡ +5%/cấp | `health` | **+5% Máu tối đa** |
| 7 | **Cửu Cung Trận** | Tỉ lệ chính xác +5%/cấp | `attack` | **+5% Công kích** |
| 8 | **Thập Tuyệt Trận**| Tỉ lệ né tránh +5%/cấp | `armor` | **+3 Giáp vật lý** |

---

## 7. HỆ THỐNG 27 TIÊN DUYÊN (SYNERGIES SYSTEM)

### 7.1. Nguyên Lý Hoạt Động
- Hệ thống chỉ quét các **tướng độc nhất (unique heroId)** đang thực sự được triển khai trong 5 ô trên chiến trường. Các bản sao trùng tên không được tính thêm vào số lượng kích hoạt duyên.
- Mỗi Tiên Duyên có các mốc kích hoạt (`thresholds`) từ 2 thành viên trở lên.
- Khi đạt mốc $k$ ($k \in [1, \text{thresholds.length}]$), toàn bộ đội hình của người chơi đó nhận được:
  $$\mathbf{BonusTotal} = \text{Amount} \times k$$

### 7.2. Danh Sách Chi Tiết 27 Tiên Duyên

#### 1. Hỏa Diệm Sơn
- **Thành viên (3):** Thiết Phiến (h00B), Hồng Hài Nhi (h00C), Ngưu Ma Vương (h00P)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Ngưu Ma Vương tấn công trong phạm vi xung quanh gây 150% công vật lý Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 2. Trần Đường Quan
- **Thành viên (4):** Kim Tra (h009), Mộc Tra (h00A), Na Tra (h00V), Lý Tịnh (h00W)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Máu tối đa** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Lý Tịnh hồi phục 50% sinh lực khi kết thúc Kim Chung Tráo - Na Tra tấn công gây sát thương phạm vi nhỏ Bản web: tăng sinh lực theo mỗi mốc Tiên Duyên.*

#### 3. U Minh
- **Thành viên (5):** Vô Thường (h00H), Mạnh Bà (h00I), Chung Quỳ (h00N), Phán Quan (h00O), Ngũ Đạo Tướng Quân (h00Y)
- **Các mốc kích hoạt:** 2, 3, 4, 5 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Tốc đánh** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Ngũ Đạo Tướng Quân tấn công cùng lúc 5 mục tiêu, Phược Hồn hồi phục 4% sinh lực và tăng 3% tốc độ đánh, tối đa 48% Bản web: tăng tốc độ đánh theo mỗi mốc Tiên Duyên.*

#### 4. Thỉnh Kinh
- **Thành viên (5):** Trư Bát Giới (h00J), Sa Ngộ Tịnh (h00K), Tiểu Bạch Long (h00L), Tôn Ngộ Không (h00R), Đường Tăng (h00S)
- **Các mốc kích hoạt:** 2, 3, 4, 5 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Tôn Ngộ Không tỉ lệ phát động Như Ý Côn +15% - Đường Tăng thi triển Khẩn Cô Chú giảm 10% sinh lực mục tiêu Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 5. Hậu Tây Du Ký
- **Thành viên (5):** Tịnh Đàn Sứ Giả (h03T), Kim Thân La Hán (h03U), Bát Bộ Thiên Long (h03V), Đấu Chiến Thắng Phật (h012), Kim Thiền Tử (h013)
- **Các mốc kích hoạt:** 2, 3, 4, 5 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Đấu Chiến Thắng Phật tỉ lệ phát động Như Ý Côn +20% - Kim Thiền Tử thi triển Khẩn Cô Chú giảm 15% sinh lực mục tiêu Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 6. Tiên Tử
- **Thành viên (4):** Mẫu Đơn Tiên Tử (h00F), Tinh Vệ (h00M), Hằng Nga (h018), Nữ Oa (h01C)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+1.5% Hồi máu/s** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Hằng Nga thi triển Nguyệt Quang Tịnh Hóa lập tức hồi phục 30% sinh lực phe mình - Nữ Oa hồi phục đầy sinh pháp lực mục tiêu Bản web: tăng hồi phục theo mỗi mốc Tiên Duyên.*

#### 7. Lưỡng Tình Tương Duyệt
- **Thành viên (2):** Hậu Nghệ (h017), Hằng Nga (h018)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Hậu Nghệ tấn công đồng thời 5 mục tiêu Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 8. Phong Thần Diễn Nghĩa
- **Thành viên (4):** Lôi Chấn Tử (h00T), Dương Tiễn (h00U), Na Tra (h00V), Khương Tử Nha (h019)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Lôi Chấn Tử thi triển Thiên Lôi lên 10 mục tiêu, công phép +20% - Dương Tiễn và Na Tra có 35% tấn công 2 lần Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 9. Yêu Linh
- **Thành viên (4):** Ngưu Ma Vương (h00P), Khổng Tước (h03R), Đát Kỷ (h00X), Kim Sí Đại Bằng (h016)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+1.5% Hồi máu/s** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Kim Sí Đại Bằng thi triển Tật Phong trúng mục tiêu hồi phục 6% sinh lực, bạo kích +5% - Kỹ năng Đát Kỷ hồi phục 20% sinh lực Bản web: tăng hồi phục theo mỗi mốc Tiên Duyên.*

#### 10. Phật Quang Phổ Chiếu
- **Thành viên (3):** Đấu Chiến Thắng Phật (h012), Kim Thiền Tử (h013), Kim Sí Đại Bằng (h016)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+3 Giáp** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Đấu Chiến Thắng Phật, Kim Thiền Tử, Kim Sí Đại Bằng miễn nhiễm choáng Bản web: tăng giáp theo mỗi mốc Tiên Duyên.*

#### 11. Thiên Đình
- **Thành viên (5):** Cự Linh Thần (h00E), Triệu Công Minh (h03S), Thái Bạch Kim Tinh (h015), Tây Vương Mẫu (h01A), Hậu Thổ (h01J)
- **Các mốc kích hoạt:** 2, 3, 4, 5 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+3 Giáp** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Tây Vương Mẫu tấn công đồng thời 5 mục tiêu - Thái Bạch Kim Tinh thi triển Tứ Tượng Luân Hồi tăng 10% phòng thủ cho mục tiêu Bản web: tăng giáp theo mỗi mốc Tiên Duyên.*

#### 12. Nữ Thần
- **Thành viên (4):** Thủy Mẫu (h014), Tây Vương Mẫu (h01A), Nữ Oa (h01C), Hậu Thổ (h01J)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Máu tối đa** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Nữ Oa khi sinh lực dưới 50% hồi phục đầy [CD: 45s] - Hậu Thổ tấn công gây 500% công vật lý diện rộng và choáng 2s [CD: 20s] Bản web: tăng sinh lực theo mỗi mốc Tiên Duyên.*

#### 13. Long Tộc Huyết Mạch
- **Thành viên (4):** Tiểu Bạch Long (h00L), Long Vương (h00Q), Ứng Long (h00Z), Chúc Long (h01K)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Chúc Long khiến kẻ địch trúng Nghiệp Hỏa tỉ lệ 15% giảm thêm 1000 sinh lực - Ứng Long tạo thêm 6 lần Băng Phong Bạo Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 14. Chân Hỏa
- **Thành viên (4):** Hồng Hài Nhi (h00C), Na Tra (h00V), Xích Tùng Tử (h010), Chúc Dung (h01H)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Chúc Dung tỉ lệ Hỏa Lưu Tinh +20%, chuyển hóa 130% sát thương thành công phép - Hộ thuẫn của Xích Tùng Tử miễn nhiễm khống chế Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 15. Thủy Thần
- **Thành viên (3):** Hà Bá (h00G), Thủy Mẫu (h014), Cộng Công (h01G)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+3 Giáp** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Thủy Mẫu, Cộng Công bị tấn công tỉ lệ 35% phản kích kẻ địch gây 125% công phép Bản web: tăng giáp theo mỗi mốc Tiên Duyên.*

#### 16. Đạo Vô Nhai
- **Thành viên (3):** Lã Động Tân (h00D), Khương Tử Nha (h019), Phục Hy (h01D)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+1.5% Hồi máu/s** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Thiên Kiếp của Khương Tử Nha gây 900% công phép - Phục Hy hấp thụ và hồi phục 40% sinh lực khi Khương Tử nha thi triển Thiên Kiếp Bản web: tăng hồi phục theo mỗi mốc Tiên Duyên.*

#### 17. Viêm Đế Huyết Mạch
- **Thành viên (2):** Tinh Vệ (h00M), Thần Nông (h01E)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Tốc đánh** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Mộc Linh biến mất hồi phục 50% cho Thần Nông - Tinh Vệ tấn công 6 mục tiêu, tốc độ +12%, xuyên phá +100% Bản web: tăng tốc độ đánh theo mỗi mốc Tiên Duyên.*

#### 18. Hoàng Thiên Ứng Long
- **Thành viên (2):** Ứng Long (h00Z), Hiên Viên (h01F)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Hiên Viên Hoàng Đế thi triển Kinh Thiên Nhất Kiếm với tỉ lệ bạo kích 100%, sát thương bạo kích +30% Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 19. Trục Nhật
- **Thành viên (2):** Hậu Nghệ (h017), Khoa Phụ (h01I)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Hậu Nghệ thi triển Bách Bộ Xuyên Dương khiến mục tiêu bị thiêu đốt mỗi giây 150% công phép trong 5s, pháp lực tiêu hao giảm 50 Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 20. Chiến Phủ Hồng Hoang
- **Thành viên (2):** Hình Thiên (h011), Bàn Cổ (h01B)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Bàn Cổ lực tấn công Khai Thiên tăng 25%, bỏ qua né tránh kẻ địch - Hình Thiên mở rộng phạm vi Chiến Ý Vĩnh Hằng Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 21. Bảo Liên Đăng
- **Thành viên (2):** Trầm Hương (h03Q), Dương Tiễn (h00U)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+3 Giáp** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Trầm Hương thi triển tuyệt kỹ khiến Dương Tiễn tăng 30% phòng thủ tấn công trong 15s Bản web: tăng giáp theo mỗi mốc Tiên Duyên.*

#### 22. Tứ Hầu Hỗn Thế
- **Thành viên (3):** Tôn Ngộ Không (h00R), Đấu Chiến Thắng Phật (h012), Lục Nhĩ Mỹ Hầu (h03Y)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Máu tối đa** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Tôn Ngộ Không, Đấu Chiến Thắng Phật phân thân nhận tất cả thuộc tính bản thể - Lục Nhĩ Mỹ Hầu miễn nhiễm khống chế Bản web: tăng sinh lực theo mỗi mốc Tiên Duyên.*

#### 23. Phong Vũ Lôi Điện
- **Thành viên (4):** Long Vương (h00Q), Lôi Chấn Tử (h00T), Điện Mẫu (h03W), Phong Bá (h03X)
- **Các mốc kích hoạt:** 2, 3, 4 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Sát thương kỹ năng cả 4 nhân vật tăng 10% - Điện Mẫu tấn công cộng dồn điện tích khiến uy lực Cuồng Phong của Phong Bá tăng thêm 5% [Max 50%] Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 24. Thiên Địa Nhân Đạo
- **Thành viên (3):** Thái Bạch Kim Tinh (h015), Khương Tử Nha (h019), Trương Đạo Lăng (h040)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Trương Đạo Lăng tăng phạm vi Thần Lôi Phù, tỉ lệ bạo kích 30% Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

#### 25. Âm Khí Trùng Thiên
- **Thành viên (3):** Ngũ Đạo Tướng Quân (h00Y), Chúc Long (h01K), Tương Thần (h03Z)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Máu tối đa** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Tương Thần tấn công Thi Binh tăng 550, sinh lực tăng 5500, miễn nhiễm khống chế - Chúc Long thi triển Hỏa Long đốt cháy 13% HP địch Bản web: tăng sinh lực theo mỗi mốc Tiên Duyên.*

#### 26. Tam Đại Thần Điểu
- **Thành viên (3):** Khổng Tước (h03R), Kim Sí Đại Bằng (h016), Phượng Hoàng (h041)
- **Các mốc kích hoạt:** 2, 3 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Tốc đánh** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Phượng Hoàng Chân Hỏa tỉ lệ 30% liên kích 2 lần - Kim Sí Đại Bằng bị tấn công cộng dồn 5% sát thương gia tăng cho Tật Phong Bản web: tăng tốc độ đánh theo mỗi mốc Tiên Duyên.*

#### 27. Thần Hỏa
- **Thành viên (2):** Chúc Dung (h01H), Phượng Hoàng (h041)
- **Các mốc kích hoạt:** 2 tướng trên sân.
- **Hiệu ứng bản Web:** Mỗi mốc tăng **+8% Công kích** cho toàn bộ tướng.
- **Mô tả cốt truyện map gốc:**
  > *- Chúc Dung tăng phạm vi sát thương Hỏa Lưu Tinh - Phượng Hoàng kích hoạt Thiên Hỏa Phượng Vũ liên tiếp gây 180% công phép diện rộng [CD: 35s] Bản web: tăng công kích theo mỗi mốc Tiên Duyên.*

---

## 8. Tiến trình 20 wave hiện tại

Mọi độ khó có 20 wave. Lịch sinh, số lượng từng nhóm, đầu lĩnh, Boss, nhịp và hệ số nằm tại [wave-plan.ts](../packages/game-core/src/wave-plan.ts), [balance-curve.ts](../packages/game-core/src/balance-curve.ts) và [hướng dẫn cân bằng](twenty-wave-balance.md). Có 456 quái mỗi làn trong toàn trận và sáu thực thể Boss chung: một ở wave 5, hai ở wave 10, một ở wave 15, hai ở wave 20. Boss chung co giãn theo số người chơi. Không dùng công thức sinh 6+floor(.6×wave) của bản cũ.

Chuẩn bị đầu trận 35 giây, các wave sau 25 giây; chủ phòng có thể gọi sớm. Combat kết thúc khi sinh hết và không còn quái ở đường chính, không tự xóa quái theo timeout. Thưởng wave đều cho mọi người: `180+40×wave` Linh Thạch, `4+floor(wave/10)` Đạo Duyên; thêm một điểm trận pháp khi wave chia hết cho 4 hoặc 5. Tổng Linh Thạch chắc chắn 20 wave cộng vốn ban đầu là 12.500. Bảng độ khó lấy từ [catalog.ts](../content/catalog.ts).

## 9. Phụ bản đã ngừng hoạt động

Bản 20 wave không có mở/rút quân phụ bản hoặc thưởng phụ bản trong tiến trình. Dữ liệu gốc trong catalog được giữ để truy nguồn. `onDungeonGearReward` là helper chưa nối gameplay: với danh sách chủ tham gia do server xác định, mỗi chủ nhận một món ít nhất tím ở wave mở trong metadata; không tính nguồn này vào thu nhập hoặc kỳ vọng đồ của trận hiện tại.

## 10. BẢNG TRA CỨU CHI TIẾT TOÀN BỘ 70 TƯỚNG (HEROES ROSTER)

Dưới đây là danh sách toàn bộ 70 vị tướng được sắp xếp theo từng Phẩm chất (Tier từ 1 đến 6).
- **Chú giải trường dữ liệu:**
  - **ID:** Mã định danh duy nhất (ví dụ h001).
  - **Tên:** Danh xưng tiếng Việt phục dựng từ map gốc.
  - **Hệ:** Kim, Mộc, Thủy, Hỏa, Thổ.
  - **Vai trò:** Chiến Binh (Warrior), Xạ Thủ (Ranger), Pháp Sư (Mage), Hộ Vệ (Guardian), Hỗ Trợ (Support).
  - **HP / ATK / Armor:** Chỉ số sinh lực, sát thương, giáp cơ bản tại Bậc 1.
  - **Range / Interval / Speed:** Tầm bắn (đơn vị), thời gian giữa 2 đòn đánh (giây), tốc độ di chuyển.
  - **Kỹ năng:** Tên chiêu, Loại chiêu (cleave/chain/nova/shield/heal), Hồi chiêu (giây), Hệ số sức mạnh (Power), Mô tả chiêu thức.

### 10.1. Phẩm Chất Linh (Tier 1) (8 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Giây/đòn | Tốc Chạy | Đặc Tính Đánh Thường | Hiệu Ứng Chi Tiết |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h001` | **Thiên Lý Nhãn** | Kim (Metal) | Xạ Thủ (Ranger) | 220 | 55 | 3 | 8.5 | 0.85s | 3.6 | **Đặc tính: Thiên Nhãn Thấu Thị** (không có kỹ năng chủ động) | Đánh thường xuyên 4 Giáp; phát thứ tư liên tiếp vào cùng mục tiêu phá 2 Giáp trong 3 giây. |
| `h002` | **Thuận Phong Nhĩ** | Mộc (Wood) | Xạ Thủ (Ranger) | 220 | 48 | 3 | 8 | 0.9s | 3.6 | **Đặc tính: Phong Âm Cộng Hưởng** (không có kỹ năng chủ động) | Đòn bắn nảy sang một quái gần nhất trong 4 đơn vị với 50% sát thương; cả hai bị chậm 15% trong 1,5 giây. |
| `h003` | **Quỷ Sai** | Hỏa (Fire) | Chiến Binh (Warrior) | 650 | 52 | 6 | 1.8 | 1s | 4.2 | **Đặc tính: Quỷ Liêm Âm Hỏa** (không có kỹ năng chủ động) | Mỗi đòn gây thiêu đốt bằng 40% Công trong 2 giây; quái đang cháy chết sẽ nổ 30 sát thương trong bán kính 2. |
| `h004` | **Thiên Binh** | Kim (Metal) | Chiến Binh (Warrior) | 680 | 50 | 7 | 2 | 1.05s | 4 | **Đặc tính: Trường Thương Phá Giáp** (không có kỹ năng chủ động) | 25% cơ hội chí mạng 150% sát thương; mũi thương quét thêm tối đa hai quái sát mục tiêu trong bán kính 2. |
| `h005` | **Xạ Nhân** | Thổ (Earth) | Xạ Thủ (Ranger) | 240 | 58 | 4 | 7.5 | 1.05s | 3.5 | **Đặc tính: Trọng Tiễn Chấn Động** (không có kỹ năng chủ động) | Mỗi phát thứ ba làm choáng 0,4 giây và đẩy mục tiêu lùi 0,5 đơn vị. |
| `h006` | **Tiên Nữ** | Mộc (Wood) | Pháp Sư (Mage) | 190 | 54 | 2 | 7 | 1.2s | 3.4 | **Đặc tính: Linh Hoa Tán Lộc** (không có kỹ năng chủ động) | Đánh một mục tiêu (support không đánh lan); hồi 15 HP cho đồng minh thấp máu nhất trong 6 đơn vị. |
| `h007` | **Quy Thừa Tướng** | Thủy (Water) | Hộ Vệ (Guardian) | 1450 | 32 | 12 | 1.8 | 1.25s | 3 | **Đặc tính: Huyền Quy Hàn Giáp** (không có kỹ năng chủ động) | Giảm cố định 10 sát thương nhận vào; kẻ đánh cận chiến bị chậm di chuyển và đánh 20% trong 2 giây. |
| `h008` | **Thổ Hành Tôn** | Thổ (Earth) | Chiến Binh (Warrior) | 720 | 48 | 8 | 1.8 | 1s | 4.4 | **Đặc tính: Độn Thổ Xung Kích** (không có kỹ năng chủ động) | Lướt nhanh khi tiếp cận mục tiêu mới; mỗi đòn thứ tư nứt đất trong bán kính 2,5, gây 130% Công và tự tăng 4 Giáp trong 3 giây. |

### 10.2. Phẩm Chất Huyền (Tier 2) (12 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Giây/đòn | Tốc Chạy | Kỹ Năng (Tên - Loại - Hồi - Hệ số) | Đặc Tính & Hiệu Ứng |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h009` | **Kim Tra** | Kim (Metal) | Hộ Vệ (Guardian) | 2400 | 65 | 16 | 1.8 | 1.15s | 3 | **Kim Quang Hộ Thể Trận** (`shield`, CD: 10s, x2.2) | Kim Cang Phản Kích: đòn đánh có 20% cơ hội phá 3 Giáp. Tạo khiên 2,2× Công + 10% Máu tối đa cho bản thân và đồng minh thấp máu nhất trong bán kính 5; khiên phản 35% sát thương cận chiến xuyên giáp. |
| `h00A` | **Mộc Tra** | Mộc (Wood) | Chiến Binh (Warrior) | 1250 | 92 | 10 | 2 | 0.95s | 4.2 | **Ngô Câu Mộc Khí Trảm** (`cleave`, CD: 8.5s, x2.3) | Song Kiếm Ngô Câu: Mỗi đòn đánh hồi cho bản thân 8 HP. Quét kiếm khí gây 230% Công trong bán kính 3,8; trói 1,8 giây và gây độc 30 sát thương mỗi giây trong 3 giây. |
| `h00B` | **Thiết Phiến** | Thổ (Earth) | Xạ Thủ (Ranger) | 420 | 98 | 5 | 8.5 | 0.9s | 3.8 | **Ba Tiêu Cuồng Phong Toàn** (`chain`, CD: 10s, x2.1) | Ba Tiêu Trọng Phong: Đòn đánh đẩy lùi 0,2 đơn vị khi mục tiêu ở gần dưới 4 đơn vị. Lốc cát đá nảy qua 4 quái trong tầm 5,5, gây 210% Công, đẩy lùi 1,8 đơn vị và làm chậm 35% trong 3 giây. |
| `h00C` | **Hồng Hài Nhi** | Hỏa (Fire) | Chiến Binh (Warrior) | 1180 | 96 | 9 | 2.2 | 1s | 4.3 | **Tam Muội Chân Hỏa Thương** (`cleave`, CD: 9s, x2.5) | Thương Lửa Tam Muội: Đòn đánh gây thêm 15% sát thương khi quái đang bị thiêu đốt. Quét lửa gây 250% Công trong bán kính 4; thiêu đốt thêm 120% Công thành sát thương chuẩn trong 4 giây. |
| `h00D` | **Lã Động Tân** | Hỏa (Fire) | Pháp Sư (Mage) | 360 | 110 | 4 | 7.5 | 1.2s | 3.5 | **Thuần Dương Vạn Kiếm Quyết** (`nova`, CD: 9.5s, x2.35) | Phi Kiếm Thuần Dương: 20% cơ hội phóng thêm kiếm hỏa gây 50% sát thương. Cự kiếm rơi xuống mục tiêu, nổ 235% Công trong bán kính 4,2 và để lại kiếm hỏa 2,5 giây. |
| `h00E` | **Cự Linh Thần** | Kim (Metal) | Hộ Vệ (Guardian) | 2550 | 68 | 17 | 2 | 1.25s | 3 | **Cự Linh Thiết Bích Trấn** (`shield`, CD: 12s, x2) | Cự Linh Song Chùy: đòn bổ búa chấn động quái trong bán kính 1,5. Dựng tường kim khí: tạo khiên cho đồng minh trong bán kính 4,5, tăng 6 Giáp và giảm 25% sát thương nhận trong 4 giây. |
| `h00F` | **Mẫu Đơn Tiên Tử** | Mộc (Wood) | Hỗ Trợ (Support) | 620 | 75 | 6 | 7 | 1.15s | 3.8 | **Bách Hoa Hồi Xuân Khúc** (`heal`, CD: 10.5s, x2) | Hương Hoa Lan Tỏa: Đồng minh gần nhất được tăng 8% tốc độ đánh khi ở trong vùng ảnh hưởng. Hồi 200% Công cho tối đa 3 đồng minh thấp máu nhất trong bán kính 7,5 và tăng 25% tốc đánh trong 4 giây. |
| `h00G` | **Hà Bá** | Thủy (Water) | Pháp Sư (Mage) | 380 | 105 | 4 | 7 | 1.25s | 3.4 | **Hoàng Hà Cuộn Sóng** (`nova`, CD: 10s, x2.15) | Thủy Cầu Thấm Ướt: Đòn đánh làm chậm quái 15% trong 1,5 giây. Xoáy nước đánh vào nơi quái đông nhất: gây 215% Công trong bán kính 4,5, hút về tâm và làm chậm 55% trong 3,5 giây. |
| `h00H` | **Vô Thường** | Thổ (Earth) | Xạ Thủ (Ranger) | 410 | 102 | 5 | 8 | 0.9s | 3.6 | **Hắc Bạch Tỏa Hồn Xích** (`chain`, CD: 9.5s, x2.2) | Xích Câu Hồn: Đòn đánh gây thêm 20% sát thương khi mục tiêu còn dưới 40% Máu. Xích âm phủ nảy qua 4 quái gây 220% Công; giảm 4 Giáp và làm chậm 40% trong 3 giây. |
| `h00I` | **Mạnh Bà** | Thủy (Water) | Xạ Thủ (Ranger) | 400 | 94 | 5 | 8 | 0.95s | 3.6 | **Vong Xuyên Mê Hồn Thang** (`chain`, CD: 11s, x1.95) | Vong Xuyên Thủy Tiễn: Đòn đánh làm giảm 15% sức Công của quái trong 2 giây. Canh Vong Xuyên nảy qua 5 quái gây 195% Công; chậm di chuyển 60% và tốc đánh 30% trong 4 giây. |
| `h03O` | **Nhiếp Tiểu Thiến** | Thủy (Water) | Hỗ Trợ (Support) | 600 | 78 | 6 | 6.5 | 1.15s | 3.9 | **U Lan Minh Khúc** (`heal`, CD: 9.5s, x2.1) | Tiếng Đàn U Oán: Chuyển 20% sát thương đòn đánh thành máu cho đồng minh tuyến trước. Hồi 210% Công cho đồng minh trong bán kính 7; lượng hồi dư chuyển thành khiên sương tồn tại 5 giây. |
| `h03P` | **Bảo Quả Tử** | Mộc (Wood) | Pháp Sư (Mage) | 370 | 108 | 4 | 7 | 1.25s | 3.4 | **Linh Quả Bạo Liệt** (`nova`, CD: 10s, x2.3) | Hạt Giống Ký Sinh: Đòn đánh gây độc 15 sát thương mỗi giây trong 2 giây. Thần quả nổ gây 230% Công trong bán kính 4,2; bào tử độc rút 100% Công và giảm 25% Giáp trong 3,5 giây. |

### 10.3. Phẩm Chất Siêu (Tier 3) (11 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Đánh/s | Tốc Chạy | Kỹ Năng (Tên - Loại - Hồi - Hệ số) | Hiệu Ứng Chi Tiêu |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h00J` | **Trư Bát Giới** | Thủy (Water) | Hộ Vệ (Guardian) | 2790 | 55 | 14 | 1.8 | 1.2s | 3 | **Bát Giới Hộ Pháp** (`shield`, CD: 11s, x1.9) | Dựng giáp cho đồng đội quanh mình. |
| `h00K` | **Sa Ngộ Tịnh** | Kim (Metal) | Hỗ Trợ (Support) | 640 | 66 | 6 | 6.5 | 1.2s | 3.9 | **Sa Tăng Tịnh Tâm** (`heal`, CD: 8.5s, x2.1) | Hồi máu một đồng đội thấp máu. |
| `h00L` | **Tiểu Bạch Long** | Mộc (Wood) | Xạ Thủ (Ranger) | 408 | 86 | 5 | 8 | 0.9s | 3.6 | **Bạch Long Phá Lãng** (`chain`, CD: 9s, x2.05) | Thủy tiễn nối nhiều kẻ địch. |
| `h00M` | **Tinh Vệ** | Thổ (Earth) | Xạ Thủ (Ranger) | 408 | 86 | 5 | 8 | 0.9s | 3.6 | **Tinh Vệ Điền Hải** (`chain`, CD: 7.5s, x1.6) | Mưa đá nhỏ nối qua bầy địch. |
| `h00N` | **Chung Quỳ** | Hỏa (Fire) | Pháp Sư (Mage) | 320 | 95 | 4 | 7 | 1.35s | 3.3 | **Chung Quỳ Trấn Quỷ** (`nova`, CD: 11.5s, x2.25) | Ấn pháp nổ quanh địch và thiêu âm khí. |
| `h00O` | **Phán Quan** | Thổ (Earth) | Chiến Binh (Warrior) | 1287 | 82 | 8 | 1.8 | 1.05s | 4.2 | **Phán Quan Đoạn Án** (`cleave`, CD: 8.5s, x2.55) | Một nhát chém mạnh kết án kẻ địch. |
| `h00P` | **Ngưu Ma Vương** | Kim (Metal) | Chiến Binh (Warrior) | 1287 | 82 | 8 | 1.8 | 1.05s | 4.2 | **Ngưu Vương Chấn Địa** (`cleave`, CD: 12s, x2.3) | Giẫm đất quét vùng rộng và làm chậm. |
| `h00Q` | **Long Vương** | Thủy (Water) | Pháp Sư (Mage) | 320 | 95 | 4 | 7 | 1.35s | 3.3 | **Long Cung Triều Tịch** (`nova`, CD: 12s, x2.2) | Sóng rồng bùng nổ trên vùng lớn. |
| `h03Q` | **Trầm Hương** | Kim (Metal) | Pháp Sư (Mage) | 320 | 95 | 4 | 7 | 1.35s | 3.3 | **Trầm Hương Khai Sơn** (`nova`, CD: 9.5s, x2.3) | Rìu phép nổ vùng nhỏ và làm chậm. |
| `h03R` | **Khổng Tước** | Mộc (Wood) | Hỗ Trợ (Support) | 640 | 66 | 6 | 6.5 | 1.2s | 3.9 | **Khổng Tước Ngũ Sắc** (`heal`, CD: 12s, x2.15) | Lông ngũ sắc chữa lành vùng rộng. |
| `h03S` | **Triệu Công Minh** | Hỏa (Fire) | Hộ Vệ (Guardian) | 2790 | 55 | 14 | 1.8 | 1.2s | 3 | **Công Minh Kim Tiền** (`shield`, CD: 9.5s, x2.3) | Tiền đồng tạo giáp cho một đồng đội. |

### 10.4. Phẩm Chất Tiên (Tier 4) (13 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Đánh/s | Tốc Chạy | Kỹ Năng (Tên - Loại - Hồi - Hệ số) | Hiệu Ứng Chi Tiêu |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h00R` | **Tôn Ngộ Không** | Thổ (Earth) | Chiến Binh (Warrior) | 1612 | 99 | 9 | 1.8 | 1.05s | 4.2 | **Như Ý Thiên Quân** (`cleave`, CD: 7s, x2.65) | Gậy Như Ý quét địch sát nhau. |
| `h00S` | **Đường Tăng** | Mộc (Wood) | Pháp Sư (Mage) | 400 | 114 | 5 | 7 | 1.35s | 3.3 | **Chân Kinh Phật Quang** (`nova`, CD: 12.5s, x2.1) | Phật quang tỏa quanh địch, làm chậm. |
| `h00T` | **Lôi Chấn Tử** | Thổ (Earth) | Pháp Sư (Mage) | 400 | 114 | 5 | 7 | 1.35s | 3.3 | **Lôi Dực Thiên Kích** (`nova`, CD: 11s, x2.35) | Sấm sét đánh vùng rộng, để lại bỏng điện. |
| `h00U` | **Dương Tiễn** | Kim (Metal) | Chiến Binh (Warrior) | 1612 | 99 | 9 | 1.8 | 1.05s | 4.2 | **Tam Tiêm Phá Vọng** (`cleave`, CD: 8s, x2.45) | Mũi kích xuyên tuyến gần mục tiêu. |
| `h00V` | **Na Tra** | Hỏa (Fire) | Chiến Binh (Warrior) | 1612 | 99 | 9 | 1.8 | 1.05s | 4.2 | **Phong Hỏa Luân Trảm** (`cleave`, CD: 9s, x2.4) | Lửa quét quanh Na Tra và thiêu địch. |
| `h00W` | **Lý Tịnh** | Kim (Metal) | Hộ Vệ (Guardian) | 3488 | 66 | 15 | 1.8 | 1.2s | 3 | **Bảo Tháp Trấn Yêu** (`shield`, CD: 12.5s, x2.2) | Tháp vàng che chắn vùng đồng minh. |
| `h00X` | **Đát Kỷ** | Mộc (Wood) | Xạ Thủ (Ranger) | 510 | 104 | 6 | 8 | 0.9s | 3.6 | **Hồ Mị Huyễn Tiễn** (`chain`, CD: 10.5s, x2) | Ảo tiễn lan qua địch và làm chúng chậm. |
| `h00Y` | **Ngũ Đạo Tướng Quân** | Thủy (Water) | Hỗ Trợ (Support) | 800 | 79 | 7 | 6.5 | 1.2s | 3.9 | **Ngũ Đạo Luân Hồi** (`heal`, CD: 13s, x1.8) | Hồi máu vùng rộng cho đồng đội. |
| `h00Z` | **Ứng Long** | Thủy (Water) | Xạ Thủ (Ranger) | 510 | 104 | 6 | 8 | 0.9s | 3.6 | **Ứng Long Vũ Tiễn** (`chain`, CD: 8.5s, x2.2) | Mũi tên nước nối qua nhiều địch. |
| `h010` | **Xích Tùng Tử** | Hỏa (Fire) | Hỗ Trợ (Support) | 800 | 79 | 7 | 6.5 | 1.2s | 3.9 | **Xích Tùng Cam Lộ** (`heal`, CD: 10.5s, x1.95) | Cam lộ chữa lành và thúc bước đồng đội. |
| `h03T` | **Tịnh Đàn Sứ Giả** | Thủy (Water) | Hộ Vệ (Guardian) | 3488 | 66 | 15 | 1.8 | 1.2s | 3 | **Tịnh Đàn Thiên Hộ** (`shield`, CD: 11s, x2.2) | Linh quang dựng giáp cho tuyến gần. |
| `h03U` | **Kim Thân La Hán** | Kim (Metal) | Hỗ Trợ (Support) | 800 | 79 | 7 | 6.5 | 1.2s | 3.9 | **Kim Thân Từ Quang** (`heal`, CD: 9s, x2.25) | Từ quang chữa một đồng đội suy yếu. |
| `h03V` | **Bát Bộ Thiên Long** | Mộc (Wood) | Xạ Thủ (Ranger) | 510 | 104 | 6 | 8 | 0.9s | 3.6 | **Bát Bộ Long Ảnh** (`chain`, CD: 9.5s, x2.4) | Long ảnh nối qua nhiều địch và làm chậm. |

### 10.5. Phẩm Chất Thánh (Tier 5) (13 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Đánh/s | Tốc Chạy | Kỹ Năng (Tên - Loại - Hồi - Hệ số) | Hiệu Ứng Chi Tiêu |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h011` | **Hình Thiên** | Hỏa (Fire) | Chiến Binh (Warrior) | 1931 | 115 | 10 | 2 | 1.05s | 4.2 | **Hình Thiên Bất Khuất** (`cleave`, CD: 8s, x2.8) | Rìu chiến quét rộng dù bị vây. |
| `h012` | **Đấu Chiến Thắng Phật** | Thổ (Earth) | Chiến Binh (Warrior) | 1931 | 115 | 10 | 1.8 | 1.05s | 4.2 | **Đấu Chiến Kim Cang** (`cleave`, CD: 9.5s, x2.7) | Gậy pháp quét sát địch, thiêu linh lực. |
| `h013` | **Kim Thiền Tử** | Mộc (Wood) | Pháp Sư (Mage) | 480 | 134 | 6 | 7 | 1.35s | 3.3 | **Kim Thiền Giải Nghiệp** (`nova`, CD: 10s, x2.15) | Phật âm nổ quanh địch và giảm tốc. |
| `h014` | **Thủy Mẫu** | Thủy (Water) | Hộ Vệ (Guardian) | 4185 | 77 | 16 | 4 | 1.2s | 3 | **Thủy Mẫu Hải Mạc** (`shield`, CD: 10.5s, x2.1) | Màn nước tạo giáp rộng cho đồng minh. |
| `h015` | **Thái Bạch Kim Tinh** | Kim (Metal) | Hỗ Trợ (Support) | 960 | 93 | 8 | 6.5 | 1.2s | 3.9 | **Thái Bạch Hộ Tinh** (`heal`, CD: 9s, x2.4) | Tinh quang chữa một đồng đội nguy cấp. |
| `h016` | **Kim Sí Đại Bằng** | Kim (Metal) | Chiến Binh (Warrior) | 1931 | 115 | 10 | 1.8 | 1.05s | 4.2 | **Đại Bằng Kim Vũ** (`cleave`, CD: 8.5s, x2.75) | Cánh vàng chém quét vùng lớn. |
| `h017` | **Hậu Nghệ** | Hỏa (Fire) | Xạ Thủ (Ranger) | 612 | 122 | 7 | 8 | 0.9s | 3.6 | **Hậu Nghệ Truy Nhật** (`chain`, CD: 9.5s, x2.65) | Tên lửa nối dài qua nhiều mục tiêu. |
| `h018` | **Hằng Nga** | Thủy (Water) | Hỗ Trợ (Support) | 960 | 93 | 8 | 6.5 | 1.2s | 3.9 | **Hằng Nga Nguyệt Lộ** (`heal`, CD: 12.5s, x2.15) | Ánh trăng hồi máu vùng lớn. |
| `h019` | **Khương Tử Nha** | Thổ (Earth) | Pháp Sư (Mage) | 480 | 134 | 6 | 7 | 1.35s | 3.3 | **Khương Công Phong Thần** (`nova`, CD: 10.5s, x2.4) | Phong ấn nổ vùng trung bình và giảm tốc. |
| `h01A` | **Tây Vương Mẫu** | Mộc (Wood) | Xạ Thủ (Ranger) | 612 | 122 | 7 | 8 | 0.9s | 3.6 | **Vương Mẫu Bàn Đào** (`chain`, CD: 11s, x2.4) | Đào tiên thành đạn nối qua địch. |
| `h03W` | **Điện Mẫu** | Hỏa (Fire) | Xạ Thủ (Ranger) | 612 | 122 | 7 | 8 | 0.9s | 3.6 | **Điện Mẫu Lôi Tiễn** (`chain`, CD: 8s, x2.7) | Điện tiễn nhảy qua bầy địch, để lại bỏng. |
| `h03X` | **Phong Bá** | Kim (Metal) | Pháp Sư (Mage) | 480 | 134 | 6 | 7 | 1.35s | 3.3 | **Phong Bá Cuồng Phong** (`nova`, CD: 10.5s, x2.5) | Lốc gió nổ lớn và giảm tốc địch. |
| `h03Y` | **Lục Nhĩ Mỹ Hầu** | Mộc (Wood) | Hộ Vệ (Guardian) | 4185 | 77 | 16 | 1.8 | 1.2s | 3 | **Lục Nhĩ Thính Giới** (`shield`, CD: 10.5s, x2.35) | Âm giới dựng giáp cho đồng đội gần. |

### 10.6. Phẩm Chất Thần (Tier 6) (13 Tướng)

| ID | Tên Tướng | Hệ | Vai Trò | HP | Công | Giáp | Tầm | Đánh/s | Tốc Chạy | Kỹ Năng (Tên - Loại - Hồi - Hệ số) | Hiệu Ứng Chi Tiêu |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|:---|
| `h01B` | **Bàn Cổ** | Kim (Metal) | Chiến Binh (Warrior) | 2255 | 132 | 11 | 1.8 | 1.05s | 4.2 | **Bàn Cổ Khai Thiên** (`cleave`, CD: 13s, x3.15) | Một nhát khai thiên quét vùng rất rộng. |
| `h01C` | **Nữ Oa** | Thủy (Water) | Hỗ Trợ (Support) | 1120 | 106 | 9 | 6.5 | 1.2s | 3.9 | **Nữ Oa Bổ Thiên** (`heal`, CD: 13.5s, x2.5) | Ánh ngũ sắc hồi máu cả vùng rộng. |
| `h01D` | **Phục Hy** | Kim (Metal) | Xạ Thủ (Ranger) | 714 | 139 | 8 | 8 | 0.9s | 3.6 | **Phục Hy Bát Quái** (`chain`, CD: 10s, x2.85) | Quái đồ bắn nối qua năm mục tiêu. |
| `h01E` | **Thần Nông** | Mộc (Wood) | Hỗ Trợ (Support) | 1120 | 106 | 9 | 6.5 | 1.2s | 3.9 | **Thần Nông Bách Thảo** (`heal`, CD: 11s, x2.35) | Thảo dược hồi máu và thúc bước đồng đội. |
| `h01F` | **Hiên Viên** | Thổ (Earth) | Chiến Binh (Warrior) | 2255 | 132 | 11 | 1.8 | 1.05s | 4.2 | **Hiên Viên Kiếm Quyết** (`cleave`, CD: 9s, x3) | Kiếm khí quét trước mặt với lực mạnh. |
| `h01G` | **Cộng Công** | Thủy (Water) | Pháp Sư (Mage) | 560 | 153 | 7 | 7 | 1.35s | 3.3 | **Cộng Công Nộ Hải** (`nova`, CD: 12s, x2.85) | Hồng thủy nổ rộng và ghìm chân địch. |
| `h01H` | **Chúc Dung** | Hỏa (Fire) | Chiến Binh (Warrior) | 2255 | 132 | 11 | 1.8 | 1.05s | 4.2 | **Chúc Dung Phần Thiên** (`cleave`, CD: 10s, x2.95) | Hỏa quyền quét rộng và thiêu cháy. |
| `h01I` | **Khoa Phụ** | Mộc (Wood) | Hộ Vệ (Guardian) | 4883 | 89 | 17 | 1.8 | 1.2s | 3 | **Khoa Phụ Trục Nhật** (`shield`, CD: 11.5s, x2.5) | Che chắn tuyến đầu và tăng nhịp chạy. |
| `h01J` | **Hậu Thổ** | Thổ (Earth) | Xạ Thủ (Ranger) | 714 | 139 | 8 | 8 | 0.9s | 3.6 | **Hậu Thổ Trấn Sơn** (`chain`, CD: 9.5s, x2.7) | Thổ tiễn nối địch và giữ chúng chậm. |
| `h01K` | **Chúc Long** | Hỏa (Fire) | Pháp Sư (Mage) | 560 | 153 | 7 | 7 | 1.35s | 3.3 | **Chúc Long Nhật Dạ** (`nova`, CD: 12.5s, x3) | Ánh nhật nguyệt nổ và đốt địch. |
| `h03Z` | **Tương Thần** | Thổ (Earth) | Hộ Vệ (Guardian) | 4883 | 89 | 17 | 1.8 | 1.2s | 3 | **Tương Thần Thiết Quan** (`shield`, CD: 12s, x2.75) | Quan tài đá che chắn cả nhóm gần. |
| `h040` | **Trương Đạo Lăng** | Kim (Metal) | Pháp Sư (Mage) | 560 | 153 | 7 | 7 | 1.35s | 3.3 | **Đạo Lăng Thiên Phù** (`nova`, CD: 11.5s, x2.8) | Thiên phù nổ lớn, làm chậm yêu tà. |
| `h041` | **Phượng Hoàng** | Hỏa (Fire) | Xạ Thủ (Ranger) | 714 | 139 | 8 | 8 | 0.9s | 3.6 | **Phượng Hoàng Niết Hỏa** (`chain`, CD: 11.5s, x2.9) | Lông lửa nối địch và thiêu rực chúng. |

---

## 11. BẢNG TRA CỨU TOÀN BỘ 62 CÔNG THỨC GHÉP TƯỚNG (CRAFTING MATRIX)

Toàn bộ 62 công thức từ map gốc đều tuân thủ nguyên tắc:
$$\text{Nguyên Liệu 1 (Bậc 1)} + \text{Nguyên Liệu 2 (Bậc 1)} + \text{Nguyên Liệu 3 (Bậc 1)} \longrightarrow \mathbf{\text{Tướng Ghép Kết Quả (Bậc 1)}}$$

| STT | Tướng Kết Quả | ID Kết Quả | Phẩm Chất | Nguyên Liệu 1 | Nguyên Liệu 2 | Nguyên Liệu 3 |
|:---:|:---|:---:|:---:|:---|:---|:---|
| 1 | **Kim Tra** | `h009` | Huyền (Tier 2) | Quy Thừa Tướng (`h007`) | Quy Thừa Tướng (`h007`) | Thổ Hành Tôn (`h008`) |
| 2 | **Mộc Tra** | `h00A` | Huyền (Tier 2) | Thiên Binh (`h004`) | Thổ Hành Tôn (`h008`) | Thuận Phong Nhĩ (`h002`) |
| 3 | **Thiết Phiến** | `h00B` | Huyền (Tier 2) | Xạ Nhân (`h005`) | Xạ Nhân (`h005`) | Tiên Nữ (`h006`) |
| 4 | **Hồng Hài Nhi** | `h00C` | Huyền (Tier 2) | Thiên Binh (`h004`) | Thổ Hành Tôn (`h008`) | Quỷ Sai (`h003`) |
| 5 | **Lã Động Tân** | `h00D` | Huyền (Tier 2) | Thiên Lý Nhãn (`h001`) | Thuận Phong Nhĩ (`h002`) | Xạ Nhân (`h005`) |
| 6 | **Cự Linh Thần** | `h00E` | Huyền (Tier 2) | Thiên Binh (`h004`) | Thiên Binh (`h004`) | Quy Thừa Tướng (`h007`) |
| 7 | **Mẫu Đơn Tiên Tử** | `h00F` | Huyền (Tier 2) | Tiên Nữ (`h006`) | Tiên Nữ (`h006`) | Thiên Lý Nhãn (`h001`) |
| 8 | **Hà Bá** | `h00G` | Huyền (Tier 2) | Thiên Lý Nhãn (`h001`) | Thuận Phong Nhĩ (`h002`) | Quy Thừa Tướng (`h007`) |
| 9 | **Vô Thường** | `h00H` | Huyền (Tier 2) | Quỷ Sai (`h003`) | Quỷ Sai (`h003`) | Thiên Lý Nhãn (`h001`) |
| 10 | **Mạnh Bà** | `h00I` | Huyền (Tier 2) | Xạ Nhân (`h005`) | Tiên Nữ (`h006`) | Quỷ Sai (`h003`) |
| 11 | **Trư Bát Giới** | `h00J` | Siêu (Tier 3) | Cự Linh Thần (`h00E`) | Kim Tra (`h009`) | Mộc Tra (`h00A`) |
| 12 | **Sa Ngộ Tịnh** | `h00K` | Siêu (Tier 3) | Mẫu Đơn Tiên Tử (`h00F`) | Hà Bá (`h00G`) | Kim Tra (`h009`) |
| 13 | **Tiểu Bạch Long** | `h00L` | Siêu (Tier 3) | Vô Thường (`h00H`) | Thiết Phiến (`h00B`) | Mạnh Bà (`h00I`) |
| 14 | **Tinh Vệ** | `h00M` | Siêu (Tier 3) | Thiết Phiến (`h00B`) | Mẫu Đơn Tiên Tử (`h00F`) | Bảo Quả Tử (`h03P`) |
| 15 | **Chung Quỳ** | `h00N` | Siêu (Tier 3) | Vô Thường (`h00H`) | Lã Động Tân (`h00D`) | Hồng Hài Nhi (`h00C`) |
| 16 | **Phán Quan** | `h00O` | Siêu (Tier 3) | Mộc Tra (`h00A`) | Mạnh Bà (`h00I`) | Hồng Hài Nhi (`h00C`) |
| 17 | **Ngưu Ma Vương** | `h00P` | Siêu (Tier 3) | Hồng Hài Nhi (`h00C`) | Cự Linh Thần (`h00E`) | Hà Bá (`h00G`) |
| 18 | **Long Vương** | `h00Q` | Siêu (Tier 3) | Hà Bá (`h00G`) | Lã Động Tân (`h00D`) | Thiết Phiến (`h00B`) |
| 19 | **Tôn Ngộ Không** | `h00R` | Tiên (Tier 4) | Ngưu Ma Vương (`h00P`) | Trư Bát Giới (`h00J`) | Vô Thường (`h00H`) |
| 20 | **Đường Tăng** | `h00S` | Tiên (Tier 4) | Long Vương (`h00Q`) | Trầm Hương (`h03Q`) | Hồng Hài Nhi (`h00C`) |
| 21 | **Lôi Chấn Tử** | `h00T` | Tiên (Tier 4) | Chung Quỳ (`h00N`) | Tinh Vệ (`h00M`) | Nhiếp Tiểu Thiến (`h03O`) |
| 22 | **Dương Tiễn** | `h00U` | Tiên (Tier 4) | Phán Quan (`h00O`) | Ngưu Ma Vương (`h00P`) | Kim Tra (`h009`) |
| 23 | **Na Tra** | `h00V` | Tiên (Tier 4) | Phán Quan (`h00O`) | Long Vương (`h00Q`) | Mạnh Bà (`h00I`) |
| 24 | **Lý Tịnh** | `h00W` | Tiên (Tier 4) | Trư Bát Giới (`h00J`) | Trư Bát Giới (`h00J`) | Thuận Phong Nhĩ (`h002`) |
| 25 | **Đát Kỷ** | `h00X` | Tiên (Tier 4) | Tinh Vệ (`h00M`) | Tinh Vệ (`h00M`) | Tiên Nữ (`h006`) |
| 26 | **Ngũ Đạo Tướng Quân** | `h00Y` | Tiên (Tier 4) | Sa Ngộ Tịnh (`h00K`) | Chung Quỳ (`h00N`) | Thiết Phiến (`h00B`) |
| 27 | **Ứng Long** | `h00Z` | Tiên (Tier 4) | Tiểu Bạch Long (`h00L`) | Long Vương (`h00Q`) | Cự Linh Thần (`h00E`) |
| 28 | **Xích Tùng Tử** | `h010` | Tiên (Tier 4) | Sa Ngộ Tịnh (`h00K`) | Khổng Tước (`h03R`) | Lã Động Tân (`h00D`) |
| 29 | **Hình Thiên** | `h011` | Thánh (Tier 5) | Dương Tiễn (`h00U`) | Na Tra (`h00V`) | Chung Quỳ (`h00N`) |
| 30 | **Đấu Chiến Thắng Phật** | `h012` | Thánh (Tier 5) | Tôn Ngộ Không (`h00R`) | Tôn Ngộ Không (`h00R`) | Tiểu Bạch Long (`h00L`) |
| 31 | **Kim Thiền Tử** | `h013` | Thánh (Tier 5) | Đường Tăng (`h00S`) | Đường Tăng (`h00S`) | Tiểu Bạch Long (`h00L`) |
| 32 | **Thủy Mẫu** | `h014` | Thánh (Tier 5) | Lý Tịnh (`h00W`) | Lý Tịnh (`h00W`) | Mẫu Đơn Tiên Tử (`h00F`) |
| 33 | **Thái Bạch Kim Tinh** | `h015` | Thánh (Tier 5) | Xích Tùng Tử (`h010`) | Ngũ Đạo Tướng Quân (`h00Y`) | Trầm Hương (`h03Q`) |
| 34 | **Kim Sí Đại Bằng** | `h016` | Thánh (Tier 5) | Dương Tiễn (`h00U`) | Lôi Chấn Tử (`h00T`) | Long Vương (`h00Q`) |
| 35 | **Hậu Nghệ** | `h017` | Thánh (Tier 5) | Ứng Long (`h00Z`) | Na Tra (`h00V`) | Sa Ngộ Tịnh (`h00K`) |
| 36 | **Hằng Nga** | `h018` | Thánh (Tier 5) | Xích Tùng Tử (`h010`) | Đát Kỷ (`h00X`) | Phán Quan (`h00O`) |
| 37 | **Khương Tử Nha** | `h019` | Thánh (Tier 5) | Lôi Chấn Tử (`h00T`) | Đường Tăng (`h00S`) | Triệu Công Minh (`h03S`) |
| 38 | **Tây Vương Mẫu** | `h01A` | Thánh (Tier 5) | Đát Kỷ (`h00X`) | Ứng Long (`h00Z`) | Tinh Vệ (`h00M`) |
| 39 | **Bàn Cổ** | `h01B` | Thần (Tier 6) | Hình Thiên (`h011`) | Đấu Chiến Thắng Phật (`h012`) | Ngũ Đạo Tướng Quân (`h00Y`) |
| 40 | **Nữ Oa** | `h01C` | Thần (Tier 6) | Thái Bạch Kim Tinh (`h015`) | Hằng Nga (`h018`) | Na Tra (`h00V`) |
| 41 | **Phục Hy** | `h01D` | Thần (Tier 6) | Tây Vương Mẫu (`h01A`) | Hậu Nghệ (`h017`) | Lý Tịnh (`h00W`) |
| 42 | **Thần Nông** | `h01E` | Thần (Tier 6) | Thái Bạch Kim Tinh (`h015`) | Hằng Nga (`h018`) | Ứng Long (`h00Z`) |
| 43 | **Hiên Viên** | `h01F` | Thần (Tier 6) | Đấu Chiến Thắng Phật (`h012`) | Kim Sí Đại Bằng (`h016`) | Xích Tùng Tử (`h010`) |
| 44 | **Cộng Công** | `h01G` | Thần (Tier 6) | Kim Thiền Tử (`h013`) | Khương Tử Nha (`h019`) | Dương Tiễn (`h00U`) |
| 45 | **Chúc Dung** | `h01H` | Thần (Tier 6) | Kim Sí Đại Bằng (`h016`) | Hình Thiên (`h011`) | Tịnh Đàn Sứ Giả (`h03T`) |
| 46 | **Khoa Phụ** | `h01I` | Thần (Tier 6) | Thủy Mẫu (`h014`) | Thủy Mẫu (`h014`) | Ngưu Ma Vương (`h00P`) |
| 47 | **Hậu Thổ** | `h01J` | Thần (Tier 6) | Tây Vương Mẫu (`h01A`) | Điện Mẫu (`h03W`) | Tôn Ngộ Không (`h00R`) |
| 48 | **Chúc Long** | `h01K` | Thần (Tier 6) | Kim Thiền Tử (`h013`) | Khương Tử Nha (`h019`) | Bát Bộ Thiên Long (`h03V`) |
| 49 | **Nhiếp Tiểu Thiến** | `h03O` | Huyền (Tier 2) | Thuận Phong Nhĩ (`h002`) | Thuận Phong Nhĩ (`h002`) | Quỷ Sai (`h003`) |
| 50 | **Bảo Quả Tử** | `h03P` | Huyền (Tier 2) | Thiên Lý Nhãn (`h001`) | Tiên Nữ (`h006`) | Thổ Hành Tôn (`h008`) |
| 51 | **Trầm Hương** | `h03Q` | Siêu (Tier 3) | Bảo Quả Tử (`h03P`) | Lã Động Tân (`h00D`) | Mộc Tra (`h00A`) |
| 52 | **Khổng Tước** | `h03R` | Siêu (Tier 3) | Nhiếp Tiểu Thiến (`h03O`) | Mẫu Đơn Tiên Tử (`h00F`) | Mạnh Bà (`h00I`) |
| 53 | **Triệu Công Minh** | `h03S` | Siêu (Tier 3) | Bảo Quả Tử (`h03P`) | Cự Linh Thần (`h00E`) | Vô Thường (`h00H`) |
| 54 | **Tịnh Đàn Sứ Giả** | `h03T` | Tiên (Tier 4) | Trư Bát Giới (`h00J`) | Triệu Công Minh (`h03S`) | Kim Tra (`h009`) |
| 55 | **Kim Thân La Hán** | `h03U` | Tiên (Tier 4) | Sa Ngộ Tịnh (`h00K`) | Sa Ngộ Tịnh (`h00K`) | Nhiếp Tiểu Thiến (`h03O`) |
| 56 | **Bát Bộ Thiên Long** | `h03V` | Tiên (Tier 4) | Tiểu Bạch Long (`h00L`) | Trầm Hương (`h03Q`) | Hà Bá (`h00G`) |
| 57 | **Điện Mẫu** | `h03W` | Thánh (Tier 5) | Kim Thân La Hán (`h03U`) | Ứng Long (`h00Z`) | Khổng Tước (`h03R`) |
| 58 | **Phong Bá** | `h03X` | Thánh (Tier 5) | Bát Bộ Thiên Long (`h03V`) | Đát Kỷ (`h00X`) | Ngưu Ma Vương (`h00P`) |
| 59 | **Lục Nhĩ Mỹ Hầu** | `h03Y` | Thánh (Tier 5) | Tôn Ngộ Không (`h00R`) | Ngũ Đạo Tướng Quân (`h00Y`) | Triệu Công Minh (`h03S`) |
| 60 | **Tương Thần** | `h03Z` | Thần (Tier 6) | Lục Nhĩ Mỹ Hầu (`h03Y`) | Hình Thiên (`h011`) | Tịnh Đàn Sứ Giả (`h03T`) |
| 61 | **Trương Đạo Lăng** | `h040` | Thần (Tier 6) | Phong Bá (`h03X`) | Hậu Nghệ (`h017`) | Kim Thân La Hán (`h03U`) |
| 62 | **Phượng Hoàng** | `h041` | Thần (Tier 6) | Điện Mẫu (`h03W`) | Kim Sí Đại Bằng (`h016`) | Đát Kỷ (`h00X`) |

---

## 12. HƯỚNG DẪN PHÂN TÍCH, CÂN BẰNG & MÔ HÌNH HÓA CHO AI (AI MODELING & RESEARCH GUIDE)

Mục này cung cấp các hướng dẫn chuyên sâu cho các mô hình AI nghiên cứu game theory, tối ưu hóa tổ hợp và xây dựng bot chơi game tự động.

### 12.1. Không Gian Trạng Thái & Bài Toán Tối Ưu Tổ Hợp (Combinatorial Squad Optimization)
- **Ràng buộc bài toán:**
  - Sân đấu chỉ có đúng **5 ô triển khai** ($K = 5$).
  - Có tổng cộng **70 vị tướng** chia làm 6 Phẩm chất, 5 Vai trò, 5 Hệ.
  - Có **27 Tiên Duyên** (yêu cầu từ 2 đến 5 thành viên cụ thể).
  - Có **8 Trận Pháp** có thể chọn lựa.
- **Hàm mục tiêu (Objective Function):**
  Tìm tập hợp $S = \{h_1, h_2, h_3, h_4, h_5\} \subset \mathcal{H}$ sao cho tối đa hóa:
  $$\mathbf{Score}(S) = \text{TotalDPS}(S) \times \text{TotalEHP}(S) \times \big(1 + \sum \text{ActiveSynergies}(S)\big) \times \big(1 + \text{FormationBonus}\big)$$
  với điều kiện thỏa mãn bài toán kinh tế (chi phí triệu hồi và công thức ghép tướng khả thi trong thời gian giới hạn của đợt wave).

### 12.2. Đường Cong Tăng Trưởng Kinh Tế & Điểm Rơi Sức Mạnh (Power Spikes)
1. **Lũy Thừa Bậc Sao vs Trang Bị:**
   - Việc nâng một tướng lên Bậc 2 mang lại hệ số **$2.4\times$** cho cả Máu và Công (tương đương $+140\%$ sức mạnh tổng thể). Lên Bậc 3 mang lại hệ số **$5.76\times$**.
   - Tuy nhiên, để lên Bậc 2 cần 3 bản sao giống nhau. Chi phí Đạo Duyên cho nhiều lượt triệu hồi có thể làm chậm nhịp nâng cấp đội hình.
2. **Hiệu Suất Đầu Tư Linh Thạch (Gold Efficiency):**
   - Ưu tiên món phù hợp cơ chế tướng và chủ lực; cường hóa +0–10, phân giải đồ ở kho hoàn 50% đầu tư.

### 12.3. Chỉ Số Sống Sót Hiệu Dụng (Effective Health Points - EHP)
$$\mathbf{EHP} = \frac{\mathbf{MaxHP}}{1 - \text{DamageReduction}} = \mathbf{MaxHP} \times \left(1 + \frac{\mathbf{Armor} \times 5}{100}\right)$$
Khi tính toán giá trị chống chịu của các tướng Hộ Vệ (Guardian), AI cần tối ưu hóa tích số giữa MaxHP và Armor, kết hợp lớp Khiên ảo (`shield`) và Hộ giáp (`ward`).

### 12.4. Phụ bản

Phụ bản đã gỡ; không có chiến thuật hoặc lệnh tham gia phụ bản trong chế độ hiện tại.

### 12.5. Giao Thức Lệnh Cho Bot Tự Động (Command Interface)
Các bot AI có thể tương tác với Game Core thông qua hàm `handleCommand(state, playerId, command)` với các payload JSON chuẩn:
- Triệu hồi ngẫu nhiên: `{ type: 'summon' }`
- Triệu hồi gói khác: `{ type: 'summon', pack: 'tien' }` hoặc `pack: 'thien'`
- Chọn tướng sau khi gói thành công/rương mở: `{ type: 'choose-hero', heroId: 'h001' }`
- Đổi Linh Đan: `{ type: 'redeem', item: 'chest-1' }` hoặc `chest-2`, `embryo-3`, `embryo-4`
- Triển khai vào ô: `{ type: 'deploy', unitId: 'u1', slot: 0 }`
- Đưa về dự bị: `{ type: 'bench', unitId: 'u1' }`
- Hợp nhất ba bản sao: `{ type: 'merge', unitId: 'u1' }`
- Ghép theo công thức: `{ type: 'craft', heroId: 'h009' }`
- Bán tướng: `{ type: 'sell', unitId: 'u1' }`
- Kho đồ: `{ type: 'equip-item', itemId: 'g1', unitId: 'u1' }`; tháo/cường hóa/tẩy luyện/phân giải dùng `unequip-item`, `enhance-item`, `reroll-item`, `salvage-item` với `itemId`.
- Kích hoạt trận pháp: `{ type: 'formation', formation: 1 }`
- Nâng cấp trận pháp: `{ type: 'upgrade-formation', formation: 1 }`
- Ra lệnh quân: `{ type: 'order', unitIds: ['u1'], order: 'attack-move', x: 0, z: 10 }`
- Bấm gọi đợt sớm: `{ type: 'next-wave' }`

---
*Các bảng hồ sơ nhân vật phía trên giữ thông tin lịch sử; chỉ số runtime hiện tại đọc từ content/catalog.ts và module thiết kế tương ứng. Hệ thống đồ là thiết kế bản web. Chưa chạy benchmark/typecheck/test/build hoặc nghiệm thu bản mới.*
