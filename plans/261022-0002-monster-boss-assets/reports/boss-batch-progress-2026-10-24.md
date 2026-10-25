# Boss source production — 2026-10-24

Scope: 39 ID (20 quái + 19 boss), Ngũ Hành bị loại. Ưu tiên boss; mọi animation được tạo bằng sprite still/sheet, không video.

## Kết quả

- Sửa nhận định alpha của sheet Chu Hậu/Liệt Giáp: nền nâu trong preview là RGB dưới alpha 0; PNG có nền trong suốt thật. Sidecar và báo cáo cũ đã được đính chính, không key hoặc tái tạo vì màu ẩn.
- Walk south Chu Hậu v1/v2 và Liệt Giáp được ownership-slice thành tám still nguyên component mỗi bộ. Contact checkerboard tại [walk review](./boss-walk-ownership-review-2026-10-23.png). Chu Hậu v1 FAIL head heuristic, v2 không FAIL nhưng còn drift; Liệt Giáp head-template không fit. Nhịp chân vẫn cần sửa, chưa approve walk.
- Tạo attack south tám pose cho Chu Hậu và Liệt Giáp, lưu raw/actual prompt/reference/hash. Cả hai raw 1774×887, RGBA alpha thật. Chu Hậu spill 1 component và sheet-edge 2; cần phân biệt contour bị cắt với halo. Liệt Giáp spill 5 component, sheet-edge 0. Ownership giữ đủ tám frame mỗi bộ, không cắt lưới trực tiếp.
- Liệt Giáp attack south đăng ký chân bằng translation-only scale 1.0, canvas 700×650, anchor [350,550], không crop. One-shot candidate tám frame/800 ms có một cảnh báo telegraph 12 ticks; timing chưa khớp server và chưa chốt source motion. Filmstrip sáng/tối/checker đã rà; anatomy bốn tay còn cần kiểm tra kỹ ở thế nén/che khuất.
- Hắc Phong (`b001`) đã có walk và attack south tám pose, raw 1536×1024 RGBA. Prompt v2 mô tả đúng master và từng pose, không áp lề trống cố định. Spill walk 2 / attack 5 component, mép toàn sheet 0; ownership giữ đủ tám frame/bộ.
- **Chốt pose art nguồn attack south của b001** sau khi xem đủ tám pha trên sáng/tối/checker: hai tay/hai chân, một slam và thu thế đọc rõ. Registration dùng midpoint hai tiếp điểm chân, scale 1.0, canvas 700×720, anchor [350,600], mọi frame cropped=false. Clip one-shot preview 1.000 ms, 0 warning; PNG byte-copy/WebP timeline/tick checks đạt. Lưu `source-review-v1.json` để phân biệt chốt pose với hoàn tất bundle.

## Chưa hoàn tất

B001 walk còn cần nhịp contact/pass/support; các boss chưa đủ bốn hướng/action chung scale, export runtime và nghiệm thu game. Source clip/WebP ở thư mục `package-candidate-*` chỉ là đầu ra QA. Timing là art preview, không đổi gameplay hoặc tự nhận thời điểm damage.

Tiếp theo: b001 sửa pass-through của walk, đăng ký chân/scale chung cho các hướng; tiếp tục Kim/Ngân Giác và quartet Ma Gia theo ưu tiên boss.

Không chạy build, test, server hoặc game. Chỉ chạy công cụ chuẩn bị và QA asset, kiểm tra hash/canvas/registration và xem ảnh.

## B001 — bốn hướng source action

Đã sinh riêng thêm east/north/west, mỗi hướng một sheet walk và một attack, tham chiếu đúng direction master. Tổng b001 có 64 still nguồn (4 hướng × 2 action × 8 pose), đủ actual prompt/reference/hash/native alpha và ownership extraction. Đây là độ phủ nguồn, chưa phải bundle hoàn chỉnh.

| Hướng | Action | Spill component | Chạm mép toàn sheet | Nhận định |
|---|---|---:|---:|---|
| south | walk | 2 | 0 | needs-gait-phase-correction |
| south | attack | 5 | 0 | pose-source-reviewed |
| east | walk | 7 | 0 | needs-gait-phase-correction |
| east | attack | 6 | 0 | candidate-needs-registration-and-review |
| north | walk | 1 | 0 | needs-gait-phase-correction |
| north | attack | 3 | 0 | needs-impact-direction-correction |
| west | walk | 1 | 0 | needs-gait-phase-correction |
| west | attack | 6 | 0 | candidate-needs-registration-and-review |

Contact ở cùng QA scale 0.30, giữ toàn canvas: [b001 source review](./b001-action-source-review-2026-10-24.png). Walk có alternation nhưng thiếu pass-through rõ; không approve gait chỉ vì đủ tám ảnh. North attack pose 4–5 đưa tay về phía viewer, cần sửa các pose impact theo hướng đi xa camera; không xoay mặt hoặc mirror. East/west attack đọc đúng hướng, còn registration và cross-view scale. South attack giữ quyết định chốt pose nguồn; không tự ghi runtime/game pass.

## B001 north impact — chỉnh một lần có mục tiêu

