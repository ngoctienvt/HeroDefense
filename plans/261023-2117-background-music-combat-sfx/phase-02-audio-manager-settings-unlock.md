# Phase 2 — AudioManager, cài đặt và mở khóa autoplay

## Mục tiêu

Đưa âm thanh lên mức phiên chơi, sống qua sảnh, trận và màn kết quả. Âm thanh bật sẵn, lựa chọn được lưu và tự mở khóa ở lần tương tác đầu tiên.

## File

- Mới: `apps/client/src/audio-manager.ts`
  - Tạo `AudioContext` một lần.
  - Graph: master gain → `DynamicsCompressorNode` (dùng làm limiter nhẹ) → destination. `musicGain` và `sfxGain` cùng nối vào master.
  - API: `unlock()`, `setEnabled()`, `setVolumes({ music, sfx })`, `music`, `sfx`, `dispose()`.
  - Khi tab ẩn (`visibilitychange`) thì gọi `suspend()`, khi tab hiện lại thì `resume()`.
- Mới: `apps/client/src/audio-settings.ts`
  - `loadAudioSettings()` và `saveAudioSettings()` dùng khóa `thienDao.audio.v1`. Mọi lần đọc/ghi bọc try/catch.
  - Kiểm tra dữ liệu đọc ra: `enabled` là boolean, volume trong `[0,1]`. Sai thì dùng mặc định `{ enabled: true, music: .5, sfx: .8 }`.
- Sửa `apps/client/src/main.ts`
  - `audioEnabled` lấy từ `loadAudioSettings()`.
  - Tạo `AudioManager` ở cấp module và truyền `audio.sfx` vào `Battlefield`.
  - Đăng ký listener `pointerdown`/`keydown` chạy một lần (`{ once: true, capture: true }`) gọi `audio.unlock()`.
  - `toggleAudio` lưu cài đặt.
- Sửa `apps/client/src/battlefield.ts`
  - Bỏ `new VisualAudio()`. Nhận `SfxSink` qua constructor hoặc setter.
  - `dispose()` không còn đóng context.
  - Bỏ `setAudioEnabled`, hoặc chuyển nó thành no-op ủy quyền cho manager.
- Sửa `apps/client/src/hud-top.ts`: chỉ thêm thanh chỉnh âm lượng Nhạc/Hiệu ứng nếu người dùng chọn có (câu hỏi 1 trong `plan.md`). Nút bật/tắt hiện có giữ nguyên.
- `visual-audio.ts`: giữ hàm tạo tiếng tổng hợp làm **fallback** khi một cue chưa tải xong hoặc bị lỗi. Chuyển hàm đó vào `audio-synth-fallback.ts`, rồi xóa class cũ.

## Lưu ý

- Chưa unlock thì `play()` không làm gì và không xếp hàng tiếng cũ.
- Unlock xong thì music director phát track hợp pha hiện tại (phase 4).
- Log `audio.unlock`, `audio.settings` (enabled, volume). Không log tên người chơi.
