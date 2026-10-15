---
title: "Lập kế hoạch điều khiển RTS và làn hội tụ theo người chơi"
date: 2026-10-13
summary: "Khảo sát code, baseline pass; kế hoạch gameplay tiếp theo, chưa triển khai."
---

# Lập kế hoạch điều khiển RTS và làn hội tụ theo người chơi

## Bối cảnh

Người dùng yêu cầu xem game cần hoàn thiện gì và lập kế hoạch. [Kế hoạch](../261013-0010-rts-controls-converging-lanes/plan.md), [khảo sát](../261013-0010-rts-controls-converging-lanes/reports/current-state-audit.md).

## Diễn biến

Đọc README/spec/source và kế hoạch trước. Typecheck, 161/161 test và production build pass. Test/build cần chạy ngoài sandbox sau lỗi realpath EPERM; không đổi cấu hình/test để bỏ qua lỗi. Chưa QA input trong browser lượt này.

## Quyết định

Ctrl+1–9 lưu nhóm, 1–9 gọi nhóm. Bản đồ có đúng số làn theo số người trong trận (1–4); khi có nhiều làn, quái đi riêng khoảng 2/3 đường rồi nhập đường giữa; hướng hiển thị trên xuống dưới. Mỗi người chỉ điều khiển quân mình. Quái bị hạ không rơi Linh Thạch/Đạo Duyên; mỗi wave thưởng cùng mức cho mỗi người. Thắng phụ bản vẫn thưởng đều cả đội. Kế hoạch mới chặn nghiệm thu phát hành cuối của kế hoạch cũ; chưa đổi source gameplay.

## Ghi nhận công cụ

Plan CLI tạo được file canonical nhưng không cập nhật global index do thiếu quyền ghi. `ak journal create` trả exit 1, output rỗng; lưu journal local theo cấu trúc sẵn có, không sửa cấu hình global. Không đăng nội dung ra ngoài.

## Tiếp theo

Triển khai điều khiển, tuyến/map 1–4 làn, bỏ tài nguyên per-kill rồi cân bằng thưởng wave/QA. Full campaign fixture đội hình cuối game chưa chứng minh kinh tế khởi đầu. Gate Internet vẫn chưa nghiệm thu.
