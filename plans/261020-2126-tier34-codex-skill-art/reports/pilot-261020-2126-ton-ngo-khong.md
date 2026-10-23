# Pilot ảnh — Tôn Ngộ Không h00R

## Phạm vi

Đã tạo 6/6 job của inventory. Combat binding theo chứng cứ: ability `tier3-tier4-h00R`; đường thẳng dài 9 × rộng 3; tạo hai `monkey-clone` tại aim ±1,6, sống 6 giây; đòn phân thân là attack `monkey-clone-h00R`, quét R3,2. Không vẽ/stage choáng. Thân phân thân dùng atlas h00R hiện có.

## Kết quả

| Asset | Layout | Kích thước raw | QA pilot |
|---|---:|---:|---|
| `ruyi-giant-staff` | T prop | 2172×724 RGBA | Gậy nằm ngang, hai đầu vàng, thân sơn đỏ; đầu lớn bên phải để runtime dựng/quật. Khác bổng vàng đồng của Đấu Chiến h012. |
| `ruyi-slam-burst-sheet` | S16 | 1254×1254 RGBA | 4×4 dải nứt đất/khí vàng, không vẽ gậy; frame cuối bụi lắng. Có vài pose giữ trục giữa tương tự nhau, cần xem kỹ ở tích hợp. |
| `ruyi-lane-crack` | T top-down | 2172×724 RGBA | Vết nứt đất đỏ-son, mây vàng, đầu va chạm bên phải; bản đầu sát mép, đã giữ trong `iterations/` và sửa để có lề. |
| `hair-clone-puff-sheet` | S8 | 1774×887 RGBA | Lông vàng → khói mây đỏ-vàng → lông tan; không có khỉ/người. |
| `clone-sweep-slash-sheet` | S8 | 1774×887 RGBA | Cung năng lượng vàng và bụi mây cục bộ; không có gậy/nhân vật. |
| `clone-unravel-sheet` | S8 | 1774×887 RGBA | Khói cuộn vào rồi bung thành lông tơ tan; không có thân phân thân. |

Master h00R đã được xem trước khi đính làm reference `PALETTE_OR_WEAPON_ONLY`; master Đấu Chiến h012 được xem để QA đối chiếu. Raw, prompt cuối, hash, reference role, kích thước, grid/anchor, binding, layer, route và QA được ghi trong ledger. Không xử lý hoặc tích hợp runtime.

## Kết luận pilot

- Đạt mẫu cho prop T cần runtime dựng plane/quật, T top-down, O/prop-like silhouette (gậy) và sheet phân thân không vẽ nhân vật.
- Khác biệt vũ khí rõ: h00R là thân sơn đỏ với mây vàng, h012 là bổng vàng đồng; silhouette và palette không bị nhập làm một.
- Image tool không đảm bảo kích thước mục tiêu hoặc lề; raw giữ nguyên, `actualSizePx` và `gridRects` mô tả canvas thật. Không kéo giãn/crop raw.
- Chưa nghiệm thu chuyển động trong game, plane rotation, alpha trên nền chiến trường và độ đọc ở đúng scale runtime.

## Trạng thái

Tôn Ngộ Không: `raw-ready` 6/6. Pilot tổng: 14/19 job (2 dấu chung + Long Vương + Tôn Ngộ Không). Còn 5 job Kim Thân La Hán; pha 1 chưa kết luận xong.
