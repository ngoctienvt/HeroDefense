# Phục hồi tiến độ ảnh — Trư Bát Giới (h00J)

PNG gốc/lượt sửa được đối chiếu lại sau khi khôi phục manifest từ bản validation. Job chưa QA đầy đủ giữ `planned`; không tạo lại ảnh gốc.

| Asset | Trạng thái | Ghi chú |
|---|---|---|
| `belly-tide-burst-sheet` | `planned` | đang chờ QA/sửa tiếp |
| `belly-tide-ground` | `raw-ready` | alpha/layout đã rà trên contact sheet |
| `rake-tide-guard-sheet` | `planned` | đang chờ QA/sửa tiếp |
| `water-shield-rupture-sheet` | `BLOCKED_ART` | Two saved edits still have cell-edge contact at strong-alpha threshold; 4x4 transition sheet misses 5% margin. |
| `rupture-spray-hit-sheet` | `planned` | đang chờ QA/sửa tiếp |

Kiểm tra chỉ đọc ảnh nguồn, contact sheet và alpha. Không tích hợp runtime, build, game hoặc test. Ledger còn giữ SHA-256 và đường dẫn PNG/iteration.
