# Hợp đồng ảnh và prompt cho Codex

## Quyết định đã chốt

**Stylized theo Cộng Công**, cập nhật theo quyết định mới ngày20-10-2026, mã style `congcong-stylized-v1`: khối lớn có thể tích, cel shading ba bậc rõ, viền mực tối theo màu vật chất, rim light tiết chế, màu bão hòa có mảng tối. Bề mặt chỉ có vài điểm nhấn lớn, giảm nét cọ dày và hoa văn vụn. Đá/băng có mặt khối rõ; lửa/nước/sương có khối hữu cơ riêng, không ép mọi nguyên tố thành đá cắt cạnh.

Cộng Công là tham chiếu cả **phong cách ảnh và chất lượng tích hợp**: silhouette, khối sáng/tối, dàn cảnh, anchor, nhịp, depth và pool. Từng tướng vẫn giữ hình chính/vũ khí/palette riêng. Công cụ tạo ảnh Codex vẫn là route tạo art; lựa chọn stylized không tự chuyển cả lô sang render Blender. Giữ hình tự nhiên có bất đối xứng, tránh primitive trơn hoặc chỉ đổi màu phép chung.

Reference `STYLE_ONLY`: `assets/vfx-source/congcong/buzhou/frames/frame-08.png` cho khối đá/viền/sắc độ, `assets/vfx-source/congcong/icecage/frames/frame-06.png` cho mặt băng/rim; thêm `assets/vfx-source/congcong/splash/frames/frame-05.png` khi cần nước/bọt. Xem ảnh trước khi đính; contact sheet chỉ dùng đối chiếu nhịp, không sao chép nền xanh vào raw. Master tướng chỉ là `PALETTE_OR_WEAPON_ONLY`; không sao chép núi/băng/nước của Cộng Công làm hình chính cho mọi chiêu. Bộ Huyền chỉ tham khảo quy trình, không còn là chuẩn nét vẽ.

Ảnh đã tạo/nguồn đã duyệt theo style trước cần rà lại, không tự coi đạt chuẩn mới. Giữ nguyên raw, source, hash và lượt sửa; lưu prompt cũ trước khi đổi prompt. Manifest dùng `requiredArtStyle: congcong-stylized-v1`; job trước là `raw-ready`/`reused-raw-ready` chuyển `style-review-required`, giữ `previousStatus`. Blocker bố cục/chuyển động vẫn giữ nguyên. Chỉ phục hồi trạng thái đạt sau khi xem ảnh theo style mới; ảnh không đạt được tạo phiên bản mới khi thực hiện tạo ảnh.

Ảnh đã xác định sai style được cách ly nguyên byte tại `assets/vfx-archive/261020-2233-legacy-painted-vfx/`, có `archive-index.json` ghi đường dẫn và hash. Không dùng archive làm raw, reference hoặc fallback runtime; không có ngoại lệ Như Lai. Job tương ứng giữ đường dẫn raw dự kiến, chuyển `legacy-style-archived`, `candidateAvailable: false`, `regenerationRequired: true`; hash cũ thuộc `legacySource`, không đại diện ảnh stylized mới. Chỉ đưa job trở lại quy trình QA khi có ảnh thay thế đúng style. Xem [báo cáo dọn ảnh](../reports/cleanup-261020-2233-painted-vfx.md).

## Nguồn sự thật và đơn vị job

[asset-tier5.md](asset-tier5.md) và [asset-tier6.md](asset-tier6.md) sở hữu roster, tên job, đường dẫn, vật chất và nhịp riêng. Một dòng asset = một ảnh gốc; front/back là hai job nếu inventory tách hai dòng. Pilot chỉ thực hiện một phần những dòng đó, không thêm ảnh concept ngoài phạm vi.

[Shield dùng chung](asset-shared-shield.md) là ngoại lệ chủ động cho hình riêng từng tướng: một thiết kế, hai layer trước/sau và một animation dùng cho toàn game. Không sinh lại vỏ theo trăng/đèn/ngũ sắc/Phật quang/máu. Vòng đời vẫn theo từng nguồn khiên server; miễn sát thương, ward, buff và đóng băng giữ đúng ý nghĩa riêng.

