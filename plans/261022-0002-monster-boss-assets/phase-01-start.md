---
title: "Khóa art và pilot khó"
status: in_progress
priority: P1
dependencies: []
---

# Phase 1: Khóa art và pilot khó

## Overview

Khóa [roster](./roster.md), [art-contract](./art-contract.md), chứng minh chất lượng bằng 5 cá thể pilot đang triển khai trước khi sản xuất hàng loạt. Người dùng cho phép bỏ qua Đế Giang nếu không thể giữ đúng brief; Đế Giang giữ master concept trong roster nhưng không chặn tiến độ pilot.

## Requirements

- [x] Người dùng duyệt tỉ lệ 20 quái/20 boss, roster 40 ID và brief Ngũ Hành.
- [x] Giữ một entity server cho boss nhóm, thiết kế riêng từng thành viên theo quyết định đã duyệt.
- [ ] Không chạy game/test/build nếu người dùng chưa yêu cầu rõ; nghiệm thu runtime do người dùng.

## Architecture

Master + style reference → bốn direction master → action sheet theo đúng hướng → xử lý alpha/registration → atlas/manifest → preview. Người dùng yêu cầu tiếp tục không chờ duyệt; chỉ chấp nhận art sau QA và ghi rõ cảnh báo. Route được kiểm tra trước khi tạo ảnh; không dự báo chi phí nếu công cụ không trả số liệu.

## Related Code Files

- Read: `docs/pangu-sprites.md`, `docs/linh-huyen-sprites.md`, source các bộ hero mẫu.
- Read: `apps/client/src/monster-motion.ts`, `visual-sprites.ts`, `visual-actors.ts`, `visual-materials.ts`.
- Modify khi triển khai: `tools/assets/pack-monster-motion.py`; tái dùng helper source/QA từ các bộ hero sau khi xác minh contract.
- Modify cho lát pilot: `apps/client/src/monster-motion.ts`, `visual-sprites.ts`, `visual-actors.ts`, `visual-materials.ts` và test gần hành vi; dùng cùng resolver/cache mà phase 3 sẽ mở rộng.
- Create khi được triển khai: `assets/sprites/monster-motion/<pilot-id>/source/` và `web/` theo art-contract.

## Implementation Steps

1. Duyệt art bible, 40 ID và quy ước tên; khóa 5 ID hiện hữu, ID mới chưa đưa vào network.
2. Chọn và xem master Bàn Cổ thật, ghi reference đã dùng. Chạy capability check của skill khi bắt đầu tạo ảnh; chưa cần trong bước lập kế hoạch.
3. Pilot đang triển khai: m001, m004, b001, Kim Giác, Ngân Giác. Đế Giang được bỏ qua ở phần hướng/action theo chỉ đạo người dùng sau nhiều lần tạo hướng không giữ đúng identity; master concept hiện có được giữ làm source, không tính là bộ hoàn chỉnh.
4. Tạo bốn hướng riêng; kiểm tra giải phẫu nhiều chi, cánh và bất đối xứng. Chốt motion envelope, canvas, ground anchor và scale chung.
5. Tạo walk/attack, idle một frame/hướng cho cả quái và boss; không tạo hit/death hoặc cast riêng. Sửa thiếu pose/chuyển trọng tâm bằng ảnh mới đúng pose, không biến dạng code.
6. Pack bằng pipeline đã mở rộng, kiểm tra contact sheet/loop/alpha sáng tối và so với tướng. Tích hợp m001/m004/b001 vào slot cũ và Kim/Ngân Giác vào Lưỡng Giới với hai visual child chung một enemy. Không thêm spawn hoặc đổi mốc mở. Preview/fixture có thể hỗ trợ xem đủ hướng nhưng không thay nghiệm thu trong encounter thật.
7. Hoàn thành lát tích hợp pilot ngay trong phase này, gồm resolver/anchor/cache/action/fallback/log và test liên quan theo kiến trúc phase 3. Gửi người dùng các bước chạy bản mới để họ nghiệm thu đủ 6 cá thể trên game thật; theo chỉ đạo người dùng, tiếp tục phase 2 mà không chờ kết quả này và không tự ghi pass. Đo thời gian/lượt sửa/dung lượng và tài nguyên, chốt ngân sách cho 34 bộ còn lại.

## Todo

- [x] Roster và contract được người dùng duyệt.
- [ ] 5 pilot đang triển khai đủ source/action/QA; Đế Giang được bỏ qua theo chỉ đạo, chưa tính hoàn chỉnh. m001, m004, b001 có bốn hướng; Kim/Ngân còn candidate direction; action thử hiện còn cảnh báo/lỗi.
- [ ] Có quyết định scale/atlas/timing dựa trên pilot, không dựa vào bbox mỗi frame.
- [ ] Người dùng nghiệm thu pilot trong game; chưa chạy game/build/test theo chỉ dẫn của dự án. Theo chỉ đạo, tiếp tục phần sản xuất khi chưa có kết quả này; không ghi nghiệm thu thay người dùng.

