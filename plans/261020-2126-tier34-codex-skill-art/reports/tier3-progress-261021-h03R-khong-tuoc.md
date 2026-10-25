# Tiến độ — Khổng Tước h03R

Ngày 2026-10-21. Nguồn tạo: Codex built-in `image_gen`. Ledger chuẩn: `assets/vfx-source/tier34-codex-art/job-manifest.json`.

| Asset | Kiểu | Trạng thái | QA / lý do |
|---|---|---|---|
| `peacock-fan-sweep-sheet` | S16 | `BLOCKED_ART` | Mở quạt → quét → khép đọc được; alpha chạm nhiều biên cell và còn viền màu sau hai lần sửa. |
| `five-radiance-ground` | D | `BLOCKED_ART` | Vòng lông năm màu, tâm trống, nhìn top-down; pixel alpha lạc chạm cạnh sau hai lần sửa. |
| `peacock-eye-feather` | O | `BLOCKED_ART` | Lông và mắt ngọc rõ, nhưng chóp/quill chạm hoặc cách cạnh dưới 3% sau hai lần sửa. |
| `radiance-blessing-sheet` | S8 | `BLOCKED_ART` | Lông tụ → lóe năm màu → tan; alpha còn cắt biên cell và viền nhiễu sau hai lần sửa. |
| `venom-plume-aura-sheet` | P16 | `BLOCKED_ART` | Lông độc và sương tím có chu kỳ xuất hiện/giữ/tan; alpha sương chạm biên cell sau hai lần sửa. |
| `venom-plume-hit-sheet` | S8 | `BLOCKED_ART` | Lông độc cắm, khói tỏa nhỏ rồi tan; alpha vẫn chạm biên cell sau hai lần sửa. |

Mỗi job giữ PNG gốc, prompt, output sửa (nếu có), kích thước, lưới, anchor, route, reference, event binding, QA và SHA-256 trong manifest. Không tích hợp runtime, build hoặc nghiệm thu trong game.

**Kết quả inventory:** 6 `BLOCKED_ART`, 0 `raw-ready`, không còn job `planned` cho h03R. Pha 2 chưa hoàn tất.
