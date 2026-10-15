"""
Tool tự động xử lý sprite sheet nhân vật cho game Thiên Đạo:
1. Đọc ảnh thô từ AI generation (lưới 4 cột x 7 hàng).
2. Tách nền trắng với thuật toán Soft-edge Alpha & Defringe (khử halo trắng).
3. Tìm bounding box và căn giữa (horizontal centering), căn chân tiếp đất (foot pivot alignment).
4. Đóng gói vào lưới chuẩn 1024x1792 (256x256 mỗi ô).
5. Xuất đồng thời PNG master vào content/art-source/ và WebP vào apps/client/public/assets/.
"""

import sys
import os
import argparse
import numpy as np
from PIL import Image

def remove_white_bg(cell_img: Image.Image, threshold: float = 6.0, ramp: float = 28.0) -> Image.Image:
    """Tách nền trắng, khử halo và tạo kênh alpha chuyển tiếp mềm."""
    arr = np.array(cell_img, dtype=float)
    dist = np.sqrt(((255.0 - arr[:, :, :3]) ** 2).sum(axis=2))
    alpha = np.clip((dist - threshold) / ramp, 0.0, 1.0)
    for c in range(3):
        arr[:, :, c] = np.clip((arr[:, :, c] - (1.0 - alpha) * 255.0) / np.maximum(alpha, 1e-4), 0.0, 255.0)
    arr[:, :, 3] = alpha * 255.0
    return Image.fromarray(arr.astype(np.uint8))

def process_sheet(input_path: str, hero_id: str, row_gaps=None, col_gaps=None):
    raw = Image.open(input_path).convert('RGBA')
    w, h = raw.size
    print(f"Xử lý sheet cho {hero_id}: kích thước gốc {w}x{h}")
    
    # Mặc định chia 7 hàng nếu không chỉ định gap
    if not row_gaps:
        row_h = h / 7.0
        row_cuts = [int(i * row_h) for i in range(8)]
    else:
        row_cuts = row_gaps

    # Mặc định chia 4 cột nếu không chỉ định gap
    if not col_gaps:
        col_w = w / 4.0
        col_cuts = [int(i * col_w) for i in range(5)]
    else:
        col_cuts = col_gaps

    target_w, target_h = 256, 256
    full_sheet = Image.new('RGBA', (target_w * 4, target_h * 7), (0, 0, 0, 0))

    for r in range(7):
        y0, y1 = row_cuts[r], row_cuts[r + 1]
        for c in range(4):
            x0, x1 = col_cuts[c], col_cuts[c + 1]
            cell = raw.crop((x0, y0, x1, y1))
            cell_rgba = remove_white_bg(cell)
            
            bbox = cell_rgba.getbbox()
            if bbox:
                char_crop = cell_rgba.crop(bbox)
                cw, ch = char_crop.size
                canvas = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
                
                # Giới hạn chiều cao tối đa
                max_avail_h = target_h - 24
                if ch > max_avail_h:
                    scale = max_avail_h / ch
                    cw = int(cw * scale)
                    ch = int(ch * scale)
                    char_crop = char_crop.resize((cw, ch), Image.Resampling.LANCZOS)
                
                px = (target_w - cw) // 2
                py = (target_h - 16) - ch
                canvas.paste(char_crop, (px, py), char_crop)
                full_sheet.paste(canvas, (c * target_w, r * target_h), canvas)

    os.makedirs('content/art-source', exist_ok=True)
    os.makedirs('apps/client/public/assets', exist_ok=True)
    
    png_path = f'content/art-source/hero-motion-{hero_id}.png'
    webp_path = f'apps/client/public/assets/hero-motion-{hero_id}.webp'
    
    full_sheet.save(png_path)
    full_sheet.save(webp_path, 'WEBP', quality=95, method=6)
    print(f"-> Hoàn tất xuất: {png_path} và {webp_path} ({full_sheet.size})")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Sprite Sheet Auto-processor")
    parser.add_argument('input', help="Đường dẫn ảnh nguồn")
    parser.add_argument('hero_id', help="Mã tướng (vd: h006, h001)")
    args = parser.parse_args()
    process_sheet(args.input, args.hero_id)
