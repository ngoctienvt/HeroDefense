# Ma Gia Kiếm — source 2026-10-25

- Nguồn mới qua Codex image_gen, không video: một master south v1, một edit south v2, ba hướng east/north/west v2 độc lập. Model/chi phí không được tool cung cấp, ghi null. Prompt thực, raw RGBA, reference hash và actual dimensions lưu cạnh từng ảnh.
- Chọn south v2 để sửa chóp cán cờ sát mép trên của v1; giữ v1 làm lịch sử. Sword downward guard là rest pose được chọn, không dùng prompt cũ yêu cầu hai tay/upright làm source authority.
- Rà poster sáng/tối bốn hướng: đúng giáp lam thép/ngà, cờ đỏ gắn sau vai trái, kiếm tay phải và tay trái trống. North không lộ mặt; west/east là ảnh tạo riêng, không mirror. Blade west hẹp do góc oblique, cần giữ mặt kiếm lớn ở strike.
- Raw north có 29 edge pixels alpha >0, west 15; tất cả alpha ≤4. Cả bốn hướng có 0 edge pixels alpha >4. Không tái tạo vì alpha haze; giữ raw và dùng alpha floor chung khi export. Không áp lề trống theo phần trăm.
- Bốn nguồn được duyệt làm identity/direction reference trong `assets/sprites/monster-motion/art-ma-sword/source/direction-source-review-2026-10-25.json`. Poster [sáng](../../../assets/sprites/monster-motion/art-ma-sword/source/direction-review-light-v1.png) / [tối](../../../assets/sprites/monster-motion/art-ma-sword/source/direction-review-dark-v1.png).
- **Chưa có walk/attack, canonical scale/root, runtime package hoặc routing.** Tiếp theo tạo walk hai half-cycle đổi chân và attack chuẩn bị → chém → thu thế từ đúng master hướng; nguồn master không tính là bundle hoàn chỉnh.
- Không chạy test/typecheck/build/game. Không thay đổi spawn/gameplay. Nghiệm thu camera/cỡ/animation trong game vẫn pending.


## South action sources — 16 candidate frames

- Tạo hai half-cycle walk bốn pose mỗi sheet; right v2 sửa pose 3 thành LEFT reach, left v2 chỉnh chóp cờ của top row. Chọn tám frame walk v2 để xem chuỗi đổi chân; không mirror hoặc dựng animation bằng biến dạng ảnh.
- Attack v2 có tám pose một cut: guard → brace/grip → draw/load → overhead → downstroke → follow-through → recover → guard. V3 chỉnh contour/angle kiếm pose 2; chỉ chọn đúng pose 2 từ v3, giữ bảy pose còn lại từ v2, không tự thay toàn sheet bằng edit mới.
- Các chóp cờ/kiếm sát mép được rà và chỉnh có mục tiêu. Sau tách, đo cả sáu raw cho kết quả 0 pixel alpha >127 trên mép toàn sheet ở từng frame; giữ raw nguyên bản. Nhận xét ban đầu về nguy cơ clipping là rà hình, không phải bằng chứng raw đã mất pixel. Không áp lề trống theo phần trăm.
- `prepare-south-sources.py` gọi QC/ownership hiện có, solid seed 127/min area 64. Cả sáu raw đều ghép ngược `sheet_origin` khớp chính xác alpha và RGB nhìn thấy, mỗi pixel thuộc đúng một output. Raw vẫn có WARN/FAIL cắt grid; không dùng cắt lưới trực tiếp hoặc lọc component lớn nhất.
- Rà poster sáng/tối: nhận diện/cầm kiếm/cờ giữ được; walk có hai contact đối diện và narrow pass. **Chưa chốt gait/loop/grounding.** Reach pose 3 vẫn rộng, cần xem ở common scale trước khi quyết định sửa. Attack recover pose 6 có blade trông ngắn hơn rest, cần rà foreshortening hoặc sửa trước motion approval. Không coi 16 pose này là bundle hoàn chỉnh.
- `action-source-inventory-2026-10-25.json` ghi 16/64 source references, hash và kích thước thật. Source review: [light](../../../assets/sprites/monster-motion/art-ma-sword/source/south-action-source-review-light-v1.png), [dark](../../../assets/sprites/monster-motion/art-ma-sword/source/south-action-source-review-dark-v1.png). Còn east/north/west walk/attack, canonical, timing/export/runtime.
- Prompt, ảnh raw và provenance ghi route Codex image_gen, model/chi phí null vì tool không trả. Debug: `source/south-source-preparation.log`. Python script đã parse AST; không chạy unit test/typecheck/build/game.

