# Kiểm kê chứng cứ kỹ năng và nhóm mẫu

## Kết quả

- 70/70 ID trong catalog có thiết kế kỹ năng riêng tại `content/hero-abilities.ts`.
- 70/70 kỹ năng hiện gắn `provenance: original`, `status: unverified`. Tỷ lệ chứng minh hành vi kỹ năng riêng từ map: **0/70**. Đây là trạng thái chứng cứ, không khẳng định map không có kỹ năng.
- Mỗi hồ sơ giữ rawcode và dòng đăng ký `pK` trong `war3map.j`, cùng dòng tên trong `units_CampaignUnitStrings.txt`. Tên, vai trò, nguyên tố là dữ liệu từ map; tên phép, mục tiêu, hiệu ứng, cooldown và sức mạnh là thiết kế/cân bằng web.
- `units_UnitAbilities.slk` có `abilList` theo unit, nhưng nhiều ID nhìn thấy là hệ ngũ hành hoặc tiến cấp (ví dụ h001 có `SSFG,A01P`; `SSFG` được đặt tên `NguHanh1_Kim`). Chưa có chứng minh rằng những ID này tương ứng chiêu chủ động độc lập. `war3map.j` bị obfuscate; chưa nối được đủ dispatch với 70 rawcode. Vì vậy không gắn nhãn “đúng map” cho kỹ năng nào.

## Lát cắt mẫu

| ID | Vai trò | Kỹ năng web | Hướng cast → impact → death |
|---|---|---|---|
| h001 Thiên Lý Nhãn | ranger | Thiên Nhãn Truy Tung | Nhắm một nhịp → đường sáng nối mục tiêu → tan tia sạch, không che HP |
| h003 Quỷ Sai | warrior | Quỷ Liêm Câu Hồn | Vung liềm thấp → vòng âm hỏa sát đất → bóng tan thành hạt tím |
| h006 Tiên Nữ | mage | Tiên Hoa Tán Quang | Nâng tay → cánh hoa nổ vòng rõ rìa → hạt hoa tắt dần |
| h007 Quy Thừa Tướng | guardian | Quy Giáp Trấn Thủy | Khép mai → viền lá chắn nước trên đồng minh → mai rơi rồi tan |
| h00C Hồng Hài Nhi | warrior | Tam Muội Viêm Quyển | Dồn lửa → vòng cam đỏ thấp, có dấu bỏng → than hồng tắt nhanh |
| h00F Mẫu Đơn Tiên Tử | support | Mẫu Đơn Hồi Xuân | Mở hoa → vòng hồi phục xanh sáng → cánh hoa nhẹ rơi |
| h00R Tôn Ngộ Không | warrior | Như Ý Thiên Quân | Xoay gậy → cung quét vàng lớn, thấy rìa tầm → dấu gậy tan |
| h014 Thủy Mẫu | guardian | Thủy Mẫu Hải Mạc | Gọi triều → vòm nước đồng minh → giọt nước tan, HP vẫn đọc được |

Tám mẫu phủ đủ năm vai trò, ba dạng mục tiêu `single/chain/radius` qua danh mục chung và bốn trạng thái `slow/burn/ward/haste`. VFX phải giữ đường đi, tên và thanh HP nhìn được ở 1366×768; bản reduced-motion giữ telegraph và kết quả nhưng rút hạt/trail.

## Giới hạn và tiếp tục

- Không có cốt truyện riêng đáng tin trong dữ liệu map cho nhiều tên. `fantasy` là ý tưởng sáng tạo dựa trên tên, vai trò và mô típ thần thoại quen thuộc, không phải xác nhận nguyên tác.
- Nếu điều tra sau này tìm được liên kết rawcode → trigger → hiệu ứng, cập nhật từng hồ sơ với dòng chứng cứ, giữ phân biệt số liệu web, và đổi provenance chỉ cho phần đã xác minh.
- Asset Warcraft, sprite trong ảnh tham chiếu và JASS không được nhập vào client hay thực thi.

## Kiểm chứng

`npx tsx` tải `HERO_ABILITY_DESIGNS`: 70 hồ sơ, 8 mẫu. Test mới `content/test/hero-abilities.test.ts` kiểm đủ ID, nguồn, giá trị và mẫu. Lần chạy `npm run test:content` đầu tiên bị `EPERM` khi Vitest realpath `node_modules/vitest/dist/spy.js` trước khi thu thập test; cần chạy lại sau khi các tác vụ đồng thời kết thúc.
