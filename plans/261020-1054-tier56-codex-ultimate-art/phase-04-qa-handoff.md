---
title: "Phase 4: qa-handoff"
status: in_progress
---

# Phase 4: qa-handoff — rà toàn bộ và bàn giao ảnh

## Overview

Rà chéo đủ25 tướng và từng dòng asset, bàn giao raw/prompt/metadata/QA để phiên tích hợp sau xử lý và nối event. Pha này không tự chuyển thành yêu cầu sửa renderer, build hay chơi game.

## Requirements

- Phụ thuộc pha2+3 về toàn bộ ảnh; có thể rà phần đã xong trước, nhưng còn blocker phải báo chưa đủ bộ.
- Dùng [contract](art-contract.md) và hai inventory [bậc5](asset-tier5.md)/[bậc6](asset-tier6.md) làm checklist nguồn duy nhất cho số job.
- Mọi trạng thái phân biệt `raw-ready`, `processed-ready`, `built`, `running-new-build`, `in-game-approved`; không dùng chữ "hoàn thiện VFX" cho lô chỉ raw.

## Architecture

Bàn giao source art → lần tích hợp riêng đọc cơ chế → processed/frame PNG/WebP/manifest → HeroVfx/event/snapshot/depth/pool/reduced motion → người dùng build/chạy/duyệt. Không bước nào được bỏ qua vì đủ PNG.

## Related Code Files

- Đọc: inventory, prompt, raw, iterations và metadata của cả25 tướng; mã combat hiện tại để bắt drift.
- Khi bàn giao ảnh tạo báo cáo tại `plans/261020-1054-tier56-codex-ultimate-art/reports/` nếu cần, gồm job ledger và vấn đề mở. Không tạo bản kế hoạch cạnh tranh.
- Người tích hợp sau tái dùng `assets/vfx-source/mandon/process-codex-art.py`, `tools/vfx/pack-flipbooks.ps1`, `visual-kit-*`, `visual-<hero>*`, adapter/battlefield và log hiện có; sửa nguồn chỉ trong tác vụ tích hợp được yêu cầu riêng.

## Implementation Steps

1. Đếm roster12+13, loại h01G; tổng143 job gồm54 riêng cấp5,74 riêng cấp6 và15 dùng chung tính một lần (shield2 + status/buff13). Đối chiếu prompt/raw/metadata; không tính các job riêng đã thay thế hoặc ảnh chờ rà style là đạt. Pilot là dòng đã có, iteration không tính là job đạt. Dùng checksum/source route để phát hiện ảnh chép nhầm.
2. Xem lại từng ảnh/từng frame: nhận diện, vật chất, khối/cel/viền/rim theo Cộng Công, không generic recolor; motion liên tục, hold/loop/exit đúng; camera/scale/anchor thống nhất, lề không tràn, alpha sạch.
3. Xem ảnh trên nền sáng/tối và ghép tham khảo ở cỡ hiển thị dự kiến với sprite có sẵn. Kiểm vùng che nhân vật, đầu vũ khí/núi/vật cao, nhánh front/back và khả năng giảm chuyển động; không coi ảnh ghép là nghiệm thu engine.
4. Lập handoff từng job: actual size/grid + rect, normalized anchor, type, frame ranges/loop, target cell đề xuất, palette, blend mong muốn, world anchor/origin/recipient, trigger/status/expiry, reference và path phiên nguồn, accepted/rejected iteration và blocker.
5. Ghi hạng mục tích hợp cần thiết: ảnh → mesh/shader/billboard/decal/UV đúng loại, manifest layout thật, texture màu giữ style, depth phía trước/sau actor, lazy load/cap/pool/clear, reduced motion và log. Không tự sửa engine/gameplay lúc bàn giao.
6. Nêu rõ hạn chế chứng cứ: Hằng Nga shield không timer; khống chế chỉ trên snapshot thành công; event target không luôn gồm người buff; aura/nội tại độc lập không thuộc lô. Không áp các hằng số lifetime trong prompt làm kết quả gameplay.
7. Người tích hợp sau sửa/viết test hợp đồng khi phù hợp (routing, timeline/loop/expiry, layout/anchor, cleanup). Theo `AGENTS.md`, agent đọc lại mã/test nhưng người dùng thực thi lệnh bên dưới nếu chưa có yêu cầu rõ cho agent chạy.

## Todo

- [ ] Rà tất cả job và liên kết, không báo đủ bộ khi còn `BLOCKED_ART`.
- [ ] Metadata đủ cắt/đóng atlas mà không đoán camera/pivot/grid.
- [ ] Tách việc đã có raw khỏi xử lý và tích hợp tương lai.
- [ ] Bàn giao lỗi cụ thể, nguồn/ảnh bị loại và cách tiếp tục từng job.

## Success Criteria

- [ ] Mỗi dòng inventory có raw đạt + metadata/QA; toàn bộ25 tướng đúng scope.
- [ ] Người nhận biết chính xác tài nguyên nào đã sẵn sàng và phần nào chưa làm/chưa chạy.
- [ ] Handoff đủ mô tả event → art/layer → status/cleanup, nhưng không tự triển khai thay đổi source vượt yêu cầu.

## Kiểm tra runtime sau tích hợp — người dùng thực thi

Các lệnh này chưa chạy trong tác vụ kế hoạch hoặc tạo raw:

```powershell
npm run typecheck
npm test
npm run build
```

Sau lần tích hợp: dừng server cũ → chạy lại `start-game.cmd` để build bản mới → refresh `Ctrl+F5`. Chỉ chạy launcher khi người dùng chủ động kiểm tra. Xem từng tuyệt kỹ và status thật, cả nhánh hồi sinh/triệu hồi/nhiều chủ/nhiều khu, nền sáng/tối, trận đông, góc camera hỗ trợ và reduced motion; xem log `visual.<hero>.*`/`visual.kit.*`, pool cap/cleanup và FPS. Replay debug chỉ hỗ trợ quan sát, không thay chứng cứ snapshot thật. Không gọi bản đang mở đã được cập nhật chỉ vì đã chép source art.

## Risk Assessment

Ảnh đạt cổng art vẫn có thể cần geometry để ra bát/vỏ/núi có chiều cao đúng; depth/sampling/scale và tuổi thọ chỉ kiểm được sau tích hợp. Ghi giới hạn này rõ, giữ raw để chỉnh mà không mất nguồn. Không bỏ job lỗi hoặc dựng placeholder code để báo hoàn tất.

## Câu hỏi còn mở

Không còn câu hỏi phong cách. Nếu còn `BLOCKED_ART` hoặc thiếu chứng cứ nguồn status, liệt kê đúng tướng/job, ảnh lỗi, hai lượt đã thử và quyết định cần người dùng cung cấp; không hỏi lại những việc source đã trả lời.