Edit v2 sửa riêng hướng nện/thu tay của các pose 4–6: lưng giữ về viewer, thân chúi đi xa camera, tay ở phía trước cơ thể và bị occlusion tự nhiên. Giữ v1 làm lịch sử lỗi. Source vẫn đủ tám pose; sheet-edge 0, ownership giữ nguyên component. Chốt pose artwork của attack east/north(v2)/west sau khi rà toàn bộ pha và hướng; `source-review-v1.json` ở từng action ghi rõ chỉ chốt art nguồn, chưa registration/shared scale/runtime. Poster hiện tại: [b001 source review v2](./b001-action-source-review-2026-10-24-v2.png).

## B001 walk v2 và canvas chung

- Một targeted edit mỗi hướng bổ sung hai pass-through hẹp dưới hông; giữ v1 và exact prompt/reference/hash. Không sinh lại master hoặc thay hướng bằng mirror.
- Raw v2 vẫn spill (south/east/north/west: 2/5/4/4 component), sheet-edge đều 0. North alpha >16 tạo bridge mờ, extraction mặc định gộp nhân vật và sinh canvas rộng 1.509 px; output đó được đánh rejected. Solid seed alpha >127 tách đủ tám thân, gán lại toàn bộ viền/haze chứ không xóa: đảo `sheet_origin` của tám frame khôi phục chính xác alpha và RGB của mọi pixel alpha >0 ở cả bốn hướng. Đây là sửa ownership theo chứng cứ, không nới raw QA.
- Helper registration hiện có thêm `--asset-root` và một `sourceScale` dùng chung cho cả map, premultiplied Lanczos trước translation. Mặc định scale 1 giữ đường đi cũ. Input scale/anchor phải hữu hạn và map/output/frame không thoát asset root. Debug transform lưu trong `source/canonical-v1/registration.log`.
- Chuẩn hóa **36/68 frame**: bốn idle tĩnh và 32 walk vào canvas 700×700, root [350,600], neutral body 400 px. Một factor từ neutral/rest cho mỗi nhóm; không fit bbox từng pose. Walk dùng belt landmark cộng ground projection kế thừa từ rest master; không ghim vào chân đang nhấc. Hai matcher có confidence thấp đã được xem trực tiếp, giữ nguyên điểm số trong map thay vì nới ngưỡng.
- Đã rà cạnh idle ở body khoảng 120 px, nền [sáng](../../../assets/sprites/monster-motion/b001/source/canonical-v1/review-walk-light.png) / [tối](../../../assets/sprites/monster-motion/b001/source/canonical-v1/review-walk-dark.png). Nguồn đọc được hai passing pose, identity và cỡ cơ thể ổn định hơn. Clip order là candidate cần rà continuity trước khi chốt toàn bộ motion.
- Builder preview: tám clip/36 frame, 0 numeric warning. Static hash/canvas/scale-group checks đạt, sai số làm tròn declared root tối đa 0,4799 px; không dùng con số này làm bằng chứng foot biomechanics.
- Thêm ba regression case cho shared scale, NaN và path escape; chỉ AST parse, **chưa chạy unit test**. Khi người dùng muốn chạy: `python -m unittest discover -s tools/assets -p test_register_monster_static_frames.py`.

Còn chuẩn hóa 32 attack vào cùng canvas, rà toàn bộ clip/cỡ thực, và sửa placement packer trước export: packer hiện cố định root ở đáy padding, nên không chứa được phần chân/paw chiếu xuống dưới world root. Phải bố trí theo envelope bất đối xứng quanh root; không dịch root hoặc cắt hình để qua kiểm tra. Chưa đổi profile sang motion-approved, chưa export runtime, build hoặc game.

## B001 runtime package — 2026-10-25

- 2026-10-25: B001 hoàn thành 68 canonical frame/12 clip, source review chốt export v2 theo toe-plane. Walk dùng một offset cố định mỗi hướng, attack dùng foot ROI (không lấy tay nện làm chân), không fit scale từng frame. Packer hỗ trợ motionBoundsPx bất đối xứng theo chiều dọc, giữ hành vi legacy. Đã chạy asset pack: 2 trang WebP 808.850 byte, RGBA 18 MiB chưa mipmap; chép JSON/pages vào public. QA 68 rect có alpha, không chạm cell edge, chung anchor; 68 cặp hash canonical và bản sao public/web khớp. Đã xem source và contact sheet runtime; chưa unit test/typecheck/build/game. Nhịp strike/transition và nghiệm thu trong game còn mở. [Bundle source review](../../../assets/sprites/monster-motion/b001/source/motion-source-review-v2.json).

## Hắc Phong timing — 2026-10-25

Đối chiếu consumer `swingProgress` (windup 0–0,5 / strike 0,52–1) thấy contact frame 5 bắt đầu 0,667. Đổi bốn attack clip sang duration `[70,80,100,250,20,80,150,250]` ms: overhead frame 3 tới 0,50, downstroke 4 từ 0,50–0,52, contact 5 ở strike 0,52; tổng 1.000 ms. Pack lại nguồn, manifest public/web khớp hash, pages không đổi pixel. Test `apps/client/test/monster-boss-timing.test.ts` đọc manifest thật và dùng selector/phase mapper thật, chưa chạy. Không đổi gameplay/server damage; ingame còn chờ người dùng.
