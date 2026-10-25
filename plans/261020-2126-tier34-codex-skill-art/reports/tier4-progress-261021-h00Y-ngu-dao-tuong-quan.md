# Tiến độ ảnh bậc 4 — h00Y Ngũ Đạo Tướng Quân

Ngày: 2026-10-21. Nguồn trạng thái duy nhất: `assets/vfx-source/tier34-codex-art/job-manifest.json`. Chỉ raw art; chưa tích hợp/runtime QA.

| Asset | Trạng thái | Ghi chú QA |
|---|---|---|
| `samsara-wheel-cast-sheet` | `BLOCKED_ART` | Hai lượt sửa vẫn để quầng ma trơi cyan chạm ranh; lề alpha mạnh nhỏ nhất 0%. |
| `samsara-wheel-ground` | `raw-ready` | 1254x1254 RGBA top-down; lề alpha mạnh 5.5%, tâm mở, vòng sắt/ngọc và cửa vong đọc rõ. |
| `soul-shackle-chain` | `raw-ready` | 2172x724 RGBA ribbon; lề alpha mạnh 6.4%, xích và đầu móc bên phải. |
| `ghost-chain-pulse` | `raw-ready` | 2172x724 RGBA ribbon; lề alpha mạnh 14.9%, đầu ma trơi hướng phải; kích hoạt theo hit event như inventory. |
| `soul-frenzy-aura-sheet` | `BLOCKED_ART` | Hai lượt sửa vẫn có ô chạm/gần chạm ranh (min 0%) và viền cyan; ba ứng viên được giữ. Field `berserk` không cho biết nguồn, nên không suy đoán người nhận. |

Ảnh đã chép nguyên byte từ Codex ImageGen; prompt, nguồn, hash và QA trong ledger. Không chạy build/test/game.