[13 trạng thái/buff chung](asset-shared-status.md) tiếp tục thay37 job riêng: giáp vỡ, nhận hồi máu, freeze, revive, stun, slow, seal, tăng Công/tốc đánh/chí mạng/xuyên giáp, miễn sát thương và giảm sát thương. Một dấu cho một tác dụng; nhiều nguồn cùng tác dụng dùng một dấu nhưng giữ nguyên trạng thái server. Màn hóa thần và các lớp chính của chiêu vẫn riêng. Không gộp shield hấp thụ, miễn sát thương và giảm sát thương thành cùng một biểu hiện.

Mỗi job cần bản ghi: `heroId`, tên hiện tại, `skillId`, nhánh event/snapshot, đường dẫn raw, type, palette HEX, shape, phase/timing, điểm phát/đến, bán kính/số mục tiêu nếu có chứng cứ, reference paths + vai trò, prompt path, phiên/route, actual size/grid, anchor, số lượt sửa, QA, trạng thái. Dữ liệu cơ chế từ `content/catalog.ts`, `packages/game-core/` và contract thực; mô tả cũ chỉ dùng tìm đường. Không biến nội tại/đòn thường độc lập thành job tuyệt kỹ.

## Layout

| Mã | Bố cục yêu cầu | Chuyển động và cách dùng |
|---|---|---|
| S16 | 16 ô, 4×4; yêu cầu 2048² | One-shot: 1–3 tụ/báo trước, 4–10 hành động/va chạm, 11–16 thu/tan; khung cuối gần rỗng. Nhịp riêng inventory được quyền tinh chỉnh. |
| S8 | 8 ô, 4×2; yêu cầu 2048×1024 | One-shot ngắn; đầu → biến hình/va chạm → tan, khung 8 gần rỗng. |
| L8 | 8 ô, 4×2; yêu cầu 2048×1024 | Cả 1–8 là một vòng lặp, 8 nối 1; không có khung cuối rỗng. Vật chất biến đổi thật, không chớp tắt ở điểm nối. |
| P16 | 16 ô, 4×4; yêu cầu 2048² | Trạng thái: 1–4 xuất hiện, 5–12 giữ/lặp nối 12→5, 13–16 tan; chỉ exit khi trạng thái hết. |
| D | Một decal, yêu cầu 1024² | Nhìn thẳng từ trên xuống; không có phối cảnh billboard. Không bắt buộc là vòng hoặc có lỗ giữa. |
| T | Một dải, tỷ lệ 3:1, yêu cầu 1536×512 | Texture phẳng, đầu đi ở bên phải, đuôi bên trái, chừa mép; hướng bay/UV do runtime. |
| M | Một mask hoặc texture màu UV, yêu cầu 1024² | Không camera/phối cảnh; alpha/hình ảnh được thiết kế cho UV đã ghi. Không vẽ nguyên vỏ 3D thành mask. |
| O | Một vật thể tĩnh, yêu cầu 1024² | Camera trực giao nâng42° như billboard; toàn bộ vật thể trong canvas, neo chân thống nhất. Dùng cho châu, đá, Đỉnh, cổ thụ hoặc master chim đã có; không phải sheet hay UV. |

M loại UV không bị ép thành hình có khoảng trống giữa; phần vật chất đặc có thể opaque hoàn toàn. T dùng cho ground phải ghi ngoại lệ top-down trong inventory/prompt, không giữ góc nhìn nghiêng của projectile. Với O, đây là prop tĩnh hoặc master tham chiếu, không lấy scale/warp của một ảnh O làm bằng chứng đã có animation.

Sheet billboard: camera trực giao, beta chiến trường `0.84` rad tính từ trục thẳng đứng, tương đương góc nâng khoảng **42° từ mặt đất**. Không nói beta là góc nâng 48°. Cố định camera/ánh sáng/tỷ lệ trong cả sheet. Anchor mặc định `(0.5, 0.72)` trong ô; có thể cấu hình riêng theo hình thực nhưng mọi khung phải cùng anchor và ghi vào metadata, không đo bbox từng khung rồi fit.

Chừa tối thiểu 3% lề ô, tính cả mảnh văng/ánh sáng/đầu vũ khí. Không ép lỗ/cột rỗng vào kiếm/núi/bàn tay phép cần đập đúng tâm. Giải quyết che người bằng layer front/back, vị trí, depth khi tích hợp; ghi rõ layer nào đằng sau/đằng trước. Với lớp bao người, khoảng trống được thiết kế có chủ ý nhưng không được làm mất vật chất.

