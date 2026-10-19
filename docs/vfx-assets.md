# Nguồn nguyên liệu VFX

Thư viện này là nguyên liệu để làm hiệu ứng Babylon.js; chỉ những texture được liệt kê ở mục tích hợp mới được game tải. Các hiệu ứng đang chạy nằm ở `apps/client/src/visual-effects.ts`, `visual-tier-skills.ts` và `visual-fire*.ts`; texture runtime nằm trong `apps/client/public/assets/`.

## Gói đã tải

| Gói | Nguồn và giấy phép | Bản lưu trong dự án | Dùng cho |
| --- | --- | --- | --- |
| Particle Pack 1.1 | [Kenney](https://kenney.nl/assets/particle-pack), CC0 | `assets/vfx-source/kenney_particle-pack.zip`; `assets/vfx-library/particle-pack/` | Lõi sáng, hạt phép, tia chém, vệt bay, khói nhỏ. |
| Smoke Particles | [Kenney](https://kenney.nl/assets/smoke-particles), CC0 | `assets/vfx-source/kenney_smoke-particles.zip`; `assets/vfx-library/smoke-particles/` | Khói, bụi, chớp và các khung nổ. |
| Light Masks 1.0 | [Kenney](https://kenney.nl/assets/light-masks), CC0 | `assets/vfx-source/kenney_light-masks-1.0.zip`; `assets/vfx-library/light-masks-1.0/` | Vòng pháp trận, vùng sáng, nón sáng, mask. |
| 2D Spell Effects | [Mikodrak / Martin Jelinek](https://opengameart.org/content/2d-spell-effects), CC0 | `assets/vfx-source/oga-mikodrak-spell-effects.zip`; `assets/vfx-library/mikodrak-spell-effects/` | Chuỗi cầu sét và cầu lửa 20 khung để tham khảo nhịp hoặc dùng làm lớp phụ. |
| Spell animation spritesheets | [Viktor Hahn](https://opengameart.org/content/spell-animation-spritesheets), **CC BY 4.0** | `assets/vfx-source/oga-viktor-hahn-spell-animations.zip`; `assets/vfx-library/viktor-hahn-spell-atlases/` | Atlas đóng băng, lửa, cầu lửa xanh và chớp. Dùng trong game phải ghi công. |
| Lightning animation | [Calinou](https://opengameart.org/content/lightning-animation), CC0 | `assets/vfx-source/oga-calinou-lightning-animation.zip`; `assets/vfx-library/calinou-lightning/` | 11 khung tia sét 1024×512; bản thư viện đã chuyển nền đen thành alpha. |
| Animated particle effects #2 | [para](https://opengameart.org/content/animated-particle-effects-2), CC0 | `assets/vfx-source/oga-para-animated-particles-2.zip`; `assets/vfx-library/para-particles/` | Atlas hạt lửa và chớp phép 64 khung, phong cách phẳng. |
| Snow flake | [mkwong98](https://opengameart.org/content/snow-flake), CC0 | `assets/vfx-source/oga-mkwong98-snowflake.png`; `assets/vfx-library/mkwong98-snowflake/` | Bông tuyết 128×128 có alpha cho hạt rơi và va chạm. |

Tải ngày 14-10-2026. Ba gói Kenney có `LICENSE.txt` lấy nguyên từ ZIP. Mỗi gói OpenGameArt đã trích có `SOURCE.txt`; gói Viktor Hahn còn có `license.txt` gốc. CC0 cho phép chỉnh sửa và dùng thương mại mà không bắt buộc ghi công; CC BY 4.0 yêu cầu ghi công Viktor Hahn, nguồn, giấy phép và thay đổi khi phân phối. ZIP là bản gốc đầy đủ, còn `vfx-library` chỉ là nhóm texture chọn sẵn. Không dùng URL web làm đường dẫn texture runtime.

SHA-256 của ZIP: Particle `B631D4B07F7002549FDCF155F01141AD482F79F3440E4E301EED49CE5F1D8958`; Smoke `97A1D09C66E4FD6C247C8EA87F84C0CC59CAAECEAE19414C995AFB1616A1E1C9`; Light Masks `E1238694D7E49046E42D67F2975BE0217861C7CC9BC358383A8E5E583645004F`.

SHA-256 nguồn mới: Mikodrak `8D0C09487AB0337867E90333E9C26E455760B31414BF503BEDCDE94B0CDDBC30`; Viktor Hahn `A41ABD0F6BF3727B084C68F6BB4685C8B946B3D1D9DEF38A3B43EB28E6DC684F`; Calinou `FF46352030228ABAE20DEB44AD43DDF085244DD55AC1067E9FFC20B61A1485B7`; para `469676F3FC08509E4EC824147D179A51A9A71C380A3D0FD142CF8E30355F50F8`; snowflake `F86D5F553C8B9E97D23DA1FD3FD29398EDA954D9051C5D8A71BF72A8EF75E116`.

## Texture đã tích hợp vào VFX hỏa

| Texture runtime | PNG nguồn | Vai trò |
| --- | --- | --- |
| `apps/client/public/assets/vfx-fire-flash.webp` | `assets/vfx-library/smoke-particles/flash04.png` | Lóe ngắn đúng điểm quả cầu lửa chạm mục tiêu. |
| `apps/client/public/assets/vfx-fire-smoke.webp` | `assets/vfx-library/smoke-particles/blackSmoke06.png` | Khói nổi lên sau vụ nổ chính. |
| `apps/client/public/assets/vfx-fire-shockwave.webp` | `assets/vfx-library/light-masks-1.0/ring_a.png` | Vòng xung kích trên mặt đất, chỉ cho chiêu hỏa có bán kính. |

Ba texture được chọn từ các gói Kenney CC0 tải ngày 14-10-2026 ở bảng trên; bản giấy phép nguyên gói nằm tại `assets/vfx-library/smoke-particles/LICENSE.txt` và `assets/vfx-library/light-masks-1.0/LICENSE.txt`. WebP kích thước 256×256, tổng khoảng 27 KB. `ring_a` gốc là ảnh xám không có alpha; độ sáng được chuyển thành alpha và màu RGB đặt trắng để nhuộm màu ở Babylon.js. Các lớp này bổ sung cho flipbook nổ 16 khung có sẵn, dùng pool tối đa 24 mặt phẳng và không phát khi giảm chuyển động. Chưa nghiệm thu hình ảnh hoặc FPS trong game sau lần tích hợp này.

## Texture tích hợp cho tướng Linh và Huyền

`vfx-magic_01.webp`, `vfx-magic_03.webp`, `vfx-slash_01.webp`, `vfx-twirl_01.webp`, `vfx-spark_01.webp`, `vfx-smoke_03.webp`, `vfx-trace_01.webp` và `vfx-circle_03.webp` trong `apps/client/public/assets/` được thu nhỏ từ các PNG cùng tên tại `assets/vfx-library/particle-pack/` (Kenney Particle Pack 1.1, CC0, tải ngày 14-10-2026). Giấy phép gốc: `assets/vfx-library/particle-pack/LICENSE.txt`; URL nguồn ở bảng gói phía trên. Mỗi ảnh WebP 256×256 giữ alpha. `apps/client/src/visual-tier-profiles.ts` chọn màu Ngũ Hành cho đòn đánh thường; `visual-tier-skills.ts` lấy nguyên tố và bán kính từ `content/catalog.ts` đang chạy để dựng 12 tuyệt kỹ Huyền theo event/mục tiêu thật. `visual-tier-particles.ts` dùng lại 4 emitter tia lửa và 3 emitter khói có texture, mỗi emitter giới hạn hạt; `visual-effects.ts` tái sử dụng mặt phẳng, giới hạn hiệu ứng, hiển thị trạng thái và Hoa Ăn Thịt từ snapshot; `battlefield.ts` dọn hiệu ứng khi đổi trận/khu vực. Ở chế độ giảm chuyển động, giữ tín hiệu trúng đích và phạm vi ngắn. Chưa nghiệm thu chất lượng hình ảnh hoặc FPS trong game sau lần đồng bộ này.

Các dấu hiệu nhận biết theo `content/catalog.ts`: Kim Tra dựng chuông/khiên kim cho tối đa hai đồng minh; Mộc Tra tự vào Cuồng Vũ xanh Mộc; Thiết Phiến quạt bão cát trên một vùng; Hồng Hài Nhi quét thương lửa 360°; Lã Động Tân gọi cự kiếm rơi và vùng cháy; Cự Linh chấn đất rồi bọc khiên kim; Mẫu Đơn truyền sinh khí và cánh hoa cho tối đa bốn đồng minh; Hà Bá tạo thủy lao bán kính 4,8; Vô Thường bắn tỉa một mục tiêu; Mạnh Bà nối tối đa bốn mục tiêu với dây còn hiện theo trạng thái Đồng Mệnh; Nhiếp Tiểu Thiến chữa ba đồng minh, hồi dư có Khiên Băng; Bảo Quả Tử ném hạt và triệu hồi Hoa Ăn Thịt có vòng phá giáp bán kính 3. Các hoạt ảnh sau va chạm chỉ phản ánh kết quả server đã xác nhận, không quyết định sát thương ở client.

Thủy Lao của Hà Bá dùng `visual-water.ts`: tuyệt kỹ phát flipbook nước dựng trong Blender 5.2 bằng SpriteManager; xoáy mặt nước dạng nét trắng cũ đã bỏ khỏi tuyệt kỹ và đòn ngắn. Nguồn biên tập là `assets/vfx-source/haba-water-prison/haba-water-prison.blend`; mã dựng/render là `assets/vfx-source/haba-water-prison-blender.py` và `haba-water-prison-render.py`. Atlas runtime `apps/client/public/assets/vfx-haba-water-prison.webp` có 16 khung 4×4, mỗi khung 256×256, khoảng 310 KB. Đây là mesh nước/bọt tạo thủ công trong Blender, không phải mô phỏng chất lỏng; không dùng asset ngoài. Đầu chiêu dựng tường nước, giữa chiêu lặp các khung xoáy, cuối chiêu sụp xuống; các đòn nước ngắn còn lớp nước đọng, bọt và hạt bắn. Vùng nước theo event chiêu `skill-h00G`, bán kính 4,8, tồn tại 3,5 giây; chế độ giảm chuyển động hiện vùng nước ngắn. Số vùng đồng thời giới hạn 4 và được thu hồi khi đổi trận/khu vực. Người dùng vẫn cần kiểm tra trực tiếp trong game để đánh giá độ thật, độ che mục tiêu và FPS.

Mười một tướng Huyền còn lại dùng 14 flipbook RGBA tự dựng trong Blender cho chuông, dây leo, bão cát, kiếm lửa, khiên, hoa, phát bắn, dây linh hồn, băng, hoa ăn thịt, sóng âm, hạt, búa và vòng lửa Hồng Hài Nhi. Nguồn biên tập nằm tại `assets/vfx-source/huyen-flipbooks/{kind}/{kind}.blend`, script chung `assets/vfx-source/huyen-flipbooks/author.py`; atlas runtime `apps/client/public/assets/vfx-huyen-{kind}.webp` gồm 12 khung 4×3, mỗi khung 256×256. Script `tools/vfx/blender-mcp-run.py` gọi Blender MCP để tạo cảnh và render; `tools/vfx/pack-huyen-flipbooks.ps1` đóng atlas. `visual-tier-motifs.ts` phát SpriteManager, giới hạn 32 motif đồng thời, tái sử dụng sprite và rút ngắn khi giảm chuyển động. Năm dấu trạng thái dùng khung tĩnh WebP cùng nguồn. Các vòng tròn trang trí không gắn với vật chất chiêu đã được bỏ khỏi atlas; vòng shockwave runtime chỉ dùng để báo vùng va chạm do event xác nhận. Đây là geometry, vật liệu và hạt tự dựng, không phải mô phỏng vật lý hay footage; một số silhouette còn giống đạo cụ khi xem riêng một khung. Vật chất và lực va chạm trong game phụ thuộc các lớp lửa/khói/bụi/hạt/xung lực runtime trong `visual-tier-skills.ts`. Chưa nghiệm thu độ thật, độ đọc được hoặc FPS trên chiến trường; người dùng cần xem trong game trước khi coi là hoàn tất chất lượng hình ảnh.

Tier 3–4 dùng thêm chín flipbook Blender tự dựng: `coin`, `tower`, `dragon`, `rock`, `peacock`, `judgement` (chữ 死), `seal` (chữ 印), `wheel`, `hound` (thiên khuyển của h00U). Nguồn `.blend`, script và 12 PNG mỗi motif giữ tại `assets/vfx-source/huyen-flipbooks/`; atlas WebP 4×3 ở `apps/client/public/assets/vfx-huyen-{kind}.webp`. `tools/vfx/pack-huyen-flipbooks.ps1 -Kinds coin,tower,dragon,rock,peacock,judgement,seal,wheel,hound` đóng riêng nhóm này. Chữ Hán trong nguồn Blender dùng font `C:/Windows/Fonts/msyh.ttc`; atlas runtime không tải font. Tia sét Tier 4 `vfx-tier34-lightning.webp` (12 ô, 256×256; khung 11 lặp để đủ layout) được xoay, thu nhỏ và đóng từ 11 PNG alpha của Calinou bằng `tools/assets/pack-tier34-lightning.py`; nguồn [Calinou, CC0](https://opengameart.org/content/lightning-animation), tải 14-10-2026, giấy phép/ghi chú tại `assets/vfx-library/calinou-lightning/SOURCE.txt`. `visual-tier34-skills.ts` ghép lớp hình chính, va chạm và dư âm theo event `tier3-tier4-*`; `visual-effects.ts` giới hạn/pool và log `visual.tier34.*`. Chưa có kết quả nghiệm thu độ đọc, nhịp và FPS trong game.

## Cộng Công (h01G) — Nộ Xúc Bất Chu Sơn

Bộ VFX riêng, không dùng lại flipbook Thủy Lao của Hà Bá. Lớp có hình dạng ổn định dựng bằng **shader GLSL runtime** trong `apps/client/src/visual-kit-shaders.ts` (Babylon `ShaderMaterial`, toon 3 bậc, bảng màu Hắc Thủy; hạ tầng dùng chung xem [vfx-kit.md](vfx-kit.md)). Chỉ những gì đổi hình thật mới là **flipbook Blender stylized**:

| Lớp | Cách dựng | Nhịp / dữ liệu |
|---|---|---|
| Nền nước báo trước bán kính `waveRadius` 7,5 + xoáy dưới chân | shader `kitGround` | trong windup 0,8s (event `cast` tại thân tướng) |
| Bất Chu Sơn mọc → nứt sáng → gãy đổ | flipbook `vfx-congcong-buzhou.webp`, 16 khung 4×4 @384 | mọc + nứt trong windup; gãy khi có event `ability skill-h01G` |
| Tường sóng thần dâng → cuộn → đổ ra ngoài | mesh vòng lofted, shader `kitWall` biến dạng profile trên GPU | nở tới đúng 7,5 trong 0,5s, đổ tới 0,78s, rút ở 1,05s |
| Nước bắn khi núi gãy và khi cột nước khiên chạm đồng minh | flipbook `vfx-congcong-splash.webp`, 12 khung 4×3 @256 | 1 lớn ở chân núi; sóng đổ dùng nước trắng trong shader + giọt nước (vương miện dọc mép trông như tháp lơ lửng nên đã bỏ) |
| Nền băng đen | shader `kitCrust` (ô Voronoi, vết nứt, viền băng, vỡ theo ô) | lan theo sóng, giữ đúng `freezeSeconds` 2,2s, vỡ 0,35s cuối |
| Lồng băng trên quái bị đóng băng | flipbook `vfx-congcong-icecage.webp`, 12 khung 4×3 @256 | chỉ quái trong `targets` của sóng **và** snapshot còn `frozen`; vỡ khi hết |
| Cột nước tới đồng minh nhận khiên | quả cầu shader `kitShell` bay vòng cung + giọt nước + splash nhỏ | mỗi event `shield-h01G` |
| Khiên Hắc Thủy | cầu shader `kitShell` (fresnel + dòng xoắn) | theo snapshot `ward.kind === 'black-water'`; vỡ khi hết |
| Vòng Hắc Thủy nội tại bán kính `auraRadius` 3,8 | shader `kitGround` dạng dải vòng (`uBand`), viền bọt + đường viền tối để đọc được trên nền sáng | khi Cộng Công ra sân trong khu vực đang xem |
| Đòn quét thường `frontal_cleave` 3,8 | shader `kitSlash` (lưỡi nước trăng khuyết quét phải → trái), nâng ngang thắt lưng y=1, `depthFunction = ALWAYS` để không bị sprite tướng che khi đánh về phía xa camera | mỗi event `trait-h01G`; hướng lấy từ `direction` của server, thiếu thì suy từ tướng → điểm event, không bao giờ dùng trục cố định |
| Giọt nước | 1 `ParticleSystem` dùng chung, texture `vfx-circle_03.webp` (Kenney CC0 đã có) | cap 520 hạt, hàng đợi 260 |

Nguồn flipbook: `assets/vfx-source/congcong/author.py` (Blender 5.2, chạy `blender -b --factory-startup -P assets/vfx-source/congcong/author.py -- buzhou splash icecage`), mỗi kind có `.blend` chỉnh sửa được, `frames/` RGBA và `contact-sheet.png`. Phong cách: Shader to RGB + ramp 3 bậc cứng, rim fresnel, viền inverted hull, mặt đất holdout để che phần dưới đất; camera ortho cùng góc beta 0,84 với chiến trường. Núi là một khối liền nhiễu được cắt chéo bằng `bisect_plane`, mặt gãy phát sáng xanh lục lam. Đóng atlas bằng `tools/vfx/pack-flipbooks.ps1 -Atlas congcong-buzhou,congcong-splash,congcong-icecage` (đọc `visual-kit-atlases.json`; helper Blender dùng chung ở `assets/vfx-source/kit/vfx_kit.py`) (WebP lossless, kiểm tra kích thước/kênh alpha): buzhou 1536×1536 ~661 KB, splash 1024×768 ~187 KB, icecage 1024×768 ~170 KB. Toàn bộ là geometry/shader tự dựng của dự án, không dùng asset ngoài mới.

Module: `visual-congcong.ts` (điều phối, aura, cleave), `visual-congcong-ultimate.ts`, `visual-congcong-status.ts` (khiên, cột nước, lồng băng), `visual-congcong-timeline.ts` (hàm thời gian thuần, dựng trên `visual-kit-timeline.ts`, có test `apps/client/test/congcong-vfx.test.ts`), cùng hạ tầng dùng chung `visual-kit-*` (pool flipbook tải lười, spray, layer, registry), `battlefield-congcong.ts` (theo dõi quái bị sóng đóng băng, phát lại debug). Cap: 4 tuyệt kỹ, 40 splash, 32 lồng băng, 20 khiên, 12 cột nước, 4 aura, 8 lưỡi quét; dọn hết khi đổi khu vực/trận. Reduced motion: giữ vòng báo trước, mảng nước ngắn, nền băng tĩnh, lồng băng tĩnh, khiên; bỏ núi, tường sóng, splash, giọt nước, xoáy và hit-stop. Hit-stop tuyệt kỹ 0,09s. Log: `visual.congcong.{cast,impact,crash,shield,cleave}` và `visual.kit.{asset.*,pool.cap,shader.error,registry.prepare,replay}`.

Nhân vật luôn phải rõ: sprite tướng/quái là mesh trong suốt không ghi depth, sắp theo `alphaIndex = round(độ sâu × 100)` (`visual-actors.ts`). Lớp trong suốt nào vẽ sau sẽ phủ màng lên nhân vật. Vì vậy mọi lớp sát đất của Cộng Công (vòng hào quang, nền báo trước, nước tràn, băng đen) dùng `GROUND_ALPHA_INDEX` để luôn vẽ trước mọi nhân vật; khiên và tường sóng dùng `actorAlphaIndex(...) − 1/−2` để vẽ ngay trước Cộng Công/đồng minh mang khiên, thân nhân vật đè lên rõ nét (`visual-kit-depth.ts`). Áp dụng cùng quy tắc cho VFX tướng khác.

Thứ tự vẽ: sprite (SpriteManager) vẽ trước mesh trong suốt và có depth pre-pass ở alpha ≥ 0,95; billboard luôn vuông góc hướng nhìn nên tâm sprite càng cao càng gần camera. Núi Bất Chu (tâm cao 4,27) vì vậy đặt lùi 6 đơn vị về phía xa camera (−Z) để độ sâu vẫn nằm sau tướng ở cả ba góc camera (beta 0,70–0,84); đặt gần hơn sẽ che kín tướng.

Duyệt nhanh: mở game với `?debug=1`, đưa Cộng Công ra sân rồi gõ trong console (chỉ chạy ở client, không gửi lệnh lên server, camera tự về tướng): `__vfxReplay('h01G')` phát lại toàn bộ tuyệt kỹ; `__vfxReplay('h01G', 'cleave', x, z)` một nhát quét theo hướng thế giới (camera mặc định: +z là phía dưới màn hình, +x là bên trái); `__vfxReplay('h01G', 'cage')` xem lồng băng trên chính Cộng Công.

Agent đã tự kiểm tra trong trình duyệt ngày 19-10-2026 (Vite dev + server build của người dùng, camera mặc định, nền đất sáng): nhịp tụ lực → gãy núi → sóng → đổ → băng → vỡ, hướng quét với quái thật, lồng băng, vòng hào quang; 60 fps, không lỗi shader. Chưa xem chế độ giảm chuyển động, nền tối, trận đông 4 người và các góc camera khác; người dùng vẫn cần nghiệm thu cảm quan.

## Quái năm wave đầu

Năm PNG alpha tự tạo bằng công cụ imagegen ngày 15-10-2026 nằm trong `assets/monster-source/` (`m001`, `m002`, `m003`, `m004`, `b001`); không dùng asset ngoài hay hình từ Warcraft. Bản WebP runtime 768 px tối đa, 79–133 KB mỗi ảnh, nằm trong `apps/client/public/assets/monster-*.webp`. Mỗi loại có silhouette riêng ở góc nhìn chéo trên: Thanh Lang, Cốt Cung Thủ, Trư Yêu Thiết Giáp, Huyết Dơi và Hắc Phong Hùng Vương. Renderer dùng billboard có hitbox chọn mục tiêu; khi texture không tải được, hiện hình khối dự phòng. Đòn quái và hai chiêu Boss dùng event server. `assets/vfx-source/boss-earth/author.py` dựng hai cảnh Blender 5.2 chỉnh sửa được (`shield/boss-shield.blend`, `quake/boss-quake.blend`), mỗi cảnh 16 khung RGBA: trụ đá nứt vươn lên quanh Boss và nền đất rạn, đá văng, bụi khi chấn địa. `tools/vfx/pack-boss-earth.ps1` đóng khung thành hai atlas WebP 4×4, mỗi khung 256×256, tại `apps/client/public/assets/vfx-boss-shield.webp` và `vfx-boss-quake.webp`; đây là asset tự dựng của dự án, không dùng nguồn ngoài. `visual-boss-earth.ts` phát flipbook theo cảnh báo/va chạm do server xác nhận và giữ khung đá quanh Boss theo snapshot khi còn khiên; giới hạn 24 sprite cho mỗi atlas và dọn khi đổi trận/khu vực. Khi texture chưa sẵn sàng, vòng báo phạm vi vẫn hiện. Buff giáp và choáng bám snapshot. Năm atlas WebP `monster-motion-*.webp` được đóng từ ảnh tư thế imagegen trong `assets/sprites/monster-motion/` bằng `tools/assets/pack-monster-motion.py` (Pillow, NumPy, OpenCV), mỗi atlas 7 khung 480×533: đứng, hai bước, lấy đà, tác động, trúng đòn và chết. `monster-motion.ts` chọn khung theo action/event; `visual-sprites.ts` cập nhật UV và dùng ảnh tĩnh cũ khi atlas không tải được. Hình dơi bay được tách riêng để giữ nguyên hai mép cánh. Cốt Cung Thủ bắn mũi tên hình khối qua pool `visual-monster-projectiles.ts`; đòn cận chiến dùng vệt vũ khí, bụi/đá/hạt ngắn gọn tại vị trí chạm do server xác nhận. Đây là tranh chuyển tư thế một góc nhìn với lật ngang, chưa phải rig xương hoặc 4 hướng vẽ riêng. Chế độ giảm chuyển động giữ tín hiệu va chạm/phạm vi ngắn. Người dùng cần kiểm tra trong game để đánh giá độ đọc được, nhịp và FPS khi 1–4 làn cùng đông quái.

## Chọn và đưa vào hiệu ứng

- `particle-pack`: `circle_03`/`flare_01` cho lõi sáng và lóe; `magic_01`/`magic_03` cho phép thuật; `spark_01`/`spark_04` cho mảnh văng; `slash_01` và `trace_01` cho vệt chém/đạn; `twirl_01` cho xoáy; `smoke_03` cho khói mềm.
- `smoke-particles`: `whitePuff06` cho bụi sáng, `blackSmoke06` cho khói tối, `flash04` cho chớp, `explosion04` là một **khung** nổ. Muốn nổ chuyển động, lấy đủ chuỗi `PNG/Explosion/explosion00.png`–`explosion08.png` trong ZIP rồi đóng atlas đúng thứ tự; không lặp một khung giả làm flipbook.
- `light-masks-1.0`: `ring_a`/`circle_a` cho vòng và vùng sáng; `cone_a_blur` cho ánh sáng hình nón. `ring_a_noise` là mask RGB, cần xử lý độ sáng/alpha trước khi dùng như sprite trong suốt.
- **Băng/tuyết:** `viktor-hahn-spell-atlases/flash_freeze.png` là atlas 8×12 khung 512×512, nguồn 4096×6144; dùng để thử nhịp đóng băng/va chạm rồi giảm kích thước, chọn số khung và đóng atlas runtime. `mkwong98-snowflake/snowflake.png` là hình hạt tuyết; kết hợp hạt tròn mềm Kenney cho tuyết xa, không lặp toàn bộ bông tuyết lớn. Hiệu ứng mảnh băng và bề mặt bị đóng băng vẫn cần thiết kế theo chiêu.
- **Điện/sét:** `calinou-lightning/lightning-00.png`–`lightning-10.png` là tia sét chuyển động; bản nguồn RGB nền đen nằm trong ZIP, bản thư viện đã dùng độ sáng làm alpha. Đổi hướng/kéo dài theo đường nối mục tiêu, thêm lõi sáng và chớp va chạm. `mikodrak-spell-effects/lighteningball_*.png` là 20 khung cầu sét 56×65, chỉ phù hợp lớp phụ nhỏ; sắp thứ tự khung theo số, không theo tên chữ.
- **Lửa và chiêu phép:** `viktor-hahn-spell-atlases/fire_yellow.png`, `fireball_blue.png` và `flash01.png` là atlas có alpha; chọn nhịp/phong cách theo chiêu, ghi công nếu dùng. `para-particles/fire_01.png`, `fire_02.png` và `lighter_flame_01.png` là atlas 1024×1024 gồm 64 khung 128×128, phong cách phẳng; đừng thay flipbook lửa hiện có trước khi đối chiếu trong game. `mikodrak-spell-effects/spell_decap_2_ball_*.png` là chuỗi cầu lửa nhỏ 20 khung.

Luồng chuẩn: đọc tác động thực của chiêu trong `content/catalog.ts` và `docs/gameplay-spec.md`; phân lớp báo trước, điểm phát, đường bay, va chạm, dư âm; chọn texture và blend mode phù hợp; đặt giới hạn tuổi thọ/số hạt, pool và dọn khi trận đổi trạng thái. Kích hoạt từ sự kiện server như VFX hiện tại. Khi giảm chuyển động, giữ tín hiệu va chạm/tầm ảnh hưởng ngắn và bỏ hạt/chớp lặp. Dùng `debug('visual.…')` không chứa tên người chơi hoặc token.

## Công cụ

- **Babylon.js 9.30.0** đã là dependency của dự án. [Particle System](https://doc.babylonjs.com/features/featuresDeepDive/particles/particle_system/particle_system_intro) dùng sprite texture; [Node Particle Editor](https://www.babylonjs.com/tools/) là công cụ thiết kế trực quan chính thức. Xuất cấu hình và tích hợp có kiểm soát vào các module client; không thêm phụ thuộc runtime cho công cụ biên tập nếu chưa cần.
- **ImageMagick** (`magick`) hiện có trên máy phát triển này: kiểm tra kích thước/alpha và chuyển PNG sang WebP. **FFmpeg** (`ffmpeg`) hiện có để xem/ghép chuỗi khung khi cần. Đây là công cụ hệ thống, không được đóng gói trong repo; nếu máy khác thiếu, cài từ [ImageMagick](https://imagemagick.org/script/download.php) hoặc [FFmpeg](https://ffmpeg.org/download.html).
- **Blender MCP** dùng [mcp-for-blender](https://github.com/ahujasid/mcp-for-blender) (mã MIT) để chạy mã dựng cảnh trong Blender; sản phẩm xuất do dự án tự tạo. Bản thử Thủy Lao được dựng và render ngày 14-10-2026 qua `execute_blender_code`, sau đó đóng atlas bằng ImageMagick. Có thể sửa `.blend` và render lại bằng hai script nguồn ở trên; không cần Blender khi game chạy.

Ví dụ PowerShell khi một texture đã được chọn cho hiệu ứng:

```powershell
magick identify -format '%wx%h %[channels]' assets/vfx-library/particle-pack/magic_01.png
magick assets/vfx-library/particle-pack/magic_01.png -resize 256x256 -define webp:lossless=true apps/client/public/assets/vfx-magic-01.webp
```

Kiểm tra alpha sau khi xuất; giữ tỷ lệ ảnh, viền trong suốt và thứ tự khung của atlas. Chỉ chép file WebP được mã hiệu ứng tham chiếu vào `public/assets`; đặt tên theo công dụng trong game khi tích hợp. Texture PNG trong thư viện là nguồn biên tập, không phải dấu hiệu hiệu ứng đã hoàn tất. Người dùng chạy game và kiểm tra FPS/độ đọc được ở 1–4 người sau khi VFX được tích hợp.

## Bàn Cổ: Khai Thiên Tổ Thần (15-10-2026)

`visual-pangu.ts` dựng mesh vệt rìu ba lớp, đá, linh khí xoắn, cột sáng, vòng chấn và điện; `pangu-vfx-textures.ts` vẽ texture khe nứt 512×1024 cùng icon 128×128 xác định bằng code của dự án. Không thêm asset bên ngoài hoặc giấy phép mới. Pháp tướng dùng atlas Bàn Cổ do imagegen đã tạo, cùng nguồn/giới hạn trong [pangu-sprites.md](pangu-sprites.md). Các texture thủ tục dùng chung trong scene; mesh có cap/pool và được thu hồi khi đổi vùng/trận. Xem [cơ chế, nhịp và kiểm tra](pangu-combat.md). Chưa nghiệm thu hình ảnh/FPS trong game.

## Hình Thiên: lốc Ma Hỏa (15-10-2026)

`apps/client/public/assets/vfx-xingtian-fire.webp` được giảm còn 512×512, chỉnh màu đỏ thẫm/tím và giữ alpha từ `assets/vfx-library/LeLu's Noise Pack (FREE)/LeLu's Noise Pack/T_FirePanningCyl45.png`. Nguồn: [LeLu's Free Textures Pack 1](https://leluvfx.gumroad.com/l/freeTextures), CC0 cho sử dụng và chỉnh sửa; không phân phối lại nguyên gói. Bản nguồn ghi năm 2025, không nêu số phiên bản; kiểm tra ngày 15-10-2026. Giữ thông tin và giấy phép tại `assets/vfx-library/LeLu's Noise Pack (FREE)/SOURCE.txt`, `LeLu's Noise Pack/readme.txt`; script biến đổi tại `assets/vfx-source/xingtian-flame-mask.py`.

`visual-xingtian.ts` dùng texture này trên trụ lốc bán kính 6, và trên sóng lửa dài 6 khi trạng thái bất tử còn hiệu lực. Vòng cổ ngữ máu là texture động riêng trên mặt đất; vòng báo trước, lốc va chạm và sóng lửa theo event server, dấu bất tử theo snapshot. Có giới hạn hiệu ứng, pool, dọn khi đổi trận/vùng và tín hiệu phạm vi khi giảm chuyển động. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Đấu Chiến Thắng Phật: Thiết Bổng và Pháp Thân (16-10-2026)

`visual-douzhan.ts` dựng một cột gậy vàng có vân khắc và thân đặc, vùng báo trước 14 × 4,5, vết nứt mặt đất ở thời điểm va chạm và gậy ảo đánh bồi. Bốn phân thân dùng atlas nhân vật h012 đã tạo, được thu nhỏ và giữ vòng nhận diện vàng theo snapshot 7 giây; đòn đánh và chí mạng của chúng theo event server. Texture vân gậy và vết nứt được vẽ trong `DynamicTexture` của dự án, không dùng asset ngoài. Hiệu ứng có giới hạn và pool, dọn khi đổi trận/vùng; giảm chuyển động vẫn giữ vùng nứt và phạm vi. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Kim Thiền Tử: Bình Bát Thu Yêu Trận (16-10-2026)

`visual-kimthien.ts` dựng bát vàng úp cao, phễu sáng lục vàng và pháp trận hoa sen 9 cánh bán kính 7 theo vùng còn tồn tại trong snapshot server. Vòng báo trước ở tọa độ mục tiêu và xung lực khi va chạm theo event; đòn thường hiện vùng hoa sen bán kính 3,2, Tịnh Độ có dấu trạng thái riêng. Texture hoa sen được vẽ trong `DynamicTexture` của dự án, không dùng asset ngoài. Có giới hạn 8 vùng, pool và dọn khi đổi trận; giảm chuyển động giữ hoa sen/phạm vi trên mặt đất. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Hằng Nga: Nguyệt Hoa Vũ (16-10-2026)

`visual-hangnga.ts` dựng trăng khuyết ngọc băng bằng mask alpha riêng, ánh sáng xanh trắng giới hạn theo lần thi triển, sao bạc rơi ngắn, dấu trăng dưới chân đồng minh còn ban phước và mảnh băng trên mục tiêu bị đóng băng. Đòn thường hiện trăng bạc tại tối đa bốn mục tiêu được server ghi trong event. Các lớp dùng `DynamicTexture`/mesh tự dựng, không thêm asset ngoài; có cap/pool, dọn khi đổi trận và nhịp rút gọn cho giảm chuyển động. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Hậu Nghệ: Cửu Nhật Liên Châu Trảm (16-10-2026)

`visual-hau-nghe.ts` dựng chín đĩa mặt trời có nhân đặc và corona chuyển động rơi xuống vùng bán kính 6,5 theo event server, cùng vòng báo/va chạm mặt đất; `visual-fire.ts` thêm flipbook lửa/nổ đã có cho điểm chạm và dấu cháy theo snapshot. Đòn thường có vệt bắn và chớp thái dương ngắn; sát thương, xuyên giáp và đốt theo % máu hoàn toàn ở server. Corona là `DynamicTexture` tự vẽ, không thêm asset ngoài. Có cap/pool và chế độ giảm chuyển động giữ phạm vi va chạm. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Kim Sí Đại Bằng: Kim Dực Trảm Thiên (16-10-2026)

`visual-kimsi.ts` dựng lưỡi lông vũ vàng có gân và các vết chém chữ X, rơi vào vùng bán kính 6,5 sau event kỹ năng; vòng báo trước và dấu Cuồng Tốc màu vàng theo snapshot. Đòn thường tạo lưỡi lông ngắn theo từng nhát do server xác nhận. Texture hình lông/vết chém là `DynamicTexture` tự vẽ, không thêm asset ngoài. Cap/pool giới hạn 32 mesh, dọn khi đổi trận/vùng; giảm chuyển động giữ dấu phạm vi. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Khương Tử Nha: Phong Thần Pháp Trận (16-10-2026)

`visual-khuongtu-nha.ts` dựng cuộn chiếu thư vàng, vùng sáng xanh ngọc bán kính 7 và tám cột thần lôi ở mục tiêu thực nhận sát thương theo event `bolt-h019`. Cuộn và vùng sáng bám snapshot `phong-than`; khi vùng hết hạn, mesh được thu hồi. Đòn thường nối các mục tiêu bằng tia xanh ngọc theo danh sách trúng đòn server gửi. Texture chiếu thư và tia lôi vẽ bằng `DynamicTexture`, không thêm asset ngoài. Giới hạn tám vùng và 16 tia, có pool, cleanup và chế độ giảm chuyển động. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Chúc Dung: Phần Thiên Hỏa Hải (16-10-2026)

Chạy trên kit ([vfx-kit.md](vfx-kit.md)), palette `lava`, không có flipbook hay asset ngoài mới. Module: `visual-chucdung.ts` (HeroVfx, đăng ký trong `VisualEffects`), `visual-chucdung-eruption.ts` (báo trước, núi lửa, cột dung nham, vòng xung kích), `visual-chucdung-ground.ts` (biển dung nham và than hồng theo snapshot), `visual-chucdung-timeline.ts` (hàm thời gian thuần, test `apps/client/test/chucdung-vfx.test.ts`), `battlefield-chucdung.ts` (replay debug).

| Chiêu | Event server | Hình |
|---|---|---|
| Phần Thiên Hỏa Hải | `cast skill-h01H` (windup 0,25s, tại điểm đánh) → `ability skill-h01H` (nova 7,5, `targets`, không có `direction`) | báo trước `kitGround` dải vòng nóng dần đúng bán kính 7,5; núi lửa là `kitWall` với profile miệng núi riêng (chân tối, miệng sáng, đổ sụp rồi tan); cột dung nham là `kitShell` kéo dài bay lên; vòng xung kích `kitGround` chỉ viền nở tới 7,5; giọt/tia lửa `lava` spray; hiệu ứng nổ flipbook lửa của `VisualFire` vẫn giữ |
| Biển dung nham 5s | snapshot ground `chucdung-lava` (7,5) | `kitGround` palette `lava`: nền tối nứt sáng, dòng xoáy chậm, viền bọt; loang ra khỏi miệng núi, nguội dần ở 0,9s cuối; thỉnh thoảng bắn tia lửa |
| Đòn thường | `trait-h01H` (`impact_splash` 3,5) | vòng xung kích nhỏ + tia lửa + flipbook lửa; than hồng 5s từ ground `chucdung-ember` (3,5) |
| Nổ xác quái bỏng | `burst-h01H` (3,5) | vòng xung kích nhanh + nhiều tia lửa + flipbook lửa lớn |

Cap: 12 báo trước, 8 núi lửa + 8 cột, 16 vòng, 20 vùng ground; spray `lava` 420 hạt. Reduced motion: giữ báo trước, vòng, núi lửa tĩnh ngắn 0,38s và biển dung nham/than hồng tĩnh; bỏ cột, tia lửa, loang và flipbook lửa. Depth: ground `GROUND_ALPHA_INDEX + 2..8`; núi lửa vẽ ngay trước nhân vật tại tâm (`actorAlphaIndex − 2`), cột `− 1`. Log: `visual.chucdung.{cast,impact,skip,replay}` cùng `visual.kit.*`. Replay `?debug=1`: `__vfxReplay('h01H')` (tuyệt kỹ + biển 5s), `('h01H','trait')`, `('h01H','burst')`, thêm `x, z` để chọn điểm. Chưa nghiệm thu hình ảnh/FPS trong game.

## Cộng Công: Nộ Xúc Bất Chu Sơn (16-10-2026)

`visual-congcong.ts` dựng hư ảnh núi đá trước Cộng Công lúc báo trước, mặt sóng Hắc Thủy có vòng bọt cuộn ra bán kính 7,5 lúc va chạm và vỏ khiên nước xanh đen bám từng đồng minh theo snapshot ward. `visual-water.ts` thêm mặt nước/splash và bọt cho sóng chính; đòn quét có vệt nước ngắn. Texture mặt sóng là `DynamicTexture` tự vẽ, không thêm asset ngoài. Giới hạn 12 sóng, 20 khiên, có pool/cleanup và hiển thị phạm vi trong chế độ giảm chuyển động. Chưa chạy game, build hoặc nghiệm thu hình ảnh/FPS.

## Trương Đạo Lăng: Cửu Thiên Ngũ Lôi Chính Pháp (16-10-2026)

Ảnh concept do người dùng cung cấp ngày 16-10-2026 là tham chiếu phong cách và bố cục. `assets/vfx-source/beidou-painted/` giữ các sheet thử cùng `ground-decal-v4.png`, ảnh pháp trận tròn 1024 px có viền alpha an toàn và tâm trong để không phủ thành đĩa tối, và kiếm Băng–Lôi thân rộng riêng (`painted-sword-v3.png`). Blender 5.2 lưu cảnh chỉnh sửa `beidou-painted.blend`; `author.py` render 20 khung mặt đất 512 px theo nhịp báo trước, va chạm và thu vòng. `tools/vfx/pack-beidou-painted.ps1` xuất atlas WebP 2560×2048, decal 1024 px và kiếm 1024×1536 vào `apps/client/public/assets/`. Runtime `visual-truong-dao-lang.ts` đặt pháp trận trên địa hình, đổi khung atlas bằng UV và cho **bảy kiếm độc lập** cắm xuống theo Bắc Đẩu. Event server của 21 tia gọi hình sét xanh/vàng từ trên cao vào mục tiêu; bùa đồng minh và sét bồi theo event riêng. Giới hạn tám vùng, 16 tia đồng thời, thu hồi mesh và rút gọn khi bật reduced motion. Bản nháp hình khối trong `assets/vfx-source/beidou-sword-array/` được giữ lại và không dùng trong game. Đây là nguồn tự tạo, không dùng texture Warcraft. VFX chỉ bám event, không xử lý sát thương. Chưa được nghiệm thu lại trong game hoặc đo FPS.

## Phượng Hoàng: bản thể chim lửa (19-10-2026)

Ảnh nguồn `assets/vfx-source/phuong-hoang/phoenix-bird.png` do công cụ host `image_gen` tạo từ master Phượng Hoàng của dự án (route `host_image`, model không công bố); runtime chỉ dùng WebP 1024 px `apps/client/public/assets/vfx-phoenix-bird.webp`. `visual-phuong-hoang.ts` trình bày chim lửa bay, trứng, lông vũ và thảm lửa theo event/snapshot server; không dùng nguồn ngoài. Chưa kiểm tra trong game hoặc nghiệm thu FPS.

## Nhiên Đăng, Bồ Đề, Đế Tuấn, Như Lai, Nguyên Thủy (19-10-2026)

`visual-divine.ts` nhận event cast/trait/ability từ game-core và snapshot vùng/khiên. Nhiên Đăng dựng lồng 24 châu quanh vùng bán kính 7 và vỏ khiên trên đúng đồng minh; Bồ Đề hiện thân cây khi thi triển và dấu lá theo buff; Đế Tuấn có ba Kim Ô bay quanh thân, mười mặt trời và vết chém chữ thập khi tung chiêu, một vụ nổ Kim Ô mỗi nhịp đánh lúc hóa thần; Như Lai có bàn tay vàng hạ từ trên cao, năm đỉnh đá duy trì theo snapshot và khiên đồng minh; Nguyên Thủy mở ba vết rách không gian cùng dấu mây trên đồng minh nhận phước, dấu kiếm khí trên quái bị đánh dấu. Sát thương và trạng thái do server quyết định. Vật liệu/mesh do dự án tự tạo, không thêm asset ngoài; giới hạn 24 hiệu ứng ngắn, 8 vùng và 40 dấu bám trạng thái, thu hồi khi hết hạn hoặc đổi trận, reduced motion rút bớt hình phụ. Chưa kiểm tra trên chiến trường thật hoặc nghiệm thu độ rõ/FPS.

## Thư viện flipbook nguyên tố (19-10-2026)

20 flipbook dùng chung `lib-<nguyên tố>-<archetype>` cho Kim, Mộc, Thủy, Hỏa, Thổ, dựng **kiểu chân thực của Hà Bá** (Principled BSDF có coat + noise bump, hai đèn area, look Medium High Contrast; helper `principled`, `fire_material`, `studio_lights`, `grid_surface` trong `assets/vfx-source/kit/vfx_kit.py`). Mỗi nguyên tố có chất liệu thật riêng: nước trong suốt có sợi bọt xoáy, kim loại phản chiếu, gỗ/lá có bump, lửa phát sáng nhiễu fbm, đất thô kèm bụi. Archetype: `burst`, `shards`, `pillar`, `hit`. Nguồn `assets/vfx-source/kit/library.py` (Blender 5.2): `blender -b --factory-startup -P assets/vfx-source/kit/library.py -- thuy-burst hoa-pillar` (không đối số = cả 20). Palette cel cũ nằm ở `visual-kit-palettes.json` → `blender.lib_<nguyên tố>` (chỉ còn dùng làm màu glow/rim). Atlas khai trong `visual-kit-atlases.json`, đóng bằng `tools/vfx/pack-flipbooks.ps1 -Atlas lib-thuy-burst,...`; burst/shards/pillar 12 khung 4×3 @256, hit 8 khung 4×2 @192; tổng WebP lossless ≈ 2,5 MB cho 20 atlas, chỉ tải khi một tướng gọi `flipbooks.ensure`. Khung cuối trong suốt hoàn toàn (đã kiểm). Không có vòng trắng dưới đất (nền để decal/shader runtime lo). Contact sheet: `assets/vfx-source/kit/library/contact-sheet-<nguyên tố>-real.png`. Toàn bộ geometry tự dựng, không dùng asset ngoài. Chưa nghiệm thu trong game. Hạn chế đã biết: kim loại còn tối ở cột, đất/gỗ chưa có texture ảnh thật.
