---
phase: 01
title: "Khung dữ liệu và runtime duyên phận"
status: implemented-unverified
effort: 8h
dependsOn: []
---

# Phase 01 — Khung dữ liệu và runtime

## Liên kết

- Thiết kế: [design-261028-1330-duyen-phan-redesign.md](../reports/design-261028-1330-duyen-phan-redesign.md)
- Tính duyên phận hiện tại: `packages/game-core/src/stats.ts` (`bonuses`, `refreshStats`)
- Mods trang bị: `packages/game-core/src/gear-stats.ts` (`gearModsOf`, cache theo `gearVersion`)
- Mẫu thư mục handler: `packages/game-core/src/boss-kits/`

## Tổng quan

Dựng dữ liệu, trạng thái và event bus cho duyên phận, đồng thời bỏ buff phẳng cũ. Sau phase này game chạy được, duyên phận vẫn được đếm nhưng chưa có hiệu ứng (trừ Duyên Tụ).

## Hiện trạng đã kiểm

- `refreshStats` đếm `heroId` duy nhất có `slot >= 0` và ghi `player.activeSynergies = { id, count, level }[]`.
- `bonuses()` cộng `SynergyDef.bonus × amount × level`. Người dùng là `stats.ts` (Công, Máu, giáp, tốc đánh tại dòng 78) và `combat.ts:1015` (hồi máu).
- Các hook cần có:
  - Quái chết: `combat.ts` khoảng dòng 100, trong `hurtEnemy` (`recordEnemyDeath`, `unit.kills++`).
  - Tướng tử trận: `combat.ts` khoảng dòng 270 (`recordHeroDeath`, đặt `respawn`).
  - Đầu wave: `simulation.ts` `beginWave` (dòng 47).
  - Cuối wave: `simulation.ts` `finishWave` (dòng 176).
  - Thi triển: `combat.ts` `castAbility` (dòng 305), có windup qua `pendingAbility` cho tướng bậc 3–4 và nhóm `WINDUP_HEROES`.
- Ngẫu nhiên có kiểm soát: `crowd-control.ts` `controlRandom(state)`.

## Yêu cầu

**Chức năng**

- `content/bond-design.ts` chứa định nghĩa hiệu ứng của 27 duyên phận, khóa theo `SynergyDef.id`:
  - `tiers`: mốc → văn bản hiển thị + danh sách hiệu ứng.
  - Loại hiệu ứng: `member-stats` / `team-stats` (`Partial<Record<GearStatId, number>>`), `flag` (`extra-targets`, `double-strike`), `hook` (tên handler).
  - `provenance: 'adapted' | 'original'`.
  - Hằng số nháp tập trung một chỗ, gồm mốc Kiếp Nạn và tham số Duyên Tụ.
- Thành viên và ngưỡng vẫn đọc từ `SYNERGIES` của catalog; `bond-design.ts` chỉ thêm hiệu ứng. Một test kiểm tra mọi id đều có mục tương ứng.
- Bỏ cộng buff duyên phận trong `bonuses()`; trận pháp giữ nguyên.
- `Player.bondState` trong contracts, khởi tạo ở `state.ts`:
  - Bộ đếm theo wave: `souls`, `longUy`, `thanVi`, `tamTai`.
  - Bộ đếm theo trận: `kiep`, `dienHai`.
  - Cờ "một lần mỗi wave" theo `unitId`.
  - Bộ đếm theo trận phải giữ nguyên khi tướng bị ghép hoặc bán.
- `bond-runtime.ts`:
  - `refreshBonds(state, owner)` được gọi từ `refreshStats`.
  - Các hàm phát sự kiện: `bondOnCast`, `bondOnKill`, `bondOnHeroDeath`, `bondOnWaveStart`, `bondOnWaveClear`, `bondOnHeal`, `bondOnShield`. Mỗi hàm chỉ gọi handler của duyên phận đang kích hoạt của chủ sở hữu.
