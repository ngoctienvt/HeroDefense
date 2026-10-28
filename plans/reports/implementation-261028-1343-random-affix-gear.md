# Hệ đồ ngẫu nhiên — bàn giao 28-10-2026

## Kết quả nguồn

- Thay `equipment`/`equip` bằng kho riêng, ba khe, mặc/tháo/chuyển, +0–10, tẩy một dòng, phân giải và admin. Craft/merge/sell trả đồ về kho.
- 23 dòng thường, đủ 17 độc nhất; RNG riêng, rớt quái/boss, chống xui, stat cache, combat và log server. Contract `thien-dao-web-4`.
- Kho `I`, lọc/sắp xếp, hợp cơ chế, so sánh, tooltip, giá thao tác, toast đúng chủ. Phân giải nhiều món gửi có nhịp, kiểm tra lại snapshot.
- VFX dùng pool/texture hiện có; bẫy lưới theo snapshot, vệt lửa theo ground effect, sét từng nhịp nảy; có giảm chuyển động và cleanup.
- Thêm test sinh đồ/lệnh/validation/stat/17 độc nhất/tương tác/UI và benchmark; chuyển test/fixture khỏi hệ cũ.

## Quyết định áp dụng

- 20 wave: cấp món mẫu số 20; giá cường hóa `3 × (k+1)²`, một món +10 tốn 1.155, 15 món tốn 17.325 so với thu nhập wave 12.500. Quái rớt 5%, boss bảo đảm, chống xui 3 wave. Mục tiêu rớt và sức mạnh chờ benchmark.
- Bỏ hoàn toàn chỉ số/buff chặn. Vị trí quái vẫn theo kích thước thân. Định Hải chỉ miễn choáng/đẩy lùi, không phạt tốc đánh.
- Hấp Tinh 0,25% mỗi lượt, boss 20, trần 60%. Không tạo lại phụ bản đã gỡ; chỉ giữ helper thưởng theo người tham gia.
- Thất Sát giảm sát thương/hồi/khiên/sức mạnh triệu hồi xuống 40%, giữ cơ chế phụ/phạm vi/thời gian. Lục Nhĩ lưu attack snapshot cho đòn trễ.

## Sửa sau rà mã

- Huyết Khế theo dõi từng khiên con, cấp lại và hết hạn; refreshStats giữ phần hồi đang chờ và tỷ lệ HP.
- Cùng hit chí mạng gốc và đồ chỉ phóng một chuỗi Dẫn Lôi. Đòn khứ hồi áp dòng đồ mà không tăng bộ đếm đòn.
- Hạ quái từ đồ vẫn tích tầng/linh hồn. Hàng chờ chống burst đệ quy; mục tiêu 0 HP không ghi công lần hai hoặc đổi người hạ do soul-link/gourd.
- Hồi theo hit giới hạn HP thực mất. Đòn thứ bảy hạ mục tiêu vẫn có điểm ngắm/mục tiêu dự phòng.

## Kiểm tra và bàn giao

Đã rà nguồn, diff và [rà mã độc lập](code-review-261028-1309-random-affix-gear.md). **Chưa chạy** typecheck/test/benchmark/build/game/browser theo AGENTS.md; chưa nghiệm thu cân bằng/hình ảnh/FPS. Giữ thay đổi HUD/VFX có sẵn; không commit/push.

Người dùng chạy:

```powershell
npm run typecheck
npm test
npx vitest run packages/game-core/test/gear-balance-benchmark.test.ts
```

Dừng server cũ → `start-game.cmd` để build → `Ctrl+F5`. Kiểm tra 5 wave đầu, Kho I/giá, đổi giáp không hồi máu, craft/merge/sell trả đồ, admin từng độc nhất, hỗ trợ hồi/khiên lặp lại, đòn khứ hồi và co-op không hiện toast của người khác. Gửi bảng benchmark để chỉnh mục tiêu ±15%; chưa khẳng định đạt.

Nguồn 7/7 phase; plan giữ `in-progress` cho các cổng người dùng chạy kiểm tra/benchmark/nghiệm thu. Chỉ mục CLI toàn cục không ghi được; đã đồng bộ file qua chỉ mục tạm, không sửa cấu hình toàn cục.

## Câu hỏi còn mở

Không còn quyết định gameplay chờ trả lời. Còn kết quả kiểm tra và cân bằng thực tế.
