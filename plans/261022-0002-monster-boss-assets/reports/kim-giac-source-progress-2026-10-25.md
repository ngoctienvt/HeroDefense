# Kim Giác — nguồn hành động hướng nam, 2026-10-25

Đã tạo bằng Codex image_gen, ảnh sprite tĩnh/native alpha, không video. Lưu prompt, reference hash, raw PNG và sidecar; model/giá không được tool báo. Chưa chép runtime, build hay chạy game/test.

- Attack south: tám pose đấm tay phải, source art được rà và giữ làm nguồn sản xuất; chưa shared registration/scale hoặc timing theo server.
- Walk south v1 và edit v2: giữ identity nhưng lặp foreground boot. Cả hai chưa đạt gait; không tạo lại toàn sheet thêm lần nữa.
- Một pose contact tạo riêng đã đọc đúng chân trái bước tới (dưới hai hồ lô, screen right), chân phải lùi. Giữ làm mốc sửa nửa chu kỳ đối diện; chưa coi một frame là walk hoàn chỉnh.
- Ownership attack v1/walk v2 bảo toàn chính xác alpha và visible RGB khi đảo sheet_origin. Không lọc component hoặc xóa chi tiết để qua kiểm tra.
- Rà north master phát hiện skull pauldron ở sai bên giải phẫu so với gourds/master nam. Ghi source-review, chưa dùng tạo action phía sau; không duyệt đủ bốn hướng.

## Raw attack QA (giữ nguyên kết quả)

File: `assets/sprites/monster-motion/art-gold-horn/source/actions/attack/south/qc-spill-v1/sheet-qc.json`.

- FAIL `cross_cell_components` value=4, threshold=0.
- FAIL `cross_cell_visible` value=4, threshold=0.
- WARN `boundary_band` value=2567, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 52445, "detached_components": 5}, threshold=0.

Sheet-edge = 0. Cross-cell spill được xử lý bằng ownership (không grid slice); safe-frame là heuristic khoảng trắng, không tự làm lại ảnh vì thiếu lề 15%. Alpha haze được giữ ở nguồn, chưa làm alpha floor cho runtime. Packaging exact-pixel/timeline pass chỉ là dữ liệu, không chứng minh motion mượt.

Tiếp theo: dùng pose contact đã sửa làm reference cho các pha chuyển chân tương ứng; hoàn thiện hướng nam trước khi nhân sang east/west/north. Cần registration và xem preview loop; không dùng phép lật/biến dạng một ảnh để giả bước đi.

## Tiếp tục: tám pha bước và sửa hướng lưng

Hai sheet bốn pose đã tạo được hai nửa chu kỳ: right-contact/support/left-pass/reach rồi left-contact/support/right-pass/reach. Tám source pose được rà trên `phase-review-v3-light.png` / `phase-review-v3-dark.png`; giữ làm nguồn căn chỉnh, chưa duyệt loop/runtime. Poster dùng chung scale 0,24 và belt translation (NCC 0,7628–1,0); không fit bbox từng pose. Cần so rest scale, foreshortening và ground anchor trước khi đóng gói.

Ownership mỗi half được đảo sheet_origin, xác nhận khớp tuyệt đối alpha và mọi RGB visible của raw. Không lấy raw grid cut. V1/v2 sheet tám pose sai gait vẫn giữ lịch sử; nguồn hiện chọn trong `selected-phases-v3.json`.

North master v2 đã sửa skull pauldron về anatomical left, cùng phía gourds, đã xem lại bản alpha xử lý 1024². Profile chọn `north/master-v2` và east candidate đã rà, đủ bốn direction source. Motion/packaged/inGame vẫn pending.

### QA raw half-cycle (không đổi kết quả)


File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/south/qc-half-left-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=631, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 48115, "detached_components": 19}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/south/qc-half-right-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=436, threshold=0.
- WARN `safe_frame` value=4, threshold=0.
- WARN `faint_specks` value={"floor_px": 43490, "detached_components": 16}, threshold=0.

Raw spill vẫn FAIL; ownership giữ component toàn vẹn và kiểm tra pixel. Safe-frame thiếu lề là heuristic, không là lý do tạo lại ảnh. Không chạy unit test/typecheck/build/game.

