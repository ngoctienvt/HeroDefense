# Long Vương h00Q — tuyệt kỹ riêng

## Phạm vi

Thay VFX chung bằng bộ sáu tranh riêng có sẵn; lấy chuyển động, độ rõ hình và phân lớp của Phượng Hoàng hiện tại làm mốc. Không sửa gameplay, Phượng Hoàng hoặc đòn thường. Chưa chạy game/build/test theo AGENTS.md.

## Chứng cứ và nhịp

`combat.ts` dispatch `resolveTier3Ability`; `tier3-combat.ts` phát `ability tier3-tier4-h00Q` với direction và targets; cast dùng ability id từ catalog. Sát thương xảy ra ngay khi ability tới, chuyển động sóng chỉ trình bày. Chỉ nhánh h00Q tạo `tier-water`.

| Pha | Event và thời gian | Lớp / chuyển động |
|---|---|---|
| Tụ lực | cast, đúng event.windup (hiện 0,25s) | Định Hải Châu hút nước, nâng và lớn dần; shader làn 10 × 6 nhận uTime mỗi frame, tăng alpha theo lực tụ |
| Phóng | ability, 0–0,75s trình bày | Tường sóng 3D profile đứng→đổ dùng kitWall như Cộng Công, chạy từ caster theo direction, dừng trong làn 10 × 6; tranh bọt vỡ bổ sung từ 0,38s; vệt nước trải dọc làn; reduced motion giữ một hình tĩnh |
| Va chạm | ability xác nhận; trễ trình bày 0–0,58s tới lúc đỉnh sóng đi qua đích; hit art 0,5s | Mỗi target thật có bọt tạt + giọt nước rơi + dấu nước cùng nhịp. Reduced motion/thiếu hướng phát ngay; sát thương server không đổi, không tự tạo đóng băng |
| Dư âm | tier-water snapshot.remaining, R snapshot.radius (server R5/4s tại aim) | Vũng nước + bọt cuộn lặp + shader mặt nước; cuối 0,45s dòng bọt co xoáy hút về tâm, mực nước rút. Khi snapshot biến mất thu hồi, không tự giữ 4s mới |

## Triển khai

- [x] Xử lý sáu ảnh, xem contact sáng/tối, giữ nguồn và common anchors.
- [x] Module kit riêng, timeline thuần, cap/pool/clear, reduced motion.
- [x] Registry, snapshot routing và replay h00Q có cleanup.
- [x] Viết test timeline; đọc lại event → runtime → cleanup; tài liệu bàn giao.

## Rà mã và bàn giao

Đã đối chiếu thêm Cộng Công (profile/wall/shader clock/depth), Hiên Viên và Như Lai (anchor/snapshot/cleanup) theo người dùng nhắc. Review phát hiện nhánh `isTierSkill` không nhận tiền tố tier3-tier4 nên targets thật rơi vào fallback chain và bị bỏ. Đã đưa riêng ability h00Q vào nhánh area truyền `affected`→tọa độ hits; thêm regression nguồn và fixture gọi `Battlefield.handleEvent`, replay không đủ để chứng minh đường này. Thiếu origin không tự dựng sóng từ aim. Đường biên vùng luôn giữ R thật khi nước bên trong rút.

### Áp dụng skill Claude cập nhật (22-10-2026)

Đã đọc lại SKILL.md và `references/epic-tier-playbook.md`. Giữ ảnh gốc/atlas; chỉnh cách dựng: thân sóng foreground1/ALWAYS để đọc trên đám quái, tướng/HP vẫn pass2/3; palette và spray `longvuong` riêng; thời gian trúng lấy nghịch đảo chuyển động đỉnh sóng (0–0,58s), ba lớp phát cùng lúc; snapshot mất sớm thu hồi 0,2s và bỏ cue viền ngay. Dùng `.clear()` vẫn thu hồi ngay khi đổi khu/trận. Giữ cast cuối chờ ability tới windup+0,3s, không tự tạo impact. Không đổi gameplay hoặc global skill. Đã thêm test timeline/draw-pass/routing; chưa chạy.

Đã đóng asset và đọc/rà nguồn. Chưa chạy test/typecheck/build/game hoặc đo FPS; chưa kết luận đẹp trong trận. Người dùng chạy `npm test -- apps/client/test/visual-long-vuong.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`, thử `__vfxReplay('h00Q','ultimate')` khi có Long Vương sống trong khu đang xem, rồi tuyệt kỹ thật để đối chiếu target/damage/slow/freeze có điều kiện. Xem thêm đông quái, hướng chéo, reduced motion, đổi khu và Cộng Công. Baseline art nguồn còn dao động nhẹ, churn loop cần xem chuyển động thực.

## Kit cần bổ sung

Đã thêm `createLoftedWaveLayer` và mode tường cho `kitWall`: tái dùng profile/shading Cộng Công, giữ mode vòng mặc định. Không dựng bản shader riêng trùng mã cho tướng.
