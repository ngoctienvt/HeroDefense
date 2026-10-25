# Chung Quỳ h00N — nguồn VFX tuyệt kỹ

Status: DONE_WITH_CONCERNS — source only, chưa thực thi game/test/typecheck/build.

## Bằng chứng và thay đổi

- Server: `tier3-combat.ts` h00N R5,2 tại aim,280% Công, thử silence3s, ground `tier-fire`4s/90% Công/s. `combat.ts` dispatch h00N trực tiếp; ground tiếp tục theo `ground.zone` khi caster record tồn tại, không cần caster sống hoặc còn cùng khu.
- Bản cũ dùng motif seal/fire chung và generic ground. Bản mới dùng5 hình chính riêng (talisman, slam, sigil, flame, hit), palette/spray chu sa đỏ đen/tím/vàng,4 pha theo cast/ability/snapshot, không đổi gameplay hoặc nội tại quỷ tốt/đánh thường.
- Cast core nhận uTime, tăng alpha/scale; telegraph R khóa tại aim. Bay bùa0,32s, strip đầu phải, UV/chiều dài lộ cùng tỉ lệ/chiều cao tự nhiên. Sáu pose treo ấn trước arrival, frame6 contact + hit/spray/dấu đất tại targets thật, slam tan0,8s.
- Ground world có radius/remaining thật; late join hold, không phát lại tụ/impact. Cuối0,5s lửa co, missing marker bỏ sigil ngay rồi rút0,22s. Caster chết/đổi khu vẫn đúng server; thiếu caster record/nguồn khác dùng generic hiện có.
- Cap cast8/strike12/ground16/hit64/painted176; spray220/queue130. Reduced giữ size/pose tĩnh và alpha fade, không bay/hạt. Pool reset quaternion, clear toàn lớp/queue/replay. Registry, replay, snapshot, generic suppression đã nối h00N, giữ h00J/K/L/M/Q và support/pulse helper.

## Art/provenance

Đã xem raw và contact sheet sáng/tối từng pha.5 ảnh RGBA nguồn `tier34-codex-art/raw/` giữ nguyên hash/prompt/route. `process-art.py` ghi `active-inventory.json` + layout; threshold16, resize premultiplied, common canvas chung mỗi sheet; không fit bbox từng frame. Slam source giữ `BLOCKED_ART`: mép hàng nominal314/627/940 tràn, cắt tại gap345/655/945 giữ đủ hình; anchor hàng318/641/924/1190. Contact sau xử lý không thấy mất silhouette. Sigil đo cả alpha>0/góc texel, radialEdge0,458341; talisman head bên phải đo bằng mắt.

Atlas WebP quality90/depthWritefalse đã pack bằng tools/vfx/pack-flipbooks.ps1:

| Atlas | Pixel | Bytes |
|---|---|---|
| talisman |1024×1024|74936|
| slam |1536×1536|437614|
| sigil |768×768|174896|
| flame |1536×768|165518|
| hit |1536×768|154330|

Tổng1.007.294bytes. Không có nguồn/giấy phép bên ngoài mới; art Codex nguồn dự án. Hạt spray dùng texture hiện có, chỉ phụ trợ.

## Rà nguồn và giới hạn

Đã đọc lại event→registry→timeline→targets→snapshot→cleanup, thêm regression timeline/hướng/atlas/pass/native ground latejoin/moved caster/reduced size/legacy route. Đã sửa review finding: bỏ gate caster.zone/hp cho vùng còn hiệu lực và cố định scale reduced. Chưa chạy regression/typecheck/build/game/browser/server. Contact ảnh riêng không chứng minh chất lượng/FPS trong trận.

Người dùng chạy `npm test -- apps/client/test/visual-chung-quy.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → Ctrl+F5. Debug `__vfxReplay('h00N')` tại `?debug=1` chỉ sinh targets/ground giả trong client. Cần duyệt hướng bay/aim xa, realtargets, latejoin, caster đổi khu/chết, sáng/tối/đông quái, reduced,4 người và cleanup đổi trận.

Unresolved: chưa có nghiệm thu hình chiến trường hoặc FPS; source slam vẫn có cờ lịch sử BLOCKED_ART để truy nguyên.
