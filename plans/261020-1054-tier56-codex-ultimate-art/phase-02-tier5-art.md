---
title: "Phase 2: tier5-art"
status: in_progress
---

# Phase 2: tier5-art — đủ 12 tướng bậc 5

## Overview

Hoàn tất từng job ở [asset-tier5.md](asset-tier5.md), tái dùng pilot Hằng Nga đã đạt; không tạo bản trùng chỉ vì chuyển pha. Mỗi tướng có shape/palette riêng, đủ những trạng thái và event phụ được tuyệt kỹ tạo ra.

## Requirements

- Phụ thuộc pha1 về contract và pipeline ảnh; job không phụ thuộc pilot lỗi được tiếp tục nếu ghi rõ giới hạn.
- Roster12: Hình Thiên h011, Đấu Chiến h012, Kim Thiền h013, Thái Bạch h015, Kim Sí h016, Hậu Nghệ h017, Hằng Nga h018, Khương Tử h019, Tây Vương Mẫu h01A, Nhiên Đăng h03W, Bồ Đề h03X, Lục Nhĩ h03Y.
- Hình stylized theo Cộng Công theo [contract](art-contract.md); thông số là hợp đồng trình bày, không đổi gameplay.

## Architecture

Các tác dụng chung dùng [13 status/buff](asset-shared-status.md); chỉ job hình chính/biến hình và cơ chế đặc thù còn trong inventory từng tướng. Không tạo lại dấu riêng theo tướng.

Từng tướng → từng dòng asset → prompt → một image/job tuần tự → raw/metadata → QA → sửa nếu cần. Trạng thái và pha tấn công phụ chỉ tính nếu do ultimate; actor triệu hồi dùng sprite đã có, ảnh ma thuật xuất hiện/đòn triệu hồi vẫn theo inventory.

## Related Code Files

- Đọc: `asset-tier5.md`, `art-contract.md`, source combat được inventory dẫn tới và thư viện tham chiếu Cộng Công.
- Khi tạo ảnh sau: `assets/vfx-source/<hero-dir>/prompts/`, `raw/`, `iterations/` và metadata theo đúng inventory.
- Không sửa `content/data/catalog.json`, gameplay, client hoặc atlas runtime ở pha tạo raw.

## Implementation Steps

1. Đọc lại inventory và metadata từng tướng, lọc job đã đạt ở pilot. Dùng ID làm khóa; không khôi phục tên cũ từ catalog sinh.
2. Theo thứ tự đã ghi trong inventory sau pilot Hằng Nga; từng tướng/mỗi job tuần tự. Nếu một ảnh bị block, có thể làm job độc lập nhưng không nhận bộ thiếu là hoàn tất. Khi QA, so nhóm vật bao người (Kim Thiền/Nhiên Đăng/Hằng Nga), nhóm biến hình và triệu hồi, nhóm đường bay/đúng người nhận để bắt lỗi dùng lại hình chính.
3. Mỗi prompt ghi silhouette/chất liệu/palette và timing đúng inventory. Kim Thiền phải thấy bát hút và lòng bát, không thay bằng vòng phép. Nhiên Đăng24 hạt, Hậu Nghệ9 mặt trời là mô-típ hình, không tự chia thành24/9 lần sát thương.
4. Khương Tử8 tia là8 lần đơn mục tiêu, không vẽ tám vụ nổ lan. Lục Nhĩ sáu pulse dùng danh sách mục tiêu đã khóa; không tô vòng AoE liên tục như mới quét mục tiêu mỗi lần.
5. Hình Thiên sóng lửa do buff ultimate phải gắn event thật, không vẽ cháy nền duy trì. Đấu Chiến ba phân thân là đơn vị server có tuổi thọ, không nhúng ba actor vào một sheet va chạm cố định.
6. Với từng buff/shield/heal/đóng băng, ghi rõ người nhận và nguồn snapshot. Hằng Nga/Nhiên Đăng dùng một shield chung, không sinh lại skin riêng. Thái Bạch có nhánh `revive-h015` không có main ability; Hằng Nga shield không timer; Bồ Đề event chỉ hai người được chọn không đại diện tất cả người hồi máu.
7. Rà raw/grid/alpha, từng pose, nối loop, frame exit, camera/anchor, clipping và nền sáng/tối; sửa tối đa hai lượt sau ảnh đầu. Lưu iterations cả khi bị loại.
8. Cập nhật job status và bộ bàn giao nguồn; không nâng lên `processed-ready` khi mới có raw.

## Todo

- [ ] Mỗi dòng inventory có prompt và raw đúng nguồn hoặc blocker rõ.
- [ ] 12 tướng giữ nhận diện riêng, không generic recolor, không trộn đòn thường/nội tại độc lập.
- [ ] Status/nhánh hồi sinh/triệu hồi có ghi trigger, theo dõi và exit cho lần tích hợp sau.
- [ ] QA ảnh từng job xong, không có hidden rejected iteration.

## Success Criteria

- [ ] Toàn bộ job bậc5 đạt `raw-ready`; nếu còn `BLOCKED_ART`, pha chưa coi hoàn tất ảnh.
- [ ] Số lượng file/job khớp inventory hiện hành, pilot không tính hai lần.
- [ ] Chuyển động/alpha/lưới/neo và camera được xem thực, không chỉ kiểm số file.

## Risk Assessment

Các vật chứa (bát, khiên) dễ che actor; sheet nhiều phân thân dễ biến thành art actor ngoài phạm vi. Dùng layer/mask đúng inventory và sprite đã có. Status không có định danh nguồn đầy đủ phải ghi hạn chế tích hợp, không gán toàn bộ status cùng loại cho chiêu này. Không tự mở rộng contract mạng.
