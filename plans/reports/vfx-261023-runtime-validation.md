# Nghiệm tra VFX bậc 3 — 23/10/2026

Người dùng đã cho phép chạy typecheck, regression, build, duyệt replay và sửa lỗi. Phạm vi: h00J/K/L/M/N/O/P, h03Q/R/S; giữ Long Vương và bản Phượng Hoàng người dùng đã sửa.

## Kết quả thực thi

- `npm run typecheck`: exit 0. [Log](vfx-261023-typecheck.log).
- `npm run build`: exit 0; Vite 16,81s, server bundle 573,4 KB. Còn cảnh báo chunk client lớn hơn 1.800 KB. [Log](vfx-261023-build.log).
- Regression tập trung: **29 file, 218/218 test qua**, gồm cả mười tướng, routing/snapshot, kit, metadata server và debug. [Log/lệnh đầy đủ](vfx-261023-focused-tests.log).
- Bộ test toàn dự án: **89/124 file qua; 1.117/1.224 test qua, 107 lỗi và 2 worker timeout**. Lỗi tập trung ở kỳ vọng chỉ số/catalog, carry/C5/C6, wave/pathing/spacing, network fetch và một số assertion VFX cũ. Chưa có baseline sạch để gọi tất cả là lỗi cũ. Không đổi luật chơi hoặc hạ assertion để ép bộ này xanh. Bộ tập trung ở trên được chạy lại sau các sửa liên quan.

## Trình duyệt thật

Dùng server dev đã có ở 2567/5173, không tắt tiến trình người dùng, không khởi tạo server trùng. Phòng riêng `VfxTester`; bản chạy là source HMR ở `localhost:5173/?debug=1`. Build production đã biên dịch thành công nhưng chưa chạy lại launcher production.

Đã xem và lưu canvas thật ở 0,1 / 0,25 / 0,45 / 0,7 / 1,2 / 3 / 5,8 / 6,5 giây cho **tất cả mười tướng**. Ảnh ghi thời gian thực từng mẫu; tab không bị ẩn. Replay dùng mục tiêu giả chỉ để trình bày, không được coi là event server thật.

| Tướng | Ảnh và quan sát |
|---|---|
| Bát Giới | [Nhịp](tier3-runtime/vfx-h00J-ultimate.png): sóng xanh/bọt trắng, nhân vật/HP nằm trên lớp nước; dấu cuối được thu hồi |
| Sa Ngộ Tịnh | [Nhịp](tier3-runtime/vfx-h00K-ultimate.png): cột cát có thể tích, chuỗi đến vị trí nhận rồi hạ, không thành mảng sáng che đội |
| Tiểu Bạch Long | [Nhịp](tier3-runtime/vfx-h00L-ultimate.png): đường gió/rồng di chuyển và đuôi rút; khi đội đứng sát có phần đường bay bị thân tướng che |
| Tinh Vệ | [Nhịp](tier3-runtime/vfx-h00M-ultimate.png): cảnh báo, đá rơi, nước/đá bắn và hố đất; hình vật chất đọc được trên nền thật |
| Chung Quỳ | [Nhịp](tier3-runtime/vfx-h00N-ultimate.png): bùa rơi, lửa ma, dấu trận còn ở 3s và sạch ở 5,8s |
| Phán Quan | [Nhịp](tier3-runtime/vfx-h00O-ultimate.png): sổ mở và mực quét, không che thanh HP; các mục tiêu replay gần nhau khiến một phần cùm/xích khuất sau đội |
| Ngưu Ma Vương | [Nhịp](tier3-runtime/vfx-h00P-ultimate.png): giậm, đá/gai và nứt đất, không để lại cột/gai lơ lửng sau pha kết |
| Trầm Hương | [Nhịp](tier3-runtime/vfx-h03Q-ultimate.png): đèn, rìu rơi, đá vỡ và khe khép; tia trên rìu có thể ra ngoài khung xem hẹp lúc camera đang chuyển |
| Khổng Tước | [Nhịp](tier3-runtime/vfx-h03R-ultimate.png): quạt ngũ sắc mở/quét/thu rõ; tướng và HP còn rõ trên toàn bộ quạt |
| Triệu Công Minh | [Đội đông](tier3-runtime/vfx-h03S-ultimate.png), [đứng riêng](tier3-runtime/vfx-h03S-solo.png): xu nhỏ đúng làn 2 đơn vị; xoay/bay và hit đọc được khi đứng riêng. Không tăng kích thước vượt làn để bù đội hình che khuất |

Đã cho phòng thử giao chiến đến đợt 3. Log **event thật**: Phán Quan cast/resolve 2 targets; Trầm Hương resolve 5 quái/3 người hỗ trợ rồi 1 quái/2 hỗ trợ; Khổng Tước marker bắt đầu từ snapshot remaining 4,95/4,9s trên 5 đồng minh; Triệu Công Minh resolve hướng gần −Z, 1–2 quái và 1 đồng minh. Đây là chứng cứ routing/snapshot runtime bổ sung cho regression, không phải bằng chứng đã quay đủ mọi tình huống.

Console không có error/warn hoặc `shader.error`/`asset.error` trong phiên nhóm hai đã duyệt. `battlefield.performance` ghi khoảng **60 FPS**, 275–429 mesh, có mẫu 24 actor ở khung 690×668. Đây là mẫu đo đơn máy/phòng solo, chưa chứng minh tải 4 người hoặc FPS tối thiểu khi mọi chiêu đồng thời.

## Phần chưa nghiệm thu riêng

- Nền tối trong trận (contact sheet sáng/tối đã xem ở bước asset).
- Reduced motion trong trình duyệt (công thức, shader time0 và cleanup có regression).
- Co-op 4 người, toàn bộ bốn hướng/camera, reconnect giữa mọi loại trạng thái và mọi góc cold-load.
- Độ liền khung của art gốc và một số viền alpha đã ghi trong báo cáo từng tướng; không gọi tất cả animation là hoàn hảo.

## Cách duyệt lại

Mở `?debug=1`, có tướng sống trong khu, dùng **Tướng VFX → Phát VFX / Chụp nhịp VFX**. Nút chụp lấy canvas thật, khóa edge-pan trong lúc chụp, lưu PNG và dọn timer/Blob URL khi đóng/rời trang. Không tạo quân, gây sát thương hoặc gửi lệnh server. Test của dispatch nằm trong `visual-kit-hero.test.ts`.

Nếu đang dùng launcher production: dừng server cũ do người dùng quản lý → chạy `start-game.cmd` để dùng build mới → `Ctrl+F5`. Không coi HMR hoặc build thành công là đã chạy phiên production mới.
