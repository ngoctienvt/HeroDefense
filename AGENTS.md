# Hướng dẫn cho agent

## Phạm vi và cách làm

- Đọc `README.md` và tài liệu liên quan trước khi sửa. Chỉ thay đổi phần cần thiết cho yêu cầu; ưu tiên mã và cấu trúc sẵn có, áp dụng KISS, DRY, YAGNI.
- Với thay đổi nhiều bước, xác định hành vi mong muốn và nguyên nhân hiện tại trước khi sửa. Không tự suy đoán khi thiếu quyết định về luật chơi hoặc trải nghiệm; hỏi người dùng.
- Giữ TypeScript tương thích cấu hình `strict`. Xử lý lỗi và kiểm tra dữ liệu ở ranh giới; không che lỗi bằng ép kiểu tùy tiện hoặc dữ liệu giả.
- Khi thêm tính năng, tạo thông tin debug vừa đủ để lần ra lỗi, theo cách ghi log sẵn có. Không ghi tên người chơi, reconnect token hay dữ liệu riêng tư vào log.
- Khi làm vfx hay asset game, làm theo cách chuẩn của game nhất có thể để ra chất lượng cao nhất, không làm 1 cách tạm bợ để ra kết quả sơ sài.

## Làm VFX và dùng asset

- Mỗi kỹ năng phải có **hình chính đọc được đúng vật chất/hành động trong mô tả** ở góc camera và nền chiến trường thật: nước thấy mặt nước/bọt/tia nước, lửa thấy ngọn lửa/vụ nổ, cát thấy luồng cát, băng thấy mảnh băng, khiên thấy vật che chắn. Đổi màu ảnh phép chung hoặc thêm tia sáng không đủ để đại diện nguyên tố. Ưu tiên tương phản hình khối, alpha và blend phù hợp nền sáng/tối; không để lớp sáng che nhân vật, mục tiêu hay thanh máu.
- Trước khi chốt VFX, đối chiếu `content/catalog.ts` và event/snapshot thực: điểm phát, đường bay, điểm chạm, bán kính, số mục tiêu, thời gian trạng thái. Chiêu đơn mục tiêu không vẽ nổ lan; buff/khiên xuất hiện trên đúng đồng minh; dư âm kéo dài theo trạng thái server khi có snapshot. Hiệu ứng chỉ trình bày, không quyết định kết quả chiến đấu.
- Với mỗi chiêu, rà nhịp báo trước → di chuyển → va chạm → dư âm ở góc camera chiến đấu, cả khi nền sáng và khi trận đông. Lớp chính phải còn nhận ra khi bỏ tia/hạt phụ; particle dùng để thêm chuyển động và lực va chạm, không thay hình chính. Khi người dùng báo VFX khó đọc, xác định nguyên nhân cụ thể từ ảnh/video và code rồi sửa đúng lớp đó.
- Giữ cap/pool, dọn tài nguyên khi đổi trận/khu vực, reduced motion vẫn báo rõ vị trí và phạm vi, và log `visual.*` vừa đủ để truy lỗi. Sau khi sửa, rà tĩnh event → VFX → cleanup; người dùng chạy build/game/test theo mục **Kiểm tra và bàn giao** trước khi kết luận về hình ảnh hoặc FPS.
- Trước khi tạo hiệu ứng, xem [thư viện VFX](docs/vfx-assets.md): `assets/vfx-source/` giữ gói nguồn nguyên bản, `assets/vfx-library/` giữ PNG chọn sẵn cùng `LICENSE.txt` hoặc `SOURCE.txt`. Thư viện có tài nguyên băng/tuyết, điện/sét, lửa và phép chung. Chỉ đưa texture thực sự dùng vào `apps/client/public/assets/` sau khi tối ưu; không tải toàn bộ thư viện khi chạy game.
- Thiết kế mỗi chiêu theo nhịp báo trước → phóng/di chuyển → va chạm → dư âm, đồng bộ với sự kiện chiến đấu do server xác nhận. Dùng `apps/client/src/visual-effects.ts`, các module `visual-fire*` và `debug` hiện có; giới hạn số hạt/đèn, tái sử dụng đối tượng, dọn tài nguyên và giữ chế độ giảm chuyển động. Không dùng texture hay hình ảnh từ map Warcraft.
- Dùng PNG nguồn làm hình hạt, mặt nạ hoặc nguyên liệu cho flipbook; kiểm tra alpha, kích thước và thứ tự khung bằng ImageMagick, xuất WebP vừa đủ cho runtime. Không đưa atlas 4096×6144 nguyên bản hoặc hiệu ứng khung nhỏ phóng lớn trực tiếp vào game. Dùng Babylon.js Particle Editor/Node Particle Editor để thử thông số rồi chép cấu hình cần thiết vào mã dự án. Công cụ, nguồn, lệnh mẫu và cách chọn texture ghi trong `docs/vfx-assets.md`.
- Khi dùng atlas của Viktor Hahn trong sản phẩm, ghi công tác giả, URL nguồn, giấy phép CC BY 4.0 và các thay đổi trong credits của game. Các nguồn CC0 cũng phải lưu nguồn và giấy phép trong tài liệu dự án.
- Mỗi asset bên ngoài mới phải có URL nguồn, giấy phép, phiên bản/ngày tải trong tài liệu VFX; giữ bản giấy phép. Không khẳng định VFX đã đẹp hoặc chạy đúng trước khi người dùng kiểm tra trong game theo mục **Kiểm tra và bàn giao**.

