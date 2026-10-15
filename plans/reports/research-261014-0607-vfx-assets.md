# Nghiên cứu nguyên liệu VFX — 14-10-2026

## Phạm vi và kết luận

Mục tiêu: chuẩn bị nguyên liệu hợp pháp, dùng được cho VFX Babylon.js hiện tại mà không sửa gameplay. Đã xem `README.md`, `AGENTS.md`, `visual-effects.ts`, `visual-fire*.ts`, texture runtime và tài liệu gameplay. Dự án đã có particle, flipbook lửa, debug và reduced motion; thiếu thư viện nguyên liệu có nguồn gốc và quy trình chọn/chuyển texture.

Đã tải ba gói Kenney CC0 cùng năm nguồn OpenGameArt (bốn ZIP, một PNG) vào `assets/vfx-source/`. Thư viện `assets/vfx-library/` có texture đã chọn cho băng/tuyết, điện/sét, lửa và phép chung; giấy phép và nguồn đi kèm từng thư mục. Nguồn, SHA-256, vai trò từng texture và lệnh chuyển định dạng ở [hướng dẫn VFX](../../docs/vfx-assets.md). Không đưa toàn bộ gói vào `public/assets` vì chúng chưa được mã sử dụng.

## Nguồn kiểm chứng

- Kenney: [Particle Pack](https://kenney.nl/assets/particle-pack), [Smoke Particles](https://kenney.nl/assets/smoke-particles), [Light Masks](https://kenney.nl/assets/light-masks). Trang của từng gói ghi CC0; giấy phép bên trong từng ZIP cũng ghi CC0.
- Babylon.js: [Particle System](https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/particle_system_intro), [Node Particle Editor](https://www.babylonjs.com/tools/). Particle dùng sprite texture và có công cụ biên tập trực quan; cần chuyển cấu hình vào logic trận hiện có.
- OpenGameArt: [Mikodrak](https://opengameart.org/content/2d-spell-effects), [Calinou](https://opengameart.org/content/lightning-animation), [para](https://opengameart.org/content/animated-particle-effects-2), [mkwong98](https://opengameart.org/content/snow-flake) đều ghi CC0. [Viktor Hahn](https://opengameart.org/content/spell-animation-spritesheets) ghi CC BY 4.0 và ZIP chứa `license.txt`; phải ghi công nếu dùng atlas trong game.

## Quyết định và giới hạn

ImageMagick và FFmpeg đã có trên máy này; Babylon.js đã nằm trong dependency. Không chép installer hoặc cài thêm editor vào repo vì công cụ biên tập VFX của Babylon chạy trên web và định dạng đích là texture WebP/logic TypeScript. Chuỗi sét Calinou được tạo bản alpha trong thư viện từ nguồn nền đen, giữ bản gốc trong ZIP. Atlas đóng băng 4096×6144 và các khung Mikodrak 56×65 đều chưa thích hợp đưa thẳng vào runtime. Không thay asset VFX đang chạy; chất lượng trong game và hiệu năng 4 người chưa được kiểm tra theo quy định dự án. Bước tiếp theo khi làm một chiêu cụ thể: chọn texture, tối ưu, tích hợp theo sự kiện server, để người dùng chạy game kiểm chứng.

## Câu hỏi chưa giải quyết

Không có cho bước chuẩn bị nguyên liệu; phong cách và nhịp từng chiêu sẽ quyết định khi thực hiện chiêu đó.
