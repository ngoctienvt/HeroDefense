# Lô C — Huyền Băng Ngư Giao

Snapshot ngày 2026-10-22. Đây là source production candidate, chưa phải bundle hoàn chỉnh hoặc nghiệm thu game.

## Master và directions

- Master south: `assets/sprites/monster-motion/art-frost-wyrm/source/master-candidate-v1.png`; prompt, identity recap, route `host-image_gen`, sidecar SHA-256 và processed 1024×1024 cutout được giữ trong cùng asset source.
- Ba hướng tạo riêng từ master: east, north-rear và west tại `source/directions/<direction>/`. Cả ba được xử lý cùng profile boss (`subject_height_px=728`, `top_margin_px=221`) với 0 framing warnings.
- Rà mắt: east hướng mõm phải; west hướng mõm trái; north thấy lưng, không lộ mặt. Giữ cùng vảy chàm, bờm trắng, vây băng và hai chi trước. Rà 4 view trên contact sheet nền sáng/tối: south nhận diện đúng giao long; east/west quay đúng hướng và được tạo riêng; north cho thấy lưng không lộ mặt. Anatomy/scale/palette thống nhất, alpha không có viền màu rõ. Master và directions được chốt nội bộ làm production identity references (sidecar ghi người rà/phạm vi); chưa nghiệm thu runtime/game-size hoặc export.
- Mỗi ảnh nguồn có `candidate-v1.json`, prompt thực tế, SHA-256 và đường tới processed `master_rgba.png`; route không công bố model hoặc chi phí.

## Rà duyệt master/direction nội bộ

Master south cùng 3 direction được chấp nhận nội bộ làm identity references để không chờ user gate theo chỉ đạo. Bằng chứng contact sheet nền sáng/tối nằm tại `source/direction-review-light-v1.png` và `source/direction-review-dark-v1.png`; sidecar từng ảnh ghi rõ phạm vi chỉ là reference sản xuất, chưa phải game acceptance.

## Action south candidates

