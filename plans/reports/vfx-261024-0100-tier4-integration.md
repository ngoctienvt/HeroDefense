# Bàn giao nguồn VFX tuyệt kỹ bậc4

Status: DONE_WITH_CONCERNS — nguồn/asset/tích hợp13/13 tướng; chưa nghiệm thu hình ảnh toàn lô. Chỉ đạo mới nhất của người dùng: chỉ làm kỹ năng, người dùng tự kiểm. Không chạy thêm test/typecheck/build/game/browser. Các kết quả ba tướng đầu trước chỉ đạo này chỉ là lịch sử.

## Phạm vi đã làm

Tôn Ngộ Không → Đường Tăng → Lôi Chấn Tử → Dương Tiễn → Na Tra → Lý Tịnh → Đát Kỷ → Ngũ Đạo Tướng Quân → Ứng Long → Xích Tùng Tử → Tịnh Đàn Sứ Giả → Kim Thân La Hán → Bát Bộ Thiên Long, hoàn tất nguồn và tích hợp từng tướng rồi mới chuyển tiếp. Nhịp/lớp/chuyển động/thời lượng, dung lượng từng bộ và báo cáo nguồn ở [tier4-vfx.md](../../docs/tier4-vfx.md).

62 WebP16.009.976 byte. Mỗi bộ giữ script, raw/prompt/output hashes, inventory, measured layout và contact sáng/tối. Không sinh lại master, không thêm nguồn bên ngoài. Các raw có cờ haze/cross-cell/opaque backdrop giữ cờ/caveat dù đã xử lý alpha/contour hoặc loại khung không phù hợp.

## Event → VFX → snapshot → cleanup đã đọc rà

- `visual-tier4-heroes.ts`: đủ13 ID; chỉ pulse h00T/h00Z là modern trait pulse, đòn thường giữ routing cũ. `visual-effects.ts` khởi tạo/đăng ký đủ module vào HeroVfxRegistry, nối replay, marker và callback clone sweep; registry sở hữu tick/clear một lần.
- `battlefield.ts`: cast có origin hiện tại, resolve giữ targets thực và tách unit/enemy. Na Tra giữ8 record có thể trùng ID; source chết/ngoài khu bị withheld, không dùng điểm cast cũ. Pulse không bắt caster đánh lại.
- `battlefield-tier4-snapshot.ts`: clone đúng unit/summonDuration; ground đúng caster/radius/remaining; barrage đúng timer và số pulse còn lại; burn/link/buff chỉ nguồn thật. Links nối nhóm sống/current zone, không dựng unit. Immortal nhận hai đồng hồ4s/2s riêng, không đoán từ HP hoặc receipt.
- `visual-tier4-recipients.ts`: resourceTarget đúng ID unit server chọn; displacements trước/sau lấy từ event thật, lọc actual recipient/khu/actor. Cú kéo dùng endpoint metadata thay tọa độ actor nội suy.
- Server chỉ bổ sung metadata trình bày: sourceSkillId, casterId, supportTargets, areaCenter/radius, displacements và resourceTarget. Đọc diff combat/pulse: các giá trị sát thương, số lượng, lựa chọn mục tiêu, thời gian và luật HP không đổi.
- Sửa các lỗi dựng thấy khi đọc nguồn: shader tụ lực có uTime; wheel action foreground riêng; không dùng preset spray không tồn tại; không chạy khung crystal của pull; tách nativeaspect helix với region13×5,5; gourd contour phồng khép tâm; reduced bỏ ribbon bay; immortal trait không phát lại attack pose.
- Pool/cap/clear/reduced/log nằm trong module; marker gọi trước tick. `clear()` bỏ delayed preview, cast/watchdog, lanes/contact/status/pairs và trả pool. Replay unregister khi dispose Battlefield.

## Regression source

Đã bổ sung/cập nhật nguồn test cho exact recipients, true displacement endpoints, nguồn soulLink/haste, server resourceTarget, snapshot link duration, barrage center/time, dualclock immortal và trait không đổi pose. Chưa thực thi các test mới. Các nguồn chính: `apps/client/test/visual-tier4-routing.test.ts`, `battlefield-tier4-snapshot.test.ts` và `packages/game-core/test/tier3-tier4-combat.test.ts`; từng tướng có nguồn test riêng khi đã ghi trong report.

## Người dùng tự kiểm

Chạy lại `start-game.cmd` để build/chạy bản mới, refresh `Ctrl+F5`; sửa nguồn không đồng nghĩa phiên đang mở đã nhận code server mới. Debug `?debug=1`, chọn từng tướng hoặc `__vfxReplay('<heroId>')`, cần tướng sống trong khu. Preview chỉ trình bày, không gửi lệnh chiến đấu.

Kiểm bốn pha, hướng gần/xa/chéo, người nhận thật, caster mất/chết, snapshot giữa chừng, vùng đúng bán kính/làn, nhân vật/HP, reduced, đông quái/nhiều người và đổi khu. Với trạng thái: clone chết/hết6s, link mất thành viên, barrage đúng pulse, buff mạnh hơn được giữ, ward thay nguồn, vow hết4s so với active2s. Build/typecheck/test/FPS/visual acceptance chưa được xác nhận cho bản cuối.

Concerns: người dùng cần duyệt phần alpha/contour sửa từ raw có cờ lịch sử và hình ảnh trong game; không khẳng định đẹp/đúng/FPS từ việc có đủ source hoặc contact sheets.
