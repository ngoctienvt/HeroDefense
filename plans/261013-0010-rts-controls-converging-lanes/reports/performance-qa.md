# Đo hiệu năng local — 2026-10-13

Browser Codex In-app Browser trên Windows, build production. Trong cửa sổ 1920×1080, khung vẽ thực tế là 1536×632; phòng solo đứng yên với 0–2 actor ghi 59–60 FPS ở cửa sổ mẫu 5 giây. Tại viewport mặc định 1280×720, canvas 960×288 với 1–2 actor cũng ghi khoảng 59–60 FPS. Log `battlefield.fps` chỉ bật bằng `?debug=1`, có số actor/làn/kích thước; log được giới hạn dung lượng. CPU/GPU máy thử không đọc được qua môi trường hiện tại.

Core stress riêng (không phải GPU/browser): 20 quân, 120 quái tồn tại lâu, 36.000 bước / 30 phút mô phỏng; p50 0,437 ms, p95 0,856 ms mỗi bước trong lần chạy cuối. Bài progression đủ wave trên đội hình mạnh đạt p95 khoảng 9,6–16 ms theo độ khó/lần chạy. Đây là thời gian mô phỏng test process, không phải p99 tick server khi 4 client ở 4×.

Chưa đo browser tại wave cao/4 người, p95 frame time, input freeze, GPU, server p99 tick/snapshot backlog. Mục tiêu 60 FPS/33,3 ms trong kế hoạch chưa thể ký pass từ số liệu tải nhẹ này.

## Câu hỏi còn mở

Cần cấu hình máy mục tiêu và đợt đo tải tự nhiên 4 người/wave cao trước khi công bố mức hiệu năng bảo đảm.
