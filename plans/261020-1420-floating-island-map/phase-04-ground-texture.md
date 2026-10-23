# Phase 04 — Texture nền đất stylized và shader

## Hiện trạng

`xianxia-valley-ground.webp` 1254 px kéo căng trên mặt 136 × 120, khoảng 9 px mỗi đơn vị. Ảnh bán thực tế tông rêu xám, nhiều chi tiết vụn (hoa, nứt), nên vùng đi được không tách khỏi viền và sprite bị lẫn.

## Thiết kế

Hai lớp, trộn trong một `ShaderMaterial` nhỏ (theo mẫu `visual-kit-shaders.ts`):

1. **Tile chi tiết:** texture đất vẽ tay stylized 1024 px, liền mạch, lặp mỗi khoảng 10 đơn vị world. Mảng màu lớn, vài viên đá và vệt cel rõ, không hoa lá vụn. Có biến thể thứ hai xoay hoặc đổi tông để tránh lặp lộ.
2. **Mask vĩ mô** 512 px phủ cả đảo (UV world):
   - R: vệt mòn sáng dọc route quái. Sinh từ `enemyRoute` của 1–4 làn bằng script, để vẽ đúng route thật; vẽ phiên bản gộp mọi làn hoặc chọn theo số làn khi dựng.
   - G: vùng cỏ viền, chuyển sang mép cel rõ ở biên `ARENA` + 2.
   - B: mảng tối/sáng tần số thấp để phá đều.

Shader: `albedo = mix(dirt, dirtWorn, R) → mix(…, grass, G) * (0.9 + 0.2 * B)`, cộng một bước cel đơn giản theo hướng nắng nếu cần. Không specular. Có fallback màu đặc khi texture lỗi, giữ log `terrain.texture-fallback`.

## Tạo asset

- Tạo tile bằng công cụ tạo ảnh theo prompt và palette phase 01. Làm liền mạch bằng offset + sửa đường nối, rồi kiểm tra bằng ImageMagick (`-roll` 50%) và xem ở dạng lặp 3 × 3.
- Xuất WebP, lưu master, prompt và bản sửa trong `assets/terrain/ground/`.
- Ghi nguồn và route tạo ảnh vào `docs/floating-island-map.md`.

## Kiểm tra (xem ảnh, không chỉ số liệu)

- Ảnh chụp mẫu ở góc camera thật với sprite tướng/quái và VFX lửa/nước/băng: nền không nuốt silhouette, VFX cộng sáng không thành mảng trắng.
- Không thấy lặp tile rõ ở bán kính 75.
- Vệt route khớp đường quái thực tế với 1, 2, 3 và 4 làn.
