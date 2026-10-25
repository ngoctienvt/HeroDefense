# Tiến độ boss-first: Thụ Yêu và ba master lô B

Ngày: 2026-10-23. Ưu tiên boss theo chỉ đạo người dùng; dùng ảnh sprite tĩnh, không image-to-video. Đế Giang vẫn được bỏ qua nếu khó đạt brief. Các ảnh bên dưới là candidate nguồn; chưa có bộ nào được duyệt chuyển động, xuất runtime hay nghiệm thu trong game.

## Thụ Yêu — Huyết Lâm (`art-bloodroot-sovereign`)

- Sinh 2 master still. V1 giữ trong `assets/sprites/monster-motion/art-bloodroot-sovereign/source/` làm lịch sử; QC thấy 3 pixel alpha ở cạnh trên và tán đỏ quá áp đảo. V2 là identity candidate: gỗ tối chiếm khối chính hơn, mặt rỗng/nhựa đỏ/rễ nhận ra; 6 pixel alpha ở cạnh phải được giữ làm dấu hiệu cần xử lý bằng scale chung nếu thật sự bị cắt. Không đặt ngưỡng lề trống cố định. Prompt, nguồn, SHA-256, kích thước và alpha nằm cạnh từng PNG.
- Tạo riêng các still hướng east, west, north từ master; hướng bắc cho thấy lưng, không mirror. East có 44 pixel alpha chạm cạnh phải; chưa đăng ký chung scale/anchor, nên cả bốn hướng vẫn candidate.
- Walk south: 3×2, 6 still. Raw spill QA (`safe_margin=0`) **FAIL** 4 component solid/visible qua ô, sheet-edge cuts=0; ownership giữ đủ thành phần và 8,336 pixel nằm ngoài ô danh nghĩa được gán theo cell sở hữu. Frame QC: identity head ratio 1.00, residual tối đa 1.16, không duplicate theo ngưỡng; torso drift **77.63 px**, row baseline **12 px**, seam **1.23×**. Rà hình thấy thay đổi contact/nhịp chân còn yếu.
- Attack south: 4×2, 8 still. Raw spill **FAIL** 7 component solid/visible qua ô, sheet-edge cuts=0; ownership giữ đủ thành phần, 35,541 pixel ở ngoài ô danh nghĩa được gán theo cell sở hữu. Frame QC: identity head ratio **0.909–1.01 (FAIL)**, residual tối đa 1.28, không duplicate theo ngưỡng; torso drift **35.42 px**, row baseline **68 px**, seam **1.27×**. Nén thân khi lấy đà có thể làm head-ratio heuristic không phù hợp; cần rà pose/registration bằng mắt trước khi chốt.
- PNG nguồn là RGBA với alpha thật; không key. Raw spill fail chặn cắt lưới trực tiếp; output ownership chỉ dùng chẩn đoán, chưa phải atlas runtime. Lưu raw sheets, prompt, JSON provenance, spill overlay, frame review và ownership output dưới `source/actions/{walk,attack}/south/`.

## Ba boss lô B: master, hướng và action candidate