## Ranh giới của dự án

- Luật chơi và trạng thái trận thuộc `packages/game-core/`; kiểu dữ liệu giao tiếp thuộc `packages/contracts/`. Server xác thực lệnh, quyền sở hữu và quản lý phòng; client gửi lệnh và hiển thị trạng thái. Không chuyển quyết định có ảnh hưởng đến kết quả trận sang client.
- Khi đổi lệnh hoặc dữ liệu truyền qua mạng, cập nhật đồng bộ contract, kiểm tra đầu vào ở server và nơi gửi/nhận ở client. Giữ tương thích hiện có trừ khi yêu cầu thay đổi hợp đồng đó.
- `content/data/catalog.json` là dữ liệu được tạo từ bộ trích xuất. Không sửa tay để thay đổi nội dung; sửa nguồn thích hợp và mô tả rõ giới hạn chứng cứ theo `docs/content-provenance.md`. Giữ nguyên file map gốc `ThienDao v2.1.w3x`; không chạy mã nhúng trong map.
- Khi đổi gameplay, đối chiếu `docs/gameplay-spec.md`. Không gọi các kỹ năng web tự thiết kế là kỹ năng gốc Warcraft nếu chưa có chứng cứ.

## Kiểm tra và bàn giao

- Người dùng tự kiểm tra sau khi code. Agent **không tự chạy game hoặc kiểm thử**: không khởi động server/dev server, không mở trình duyệt để chơi, không chạy launcher, `npm test`, `npm run typecheck` hay `npm run build`, trừ khi người dùng yêu cầu rõ trong tác vụ đó.
- Agent vẫn phải tự đọc lại phần mã đã sửa, kiểm tra tính nhất quán giữa các lớp và cập nhật hoặc viết test hồi quy khi phù hợp, nhưng để người dùng thực thi các test đó.
- Khi bàn giao, ghi ngắn gọn thay đổi, các lệnh hoặc tình huống người dùng cần kiểm tra, và nói rõ những kiểm tra nào chưa chạy. Không tuyên bố đã hoạt động trong game khi chưa có kết quả kiểm tra từ người dùng.
- Nếu người dùng báo lỗi sau khi kiểm tra, dùng bước tái hiện và log họ cung cấp để tìm nguyên nhân, sửa và đưa lại các bước kiểm tra cụ thể.
