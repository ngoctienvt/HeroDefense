---
phase: 1
title: "Kiểm kê kỹ năng và chọn lát cắt mẫu"
status: todo
priority: P1
effort: "Ước lượng sau khi thử truy vết mẫu"
dependencies: []
---

# Giai đoạn 1: Kiểm kê và chọn mẫu

## Yêu cầu

Đối chiếu 70 hero trong `content/data/catalog.json` với `war3map.j`, bảng ability và `roster-evidence.json`. Với từng hero ghi rawcode, skill/trigger, dòng chứng cứ, điều kiện, mục tiêu, hiệu ứng, cooldown và mức tin cậy: xác minh / một phần / chưa rõ. Tách dữ liệu map khỏi số liệu cân bằng web. Không chạy JASS hay nhập binary Warcraft vào client.

## Các bước và tệp

1. Tạo bảng máy đọc được trong `content/` hoặc `tools/map-extraction/`, báo cáo trong `plans/.../reports/`; kiểm tra đủ 70 ID và link nguồn. Đọc chứng cứ tại `plans/261012-1846-thien-dao-web-coop/research/map-evidence/`.
2. Chọn 5–8 mẫu phủ 5 vai trò và nhiều kiểu tác động, gồm ít nhất một nhân vật thiết kế mới nếu chứng cứ map thiếu; lập storyboard cast/impact/death. Với skill mới, ghi căn cứ danh tính, nguyên tố, vai trò, cốt truyện có nguồn và ràng buộc cân bằng web.
3. Chốt contract: server quyết định kết quả, client diễn hoạt; auto/Q cùng cooldown; HUD hiện mức xác thực khi cần.
4. Từ [ảnh tham chiếu](./references/art-reference.png), chốt mục tiêu hình ảnh: chibi cách điệu dưới camera 3D hiện tại, boss nổi bật, sàn đá tím/pháp trận sáng, VFX rực nhưng silhouette, đường đi, HP và nhãn tên vẫn rõ. Không sao chép sprite/UI của ảnh.

## Nghiệm thu

- [x] Bảng đủ 70 ID; mỗi kết luận truy ngược được tới nguồn, phần thiếu ghi unknown.
- [x] Danh sách mẫu và storyboard có tiêu chí khả năng đọc trận.
- [x] Có tỷ lệ skill xác minh thực tế trước khi ước lượng mở rộng.

Rủi ro: script obfuscated. Nếu không nối rawcode với trigger đáng tin, nhân vật đó giữ nhãn thích nghi.
