# Tạo lại 16 ảnh stylized còn thiếu

Phạm vi: 16 raw đã cách ly, không tạo lại 127 candidate còn có nguồn; không tích hợp runtime/build/game. Route: host image_gen, style congcong-stylized-v1. Mỗi ảnh được xem và ghi metadata/grid/alpha/hash; cặp trước/sau tạo từ nguồn rear mới.

## Tiến độ

- [x] `warfire-vortex-sheet`
- [x] `warfire-ground`
- [x] `berserk-wave`
- [x] `wave-impact-sheet`
- [x] `staff-slam-sheet`
- [x] `staff-lane-fracture`
- [x] `clone-arrival-sheet`
- [x] `clone-staff-hit-sheet`
- [x] `bowl-rear-sheet`
- [x] `bowl-front-sheet`
- [x] `volcanic-eruption-sheet`
- [x] `lava-basin-ground`
- [x] `lava-ignite-sheet`
- [x] `buddha-palm-descent-sheet`
- [x] `five-finger-mountain-rear-sheet`
- [ ] `five-finger-mountain-front-sheet` — `BLOCKED_TOOL`: host image_gen trả HTTP 429 `usage_limit_reached`; lượt gọi không sinh ảnh. Công cụ ghi reset lúc **10:18:16 ngày 21-10-2026, Asia/Bangkok** (03:18:16 UTC).

## Đầu ra và trạng thái

Đã tạo **15 raw mới**, qua 19 lượt sinh ảnh thành công (bốn ảnh có một lượt sửa). Route `host_image / image_gen`, model không được host công bố; không dùng API/CLI thay thế. Không lấy ảnh vẽ tay đã cách ly để điền vào job cuối.

- Raw: `assets/vfx-source/tier56-codex-art/raw/`.
- Metadata hiện tại: `assets/vfx-source/tier56-codex-art/metadata/`, có nguồn output chính xác, SHA256, kích thước thật, grid/rect, thông số alpha, prompt, reference và ghi chú QA.
- Prompt/lượt thử: `assets/vfx-source/tier56-codex-art/iterations/stylized-regeneration-20261020/`; giữ raw mỗi lượt và manifest trước đợt tạo.
- [Bảng xem trên nền sáng/tối](../../../assets/vfx-source/tier56-codex-art/previews/stylized-regeneration-15-assets-qa.jpg); [ghép thử cặp bát](../../../assets/vfx-source/tier56-codex-art/previews/bowl-pair-stylized-dark.jpg).
- QA chi tiết: `assets/vfx-source/tier56-codex-art/iterations/stylized-regeneration-20261020/qa-summary.json`.

Ledger toàn lô: **74 raw-ready, 17 BLOCKED_ART, 51 style-review-required, 1 BLOCKED_TOOL**. 142/143 job có candidate; 127 job ngoài đợt này giữ nguyên bản ghi. Blocker/review có từ trước không được tự nâng thành đạt.

## QA ảnh tĩnh và lưu ý xử lý

Đã xem các ảnh sinh ra, composite alpha trên nền sáng/tối, hình đại diện từng sheet và cặp bát trước/sau. Khối/vật chất/palette riêng được giữ; không sinh nhân vật vào hiệu ứng. Các raw đều có alpha 0–255 và giữ nguyên byte từ tool. Kích thước thực: 1254² cho ảnh vuông, 1774×887 cho sheet tám khung, 2172×724 cho ribbon.

Một số sheet không đặt khoảng trống đúng đường chia đều. Metadata ghi `nominalXBounds/nominalYBounds`, đường cắt thực tế tìm trong gutter có alpha ≤16, `rectFormat` xyxy với phải/dưới exclusive và offset đặt vào một canvas chung theo gốc ô danh nghĩa. Khi xử lý phải dùng các rect/offset này, không fit bbox riêng hoặc chia UV đều. Raw không bị chỉnh pixel để qua QA. `registration.anchorStatus` ghi rõ anchor mới là mục tiêu authoring, chưa cân chỉnh trong engine.

Các cảnh báo đường chia đều ban đầu: lốc chiến hỏa ô 3/7/11; va chạm sóng ô 2/3; đòn phân thân ô 4/8; phun trào ô 6–16; bàn tay và núi sau ô 1–16. Sau rà gutter thực tế, chỉ **va chạm sóng ô 2/3** còn sát mép rect dưới 2 px: giữ padding canvas thống nhất, rà alpha khi đóng atlas. Đây là cảnh báo, không tuyên bố mọi kiểm tra đều sạch.

Hai decal đã sửa góc nhìn sang trên xuống; bàn tay và lốc đã sửa framing. Cặp bát được ghép xem và khớp footprint/phase. Vòng hold 5–12 của lava/bát/núi, sai khác silhouette núi và anchor cần kiểm playback khi xử lý. Một số frame cuối còn hạt/đá nguội, cần exit rõ ở bước tích hợp; không biến chúng thành địa hình hoặc trạng thái gameplay mới.

## Công việc còn lại

Sau khi host mở lại hạn mức, chỉ tạo **`five-finger-mountain-front-sheet`** từ prompt hiện tại, tham chiếu `raw/five-finger-mountain-rear-sheet.png` mới (ảnh 3, geometry/phase) và hai nguồn Cộng Công (`STYLE_ONLY`). Giữ lớp trước thấp, không che hành lang nhìn quái. Xem cặp trước/sau và lưu nguồn/metadata/hash rồi mới đổi `BLOCKED_TOOL`. Không tự khôi phục ba WebP Như Lai đã gỡ: xử lý/integrate là bước riêng, pipeline hiện tại cần cập nhật để dùng rect thực tế trước khi đóng atlas.

## Kiểm tra

Chưa chạy build/test/game; chưa thay runtime. Đã đối chiếu SHA256 của 15 raw với nguồn tool/iteration, xác nhận 764 ảnh trong danh sách bảo vệ của đợt cleanup giữ nguyên hash. Doctor: host_image ready; thiếu API keys và resvg-py không chặn route này; có cảnh báo nhiều Python và ledger cũ chưa đối soát, không tự thay đổi chúng. Blocker hiện tại là hạn mức host, không phải chất lượng ảnh hay thiếu API key.
