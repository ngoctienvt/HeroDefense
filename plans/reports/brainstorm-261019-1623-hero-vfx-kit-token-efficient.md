# Brainstorm: VFX đủ 70 tướng đạt chuẩn Cộng Công, tiết kiệm token

Ngày 19-10-2026. Trạng thái: hợp đồng đã chốt, chờ lập plan.

## Bằng chứng hiện trạng

- 70 tướng: bậc 1: 8, bậc 2: 12, bậc 3: 11, bậc 4: 13, bậc 5: 13, bậc 6: 13 (`content/data/catalog.json`). Catalog chỉ có 5 nguyên tố (Kim, Mộc, Thủy, Hỏa, Thổ).
- Cộng Công (h01G) là chuẩn mẫu. Phần TS gồm khoảng 1.100 dòng trong 8 module `apps/client/src/visual-congcong-*.ts`, phần Blender gồm 615 dòng `assets/vfx-source/congcong/author.py` cùng `tools/vfx/pack-congcong.ps1`, và có test `congcong-vfx.test.ts` cùng replay `__congcongReplay`.
- Khoảng 70% công sức Cộng Công là hạ tầng chung nhưng đang bị khóa theo tên riêng:
  - shader toon (`ccGround/ccWall/ccIce/ccWard/ccCleave`, palette và noise nhúng sẵn);
  - pool flipbook (`ATLAS` khóa cứng 3 loại);
  - quy tắc depth (`GROUND_ALPHA_INDEX`, đã có memory "VFX không che nhân vật");
  - timeline thuần;
  - helper Blender (`reset/camera/toon/outline/holdout/render`, khoảng 280 dòng);
  - replay debug.
- Khoảng 25 tướng (chủ yếu bậc 5–6) đã có module riêng, mỗi module khoảng 110–230 dòng, chưa đạt chuẩn. Bậc 2 đang dùng `TIER_VISUALS` (màu và texture chung). Bậc 3–4 dùng `visual-tier34-skills.ts`. `visual-effects.ts` dài 1.270 dòng và định tuyến bằng chuỗi `if skillId === ...`.

**Kết luận:** token tốn chủ yếu vì mỗi tướng phải đi lại từ đầu các bước dựng shader, pool, depth, Blender và replay, chứ không nằm ở phần sáng tạo riêng của tướng.

## Hợp đồng

**Kết quả:** cả 70 tướng có VFX đọc rõ vật chất, đúng nhịp báo trước → di chuyển → va chạm → dư âm, và đồng bộ với event/snapshot server.
- Bậc 5–6 (26 tướng): kit chung cộng **một lớp chữ ký riêng** (flipbook hoặc shader đặc thù) ngang chuẩn Cộng Công.
- Bậc 1–4 (44 tướng): ráp hoàn toàn từ kit theo công thức dữ liệu.
- Tất cả module cũ được chuyển sang kit ngay trong đợt này.

**Ràng buộc:**
- Tuân thủ AGENTS.md: chỉ trình bày, server quyết định kết quả; giới hạn số lượng và dùng pool; giữ reduced motion; log `visual.*`; không dùng asset Warcraft; ghi giấy phép.
- Nhân vật luôn rõ nét: decal mặt đất vẽ trước actor, lớp vỏ vẽ ở `actorAlphaIndex - 1`.
- Pipeline shader cộng flipbook cel-shaded đã chốt.
- TypeScript `strict`.
- Agent không chạy game, test hay build; người dùng tự kiểm tra.

**Ngoài phạm vi:** đổi gameplay, chỉ số hay mô tả chiêu; sprite thân hero; âm thanh; VFX quái và boss (trừ khi tận dụng được kit).

**Tiêu chí nghiệm thu:**
1. Cộng Công chạy trên kit và nhìn y hệt bản hiện tại (người dùng so bằng replay).
2. Mỗi tướng có công thức trong registry. `visual-effects.ts` không còn chuỗi `if` theo từng tướng.
3. `__vfxReplay(heroId, phase?)` ở `?debug=1` phát được mọi tướng.
4. Một test dạng bảng kiểm mọi công thức khớp với catalog: bán kính, kiểu mục tiêu, kiểu chiêu đơn mục tiêu hay AoE, và có đủ 4 pha.
5. Người dùng duyệt theo lô, mỗi lô có contact sheet của flipbook mới.

