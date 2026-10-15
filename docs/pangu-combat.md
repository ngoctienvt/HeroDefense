# Bàn Cổ — Khai Thiên Tổ Thần

Thiết kế bản web theo yêu cầu ngày 15-10-2026. Công thức từ catalog gốc: **Hình Thiên h011 + Đấu Chiến Thắng Phật h012 + Ngũ Đạo Tướng Quân h00Y**. Không xác nhận kỹ năng này tương ứng Warcraft.

## Thông số

Kim · Chiến Binh Hạng Nặng · Thần, hệ số mô tả 20×. HP **14.500**, Công **1.150**, Giáp **36**, tầm **2,8**, chu kỳ đánh **0,90s**, tốc chạy **4,4**, chặn **10**. Đây là chỉ số nền, không nhân thêm 20 lần khi tạo quân. Bậc hợp nhất, trang bị và duyên phận vẫn áp dụng theo hệ thống hiện có.

- Hai đòn đầu: quét nửa hình tròn phía trước, bán kính **3,8**, **100% Công**. Xuyên **35% Giáp hiện tại sau phá giáp**, **30% chí mạng ×2,2**; dùng một lần gieo chí mạng cho cả nhát đánh.
- Đòn thứ ba thay nhát quét bằng luồng bổ thẳng dài **9**, bề rộng **1,2** theo quy ước đường xuyên, **180% Công**; mục tiêu sống sót chịu Chảy Máu: **+10% sát thương vật lý trong 3s**, đẩy lùi **0,6** theo đường di chuyển của quái. Chu kỳ tính theo số lần đánh, không theo số mục tiêu.
- Nộ tối đa **100**. Mỗi nhát thường **+14**, chí mạng **tổng +24**, mỗi lần bị đánh trúng **+5**. Đang miễn sát thương lúc lấy đà không nhận Nộ từ đòn bị chặn.

## Tuyệt kỹ

1. Tiêu 100 Nộ; khóa điểm và hướng đã chọn. Lấy đà **0,35s**, miễn sát thương, không đánh thường trong thời gian này. Mục tiêu chết hoặc rời đi vẫn bổ vào điểm đã khóa. Trong sảnh chờ kỹ năng tác động ngay theo cơ chế luyện chiêu chung vì chưa có đồng hồ simulation.
2. Nổ tại điểm đã khóa, bán kính **8,5**, gây **480% Công vật lý**. Chắc chắn chí mạng khi mục tiêu **đã choáng trước nhát bổ** hoặc **dưới 50% HP trước sát thương**; các mục tiêu khác dùng 30%. Sau sát thương, phá **50% Giáp trong 6s**, choáng **2,2s**, gồm Boss.
3. Khe nứt bắt đầu tại Bàn Cổ, hướng theo nhát bổ: **14×4,5**, tồn tại **5s**, chậm **60%**, **90% Công chuẩn/giây**. Vùng chữ nhật có hướng, không phải vùng tròn. Sát thương tính theo thời gian còn lại, không vượt thời lượng ở tick cuối.
4. Dư chấn gây **150% Công chuẩn** lên tất cả quái đang ở làn chính (`zone=0`) của mọi người chơi. Quân đang triển khai của **chủ Bàn Cổ**, gồm quân đang ở phụ bản, nhận **+25% Công và +20% xuyên Giáp trong 5s**. Quân dự bị và quân người khác không nhận buff. Sát thương chuẩn bỏ qua Giáp và phần tăng sát thương của Chảy Máu; vẫn qua lớp Khiên theo luật sát thương chung.

## Hiển thị

`visual-pangu.ts` dùng mesh Babylon và texture thủ tục xác định trong `pangu-vfx-textures.ts`:

- Lấy đà: pose giơ rìu, nhấc người nhẹ, xoắn linh khí vàng, đá bay, pháp tướng bán trong suốt **3×** dùng đúng atlas Bàn Cổ và hướng camera.
- Nhát bổ: ba lớp lưỡi cong đen tím → vàng → trắng ngà. Đòn thứ ba có luồng khí đi đủ 9 đơn vị.
- Va chạm: cột sáng sau vệt chém **0,05s**, vòng chấn động đạt bán kính **8,5**, mảnh đá văng, rung camera **0,25s**. Không dùng đèn động.
- Dư âm: mép khe nứt gãy khúc, lòng vực đen tím, hạt sao, nhánh rạn vàng và tia điện ngắn. Vùng và thời gian bám snapshot. Khiên vỡ đỏ và sao vàng có thể hiện đồng thời; buff có dấu vàng riêng.

Giảm chuyển động bỏ nhảy, rung, đá và điện; vẫn giữ pháp tướng mờ, nhát bổ rút gọn, biên nổ và khe nứt. Giới hạn 96 hiệu ứng ngắn, 96 dấu trạng thái/vùng, tối đa 16 khe nứt và pool 24 mesh mỗi loại. Đổi khu vực/trận thu hồi các mesh; scene quản lý hủy tài nguyên chung khi dispose. Idle vẫn cố định khung 0.

Log client: `visual.pangu.avatar.ready/error`, `visual.pangu.windup`, `visual.pangu.impact`. Có thể xem vòng đệm `window.__thienDaoDebug()`; thêm `?debug=1` để hiện console. Event server chứa hướng, vùng và thời gian lấy đà; client không quyết định sát thương.

## Kiểm tra do người dùng thực hiện

Chưa chạy typecheck, test, build hoặc nghiệm thu hình ảnh/FPS trong game.

```powershell
npm run typecheck
npx vitest run packages/game-core/test/pangu-combat.test.ts packages/game-core/test/combat.test.ts content/test/catalog.test.ts apps/client/test/pangu-motion.test.ts apps/client/test/hero-motion.test.ts apps/client/test/pangu-vfx.test.ts
npm run build
```

Sau khi khởi động lại game bằng quy trình thường: kiểm tra đứng yên và đi trái/phải; hai nhát quét rồi luồng bổ thứ ba; Nộ 14/24/5; nhấn Q ở 100 Nộ; cho mục tiêu chạy khỏi điểm báo trước; thử Boss; khe nứt đúng 5s. Trận hai người kiểm tra dư chấn qua làn và buff chỉ đúng quân chủ sở hữu. Kiểm tra nền sáng/tối, góc camera xoay, đông quái, đổi phụ bản và chế độ giảm chuyển động. Gửi ảnh/video cùng log nếu lớp nào bị che, quá sáng hoặc sai hướng.
