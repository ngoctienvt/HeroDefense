# Phase 1 — Chọn và chuẩn bị asset âm thanh

## Mục tiêu

Lập danh sách file CC0 để người dùng duyệt. Chỉ tải về sau khi được duyệt (tải file cần người dùng đồng ý). Sau đó tối ưu file cho runtime và ghi nguồn đầy đủ.

## Danh sách cần tìm

**Nhạc**, phong cách cổ phong/fantasy phương Đông (sáo, đàn tranh/cổ cầm, trống):

| ID | Dùng khi | Yêu cầu |
|---|---|---|
| `music-calm` | sảnh, chuẩn bị | nhẹ, lặp liền mạch, 1–3 phút |
| `music-battle` | giao chiến | nhịp nhanh, trống, lặp liền mạch |
| `music-boss` | boss chung còn sống | nặng, căng |
| `sting-win` | thắng | 3–8 giây |
| `sting-lose` | thua | 3–8 giây |

**SFX** (khoảng 20 file):

| Nhóm | Cue |
|---|---|
| Đánh thường theo vai trò | `atk-slash` (warrior), `atk-arrow` (ranger), `atk-bolt` (mage), `atk-blunt` (guardian), `atk-chime` (support) |
| Quái đánh | `enemy-hit`, `boss-hit` |
| Tụ lực kỹ năng | `cast-charge` (một tiếng chung, pitch theo nguyên tố) |
| Va chạm kỹ năng theo nguyên tố | `skill-kim` (kim loại), `skill-moc` (gỗ/lá), `skill-thuy` (nước), `skill-hoa` (lửa), `skill-tho` (đá/đất), `skill-vo` (phép chung) |
| Override | `skill-ice` (băng), `skill-thunder` (sét) cho các `skillId` băng/sét |
| Hỗ trợ | `skill-heal`, `skill-shield` |
| Khác | `death-enemy`, `death-hero`, `wave-start` (tù và/cồng), `boss-spawn` (cồng lớn) |

## Các bước

1. Tìm ứng viên trên OpenGameArt, Freesound (lọc CC0), Kenney và Sonniss GDC (nếu giấy phép cho phép). Với mỗi file, đọc giấy phép **trên chính trang của file đó**, vì gói OpenGameArt hay trộn CC0 với CC-BY. Không dùng nguồn có điều khoản không rõ.
2. Lập bảng duyệt trong `plans/261023-2117-background-music-combat-sfx/reports/audio-candidates.md` gồm: ID, tên file, URL, giấy phép, tác giả, độ dài và dung lượng. **Dừng lại để người dùng duyệt.**
3. Sau khi được duyệt, tải mỗi gói vào một thư mục trống riêng trong `assets/audio-source/<nguồn>/`. Giữ file gốc kèm `LICENSE.txt` hoặc `SOURCE.txt`. Không chạy script nào nằm trong gói tải về.
4. Tối ưu bằng ffmpeg:
   - Nhạc: chuẩn hóa loudness khoảng −18 LUFS, xuất `.mp3` 128 kbps stereo. Định dạng chạy được trên Chrome, Firefox, Edge và Safari. Nếu chỗ nối vòng bị hở thì cắt lại điểm lặp.
   - SFX: mono, cắt khoảng lặng đầu (để tiếng va chạm không trễ), fade-out ngắn, chuẩn hóa đỉnh khoảng −3 dBFS, xuất `.mp3` 96 kbps hoặc `.m4a`. Mỗi file nên dưới 40 KB.
   - Đặt file chạy game tại `apps/client/public/assets/audio/{music,sfx}/<id>.mp3`.
5. Viết `docs/audio-assets.md` theo mẫu `docs/vfx-assets.md`: mỗi file có nguồn, URL, giấy phép, tác giả, ngày tải và các thay đổi đã làm (cắt, chuẩn hóa, đổi định dạng), kèm lệnh ffmpeg đã dùng. CC0 không bắt buộc ghi công nhưng vẫn ghi để truy vết.
6. Nghe lại từng file ở âm lượng thật. Loại tiếng chói, tiếng quá dài và tiếng không hợp vật chất.

## Rủi ro

- Thiếu nhạc CC0 cổ phong đủ hay. Phương án dự phòng: dùng nhạc fantasy chung, hoặc hỏi người dùng có chấp nhận CC-BY (phải ghi công trong game) không.