Kích thước yêu cầu chỉ là định hướng cho công cụ. Lô Huyền từng trả 1254², 1774×887, 2172×724; phải lưu kích thước thật. Khi raw không chia hết lưới, ghi rect/crop biên rõ ràng để sai số làm tròn tối đa 1 px; các ô nội dung vẫn có cùng canvas sau padding, không kéo giãn. Sai số pixel khác với sheet có số hàng/cột sai: bố cục sai phải sửa/chia job và cập nhật inventory, không cắt âm thầm mất khung.

Đề xuất **sau xử lý**: ô 256 cho status/va chạm nhỏ, 384 cho hình đặc trưng lớn, 512 chỉ khi xem cỡ thật chứng minh cần thêm chi tiết. Đây không phải cỡ raw chắc chắn hoặc giới hạn cứng của engine; manifest hiện có có thể cần hỗ trợ layout/rect khác ở lần tích hợp. Giữ tỷ lệ và downscale premultiplied alpha.

## Template ghép prompt

Trong lần thực hiện sau, tạo `assets/vfx-source/tier56-codex-art/make-prompts.py` để ghi `prompts/<asset>.txt` theo từng dòng inventory. Có thể tái dùng logic `head`/layout từ `assets/vfx-source/huyen-codex-art/make-prompts.py`; không sửa 19 job Huyền cũ. Không copy nguyên helper đang luôn thêm cột rỗng hoặc "frame 8 empty" cho L8. Các chỗ trong ngoặc nhọn dưới đây phải được thay bằng giá trị của job trước khi gọi tool:

```text
Use your image generation tool to create ONE image for ONE job.
Save the exact generated PNG UNCHANGED to {absolute_raw_path}.
Preserve the original alpha/background and dimensions. Do not flatten,
post-process, draw with code, or substitute another renderer.
If image generation is unavailable, return IMAGE_GEN_UNAVAILABLE with reason.

JOB: {hero_id}, {current_hero_name}, {asset_name}, type {type}.
SUBJECT: {inventory_shape_and_material}; palette {palette_hex}.
ART: stylized fantasy VFX matching Cong Cong: large sculpted volumes,
three clear cel-shading bands, dark colored ink contours, restrained rim
highlights, saturated hero colors with substantial dark values, organic
irregular silhouettes and sparse large surface accents. Avoid dense
painterly texture, micro-detail, photorealism and broad white glow.
REFERENCE ROLES: {each_exact_path_and_role}. Match rendering style only;
preserve this hero's own material, weapon and motif.
LAYOUT: {resolved_type_layout}; {actual_camera_or_uv_rule}.
ANCHOR AND FRAMING: {anchor}; identical camera, light, scale and canvas
through all frames; 3% safe margins, no crossing cell boundaries.
OCCLUSION: {front_back_or_full_center_rule_for_this_job}.
MOTION: {explicit_frame_ranges_and_shape_changes_from_inventory}.
LOOP/EXIT: {resolved_one_shot_or_L8_or_P16_rule}.
OUTPUT: transparent background. If true transparency cannot be produced,
use perfectly flat #FF00FF and report the fallback; preserve that raw.
No text, letters, numbers, grid lines, borders, cast-shadow backdrop,
ground plane, characters, hands, UI, logos, or watermarks.
```

"Không bàn tay" là bàn tay nhân vật ngoài phạm vi; nếu hình chính tuyệt kỹ thực sự là chưởng ấn/bàn tay phép như inventory nêu, thay dòng cấm bằng "no character hands; the specified magical palm is allowed". Với O cổ thụ/chim phép phải cho phép đúng prop đã chỉ định; cấm thêm người hoặc cảnh nền. Với D/T ground, cho phép lớp đất/đá/lava của chính decal, chỉ cấm mặt sàn/cảnh nền ngoài asset. Với M, thay yêu cầu nền trong bằng quy tắc UV/opacity cần thiết. Không để prompt tự mâu thuẫn.