## Phương án đã so sánh

| Phương án | Giả định chịu lực | Hỏng đầu tiên khi | Chi phí xấu nhất |
|---|---|---|---|
| A. Làm riêng từng tướng như Cộng Công | Có ngân sách token gần như vô hạn | Ngay lô thứ hai: phong cách mỗi tướng lệch nhau và trùng mã | Khoảng 69 × chi phí Cộng Công |
| **B. Kit chung + công thức dữ liệu + lớp chữ ký cho bậc 5–6** | Phần lớn chiêu quy được về ~10 kiểu mẫu × 5 nguyên tố | Một chiêu độc lạ không khớp kiểu mẫu nào; xử lý bằng lối thoát "lớp chữ ký" | Kit tốn khoảng 1,5 × Cộng Công một lần; mỗi tướng sau đó tốn ~5–15% |
| C. Chỉ đổi palette trên `TIER_VISUALS` | Màu đủ để phân biệt vật chất | Ngay lập tức: AGENTS.md cấm việc chỉ đổi màu | Thấp nhưng không đạt chuẩn |

**Chọn B.** Đây là phương án duy nhất đạt chuẩn mà chi phí không tăng tuyến tính theo số tướng.

**Trade-offs:** B dồn rủi ro vào giai đoạn trích kit. Nếu kit trừu tượng sai, mọi tướng sau đó đều chịu ảnh hưởng. Biện pháp giảm rủi ro: lấy Cộng Công (và một tướng khác nguyên tố, ví dụ Chúc Dung hệ Hỏa) làm hai tướng đầu tiên chạy trên kit để kiểm chứng kit trước khi làm hàng loạt.

**Phương án tốt hơn:** không có. Hướng được chọn chính là hướng người dùng yêu cầu ("tối ưu thay vì làm từng tướng"); bằng chứng là 70% mã của Cộng Công đã mang tính chung.

## Thiết kế kit (đề xuất)

1. **`visual-kit/` (TS client)**
   - `kit-shaders.ts`: shader toon có tham số nguyên tố, gồm ground/decal, wall/ring, shell/ward, slash/crescent, beam, projectile trail. Palette lấy từ `element-palettes.ts` với 5 nguyên tố cộng các biến thể vật chất (băng, sét, gió, quang, ám).
   - `kit-flipbooks.ts`: pool SpriteManager tổng quát, đọc metadata atlas từ JSON thay cho bảng `ATLAS` viết cứng.
   - Gộp `kit-depth.ts`, `kit-pool.ts` và `kit-timeline.ts` (các hàm easing và pha thuần, có test).
   - `kit-spray.ts`: particle dùng chung.
2. **Kiểu mẫu (archetype)**, khoảng 10 loại: cận chiến chém vòng cung, đạn bay, nổ vùng, sóng hoặc tường lan, mưa rơi nhiều điểm, nảy hoặc xích, cột hoặc triệu hồi, khiên hoặc buff đồng minh, hào quang thường trực, dấu trạng thái (đốt, độc, chậm, đóng băng, câm).
3. **Registry công thức** `vfx-recipes/tier{N}.ts`: mỗi tướng là một đối tượng dữ liệu khoảng 15–40 dòng, nối event (`cast`, `skill-*`, `trait-*`, status trong snapshot) với các lớp archetype và tham số (nguyên tố, kích thước lấy từ catalog, nhịp). Bậc 5–6 thêm trường `signature` trỏ tới một module nhỏ riêng.
4. **Blender `vfx_kit.py`**: tách các helper chung của `congcong/author.py` cùng preset vật liệu toon theo nguyên tố. Thêm **thư viện flipbook theo nguyên tố**, khoảng 5 nguyên tố × 4 loại (bắn tóe hoặc nổ, mảnh vỡ, cột, va chạm), render **một lần** và dùng chung cho 70 tướng. Script pack chung thay cho một file `.ps1` cho mỗi tướng.
5. **`__vfxReplay(heroId, phase?)`** tổng quát, thay `__congcongReplay`.

