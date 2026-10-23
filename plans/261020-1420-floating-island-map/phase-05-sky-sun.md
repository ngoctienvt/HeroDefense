# Phase 05 — Bầu trời, mặt trời, biển mây

## Hiện trạng

`battlefield.ts:90` dùng fog EXP2 màu xanh xám (mật độ 0,004) và chỉ có một `HemisphericLight`. Không có bầu trời; nền canvas trống ở ngoài mặt phẳng.

## Thiết kế (module `visual-terrain-sky.ts`)

- **Bầu trời:** sphere lớn lật mặt trong, `ShaderMaterial` gradient ba điểm (đỉnh, chân trời, dưới chân trời) theo palette phase 01, có quầng sáng ấm về phía mặt trời. Không ghi depth, render trước tiên (`renderingGroupId` 0, `infiniteDistance`). Đặt `scene.clearColor` khớp màu chân trời.
- **Mặt trời:** billboard đĩa sáng cộng sáng, quầng mềm và tia sáng cách điệu xoay rất chậm. Đặt theo hướng nắng phase 01, ở vị trí nhìn thấy được trong khung camera mặc định (góc trên khung hình) mà không che vùng chiến đấu. Có thể thêm `LensFlareSystem` nhẹ; tắt khi reduced motion.
- **Ánh sáng:** `DirectionalLight` theo hướng nắng, `includedOnlyMeshes` là mesh đảo (không chiếu sprite). Giữ `HemisphericLight` làm fill, chỉnh màu trời/đất ấm hơn. Nếu vách dùng texture bake, light chỉ bổ trợ.
- **Biển mây:** hai đến ba plane rất lớn ở y −30 và −45, texture mây stylized vẽ tay có alpha, trôi bằng UV offset chậm. Thêm vài cụm mây billboard lơ lửng ngang mép đảo, đặt ngoài vùng `ARENA` và không che camera. Reduced motion dừng trôi.
- **Fog:** bỏ fog EXP2 hiện tại, hoặc dùng fog tuyến tính màu chân trời bắt đầu xa hơn đảo, để vách phía xa nhạt dần mà mặt trên không bị xám.
- Blob shadow của actor: dịch nhẹ ngược hướng nắng nếu phase 01 cho thấy cần, để đồng bộ với hướng sáng.

## Asset

Texture mây và mặt trời vẽ tay (tạo ảnh hoặc thư viện trong `assets/vfx-library/` nếu có mảnh phù hợp, ghi giấy phép). WebP ≤ 1024 px. Lưu nguồn trong `assets/terrain/sky/`.

## Kiểm tra

Ảnh chụp camera mặc định với 1 và 4 làn và ở bán kính lớn nhất: thấy trời, mây dưới đảo, mặt trời; sprite và thanh máu không bị lớp sáng phủ lên.
