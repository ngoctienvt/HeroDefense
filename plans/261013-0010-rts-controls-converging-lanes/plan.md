---
title: "Thiên Đạo — điều khiển RTS, làn theo số người và hoàn thiện trải nghiệm"
description: "Bổ sung chọn nhóm/ra lệnh RTS, 1–4 làn theo số người rồi hội tụ, thưởng tài nguyên đều theo wave và kiểm chứng trận thực."
status: in-progress
priority: P1
effort: "7–12 ngày kỹ thuật, ước lượng thô; chưa gồm provision Internet"
tags: [feature, frontend, backend, multiplayer]
blockedBy: []
blocks: [261012-1846-thien-dao-web-coop]
created: 2026-10-13
---

# Thiên Đạo — kế hoạch tiếp tục hoàn thiện

## Mục tiêu

Game đã có đủ nhóm cơ chế chính. Phần này tập trung điều khiển quân dùng được, bản đồ hợp tác đúng yêu cầu và chứng cứ chơi trọn trận từ kinh tế ban đầu. Gameplay đã triển khai; QA browser trọn trận và đo tải cao còn mở. Xem [báo cáo gameplay](./reports/playability-qa.md) và [hiệu năng](./reports/performance-qa.md).

Quyết định đã chốt: kéo khung chọn nhiều quân; ra lệnh nhóm; `Ctrl+1–9` gán nhóm và `1–9` gọi lại, kể cả nhóm một quân. Bỏ chức năng phím `1–5` chọn ô cũ để tránh xung đột. **Mỗi người chỉ điều khiển quân của mình.** Số người trong trận là 1–4 thì hiện/sinh quái ở đúng **1–4 làn** tương ứng. Với nhiều làn, quái đi riêng khoảng **2/3 đường**, sau đó nhập **đường giữa chung ở 1/3 cuối**; hướng trên xuống dưới màn hình. Quái bị hạ không cho tài nguyên; mỗi wave thưởng Linh Thạch và Đạo Duyên như nhau cho từng người trong tổ đội.

## Hiện trạng đã kiểm tra

| Phần | Chứng cứ / thiếu hụt |
|---|---|
| Nền tảng | Babylon.js; Colyseus authoritative, simulation 20 Hz/snapshot 10 Hz; 70 tướng, 27 duyên phận, 8 trận pháp, 45/60 wave, 8 phụ bản đã có. |
| Điều khiển | Chọn một ID, chỉ pointerdown; chưa kéo khung/nhóm. A chỉ chọn quái; S tắt đánh; H/N lưu/xóa vị trí trở về. |
| Bản đồ | Renderer bốn làn thẳng; quái chỉ tăng z, chưa hội tụ. Hướng hiển thị cần kiểm tra bằng browser, chưa chứng minh lỗi camera. |
| Kiểm tra lượt này | 161/161 test pass (31,39 s), typecheck/build pass; chưa QA input mới. [Khảo sát và baseline](./reports/current-state-audit.md). |
| Chứng cứ trước | Hai browser tới wave 15; full campaign dùng mature roster. Chưa chứng minh cân bằng kinh tế đầu trận, trọn trận browser 2/3/4 người hoặc FPS. |

## Ba giai đoạn

| # | Giai đoạn | Trạng thái | Phụ thuộc | Effort thô |
|---|---|---|---|---|
| 1 | [Chọn nhóm và lệnh RTS có xác thực](./phase-01-start.md) | Đã triển khai; QA mở | — | 3–5 ngày |
| 2 | [Làn theo số người rồi hội tụ giữa](./phase-02-converging-lanes.md) | Đã triển khai; QA mở | 1 | 2–3 ngày |
| 3 | [Thưởng wave, cân bằng, HUD và nghiệm thu](./phase-03-balance-and-release-qa.md) | Đã triển khai; QA tải cao/trọn trận mở | 1, 2 | 2–4 ngày |

Ước lượng có độ bất định do chưa repro input thực và chưa đo tải/cân bằng. Không phải cam kết lịch giao.

## Phạm vi và phụ thuộc

Tái dùng simulation, session, catalog, HUD và debug log hiện có. Không dựng lại nội dung; không thêm pathfinder Warcraft đầy đủ, fog, xây nhà, mobile, PvP, tài khoản hay lưu bền. Camera edge-pan chưa thuộc scope; giữ zoom/pan/reset hiện có trước.

Kế hoạch này chặn nghiệm thu cuối của [kế hoạch cũ](../261012-1846-thien-dao-web-coop/plan.md), không phủ nhận chứng cứ local/LAN đã có. [Gate Internet còn lại](../261012-1846-thien-dao-web-coop/phase-05-parity-release.md) tách riêng: Docker chạy thật, host/domain, TLS/WSS ngoài mạng và rollback; chưa provision, chỉ thực hiện khi có quyết định phát hành Internet.

## Điều kiện hoàn tất

- [x] Chọn một/nhiều quân, nhóm 1–9 và move/attack/attack-move/stop/hold hoạt động, không chiếm phím khi gõ HUD; server từ chối mọi lệnh điều khiển quân người khác.
- [x] Có đúng 1–4 làn hiện và sinh quái theo số người trong trận; khi có nhiều làn, chúng nhập giữa khoảng 2/3 tiến trình, đoạn chung khoảng 1/3 cuối; quái từ trên xuống dưới, không nhảy tuyến/leak hai lần.
- [x] Kill chỉ cộng chỉ số chiến đấu, không cho Linh Thạch/Đạo Duyên; hoàn tất wave thưởng tài nguyên cùng mức cho từng người, kể cả người không last-hit.
- [ ] Test mục tiêu rồi full typecheck/test/build pass; browser thật 2/3/4 client, screenshot 1366×768 và 1920×1080, đo FPS có cấu hình máy và giới hạn.
- [x] Mô phỏng trọn trận Bình Thường từ 500 LT/18 ĐD/1 điểm trận pháp bằng lệnh thật cho 1–4 người; không dùng mature roster để chứng nhận cân bằng. Browser trọn trận vẫn thuộc checkbox QA phía trên.

## Chính sách đã chốt và điểm cần đo

1. Quyền điều khiển theo owner; khi rớt mạng trong thời hạn reconnect, người đó vẫn thuộc trận và làn không biến mất. Server tiếp tục xác thực owner cho từng lệnh.
2. Mỗi người trong trận có một làn sinh quái, tối đa bốn. Solo có một làn giữa, không có bước hội tụ giả. Quái từ các làn hoạt động nhập đường giữa khoảng 2/3 đường.
3. Kill không thưởng bất kỳ tài nguyên nào, kể cả xác suất rơi Đạo Duyên 12% hiện tại. Wave vẫn trả thưởng bằng nhau cho mỗi thành viên; bắt đầu từ công thức hiện có `180 + wave × 40` Linh Thạch và `4 + floor(wave/10)` Đạo Duyên mỗi người, đo lại cân bằng sau khi bỏ tài nguyên kill. Hoàn thành phụ bản vẫn thưởng cho cả đội như hiện tại.

## Câu hỏi chưa chốt

Không còn quyết định gameplay chặn kế hoạch. Mức thưởng wave cuối cùng sẽ điều chỉnh theo bằng chứng cân bằng nếu công thức hiện tại không đủ tiến triển; mọi điều chỉnh giữ nguyên nguyên tắc thưởng đều cho từng người. Thưởng hoàn thành phụ bản là khoản thưởng riêng cho cả đội, được giữ theo xác nhận của người dùng.

<!-- slug: rts-controls-converging-lanes -->
