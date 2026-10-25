# Pilot ảnh — Long Vương h00Q

## Phạm vi

Đã tạo 6/6 job theo inventory. Đối chiếu combat theo `plans/reports/scout-261020-2126-tier34-combat-evidence.md`: ability `tier3-tier4-h00Q`, đường thẳng dài 10 × rộng 6, vùng `tier-water` tại aim R5 trong 4 giây. Không thêm đóng băng ngoài điều kiện server; không dùng ảnh để tạo sát thương hay thời gian sống.

## Kết quả

| Asset | Layout | Kích thước raw | QA pilot |
|---|---:|---:|---|
| `sea-pearl-surge-sheet` | S8 | 1774×887 RGBA | Châu nước còn nhận ra qua các pha tụ nước, phóng và tan; ô cuối gần rỗng. |
| `tidal-crescent-wave-sheet` | S16 | 1254×1254 RGBA | Bản đầu chỉ có 12 ô, giữ ở `iterations/`; lượt sửa có 4×4 silhouette sóng và khung tan. Grid làm tròn đã ghi trong ledger. |
| `tidal-lane-wash` | T top-down | 2172×724 RGBA | Mép sóng ở phải, vệt nước kéo về trái; đúng vật liệu và hướng lane. |
| `sea-pool-ground` | D top-down | 1254×1254 RGBA | Vũng nước và bọt ở rìa, tâm thoáng cho mục tiêu. |
| `sea-pool-churn-sheet` | L8 | 1774×887 RGBA | 8 patch nước thay đổi hình; frame 8 gần frame 1 về hướng xoáy/bọt. |
| `wave-crash-hit-sheet` | S8 | 1774×887 RGBA | Va chạm cục bộ, bọt và giọt rút dần; không có nổ lan. |

Các ảnh raw có alpha RGBA và đã lưu nguyên trạng. Tất cả sáu prompt cuối, reference role, source path, hash, kích thước, anchor/grid, event binding, layer và QA nằm trong `assets/vfx-source/tier34-codex-art/job-manifest.json`. Không có ảnh nào được xử lý hoặc tích hợp runtime.

## Kết luận pilot

- Đạt mẫu cho sóng S16, T top-down và L8; đây là các rủi ro pilot của Long Vương.
- Tool tạo canvas không đúng kích thước yêu cầu và có thể sai số ô. Dùng `actualSizePx` + `gridRects`; phải đếm ô từ raw trước khi nhận.
- Một số ảnh có viền cyan sáng trên alpha. Cần kiểm trên nền sáng/tối ở giai đoạn QA/processing; không xóa viền trong raw.
- Chưa nghiệm thu animation trong game, UV/plane hoặc khả năng đọc ở kích thước runtime.

## Trạng thái

Long Vương: `raw-ready` 6/6. Pilot tổng: 8/19 job đã có raw (2 dấu chung + 6 Long Vương). Pha 1 còn thiếu 6 job Tôn Ngộ Không và 5 job Kim Thân La Hán; chưa được bắt đầu pha 2–3.
