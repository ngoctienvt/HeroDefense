# Sprite tướng Siêu và Tiên

Nguồn thiết kế là bản mô tả người dùng ngày 15-10-2026, được chuẩn hóa trong `content/tier3-tier4-brief.json`. Danh sách gồm 11 tướng Tier 3 (`h00J`–`h00Q`, `h03Q`–`h03S`) và 13 tướng Tier 4 (`h00R`–`h010`, `h03T`–`h03V`). Đây là thiết kế bản web, không phải khẳng định kỹ năng gốc Warcraft.

Mỗi tướng có nguồn tại `assets/sprites/tier3-tier4/{id}/source/`: master bốn hướng, master phía nam, sheet walk/attack 4×4, prompt và `provenance.json`. `master-prompt-reconstructed.txt` và `turnaround-prompt-reconstructed.txt` là bản phục dựng từ brief, không phải nguyên văn prompt đã gửi công cụ. Master Bàn Cổ chỉ làm tham chiếu phong cách. Sheet `h00Z/source/attack-revision1.png` được giữ lại vì hai figure liền nhau; `attack.png` là bản sửa khoảng cách.

Đóng atlas bằng `python assets/sprites/linh-huyen-stylized/pack-sprites.py --root assets/sprites/tier3-tier4 --hero {id}`. Kết quả ở `web/`: atlas WebP và JSON, portrait, review nền sáng/tối, `qa.json`. Mỗi atlas có 36 frame: mỗi hướng một idle tĩnh, bốn walk, bốn attack; tổng 12 clip. Runtime chỉ lấy `hero-stylized-{id}.webp/.json` và `hero-portrait-{id}.webp` trong `apps/client/public/assets/`. `stylized-motion.ts` định tuyến hero và `stylized-layout.json` giữ kích thước plane theo atlas.

Đã xem review board bốn hướng cho 24 bộ, và packer không báo cảnh báo cắt mép hoặc lỗi alpha. Các pose walk có biên độ khác nhau theo trang phục và vóc dáng; cần xem chuyển động ở cỡ chơi thật để đánh giá độ mượt. Chưa chạy game, build, test hoặc nghiệm thu hình ảnh theo `AGENTS.md`. Khi kiểm tra bản mới, dừng server cũ, chạy lại `start-game.cmd`, rồi tải lại trình duyệt bằng `Ctrl+F5`; rà hướng đông/tây, chân tiếp đất, thu thế attack, thanh máu, nền sáng/tối và trận đông.
