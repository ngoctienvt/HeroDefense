# Phase 03 — Mesh đảo trong Blender

## Mục tiêu

Dựng mesh đảo chính và đảo phụ bản theo phong cách stylized: mặt trên phẳng chứa vùng đi được, vách đá cắt khối lớn, đá và rễ treo bên dưới. Đọc rõ ở bán kính camera 16–75.

## Kích thước (đơn vị world = mét Blender)

- **Đảo chính:** mặt trên phẳng tại y = 0 phủ `ARENA` cộng lề 2, tức x −46..46, z −38..30. Viền cỏ/đá rộng khoảng 3–5 bao quanh, rồi tới mép vực. Mép mở rộng ra để chứa cổng quái (z −39, x tối đa ±35 với 4 làn) và nền Linh Trụ (z 29–43). Đường viền ngoài hữu cơ, không vuông.
- **Đảo phụ bản:** mặt trên tròn bán kính `DUNGEON_ISLET.radius` + 2, viền cỏ 3, vách ngắn hơn.
- **Vách:** sâu khoảng 18–28 bên dưới, thu nhỏ dần thành chóp; ba đến năm đá vệ tinh lơ lửng quanh đảo, đặt ngoài tầm click.

## Cách dựng

1. Script `assets/terrain/build-floating-island.py` chạy bằng Blender 5.2 ở chế độ nền. Script sinh mặt trên phẳng từ đường viền, đùn vách bằng bevel nhiều tầng và displacement nhiễu tần số thấp. Dùng flat shading theo mặt để vách có các mặt cắt lớn. Script là nguồn, `.blend` là bản làm việc đã chỉnh tay.
2. UV: mặt trên là một UV phẳng theo world (x, z) để phase 04 tile texture theo world. Vách dùng UV riêng.
3. Màu vách: bake cel ramp ba bậc (sáng / trung / tối) theo hướng nắng phase 01, cộng AO, vào texture 1024–2048 vẽ tay. Vật liệu runtime gần unlit để không phụ thuộc ánh sáng realtime.
4. Mặt trên tách mesh riêng (`island-top`) để phase 04 gán shader nền đất; viền cỏ có thể là mesh dải riêng (`island-rim`) với mép răng cưa cel.
5. Xuất `island-main.glb` và `island-dungeon.glb` (Draco off, ≤ 15k tam giác mỗi đảo), texture WebP, vào `apps/client/public/assets/terrain/`.

## Loader

Thêm `@babylonjs/loaders@9.30.0` (khớp core), chỉ import plugin glTF. Nếu không muốn thêm dependency, script xuất JSON vertex (positions/normals/uvs/indices) và client dựng bằng `VertexData`. Chốt khi bắt đầu phase.

## Đầu ra

- `assets/terrain/build-floating-island.py`, `floating-island.blend`, render preview top-down và góc camera thật.
- `apps/client/public/assets/terrain/island-main.glb`, `island-dungeon.glb`, texture vách.
- Hằng số mép đảo cho test phase 02.

## Kiểm tra

Render preview ở góc camera thật, với sprite đặt tại mép `ARENA`: viền thấy rõ, không có vách nào nhô vào trong vùng đi được.
