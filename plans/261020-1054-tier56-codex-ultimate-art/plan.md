---
title: "Ảnh Codex cho toàn bộ tuyệt kỹ bậc 5–6, trừ Cộng Công"
description: "Kế hoạch tạo ảnh stylized theo Cộng Công cho tuyệt kỹ và trạng thái do tuyệt kỹ tạo ra của 25 tướng hiện tại."
status: in_progress
priority: P1
effort: ""
tags: [vfx, codex-art, tier5, tier6]
created: 2026-10-20
blocks: [261019-1623-hero-vfx-kit]
---

# Ảnh Codex cho tuyệt kỹ bậc 5–6

## Overview

Tạo đủ ảnh nguồn bằng công cụ tạo ảnh của Codex cho **25 tướng hiện tại: 12 bậc 5 + 13 bậc 6**, gồm hình chính tuyệt kỹ, chuyển động, va chạm và trạng thái do tuyệt kỹ sinh ra. **Loại Cộng Công `h01G`; không làm đòn thường và nội tại độc lập.** Danh sách job cụ thể nằm ở [bậc 5](asset-tier5.md) và [bậc 6](asset-tier6.md); mỗi dòng asset là một ảnh/job, không phải mỗi tướng một ảnh.

Inventory hiện tại: **143 asset =54 riêng cấp5 +74 riêng cấp6 +15 dùng chung**. Bộ chung gồm [hai layer shield](asset-shared-shield.md) và [13 trạng thái/buff](asset-shared-status.md). Sau shield,37 job riêng tiếp tục được thay bằng13 job chung. Ba nguồn cũ cần rà lại style; dự kiến140 ảnh mới nếu cả ba tái dùng được. Chưa tính lượt sửa/tách keyframe.

Người dùng chốt **stylized như Cộng Công**, khối lớn, cel shading ba bậc, viền tối và rim sáng tiết chế. Hình chính/palette/màn hóa thần riêng giữ nhận diện tướng; shield, phá giáp, hồi máu, đóng băng, hồi sinh, choáng/chậm/phong ấn, bốn buff chỉ số và miễn/giảm sát thương dùng thiết kế chung theo từng tác dụng. Các trạng thái khác nhau vẫn có dấu khác nhau; xem [art-contract.md](art-contract.md).

Đầu ra tạo ảnh của kế hoạch sẽ cung cấp cho giai đoạn 7 của [hero-vfx-kit](../261019-1623-hero-vfx-kit/plan.md); không chặn những giai đoạn không dùng lô ảnh này. Tái dùng kinh nghiệm [lô Huyền](../261020-0957-huyen-codex-art/plan.md), nhưng không mang sang quy tắc cột rỗng/khung cuối rỗng hoặc fallback dựng code khi chúng không phù hợp. Sau [dọn ảnh vẽ tay cũ](../reports/cleanup-261020-2233-painted-vfx.md), đã [tạo lại 15/16 ảnh stylized](reports/stylized-regeneration-20261020.md). Ledger hiện **74 raw-ready, 17 BLOCKED_ART, 51 style-review-required, 1 BLOCKED_TOOL**; 142/143 job có candidate. `five-finger-mountain-front-sheet` chưa có ảnh mới vì host image_gen trả `usage_limit_reached`, thời điểm mở lại được công cụ ghi là 10:18:16 ngày 21-10-2026, Asia/Bangkok. Inventory vẫn đủ 143 job. Raw cũ nằm ngoài thư mục hoạt động, không được chọn lại; ba atlas Như Lai tích hợp nhầm vẫn được gỡ khỏi runtime. Ảnh mới chỉ ở nguồn raw, chưa xử lý/tích hợp/build hoặc nghiệm thu trong game.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Đủ ảnh đúng inventory và đúng hành vi catalog/event/snapshot của cả 25 tướng | P1 |
| 2 | Art stylized khối lớn, cel shading rõ, hình chính riêng từng tướng, chuyển động thật, alpha/anchor ổn định | P1 |
| 3 | Prompt, nguồn gốc từng ảnh, QA và hướng dẫn xử lý đủ rõ để Codex khác tiếp tục | P1 |

### Phạm vi và giới hạn

