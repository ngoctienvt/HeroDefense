# Hợp đồng art, animation và nghiệm thu

Áp dụng cho đủ 40 mẫu trong [roster](./roster.md). Chuẩn tướng là mức hoàn thiện tranh, góc camera, alpha và chuyển động; không bắt mọi con có tỉ lệ người hoặc vũ khí giống tướng.

## Hình ảnh và camera

- HD stylized vẽ tay, cel shading, rim light có kiểm soát ở vai/mai/cánh/vũ khí. Mảng sáng/tối lớn, chất liệu phân biệt được trên đảo nắng. Không pixel art, không photoreal, không texture vụn hoặc viền sáng phủ trắng thân.
- Dùng source master Bàn Cổ được chấp nhận trong `assets/sprites/pangu-topdown/source/` làm style reference, chọn đúng file sau khi xem ảnh. Master từng quái/boss là identity reference chính. Không lấy Bàn Cổ làm reference giải phẫu cho mọi mẫu.
- Camera trực giao nhìn xuống khoảng 45°, khớp camera chiến trường. Khóa nguồn sáng và quy ước `south/west/north/east`; trái/phải theo chiếu camera Babylon LH.
- Tạo riêng bốn hướng. Không mirror cung/sừng/càng/vũ khí/giáp bất đối xứng. View north phải có lưng/cấu trúc phía sau thật.
- Idle tĩnh hoàn toàn: 1 frame mỗi hướng. Thú bay nghỉ bằng pose đậu/bám hoặc treo cố định, không tự vỗ cánh/nhún khi idle; walk của thú bay dùng flight cycle.
- Quái thường mục tiêu thân khoảng 0,65–1,15× tướng chuẩn; boss theo roster. Scale hiển thị, selection và collision là ba thứ riêng; không đổi collision chỉ vì vẽ boss to hơn.

## Bộ hành động và số lượng dự kiến

| Hành động | Quái / hướng | Boss / hướng | Pha bắt buộc |
|---|---:|---:|---|
| idle | 1 | 1 | Rest pose đứng im |
| walk / flight / slither | 6 | 8 | Tiếp đất/đỡ thân → chuyển trọng tâm → bước đối diện → nối vòng; loài không chân có nhịp tương đương |
| attack | 6 | 8 | Chuẩn bị → lấy đà → impact → follow-through → thu thế |
| **Tổng / hướng** | **13** | **17** | Bốn hướng riêng |
| **Tổng / cá thể** | **52** | **68** | Baseline để lập kế hoạch |

20 quái × 52 + 20 boss × 68 = **2.400 frame**. Không tạo hit/death theo yêu cầu người dùng; không có bộ cast riêng. Sinh vật nhiều chi hoặc chuyển động khó có thể cần thêm frame walk/attack; baseline không phải trần chất lượng. Timing phải đo theo pose và nhịp gameplay, không chia đều cho đủ số frame. Attack art không quyết định thời điểm damage; hit-stop giữ clock. Nếu runtime có cast thì giữ pose lấy đà từ attack và chuyển theo event, không thêm action asset mới.

Không tạo entrance, chuyển phase hoặc corpse riêng trong phạm vi này. Với 7 boss chưa có encounter, bàn giao idle/walk/attack và brief vật chất nhận diện, không tự thêm phase máu/kỹ năng. Khi bị hit dùng cue/VFX hiện có nếu phù hợp; khi chết dọn visual theo vòng đời hiện hữu, không đòi thêm pose hoặc giữ corpse.

## Boss epic có tiêu chí nhìn thấy được

1. Tắt toàn bộ particle/bloom: vẫn nhận ra loài, vũ khí, hướng quay và tư thế đe dọa qua silhouette ở mức zoom chiến đấu.
2. Mỗi boss có ít nhất hai điểm khác rõ ngoài palette: tỉ lệ cơ thể, số chi, vũ khí, cấu trúc mai/cánh/tán hoặc nhịp di chuyển. Không phóng to quái thường rồi đổi màu để tính boss.
3. Khối nặng chuyển trọng tâm trước đánh, impact ngắn có điểm nhấn, hồi thế đọc được. Boss bay/rắn có đường chuyển động riêng; không ép tất cả dùng nhún thân.
4. VFX đặc trưng tách các lớp báo trước/hành động/va chạm/dư âm; có vật chất thật theo mô tả, không chỉ vòng phép đổi màu. Không nhúng projectile, chém dài hoặc explosion vào sheet thân.
5. HP, điểm chân, selection và mục tiêu bên cạnh còn đọc được khi boss đánh; mở cánh/tán không tràn rìa atlas hoặc che toàn đảo. Giảm scale cả bộ hoặc đổi pose/canvas thống nhất khi cần.
6. Reduced motion vẫn có silhouette, pose impact và vị trí/phạm vi rõ; không phụ thuộc shake hoặc flash toàn màn hình để thấy lực.