## Progress log

- Roster/contract đã được người dùng duyệt; sáu master pilot đã có file nguồn nhưng chưa đánh dấu `master-approved` (xem [review nội bộ](./reports/pilot-master-review.md)). m001, m004 và b001 có bốn hướng riêng; m001 west còn cảnh báo width-limited. m004 và b001 đã có contact sheet nền sáng/tối; toàn bộ các hướng của hai bộ qua xử lý master với 0 cảnh báo.
- m001 south walk: ba sheet thử, chưa đạt; v1/v2 frame QA fail, v3 còn cảnh báo nhịp chân, độ trôi thân/đường chân và loop. South attack v1 spill fail ở ba cell, chưa đóng gói.
- m004 có đủ bốn hướng; flight south v1/v2 đều spill fail (tràn cell/mép hoặc cell rỗng), chưa đóng gói. b001 có đủ bốn hướng và contact sheet sáng/tối.
- art-gold-horn có hướng west/north qua master framing; east chưa tạo được vì route image_gen báo usage limit. Tuyến Codex CLI dự phòng không tương thích cờ `sleep_tool`; gọi trực tiếp cũng gặp cùng HTTP 429. Chưa có tuyến ảnh khả dụng cho tới khi quota reset.
- Mở rộng `tools/assets/pack-monster-motion.py` bằng chế độ `--asset` đọc profile + `source/export-manifest.json`: yêu cầu motion-approved, đủ clip/hướng và duration; giữ full-canvas, anchor hướng về một ground anchor chung, một scale theo motion envelope, alpha premultiplied và atlas nhiều trang. Đường legacy được giữ nguyên. Chưa có motion-approved profile/export manifest để đóng gói; chưa chạy game/test/build theo AGENTS.md.
- 2026-10-22: Chế độ manifest packer từ chối frame không phải PNG hoặc PNG không có alpha thật/pixel trong suốt, tránh tự tạo alpha giả khi convert ảnh nền đặc.
- Lưu `directionAnchors` từ master framing metadata cho các profile đã có view; dùng làm căn cứ cho shared ground anchor, không lấy đáy bbox tự crop.
- Chưa có pilot nào đủ mọi hướng + walk/attack + QA/export; chưa tích hợp runtime, chưa chạy hoặc nghiệm thu trong game. Giữ phase 1 mở.
- 2026-10-22: Rà lại QC m004 flight south v2 theo đúng grid trong prompt (3 hàng × 2 cột). Ảnh thực tế là 1536×1024, không phải 1536×1536 như yêu cầu; QC vẫn FAIL: 3 thành phần alpha đặc và 3 thành phần viền alpha băng qua cell; boundary band 2936 px; safe-frame WARN ở cả 6 cell; alpha haze 100227 px và 11 thành phần rời. Cell cao chỉ 341–342 px khiến cánh/chân tràn. Đã xác nhận `prompt-v3.txt` yêu cầu canvas vuông và thu nhỏ đồng đều cả bộ sáu frame nếu pose giơ cánh vượt safe area, không crop/hide đầu cánh. Sheet cũ chưa được chấp nhận.
- 2026-10-22: Ghi prompt sửa m001 tại `source/actions/walk/south/prompt-v4.txt` (đảo NEAR/FAR rõ, giữ chân tiếp đất và khóa vị trí thân/đường chân) cùng `source/actions/attack/south/prompt-v2.txt` (giới hạn silhouette trong safe area mỗi cell, khóa anchor). Walk v3b còn WARN phase coverage/leg alternation, torso drift 7.0 game px so với 2 px, row baseline 10.62 px so với 0.5 px, seam 1.73 so với 1.5; attack v1 còn FAIL spill 3 cell và vi phạm boundary/safe-frame. Đây là prompt sửa, chưa có ảnh sửa.
- 2026-10-22: Bổ sung sáu prompt hướng độc lập còn thiếu cho Đế Giang (west/north/east) và Ngân Giác (west/north/east). Ràng buộc rõ số chi/cánh, không mặt cho Đế Giang, bất đối xứng hồ/sừng, hướng nhìn và anchor. Kiểm kê pilot hiện có master cả 6; action art chỉ mới thử ở m001/m004; hướng còn thiếu ở Đế Giang, Ngân Giác và Kim Giác east. Prompt mới là đầu vào, chưa phải ảnh hay hướng đã duyệt.
- 2026-10-22: Thử generation Đế Giang west qua image_gen với master làm reference; route trả `usage_limit_reached` HTTP 429, `resets_at=1792640390` (2026-10-22 03:39:50 UTC). Doctor hiện chỉ có host_image/Codex CLI, không có API key; CLI dự phòng trước đó cũng trả cùng quota. Chưa ghi ảnh đầu ra.
- 2026-10-22: Soạn 8 prompt action riêng cho b001 theo bốn master hướng (`walk` loop nặng 8 pose, `attack` một cú nện hai tay có thu thế), grid 4×2, anchor chung/safe-frame và không nhúng impact/VFX. Lưu từng prompt dưới `b001/source/actions/<action>/<direction>/prompt-v1.txt`. Đây là prompt queue; chưa tạo hoặc QA sheet.
- 2026-10-22: Bổ sung prompt m001 walk/attack cho ba hướng west/north/east; south vẫn giữ prompt sửa v4/v2. Bổ sung m004 flight cho ba hướng còn lại và `flight/south/prompt-v4.txt`, khóa lại 1536×1024 grid 3×2 theo output thực tế và ngăn lặp lỗi 2×3/canvas vuông của v3. Đây là đầu vào generation, chưa có ảnh hay kết quả QA.
- 2026-10-22: Đủ 8 prompt hành động cho Đế Giang tại `source/actions/{walk,attack}/{south,west,north,east}/prompt-v1.txt`; walk khóa sáu chân theo cặp NEAR/FAR và nhịp tiếp đất, attack giữ bốn cánh làm silhouette riêng, không mọc thêm chi hoặc nhúng VFX. Chỉ là prompt; chưa có sheet, ảnh QA hoặc motion approval.
- 2026-10-22: Bổ sung 16 prompt walk/attack bốn hướng cho Kim Giác và Ngân Giác theo master direction tương ứng, grid boss 4×2/8 pose, giữ riêng silhouette và đạo cụ bất đối xứng; cả hai dùng một entity/clock khi ghép. Là prompt chờ generation, không được tính là action art hoặc QA.
- 2026-10-22: Kiểm tra tĩnh hàng đợi prompt cho 6 pilot: đủ 11 action-family (m001 walk/attack, m004 flight, b001 walk/attack, bốn bộ walk/attack cho Đế Giang/Kim Giác/Ngân Giác) × 4 hướng; các prompt sửa south của m001/m004 được giữ riêng. 16 prompt mới của cặp Kim/Ngân đều tồn tại và không rỗng. `git diff --check` không báo whitespace lỗi; chỉ có cảnh báo chuẩn hóa LF→CRLF trên working copy. Chưa có thêm ảnh, QA hoặc gói runtime.
- 2026-10-22: Rà câu chữ 16 prompt Kim/Ngân và đổi nhãn reference `approved` thành `existing`; các ảnh hướng trong hàng đợi chưa được ghi là nghiệm thu. Pose/action và nhận diện giữ nguyên.
- 2026-10-22: Rà trực tiếp sáu master pilot hiện hành và đo PNG alpha/bounds; cả sáu là RGBA 1024², alpha extrema `(0,255)`, silhouette nằm trong canvas. Thanh Lang và Đế Giang có biên ngang khoảng 67–68 px, cần giữ safe margin. Ghi nhận diện/giới hạn tại [pilot master review](./reports/pilot-master-review.md); đây chưa phải duyệt game-size, nền sáng/tối, bốn hướng hay `master-approved`.
- 2026-10-22: Đọc lại QC JSON mới nhất của m001 walk/attack south và m004 flight south; số liệu gốc cùng revision prompt sửa ghi tại [pilot action QC](./reports/pilot-action-qc.md). Ba sheet hiện hữu vẫn WARN/FAIL; prompt sửa chưa có output mới. Đổi nhãn `approved` thành `existing` trong prompt direction/action pilot để không ám chỉ artwork đã được duyệt; master source vẫn được giữ làm identity reference.
- 2026-10-22: Rà metadata framing của các direction master đã xử lý. Có 17/24 cặp pilot asset/direction nguồn hiện hữu; còn thiếu Dijiang W/N/E, Ngân Giác W/N/E và Kim Giác E. m001 west vẫn width-limited; các direction hiện có cho m001 north/east/south, m004 W/N/E, b001 W/N/E, Kim Giác W/N không có warning framing trong JSON đã lưu. Chi tiết tại [pilot direction review](./reports/pilot-direction-review.md); đây chưa phải duyệt mắt ở game size.
- 2026-10-22: Người dùng cho phép bỏ qua Đế Giang nếu không thể giữ đúng brief. Các lần tạo west vẫn gần ba phần tư/front, một edit thêm hình đầu/mõm trái thiết kế thân cầu không mặt; các candidate giữ trong source history nhưng không dùng hoặc export. Tập pilot đang triển khai còn 5 asset; Đế Giang chưa được tính hoàn chỉnh.
- 2026-10-22: Tạo candidate hướng cho Kim Giác east và Ngân Giác west/north/east bằng Codex image_gen; giữ prompt, SHA-256, route và trạng thái `candidate-needs-direction-review` trong source. Đây chưa phải master đã duyệt, chưa pack/export. Theo pipeline sprite sheet của project, bước kế tiếp là tạo riêng sheet walk/attack theo từng hướng, xử lý alpha/anchor và rà pose; chưa có sheet mới trong lượt này.
- 2026-10-22: Tiếp tục theo pipeline sprite sheet của project (không dùng image-to-video). Tạo 3 candidate walk south và 3 candidate attack south cho Ngân Giác; lưu raw sheet, prompt, guide, provenance và QC riêng. `walk v2` spill FAIL 3 component qua ranh cell; `walk v1/v3` không cắt sheet nhưng WARN leg alternation. `attack v1/v2` spill FAIL và frame FAIL; `attack v3` chỉ có 4 key pose nên chưa đủ bộ 8, frame FAIL identity/torso drift. Xử lý walk v3 ra 8 frame PNG bằng `generate2dsprite.py process` với registered scale, geometry QA PASS; pose/loop vẫn chưa được xác nhận. Tất cả giữ candidate, không export hay tích hợp.
- 2026-10-22: Tạo sheet south cho Kim Giác. Attack v1 có vệt nền quanh silhouette khi xem ảnh; v1/v2 frame QC FAIL identity head ratio; v2 range 0.947–1.095 ngoài khoảng 0.95–1.05, spill WARN safe-frame/faint-specks. Walk v1 PASS leg alternation, torso drift 0.82 game px, loop seam 1.10× median nhưng FAIL identity head ratio (1.059 ở hai frame); spill WARN boundary-band/safe-frame/faint-specks. Giữ source, prompt và QC; chưa có bộ nào motion-approved, pack/export hoặc tích hợp.
- 2026-10-22: Tạo Ngân Giác east walk/attack candidate. Walk v1/v2 không tràn cell (spill WARN) nhưng v1 fail head ratio, leg alternation, torso drift 21.27 px/baseline 10 px; v2 cải thiện drift còn 5.13 px/baseline 5 px nhưng vẫn fail leg alternation và seam 1.60. Attack v1 spill FAIL (8 component qua ranh), frame FAIL head ratio/drift 48.62 px/baseline 8 px. Cả ba candidate có provenance/QC; chưa slice/export.
- 2026-10-22: Người dùng xác nhận nhân vật dùng sprite sheet; bỏ hẳn giả định image-to-video. Cũng xác nhận không cần khoảng trắng cố định tránh mép: yêu cầu thực là không cắt hình và không tràn qua cell; cảnh báo `safe_frame` không tự động là lỗi. Tạo Ngân Giác east walk/attack candidate từ master east bằng Codex image_gen và giữ prompt/provenance/SHA/QC. Walk spill WARN nhưng không có cross-cell pixel; frame FAIL leg alternation, head ratio, torso drift 21.27 game px và baseline 10 px. Attack spill FAIL với 8 thành phần qua cell, frame FAIL head ratio, torso drift 48.62 px và baseline 8 px. Chưa slice/export; cần tạo lại pose và bố cục attack.
- 2026-10-22: Ngân Giác east walk v2 giữ thân ổn định hơn v1 nhưng vẫn FAIL leg alternation, torso drift 5.13 game px, row baseline 5 px và seam ratio 1.60; spill chỉ WARN, không có component/pixel băng qua cell. Lưu prompt, SHA và QC; không slice/export.

## Success Criteria

Sáu cá thể có nhận diện khác nhau, bốn hướng đúng, chuyển động thật và bộ export hợp lệ; composite duo giữ một HP/selection; dự báo công sức/bộ nhớ từ số liệu pilot.

## Risk Assessment

Nhiều chi/cánh dễ thay anatomy giữa frame: ưu tiên sửa trước và dùng reference từng hướng. Nếu pilot sai camera/alpha/scale hoặc vượt ngân sách, sửa contract và render lại pilot; không hạ chuẩn toàn lô. Theo yêu cầu người dùng, tiếp tục sản xuất Phase 2 mà không chờ nghiệm thu game; giữ riêng trạng thái game chưa được nghiệm thu và không đánh dấu asset là integrated/built/in-game-approved khi chưa có chứng cứ.
