# Phase 2 — Sinh đồ và rớt đồ

## File

- Mới `packages/game-core/src/gear-items.ts`: `gearRandom`, `rollGearItem`, `grantGearItem`, `onGearKillDrop`, `onWaveEndDrought`, `onDungeonGearReward`.
- Sửa `combat.ts`: nhánh quái chết trong `hurtEnemy` (khoảng dòng 85) gọi hook hạ quái.
- Sửa `simulation.ts`: `finishWave` gọi kiểm tra chống xui.
- Sửa `dungeons.ts`: khi thắng phụ bản, trao đồ cho người có quân trong phụ bản. Phải ghi danh sách người tham gia trước khi `returnUnit` đưa quân về.
- Sửa `state.ts`: khởi tạo `gear`, `gearDust`, `gearDrought` và `gearVersion` cho người chơi.

## Luật sinh đồ

1. Chọn khe ngẫu nhiên, mỗi khe 1/3.
2. Chọn phẩm theo bảng rớt của nguồn đồ.
3. Số dòng theo phẩm. Rút dòng không trùng từ bể của khe.
4. Giá trị dòng = `min + (max − min) × r^(1/q)`, nhân `levelScale`. `q ≥ 1` là hệ số chất lượng: q càng lớn thì giá trị càng nghiêng lên cao.
5. Món vàng rút thêm 1 dòng độc nhất từ danh sách của khe đó.
6. Cấp món bằng wave hiện tại. Trong phụ bản, cấp món là wave mở phụ bản đó.

## Bảng rớt

| Nguồn | Tỷ lệ | Phẩm | q |
|---|---|---|---|
| Quái thường | 1,4% mỗi con, cho chủ của tướng hạ nó | trắng `55−0,8w`, xanh 35, tím `9+0,5w`, vàng `1+0,3w` (w = wave) | 1 |
| Boss wave (kind `boss`, zone 0) | 100% cho chủ của tướng hạ nó | ít nhất xanh. Với i = wave/5: vàng `8+2,5i`, tím `40+2i`, xanh phần còn lại | `1 + 0,15i` |
| Phụ bản d (1–8) | 100%, mỗi người tham gia một món | ít nhất tím. Vàng `10% + 7% × (d−1)`. Từ phụ bản 5, món tím luôn có 4 dòng | `1,5 + 0,2d` |
| Chống xui | Hết wave mà người đó đã 3 wave liền không rớt gì | ít nhất xanh, phẩm theo bảng quái thường | 1 |

**Cách tính:**
- Số quái mỗi làn: wave 1–5 là 30/40/35/65/51 con (`horde-waves.ts`). Từ wave 6 là `min(30, 6 + floor(0,6w))` con (`simulation.ts`). Tổng khoảng 1.050 quái mỗi làn qua 45 wave, chưa tính Thanh Lang do boss gọi thêm.
- Kỳ vọng mỗi người, mức 45 wave:

| Nguồn | Số món | Món vàng |
|---|---|---|
| Hạ quái (1.050 × 1,4%) | ≈ 15, trong đó khoảng 3 món ở 5 wave đầu | ≈ 1 |
| Chống xui | ≈ 4–5 | — |
| Boss (9 con) | 9 | ≈ 1,9 (vàng 10,5%→30,5%) |
| Phụ bản (7 cái, nếu thắng hết) | 7 | ≈ 2,2 (vàng 10%→52%) |
| **Tổng** | **≈ 35** | **≈ 5** |

- Từ wave 6, mỗi wave chỉ khoảng 20–25 quái mỗi làn, kỳ vọng 0,3 món/wave. Chống xui 3 wave giữ nhịp nhận đồ đều đặn mà không thay thế nguồn rớt chính.
- Tối Thượng có nhiều wave và quái hơn nên khoảng 50 món. Chấp nhận được vì đây là độ khó cao nhất.

Đồ hạ bởi tướng triệu hồi tính cho chủ của tướng triệu hồi đó, theo `unit.owner`.

## Kho

Không giới hạn. Mọi món rớt đều vào kho.

## Event và log

- Event `reward` có `owner` và text dạng "Nhặt được [Tím] Thanh Phong Kiếm". Event chỉ báo tóm tắt, không gửi dữ liệu món; món đã có trong `player.gear` của snapshot.
- Ghi vào `state.gearStats` số món rớt theo phẩm và theo nguồn. Server log mỗi wave (phase 7).

## Test (`packages/game-core/test/gear-items.test.ts`)

- Cùng `gearSeed` thì cùng món. Rớt đồ không làm đổi giá trị `random(state)` của luồng chính.
- Số dòng đúng theo phẩm, dòng không trùng, giá trị nằm trong khoảng nhân hệ số cấp.
- Boss luôn rớt từ phẩm xanh trở lên. Phụ bản trao đúng một món cho mỗi người tham gia, không trao cho người không tham gia.
- Chống xui kích hoạt sau 3 wave trắng tay, không kích hoạt sớm hơn.
