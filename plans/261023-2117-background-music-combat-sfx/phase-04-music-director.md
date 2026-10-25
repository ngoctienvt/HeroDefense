# Phase 4 — Bộ điều khiển nhạc nền

## Mục tiêu

Nhạc nền đổi theo trạng thái trận, crossfade mượt, không tải lại file khi trạng thái không đổi.

## File

- Mới: `apps/client/src/audio-music-director.ts`
  - Hàm thuần `pickMusic(phase, hasBoss): MusicId | 'silence'`:
    - `lobby` / `preparation` → `music-calm`
    - `combat` không có boss → `music-battle`
    - `combat` có enemy rank `boss` còn sống → `music-boss`
    - `won` / `lost` → phát một lần `sting-win` / `sting-lose`, sau đó im lặng
  - Class `MusicDirector`
    - Hai `HTMLAudioElement` (A/B), mỗi cái nối `MediaElementAudioSourceNode` → gain riêng → `musicGain`. Chúng thay phiên nhau để crossfade 1,5 giây bằng `linearRampToValueAtTime`.
    - Track lặp đặt `loop = true`. Stinger không lặp.
    - Chỉ đổi khi `pickMusic` ra kết quả khác lần trước. Cần hysteresis khoảng 2 giây cho boss→battle để boss chết rồi hồi sinh ngay không làm nhạc giật qua lại.
    - Lỗi `play()` (autoplay chưa mở hoặc file 404) thì log `audio.music-failed` rồi giữ im lặng, không ném lỗi.
    - Khi tắt âm thanh thì pause cả hai element, khi bật lại thì tiếp tục track hiện tại.
- Sửa `apps/client/src/main.ts`: trong `render`, gọi `audio.music.update(state.phase, state.enemies.some(e => e.rank === 'boss' && e.hp > 0))`. Đây là phép tính rẻ và chỉ đổi track khi kết quả khác.
- Tạm thời giảm nhạc khoảng −4 dB trong 0,6 giây khi có `boss-spawn` hoặc kỹ năng boss. Không bắt buộc, làm nếu còn thời gian.

## Lưu ý

- Kiểm tra field rank và hp thật trong `EnemyState` của `packages/contracts/src/types.ts` trước khi viết điều kiện.
- Boss dungeon: chờ câu trả lời câu hỏi 2 trong `plan.md`.
- Log `audio.music` mỗi lần đổi track (from, to, phase).