- `packages/game-core/src/bonds/index.ts`: bảng `id → handler`. Mỗi duyên phận một file `bonds/<ten-duyen-phan>.ts`, được thêm dần từ phase 03.
- Mods duyên phận cộng vào `gearModsOf`:
  - Thêm `bondVersion` vào Player, tăng mỗi lần `refreshBonds` đổi kết quả.
  - Khóa cache gồm cả `bondVersion`.
- Helper dùng chung:
  - `forceCast(state, unit, targetId?)`: thi triển ngay kỹ năng có sẵn mà không cần Nộ hay chờ hồi chiêu, không làm mất Nộ hay hồi chiêu hiện có, đi qua windup bình thường. Có cờ `bondTriggered` để handler không kích lại chính duyên phận đó (chặn đệ quy).
  - `grantShield(state, source, target, amount)` cho các call site của tướng thuộc duyên phận cần hook khiên (Kim Tra, Cự Linh Thần, Lý Tịnh, Triệu Công Minh, Thủy Mẫu, Hằng Nga, Xích Tùng Tử). Đổi các call site đó sang helper; giữ nguyên số liệu.
  - Hồi máu đi qua `healAlly` (`ally-scaled-support.ts`), thêm tham số `source` để phát `bondOnHeal`.
- **Duyên Tụ:** trong `refreshBonds`, tướng thuộc ≥ 2 duyên phận đang kích hoạt nhận mods `rage-gain` +10% (tướng dùng hồi chiêu nhận `cooldown-reduction` tương đương), và +15 Nộ khi `bondOnWaveStart`. Không giới hạn số duyên phận.
- Bản sao và đơn vị triệu hồi (`summonDuration !== undefined`) không tính vào mốc, không nhận hiệu ứng thành viên trừ khi handler chỉ định rõ.

**Phi chức năng**

- TypeScript `strict`. Không ép kiểu để che dữ liệu thiếu.
- Log debug `bond.refresh` (owner id dạng nội bộ, danh sách `{id, level}`), không ghi tên người chơi.
- Không thêm lệnh mạng mới; server validation không đổi.

## Kiến trúc

```
refreshStats ──► refreshBonds ──► activeSynergies + bondVersion + Duyên Tụ
                                      │
gearModsOf ◄── bondMods(unit) ◄───────┘

combat / simulation hooks ──► bond-runtime.emit ──► bonds/<id>.ts handler
                                                   └─► helper có sẵn (status, castAbility, summon, heal, shield)
                                                   └─► event('bond-trigger')
```

## File liên quan

**Tạo mới**

- `content/bond-design.ts`
- `packages/game-core/src/bond-runtime.ts`
- `packages/game-core/src/bonds/index.ts`
- `packages/game-core/test/bond-runtime.test.ts`

**Sửa**

- `packages/contracts/src/types.ts`: `Player.bondState`, `bondVersion`, event kind `bond-trigger`.
- `packages/game-core/src/state.ts`: khởi tạo `bondState`.
- `packages/game-core/src/stats.ts`: bỏ buff phẳng, gọi `refreshBonds`.
- `packages/game-core/src/gear-stats.ts`: cộng mods duyên phận, khóa cache.
- `packages/game-core/src/combat.ts`: hook quái chết, tướng tử trận, `castAbility`; hồi máu theo `bonuses().regen` chỉ còn trận pháp.
- `packages/game-core/src/simulation.ts`: hook `beginWave` và `finishWave`.
- `packages/game-core/src/wave-reset.ts`: reset bộ đếm theo wave và cờ một lần mỗi wave.
- `packages/game-core/src/ally-scaled-support.ts`: `healAlly` nhận `source`.
- Call site tạo khiên của các tướng liệt kê ở trên.

## Các bước

1. Viết kiểu dữ liệu trong `bond-design.ts` cùng 27 mục rỗng (chỉ có văn bản mốc từ thiết kế), và test đối chiếu id với `SYNERGIES`.
2. Thêm `bondState`, `bondVersion` và event kind vào contracts; khởi tạo trong `state.ts`.
3. Viết `bond-runtime.ts` với `refreshBonds`, `bondMods` và các hàm emit; nối vào `refreshStats`.
4. Bỏ buff phẳng trong `bonuses()`; rà mọi người gọi `bonuses()`.
5. Cộng `bondMods` vào `gearModsOf` và mở rộng khóa cache.
6. Gắn hook vào `combat.ts`, `simulation.ts`, `wave-reset.ts`.
7. Viết `forceCast` với cờ chặn đệ quy.
8. Viết `grantShield` và tham số `source` cho `healAlly`; đổi call site của các tướng liệt kê.
9. Cài Duyên Tụ.
10. Viết test (danh sách bên dưới).

