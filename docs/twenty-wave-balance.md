# Cân bằng 20 vòng, đầu lĩnh và boss mượn tướng

Tài liệu mô tả đường cân bằng tham chiếu (`A_ref`, `H_ref`, `PRESSURE`), hệ số chỉnh toàn cục `BALANCE_SCALE`, cấu trúc 20 vòng (`WAVE_PLANS`), bộ chạy kỹ năng quái/boss và quy trình đọc log `combat.ttk`.

## 1. Đường tham chiếu và công thức chỉ số (`packages/game-core/src/balance-curve.ts`)

Mọi độ khó có đúng **20 vòng** (`RUN_WAVES = 20`), chia làm 4 hồi (Act 1: vòng 1–5, Act 2: vòng 6–10, Act 3: vòng 11–15, Act 4: vòng 16–20). Hệ số độ khó (`hpMultiplier`, `attackMultiplier`) từ `content/catalog.ts` giữ nguyên.

### Biến tham chiếu theo vòng `w ∈ [1..20]`
- **`A_REF[w]`**: Sát thương đòn đánh thường tham chiếu của 1 tướng chủ lực ở vòng `w`.
- **`H_REF[w]`**: Máu tham chiếu của tướng tiền tuyến ở vòng `w`.
- **`PRESSURE[w]` (`R(w)`)**: Chỉ số áp lực tăng nghiêm ngặt từ `0.80` (vòng 1) đến `1.40` (vòng 20).

### Công thức Máu & Công theo phân hạng (`EnemyRank`)
- **Quái thường (`minion`)**:
  - Chết sau khoảng **10–15 đòn đánh thường** (hoặc 2–3 kỹ năng):
  - `minionHp(w, armor, hpScale, diffHp) = round(12 * A_REF[w] * (100 / (100 + armor * 5)) * hpScale * diffHp * BALANCE_SCALE.hp)`
  - `minionAttack(w, atkScale, diffAtk) = round((H_REF[w] / 18) * PRESSURE[w] * atkScale * diffAtk * BALANCE_SCALE.attack)`
- **Tinh anh (`elite`, cỡ `1.1×`)**:
  - `eliteHp = round(minionHp * 2.2)`
  - `eliteAttack = round(minionAttack * 1.35)`
- **Đầu lĩnh (`chieftain`, cỡ `1.25×`, xuất hiện ở 40% thời lượng vòng thường)**:
  - `chieftainHp = round(minionHp * 4.0)`
  - `chieftainAttack = round(minionAttack * 1.65)`
- **Boss (`boss`, cỡ `1.5×`, chung cho cả phòng ở đường giữa vào vòng 5/10/15/20)**:
  - Hệ số co-op: `partyBossFactor(players) = 1 + 0.75 * (players - 1)` (`1.0 / 1.75 / 2.50 / 3.25` cho 1–4 người).
  - `bossHp = round(150 * A_REF[w] * hpScale * partyBossFactor(players) * diffHp * BALANCE_SCALE.bossHp)`
  - `bossAttack = round((H_REF[w] / 6.5) * PRESSURE[w] * atkScale * diffAtk * BALANCE_SCALE.bossAttack)`

## 2. Cấu trúc nhịp trong mỗi vòng (`packages/game-core/src/wave-plan.ts`)

