# Phase 1 — Dữ liệu thiết kế và hợp đồng

## Mục đích

Chốt cấu trúc món đồ, bể dòng, số liệu và kiểu dữ liệu mạng trước khi viết logic.

## Hợp đồng (`packages/contracts/src/types.ts`)

- Thêm các kiểu sau:
  - `GearSlot = 'weapon' | 'armor' | 'talisman'`
  - `GearRarity = 'white' | 'blue' | 'purple' | 'gold'`
  - `GearStatId`: liệt kê ở bảng dưới
  - `GearUniqueId`: 17 dòng ở phase 5
- Thêm `GearItem`:
  ```ts
  {
    id: string;
    slot: GearSlot;
    rarity: GearRarity;
    level: number;               // wave lúc rớt
    enhance: number;             // 0–10
    rerolls: number;             // số lần đã tẩy luyện
    lines: { stat: GearStatId; value: number }[];
    unique?: GearUniqueId;
    unitId: string | null;       // tướng đang mặc; null là đang trong kho
    stacks?: number;             // Hấp Tinh Đại Pháp
    absorbedAttack?: number;     // Truyền Thừa Ấn
    absorbedHp?: number;         // Truyền Thừa Ấn
  }
  ```
- Thêm vào `Player`:
  - `gear: GearItem[]`
  - `gearDust: number` (Huyền Tinh, nguyên liệu tẩy luyện)
  - `gearDrought: number` (số wave liền không rớt)
  - `gearVersion: number` (tăng mỗi khi đồ đổi, để làm mới cache)
- **Xóa** `Unit.equipment`. Thêm `Unit.gearRuntime?` cho trạng thái chạy của dòng độc nhất: bộ đếm đòn, Âm/Dương, máu ghi lúc đầu wave, đã dùng Thời Quang chưa, máu khóa của Huyết Khế, linh hồn, quãng đường để lại vệt lửa, Nộ đã thấy, tia sét chờ.
- Thêm vào `GameState`:
  - `gearSeed?: number`
  - `gearTraps?: { ownerUnitId: string; zone: number; x: number; z: number; remaining: number }[]`
  - `gearStats?`: thống kê rớt đồ và kích hoạt dòng độc nhất theo wave, để server log rồi xóa
- `gearRuntime` cần thêm `hpSeen` và `shieldSeen` để tính phần giảm hồi máu của Huyết Khế.
- Thêm `owner?: string` vào `GameEvent`, để thông báo nhặt đồ chỉ hiện cho đúng người. Cần kiểm tra cách client đang hiển thị event `reward`/`info` trước khi dùng.
- `Command`:
  - **Xóa** `equip`.
  - Thêm `equip-item {itemId, unitId}`, `unequip-item {itemId}`, `enhance-item {itemId}`, `reroll-item {itemId}`, `salvage-item {itemId}`.
  - Thêm lệnh thử nghiệm `admin-item {slot?, rarity?, unique?}`.

## Dữ liệu (`content/gear-design.ts`)

Mọi số liệu dưới đây là đề xuất ban đầu, chỉnh lại ở phase 7.

**Hệ số theo cấp món:** `levelScale = 0.5 + 0.5 × min(1.2, level / 45)`. Món wave 1 khoảng ×0,51, wave 45 là ×1,0, wave 60 (Tối Thượng) là ×1,1.

**Cường hóa:** nhân `1 + 0.06 × enhance` lên chỉ số nền và các dòng dạng số thực. Ở +10 là ×1,6. Dòng số nguyên (giới hạn chặn) không tăng theo cường hóa. Dòng +1 lần nảy và +1 tia tạm bỏ theo quyết định ngày 20-10-2026.

**Chỉ số nền theo khe** (trước hệ số cấp và cường hóa):

| Khe | Nền |
|---|---|
| Vũ khí | +40% Công |
| Giáp | +45% Máu, +6 Giáp |
| Pháp khí | +8% tốc đánh, +20% sát thương kỹ năng |

Ví dụ: vũ khí wave 45 cường hóa +10 có nền +64% Công. Để so sánh, hệ cũ ở cấp tối đa cho +110% Công.

**Bể dòng:** giá trị roll trong khoảng `[min, max]` ở hệ số cấp 1,0.

