# Triển khai nhạc nền và SFX (2026-10-23)

Trạng thái: **đã sửa nguồn và dựng asset**. Chưa chạy typecheck, test, build hay game, và chưa nghe thử trong game.

## Đã làm

- **Asset**
  - Tải 14 gói nguồn vào `assets/audio-source/`.
  - Dựng 28 SFX (khoảng 296 KB) và một bản nhạc nền `music-main.mp3` (asianoriental2, 3 MB, stream) bằng `build-runtime-audio.sh`.
  - Nguồn, giấy phép và cách ghép từng cue ghi trong `docs/audio-assets.md`.
- **Code mới** (`apps/client/src/`): `audio-manager.ts`, `audio-settings.ts`, `audio-music-director.ts`, `audio-cue-routing.ts`, `audio-voice-limiter.ts`, `audio-sfx-player.ts`, `audio-synth-fallback.ts`.
- **Code sửa**
  - `battlefield.ts`: bỏ `VisualAudio`, thêm `setSfx` và một lời gọi `playEventCue` ở đầu `handleEvent`.
  - `main.ts`: tạo `AudioManager`, mở khóa ở lần tương tác đầu, đọc cài đặt đã lưu, gọi `audio.update(state)` mỗi lần nhận state.
  - `hud-top.ts` và `styles/overlay.css`: thêm hai thanh âm lượng.
  - `.gitignore`: bỏ qua các thư mục `extracted/`.
- **Code xóa**: `visual-audio.ts`.
- **Test**: `apps/client/test/audio-system.test.ts` kiểm tra routing, limiter, chọn nhạc, cài đặt và hợp đồng asset/tài liệu.

## Rà các chỗ phát tiếng cũ

Có 22 lời gọi `this.audio.play(event)` cũ, nay thay bằng một lời gọi chung. Nhóm nhánh và kết quả:

| Nhánh cũ | Trước | Nay |
|---|---|---|
| `cast` (khối đầu `handleEvent`) | blip sine | `cast-charge`, pitch theo nguyên tố |
| `revive-h015` / `star-guard-h015` | blip | theo `ability` (heal/shield) hoặc nguyên tố |
| `skill-h01I`/`h014`, `blood-general-hit-h03Z`, `blessing-h01C` (heal) | blip | heal → `skill-heal`; còn lại theo nguyên tố, hoặc theo vai trò nếu là `attack` |
| Kit Thần/Thánh (`h01F`, `h01E`, `h01K`, `h01D`, `h03Z`, `h041`, `h03X`, `h01A`, `h016`, `h018`, `h00I`, tier3/tier4) | blip | `ability` theo nguyên tố, hoặc theo override; `trait-hXXX` (kind `attack`) theo vai trò |
| `monkey-clone-h00R` (attack, `source` là id phân thân) | blip | theo vai trò của tướng lấy từ hậu tố `-h00R` |
| Cuối hàm (mọi attack/ability còn lại, chain) | blip | theo vai trò/nguyên tố |
| `peacock-poison-hit-h03R`, `cataclysm-h01B`, `quake-h00E` | im | vẫn im (`SILENT_SKILLS`) |
| `reflect-h009` | im | `skill-kim` (chuông Kim Tra) |
| Các nhánh return sớm khác không phát tiếng (attack/ability của một số kit) | im | nay có tiếng theo vai trò/nguyên tố. Trùng lặp được chặn bằng cooldown cue |
| Event `trait` | blip (trừ peacock) | im, vì đòn đánh đi kèm đã có tiếng |
| Event ở zone khác | có tiếng | im, trừ boss đảo chính và tiếng báo đợt |

## Người dùng cần làm

1. Chạy `npm test -- apps/client/test/audio-system.test.ts` và `npm run typecheck`.
2. Dừng server cũ → chạy `start-game.cmd` → `Ctrl+F5`. Nghe thử theo kịch bản trong phase 5.

## Rủi ro và giới hạn

- Gain từng cue được cân theo số đo loudness, chưa nghe trong trận thật.
- `battlefield.ts` đã có thay đổi chưa commit từ việc khác trước khi làm âm thanh. Khi commit, tách riêng phần `playEventCue`/`setSfx`.
- Event `trait` hiện im lặng. Nếu có đặc tính nào chỉ phát `trait` mà không kèm `attack`, nó sẽ không có tiếng.

## Câu hỏi chưa chốt

- Không có.

## Thay đổi 2026-10-23 22:40: một nhạc nền xuyên suốt

Theo yêu cầu người dùng, bỏ đổi nhạc theo pha/boss và hai đoạn kết trận. `MusicDirector` chỉ còn một `<audio loop>` phát `music-main.mp3` từ lần tương tác đầu tới khi rời trang; nút âm thanh tạm dừng/tiếp tục. Tiếng cồng `boss-spawn` (SFX) vẫn giữ. Âm lượng nhạc mặc định tăng .5 → .7, loudness file −18 → −16 LUFS. Đã xóa các gói nguồn nhạc không dùng (Determined Pursuit, RPG Battle Loop, Kenney Music Jingles).
