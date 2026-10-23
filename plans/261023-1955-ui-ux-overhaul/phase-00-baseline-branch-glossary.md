# Phase 0 — Chuẩn bị: tách nhánh, ảnh gốc, thuật ngữ

## Bối cảnh

Nhánh `feat/hero-vfx-kit` đang có khoảng 60 file VFX chưa commit, trong đó có các file UI cần sửa (`main.ts`, `panels.ts`, `ui.ts`, `styles.css`). Nếu sửa chồng lên thì diff UI và VFX sẽ trộn vào nhau, không review và hoàn tác riêng được.

## Bước

1. Người dùng commit phần VFX đang dở, hoặc xác nhận cho agent commit. Sau đó tạo nhánh `feat/ui-ux-overhaul` từ nhánh đó.
2. Xin ảnh gốc ở độ phân giải người dùng hay chơi: sảnh, chuẩn bị, giao chiến có boss, drawer Đội Hình, bảng Ghép Tướng, màn kết quả. Lưu vào `plans/261023-1955-ui-ux-overhaul/baseline/`. Mỗi phase sau so sánh với các ảnh này.
3. Chốt bảng thuật ngữ, hiện thực bằng `apps/client/src/ui-labels.ts`. Mọi chuỗi hiển thị lấy từ module này hoặc dùng đúng các từ trong bảng.

## Bảng thuật ngữ (đề xuất)

| Khái niệm | Dùng | Bỏ |
|---|---|---|
| Bậc tướng (1–6) | **Phẩm** (`Phẩm 3`) | "Bậc" cho tướng |
| Sao hợp nhất | **★** / `7★` | — |
| Cấp trang bị | **+N** (`Vũ khí +3`) | "Bậc" cho trang bị |
| 5 vị trí xuất trận | **Ô 1–5** | "Trận Vị" |
| Tướng chưa xuất trận | **Bộ sưu tập** | "Kho" |
| Căn cứ | **Linh Trụ** | "Thần Điện" (sửa HUD, sảnh, màn kết quả, README) |
| `formationPoints` | **Điểm Trận Pháp** | "Tiên Khí" |
| Lệnh dừng / giữ | **Dừng** / **Giữ vị trí** | Stop / Hold |
| Bảo hiểm triệu hồi | **Bảo hiểm** `2/4` | pity |
| Số người | **1–4 người** | "2–4 người" ở sảnh |

## Tiêu chí xong

- Đang ở nhánh mới, `git status` sạch trước khi sửa.
- Ảnh gốc đã nằm trong thư mục baseline.
- `ui-labels.ts` export các formatter `starText(rank)`, `tierLabel(tier)`, `gearLabel(cat, level)`, `roleLabel`, `elementLabel`, kèm test đơn vị.
