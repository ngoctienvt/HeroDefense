# Dọn ảnh VFX sai phong cách

## Mục tiêu và phạm vi

Theo yêu cầu người dùng: cách ly ảnh vẽ tay cũ của lô cấp 5–6; giữ ảnh stylized mới. Cập nhật bổ sung: bỏ cả ba ảnh Như Lai đã tích hợp nhầm, không cho pipeline lấy lại từ archive. Không tạo ảnh thay thế hoặc thay đổi gameplay.

## Kế hoạch đã rà nguồn

Client TypeScript/Babylon dùng `KitPainted.prepare` để đăng ký texture; `acquire` trả `undefined` khi chưa đăng ký. Các lớp palm/zone đã xử lý trường hợp này và vẫn giữ telegraph, impact, decal, snapshot duration và cleanup. Chỉ gỡ đăng ký ba texture cũ, ghi log thiếu art một lần; giữ các hàm bố trí để tích hợp ảnh đúng sau này. Script Python phải dừng trước khi ghi output nếu chưa có raw thay thế.

- [x] Đối chiếu hash raw với metadata/prompt trước khi đổi style; cách ly ảnh cũ và metadata, giữ chỉ mục phục hồi.
- [x] Đánh dấu 16 job hiện tại cần tạo lại, giữ đủ 143 job trong inventory.
- [x] Cách ly ba WebP Như Lai cùng bốn ảnh reference còn chứa hình cũ; gỡ tải runtime và bỏ fallback nguồn archive.
- [x] Cập nhật provenance, contract và plan; rà đường dẫn/hash, đọc lại code. Không chạy game, build hay test.

## Tiêu chí bàn giao

Không còn các raw đã xác định sai style trong thư mục hoạt động; client không tải ba atlas Như Lai cũ; không còn ngoại lệ cho phép tái xuất từ archive. Ảnh stylized mới giữ nguyên hash. Phần hình chính Như Lai bị thiếu phải ghi rõ chờ tạo lại, không gọi là đã hoàn thiện VFX.

## Kết quả

Đã chuyển **148 file: 127 ảnh + 21 metadata JSON** sang archive, gồm 21 raw cũ/lượt thử đã loại, 31 preview, 13 iteration, 54 frame/contact Như Lai, một ảnh ghép rear/front, ba WebP runtime và bốn reference Như Lai. Không xóa hay biến đổi pixel. Hash của 148 file tại đích khớp trước khi chuyển; 764 ảnh còn lại trong danh sách bảo vệ giữ nguyên hash. Các raw đã xác định sai style không còn ở đường dẫn hoạt động; metadata của 16 job hiện tại được thay bằng bản ghi pending, trỏ rõ đến nguồn đã cách ly.

Chọn ảnh cũ bằng hash khớp metadata/prompt của lượt tạo theo phong cách Huyền trước khi đổi sang Cộng Công, không dựa riêng vào nhãn `style-review-required`. Giữ ảnh stylized đã tạo mới ngay cả khi ledger chưa cập nhật; ví dụ `bowl-suction-sheet` có hash mới. Không gom bộ Huyền đang dùng hoặc các nguồn tái dùng đã chọn riêng (`beidou-painted`, `phuong-hoang`) vào đợt loại ảnh trùng này.

Ledger vẫn 143 job: 59 `raw-ready`, 17 `BLOCKED_ART`, 51 `style-review-required`, 16 `legacy-style-archived`. Thư mục raw còn 124 PNG; cộng ba nguồn tái dùng là 127 job còn candidate. Có file không đồng nghĩa đã đạt QA.

Các job cần tạo lại:

| Tướng | Asset |
|---|---|
| Hình Thiên | `warfire-vortex-sheet`, `warfire-ground`, `berserk-wave`, `wave-impact-sheet` |
| Đấu Chiến Thắng Phật | `staff-slam-sheet`, `staff-lane-fracture`, `clone-arrival-sheet`, `clone-staff-hit-sheet` |
| Kim Thiền Tử | `bowl-rear-sheet`, `bowl-front-sheet` |
| Chúc Dung | `volcanic-eruption-sheet`, `lava-basin-ground`, `lava-ignite-sheet` |
| Như Lai | `buddha-palm-descent-sheet`, `five-finger-mountain-rear-sheet`, `five-finger-mountain-front-sheet` |

Như Lai: đã bỏ đăng ký ba texture cũ; các lệnh acquire không có material trả `undefined` an toàn theo `KitPainted` hiện có. Chỉ còn telegraph, impact, ground và shield, chưa có bàn tay/núi thay thế. Log `visual.nhulai.art.pending` ghi một lần cho palm và mountain. Pipeline chỉ nhận raw hiện tại, dừng trước mọi output nếu thiếu nguồn; không có ngoại lệ archive. Manifest cũ được lưu để giữ layout/provenance, không coi là nguồn runtime được phép dùng.

Đã đọc lại mã và rà đường đi event → lớp hiển thị → cleanup; không đổi server/gameplay/contract mạng. Reviewer phát hiện test cũ còn yêu cầu bảy URL/ba WebP đã loại; đã cập nhật test để yêu cầu đúng bốn URL còn dùng và chặn ba file cũ quay lại public. `git diff --check` cho các file liên quan không báo lỗi.

## Người dùng kiểm tra

Chưa chạy build, typecheck, test hoặc game theo quy định dự án. Có thể chạy `npx vitest run apps/client/test/nhu-lai-vfx.test.ts` và `npm run typecheck`. Để xem thay đổi: dừng server cũ → chạy lại `start-game.cmd` → `Ctrl+F5`. Kiểm tra tuyệt kỹ Như Lai không còn bàn tay/núi vẽ tay, impact/dấu đất và shield vẫn hiện, vùng kết thúc theo snapshot, reduced motion không bị lỗi. Phiên game đang mở chưa được cập nhật chỉ bằng việc sửa nguồn.

## Khôi phục

Các file được chuyển nguyên byte, không xóa. `cleanup-261020-2233-painted-vfx-moves.json` và `assets/vfx-archive/261020-2233-legacy-painted-vfx/archive-index.json` ghi đường dẫn trước/sau và SHA256. Khôi phục ảnh cũ vào runtime chỉ khi người dùng thay đổi quyết định.
