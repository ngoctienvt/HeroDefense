# Phase 7 — Test, log, tài liệu và cân bằng

## Log server (`apps/server/src/game-room.ts`)

- Thêm `logGearStats(wave)`, theo cách `logCarryStats` đang làm. Mỗi wave log một dòng `gear`: số món rớt theo phẩm và nguồn, số lần kích hoạt từng dòng độc nhất. Sau đó xóa `state.gearStats`.
- Lệnh đồ thành công thì log `gear-command` với loại lệnh, không kèm tên người chơi hay token.

## Benchmark cân bằng

Mới `packages/game-core/test/gear-balance-benchmark.test.ts`, chạy cùng kiểu `hero-balance-benchmark.test.ts`, in bảng:

1. Số quái mỗi tướng hạ được qua 45 wave, đo theo đội mẫu. Dùng để chỉnh tốc độ tích của Hấp Tinh, sao cho chạm trần vào khoảng wave 35–45.
2. Số món rớt mỗi người mỗi trận, theo phẩm. Mục tiêu khoảng 25–35 món, trong đó 2–5 món vàng.
3. DPS và độ trâu của đội mẫu có đồ trung bình wave 45 cường hóa +6, so với hệ cũ cấp 5/5/5. Mục tiêu: chênh lệch trong khoảng ±15%.
4. Lượng hồi máu và khiên của Support: hồi theo Công vẫn tăng nhờ % Công của đồ; chỉ mất hệ số pháp lực cũ (tối đa ×2,25). So sánh để quyết định có cần dòng riêng tăng hồi máu không.
5. Tổng Linh Thạch cả trận so với chi phí cường hóa 15 món, để kiểm tra người chơi phải ưu tiên chứ không nâng hết được.

Đây là test in số liệu, không khẳng định cảm giác chơi. Người dùng chạy và gửi kết quả để chỉnh `content/gear-design.ts`.

## Tài liệu

- `docs/gameplay-spec.md`: thay đoạn "Ba nhóm trang bị…" bằng mục **Hệ thống đồ (thiết kế web 20-10-2026)**, tóm tắt luật và trỏ tới `content/gear-design.ts`. Cập nhật đoạn bán tướng và ghép tướng (bỏ luật lấy cấp trang bị cao nhất).
- `docs/tai-lieu-co-che-game-chi-tiet.md`: cập nhật mục kinh tế và trang bị.
- `README.md`: dòng "Linh Thạch dùng nâng trang bị" thành cường hóa và tẩy luyện đồ; thêm phím `I`.
- Ghi rõ đây là thiết kế bản web, không phải nội dung map.

## Bàn giao

Người dùng tự chạy:

```powershell
npm run typecheck
npm test
```

Sau đó dừng server cũ, chạy `start-game.cmd` và `Ctrl+F5`.

Kịch bản kiểm tra trong game:
1. Chơi 5 wave đầu: thấy đồ rớt và thông báo, Boss wave 5 chắc chắn rớt.
2. Mặc đồ, kiểm tra Công/Máu đổi đúng. Đổi giáp không làm hồi máu.
3. Ghép tướng đang mặc đồ: đồ về kho.
4. Cường hóa và tẩy luyện: tiền bị trừ đúng, chỉ 1 dòng đổi.
5. Dùng bảng admin tạo từng dòng độc nhất và quan sát hiệu ứng.
6. Chơi co-op 2 người: không thấy thông báo nhặt đồ của người kia, không mặc được đồ của người kia.

Khi bàn giao, ghi rõ phần nào đã sửa nguồn, phần nào chưa build hoặc chưa chạy, và chưa nghiệm thu hình ảnh.