1. **0% – 40%**: Các hàng quái thường/tinh anh xuất hiện theo từng làn của người chơi (tối đa 5 con/hàng, chờ thông cổng khi cửa sinh còn đông).
2. **40% (`chieftainAtFraction = 0.4`)**: Đầu lĩnh xuất hiện ở từng làn trong các vòng thường (vòng 2–4, 6–9, 11–14, 16–19).
3. **70% (`surgeAtFraction = 0.7`)**: Đợt dồn (`surgePacks`) tăng nhịp độ cuối vòng.
4. **Vòng Boss (5, 10, 15, 20)**:
   - Một encounter boss chung (`owner: 'party'`) xuất hiện tại `BOSS_SPAWN = { x: 0, z: -22 }` và đi dọc đường giữa về Linh Trụ, trong khi các làn vẫn có quái hộ tống.
   - **Vòng 5**: Hắc Phong Sơn Chủ (`b001`, kit `hac-phong`) — Vạn Quân Hộ Thể + Đại Địa Chấn Động + gọi 6 Thanh Lang.
   - **Vòng 10**: Song Ma Hỏa Phong — Ngưu Ma Vương (`h00P`, kit `nguu-ma`) & Thiết Phiến Công Chúa (`h00B`, kit `thiet-phien`), nội tại **Phu Thê Đồng Tâm** (một bên ngất thì bên còn lại Cuồng Nộ +35% Công, +30% tốc đánh và hồi đầy hồi chiêu).
   - **Vòng 15**: Hình Thiên Ma Thần (`h011`, kit `hinh-thien`) — Hình Thiên Đoạt Mệnh Trảm + Huyết Thuẫn Xung Kích + Bất Khuất Cuồng Hống, nội tại **Vô Đầu Bất Tử** khi máu xuống dưới 40%.
   - **Vòng 20**: Thủy Hỏa Đại Kiếp — Chúc Dung (`h01H`, kit `chuc-dung`) & Cộng Công (`h01G`, kit `cong-cong`), nội tại **Thủy Hỏa Tương Nghi** khi một thần ngã xuống.

## 3. Mẫu kỹ năng đầu lĩnh (`packages/game-core/src/enemy-skill-templates.ts`)

| Mẫu | Tên kỹ năng | Hình học báo trước | Tác động |
|---|---|---|---|
| `A` | Nện Đất (`enemy-slam`) | `circle` R3.5, windup 0.75s | 165% Công + làm chậm 35% (2s) |
| `A+` | Nện Đất Cường Hóa (`enemy-heavy-slam`) | `circle` R4.2, windup 0.8s | 210% Công + choáng 0.8s + làm chậm 45% (2.5s) |
| `B` | Mũi Kích Xuyên Phá (`enemy-pierce`) | `line` 9.0×2.2, windup 0.7s | 175% Công + phá 25% Giáp (3s) |
| `C` | Lao Đập (`enemy-leap`) | `circle` R3.2, windup 0.75s | Nhảy tới mục tiêu xa nhất, 160% Công + làm chậm 35% |
| `C+` | Lao Đập Cường Hóa (`enemy-heavy-leap`) | `circle` R3.8, windup 0.8s | Nhảy tới mục tiêu xa nhất, 205% Công + đẩy lùi + làm chậm 45% |
| `D` | Chiến Hống Hộ Quân (`enemy-warcry`) | `circle` R6.0, windup 0.6s | Khiên 18% HP tối đa + tăng 6 Giáp & 25% tốc chạy cho quái quanh thân (4s) |

## 4. Đọc log `combat.ttk` và tinh chỉnh (`packages/game-core/src/combat-ttk-telemetry.ts`)

Cuối mỗi vòng (hoặc khi trận kết thúc), server ghi một dòng log JSON với sự kiện `combat.ttk`:

```json
{
  "wave": 6,
  "difficulty": "normal",
  "players": 2,
  "durationSec": 48.2,
  "leaks": 0,
  "heroDeaths": 1,
  "bossKillSec": null,
  "archetypes": [
    {
      "archetypeId": "w06_infantry",
      "rank": "minion",
      "kills": 40,
      "avgHitsToKill": 12.4,
      "avgNormalHitsToKill": 10.8,
      "avgSkillHitsToKill": 1.6,
      "avgTimeAliveSec": 9.1
    }
  ]
}
```

### Quy trình chỉnh nhanh với `BALANCE_SCALE`
- Nếu `avgNormalHitsToKill` của `minion` trung bình **< 10 đòn**: tăng `BALANCE_SCALE.hp` (ví dụ `1.1` – `1.15`).
- Nếu `avgNormalHitsToKill` của `minion` trung bình **> 15 đòn**: giảm `BALANCE_SCALE.hp` (ví dụ `0.88` – `0.92`).
- Nếu `heroDeaths` quá cao ở các vòng thường: giảm `BALANCE_SCALE.attack`.
- Nếu `bossKillSec` quá nhanh (< 15s) hoặc quá lâu (> 65s): chỉnh `BALANCE_SCALE.bossHp` và `BALANCE_SCALE.bossAttack` trong `packages/game-core/src/balance-curve.ts`.
