---
phase: 6
title: "Mở rộng asset và QA toàn roster"
status: todo
priority: P2
effort: "Dự toán sau lát cắt mẫu"
dependencies: [3, 5]
---

# Giai đoạn 6: Mở rộng và nghiệm thu

## Đầu việc

1. Mở rộng model/material/portrait/animation theo cụm sau khi mẫu đã duyệt. Ưu tiên hero xuất hiện sớm, boss, silhouette khác biệt. Manifest theo dõi 70/70, quyền dùng và fallback.
2. Duyệt ma trận 70 hero × skill: chứng cứ, code/test, HUD, VFX/SFX, model/chân dung, trạng thái fallback. Không coi fallback là asset hoàn thiện.
3. Test trận từ kinh tế đầu ở solo/2–4 người, boss/phụ bản, RTS nhóm, làn hội tụ, tốc độ 1×/2×/4×, reconnect; đo FPS và lỗi tải trong trình duyệt thật.
4. Cập nhật gameplay/provenance theo hành vi thực, ghi sai khác với map; chạy `npm run typecheck`, `npm test`, `npm run build`.

## Nghiệm thu

- [ ] 70/70 có trạng thái skill và asset minh bạch; không giấu placeholder dưới nhãn hoàn thiện.
- [ ] Hero có chứng cứ hoạt động đúng phần đã chứng minh; hero thiếu chứng cứ có skill riêng theo cốt truyện, ghi nhãn “thiết kế mới”, có test và không còn fallback chung trong bản hoàn tất.
- [ ] Bản mở rộng qua QA khả năng đọc trận, hiệu năng, quyền asset và multiplayer.

Rủi ro: khối lượng art phụ thuộc chất lượng mục tiêu và nhân lực. Nếu mẫu vượt ngân sách, tối ưu LOD/pipeline trước khi nhân rộng.
