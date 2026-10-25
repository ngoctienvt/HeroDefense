# Trầm Hương h03Q — nguồn ảnh và rà tĩnh

Hoàn tất nguồn ngày23-10-2026 Asia/Bangkok. Phạm vi chỉ tuyệt kỹ h03Q, metadata trình bày tùy chọn; không sửa luật/sát thương/trạng thái hoặc các tướng kế.

## Ảnh đã xử lý

- Năm raw Codex gốc từ manifest tier34, kèm prompt/hash/route trong [active inventory](../../assets/vfx-source/tram-huong/active-inventory.json). Giữ nguyên raw, prompt và trạng thái lịch sử BLOCKED_ART; không gọi tạo ảnh hoặc dựng hình chính thay thế.
- Xem raw và contact sau xử lý trên nền sáng/tối. Đèn sen ngọc và lưỡi rìu vàng nhận diện rõ; fissure là khe núi, hit là đá vỡ/tia vàng. Các hàng sheet khác chiều cao; cắt đều sẽ cắt mất phần đá hoặc kéo hàng kế vào. Cắt theo dải alpha trống, common canvas và neo sàn chung từng hàng, không fit từng frame.
- Lamp4×2, cắt460/neo400,815; axe4×4, cắt312/608/876, sàn300/592/852/1070; hit4×2, cắt475/neo425,825. Giữ đủ silhouette ở alpha>=16; bỏ fringe cực thấp trước resize premultiplied Lanczos. Fissure xoay nguyên ảnh90° CCW để local+X là chiều dài, không mirror; lotus nhìn top-down thật.
- Runtime WebP quality90, five atlas1.029.294bytes +chip3.842bytes. Fissure radialEdge0,365999, lotus0,460955 đo mọi alpha>0 và góc texel sau resize; biên R5 không vượt khi xoay/khép. Chip là viên đá rời nguyên RGBA trong hit rect222/62/241/90.
- Cảnh báo thật: shaft/tia rìu sát đầu từng hàng nguồn; pose đá thay đổi kích thước/nội dung giữa hàng. Đã bảo toàn pixel trong các khoảng đo, nhưng contact tĩnh chưa chứng minh nối nhịp đẹp. Sen là hoa đối xứng lớn, giới hạn R1,25/người và receipt0,85s để không che đội hình.

## Rà nguồn

- Dispatch combat.ts gọi resolveTier3Ability thật; h03Q đánh300% Công một lần R5 quanh aim, sunder35%/5s. Vòng lặp hỗ trợ cùng chủ/cùng khu/deployed/R6 quanh caster giữ nguyên: hồi100% Công +5% HP tối đa người nhận; empower20%/5s theo strongest rule. Chỉ thêm supportTargets chính các ID đã lặp, không lọc lại sau buff và không thêm vào damage targets.
- Optional contract → AbilityExtra → VisualEffects.show đối số6 clone → registry → receipt. Battlefield xác nhận state.units, deployed/alive/currentzone và actor unit; loại trùng/monster/stale/reserve/kháckhu. Không đoán theo khoảng cách/HP/status. Không phản hồi đau cho supportTargets. Source mất actor/0quái vẫn có receipt nếu người nhận còn hiển thị.
- Pha cast giữ frame cuối tới windup+0,3s; shader time/alpha/scale. Đèn ngoài vai cao3,65 screen-up/side2,25 theo plane hero8,03, không đổi pass actor. Rìu từ lift6 lao xuống trong0,24s, đúng một contact, axe1,15s/đá lắng, fissure1,6s mở/khép, hit0,5s, lotus0,85s mở/co. Main action foreground; fissure/lotus world. Direction event rồi caster→aim, zero không bịa trục. Missing aim không dựng impact giả.
- Empower/sunder dùng dấu snapshot chung. Không có provenance empower để giữ sen riêng5s. Reduced không bay/hạt/di chuyển/đổi pose, charge time0; shared ring freeze uTime do controller bổ sung sau reviewer phát hiện fbm vẫn chạy dùswirl0.
- Cap và cleanup có đủ; replay chỉ synthetic client, clear bỏ cả delayed callbacks/spray queue. Debug không ghi dữ liệu người chơi.

## Kiểm tra chưa chạy

Đã viết regression client timeline/routing/atlas/sourcehash/reduced/contact/clear; Battlefield exact unit recipients/cast aim/no ally hurt/source missing/0quái; core damage/heal/range/exclusions/fullHP/strongerbuff/JSON metadata. **Không chạy test, typecheck, build, game, browser hoặc launcher.** Không nghiệm thu shader, FPS, chiến trường sáng/tối, nhiều người, góc camera khác, reduced trong game.

Người dùng: `npm test -- apps/client/test/visual-tram-huong.test.ts apps/client/test/battlefield-effects.test.ts packages/game-core/test/tier3-tier4-combat.test.ts`; `npm run typecheck`; dừng server cũ → `start-game.cmd` → `Ctrl+F5`; replay `__vfxReplay('h03Q')` ở debug=1. Tình huống nghiệm thu ghi tại [docs](../../docs/tier3-vfx.md#trầm-hương-h03q).

## Câu hỏi còn lại

Không có quyết định luật chơi đang thiếu. Chờ người dùng chạy và nghiệm thu hình ảnh, nhịp rìu/contact và độ đọc đèn trên vai.
