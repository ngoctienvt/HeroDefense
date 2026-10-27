# Di chuyển và khoảng cách đứng

- Mục tiêu: tướng/quái chạy nhanh hơn 50%; đi xuyên quân ở cả hai phe, chỉ giữ khoảng cách khi dừng.
- Giới hạn: server quyết định vị trí; giữ biên bản đồ, slow/root/stun, nhịp đánh và footprint dùng cho kỹ năng boss. Không chạy game/build/test theo AGENTS.md.
- Phạm vi: game-core TypeScript; pathing, collision, vòng vây, lệnh nhóm và gameplay-spec. Không đổi network contract hay asset.
- Kế hoạch đã tự rà: bỏ tránh thân trên đường đi; tìm chỗ trống tại đích; giảm bán kính đứng; bỏ tách thân cho quân đang di chuyển; cập nhật test và đọc lại các caller.
- Tiêu chí: xuyên quân đứng/đi cùng hoặc khác phe; dừng không chồng vị trí; nhóm đứng gần hơn; tốc chạy tăng đồng đều, slow vẫn áp dụng.
- Kiểm tra thực thi: người dùng chạy test:core, typecheck và launcher. Agent chỉ rà nguồn.

## Kết quả

- Đã sửa nguồn, test hồi quy và gameplay-spec; đã tự rà caller tốc độ, vòng vây, xử lý di chuyển và tách thân.
- Log `movement.config` một lần mỗi trận, `pathing.arrival-full` khi không có chỗ dừng.
- Chưa chạy test/typecheck/build/game; chưa nghiệm thu tốc độ và khoảng cách trong game.
- Review độc lập: phát hiện điểm dừng làm tròn 0,25 có thể nằm ngoài tầm đánh cận chiến. Đã tinh chỉnh tới 0,025, thêm regression h007 đánh quái đứng yên; review lại xác nhận nguồn giải quyết lỗi, không còn phát hiện cụ thể. Đây là kết luận rà tĩnh, chưa có kết quả chạy test.
- `git diff --check` cho phạm vi sửa không báo lỗi whitespace.
