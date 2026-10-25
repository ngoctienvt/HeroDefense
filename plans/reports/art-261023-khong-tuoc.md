# Khổng Tước h03R — nguồn/asset/rà mã 23-10-2026

Status: DONE_WITH_CONCERNS — nguồn đã tích hợp, chưa chạy test/typecheck/build/game hoặc nghiệm thu hình ảnh.

## Hành vi đã dựng

- Cast đúng event.windup/caster, mắt quạt mở + shader có uTime, viền R9 cố định; timeout windup+0,3s không giả resolve. Một quạt ngũ sắc1,12s, wheel ground1s; thiếu caster thì bỏ fan/vùng, vẫn nhận đúng targets.
- Mỗi ability.targets nhận feather rơi0,32s → blessing0,72s + detached feather spray + dấu chân nhỏ. Không chọn lại theo khoảng cách/HP, không hurt/recoil/hitstop hỗ trợ, không heal/damage lặp.
- Poison tierBuff snapshot thật: hai plume thấp world bên tay/vũ khí, giữ tuổi khi refresh; reconnect dùng pose đã lắng; hết buff/mất marker thì gập/rút/drop0,3s. Support dùng cả summon hợp lệ; reduced giữ pose/size/điểm, time0, bỏ particles/chuyển động.
- Trait `peacock-poison-hit-h03R` chỉ được phát trong nhánh thực sự áp tierBuff poison của processSingleHit, mỗi victim thật một event. Native trait.poisonDps ghi đè thì không phát. Nhiều custom attack return sớm giữ nguyên và không áp buff ở nhánh này. Không mở rộng gameplay hay đổi ordinary attack event.
- Battlefield route trait phụ trước actor reaction/animation/audio. Registry/marker/replay riêng, cap/pool/cleanup đầy đủ; cold texture/pool retry slot còn sống đúng tuổi, không restart cast hay buff, hai phía giữ index.

## Ảnh và đóng gói

Sáu raw Codex hiện có, không tạo ảnh mới/đổi hình chính bằng asset chung. Prompt/route/hash/BLOCKED_ART lịch sử được giữ trong active-inventory.json. Raw/contact sáng tối và processed contact đã xem bằng tool ảnh; không phải nghiệm thu chiến trường.

Fan nominal4×4 cắt sai; đã đo hàng335/651/940, pivot tâm lỗ276/552/829/1134 (khác ground bottom). Các seam adaptive theo alpha giữ available silhouette: một seam fan row2 giữa frame6/7 (zero-based) chạm tối đa23/255 glow, mọi seam khác0. Mép ngoài raw fan top/bottom/left/right tối đa1/2/5/8/255; không có bằng chứng đầu lông đặc bị cắt tại ảnh gốc. Màu noise alpha thấp ở raw được loại alpha<16, giữ silhouette thật; không tuyên bố khôi phục pixel không tồn tại. Nguồn BLOCKED_ART vẫn cần người dùng duyệt thẩm mỹ trong game.

Blessing hàng495; aura311/615/912; hit515. Một canvas/anchor/tỉ lệ chung mỗi bộ, không fit bbox từng frame. Resize premultiplied + WebP quality90. Ground radialEdge0,517061842 đo mọi alpha texel với margin1px; fan projected-bounds theo elevation camera thật giới hạn R9. Hero plane hiện6,4619; fan/receipt foreground dưới tướng/HP, sustained plume world thấp.

| Atlas | Byte runtime | Canvas nguồn chung | Cell |
|---|---:|---:|---:|
| fan | 480048 | 428 | 320 |
| ground | 143342 | 1174 | 512 |
| feather | 13272 | 1270 | 192 |
| blessing | 223798 | 542 | 320 |
| aura | 215346 | 434 | 256 |
| hit | 152184 | 560 | 320 |

Chip là lông mắt ngọc sẵn có, crop alpha rồi downscale premultiplied96px, 5598bytes; tổng runtime 1233588bytes. Không đọc toàn bộ thư viện vào game.

## Rà mã và regression đã viết

- Tự đọc lại event→routing→timeline→status→cleanup; reviewer độc lập xác nhận sửa pending cold-load/partial-slot và node location stub, không còn finding mở.
- Client regression: exact cast origin/windup, missing-caster skip, actual snapshot/summon, finite replay, reduced, radius/camera bound, cold phase/cast/plume retry/age/side/expiry/clear, auxiliary earlyroute, source hashes/grids/quality/pass.
- Core regression dùng actual hurtEnemy: R9 recipients/caster/summon; buff hit/ordinary event; actual cleave victims; unbuffed/current enemy poison/native overwrite/fire/custom return; combat status expiry.
- Cap charge8/layer16, timed128, plume48×2, painted192; spray180/queue110. Clear trả pool và bỏ delayed/replay/pending.

Không chạy bất kỳ test/typecheck/build/game/browser/server/launcher nào. Chỉ chạy xử lý ảnh Pillow/numpy và xem ảnh nguồn/contact.

## Người dùng kiểm tra

`npm test -- apps/client/test/visual-khong-tuoc.test.ts packages/game-core/test/khong-tuoc-poison-event.test.ts apps/client/test/battlefield-effects.test.ts`; `npm run typecheck`. Dừng server cũ → start-game.cmd → Ctrl+F5. Replay ?debug=1: __vfxReplay('h03R'), __vfxReplay('h03R','hit'). Duyệt sáng/tối, nhiều caster/đông quái, góc camera/R9, reduced, cold load, reconnect giữa buff, buff hết/mất sớm, clear đổi vùng, poison single/secondary/native/custom. Chưa có kết quả FPS hay nghiệm thu hình ảnh.

## Câu hỏi chưa giải quyết

Không có quyết định gameplay còn thiếu; nghiệm thu hình ảnh và kiểm thử do người dùng thực hiện.
