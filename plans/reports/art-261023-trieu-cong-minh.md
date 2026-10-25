# Triệu Công Minh h03S — nguồn VFX hoàn tất, 23-10-2026

## Kết quả

- Runtime riêng `visual-trieu-cong-minh{,-art,-charge,-pieces,-targets,-timeline}.ts` + layout; registry/replay và routing mixed targets. Bốn pha: xu tụ cạnh vai theo windup thật → một xu tăng tốc trong8×2 → hit theo projection từng quái → return/receipt đúng ally rồi thu. Plain shield vẫn do shared snapshot, không timer5s/reward cue/fire body aura.
- Modern tier3 origin chỉ còn caster đúng zone/không dying; regression source-otherzone/dead/missing J/P/O/Q. Tách ally/enemy theo state membership+actor kind, không dùng phép đoán HP/block/distance. Quái chết đã rời snapshot nhưng còn actor vẫn được contact; ally không hurt.
- Bốn raw Codex gốc giữ nguyên hash/prompt/source/BLOCKED_ART. Processor Pillow/numpy có connected-component seam recovery trên canvas576; row shifts25/30/65. Receipt recovery422pixel. Alpha<16 loại, resize premultiplied, WebPquality90. Head trail thực bên phải; crop bỏ xu lớn baked-in, UV/geometry reveal cùng tỉ lệ, strip reset quaternion khi trả pool.
- Asset runtime: spin167460B + hit141868B + receipt179442B + trail87724B + chip3734B = **580228B (~566,6KiB)**. Chip96² là xu lỗ vuông cắt đúng từ hit, đã xem riêng; contact raw/processed sáng tối đã xem.
- Regression client `apps/client/test/visual-trieu-cong-minh.test.ts`, core `packages/game-core/test/trieu-cong-minh-event.test.ts`: contract mixedtargets/plainshield/rewardflag absent, unit vs monster feedback, sourceguard, direction/cardinal strip/UV, acceleration inversearrival/bounds, coldretry/cancel/cleanup, reduced/replay/cap, hash/grid/canvas. Không đổi gameplay hay network contract.

## Rà và giới hạn

Static review module/kitAPI/routing có reviewer độc lập; lỗi nháp bank.tick(dt,time), spray.ring đủ6đối số, LayerPool.releaseAll và replay default ultimate đã sửa trước bàn giao. Không chạy compiler/test/game. Module<200dòng, cap/pool/queue có giới hạn, missing texture retry theo tuổi thực, cast watchdog chỉ hủy không fake ability.

Cờ BLOCKED_ART lịch sử giữ nguyên. Alpha mép ngoài raw spin/trail=0, hit/receipt≤1; sau cutoff16 không còn solid clipping. Spin gồm góc quay không đều, frame đầu rộng hơn và frame cuối gần mặt trước: không fit riêng frame hay tuyên bố loop đã mượt. Các alpha fleck nhỏ bị bỏ theo chuẩn cleanup. Tail cắt phần head baked-in đúng ảnh gốc; texture fire vẫn chỉ là đuôi, không biến thành vùng sát thương. Kích cỡ xu bay bị giới hạn bởi làn rộng2, khác xu charge lớn cạnh vai.

Chưa xem trong game: biểu kiến góc quay/loop và độ lớn xu ở camera thật, đồng bộ hit với enemy knockback, shoulder không che tướng, bốn hướng, reduced, nhiều caster, cold-load, cleanup, sáng/tối, FPS. Không khẳng định đẹp/chạy đúng trước người dùng nghiệm thu.

## Người dùng kiểm tra

`npm test -- apps/client/test/visual-trieu-cong-minh.test.ts packages/game-core/test/trieu-cong-minh-event.test.ts apps/client/test/battlefield-effects.test.ts`, `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`; debug `__vfxReplay('h03S')`/`('h03S','skill')`. Đã sửa nguồn và chép asset; **chưa test/typecheck/build/chạy bản mới/nghiệm thu hình ảnh**.

Không còn câu hỏi về phạm vi; cần kết quả thực thi/nghiệm thu của người dùng.