| Khe | Dòng | Khoảng | Loại |
|---|---|---|---|
| Vũ khí | % Công | 6–20 | chung |
| | % tỷ lệ chí mạng | 4–12 | chung |
| | % sát thương chí mạng | 15–45 | chung |
| | % xuyên Giáp | 8–25 | chung |
| | % sát thương lên Boss | 8–30 | chung |
| | % sát thương lên mục tiêu dưới 30% Máu | 10–35 | chung |
| | % hút máu | 2–6 | chung |
| | % độ dài đòn xuyên | 15–40 | cơ chế: xuyên, khứ hồi |
| | % bán kính chém quét | 10–30 | cơ chế: chém quét |
| Giáp | % Máu | 8–25 | chung |
| | Giáp | 3–10 | chung |
| | % giảm sát thương nhận | 3–10 | chung |
| | % Máu hồi mỗi giây | 0,2–0,8 | chung |
| | % giảm thời gian hồi sinh | 10–35 | chung |
| | Khiên đầu wave theo % Máu | 8–25 | chung |
| | % phản sát thương cận chiến | 8–25 | chung |
| | + giới hạn chặn | 2–5 | cơ chế: tướng có chặn quái |
| Pháp khí | % tốc đánh | 5–15 | chung |
| | % sát thương kỹ năng | 8–25 | chung |
| | % giảm hồi chiêu | 5–15 | cơ chế: tướng dùng hồi chiêu |
| | % Nộ nhận vào | 10–30 | cơ chế: tướng dùng Nộ |
| | % thời gian bỏng, độc, chậm, phá giáp | 15–40 | chung |
| | % sát thương bỏng và độc | 15–40 | chung |
| | % thời gian tồn tại đơn vị triệu hồi | 20–50 | cơ chế: tướng triệu hồi |

Một món không có hai dòng trùng loại.

**Thu nhập Linh Thạch cả trận** (tính từ `simulation.ts` và `dungeons.ts`):

| Độ khó | Ban đầu | Thưởng wave `180 + 40w` | Phụ bản `350 + 100d` | Tổng |
|---|---|---|---|---|
| Bình thường / Ác Mộng / Địa Ngục (45 wave, 7 phụ bản) | 500 | 49.500 | 5.250 | ≈ 55.000 |
| Tối Thượng (60 wave, 8 phụ bản) | 500 | 84.000 | 6.400 | ≈ 91.000 |

Linh Thạch hiện chỉ dùng cho trang bị. Hệ cũ cần 13.200 cho một tướng tối đa, tức 66.000 cho 5 tướng, vượt thu nhập.

**Giá:**
- Cường hóa từ +k lên +k+1: `15 × (k+1)²` Linh Thạch, từ 15 cho +1 tới 1.500 cho +10.
  - Một món lên +10 tốn tổng 5.775.
  - Nâng cả 15 món đang mặc lên +10 tốn 86.600, gấp 1,6 lần thu nhập 45 wave và xấp xỉ thu nhập Tối Thượng.
  - Nghĩa là ở 45 wave người chơi phải chọn món để nâng (đủ khoảng 9 món +10, hoặc cả 15 món khoảng +8). Món nhặt đầu trận nâng rẻ, và phân giải hoàn 50% nên thay đồ không quá đau.
- Tẩy luyện: `2 + rerolls` Huyền Tinh và `50 × (rerolls+1)` Linh Thạch.
- Phân giải: trắng 1, xanh 2, tím 5, vàng 12 Huyền Tinh, cộng hoàn 50% Linh Thạch đã cường hóa.

**Kho:** không giới hạn số lượng. Người chơi tự phân giải đồ thừa.

## Hàm dùng chung

Đặt trong `content/gear-design.ts`, client và test dùng chung:
- `formatGearLine(line, enhance)` và `gearItemName(item)`. Tên ghép theo khe và phẩm, ví dụ "Thanh Phong Kiếm".
- `gearLineFits(stat, heroId)`: trả về đúng/sai/trung lập cho dòng theo cơ chế. Dùng chung cho gameplay và hiển thị.

## Kiểm tra

Đọc lại cho khớp strict TypeScript. Chưa chạy typecheck. Sẽ có lỗi biên dịch ở các chỗ dùng `equipment` cho tới khi xong phase 3–4.


## Triển khai 28-10-2026

Hợp đồng và dữ liệu: 23 dòng thường, 17 độc nhất; bỏ Unit.equipment, dùng kho riêng và RNG gearSeed. Cấp đồ theo 20 wave, cường hóa 3×(k+1)^2; chỉ số chặn đã bỏ.

- [x] Hoàn tất thay đổi nguồn của phase; đã rà tĩnh, chưa chạy kiểm thử.