## Bốn hướng action source

Đã tạo độc lập east/west/north × walk/attack × tám pose từ master hướng tương ứng, lưu raw native alpha, prompt và reference hash. North v1 lỗi lặp chân/arm overhead được giữ; một targeted edit mỗi sheet tạo v2 sửa nửa sau walk và occlusion của right punch. Source inventory chọn đủ **64 pose action** + bốn master idle, tại `source/selected-action-sources-v1.json`.

Đã rà raw và poster `action-source-coverage-v1-dark.png` (cùng preview sáng). Đây là độ phủ nguồn, chưa canonical registration hoặc motion/runtime approval. East/west gait cần đối chiếu hip/foot ownership và continuity khi căn chỉnh; không coi đủ ảnh là loop mượt. Bước kế tiếp: common rest body scale, foot plane, timing và loop/attack recovery trước atlas. Không quay lại sinh master hoặc chuyển video.

Ownership cả sáu raw v1 và hai raw north v2 khôi phục chính xác alpha và visible RGB bằng sheet_origin, không lọc component. Những FAIL dưới đây vẫn giữ nguyên; ownership không biến raw grid thành PASS.

### Raw QA mới (nguyên trạng)

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/east/qc-spill-v1/sheet-qc.json`:

- WARN `boundary_band` value=22, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 63818, "detached_components": 10}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/attack/east/qc-spill-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=2, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=1012, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 63695, "detached_components": 11}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/west/qc-spill-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=1, threshold=0.
- WARN `boundary_band` value=319, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 62124, "detached_components": 2}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/attack/west/qc-spill-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=4, threshold=0.
- FAIL `cross_cell_visible` value=4, threshold=0.
- WARN `boundary_band` value=3456, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 67529, "detached_components": 0}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/north/qc-spill-v1/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=1, threshold=0.
- WARN `boundary_band` value=107, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 59020, "detached_components": 10}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/north/qc-spill-v2/sheet-qc.json`:

- FAIL `cross_cell_visible` value=3, threshold=0.
- WARN `boundary_band` value=146, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 503694, "detached_components": 2346}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/attack/north/qc-spill-v1/sheet-qc.json`:

- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 57045, "detached_components": 3}, threshold=0.

File `assets/sprites/monster-motion/art-gold-horn/source/actions/attack/north/qc-spill-v2/sheet-qc.json`:

- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 43133, "detached_components": 1}, threshold=0.

Không chạy test/typecheck/build/game. Atlas Kim Giác chưa xuất. Nguồn/frame/provenance được giữ để tiếp tục căn chỉnh, không phải asset đã nghiệm thu.

Rà poster sáng cuối: north walk v2 có halo nâu/xám mờ nhìn thấy quanh thân/chân. Đây là alpha haze thực, khác RGB dưới alpha0; cần đo/làm sạch matte trước pack, không tuyên bố alpha đã sạch. Đã ghi trong source-review-v2.

## Canonical candidate 68 frame + north matte v3

Một edit alpha duy nhất cho north walk giữ các pose/nhận diện, giảm alpha haze 5–63 từ 349.530 xuống 16.846 pixel; composite sáng đã xem sạch hơn, không đồng nhất haze thực với RGB dưới alpha0. Raw matte v3/metadata/prompt/reference và ownership exact-pixel reconstruction được giữ; inventory chọn v3, v2 vẫn là lịch sử.

Chuẩn hóa 68 frame (4 idle + 32 walk + 32 attack) vào canvas 1000×1000/root [500,800], rest height 500 px; mỗi nhóm dùng một factor đo từ rest horn-to-belt, không scale từng pose. South walk hai half-cycle là hai source group. Script `source/canonical-v1/prepare-canonical.py` gọi helper registration hiện có, giữ log transform và maps, không tạo pipeline pack mới. Tất cả 68 source/output hash pair khớp, RGBA canvas đúng, cropped=false; Python AST parsed, không chạy unit test/build/game.

Attack dùng tiếp điểm toe trong vùng hai chân để không đóng băng độ hạ hông; hai far boot south pose4/5 được xem raw và khoanh ROI riêng vì đuôi áo thấp hơn boot gây nhận nhầm. Score NCC thấp vẫn lưu, không giảm threshold để báo PASS; landmark đai sau frame0 chỉ hỗ trợ chẩn đoán ở attack, anchor lấy từ chân. Matcher vùng hông loại nhầm hoa văn hồ lô ở north contact.

Preview canonical sáng/tối đã tạo; đã xem walk light và attack dark. **Chưa motion-approved**: walk south/north còn toe contour thấp hơn neutral ground line, cần fixed group ground adjustment và kiểm tra chuyển idle/walk; không thay từng frame bằng bbox fit. Cần xem loop/recovery, thống nhất timing và pack atlas. Không chép runtime Kim Giác.

### Raw matte v3 QA

File `assets/sprites/monster-motion/art-gold-horn/source/actions/walk/north/qc-matte-v3/sheet-qc.json`:

- FAIL `cross_cell_components` value=1, threshold=0.
- FAIL `cross_cell_visible` value=2, threshold=0.
- WARN `boundary_band` value=150, threshold=0.
- WARN `safe_frame` value=8, threshold=0.
- WARN `faint_specks` value={"floor_px": 107488, "detached_components": 10}, threshold=0.

Raw spill được giải bằng ownership bảo toàn pixel; không coi raw grid là pass. Không tạo lại ảnh vì thiếu lề heuristic.

Landmark review bổ sung: south attack pose2 tự động bắt đuôi áo giữa thay toe chân trái; source point [58,442] đã xác minh được ghi override, giữ chẩn đoán cũ trong `attack-landmark-review.png` cùng status sidecar. Sau sửa, chạy lại preparation và recheck 68 source/output SHA-256 pair; poster attack hiện tại được tái tạo. Chưa đóng gói runtime.

## Library package hoàn tất

Đã chốt export source và đóng gói bằng packer hiện có, destination `assets/sprites/monster-motion/art-gold-horn/package/`, bản sao review ở `web/`. **12 clip / 68 frame / 2 trang WebP**, tổng page 995.162 byte; RGBA giải nén 18 MiB, chưa mipmap. Profile motion-approved cho production source, packaged=library-packaged; integrated=not-routed-current-encounter, built/inGame pending. Không chép public.

Fixed walk Y shifts: south −61, east −10, north −42, west +11 px cho toàn hướng (không đổi từng frame); idle/attack giữ mốc chân đã xem. Alpha floor chỉ xóa alpha1–4; không lọc component. Nguồn v3 north giữ halo cleanup. Scale chung từ rest của từng source group; không bbox-fit pose. Export poster walk light và attack dark, contact sheet từ atlas đã rà.

Lần pack đầu bắt `Frame outside cell for attack/west` do Lanczos sinh alpha ngoài source bounds. Thêm guard 11 source px vào envelope (không sửa validation/crop); pack lại thành công. Motion bounds [185,226,815,825], envelope630×599, cell256²/padding16; scale0,35556. Desired rest body4,95 world trước rank/encounter scale; plane height được bù theo atlas, còn size thật cần review khi routing.

Walk 933ms loop; attack 1.000ms, contact frame4 bắt đầu 520ms theo mapper strike0,52. Tám preview WebP từ cell atlas đã decode, mỗi preview đủ tám frame; frame duration/loop lưu `web/animation-previews.json`. 68 decoded rect có alpha và nằm trong padding16, mọi anchor chung, copies web/package khớp SHA-256. Kết quả tại `source/package-verification-v1.json`; QA packer không WARN nhưng human visualReview vẫn pending.

Current-state audit: client không còn `dungeon-boss-visuals.ts` hoặc tham chiếu art-gold-horn; zone preloader chỉ legacy ở zone0, actor dùng skinHeroId/monsterId. Vì vậy đây là thư viện đã pack, chưa là boss xuất hiện trong trận. Không tự thay spawn, hero skin hay số mục tiêu. Khi có cả Ngân Giác phải đối chiếu route nhóm với một HP/hitbox/server combat như plan.

Chưa chạy unit test/typecheck/build/game. Còn nghiệm thu nhịp bước, chuyển trạng thái, góc camera, group spacing, HP và timing trong game sau routing/build. Các log “pending canonical” trước đây là lịch sử; export library hiện tại đã thay bằng nguồn reviewed này.
