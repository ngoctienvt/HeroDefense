# Tiến độ ảnh bậc 4 — h00W Lý Tịnh

Ngày: 2026-10-21. Ledger: `assets/vfx-source/tier34-codex-art/job-manifest.json`. Phạm vi chỉ tạo/QA raw art; chưa tích hợp hoặc nghiệm thu trong game.

| Asset | Trạng thái | Kết quả |
|---|---|---|
| `pagoda-toss-sheet` | `raw-ready` | 1774x887 RGBA, S8 4x2; lề alpha mạnh tối thiểu 6%; khung cuối gần rỗng; đã qua hai lần sửa. |
| `pagoda-descent-sheet` | `BLOCKED_ART` | Sau hai lần sửa vẫn có quầng alpha đỏ/vàng và hạt nhiễu quanh phần lớn ô; lề khung mạnh thấp nhất 4.1%, không đạt 5%. Giữ đủ ba ứng viên. |
| `pagoda-seal-ground` | `raw-ready` | 1024x1024 RGBA, decal top-down, tâm thoáng; lề alpha mạnh 7.4%. Có viền màu nhẹ cần xem trên nền sáng/tối khi tích hợp. |
| `pagoda-crush-hit-sheet` | `BLOCKED_ART` | Sau hai lần sửa, alpha mạnh chạm ranh ở hàng đầu và lề thấp nhất 4.1%; còn viền màu. Giữ đủ ba ứng viên. |
| `pagoda-guard-ray` | `raw-ready` | 2172x724 RGBA ribbon ngang, đầu chuông bên phải; lề alpha mạnh 7.1%; còn viền màu nhẹ quanh nét sáng. |

Ảnh nguồn được chép nguyên byte từ Codex ImageGen, prompt và hash ghi trong ledger. Không chạy build, test, server hay game.