- Roster, palette đề xuất, asset và vật chất: hai inventory là bảng sở hữu; đối chiếu `content/catalog.ts` và mã `packages/game-core/` trước khi tạo. Tên và tier hiện tại thắng tên cũ trong catalog được sinh. Thái Bạch `h015` vẫn có trong phạm vi dù dữ liệu hiện tại còn tạm; Nguyên Thủy `h014` dùng tier override 6.
- Trạng thái như khiên, khống chế, buff, dấu ấn, vùng duy trì và triệu hồi chỉ thuộc phạm vi nếu truy được về tuyệt kỹ này. Đòn của đơn vị do tuyệt kỹ triệu hồi có thể cần VFX; phân thân/Huyết Thi tái dùng atlas đã có. Cổ Thụ Thần Nông chưa có sprite nên có một prop đứng yên và lớp rễ xuất hiện/biến mất trong inventory; không thêm bộ walk/attack nhân vật ngoài nhu cầu tuyệt kỹ. Không gom toàn bộ `trait-*`/nội tại của tướng vào lô này.
- Không đổi luật, bán kính, số mục tiêu, thời gian hoặc quyền quyết định của server. Khi snapshot không đủ chứng cứ phân biệt nguồn trạng thái, ghi hạn chế tích hợp; không tự suy ra quan hệ nhân quả ở client.
- Ảnh không thay được geometry có thể tích/che khuất: bát cao, vỏ khiên, núi hoặc vật bao người có thể cần mesh/shader hoặc lớp trước/sau ở bước tích hợp sau. Lô này cung cấp ảnh/layer/mask cần thiết, không bảo đảm chỉ dán billboard là đạt chuẩn Cộng Công.
- Không tạo skill mới, không giả định skill `vfx-skill` có sẵn; không tự chuyển sang Blender hoặc hình code để lấp job ảnh lỗi. Không hứa thời gian/chi phí hoặc FPS khi chưa đo.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Start](./phase-01-start.md) | In progress |
| 2 | [Phase 2: tier5-art](./phase-02-tier5-art.md) | In progress |
| 3 | [Phase 3: tier6-art](./phase-03-tier6-art.md) | In progress |
| 4 | [Phase 4: qa-handoff](./phase-04-qa-handoff.md) | In progress |

Pha 1 khóa contract, shield chung và pilot Chúc Dung + Hằng Nga + Như Lai, dùng chính các job trong inventory. Pha 2 và 3 hoàn tất phần còn lại, từng job tuần tự. Pha 4 rà toàn bộ và bàn giao; không chạy nhiều phiên tạo ảnh cùng lúc.

## Success Criteria

- [ ] 25/25 tướng có từng job được đánh dấu rõ; không có h01G, đòn thường hay nội tại độc lập bị đưa nhầm vào inventory.
- [ ] Mỗi job có prompt, ảnh raw nguyên bản, route/phiên nguồn, bảng màu, layout thật, anchor và kết quả QA; không chọn PNG chỉ vì mới nhất.
- [ ] Hình chính giữ phong cách stylized Cộng Công đã chốt, đúng vật chất/đối tượng/phạm vi; sheet có chuyển động thực, các vòng lặp nối đúng.
- [ ] Không tràn ô/cắt đứt vật thể, không fit bbox từng khung; kiểm alpha, nền sáng/tối và kích thước dự kiến hiển thị.
- [ ] Job không đạt sau tối đa hai lượt sửa/tạo lại ghi `BLOCKED_ART`; giữ ảnh lỗi và không nhận đủ ảnh thay cho đạt hình ảnh.
- [ ] Bàn giao phân biệt `raw-ready`, `processed-ready`, đã build, đã chạy bản mới và đã nghiệm thu trong game. Chỉ kết luận hoàn tất ảnh khi mọi job đạt; blocker không bị giấu.

## Kiểm tra và bàn giao

Trong tác vụ lập kế hoạch chỉ đọc nguồn và rà liên kết/nội dung Markdown. Không chạy game/server/browser, `npm test`, `npm run typecheck` hay `npm run build`. Khi thực hiện tạo ảnh, kiểm ảnh tĩnh/contact sheet là cổng art; kiểm thử runtime thuộc lần tích hợp sau do người dùng chạy theo [pha 4](phase-04-qa-handoff.md).

## Câu hỏi còn mở

Không còn câu hỏi chọn phong cách. Những hạn chế chứng cứ event/snapshot riêng từng tướng phải ghi đúng ở inventory và bàn giao, không sửa gameplay để hợp ảnh.

<!-- slug: tier56-codex-ultimate-art -->