- Quy Vương (`art-abyss-tortoise`): master tĩnh có mai tầng indigo/jade/đồng, đầu ngà, bốn chân; tạo riêng east/west/north. Contact sheet bốn hướng đã rà trên nền sáng/tối; hướng bắc cho thấy mai/lưng, không dùng mirror.
- Thạch Cơ Nương Nương (`art-stone-matriarch`): master nữ thạch linh với vương miện lệch, vai đá bất đối xứng, mặt/tay rõ; tạo riêng east/west/north, lưng quay ra ở hướng north. Lục Áp (`art-solar-hermit`) có master v1 bị thay vì vai/giáp gần kiểu tướng; edit v2 đổi sang dáng gầy hơn, áo choàng dài và giữ hồ lô/pháp khí; tạo riêng east/west/north, tiếp tục theo dõi độ khác với Bàn Cổ.
- Mỗi boss có 3 hướng candidate, RGBA true alpha. Preview bốn hướng trên nền sáng/tối nằm trong `source/directions/qa/turnaround-candidate-v1-{light,dark}.png`. Chưa đăng ký chung scale/anchor hoặc duyệt hướng.
- Tạo một walk 3×2 và attack 4×2 hướng nam cho mỗi boss. Cả 6 sheet có source, prompt, hash/provenance, spill overlay và frame review. Spill QA với `safe_margin=0`: Quy Vương walk **5** component tràn ô / attack **8**; Thạch Cơ walk **3** và cell `[0,2]` rỗng / attack **5**; Lục Áp walk **4** / attack **6**. Tất cả không bị cắt ở mép toàn sheet, nhưng grid slicing trực tiếp unsafe; `safe_frame` không phải lý do fail.
- Frame QC: Quy Vương walk head 1.00–1.04, torso drift **15.99 px**, baseline **5 px**, seam **1.43×**; attack head 0.92–1.06, torso **60.44 px**, baseline **22 px**, seam **1.24×**. Thạch Cơ walk QC dừng do cell trống; attack head 0.918–1.122, torso **25.44 px**, baseline **32 px**, seam **1.18×**. Lục Áp walk head 0.96–1.00, torso **58.91 px**, baseline **18 px**, seam **1.27×**; attack head 0.918–1.122, torso **113.78 px**, baseline **17 px**, seam **1.52×**. Near-duplicate heuristic không báo cặp nào ở những set đã chạy; xem ảnh vẫn thấy walk của cả ba đổi chân/trọng tâm quá nhẹ.
- Contact sheet QA của sáu action: [boss-action-sheets-2026-10-23-contact.png](./boss-action-sheets-2026-10-23-contact.png). Các action vẫn là diagnostic candidates, không motion-approved/packaged/runtime. Frame head-ratio attack nhạy với tư thế nén thân; giữ warning, không nới ngưỡng.

Tất cả PNG/master/direction/action đều lưu prompt, route `Codex image_gen`, model không được công cụ báo, kích thước, alpha và SHA-256 bên cạnh ảnh. Không dùng image-to-video.

## Batch master tiếp theo: ba boss lô C

- Xích Diệm Lân Vương (`art-cinder-qilin`): lân giáp đỏ/than-vàng, sừng chẻ, bờm lửa gắn silhouette; bốn chân nhìn thấy, không có lửa rời.
- Bạch Cốt Pháp Vương (`art-bone-abbot`): vua xương bốn tay xếp thành vòm, trượng chuông sọ. Các bàn tay tách nhau; vẫn cần xác nhận thứ tự tay và silhouette qua hướng.
- Thực Nguyệt Thiên Khuyển (`art-eclipse-hound`): khuyển săn bốn chân, mõm lớn, bờm khuyết; master ra profile nghiêng phải, nên giữ candidate và kiểm tra hướng trong turnaround thay vì re-roll ngay.
- Preview sáng/tối: [boss-master-batch-2026-10-23.png](./boss-master-batch-2026-10-23.png). Cả ba PNG 1323×1189 RGBA, alpha thật, không có pixel alpha ở bốn cạnh. Đây chỉ là thông tin clipping; không đặt ngưỡng lề trống. Prompt, hash, reference và alpha bounds được ghi trong sidecar từng ảnh.
- Chưa có bốn hướng, walk/attack, registration, export hay runtime; không tính là bundle hoàn chỉnh. Giữ nguyên ảnh raw và không image-to-video.

## Turnaround và action candidate cho ba boss

- Tạo east/west/north độc lập cho cả ba boss; Cinder và Bone Abbot dùng master làm south. Hound master đầu tiên thực chất nghiêng east, vì vậy giữ nó làm identity/east candidate và tạo thêm south view trực diện xuống dưới. Preview đủ bốn hướng trên nền sáng/tối: [turnaround light](./boss-turnarounds-2026-10-23-light.png), [turnaround dark](./boss-turnarounds-2026-10-23-dark.png). Giữ toàn bộ PNG still gốc, prompt và sidecar riêng; chưa đăng ký chung scale/anchor.
- Tạo walk v1 + attack v1 (4×2) dạng sheet tĩnh cho cả ba. Dịch vụ trả 1774×887 RGBA thay vì kích thước 2048×1024 trong prompt; không resample/crop để che sai lệch. Rà contact sheet [light](./boss-actions-2026-10-23-light.png) cho thấy attack có chuyển thế rõ hơn, nhưng walk lặp tư thế; attack vẫn còn thay đổi hướng/độ lớn cần registration và rà từng ô.
- Walk v2 có pose chỉ định theo từng ô. Contact [walk v2 light](./boss-walk-v2-2026-10-23-light.png), [walk v2 dark](./boss-walk-v2-2026-10-23-dark.png) xác nhận các pose vẫn quá giống nhau; dừng lượt sửa này, không motion-approve.
- Kiểm tra component alpha qua ranh lưới 4×2 (component area ≥32 px; đây là phép sàng spill, không phải tiêu chí blank margin): Cinder walk v1/v2/attack có **3/6/5** component qua ranh; Bone Abbot **7/6/1**; Hound **0/1/6**. Bone Abbot attack có 13 pixel alpha trên cạnh trên của sheet; cần xác định có bộ phận bị crop trước khi dùng. Không sheet nào được slice thẳng hoặc đóng gói runtime chỉ dựa trên các số này.
- Giữ tất cả v1/v2 thô và provenance. Chưa có action candidate nào được xác nhận đủ bước/continuity; chưa export, tích hợp hoặc nghiệm thu game. Không áp ngưỡng lề trống; chỉ theo dõi crop thật và spill thật qua cell.