| Action | Raw sheet QC | Ownership-slice diagnostics | Đánh giá |
|---|---|---|---|
| Slither/walk v1 | `spill: fail`, 1 connected component qua cell; frame-QC không hoàn tất vì head template không fit frame 3 (đầu ở thấp trong silhouette thân cuộn). | Tạo 8 full frames; exact PNG/atlas/WebP checks pass; ownership giữ lại 40 pixel thuộc component ngoài cell; loop seam ratio 0.770214; `needs-visual-review`. | Contact sheet cho thấy thân/đuôi đổi cách cuộn giữa hàng, chưa thành một gait nhất quán. Không motion-approved. |
| Slither/walk v2 | `spill: fail`: 4 solid/5 visible components crossing cells; boundary band 3,188 px; 8 safe-frame warnings; faint specks. | Chưa slice. 8 cells generated; poses differ too little for a useful gait. | Candidate rejected for production; retained as source/QC. |
| Slither/walk v3 | `spill: fail`: 3 solid/3 visible components cross cells; boundary band 5,650 px; 4 safe-frame warnings; 19 faint detached components. Ownership slicing yields 4 full still frames; frame QC `fail` `identity_head_ratio`; warnings `phase_coverage`, torso drift 32.17 game px, row baseline 4.5 px; seam ratio 1.2. | Alpha, atlas and WebP generated; `needs-visual-review`; non-loop preview only. | Poses have visible forelimb/body-wave variation, but four frames are a partial candidate, not an approved walk cycle. Keep full frames; no forced blank margin. |
| Slither/walk continuation | `spill: fail`: 3 solid/3 visible components cross cells; boundary band 10,368 px; 4 safe-frame warnings; 22 faint detached components. | Ownership slicing gives 4 more full stills; common-canvas scale pass (1.2133×, 814×812 canvas, 728 px target), no clipping reported. | Retained as frames 5–8 of the candidate cycle. |
| Slither/walk v4 combined | Combined 8 static frames; frame QC `fail` `identity_head_ratio` (frame 0 ratio 1.087; others 0.978–1.043); `warn` `leg_alternation` (near/far sequence repeats and one is unclear), torso drift 49.05 game px; seam ratio 1.25. Phase coverage and row baseline pass. | Single scale 1.2133× and canvas 814×812; per-frame PNGs in `scaled-walk-candidate-v4/`; source frames only transparently padded right/bottom to shared 669×651. | Not approved: poses do not show a reliable alternating slither gait and torso/anchor movement is too large. |
| Registration comparison | Stance root-lock worsened metrics: canvas 1239×812, x shifts as large as 383 px, torso drift 94.99 game px, seam 1.64. Centroid-x lock gives 839×812 canvas, head ratio worst 1.075, torso drift 47.78, seam 1.17, still leg alternation WARN. | Both remain diagnostic outputs under `scaled-walk-v4-stance/` and `scaled-walk-v4-centroid/`. | Keep `root-lock none` for current candidate; neither alternate meets motion QA. Fix the poses before further registration tuning. |
| Slither/walk v5 | Raw 4×2 sheet QC `fail`: 5 solid/5 visible cross-cell components; boundary band 2,190 px; 8 safe-frame heuristics; 21 faint detached components. Ownership output preserves 8 frames; exact PNG/atlas/WebP QA passes; `cross_cell_spill` value 703 pixels preserved; loop seam ratio 0.507447 in ownership preview and 0.508238 after scaling remain `needs-visual-review`; the scaled animated WebP is 4,662,124 bytes (source candidate, not runtime-optimized). Registration pass: 1.7251×, body 728 px, canvas 788×808, no clipping. | Frame-QC aborted with `The head template does not fit inside frame 2; check --head-frac.` Its top-band head assumption does not fit this south-facing coiled anatomy. Manually reviewed light/dark target-size contacts: identity and full silhouette remain clear; body/tail varies more than v4. | Best current walk candidate, not approved: forelimb alternation and cycle continuity still need review. Keep raw QC warnings. |
| Attack v1 | `spill: fail`, 1 connected component qua cell; frame-QC warn: frame 0/7 gần trùng, torso drift 161.29 game px, row baseline drift 9 px. | Tạo 8 full frames; exact PNG/atlas/WebP checks pass; ownership giữ lại 11 pixel thuộc component ngoài cell; loop seam ratio 0.375263; `needs-visual-review`. | Hàm mở đọc được ở một số pose nhưng phần lớn thân lặp và thu thế chưa rõ. Không motion-approved. |
| Attack v2 | `spill: fail`, 1 connected component qua cell; boundary band 1,001 px; 8 safe-frame heuristics và 35 detached alpha components. Frame-QC warn: near duplicate [1,2], torso drift **83.87 game px**, row baseline **14 px**. | Chưa ownership-sliced; không cắt/đóng gói. | Có head/jaw pose khác nhau hơn nhưng thân/anchor vẫn trôi và sprite tràn cell. Không motion-approved. |
| Attack v3 | Raw 4×2 sheet spill `fail`: 4 solid/4 visible cross-cell components, boundary band 3,891 px, 37 faint components. Ownership retains all 8; scale 1.693× to 728 px body on 814×770; no clipping. Scaled frame QC: `identity_head_ratio` fail (max 1.085), `identity_residual` pass (max 1.25), `torso_drift` warn 43.56 game px, row baseline pass, seam 1.11 pass. | Candidate clip package built: 8 still PNGs, WebP preview, one-shot 800 ms at provisional 6 ticks/frame; builder lints 0, QA `needs-visual-review`. Light/dark/checker filmstrip reviewed. | Bite phases read clearly, but head-ratio and torso-drift warnings remain recorded; no full-direction or runtime approval. |

