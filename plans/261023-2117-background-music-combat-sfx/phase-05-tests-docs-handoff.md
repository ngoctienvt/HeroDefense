# Phase 5 — Test, tài liệu, bàn giao

## Test (viết sẵn, người dùng tự chạy)

Mới `apps/client/test/audio-system.test.ts`, chạy trong node, không cần WebAudio:

- `resolveCue`
  - Role ra đúng cue đánh thường.
  - Element ra đúng cue kỹ năng.
  - Heal/shield thắng element.
  - `skillId` override thắng mọi bước khác.
  - `SILENT_SKILLS` trả `undefined`.
  - Event zone khác bị bỏ, trừ boss.
  - Mọi `skillId` trong `SKILL_CUE_OVERRIDES` có trong catalog hoặc danh sách skill client, để không có override chết.
- `VoiceLimiter` với đồng hồ giả
  - Cooldown từng cue.
  - Giới hạn từng nhóm.
  - Kỹ năng vẫn phát khi nhóm attack đã đầy.
  - Giới hạn số cue mỗi frame.
- `pickMusic`: đủ các tổ hợp phase × hasBoss.
- `loadAudioSettings`
  - JSON hỏng, thiếu field, volume ngoài khoảng → về mặc định.
  - `localStorage` ném lỗi → về mặc định.
- Hợp đồng asset: mỗi `CueId` và `MusicId` có file trong `apps/client/public/assets/audio/` và có dòng trong `docs/audio-assets.md`.

## Tài liệu

- `docs/audio-assets.md`: nguồn, giấy phép, quy trình ffmpeg, cách thêm cue hoặc override mới.
- `README.md`: sửa câu "Âm thanh tổng hợp có nút bật/tắt" thành mô tả nhạc nền và SFX, mặc định bật, chỉnh trong ⚙.
- `docs/ui-style-guide.md`: nếu thêm thanh âm lượng thì ghi vào phần menu ⚙.

## Bàn giao cho người dùng

- Lệnh chạy: `npm test -- audio-system`, `npm run typecheck`.
- Khởi động lại game: dừng server cũ → chạy `start-game.cmd` → `Ctrl+F5`.
- Kịch bản nghe thử:
  1. Sảnh: click một lần, nghe nhạc nhẹ.
  2. Khai trận: nhạc chuyển sang giao chiến.
  3. Đợt 5 (boss): nhạc boss, có tiếng cồng.
  4. Boss chết: nhạc quay lại giao chiến.
  5. Tốc độ 4× khi trận đông.
  6. Tắt âm thanh rồi refresh.
  7. Đổi zone đang xem.
  8. Thắng hoặc thua.
- Nói rõ: chưa chạy build/test/game. Chưa nghiệm thu âm thanh cho tới khi người dùng nghe thử.