## Các đòn bẩy tiết kiệm token

- **Trích một lần, dùng 70 lần.** Shader, pool, depth và Blender chỉ viết một lần; công việc cho từng tướng chỉ còn là dữ liệu.
- **Đặc tả theo bảng trước khi code.** Mỗi bậc có một bảng gồm tướng, chiêu, archetype, vật chất, lớp chữ ký và tham số, lấy từ catalog. Người dùng duyệt bảng, nhờ vậy tránh phải làm lại vì hiểu sai chiêu.
- **Phân tầng model.** Opus dùng cho kit, shader và các lớp chữ ký. Sonnet hoặc Haiku dùng cho công thức bậc 1–4 và việc chuyển module cũ sang kit (việc cơ học, có bảng mẫu). Chạy song song theo file `tier{N}.ts`, không đụng chung file.
- **Test dạng bảng thay cho test từng tướng.** Một test duyệt toàn bộ registry và đối chiếu với catalog.
- **Duyệt theo lô.** Mỗi lô là một bậc hoặc một nguyên tố. Người dùng xem bằng replay rồi gửi một lần ghi chú cho cả lô. Agent chỉ đọc contact sheet của flipbook **mới**, không chụp màn hình từng tướng.
- **Ngữ cảnh gọn cho từng phiên.** Phiên làm một lô chỉ cần đọc README của kit, bảng đặc tả của lô và catalog, không cần đọc lại toàn bộ mã Cộng Công. Viết `docs/vfx-kit.md` khoảng 150 dòng làm "hợp đồng" cho agent.

## Thứ tự giai đoạn (đưa sang ak:plan)

1. **Trích kit từ Cộng Công.** Cộng Công chạy trên kit, nhìn y hệt bản cũ. Viết `docs/vfx-kit.md`. Thêm replay tổng quát. *(Opus)*
2. **Thư viện flipbook nguyên tố** bằng Blender, có contact sheet. Người dùng duyệt một lần. *(Opus)*
3. **Chuyển khoảng 25 module cũ sang kit.** Mỗi module thành công thức cộng lớp chữ ký (bậc 5–6). Thay chuỗi `if` trong `visual-effects.ts` bằng registry. Chia lô song song theo nhóm file. *(Sonnet)*
4. **Bậc 1–2 (20 tướng):** bảng đặc tả → công thức → người dùng duyệt lô. *(Sonnet/Haiku)*
5. **Bậc 3–4 (24 tướng):** làm tương tự. *(Sonnet)*
6. **Lớp chữ ký bậc 5–6** cho những tướng còn thiếu hoặc còn yếu, chia lô theo nguyên tố. *(Opus)*
7. Dọn mã chết (`TIER_VISUALS`, `visual-tier34-skills.ts`, các module cũ), cập nhật `docs/vfx-assets.md` và credits.

## Rủi ro

- **Hồi quy khi chuyển hết ngay khoảng 25 module.** Người dùng đã chọn cách này. Biện pháp: mỗi lô chuyển phải giữ đúng các thông số và điểm phát hiện có, ghi bảng so sánh trước/sau, và người dùng replay từng lô trước khi sang lô tiếp theo.
- **Kit trừu tượng quá sớm.** Biện pháp: chạy hai tướng khác nguyên tố trên kit trước khi làm hàng loạt.
- **Tải asset.** Mỗi atlas nguyên tố chỉ được tải khi có tướng thuộc nguyên tố đó trên sân. Tôn trọng giới hạn kích thước WebP.

## Câu hỏi chưa giải quyết

- Lớp chữ ký của 26 tướng bậc 5–6: những tướng đã có module (Bàn Cổ, Phượng Hoàng, Hình Thiên...) có cần làm lại lớp chữ ký không, hay chỉ chuyển nguyên trạng sang kit rồi nâng cấp sau?
- Các vật chất ngoài 5 nguyên tố (sét của Điện Mẫu và Lôi Chấn Tử, gió của Phong Bá, quang hoặc Phật của Đấu Chiến Thắng Phật): có cần flipbook riêng ở giai đoạn 2, hay để sang lớp chữ ký?
