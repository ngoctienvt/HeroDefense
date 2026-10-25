# Ngân Giác — nguồn walk south / attack bốn hướng

Đã rà bốn master hướng từ source hiện có, giữ một sừng bạc, tóc trắng, áo xanh tím và hồ lô **cầm tay trái giải phẫu**, tay phải đánh chưởng. Profile cập nhật mô tả đúng master; không đổi nhận diện thành hồ lô treo hông như prompt cũ. Các directions source được duyệt, canonical root/scale vẫn pending.

Tạo bằng Codex image_gen, sprite still/sheet, native alpha, không video:

- Walk south: hai half-cycle bốn pose, có contact đối diện và narrow passing. **Chưa motion approve**: pose1 của half phải có thể đưa chân trái tới quá sớm; cần rà contact-order hoặc sửa đúng pose này. Không lấy đủ tám ảnh làm bằng chứng gait đúng.
- Attack south/east/west/north: mỗi hướng tám pose brace → right-palm launch/contact → recovery, hồ lô không đổi tay. Giữ làm nguồn căn chỉnh; north dùng occlusion phía xa, không quay mặt về viewer. Chưa shared scale/timing/anchor hoặc game acceptance.
- Tổng **40/64 action source still**, cộng bốn idle master có sẵn. Còn walk east/west/north. Source inventory: `assets/sprites/monster-motion/art-silver-horn/source/action-source-inventory-2026-10-25.json`.
- Sáu raw được ownership-slice với solid seeds alpha>127/min_area64, giữ toàn bộ faint pixels; đảo sheet_origin khôi phục đúng alpha và RGB của mọi pixel visible. Không lọc component hay grid-cut.

Đính chính nhận xét ban đầu về viền: composite nền sáng xác nhận xanh/hồng của preview raw (gồm legacy walk south v3) nằm dưới alpha0, không hiện thành viền. Lý do thay nguồn legacy là gait/phase thiếu hoặc lặp, không phải nhận định nền đục/chroma theo RGB. Giữ toàn bộ legacy sources và QA.

East attack v4: sheet_edge FAIL1 có ba pixel alpha>127 tại biên phải y849–851. Zoom `right-edge-detail-v4.png` cho thấy đầu đuôi áo vẫn trong khung, nhưng một đoạn cong ngoài chạm biên; giữ cờ contour review trước pack, không tuyên bố raw PASS hoặc khôi phục phần đã mất bằng ownership. Không sinh lại cả sheet chỉ vì safe-frame15%.

Đã xem poster nguồn sáng; bản tối có sẵn. Chưa build/runtime export, chưa chạy unit test/typecheck/game. Tiếp theo: các walk hướng khác, support pose south và contour east, rồi dùng pipeline shared registration/packer để đóng thư viện.

## Raw QA nguyên trạng


File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/south/qc-half-right-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=3, threshold=0.
- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=3582, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 101070, "detached_components": 23}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/south/qc-half-left-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=3798, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 72905, "detached_components": 24}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/attack/south/qc-spill-v4/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=2923, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 99677, "detached_components": 8}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/attack/east/qc-spill-v4/sheet-qc.json`:

- FAIL `cross_cell_components` value=5, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- WARN `boundary_band` value=2060, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 98986, "detached_components": 28}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/attack/west/qc-spill-v4/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=4820, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 96265, "detached_components": 15}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/attack/north/qc-spill-v4/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=2637, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 111352, "detached_components": 29}, threshold=0.

Raw spill FAIL giữ nguyên; ownership output bảo toàn pixel không biến raw grid thành PASS. Các boundary/safe_frame warning không tự yêu cầu lề trống theo phần trăm.


## Cập nhật: đủ nguồn và bundle thư viện

- Đủ 64 action frame + 4 idle, bốn hướng. Walk dùng hai half-cycle đổi chân; south right v2, north left v2. East left chọn ba frame khỏe từ v1 và frame cuối đã sửa từ v2; không chọn ô v2 khác bị chạm mép.
- Attack east chọn v4 frame 0–6; frame 7 dùng direction master đã duyệt làm recovery rest. V4 frame cuối bị cắt tay áo; edit v5 làm lỗi lớn hơn nên bị loại. Nguồn lỗi vẫn giữ. Bản export recovery này giống idle east từng pixel.
- Canonical 68 frame/17 nhóm, canvas 1000²/root [500,800]. Chỉ pad nguồn ownership lên 1024², kiểm tra 68 bản sao giữ nguyên RGBA; không resize từng frame. Dùng scale chung mỗi nhóm và template waist theo first pose để tránh nhận nhầm họa tiết mây. Các poster landmark walk/attack đã xem; attack marker nằm ở boot/toe.
- Walk dịch cố định theo hướng south +12/east +14/north -15/west -8 px. Export chỉ loại alpha ≤4; giữ silhouette và guard Lanczos 12 source px. Kiểm tra 68 cặp hash canonical/export, không crop hoặc đổi scale riêng từng frame.
- Đã đóng `package/`: 68 frame, 12 clip, hai trang WebP **924.602 byte**, RGBA decoded **18 MiB**, chưa mipmap. Rect alpha đầy đủ trong padding 16 px, chung anchor, package/web khớp SHA-256. Walk 933 ms loop; attack 1.000 ms, contact frame 4 bắt đầu 520 ms. Tạo tám animated WebP preview từ chính atlas decode.
- Đã xem poster export sáng/tối và contact runtime-format nền tối. Chấp nhận source để đóng gói thư viện; nghiệm thu gait/transition ở camera game vẫn pending. Raw QC WARN/FAIL bên dưới giữ nguyên, không gọi toàn bộ QA là pass.
- Profile `library-packaged`, `not-routed-current-encounter`; không chép public hoặc đổi gameplay. Chưa chạy test/typecheck/build/game. Khi được route, người dùng kiểm tra hướng, cỡ chân/HP, idle–walk–attack, spacing Kim/Ngân và timing hit trên bản build mới.
- Source/preparation/verification: `source/motion-source-review-v1.json`, `source/export-preparation-v1.json`, `source/package-verification-v1.json`, `web/animation-previews.json`. Debug pack: `source/library-pack.log`.
- Sửa input của canonical prep Kim/Ngân để đọc immutable direction review thay vì profile đã bị exporter thay anchor, tránh lần chạy sau lấy output làm source. AST parse ba script đã sửa; không chạy test.

### Raw QC bổ sung — giữ nguyên các cảnh báo/lỗi

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/south/qc-half-right-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=3, threshold=0.
- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=3768, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 73693, "detached_components": 12}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/attack/east/qc-spill-v5/sheet-qc.json`:

- FAIL `cross_cell_components` value=5, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- WARN `boundary_band` value=2294, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 85330, "detached_components": 13}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/east/qc-half-right-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=586, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 77088, "detached_components": 16}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/east/qc-half-left-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=1, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- WARN `boundary_band` value=1776, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 62575, "detached_components": 17}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/west/qc-half-right-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=2603, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 63597, "detached_components": 11}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/west/qc-half-left-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=3081, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 62705, "detached_components": 19}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/north/qc-half-right-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=6111, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 81417, "detached_components": 17}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/north/qc-half-left-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=3, threshold=0.
- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=6511, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 68593, "detached_components": 19}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/north/qc-half-left-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=3, threshold=0.
- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=7227, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 65106, "detached_components": 23}, threshold=0.

File `assets/sprites/monster-motion/art-silver-horn/source/actions/walk/east/qc-half-left-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- WARN `boundary_band` value=2196, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 51639, "detached_components": 16}, threshold=0.
