# Kế hoạch làm lại Art nhân vật & Sprite đồng bộ (Phong cách Tiên Hiệp Q-Version)

Kế hoạch chi tiết đầy đủ đã được biên soạn và lưu tại artifact: [ke-hoach-lam-lai-art-nhan-vat-xianxia.md](file:///C:/Users/PC/.gemini/antigravity/brain/60477587-d73d-4f77-8821-ff268cc55885/ke-hoach-lam-lai-art-nhan-vat-xianxia.md).

## Tóm tắt định hướng

- **Phong cách:** Cổ phong Tiên hiệp Q-version (Xianxia Chibi Anime) chất lượng cao theo mẫu tham chiếu người dùng cung cấp.
- **Tính đồng bộ:** Mỗi nhân vật có cặp bài trùng 1:1:
  1. *Ảnh chân dung / Avatar bán thân* (Bust 512×512) cho UI/HUD/Lobby/Ghép tướng.
  2. *Sprite toàn thân Chibi 2.6–2.8 đầu* cho sàn đấu Babylon.js.
- **Quy chuẩn Sprite Sheet:** Lưới toán học cố định 4 cột (South, West, North, East) × 7 hàng (`idle`, `walk-a`, `walk-b`, `attack`, `cast` lấy đà 0.25s, `hit`, `death`). Ô chuẩn 256×256px (hoặc 384×384px), cố định điểm tiếp đất chân (root pivot) để loại bỏ hoàn toàn trôi chân và lỗi lệch ô.
- **Lộ trình:** 5 giai đoạn từ chuẩn hóa tiêu chuẩn/tooling, thử nghiệm 5 tướng đại diện (PoC), nâng cấp engine renderer, triển khai đại trà 70 tướng qua 4 đợt, đến tối ưu hiệu năng và nghiệm thu.
