# Shield thống nhất cho toàn game

Quyết định người dùng ngày20-10-2026: mọi kỹ năng tạo khiên dùng **một kiểu shield chung**, không vẽ hình khiên riêng cho từng tướng. Phong cách stylized theo Cộng Công: vỏ có khối, cel ba bậc, viền tối, rim sáng tiết chế; giữa thân đủ trong để nhìn nhân vật. Màu gốc trung tính, có thể tint nhẹ theo nguồn nếu cần; không tạo thêm ảnh cho mỗi màu.

Đây là hai layer của **cùng một shield**, dùng chung silhouette, timing, pivot và vòng đời, không phải hai kiểu khiên. Hai layer giúp nhân vật và thanh HP không bị che. Quy tắc type P16 ở [art-contract](art-contract.md).

## 1. Shield dùng chung — shared-shield — `shared-shield` — 2 ảnh

Màu `#24445C #72ABBF #D6EFF5 #F1F7F4`.

| Ảnh | Loại | Nội dung/pha và điểm dùng |
|---|---|---|
| `shared-shield-rear-sheet` | P16 | Một vỏ khiên năng lượng stylized trung tính, lớp sau thân; mảng cel lớn, viền tối và mép sáng, không sen/trăng/đèn/máu/rune riêng tướng. Khung1–4 kết vỏ,5–12 giữ lặp nhẹ,13–16 nứt/vỡ/tan. Tâm và scale cố định, không nhấp nhô che đầu. |
| `shared-shield-front-sheet` | P16 | Hai mép phía trước và chân vỏ khớp chính xác rear, giữa ngực/mặt thoáng; edit có tham chiếu rear để giữ một thiết kế. Cùng16khung và range, không thêm chuyển động độc lập. |

`shared-shield` là khóa nhóm asset trong manifest, **không phải hero ID của catalog**; không đăng ký một tướng giả. Nguồn prompt/raw dùng thư mục art chung hiện có như các job khác, chỉ tạo mỗi layer một lần.

## Thay thế trong lô cấp 5–6

| Tướng | Job riêng được bỏ | Nguồn vòng đời thực |
|---|---|---|
| Hằng Nga h018 | `moonshield-rear-sheet`, `moonshield-front-sheet` | `shield` còn lượng; không tự đặt thời hạn |
| Nhiên Đăng h03W | `lanternshield-rear-sheet`, `lanternshield-front-sheet` | `lanternShield.remaining/amount`,5,5s hoặc vỡ sớm |
| Nữ Oa h01C | `five-color-shield-rear-sheet`, `five-color-shield-front-sheet` | `nuwaShields`,6s hoặc tiêu hao trước |
| Như Lai h01J | `buddha-shield-rear-sheet`, `buddha-shield-front-sheet` | `divineShield.remaining/amount`,6s hoặc vỡ sớm |
| Tướng Thần h03Z | `bloodshield-sheet` | `mistShield`,8s hoặc tiêu hao trước |

Riêng bước shield thay chín job riêng bằng hai job chung. Sau khi gộp thêm [trạng thái/buff](asset-shared-status.md), tổng hiện tại là **143 asset =54 riêng cấp5 +74 riêng cấp6 +15 dùng chung**; trong15 ảnh chung, shield có hai layer. Ba nguồn cũ cần rà style mới: dự kiến140 ảnh mới nếu cả ba tái dùng được.

## Vòng đời và tích hợp sau này

- Mỗi actor chỉ có một vỏ shield dù nhận nhiều nguồn. Giữ khi còn ít nhất một lượng shield thực; không tạo nhiều bóng lồng nhau. Khi một nguồn hết nhưng nguồn khác còn, không phát vỡ toàn bộ shield.
- Appearance khi từ không shield thành có; hold theo snapshot, kích thước bám actor; break khi tổng shield thực mất, cleanup khi actor chết/đổi zone/trận. Không quyết định lượng hấp thụ/sát thương ở client.
- Phản đòn Nhiên Đăng giữ tia/va chạm riêng theo event thật; nó không cần skin shield khác. Dấu miễn sát thương, giảm sát thương, buff và lồng đóng băng có tác dụng khác khiên hấp thụ, vẫn giữ asset cần thiết của chúng.
- Chuẩn dùng chung áp dụng cho các tướng khác trong game khi tích hợp, kể cả Cộng Công và các bậc thấp; không tạo thêm bộ art riêng. Tác vụ này cập nhật nguồn kế hoạch/prompt, chưa thay VFX đang chạy của các tướng đó.
- Giữ raw và metadata shield cũ làm lịch sử. Job cũ được thay thế, không tự chuyển chúng sang `raw-ready` cho shield chung. Rà nguồn trạng thái thực trước khi tích hợp, không suy tổng shield bằng cách cộng trùng các field phụ vào `unit.shield`.
