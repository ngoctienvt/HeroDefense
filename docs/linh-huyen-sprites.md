# Sprite stylized cho tướng Linh và Huyền

Bộ thay thế theo phong cách Bàn Cổ: vẽ tay cel shading, tỉ lệ heroic, đường viền rõ, vũ khí phóng đại và màu nhận diện riêng. Bao gồm đúng **8 Linh + 12 Huyền**, không đổi luật chiến đấu.

## Cấu trúc bộ ảnh

Mỗi tướng có **36 khung, 12 clip**: bốn hướng `south/west/north/east`; mỗi hướng gồm một idle tĩnh, bốn pha walk và bốn pha attack. Toàn bộ 20 tướng là **720 khung / 240 clip**. Đây là chuỗi keyframe ảnh tạo sinh, không phải video hoặc rig 3D.

| Nhóm | Tướng |
|---|---|
| Linh | Thiên Lý Nhãn, Thuận Phong Nhĩ, Quỷ Sai, Thiên Binh, Xạ Nhân, Tiên Nữ, Quy Thừa Tướng, Thổ Hành Tôn |
| Huyền | Kim Tra, Mộc Tra, Thiết Phiến, Hồng Hài Nhi, Lã Động Tân, Cự Linh Thần, Mẫu Đơn Tiên Tử, Hà Bá, Vô Thường, Mạnh Bà, Nhiếp Tiểu Thiến, Bảo Quả Tử |

Nguồn mỗi tướng nằm trong `assets/sprites/linh-huyen-stylized/<heroId>/source/`: turnaround bốn hướng, sheet walk, sheet attack, prompt đầy đủ và các bản sửa cần lưu để đối chiếu. `roster.json` giữ danh sách/nhận diện; `prompt-contract.json` giữ brief chung. Route là **builtin imagegen (`art_source: host_image`, `host-image_gen`)**; công cụ không công bố model hoặc chi phí. Không thêm asset từ Warcraft hay nguồn tải ngoài.

## Gói web

- [Gói ZIP](../assets/sprites/linh-huyen-stylized/linh-huyen-web-sprites.zip).
- [Bảng mẫu 20 nhân vật](../assets/sprites/linh-huyen-stylized/masters-review.png).
- [Thông tin gói và hash](../assets/sprites/linh-huyen-stylized/package.json).
- Ví dụ Thiên Lý Nhãn: [atlas WebP](../assets/sprites/linh-huyen-stylized/h001/web/atlas.webp), [JSON](../assets/sprites/linh-huyen-stylized/h001/web/atlas.json), [walk](../assets/sprites/linh-huyen-stylized/h001/web/previews/walk.webp), [attack](../assets/sprites/linh-huyen-stylized/h001/web/previews/attack.webp).

Mỗi thư mục `<heroId>/web/` có atlas PNG/WebP, manifest, chân dung, bảng khung trên nền tối/sáng, preview động và QA. Atlas **1536×1536**, ô **256×256**, anchor **[128,224]**, alpha thẳng, sampling linear. Ô được sắp theo từng hướng, mỗi hướng 9 ô: idle → walk0–3 → attack0–3.

Walk lặp bốn khung **150ms** (chu kỳ 600ms); attack một lần **150/100/100/150ms**. Runtime chuẩn hóa attack vào cửa sổ phản ứng chiến đấu. Cast giữ pose lấy đà trước khi phát phần đánh/thu thế. Idle giữ đúng một ảnh, không nhún hay chạy chu kỳ. Hit/death dùng idle làm hình dự phòng, với luồng phản ứng/dọn actor hiện có. Camera-relative facing dùng cùng phép chiếu LH đã sửa cho Bàn Cổ.

`pack-sprites.py` giữ phần vũ khí bằng phân vùng ownership, key magenta đối với sheet opaque, giữ alpha gốc đối với master, downscale premultiplied và dùng một registration cho mỗi hướng/action. Mỗi family dùng pose chuẩn để giữ chiều cao cơ thể; cúi người/thu vũ khí không được tự fit từng khung. Nếu motion envelope quá rộng, cả bộ nhân vật giảm cùng một hệ số. `publish-sprites.py` yêu cầu đủ 20 bộ, đủ 36 khung/12 clip và xử lý cảnh báo mép nguồn trước khi chép runtime.

Runtime dùng `hero-stylized-<heroId>.webp` và manifest cùng tên trong `apps/client/public/assets/`; các file atlas cũ giữ để đối chiếu. Chân dung dùng `hero-portrait-<heroId>.webp`. `stylized-motion.ts` định nghĩa frame/timing, `visual-sprites.ts` neo chân bằng geometry trước billboarding, `visual-materials.ts` tải texture và `hero-portraits.ts` hiển thị ảnh mới. VFX và sát thương vẫn do event/snapshot hiện có quyết định.

`stylized-layout.json` được publisher tạo từ kích thước thật của từng bundle. Renderer bù hệ số thu nhỏ motion envelope khi đặt chiều cao plane: tướng có vũ khí dài không bị bé cơ thể hơn tướng khác chỉ vì cần chừa thêm khoảng trống trong ô ảnh. Không chỉnh riêng kích thước từng pose.

Log: `sprite.stylized-config`, các log tải/fallback motion và `portrait.stylized-ready/fallback`. Dùng `?debug=1` hoặc `window.__thienDaoDebug()` để truy lỗi.

## Giới hạn và nghiệm thu

Bốn keyframe mỗi hành động là chuyển động thưa. Ảnh tạo sinh có thể thay đổi nét nhỏ giữa các pose; chất lượng diễn xuất, tiếp đất, nối vòng, độ đọc và FPS phải được kiểm tra trong game. Không lấy số lượng frame hoặc QA hình học làm bằng chứng chuyển động đã mượt.

Agent không chạy game, test, typecheck hoặc build theo AGENTS. Người dùng chạy:

```powershell
npm run typecheck
npx vitest run apps/client/test/stylized-motion.test.ts apps/client/test/hero-motion.test.ts apps/client/test/pangu-motion.test.ts
npm run build
```

Sau khi mở lại game: thử đủ 20 tướng; đứng im, đổi trái/phải/trước/sau, đi liên tục, dừng, đánh và tung chiêu. Kiểm tra chân không trượt, vũ khí không mất mép, không đổi cỡ giữa idle/walk/attack, hướng đúng khi xoay camera, thanh máu không bị che; thử nền sáng/tối, đông quân và chế độ giảm chuyển động. Gửi ảnh/video và log nếu phát hiện khung sai.
