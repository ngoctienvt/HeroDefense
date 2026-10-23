# Tướng Siêu và Tiên

Trạng thái: đã sửa nguồn, tạo/đóng asset cho 24 tướng; chờ người dùng build, kiểm thử và nghiệm thu trong game theo `AGENTS.md`. Nguồn yêu cầu: tệp người dùng `Pasted text.txt` ngày 15-10-2026, gồm 11 tướng Tier 3 và 13 tướng Tier 4. Nội dung kỹ năng là thiết kế bản web, không gán cho kỹ năng Warcraft gốc.

## Kết quả cần đạt

- Cả 24 ID trong brief có chỉ số, cơ chế đánh thường, năng lượng, kỹ năng và combo đúng mô tả; quyết định sát thương/trạng thái thuộc `game-core`.
- Mỗi tướng có master nhận diện riêng, bốn hướng, idle tĩnh, walk/attack có pose thật, alpha và anchor thống nhất; atlas WebP/JSON, chân dung, nguồn và QA.
- Mỗi kỹ năng có VFX chính đúng vật chất/hành động, theo event/snapshot, đủ báo trước, di chuyển, va chạm, dư âm khi thích hợp; cap/cleanup/reduced motion và log.
- Hợp đồng, catalog tạo lại từ nguồn, runtime và test hồi quy đồng bộ. Không sửa tay `content/data/catalog.json`.

## Trình tự

1. Đối chiếu 24 ID, công thức, nguyên tố và khả năng hiện có với brief. Ghi điểm cần mở rộng trong contracts, `game-core`, extractor và client.
2. Cập nhật dữ liệu chiến đấu và cơ chế server; thêm test hồi quy cho trạng thái, kích nổ, mục tiêu và năng lượng.
3. Tạo master và bốn hướng cho từng tướng, sau đó walk/attack, đóng atlas, kiểm tra ở kích thước chơi thật và tích hợp.
4. Dựng VFX riêng cho từng kỹ năng từ asset nguồn, đồng bộ event/snapshot, log và dọn tài nguyên.
5. Rà nguồn, code và tài liệu. Người dùng chạy typecheck, test, build, game và nghiệm thu hình ảnh theo `AGENTS.md`.

## Giới hạn nghiệm thu

Không gọi việc có master ảnh là đã hoàn tất sprite. Không gọi việc sửa mã là đã chạy bản game mới. Agent không chạy game, build, typecheck hoặc test nếu người dùng chưa yêu cầu rõ.
