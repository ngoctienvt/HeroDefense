# VFX cho 12 kỹ năng Huyền

Trạng thái: người dùng xác nhận Thủy Lao rõ hơn; đã sửa tiếp 11 kỹ năng Huyền còn lại và quy tắc VFX, chờ người dùng kiểm tra bản build mới trong game. Nguồn hành vi: `content/catalog.ts` (override đang chạy), `packages/game-core/src/combat.ts` và event/snapshot; `content/hero-abilities.ts` là thiết kế cũ cho các ID này.

## Kết quả mong muốn

- Mỗi kỹ năng Huyền biểu đạt đúng hành vi, mục tiêu, phạm vi và Ngũ Hành trong game; không vẽ chain/đòn đánh vùng khi server chỉ buff hoặc bắn đơn.
- Nhịp cast → phát/di chuyển → va chạm → dư âm đọc được ở trận đông. Trạng thái kéo dài (Cuồng Vũ, Đồng Mệnh, Khiên Băng, Hoa Ăn Thịt) bám snapshot khi có dữ liệu.
- Giữ giới hạn pool, reduced motion, log chẩn đoán và quyền quyết định chiến đấu ở server. Dùng texture đã có quyền dùng, không thêm asset mới khi chưa cần.

## Thực hiện

1. Đồng bộ màu cơ sở theo `hero.element`; rà 12 choreography trong `visual-tier-skills.ts` theo catalog thực.
2. Bổ sung biểu thị trạng thái/summon trong `battlefield.ts` và `visual-effects.ts` ở nơi snapshot đã cung cấp dữ liệu.
3. Cập nhật test định tuyến và hợp đồng VFX, rà mã và tài liệu. Người dùng thực thi typecheck, test, build và kiểm tra hình ảnh theo `AGENTS.md`.

Đã cập nhật choreography 12 chiêu, màu Ngũ Hành, particle texture có pool, dấu trạng thái Cuồng Vũ/Đồng Mệnh/Khiên Băng và Hoa Ăn Thịt từ snapshot. Đã rà đường dẫn asset, alpha, bán kính catalog và lời gọi trong mã. Agent chưa chạy game, `npm test`, `npm run typecheck` hoặc `npm run build` theo `AGENTS.md`.

Phản hồi hình ảnh: xoáy `twirl_01` có alpha rất thưa, cộng sáng trên nền đá nên khó thấy nước dù thời gian chiêu là 3,5 giây. Thay bằng mặt nước xanh có độ trong, xoáy bọt trắng, viền nước và màn nước/hạt bắn ở điểm chiêu chạm. Dùng pool tối đa 4 vùng, giữ reduced motion và log `visual.water.impact`. Cần người dùng kiểm tra bản build mới; chưa kết luận chất lượng hình ảnh.

Phản hồi tiếp theo: nước rõ hơn; người dùng yêu cầu chuẩn hóa nguyên tắc và nâng chất lượng 11 kỹ năng còn lại. `AGENTS.md` nay yêu cầu hình chính đúng vật chất/hành động, nhận ra ở camera trận thật và đối chiếu event/snapshot. Đã bổ sung texture thủ công tại runtime cho chuông, dây leo, cát, kiếm, khiên, hoa, bắn tỉa, dây linh hồn, tiếng đàn, hạt giống, hoa ăn thịt; nối vào cast/đường bay/va chạm; lớp lửa Hồng Hài Nhi quét ở bốn hướng, vùng cháy kiếm trận có ngọn lửa, Khiên Băng và các buff có dấu snapshot. Pool tối đa 32 motif. Agent rà tĩnh và thêm test hồi quy; build/test/game vẫn để người dùng thực hiện theo `AGENTS.md`.

Phản hồi mới: các hình thủ công vẫn trông giả; người dùng muốn thử Blender MCP cho Thủy Lao. Đã kết nối `mcp-for-blender` với Blender 5.2, dựng cảnh nước/bọt/giọt có animation 16 khung và render RGBA qua MCP; lưu `.blend`, script dựng/render và atlas WebP. `visual-water.ts` phát flipbook cho tuyệt kỹ 3,5 giây, giữ mặt nước và hạt runtime; đòn nước ngắn giữ hiệu ứng cũ, reduced motion bỏ flipbook. Cần người dùng kiểm tra trên nền đá, với quái trong vùng, các góc camera và trận đông; đây là bản dựng mesh 3D, chưa phải mô phỏng chất lỏng hay nghiệm thu chất lượng cuối.

Phản hồi tiếp: vòng xoáy cũ chồng lên Thủy Lao và các hình Huyền dựng thử còn giống đạo cụ. Đã bỏ các nét xoáy trắng trong `visual-water.ts`. Tạo 14 cảnh Blender cho 11 tướng còn lại qua Blender MCP, thêm mặt vật liệu có noise/bump, các lớp mờ, hạt vật chất và chuyển động splay/va chạm; xuất 12 khung/chiêu vào WebP. `visual-tier-motifs.ts` chuyển sang SpriteManager có pool/giới hạn 32, giữ dấu trạng thái từ khung tĩnh; `visual-tier-skills.ts` nối thêm vòng lửa Hồng Hài Nhi. Contact sheet nguồn là `assets/vfx-source/huyen-flipbooks/contact-sheet.png`. Ảnh tĩnh riêng lẻ vẫn không đạt độ thật như footage/mô phỏng chuyên dụng; cần kiểm tra hiệu ứng tổng hợp trong trận trước khi quyết định tiếp tục đầu tư chất lượng asset. Agent không chạy game, test, typecheck hay build theo `AGENTS.md`.

Lượt hoàn thiện theo mốc Thủy Lao: render lại 14 nguồn ở 384×384, runtime 256×256 mỗi khung; thêm thể tích nguyên tố biến dạng và tách đường sáng thành đoạn ngắn, giữ vật thể/hành động đặc thù ở lớp trước. Kiểm tra tĩnh 14 atlas 12 khung và alpha sau đóng gói. Blender MCP chặn script xoá toàn cảnh vì có nguy cơ mất cảnh của người dùng; script đã chuyển sang tạo scene VFX riêng, không xoá object/scene đang mở. Chưa có nghiệm thu thị giác trong chiến trường hoặc kết quả build/test vì chỉ người dùng chạy theo `AGENTS.md`.

Người dùng chỉ ra các vòng tròn nổi tách khỏi vật chất trong contact sheet. Đã bỏ torus trang trí và đường crest dạng vòng chung khỏi atlas, bỏ vòng âm/băng không ăn nhập; chuông được render lại không có vòng rời và tăng tỉ lệ khung để vẫn nhận ra hình chính. Đã đóng lại 14 atlas và 5 khung trạng thái, rà contact sheet `assets/vfx-source/huyen-flipbooks/contact-sheet.png`. Vòng shockwave trong runtime vẫn là dấu phạm vi/va chạm có thời điểm từ event, không nằm trong atlas Blender.

## Nghiệm thu người dùng

- Kiểm tra 12 chiêu ở solo, một trận đông 4 người, reduced motion, `?debug=1`; chú ý Mộc Tra tự buff, Vô Thường một phát bắn, Hà Bá vùng xoáy 4.8, Mạnh Bà tối đa 4 mục tiêu, Nhiếp Tiểu Thiến hồi máu/khiên băng và Bảo Quả Tử có cây tồn tại theo trận.
- Chưa gọi là hoàn tất chất lượng hình ảnh hoặc FPS trước khi người dùng xác nhận trong game.
