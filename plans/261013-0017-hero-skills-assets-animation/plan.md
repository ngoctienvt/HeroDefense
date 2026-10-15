---
title: "Thiên Đạo — kỹ năng nhân vật, asset và animation 3D"
description: "Khôi phục kỹ năng có chứng cứ từ map, làm lát cắt hình ảnh đẹp sớm, rồi mở rộng cho 70 nhân vật."
status: in-progress
priority: P1
effort: "Ước lượng sau kiểm kê chứng cứ và mẫu asset"
tags: [gameplay, content, art, animation]
blockedBy: []
blocks: []
created: 2026-10-13
---

# Kế hoạch hoàn thiện kỹ năng và hình ảnh

## Đích và quyết định

- Kỹ năng từng nhân vật bám đúng chứng cứ từ `ThienDao v2.1.w3x` khi xác minh được. Với phần thiếu chứng cứ, **tự thiết kế kỹ năng riêng phù hợp danh tính/cốt truyện nhân vật**, ghi nhãn “thiết kế mới cho bản web”; không tuyên bố đúng map.
- Giữ Babylon.js 3D hiện tại; dùng [ảnh người dùng cung cấp](./references/art-reference.png) làm tham chiếu phong cách. Ưu tiên góc nhìn chiến thuật, nhân vật chibi cách điệu, boss có silhouette lớn, nền gạch đá tím và pháp trận phát sáng, hiệu ứng phép nhiều màu. Giao nhóm mẫu chơi được và đẹp trước, rồi mở rộng. Ảnh chỉ dùng tham chiếu, không chép sprite/UI hoặc đóng gói vào game.
- Giữ 70 danh tính, co-op authoritative và luật hiện hành. Không đưa model, texture hoặc audio Warcraft vào client khi chưa rõ quyền sử dụng.

## Hiện trạng đã kiểm tra

`content/data/catalog.json` có 70 nhân vật, nhưng `tools/map-extraction/web-adaptation.ts` gán một kỹ năng chung cho mỗi trong 5 vai trò. `packages/game-core/src/combat.ts` chỉ có 5 handler; `GameEvent` có loại kỹ năng và vị trí cơ bản. `apps/client/src/battlefield.ts` dùng hình khối và chớp cầu đơn sắc; `ui.ts` dùng ký tự làm chân dung. Client chưa có asset ảnh, model, âm thanh. [Nguồn nội dung](../../docs/content-provenance.md) xác nhận kỹ năng hiện tại là thích nghi. [Khảo sát map](../261012-1846-thien-dao-web-coop/reports/map-inspection.md) chưa truy hết dispatch kỹ năng và asset.

## Giai đoạn

| # | Giao phẩm | Phụ thuộc | Cửa nghiệm thu |
|---|---|---|---|
| 1 | [Kiểm kê và chọn mẫu](./phase-01-start.md) | — | 70 hồ sơ chứng cứ; chọn 5–8 mẫu phủ 5 vai trò. |
| 2 | [Nền kỹ năng riêng](./phase-02-skill-foundation.md) | 1 | Server xử lý kỹ năng theo hero, client nhận sự kiện đủ diễn hoạt. |
| 3 | [Kỹ năng mẫu và mở rộng](./phase-03-hero-ability-rollout.md) | 1, 2 | Mẫu chơi được; 70/70 có trạng thái xác thực và triển khai. |
| 4 | [Hướng mỹ thuật và pipeline](./phase-04-art-direction-and-asset-pipeline.md) | 1 | Mẫu 3D/chân dung có quyền dùng, ngân sách hiệu năng. |
| 5 | [Animation, VFX, âm thanh](./phase-05-animation-and-vfx-integration.md) | 2, 4 | Mẫu có feedback rõ cho cast, hit, death trong trận đông. |
| 6 | [Mở rộng hình ảnh, QA](./phase-06-full-roster-qa.md) | 3, 5 | Ma trận kỹ năng/asset và nghiệm thu multiplayer. |

Lát cắt sớm xong khi phase 1, 2, phần mẫu của 3, 4, 5 đạt nghiệm thu; không đợi làm đẹp cả 70 nhân vật. Phase 3 và 4 có thể song song. [Kế hoạch RTS/làn hội tụ](../261013-0010-rts-controls-converging-lanes/plan.md) đang pending: engine kỹ năng làm độc lập, còn VFX/địa hình và QA đông quân cần chạy trên hình học làn cuối cùng. Không đặt phụ thuộc toàn kế hoạch khi chỉ một bước tích hợp cần nó.

## Điều kiện hoàn tất

- [x] 70/70 nhân vật có hồ sơ skill: nguồn, độ tin cậy, hành vi web, sai khác và tình trạng nghiệm thu. Thiếu chứng cứ có kỹ năng riêng được thiết kế theo cốt truyện, gắn nhãn “thiết kế mới”; fallback vai trò chỉ là trạng thái tạm trong lúc triển khai.
- [ ] 5–8 mẫu phủ 5 vai trò hoạt động solo/co-op; animation cast/impact, cooldown và phản hồi trúng/không trúng rõ.
- [ ] Mọi kỹ năng triển khai có test mục tiêu, phạm vi, cooldown, damage/heal/status, quyền lệnh, reconnect và tải nhiều quân; typecheck/test/build qua.
- [ ] Asset có manifest nguồn/license, fallback, ngân sách tải/FPS; so hình ảnh mẫu với đặc điểm tham chiếu và duyệt 1366×768, 1920×1080, trận đông và reduced-motion. Tên, thanh HP, nút lệnh không chồng lấn dù VFX dày.
- [ ] Boss và chiến trường được nghiệm thu lại sau khi làn hội tụ thay hình học.

## Rủi ro và thông tin có thể bổ sung

Script map bị làm rối; có thể không chứng minh được skill riêng cho toàn roster. Phần thiếu chứng cứ được thiết kế mới theo cốt truyện như người dùng đã chốt, với nguồn và cơ chế ghi riêng. Sản xuất 70 model/animation riêng tốn công, chỉ mở rộng sau khi mẫu chứng minh chất lượng và hiệu năng.

Ngân sách asset hoặc người làm 3D (nếu có) sẽ giúp dự toán sau lát cắt mẫu; không chặn việc lập style guide từ ảnh đã gửi.

<!-- slug: hero-skills-assets-animation -->