Ảnh gốc, prompt, sidecar, QC, ownership output và atlas candidate được giữ tại `source/actions/{walk,attack}/south/`. Ownership slicing theo đúng component owner để giữ nguyên silhouette, không dùng largest-component filter; nó không tự biến candidate thành bộ animation đạt chuẩn. Walk v1 curl chưa đều; v2 thiếu khác biệt gait; v3 có biến đổi chân và thân nhưng mới 4 pose; bổ sung continuation tạo 8 frame ở v4, nhưng chân luân phiên và torso/anchor vẫn fail/warn QA; đã thử root-lock stance/centroid, không cải thiện đủ nên giữ bản no-horizontal-lock làm chẩn đoán. Attack v1 có lunge hàm nhưng nhiều pose thân lặp; v3 rõ pha hơn và có package candidate, nhưng vẫn giữ cảnh báo head-ratio/torso-drift. Chưa có action set bốn hướng nào hoàn tất.

## Quyết định mép/cell

Người dùng xác nhận không cần blank margin theo phần trăm cố định. Điều kiện là silhouette cần dùng nằm trọn trong canvas/cell và không bị cắt; atlas padding sẽ theo motion envelope và bleed khi sampling. Cảnh báo `safe_frame` đứng riêng chỉ là heuristic. Các prompt queue chưa gắn với output đã được sửa theo quy tắc này; prompt đã dùng để tạo ảnh được giữ nguyên làm provenance.

## Còn thiếu

Master và 3 direction mới có; chưa có idle JSON/export manifest, chưa có walk/attack đạt motion review cho bất kỳ hướng nào, chưa pack/runtime integrate/build/game-check. Asset chưa tính hoàn chỉnh trong roster.

- Walk v6: sheet 8 stills lấy trực tiếp từ master, route host-image_gen; đủ silhouette trong khung nhưng pose gần trùng, forepaw alternation không đọc được. Candidate được giữ cùng prompt/hash, rejected for motion; không bị loại do chạm mép. Không image-to-video.

## Ghi chú về mép và đóng gói

Ảnh trong khung đầy đủ là đạt framing; không yêu cầu vùng trống cố định ở rìa sprite. Chỉ xử lý padding/extrusion ở bước atlas khi cần chống sampling bleed. Loại v6 vì tám pose thiếu biến thiên chuyển động, không phải do sát mép.

- Attack east v1: source sheet/prompt/provenance tại source/actions/attack/east/; scale output và one-shot preview 8 frame/800 ms tại scaled-candidate-v1/ và package-candidate-v1/. Rà filmstrip nền sáng/tối/checker: pha cắn rõ, silhouette nguyên. QC: head-ratio fail 1.083/0.938 theo pose hàm/cổ; torso drift warn 15.38 game px; identity residual max 1.32, row baseline và seam 1.49 pass, không near-duplicate. Lưu candidate, không duyệt vì còn warning; không yêu cầu blank margin.

- Attack west v1/v2: v1 retained as failed cell-layout source; frames overlapped and outer-edge crop made safe extraction impossible. v2 at source/actions/attack/west/ has prompt, provenance, scaled frames and 8-frame preview. Internal review reads the left-facing bite phases; frames fit shared canvas. QC head ratio fail max 1.089/min 0.99 and torso drift warn 31.24 game px remain; identity residual, row baseline, seam and near-duplicate checks pass. Not approved as final action; no fixed blank-margin requirement and no image-to-video.

- Attack north v1: static rear-facing foreclaw rake sheet, prompt/provenance, scaled frames and 8-frame clip preview under source/actions/attack/north/. The silhouette and back-facing view remain consistent through guarded → raised claw → rake → recovery. Frame QC has WARN identity_residual and torso_drift, no fails; package has zero lints and needs-visual-review. Candidate only, not integrated or game-accepted.
- North attack QC details: head ratio PASS; identity residual WARN max 1.97 (frame 6), torso drift WARN 11.25 game px; no near duplicates, row baseline and seam PASS.

- Walk east v1 retained as a failed motion candidate at source/actions/walk/east/. The silhouette and identity are full in the scaled canvas; frame changes are too slight for a readable gait. QC fails head ratio and leg alternation, warns torso drift 6.96 game px. No edge-margin rejection; no image-to-video.
