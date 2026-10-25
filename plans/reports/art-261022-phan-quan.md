# Phán Quan h00O — nguồn tuyệt kỹ và provenance soulLink

Status: DONE_WITH_CONCERNS — SOURCE ONLY; chưa test/typecheck/build/game.

## Thực hiện

- Ledger mở đúng windup server0,25s, giữ cuối tới+0,3s rồi watchdog thu. Size5,8/lift5,2 theo screen-up để sổ không chìm dưới thân tướng; foreground dưới heroes/HP. Core shader uTime, cảnh báo halfdisk trước casterR4,8.
- Ability h00O nhát mực quét0,38s/thu0,4s, direction thật; hit0,55s + spray/dấu mực0,8s trên targets thật. Source arc thực mở bên phải/bulge−X, khác cách hiểu brief; mask bỏ nửa sau theo tâm gốc, source−X được xoay theo direction. UV và plane crop cùng tỉ lệ, radius không overshoot.
- Soul links snapshot: một rope plane và glow/cặp ổn định, cập nhật endpoints theo actor hoặc snapshot thật; cùm nhỏ chân. Hold indices4..8, bỏ index9 mở lại không đúng loop.0,4s cuối rope co/cùm12..15 rơi/rã, thiếu marker thu0,25s. Reduced giữ size/pose/endpoints và alpha, bỏ chuyển động phụ/hạt.
- Optional `Enemy.soulLink.casterId` chỉ assignment h00O ghi nguồn; không đổi gameplay, damage sharing hoặc lifetime. Các assignment Mạnh Bà/Phục Hy/Ngũ Đạo giữ không casterId và replace toàn object. Snapshot owner không suy sharePercent/event history/distance. Caster đã chết/đổi khu vẫn theo status thật. Generic link skip đúng ownership metadata; sources khác giữ hiện trạng.
- Đã đọc `game-room.ts`: broadcast snapshot và reconnect `sendIdentity` gửi nguyên `this.game`, giữ nested metadata. Optional field tương thích bản đọc cũ, không thay version/contracts lệnh.
- Registry/replay/modernlist/markTier3/markTier3Link nối h00O, giữ các tướng trước và helper support/pulse. Cap cast8/sweep10/hit64/pair32/shackle48/planes192, spray220/maxQueue130. Clear trả mesh/quaternion/layer/queue/replay. Debug visual.phan-quan.*.

## Art và nguồn

5 ảnh RGBA Codex sẵn có từ `tier34-codex-art/raw/`; hash/prompt/route/status/cảnh báo gốc ở `active-inventory.json`. Không thay hình bằng ảnh phép chung, không tạo art mới. `process-art.py` threshold16 + premultiplied resize, commoncanvas/anchor từng sheet, không fit bbox perframe. Ledger450/415,825; hit500/478,835; shackle420,740,995/351,686,983,1247. BLOCKED_ART ledger/hit/shackle giữ lịch sử margin; contact sáng/tối sau mở canvas đã xem đủ các pose, không thấy bộ phận bị cắt. Shackle index9 không phù hợp giữ nên loại khỏi loop.

Arc source gần270°, chủ đích halfmask−X theo cơ chế server, raw nguyên; tâm gốc giữ, sau resize xóa alpha phía sau (rearAlphaPixels0). Radius đo tất cả alpha>0 và góc texel:0,362513; chain khóa phải đo bằng mắt. Art contacts là QA asset, không phải nghiệm thu trận.

| Atlas | Pixel | Bytes |
|---|---|---|
| ledger |1536×768|219522|
| arc |768×768|37662|
| hit |1536×768|257280|
| chain |1024×1024|37306|
| shackle |1536×1536|505542|

Tổng1.057.312bytes, quality90/depthWritefalse. Đã pack asset; không build game. Không có giấy phép ngoài mới (art Codex dự án); spray chỉ phụ dùng texture hiện có.

## Rà nguồn/regression chưa chạy

Đã viết tests cardinal source−X, rearAlphaPixels0, timeline/half-disk, ledger lift, stable hold subset, snapshot provenance/remaining/live endpoints/reconnect/caster chết đổi khu, source giả cùng sharePercent bị từ chối, ability không tự tạo link, stable onepair plane/retract/quaternion/clear và manifest/pass/reduced. Core regression h00O metadata survives JSON snapshot, bị nguồn h00Y replace thì mất ownership, giữ front/back hit semantics với damage thật.

Chưa chạy bất cứ test/typecheck/build/game/browser/server. Người dùng chạy `npm test -- apps/client/test/visual-phan-quan.test.ts apps/client/test/battlefield-effects.test.ts packages/game-core/test/tier3-tier4-combat.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → Ctrl+F5. Debug `__vfxReplay('h00O')` tại ?debug=1 chỉ synthesize client targets/links, log rõ.

Unresolved: chưa nghiệm thu góc camera/sáng/tối/trận đông/reduced/4 người/FPS; source ledger/hit/shackle giữ cờ BLOCKED_ART lịch sử. Xích hiện giữ chiều cao cố định và kéo theo khoảng cách endpoints: cần xem tỷ lệ mắt xích khi hai quái cách rất xa/gần; reviewer coi đây là mục QA hình ảnh, không có finding chặn nguồn. Không chuyển sang tướng khác.
