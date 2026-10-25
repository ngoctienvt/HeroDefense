---
title: "Phase 1: Start"
status: in_progress
---

# Phase 1: Start — khóa contract và pilot

## Overview

Khóa danh sách 25 tướng, chứng cứ cơ chế, contract ảnh và prompt có thể chạy bằng công cụ tạo ảnh Codex. Tạo pilot từ các job Chúc Dung, Hằng Nga, Như Lai đã nằm trong inventory để thử lửa/vùng đất, khiên có trạng thái và vật thể núi cao trước khi làm cả lô.

## Requirements

- Phụ thuộc: không có; người dùng đã yêu cầu thực hiện. Generator và pilot art đã bắt đầu; xem báo cáo tiến độ phase 1.
- Phong cách đã chốt là stylized như Cộng Công; [art-contract.md](art-contract.md) là nơi giữ quyết định chung.
- Đủ [inventory bậc 5](asset-tier5.md), [inventory bậc 6](asset-tier6.md); loại h01G, đòn thường/nội tại độc lập. Không tạo lại bộ 19 ảnh Huyền trước.
- Nguồn gameplay: `content/catalog.ts`, module combat tương ứng trong `packages/game-core/src/`; [báo cáo chứng cứ](../reports/scout-261020-1054-tier56-combat-evidence.md) chỉ là chỉ mục tìm source, không thay mã hiện tại.

## Architecture

Inventory → job đã resolve đủ field → prompt và reference đúng vai trò → một lần gọi công cụ/ảnh → raw bất biến + metadata nguồn → kiểm hình/layout/anchor → nhận hoặc sửa. Không ghép nhiều job vào một lượt gọi, không chạy nhiều phiên tạo ảnh song song.

## Related Code Files

- Đọc: `README.md`, `AGENTS.md`, `docs/vfx-kit.md`, `docs/vfx-assets.md`; `assets/vfx-source/huyen-codex-art/make-prompts.py`, `assets/vfx-source/mandon/process-codex-art.py`, `tools/vfx/pack-flipbooks.ps1`.
- Khi thực hiện sau mới tạo: `assets/vfx-source/tier56-codex-art/make-prompts.py` và job manifest; `prompts/`, `raw/`, `iterations/` theo thư mục inventory. Script mới chứa job bậc 5–6, không sửa `HEROES` của 19 job Huyền.
- Chưa sửa client/server, atlas runtime, manifest engine hoặc bộ ảnh cũ trong tác vụ lập kế hoạch.

## Implementation Steps

1. Đối chiếu đủ roster và branch event với source hiện tại. Ghi `skill-*`, event phụ thực do ultimate, nguồn snapshot, vị trí, bán kính, số mục tiêu và tuổi thọ vào metadata; ghi rõ những số là mô-típ trang trí.
2. Chọn và xem frame nguồn Cộng Công theo art-contract, ghi path/role STYLE_ONLY vào manifest; rà lại pilot cũ theo style mới trước khi nhận đạt.
3. Sinh prompt theo template contract, không còn placeholder; kiểm S16/S8/L8/P16/D/T/M/O đúng view/loop. Bỏ quy tắc cột rỗng hoặc khung cuối rỗng của helper cũ khi không hợp type.
4. Pilot **Chúc Dung**: lấy job hình phun trào + dung nham/status trong inventory. Giữ r7,5 tại điểm chốt, vùng5s; không tự tạo nổ chết nội tại, không hiểu lửa duy trì là liên tục cấp burn mới.
5. Pilot **shield dùng chung + Hằng Nga**: tạo hai layer trong [asset-shared-shield.md](asset-shared-shield.md) một lần, dùng thử trên Hằng Nga; không tạo vỏ trăng riêng. Khiên plain `shield` không có đồng hồ duration; freeze vẫn là asset riêng, chỉ trên mục tiêu được xác nhận.
6. Pilot **Như Lai**: lấy job núi/chưởng riêng và tái dùng nguyên shield chung. NúiR9,5 giữ5s; khiên6s cho đồng minh cùng chủ trên các khu vực. Rà front/back của núi và shield độc lập, không phát sinh một skin khiên Phật quang.
7. Mỗi job giữ raw/route/source/actual dimensions và QA. Sửa tối đa hai lượt sau bản đầu; nếu sheet không giữ chuyển động, tách pose có kế hoạch, cập nhật job count. Không thay bằng shader/Blender/hình code để qua pilot.
8. Ghi kết quả pilot chung: style, alpha, camera, lề, anchor, đủ keyframes và cỡ hiển thị dự kiến. Chỉ áp dụng điều chỉnh dùng chung có bằng chứng; giữ hình riêng của từng tướng.

## Todo

- [ ] Đối chiếu đủ nguồn combat/event/snapshot của 25 tướng; nguồn của ba tướng pilot đã được rà.
- [x] Prompt generator + manifest143 job đồng bộ style Cộng Công, shield và13 trạng thái/buff chung; giữ prompt/metadata cũ trong lịch sử.
- [x] Pilot theo hướng trước đã có kết quả và blocker; giữ nguyên lịch sử này.
- [ ] Duyệt lại các ảnh hiện có theo style Cộng Công; tạo/duyệt hai layer shield và13 trạng thái/buff chung. `style-review-required` chưa phải `raw-ready` theo chuẩn mới.
- [x] Ghi nhận layout/alpha/loop/front-back đã xem trên nền sáng/tối; các blocker phụ thuộc được tách rõ.

## Success Criteria

- [ ] Không còn câu hỏi chọn style, placeholder prompt hay quy tắc loop mâu thuẫn.
- [ ] Có ảnh pilot đúng những dòng inventory, không tính lặp khi sang pha2/3.
- [ ] Raw alpha bất biến, sheet có chuyển động thật, hình còn đọc được trên nền sáng/tối ở cỡ dự kiến.
- [ ] Blocker được ghi theo job; chỉ những job phụ thuộc contract còn lỗi phải chờ, các phần độc lập vẫn tiếp tục được.

## Risk Assessment

Raw có grid/cỡ sai, sheet lặp pose, khiên che người hoặc núi giống decal là tín hiệu pilot chưa đạt. Sửa đúng ảnh/pose, tách front/back nếu cần; sau giới hạn hai lượt ghi blocker. Không coi contact sheet đẹp là bằng chứng runtime đúng hoặc FPS đạt.
