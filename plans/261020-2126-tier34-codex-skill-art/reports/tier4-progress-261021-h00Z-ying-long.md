# Tiến độ ảnh bậc 4 — h00Z Ứng Long

Ngày: 2026-10-21. Ledger: `assets/vfx-source/tier34-codex-art/job-manifest.json`. Chưa tích hợp hoặc nghiệm thu trong game.

| Asset | Trạng thái | QA |
|---|---|---|
| `ice-wing-gust-sheet` | `BLOCKED_ART` | Hai lượt sửa vẫn để haze xanh/trắng qua nhiều ô, đôi cánh chồng ranh; min lề mạnh 0%. |
| `blizzard-vortex-sheet` | `BLOCKED_ART` | Hai lượt sửa giảm được haze nhưng min lề mạnh 4.3%, dưới 5%; còn viền xanh. |
| `blizzard-frost-ground` | `raw-ready` | 1254x1254 RGBA top-down, tâm mở; min lề alpha mạnh 8.1%. Vùng trắng lớn cần xem tương phản trên mặt đất sáng. |
| `ice-lance-fall` | `raw-ready` | 2172x724 RGBA, mũi nhọn hướng phải; min lề 5.6%; có viền màu nhẹ. |
| `ice-spike-burst-sheet` | `BLOCKED_ART` | Sau hai sửa, top row min lề alpha mạnh 4.3% (<5%). Nhịp gai → mảnh → tan đọc được, nhưng không đạt lề. |

Raw được chép nguyên byte từ Codex ImageGen. Không chạy build/test/server/game.