## Quyết định xử lý tiếp

Giữ mọi raw source và QA; không re-roll thêm Thụ Yêu hoặc ba boss này trong lượt hiện tại. Walk yếu ở bước chân/root shift, action sheets tràn cell và còn drift; cần hướng xử lý cụ thể trước khi dùng. Tiếp tục boss-first theo batch master/direction/action; nếu một batch không đạt thì ghi candidate/FAIL và chuyển tiếp, không mắc kẹt trên một boss. Không build/test/server/game theo hướng dẫn dự án.

## Batch master lô C tiếp theo

- Hiện thân Ngũ Hành (`art-fivefold-avatar`) bị người dùng loại ngày 2026-10-23 vì hình không đạt. Giữ master/hướng cùng provenance trong source làm lịch sử bị loại; không tạo action, không đóng gói, không tích hợp và không tính vào roster. Không có thiết kế thay thế.
- Thiên La Chu Hậu (`art-web-empress`): tám chân và bụng giáp lớn đọc rõ; vẫn là candidate, cần kiểm tra footprint/selection ở runtime size.
- Hỗn Mang Liệt Giáp (`art-rift-colossus`): bốn tay, lõi hổ phách và giáp đá bất đối xứng đọc rõ; giữ khác silhouette Bàn Cổ, chưa hướng/action.
- [Master batch nền sáng](./boss-master-batch-2026-10-23-b-light.png) và [nền tối](./boss-master-batch-2026-10-23-b-dark.png). PNG là RGBA 1323×1189; prompt, reference, route và hash trong sidecar cạnh ảnh. Không áp ngưỡng lề trống.
- Với hai boss còn lại đã có master và ba hướng candidate; chưa có action, không tính bundle hoàn chỉnh, chưa tích hợp/export.

## Scope update — 2026-10-23

Roster sản xuất hiện tại là 39 ID (20 quái + 19 boss). Hiện thân Ngũ Hành bị loại theo yêu cầu người dùng; không thay thế. Tất cả source của nó chỉ là lịch sử bị loại, không được tiếp tục sinh action hoặc tính vào số lượng hoàn tất.


## Sprite sheet pilot sau khi loại Ngũ Hành — rà lại 2026-10-24

- Đính chính nhận định nền đục: nền nâu/tím trong bản xem trước là RGB ẩn dưới alpha 0. Kiểm tra pixel và contact trên checkerboard xác nhận PNG có nền trong suốt thật. Không cần tạo lại hoặc key nền vì màu xem trước.
- Ba raw sheet walk south 1536×1024 đều FAIL spill qua ranh ô 4×2. Ownership slicing giữ nguyên component và xuất đủ tám frame/candidate trên canvas chung; atlas/WebP trong các thư mục ownership chỉ là nguồn QA, chưa phải export runtime.
- Chu Hậu v1: frame QA FAIL head ratio 0.90–1.04, WARN torso drift 41.18 source px; đây là heuristic nhạy với bụng/giáp ở vùng đầu. Chu Hậu v2: không FAIL, còn WARN torso drift. Liệt Giáp: head-template không fit frame 6, không dùng phép đo này làm bằng chứng identity.
- Contact checkerboard đã rà: [walk ownership review](./boss-walk-ownership-review-2026-10-23.png). Chu Hậu có đổi chân nhưng nhịp support chưa đủ rõ; Liệt Giáp có pose thay đổi mạnh nhưng cần khóa trọng tâm và trình tự bước. Không motion-approve. Giữ số lượt sửa thấp, tiếp tục action còn thiếu của batch.
