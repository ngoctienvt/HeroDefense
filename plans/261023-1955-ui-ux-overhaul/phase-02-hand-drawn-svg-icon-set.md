# Phase 2 — Bộ icon SVG theo phong cách game

## Yêu cầu

- Agent tự vẽ trực tiếp bằng SVG, không qua Codex hay công cụ tạo ảnh.
- Icon đọc được bằng hình, không cần biết chữ Hán.
- Thay toàn bộ emoji và các glyph chữ Hán đang làm icon (`刀 弓 術 盾 靈`, `仙`, `天`). Glyph trang trí trong logo `THIÊN ĐẠO` và ấn kết quả có thể giữ nếu người dùng muốn.

## Phong cách (khớp art tướng: stylized, cel shading, rim light)

- `viewBox 0 0 24 24`. Hình khối lớn, đọc được ở 16 px.
- Ba lớp:
  - Viền mực đậm khoảng 1,6 px, màu `ink-0`.
  - Mảng màu chính hai tông: sáng và tối, ranh giới cứng kiểu cel shading.
  - Một nét rim vàng `gold` ở cạnh trên trái.
- Màu lấy từ biến CSS (`fill="var(--icon-base, currentColor)"`), nên một icon tô được theo hệ, phẩm hoặc trạng thái.
- Không gradient mịn, không chi tiết vụn. Silhouette mỗi icon trong cùng nhóm phải khác nhau rõ.

## Danh sách (khoảng 36 icon)

| Nhóm | Icon |
|---|---|
| Tài nguyên | `linh-thach` (viên đá kết tinh), `dao-duyen` (dải lụa xoắn có sao), `linh-dan` (viên đan có quầng), `diem-tran-phap` (la bàn bát quái đơn giản) |
| Trang bị | `vu-khi` (kiếm), `giap` (giáp ngực), `phap-khi` (hồ lô/linh châu) |
| Vai trò | `chien-si` (kiếm chéo), `xa-thu` (cung), `phap-su` (quyển trục phát sáng), `ho-ve` (khiên), `ho-tro` (bàn tay và lá) |
| Hệ | `kim` (thỏi kim/lưỡi), `moc` (lá), `thuy` (giọt nước), `hoa` (ngọn lửa), `tho` (núi đá) |
| Gói chiêu mộ | `goi-pham` (cuộn giấy đơn), `goi-tien` (cuộn mây bạc), `goi-thien` (ấn trời vàng có tia): ba silhouette khác nhau, độ quý tăng dần |
| Rail và bảng | `chieu-mo` (cổng mây), `ghep-tuong` (ba hạt nhập một), `doi-hinh` (5 ô), `duyen-tran` (hai vòng nối), `cam-nang` (sách) |
| Thanh trên | `dot` (cờ), `dong-ho`, `linh-tru` (cột linh thạch phát sáng), `boss` (sừng quỷ), `cai-dat` (bánh răng), `am-thanh-bat/tat`, `goc-nhin` (mắt/camera), `roi-phong` (cửa), `toc-do` (mũi tên kép), `sao-chep` |
| Hành động | `ky-nang`, `hop-nhat`, `xuat-tran`, `thu-hoi`, `neo`, `ban`, `xac-nhan`, `dong` |
| Trạng thái | `sao` (★), `khoa`, `nguyen-lieu`, `san-sang` |

## Hiện thực

- Tạo `apps/client/src/ui-icons.ts` gồm:
  - `type IconName` là union của các tên trên.
  - `ICONS: Record<IconName, string>` chứa nội dung SVG của từng icon.
  - `icon(name, { size, label })` trả về `<svg>` có `aria-hidden` khi không có label, và `role="img"` + `aria-label` khi có.
- Chép bản nguồn từng icon ra `assets/ui-icons/*.svg`, kèm `assets/ui-icons/README.md` ghi rằng icon do agent tự vẽ, ngày, bảng màu và quy tắc nét.
- Thêm trang xem trước `?icons=1` (chỉ chạy dev, trong `debug.ts`): lưới icon ở 16, 20 và 28 px trên nền `ink-0`, `ink-2` và ảnh chụp đảo sáng.
- Thay theo thứ tự: tài nguyên, trang bị, vai trò và hệ, rồi đến rail và thanh trên. Mỗi đợt thay để người dùng xem một lần.

## Người dùng kiểm tra

- Mở `?icons=1`, xem từng nhóm ở cỡ thật: có nhận ra không, có trùng hình không, nhìn trên nền sáng có rõ không.
- Ghi lại icon nào cần vẽ lại. Agent sửa từng icon, không làm lại cả bộ.

## Tiêu chí xong

- `rg "[\x{1F300}-\x{1FAFF}]|⚔|🛡|✨|🪙|💊|🎯|📦|🔹|⚡|🗡" apps/client/src` không còn kết quả.
- Có test kiểm tra mọi `IconName` có SVG, viewBox đúng `0 0 24 24` và không chứa `<script>` hay `href` ngoài.
