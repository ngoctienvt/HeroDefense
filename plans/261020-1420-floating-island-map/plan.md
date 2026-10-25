# Bản đồ đảo lơ lửng stylized

- **Trạng thái:** đã sửa nguồn cả 6 phase (20-10-2026); chờ người dùng chạy test/build và nghiệm thu hình ảnh theo phase 06. Phần ánh sáng thực hiện bằng màu baked + shader, không dùng DirectionalLight; asset sinh bằng script, không dùng ảnh AI.
- **Nhánh:** `feat/hero-vfx-kit` (đang có nhiều thay đổi chưa commit; không đụng các file VFX đó ngoài phần ghi trong phase).

## Mục tiêu

Chiến trường là một hòn đảo đá lơ lửng giữa trời, có mặt trời chiếu sáng, theo phong cách stylized vẽ tay đồng bộ với sprite tướng (cel shading, mảng màu lớn, ít chi tiết vụn). Vùng tướng và quái đi được là nền đất rõ ràng, tách khỏi viền cỏ/đá và mép vực. Người chơi nhìn là biết chỗ nào đi được và có thể kiting tới sát mép mà không bị lỗi lệnh.

## Quyết định đã chốt (người dùng, 20-10-2026)

1. **Giữ nguyên kích thước `ARENA`** (x −44..44, z −36..28), làn, route, vị trí triển khai và tốc độ quái. Không gian kiting được cải thiện bằng cách làm cả vùng đi được dễ đọc và cho click ngoài mép được kẹp về mép đảo. Đã chấp nhận rằng khi chơi 3–4 người, các làn vẫn cách nhau 20, nhỏ hơn hai lần tầm phát hiện quái (8–10).
2. **Mỗi phụ bản boss có một đảo nhỏ riêng**, kèm biên server riêng. Hiện tại `insideArena` trả `true` cho mọi zone ≠ 0, nên trong phụ bản quân đi được ra ngoài mép.
3. **Dựng đảo bằng Blender và texture vẽ tay.** Giữ file `.blend` và script nguồn.

## Ràng buộc kỹ thuật

- Mặt đi được phẳng ở y = 0 và phủ hết `ARENA` cộng lề khoảng 2. Actor, decal, `groundEffects` và VFX đều giả định y = 0. Độ cao, vách và đá chỉ đặt ngoài `ARENA`.
- Cổng quái (z −39) và Linh Trụ (z 31–40) nằm ngoài `ARENA` nhưng phải nằm trên đảo, với mọi số làn từ 1 đến 4. Terrain được dựng lại khi số làn đổi (`battlefield.ts:443`).
- Nền đất có độ sáng trung bình và ít tần số cao, để sprite và VFX cộng sáng vẫn đọc rõ (xem memory: VFX không che nhân vật).
- Gameplay vẫn thuộc server. Client chỉ hiển thị, kẹp điểm click và ghi log `terrain.*`.
- Agent không chạy build, test hay game; người dùng kiểm tra theo phase 06.

## Các phase

| # | Phase | Phụ thuộc | File chính |
|---|-------|-----------|------------|
| 01 | [Art direction và tham chiếu](phase-01-art-direction.md) | — | `docs/floating-island-map.md` |
| 02 | [Biên server cho đảo phụ bản và kẹp click](phase-02-zone-bounds.md) | — | `battlefield-layout.ts`, `commands.ts`, `unit-pathing.ts`, `crowd-movement.ts` |
| 03 | [Mesh đảo trong Blender](phase-03-blender-island.md) | 01 | `assets/terrain/` |
| 04 | [Texture nền đất stylized và shader](phase-04-ground-texture.md) | 01 | `assets/terrain/`, `visual-terrain-ground.ts` |
| 05 | [Bầu trời, mặt trời, biển mây](phase-05-sky-sun.md) | 01 | `visual-terrain-sky.ts` |
| 06 | [Tích hợp client, camera, QA](phase-06-client-integration.md) | 02–05 | `visual-terrain*.ts`, `battlefield.ts` |

Phase 02 và chuỗi 03/04/05 độc lập về file, có thể chạy song song sau phase 01.

## Tiêu chí nghiệm thu

- Ở góc camera mặc định và ở bán kính lớn nhất, toàn bộ `ARENA` hiện là nền đất liền mạch. Mép vùng đi được có viền cỏ/đá rõ, phía ngoài là vực và mây.
- Không có prop chặn tầm nhìn hay hứng click trong `ARENA`. Click vào vách, mây hoặc trời được kẹp về điểm gần nhất trong vùng đi được; server không trả "Vị trí ngoài đấu trường" khi kiting sát mép.
- Trong phụ bản, quân và boss không ra khỏi đảo nhỏ, kể cả khi bị đẩy lùi hoặc dịch chuyển. Click ngoài đảo nhỏ bị kẹp.
- Có mặt trời nhìn thấy được, hướng nắng khớp rim light trên sprite và hướng bóng blob. Không còn fog xanh xám phủ cảnh.
- Nền tối và nền sáng đều giữ được độ đọc của sprite, thanh máu và VFX lửa/nước/băng hiện có.
- Reduced motion dừng mây trôi. Đổi số làn hoặc vào/ra phụ bản không làm rò mesh hay texture (log `terrain.built` / `terrain.disposed`).
- Test hồi quy mới cho biên zone, kẹp click và layout đảo đều pass khi người dùng chạy.

## Rủi ro

- Texture AI dễ ra kiểu bán thực tế giống nền cũ → phase 01 chốt palette và phase 04 duyệt ảnh ở cỡ hiển thị thật trước khi tích hợp.
- Thêm `@babylonjs/loaders` làm tăng bundle → chỉ import plugin glTF; phương án dự phòng là xuất JSON vertex từ Blender (phase 03).
- Ánh sáng hướng làm sprite billboard tối hoặc lệch màu → sprite giữ vật liệu hiện có; DirectionalLight chỉ tác động lên mesh đảo (`includedOnlyMeshes`).

## Câu hỏi còn mở

- ~~Hướng nắng~~ Đã chốt: trên-trái màn hình (+x, −z). Cần xác định từ rim light trong master sprite ở phase 01. Nếu master không nhất quán, người dùng chọn hướng.
- Giờ trong ngày (trưa trắng vàng hay chiều vàng cam): phase 01 trình bày hai bản concept để người dùng chọn.