### Raw QC — giữ nguyên WARN/FAIL

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/south/qc-half-right-ownership-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=2166, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 67210, "detached_components": 21}, threshold=0.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/south/qc-half-right-ownership-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=2372, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 56040, "detached_components": 14}, threshold=0.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/south/qc-half-left-ownership-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=4, threshold=0.
- WARN `boundary_band` value=2548, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 63073, "detached_components": 17}, threshold=0.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/south/qc-half-left-ownership-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=3212, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 60584, "detached_components": 21}, threshold=0.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/south/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=4, threshold=0.
- FAIL `cross_cell_visible` value=4, threshold=0.
- WARN `boundary_band` value=803, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 107299, "detached_components": 38}, threshold=0.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/south/qc-ownership-candidate-v3/sheet-qc.json`:

- FAIL `cross_cell_components` value=5, threshold=0.
- FAIL `cross_cell_visible` value=5, threshold=0.
- WARN `boundary_band` value=995, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 96759, "detached_components": 38}, threshold=0.


## East action sources — thêm 16 candidate references

- Tạo walk east right half v1, left half v1; edit left v2 cố sửa near/far support. **Leg alternation vẫn chưa chứng minh**: các contact trông cùng chân gần dẫn, pose reach 3 cũng chưa rõ đổi chân. Chỉ lưu tám candidate references để tiếp tục rà, không motion approve hoặc đếm là walk hoàn tất. Dừng thêm re-roll trong lượt này.
- Attack east v2: pose 2 thiếu blade; edit v3 đã dựng lại thanh kiếm. Chọn đúng pose 2 từ v3. V3 pose 3 có 6 solid pixel mép ngoài, không chọn pose đó.
- Ownership v2/v3 gom blade pose 5 chạm blade pose 6 thành một component, làm pose 5 chỉ còn alpha haze và pose 6 chứa hai nhân vật. Exact pixel reconstruction vẫn đúng nhưng không chứng minh phân chia đúng. Đã xem poster và phát hiện lỗi, giữ poster v1 như lịch sử; không dùng các frame đó.
- Edit v4 sửa riêng follow-through pose 5 để hai blade tách rời. Chọn pose 5 **và pose 6** từ ownership v4, còn 0/1/3/4/7 từ v2. V4 pose 3 có 4 solid edge pixel, không chọn. Cả tám attack frame được chọn có solid owner, poster v2 sáng/tối đã rà; còn canonical root/scale/timing/transition.
- Công cụ source preparation hiện có thêm `--direction`/`--jobs-file`; không tạo pipeline mới. Giữ mặc định south và refs tường minh cho east. Bổ sung `ownedSolidComponentsPerFrame`/`everyFrameHasSolidOwner` vào QC summary để không nhầm pixel conservation với tám frame có nhân vật. Debug ở `east-source-preparation.log`; script AST parse, không unit test.
- Sáu raw east đều ghép ngược alpha/RGB nhìn thấy chính xác, mỗi pixel một owner. Source/provenance/prompt/reference hash ghi đủ; model/chi phí null. Raw WARN/FAIL giữ nguyên bên dưới. Các filename v2/v3/v4 là lịch sử candidate, không phải runtime version.
- Tổng inventory **32/64 action source candidates**, chưa có north/west action; walk east chưa chốt. Preview mới: [light v2](../../../assets/sprites/monster-motion/art-ma-sword/source/east-action-source-review-light-v2.png), [dark v2](../../../assets/sprites/monster-motion/art-ma-sword/source/east-action-source-review-dark-v2.png).
- Chưa đóng atlas, tích hợp, test/typecheck/build hoặc chạy game. Source artwork và dữ liệu tách khung không phải nghiệm thu motion.

### East raw QC — nguyên trạng WARN/FAIL

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/east/qc-half-right-ownership-v1/sheet-qc.json`:

- WARN `boundary_band` value=360, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 76201, "detached_components": 27}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/east/qc-half-left-ownership-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=1, threshold=0.
- WARN `boundary_band` value=545, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 102151, "detached_components": 21}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/east/qc-half-left-ownership-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=608, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 67681, "detached_components": 16}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/east/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- FAIL `empty_cells` value=[[1, 1]], threshold=[].
- WARN `boundary_band` value=3177, threshold=0.
- WARN `safe_frame` value=7, threshold=0.
- WARN `faint_specks` value={"floor_px": 83752, "detached_components": 32}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 0, 1, 1]; everyFrameHasSolidOwner=false.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/east/qc-ownership-candidate-v3/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- FAIL `empty_cells` value=[[1, 1]], threshold=[].
- WARN `boundary_band` value=3350, threshold=0.
- WARN `safe_frame` value=7, threshold=0.
- WARN `faint_specks` value={"floor_px": 57216, "detached_components": 20}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 0, 1, 1]; everyFrameHasSolidOwner=false.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/east/qc-ownership-candidate-v4/sheet-qc.json`:

- FAIL `cross_cell_components` value=7, threshold=0.
- FAIL `cross_cell_visible` value=7, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- WARN `boundary_band` value=3402, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 67807, "detached_components": 26}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 1, 1]; everyFrameHasSolidOwner=true.


## North/west source coverage — tổng 64 candidate references

- Tạo bốn sheet tám pose: walk/attack north và west, từng sheet tham chiếu đúng master hướng, không mirror/video. Thêm một edit attack north v3 làm rộng sword để gần master hơn; giữ v2 nguyên bản.
- North walk có hai phía sole/trailing đối diện và narrow pass trong poster; vẫn chưa kiểm tra loop trên common root/scale. West walk còn nghi vấn near/far support lặp; source coverage không chứng minh alternation.
- Attack north v3 pose 6 và 7 chạm nhau sau khi mở rộng blade: frame 6 không có solid owner, frame 7 gom hai hình, thêm 58 solid pixel trên mép sheet. **Không chọn cả hai output đó**. Chọn 0–5 từ v3, pose 6 tạm giữ v2 để không có frame gom/haze, pose 7 dùng master north đã duyệt làm authored rest recovery. Blade pose 6 còn nhỏ, cần sửa/rà khi chuẩn hóa; không motion approve.
- Tất cả 64 references được chọn có SHA-256 khớp; tám nhóm walk/attack bốn hướng. Các selected ownership frame có solid owner (master recovery là nguồn riêng). Còn east/west walk alternation, south recovery blade/reach, north recovery blade và cross-action scale/root/ground/timing. **Chưa có bundle hoàn chỉnh của Ma Gia Kiếm.**
- Năm raw mới đều giữ prompt, actual dimensions, route Codex image_gen/model và chi phí null, reference hash, QC nguyên trạng. Ghép ngược ownership khớp alpha/RGB nhìn thấy; raw v3 north chứng minh conservation không đảm bảo phân chia tám nhân vật đúng. Không bỏ các frame lỗi khỏi lịch sử nguồn.
- Đã xem north/west poster sáng/tối. Thumbnail nguồn chưa registered; khác cỡ do ownership canvas và master recovery không phải runtime scale. Nền nâu trong raw là RGB ẩn dưới alpha 0 (corner RGBA walk north=[99,47,20,0], attack north=[56,22,6,0]); không key nền nâu hoặc gọi là matte lỗi khi compositing đã sạch.
- Preview: [north light](../../../assets/sprites/monster-motion/art-ma-sword/source/north-action-source-review-light-v1.png), [north dark](../../../assets/sprites/monster-motion/art-ma-sword/source/north-action-source-review-dark-v1.png), [west light](../../../assets/sprites/monster-motion/art-ma-sword/source/west-action-source-review-light-v1.png), [west dark](../../../assets/sprites/monster-motion/art-ma-sword/source/west-action-source-review-dark-v1.png).
- Chạy asset preparation/ownership/QA và AST parse script; không unit test/typecheck/build/game. `north-source-preparation.log` và `west-source-preparation.log` giữ output công cụ. Tiếp theo chuẩn hóa common scale/root và sửa đúng các pose còn yếu, không chốt chất lượng chỉ từ số lượng 64.

### North/west raw QC — nguyên trạng WARN/FAIL

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/north/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=6844, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 121948, "detached_components": 33}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/north/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=1631, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 111263, "detached_components": 19}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/north/qc-ownership-candidate-v3/sheet-qc.json`:

- FAIL `cross_cell_components` value=5, threshold=0.
- FAIL `cross_cell_visible` value=5, threshold=0.
- FAIL `sheet_edge` value=1, threshold=0.
- FAIL `empty_cells` value=[[1, 2]], threshold=[].
- WARN `boundary_band` value=2426, threshold=0.
- WARN `safe_frame` value=7, threshold=0.
- WARN `faint_specks` value={"floor_px": 69606, "detached_components": 9}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 0, 1]; everyFrameHasSolidOwner=false.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/walk/west/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=5, threshold=0.
- FAIL `cross_cell_visible` value=5, threshold=0.
- WARN `boundary_band` value=1475, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 130966, "detached_components": 38}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 1, 1]; everyFrameHasSolidOwner=true.

File `assets/sprites/monster-motion/art-ma-sword/source/actions/attack/west/qc-ownership-candidate-v2/sheet-qc.json`:

- FAIL `cross_cell_components` value=6, threshold=0.
- FAIL `cross_cell_visible` value=6, threshold=0.
- WARN `boundary_band` value=3045, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 94695, "detached_components": 23}, threshold=0.

Ownership solid components/frame: [1, 1, 1, 1, 1, 1, 1, 1]; everyFrameHasSolidOwner=true.