Chạy **mỗi lần đúng một job**, giữ output của tool và đường dẫn phiên được tool trả. Dùng công cụ tạo ảnh trực tiếp khi có; nếu dùng wrapper, chỉ lấy file được output/phiên của chính job xác nhận. Không glob thư mục PNG toàn cục, không lấy file mới nhất từ phiên khác. Giữ prompt cuối đã gửi, reference, route/tool thực dùng, source path và checksum để kiểm trùng/chép nhầm; không ghi bí mật/token.

## Cổng chất lượng và sửa lỗi

1. Xem raw trước khi chấp nhận: đúng tướng/vật chất/shape, khối/cel/viền/rim thống nhất với Cộng Công ở cỡ chơi thật, đúng grid và thứ tự; nền alpha thật hay fallback được ghi rõ. Không sửa/flatten raw.
2. Rà từng ô và preview chuỗi: khối chính đổi hình/di chuyển theo lực, không phải một pose đổi scale/opacity. P16 và L8 phải có chuyển động vật chất và điểm nối đúng; S16 có va chạm rõ và thu thế. O/D/M/T là ảnh nguyên liệu tĩnh, chỉ kiểm các tiêu chí phù hợp; không tự thêm keyframe cho prop cây đứng yên.
3. Rà đủ đầu vật thể/mảnh văng, lề/alpha sạch, không ô tràn, cùng camera/anchor. Xem trên nền sáng/tối và cỡ runtime dự kiến; QA số lượng không thay xem ảnh.
4. Nếu gần đạt, sửa chính ảnh/pose lỗi có reference. Tối đa **hai lượt sửa/tạo lại sau bản đầu cho mỗi job**; lưu mọi phiên bản vào `iterations/` kèm lý do, không ghi đè ảnh lỗi làm mất chứng cứ.
5. Sheet quá khó giữ chuyển động: có thể tách thành keyframe/pose jobs và ghép grid sau, cập nhật inventory/job count trước; vẫn dùng ảnh Codex, giữ canvas/anchor chung. Không nhân bản pose hoặc warp/scale ảnh để giả keyframe.
6. Sau hai lượt vẫn lỗi hoặc tool không tạo được: `BLOCKED_ART` + lỗi cụ thể + file giữ lại. Không tự thay bằng Blender, code, effect generic đổi màu hoặc tuyên bố đủ bộ. Các job độc lập còn lại được tiếp tục.

## Bàn giao xử lý và runtime sau này

Tái dùng cấu trúc `assets/vfx-source/mandon/process-codex-art.py`: raw bất biến → processed RGBA + frame PNG + reference nền sáng/tối → WebP/manifest. Chỉnh thuật toán theo alpha thật/lưới thật; không áp alpha floor của Mẫu Đơn cho mọi chất liệu hoặc khóa magenta lên ảnh có alpha sẵn. Không fit bbox mỗi frame; dùng canvas chung, padding và pivot đã ghi. Đóng atlas bằng `tools/vfx/pack-flipbooks.ps1` sau khi có manifest riêng; không chạy lệnh pack khi manifest chưa tồn tại.

Runtime dùng `HeroVfx`, `visual-kit-depth`, flipbook/layer pools, cap, lazy load và clear hiện có. Vật thể có chiều cao/bao quanh người có thể cần mesh/shader ở bước tích hợp; map ảnh đúng UV và giữ mảng cel/viền/rim của nguồn. Static/loop chỉ sống theo event/snapshot có chứng cứ; animation loop không được tự gia hạn trạng thái hoặc quyết định sát thương. Reduced motion vẫn giữ vị trí, phạm vi và status bằng khung tĩnh thích hợp.

Ghi riêng: `planned` → `raw-ready` (đạt cổng ảnh) → `processed-ready` (đã xuất/QA runtime asset) → `built` → `running-new-build` → `in-game-approved`. Không nâng trạng thái do có đủ file. Lập manifest log art: job, input/output, layout/alpha/anchor, retry, QA; lần tích hợp sau dùng `visual.<hero>.*`/`visual.kit.*`, không log dữ liệu người chơi.

## Câu hỏi còn mở

Không còn câu hỏi phong cách. Hạn chế event/snapshot và geometry riêng từng tướng ghi ở inventory; gặp thay đổi luật hoặc thiếu quyết định gameplay thì dừng đúng job đó để hỏi, không tự đoán.
