# Tiến độ — Trầm Hương h03Q

Ngày 2026-10-21. Nguồn tạo: Codex built-in `image_gen`; không dùng CLI/API thay thế. Thứ tự job theo `assets/vfx-source/tier34-codex-art/job-manifest.json`.

| Asset | Kiểu | Trạng thái | QA / lý do |
|---|---|---|---|
| `lotus-lamp-flare-sheet` | S8 | `BLOCKED_ART` | Đèn và chuỗi bùng sáng → dịu còn nhận ra; alpha chạm mép nhiều ô sau hai lượt sửa. |
| `mountain-splitting-axe-sheet` | S16 | `BLOCKED_ART` | Alpha chạm biên ô sau hai lượt sửa; hình rìu trở thành tia dọc khó nhận ra ở nhiều pha. |
| `mountain-split-fissure` | D | `raw-ready` | Khe đá top-down, hai mép tách, vụn đá và tia vàng; lượt sửa đạt lề alpha 8% trở lên. |
| `lantern-lotus-bloom-ground` | D | `BLOCKED_ART` | Bông sen top-down rõ, nhưng alpha có điểm chạm/lề dưới 3% sau hai lượt sửa. |
| `axe-split-hit-sheet` | S8 | `BLOCKED_ART` | Đá bật và tia sáng đọc được; hai lượt sửa vẫn chạm biên nhiều ô, còn viền màu nhiễu. |

Mọi PNG gốc, prompt và hai lượt sửa (nếu có) được giữ trong `assets/vfx-source/tier34-codex-art/`; ledger có kích thước, `gridRects`, anchor, event binding, QA, nguồn, số lượt và SHA-256. Không có job nào tích hợp runtime, build hoặc nghiệm thu trong game.

**Kết quả inventory:** 1 `raw-ready`, 4 `BLOCKED_ART`; không còn job `planned` cho h03Q. Pha 2 vẫn đang thực hiện và chưa hoàn tất.
