---
title: "Khảo sát hiện trạng và việc cần làm tiếp"
date: 2026-10-13
status: reviewed
---

# Khảo sát hiện trạng và việc cần làm tiếp

## Phạm vi và chứng cứ

Khảo sát README, gameplay spec, kế hoạch cũ, client input/render, contract, simulation, server validation và test. Chưa tái hiện thao tác điều khiển bằng trình duyệt trong lượt này; phân biệt thiếu tính năng thấy trực tiếp trong source với cảm giác điều khiển cần chơi thử. [Kế hoạch tiếp tục](../plan.md).

## Đã có, không cần xây lại

- Phòng 1–4 người, server quyết định trạng thái, reconnect 60 giây và chuyển chủ phòng.
- 70 tướng, 27 duyên phận, 8 trận pháp, triệu hồi/hợp nhất/trang bị, 45/60 wave và 8 phụ bản.
- Click chọn một quân, chuột phải move/attack, Q, S, lưu/xóa vị trí H/N; log client/server có giới hạn.
- Client Babylon.js, core độc lập renderer, SDK/WebSocket thật trong test.

## Thiếu hoặc cần sửa theo yêu cầu

| Mức | Phát hiện từ source | Hệ quả / việc tiếp theo |
|---|---|---|
| P1 | `main.ts:13` giữ `selected` là một ID; `battlefield.ts:57` chỉ xử lý pointerdown | Chưa có quét chọn hoặc ra lệnh nhóm. Cần pointer lifecycle, tập ID và nhiều vòng chọn. |
| P1 | `main.ts:101` bỏ qua Ctrl; số 1–5 chọn ô | Thay bằng quyết định mới: Ctrl+1–9 lưu nhóm, 1–9 gọi nhóm; nhóm có thể chỉ chứa một quân. |
| P1 | `combat.ts:105` chỉ tăng z, không có waypoint | Bốn làn chưa hội tụ. Cần tuyến 4→1, merge khoảng 2/3 hành trình, giữ phụ bản riêng. |
| P1 | `rules.ts:20`, `slotPosition`, deploy/respawn/return gắn với làn của chủ quân | Cần khu triển khai chung có vị trí riêng cho từng đội, cập nhật đồng bộ mọi đường trở về. |
| P1 | Move xong AI tự tìm/chạy theo địch; S hiện dừng cả đánh; A chỉ nhận mục tiêu quái | Chốt rõ ý nghĩa lệnh, thể hiện trạng thái trên HUD; bổ sung attack-move/giữ vị trí ở mức cần cho điều khiển RTS. H/N đã là lưu/xóa vị trí, tránh tự đổi phím. |
| P1 | `combat.ts:12–13` thưởng Linh Thạch cho người kết liễu và 12% Đạo Duyên cho quái thường | Quyết định mới: bỏ cả hai nguồn per-kill; thưởng tài nguyên đều theo wave. Cập nhật core/contract/fixture và test. |
| P2 | Actor hiện là hình khối theo vai trò, chưa dùng màu chủ quân để phân biệt body | Khi 20 quân tụ giữa, cần màu/nhãn nhận diện chủ quân và nhóm chọn, phản hồi điểm đến/lệnh bị từ chối. |
| P2 | Camera reset theo chỉ số làn; terrain dựng bốn đường thẳng | Cần camera mặc định spawn ở trên, trụ ở dưới; xác nhận bằng hình ảnh thật sau sửa. Không kết luận hướng màn hình chỉ từ tọa độ z. |

## Kiểm chứng baseline ngày 2026-10-13

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | Pass. |
| `npm test` | 7 file, 161 test pass, 31,39 giây. |
| `npm run build` | Client/server pass. |

Test/build lần đầu bị sandbox chặn `realpath` (EPERM); chạy lại ngoài sandbox thành công, không đổi test hoặc cấu hình để né lỗi. SDK close 4002 nằm trong negative test hết hạn seat và test pass. Không có dev server/watcher mới được để lại.

## Khoảng trống nghiệm thu

- Full campaign hiện dùng đội hình cuối game được cấp tài nguyên trong fixture; chứng minh simulation progression, chưa chứng minh cân bằng từ 500 LT/18 ĐD ban đầu.
- Báo cáo browser cũ chơi hai tab tới wave 15, chưa là trận đầy đủ cho mọi số người/độ khó.
- Soak 120 quái/20 quân không thay cho đo FPS GPU khi quái dồn tại điểm hợp lưu. Cần đo lại tick, snapshot và render với tuyến mới.
- Chưa build/chạy Docker image thật, cấp host/domain public, xác minh HTTPS/WSS từ mạng ngoài hoặc diễn tập rollback. Các gate này vẫn ở kế hoạch cũ.

## Đề xuất thứ tự

Hoàn thiện điều khiển → đổi tuyến/map → chơi thử, cân bằng, cải thiện khả năng đọc chiến trường → nghiệm thu local/LAN → nghiệm thu public nếu muốn phát hành Internet. Model/animation/âm thanh nâng cấp là hạng mục hình thức có thể chọn sau; chưa coi là yêu cầu bắt buộc hoặc đã có tài sản.

## Quyết định của người dùng sau khảo sát

1. Mỗi người chỉ điều khiển quân của mình; server tiếp tục kiểm tra owner cho mọi lệnh.
2. Có bao nhiêu người trong trận thì hiển thị và sinh quái ở bấy nhiêu làn tương ứng: 1–4. Người rớt mạng tạm thời còn giữ chỗ trong trận, nên làn không biến mất vì WebSocket ngắt.
3. Từng quái không cho bất kỳ tài nguyên nào; bỏ cả vàng per-kill và xác suất Đạo Duyên 12%. Mỗi wave thưởng tài nguyên cùng mức cho tất cả người chơi. Hoàn thành phụ bản vẫn phát khoản thưởng riêng cho cả đội. Bắt đầu kiểm nghiệm từ công thức wave hiện có, điều chỉnh mức nếu chứng cứ cân bằng đòi hỏi.

## Câu hỏi chưa chốt

Không có quyết định gameplay còn treo cho kế hoạch. Mức thưởng wave cuối cùng cần được đo và cân chỉnh trong giai đoạn 3.