## Test (agent viết, người dùng chạy)

- Đếm mốc theo tướng duy nhất; bản sao và đơn vị triệu hồi không cộng.
- `bonuses()` không còn chứa buff duyên phận.
- `gearModsOf` trả mods mới sau khi đội hình đổi (cache được làm mới).
- Bộ đếm theo trận giữ nguyên sau `craft` và `sell`; bộ đếm theo wave reset ở `beginWave`.
- `forceCast` không tiêu Nộ hay hồi chiêu và không kích lại chính duyên phận.
- Duyên Tụ áp cho tướng thuộc 2 duyên phận, không áp cho tướng thuộc 1.

## Kiểm tra của người dùng

- `npm run typecheck`, `npm test`.
- `start-game.cmd`, Ctrl+F5: triển khai Kim Tra + Mộc Tra, thấy duyên phận vẫn được đếm trong bảng và chỉ số tướng không còn +8%.

## Rủi ro

- `forceCast` gặp tướng windup đang có `pendingAbility` sẽ bị từ chối; handler phải chấp nhận việc thi triển thất bại.
- Client cũng gọi `gearModsOf` trên snapshot; `bondVersion` phải có trong snapshot (phase 02).

## Hoàn tác

Khôi phục `bonuses()` và bỏ phần cộng mods trong `gearModsOf`; các hook không có handler thì không làm gì.

## Ghi chú triển khai (2026-10-28)

Đã viết mã; chưa có kết quả typecheck/test (agent không chạy). Khác với plan:

- `bondOnWaveStart` reset bộ đếm theo wave (không đặt trong `wave-reset.ts`, vì file đó chạy ở `finishWave`).
- `bondOnCast` kích khi kỹ năng **được giải quyết** (kể cả sau windup). Cờ `pendingAbility.bondTriggered` mang theo cú thi triển cưỡng bức; cú thi triển có cờ này **không** phát lại `onCast` cho bất kỳ duyên phận nào.
- `forceCast` nằm ở `bond-cast.ts` (tránh vòng import `combat` ↔ `bond-runtime`).
- Bond rolls dùng `state.bondSeed` riêng, không đụng `controlSeed`.
- `grantShield` **chưa** viết: chỉ có thông báo `bondOnShield` (Kim Tra, Cự Linh Thần, Lý Tịnh, Thủy Mẫu qua nhánh shield chung; Triệu Công Minh, Xích Tùng Tử, Hằng Nga) và `bondOnHeal` qua tham số `{ state, source }` của `healAlly`. Hook sửa lượng khiên/hồi (Kim Tra mốc 3 và Lưỡng Tình ở phase 03, Mẫu Nghi ở phase 04) là bước đầu tiên của phase 03, thêm vào chính các điểm thông báo này.
- `forceCast` hoàn trả Nộ/hồi chiêu cả ở lúc bắt đầu windup lẫn lúc kỹ năng giải quyết (wrapper `resolveAbility`).
- Handler từ phase 03 cần bỏ qua khi `state.phase === 'lobby'` (cast luyện tập trong sảnh vẫn phát `onCast`).
- `bondOnHeroDeath` chạy sau khi đặt trạng thái chết, trước event `death`, để handler hồi sinh có thể hoàn tác.
- Duyên Tụ: chỉ tướng dùng Nộ nhận +15 Nộ đầu wave (tướng dùng hồi chiêu bắt đầu wave với hồi chiêu 0).
- Hợp đồng thêm: `Player.bondState`, `Player.bondVersion`, `GameEvent.bondId`, kind `bond-trigger`, `pendingAbility.bondTriggered`, `GameState.bondSeed`.
