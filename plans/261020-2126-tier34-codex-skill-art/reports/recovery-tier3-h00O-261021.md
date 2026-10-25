# Phục hồi tiến độ ảnh — Phán Quan (h00O)

PNG gốc/lượt sửa được đối chiếu lại sau khi khôi phục manifest từ bản validation. Job chưa QA đầy đủ giữ `planned`; không tạo lại ảnh gốc.

| Asset | Trạng thái | Ghi chú |
|---|---|---|
| `life-death-ledger-sheet` | `planned` | đang chờ QA/sửa tiếp |
| `verdict-ink-arc` | `raw-ready` | alpha/layout đã rà trên contact sheet |
| `verdict-ink-burst-sheet` | `BLOCKED_ART` | Two saved edits retain edge-touching content in the 4x2 sheet; below 5% margin. |
| `soul-ledger-chain` | `raw-ready` | alpha/layout đã rà trên contact sheet |
| `soul-shackle-sheet` | `BLOCKED_ART` | Two saved edits retain content at P16 cell edges; below 5% margin. |

Kiểm tra chỉ đọc ảnh nguồn, contact sheet và alpha. Không tích hợp runtime, build, game hoặc test. Ledger còn giữ SHA-256 và đường dẫn PNG/iteration.
