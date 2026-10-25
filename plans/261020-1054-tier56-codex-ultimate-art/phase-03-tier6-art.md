---
title: "Phase 3: tier6-art"
status: in_progress
---

# Phase 3: tier6-art — đủ 13 tướng bậc 6

## Overview

Hoàn tất mọi job ở [asset-tier6.md](asset-tier6.md), tái dùng pilot Chúc Dung/Như Lai đã đạt. Bao phủ cả hình chính quy mô lớn và trạng thái/đơn vị do tuyệt kỹ tạo, không đưa nội tại vào lô.

## Requirements

- Phụ thuộc pha1; có thể chuẩn bị riêng sau khi contract chung đạt nhưng công cụ tạo ảnh vẫn chạy từng job tuần tự với pha2.
- Roster13: Bàn Cổ h01B, Nữ Oa h01C, Phục Hy h01D, Thần Nông h01E, Hiên Viên h01F, Chúc Dung h01H, Đế Tuấn h01I, Như Lai h01J, Chúc Long h01K, Nguyên Thủy h014 (tier6), Tướng Thần h03Z, Trương Đạo Lăng h040, Phượng Hoàng h041.
- Loại tuyệt đối Cộng Công h01G. Phượng Hoàng chỉ làm tuyệt kỹ, mưa/vùng lửa và trạng thái thuộc tuyệt kỹ; trứng/Niết Bàn do chí tử là nội tại, không có ngoại lệ được người dùng cho phép.

## Architecture

Các tác dụng chung dùng [13 status/buff](asset-shared-status.md); chỉ job hình chính/biến hình và cơ chế đặc thù còn trong inventory từng tướng. Không tạo lại dấu riêng theo tướng.

Ảnh giữ phong cách stylized theo Cộng Công và mỗi tướng có motif/vật chất riêng. Đĩa va chạm, đường nứt, toàn khu vực và trạng thái đồng minh là các hợp đồng khác nhau; không dùng một vụ nổ tròn lớn đại diện mọi nhánh event. Mesh/shader nếu cần để có thể tích/depth là ghi chú cho lần tích hợp sau, không thay ảnh Codex trong pha này.

## Related Code Files

- Đọc: `asset-tier6.md`, `art-contract.md`, source combat được inventory dẫn tới; ảnh Phượng Hoàng hiện có khi dùng làm nhận diện.
- Khi thực hiện sau tạo/cập nhật chỉ source art `prompts/`, `raw/`, `iterations/` và metadata theo inventory.
- Chưa thay module hero, adapter, trạng thái server hoặc manifest engine trong tác vụ tạo raw.

## Implementation Steps

1. Chỉ lọc pilot đã đạt **style hiện tại**; ảnh trước đang chờ rà lại không được tự bỏ qua. Kiểm ID/tier override và danh sách job, ghi path/role của reference. Nữ Oa/Như Lai/Tướng Thần dùng shield chung đã tạo một lần, không tạo vỏ riêng. Không tạo thêm concept/master ngoài inventory.
2. Theo thứ tự đã ghi trong inventory sau pilot Chúc Dung/Như Lai; một ảnh/job, không chạy tool song song. Rà ba nguồn cũ trước các job phụ thuộc chúng; không tạo lại nếu nguồn đã đạt hợp đồng mới.
3. Bàn Cổ tách vụ nổ điểm đích r8,5, khe14×4,5 từ caster và chấn động khu0; không gom thành một crater. Chúc Long đông/hạ là hai lần quét toàn khu gốc, cách1,5s, không giới hạn r12 từ prose.
4. Phượng Hoàng giữ thân chim/vũ điệu lửa đúng source được chọn; sweep toàn khu khác carpet r9. Mưa4s đầu khác vùng6s; không thêm trứng/tái sinh thụ động hoặc dùng vòng lửa generic thay chim.
5. Nguyên Thủy ba luồng, Đế Tuấn10 Kim Ô, Trương Đạo Lăng7 kiếm là mô-típ hình. Hiên Viên15 mưa kiếm và Trương21 tia là event thật: Hiên Viên mỗi nhát có splash r1,5; Trương mỗi tia một mục tiêu, không tô cả đĩa liên tục.
6. Nữ Oa có đối tượng hồi/revive qua chủ/khu; Như Lai và Nguyên Thủy buff đồng minh cùng chủ qua khu; Tướng Thần shield đồng minh cùng khu gồm nhiều chủ. Không ép mọi buff vào vòng caster. Ghi đúng event/snapshot nhận và nguồn status cho xử lý sau.
7. Phục Hy dây nối theo nhóm sống trong vùng, Thần Nông ba cây/Tướng Thần bốn huyết tướng là unit server. Huyết tướng dùng atlas h03Z; cổ thụ hiện là primitive nên cần prop O tĩnh đã ghi trong inventory, neo từng unit thật cùng lớp rễ riêng. Không vẽ ba cây/bốn cương thi cố định trong một decal để giả gameplay unit.
8. QA từng raw theo contract, ưu tiên núi/đại kiếm/vỏ cao bị cắt đầu, front/back bao actor và vòng duy trì. Sửa tối đa hai lượt, ghi `BLOCKED_ART` khi vẫn sai; giữ mọi iteration.

## Todo

- [ ] Mọi job bậc6 có nguồn đúng và QA riêng; pilot không bị tạo trùng.
- [ ] Không nhầm toàn khu với vùng bán kính, số mô-típ với số lần hit hoặc status với một lần flash.
- [ ] Không có job h01G, trứng/tái sinh h041, aura nội tại Đế Tuấn hay nổ chết Chúc Dung.
- [ ] Các lớp cần geometry/depth sau này được đánh dấu trong handoff.

## Success Criteria

- [ ] Đủ job của13 tướng đạt `raw-ready`; blocker còn lại làm pha chưa hoàn tất ảnh.
- [ ] Hình chính riêng, khối rõ, chi tiết tiết chế, motion thật, alpha/anchor/grid đúng và đọc được ở cỡ dự kiến.
- [ ] Mỗi loop/status có hold/exit đúng nguồn server; không có lifetime hoặc phạm vi do người tạo ảnh tự đặt.

## Risk Assessment

Chiêu cấp thần dễ thành mảng sáng trắng, nhiều icon lặp hoặc bị cắt vì cố phóng vật thể. Giữ hierarchy tương phản và canvas chung, không xóa chi tiết tùy tiện hoặc crop bộ phận để qua QA. Độ bao phủ map cần phân lớp/kịch bản runtime sau này; không hứa ảnh raw giải quyết depth hay FPS.