## Bộ file của mỗi cá thể

Theo cấu trúc source/web sẵn có, dự kiến dùng `assets/sprites/monster-motion/<asset-id>/` cho bộ mới; giữ nguồn 5 cũ đến khi chuyển xong. Không tạo pipeline song song với `tools/assets/pack-monster-motion.py`; mở rộng packer hoặc tách helper tại ranh giới thực sự cần.

- `source/`: master, bốn reference hướng, sheet từng action và các bản sửa cần giữ; prompt và provenance ghi art_source, route/model nếu công cụ trả, ngày tạo, reference, quyết định duyệt. Không ghi API key/token.
- Manifest nguồn: nhận diện, palette, body/weapon ratio, camera, hướng, resting anchor, motion envelope, display scale; không fit scale theo từng frame.
- Khi motion đã được duyệt, `source/export-manifest.json` liệt kê tường minh mọi clip theo `action` + `direction`, mảng `frames` (đường dẫn PNG full-canvas tương đối trong thư mục asset), `durationsMs` cùng số phần tử, và `loop`. Manifest khai báo `sourceCanvas`, `cellSize`, `padding`, `maxAtlasEdge`, `assetId` và schema `monster-motion-export.v1`. Không lấy sheet grid chưa qua QA làm đầu vào pack.
- `web/`: atlas WebP, JSON rect/anchor/durations/loop/event, portrait WebP nếu UI dùng, QA JSON, preview từng clip và contact sheet nền sáng/tối.
- Chỉ chép texture runtime cần dùng vào `apps/client/public/assets/`; manifest runtime theo cấu trúc project. File source chất lượng cao không tải vào game.
- Một scale từ rest pose cho cả bốn hướng và mọi action. Anchor mặt đất chung; thú bay có ground projection riêng để giữ độ cao ổn định, không lấy đáy bbox cánh làm chân.
- Packer manifest map anchor riêng của từng hướng về anchor thế giới chung, giữ nguyên canvas/cell cho cả clip, scale từ motion envelope chung và dùng alpha premultiplied khi downscale. Không lọc connected component. Runtime JSON ghi page, rect, anchor, duration và loop; atlas nhiều trang được phép.
- Không yêu cầu tỷ lệ blank margin cố định cho master hay từng cell. Toàn bộ silhouette cần dùng phải còn trong canvas/cell; không được crop hoặc tràn sang cell kế. Atlas padding tính theo motion envelope thực tế để tránh bleed khi sampling, không phải khoảng trắng trang trí quanh nhân vật. Cảnh báo `safe_frame` chỉ là heuristic; chỉ xem là lỗi khi có pixel/chi tiết bị cắt, cross-cell spill, hoặc bleed ở kích thước runtime.
- Bảo toàn đầu cánh/vũ khí/rễ; downscale premultiplied alpha; không lọc largest-component khiến rơi tay/chi/tua.
- Kích thước cell/atlas chọn sau pilot theo cỡ chơi thật; hỗ trợ hơn một trang nếu cần. Không hardcode 7 cell, 36 frame, 2048 hay một grid cho mọi sinh vật.

## QA hai lớp

**Kiểm tra dữ liệu:** ID/clip đầy đủ, không frame trống, alpha thật, rect trong atlas, timing dương, loop đúng, event hợp lệ, anchor/scale không nhảy, texture không thiếu. Báo WARN/FAIL nguyên trạng và xử lý hoặc ghi hạn chế rõ; số liệu không thay duyệt mắt.

**Duyệt hình:** từng hướng/từng action ở cỡ chơi thật, nền đất sáng/tối, cạnh tướng chuẩn. Xem bàn tay/càng/chân/cánh, số chi, lưng, sự đổi vũ khí, điểm tiếp đất, nối vòng, thu thế, viền màu và bộ phận bị cắt. Preview phóng lớn chỉ hỗ trợ; không dùng làm bằng chứng chất lượng ở cỡ game.

**Trong game do người dùng chạy:** idle ≥5 giây; đi/đánh bốn hướng; xoay camera và zoom; boss nhóm chung HP/selection; hit-stop, reduced motion; boss chết/đổi phụ bản; nhiều quái cùng 1–4 làn và VFX đang hoạt động; không thiếu texture hoặc sót child sau cleanup.

## Trạng thái bàn giao

Mỗi bộ ghi riêng: `concept-approved`, `master-approved`, `directions-approved`, `motion-approved`, `packaged`, `integrated`, `built`, `in-game-approved`. Các nhãn cuối chỉ đánh khi có chứng cứ; không đánh packaged chỉ bằng QA số và không đánh in-game-approved bằng source review.
