# Phase 4 — Chỉ số dòng chung và dòng theo cơ chế

## Tổng hợp chỉ số (`packages/game-core/src/gear-stats.ts`)

- `gearModsOf(state, unit)` gộp chỉ số nền, các dòng, cường hóa và danh sách dòng độc nhất của các món đang mặc. Kết quả cache trong `WeakMap<Unit, …>`, khóa theo `player.gearVersion` và `heroId`. Đơn vị không mặc gì thì trả về object rỗng dùng chung để thoát nhanh.
- `peekGearMods(unit)` đọc cache mà không cần `state`, cho các helper không nhận `state` như `applyEnemyStatus`. `refreshStats` luôn làm mới cache.
- `abilityCooldownFor(unit, base, state?)` thay cho công thức hồi chiêu cũ. Client truyền `state` để tự tính.
- Dòng theo cơ chế chỉ được cộng khi `gearLineFits` trả về đúng. Nếu không, dòng hiện mờ trên UI và không có tác dụng.

## Điểm gắn từng dòng

| Dòng | Gắn vào |
|---|---|
| % Công, % Máu, Giáp | `refreshStats` |
| % tốc đánh | `attackInterval` |
| Chí mạng (tỷ lệ, sát thương) | Bộ bọc `hurt` của đòn thường trong `combatStep` (`combat.ts:1031`). Đây là một lần roll chí mạng chung cho mọi tướng, áp cho từng mục tiêu trúng. Hệ số gốc ×1,5 cộng dòng sát thương chí mạng. Đi qua `criticalDamageAgainst`. |
| Hút máu | Bộ bọc `hurt` của đòn thường |
| % xuyên Giáp, % sát thương Boss, % sát thương mục tiêu dưới 30% Máu | `hurtEnemy`, áp mọi sát thương do tướng gây ra trừ phần chia sẻ Nhân Quả |
| % sát thương kỹ năng | `skillDamageMultiplier` trong `stats.ts` |
| % giảm sát thương nhận, % phản sát thương cận chiến | `hurtUnit` |
| % Máu hồi mỗi giây | Vòng tướng trong `combatStep`, cạnh `bonus.regen` |
| % giảm thời gian hồi sinh | Nhánh tướng chết trong `hurtUnit` |
| Khiên đầu wave | `beginWave` trong `simulation.ts` |
| % giảm hồi chiêu | `abilityCooldownFor` |
| % Nộ nhận vào | **Một điểm chung** (đã chốt): bước gear mỗi tick so `energy` với `gearRuntime.energySeen`, cộng thêm phần tăng dương × hệ số, chặn ở `maxEnergy`. Không sửa hơn 30 chỗ đang cộng Nộ. Khi Nộ bị đặt về 0 lúc tung chiêu thì chỉ cập nhật `energySeen`. |
| % thời gian và sát thương bỏng/độc | Đầu vòng quái trong `combatStep`: object `burn`/`poison` mới (chưa có trong `WeakSet`) được nhân thời gian và DPS theo đồ của `casterId`. Nhiều module tạo lại object mỗi đòn, nên luật này áp đúng cho từng lần gây trạng thái. |
| % thời gian chậm, phá giáp | `applyEnemyStatus` qua `peekGearMods(caster)` |
| % thời gian triệu hồi | Bước gear: đơn vị có `summonerId` lần đầu được thấy thì nhân `summonDuration`. Nếu đơn vị triệu hồi chưa ghi `summonerId` thì phải bổ sung ở module tạo ra nó. |
| + giới hạn chặn | `baseBlockCap` trong `combat.ts`, chỉ khi giới hạn gốc > 0 |
| % độ dài đòn xuyên | Nhánh `linear_pierce` và `boomerang` |
| % bán kính chém quét | Nhánh `frontal_cleave` |

## `gearLineFits`

- Xuyên và chém quét: dựa vào `attackGeometry.type` của tướng. Có 25 tướng tự cài đòn thường trong `executeAttackGeometry` (`h01B`, `h011`, `h012`, …); với nhóm này dòng tính là không hợp, vì độ dài và bán kính nằm trong module riêng của từng tướng.
- Giảm hồi chiêu: tướng có kỹ năng và `energyType === 'cooldown'`.
- % Nộ: `energyType` là `rage_on_attack` hoặc `rage_on_hit`.
- Giới hạn chặn: vai `guardian` hoặc `warrior`, hoặc `block > 0`.
- Thời gian triệu hồi: danh sách tướng có triệu hồi (h012, h01E, h03Z, h03P, tướng tạo `monkey-clone`), lấy từ code khi làm.
- Các dòng còn lại tính là chung.

## Rủi ro

- Hiệu năng: `hurtEnemy` chạy rất nhiều lần. `gearModsOf` phải O(1) khi cache còn đúng.
- Chí mạng chung có thể cộng dồn với chí mạng riêng của tướng, khiến tướng chí mạng vốn đã mạnh còn mạnh hơn. Theo dõi trong benchmark.
- Cách gắn qua `WeakSet`/`WeakMap` không nằm trong snapshot. Server giữ object sống nên vẫn đúng. Test nào clone state thì phải gọi `refreshStats` trước.
