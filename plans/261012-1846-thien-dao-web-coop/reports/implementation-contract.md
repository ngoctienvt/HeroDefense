# Hợp đồng triển khai đã điều chỉnh — 2026-10-12

Người dùng yêu cầu triển khai toàn kế hoạch và cho phép bản clone không giống tuyệt đối, miễn cơ chế tương tự. Giữ mục tiêu web desktop co-op 2–4, đủ các nhóm cơ chế; bỏ gate bắt buộc có Warcraft runtime/oracle hoặc công thức pixel-perfect mới được code. Không tuyên bố khớp tuyệt đối native Warcraft.

Đích quan sát: phòng mời online với server authoritative; 70 định nghĩa nhân vật lấy từ map, đội hình 5 ô, triệu hồi/triển khai/bán/hợp nhất, 27 liên kết, 8 trận pháp, ba nhóm trang bị, skill/combat/death/respawn, 45/60 wave theo bốn độ khó, phụ bản boss, thưởng và xếp hạng; UI desktop dùng được. Stats/ability handlers/terrain được thích nghi và ghi rõ.

Không thêm PvP, mobile, tài khoản bền, gacha trả tiền, database hoặc giả dữ liệu multiplayer. Thiếu hosting credentials không chặn local/LAN co-op và artifact triển khai; public hosting là bước cuối sau artifact review.

Kiểm chứng: typecheck/build; regression core/content/network/security; nhiều client thật cùng room, refresh reconnect; thắng/thua toàn tiến trình ở simulation time và browser kiểm tra tương tác; stress/soak thực có báo số đo. Từng khác biệt so map được ghi tại docs/gameplay-spec.md.

Tổ chức giữ boundary kế hoạch: content/, packages/contracts, packages/game-core, apps/server, apps/client, tests, deploy. Source từ map là dữ liệu offline; không chạy JASS trong browser/server.
