# Tuyệt kỹ 7 tướng cấp 6 — bàn giao nguồn

Status: IMPLEMENTED_PENDING_USER_VALIDATION

Đã nâng nguồn tuyệt kỹ Nữ Oa, Phục Hy, Thần Nông, Chúc Long, Tướng Thần, Đế Tuấn và Nguyên Thủy theo bảng nhịp đã duyệt trong `../261021-1809-tier6-remaining-ultimates/plan.md`. Không đổi gameplay/server/contracts mạng; giữ đòn thường/nội tại ngoài phạm vi.

## Đã thực hiện

- 40 candidate Codex → 40 WebP RGBA, 11.428.352 byte; giữ cả 24 ảnh style-review-required theo chỉ định. Manifest, script tái lập, SHA/provenance và contact sáng/tối trong `assets/vfx-source/tier6-remaining/`. Không sửa nhãn gốc thành đã duyệt.
- Art riêng từng tướng, shader tụ lực uTime/alpha/scale, ba lớp impact; radius/remaining/state truyền xuyên battlefield → adapter/effects → module. Ba vùng duy trì có biên shader đúng radius, không co theo hình rút vào lúc kết thúc.
- Ground được hiệu chỉnh bằng footprint alpha encoded của mọi frame, không giả định sheet vuông/không padding. Actor luôn vẽ trên art nền; giữ anchor/aspect thật.
- Cổ thụ Thần Nông thay primitive bằng ảnh prop actor, giữ HP/block/death. Huyết tướng có arrival lần đầu snapshot và hit riêng.
- Đế Tuấn dùng main target riêng; Chúc Long đông/hạ có target list độc lập, time-gift là accent tức thì; Nguyên Thủy toàn zone không vẽ R11 giả. Nữ Oa không phát khiên cho ward giảm sát thương đơn thuần.
- Replay debug cả 7 ID, kind ultimate/lobby/hold; pool/cap/clear và log. Không tạo process nền.
- Thêm regression nguồn cho snapshot recipients/zone/lifetime, normal-vs-ultimate link/burn, caster origin/main target, charge giữ pose chờ resolve, pha kết thúc, cây late snapshot. Chưa thực thi.

## Rà tĩnh và sửa findings

- Đã đọc lại mã event → routing → timeline → snapshot → cleanup; review độc lập trong `default-261021-1816-tier6-static-integration-review.md`.
- Sửa nhầm burn đòn thường Chúc Long thành ult: gate summer event + caster + DPS snapshot; nguồn không đủ sau reconnect dùng burn chung.
- Bỏ legacy torus ở summon Huyết tướng, arrival theo first-seen ID; không phát hai lần.
- Giữ impact ở cached target vừa chết, không lọc hp>0 ở resolve; marker duy trì vẫn chỉ actor còn sống.
- Preload ảnh theo tướng có trên sân, gồm cả ba sage qua prepareHero. Không tải 40 ảnh ngay từ constructor.
- Dùng shared shield/heal/revive, bỏ aura cloud buff primitive của Nguyên Thủy; giữ aura nội tại ngoài phạm vi.
- `git diff --check` trên phần tracked liên quan không báo lỗi khoảng trắng. Đối chiếu manifest: không thiếu URL asset, không thiếu hệ số radius. Đã xem contact sheet nguồn/processed sáng–tối, chưa xem renderer.

## Giới hạn chưa nghiệm thu

Một số raw đã cắt/tràn ô, số Kim Ô khó đọc đủ 10, phướng giống dải khí, vài lõi sáng mạnh và huyết hải đặc tâm. Giữ theo yêu cầu dùng candidate; xử lý gutter/padding không khôi phục nét đã mất. Không tuyên bố đẹp/chạy đúng/FPS đạt.

Frozen snapshot không có caster; reconnect không suy nguồn Chúc Long, dùng freeze chung. Burn/ward/mistShield bị nguồn khác ghi đè không được tự gán nguồn chỉ từ màu/radius. Lifetime theo remaining server, không dựng thêm sát thương/kết quả ở client. Một số trạng thái nhiều nguồn không thể phân biệt hoàn toàn khi không đổi contract.

Replay là dữ liệu trình bày giả chỉ client; không kiểm chứng gameplay, HP/block hay summon thực. Khi actor chết đã mất cả cache lẫn snapshot, không bịa vị trí để vẽ hit.

## Người dùng kiểm tra

Chưa chạy `npm run typecheck`, `npm test`, `npm run build`, server/game/browser theo AGENTS.md. Người dùng chạy các kiểm tra trên; dừng server cũ → `start-game.cmd` → Ctrl+F5 để xem bản mới.

Với `?debug=1`, chờ asset.ready rồi dùng `__vfxReplay('h01C')`; lặp h01D/h01E/h01K/h03Z/h01I/h014 và kind hold/lobby. So với Cộng Công trên nền sáng/tối, reduced motion, trận đông, góc camera khác; kiểm tra cây/Huyết tướng trong gameplay thật, chuyển zone/trận, target chết ngay lúc hit, reconnect giữa dư âm. Hướng dẫn đầy đủ ở `docs/vfx-assets.md` mục bảy tuyệt kỹ cấp6.

Không còn câu hỏi phạm vi. Còn người dùng chạy kiểm tra và nghiệm thu hình ảnh/FPS.
