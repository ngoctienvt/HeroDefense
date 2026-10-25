# Phase 3 — Định tuyến SFX đòn đánh/kỹ năng và giới hạn tiếng

## Mục tiêu

Mỗi event chiến đấu đi qua đúng một điểm quyết định cue. Bảng cue là dữ liệu, có thể test. Số tiếng phát cùng lúc có giới hạn để trận đông không bị ồn.

## File

- Mới: `apps/client/src/audio-cue-routing.ts`. Đây là hàm thuần, không đụng WebAudio:
  ```ts
  resolveCue(event: GameEvent, ctx: { sourceHero?: HeroDef; sourceEnemyRank?: EnemyRank; viewZone: number; eventZone?: number }): CueId | undefined
  ```
  Thứ tự ưu tiên, dừng ở bước đầu tiên khớp:
  1. Danh sách **tắt tiếng** (`SILENT_SKILLS`), ví dụ `peacock-poison-hit-h03R`.
  2. Override theo `skillId` (`SKILL_CUE_OVERRIDES`), ví dụ kỹ năng băng `freeze-h018` → `skill-ice`, kỹ năng sét → `skill-thunder`, `reflect-h009` → `skill-kim`.
  3. `ability === 'heal'` → `skill-heal`. `ability === 'shield'` → `skill-shield`.
  4. `kind === 'cast'` → `cast-charge`, kèm pitch theo nguyên tố.
  5. `kind === 'ability'` của tướng → `skill-<element>` theo `HeroDef.element` (Vô/Kim/Mộc/Thủy/Hỏa/Thổ).
  6. `kind === 'attack' | 'trait'` của tướng → cue theo `role`: warrior → slash, ranger → arrow, mage → bolt, guardian → blunt, support → chime.
  7. Event của quái: rank `boss` → `boss-hit`, rank khác → `enemy-hit`. Kỹ năng boss → `skill-tho` hoặc override riêng.
  8. `death`: quái → `death-enemy`, tướng → `death-hero`.
  9. Còn lại không phát tiếng.

  Lọc zone: chỉ phát khi `eventZone === viewZone`, trừ event của boss chung.
- Mới: `apps/client/src/audio-voice-limiter.ts`, cũng là logic thuần với đồng hồ được truyền vào:
  - Mỗi cue có `cooldownMs`: khoảng 45 ms cho tiếng đánh, 80 ms cho kỹ năng. Mỗi nhóm có giới hạn tiếng đồng thời: attack 6, enemy 4, skill 6, ui/wave 2. Tổng tối đa 14 tiếng.
  - Ưu tiên: boss/kỹ năng > đòn của tướng mình > đòn đồng đội > quái. Khi đầy, bỏ tiếng ưu tiên thấp và chỉ cắt tiếng cũ nếu tiếng mới ưu tiên cao hơn.
  - Đo theo thời gian thật (wall clock) chứ không theo thời gian trận, nên tốc độ 4× tự bị giới hạn.
  - Mỗi frame tối đa 8 cue mới, để tránh dội cả loạt tiếng khi quay lại tab hoặc sau reconnect.
  - Mỗi 10 giây log `audio.voices-dropped` nếu có tiếng bị bỏ.
- Mới: `apps/client/src/audio-sfx-player.ts`
  - Tải và `decodeAudioData` toàn bộ cue sau unlock.
  - Mỗi lần phát lệch ngẫu nhiên ±6% pitch (`playbackRate`) và ±10% gain.
  - Đánh thường để gain thấp hơn kỹ năng (khoảng .45 so với .8).
  - Cue lỗi hoặc chưa tải thì gọi fallback tổng hợp. Log `audio.load-failed` một lần cho mỗi cue.
- Sửa `apps/client/src/battlefield.ts`
  - Xóa toàn bộ khoảng 25 lời gọi `this.audio.play(event)`.
  - Thêm **một** lời gọi ngay sau bộ lọc `kind` ở đầu `handleEvent` (dòng ~898) và trước các nhánh return sớm.
  - Đưa ngoại lệ ở dòng 901 vào `SILENT_SKILLS`.
  - Thêm hàm `isOwnSource` để tính ưu tiên.

## Rà soát chuyển đổi (bắt buộc)

Lập bảng trong report: mỗi call site cũ (dòng, `skillId`/nhánh), trước đây có phát tiếng không, và giờ ra cue gì. Mục đích là không kỹ năng nào bị câm hoặc phát hai lần. Các nhánh `cataclysm-h01B`, `quake-h00E`, `reflect-h009` trước đây im lặng: chúng chỉ là dư chấn hoặc phản đòn của một chiêu đã có tiếng cast/ability, nên giữ im (đưa vào `SILENT_SKILLS`), trừ `reflect-h009` là tiếng chuông có hình riêng.

## Lưu ý

- Chỉ là trình bày. Không ảnh hưởng event, damage hay snapshot.
- Không phát tiếng cho event cũ đã bỏ qua lúc nhận snapshot đầu (logic `hasSnapshot` hiện có đã xử lý).
