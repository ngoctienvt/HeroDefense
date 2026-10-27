# Bàn Cổ 3D — animation FBX người dùng

Tướng `h01B` dùng model 3D với hai animation người dùng mới cung cấp ngày 2026-10-24. Đã thay asset nguồn trong runtime; chưa build/chạy hoặc nghiệm thu trong game. Chân dung, VFX và gameplay/server giữ luồng hiện có; quái mượn ngoại hình Bàn Cổ vẫn dùng sprite.

## Nguồn

Nguồn trong `D:/Downloads/models_3d_2026-10-24/`:

- `Standing Walk Forward.fbx`: clip đi hiện dùng, 41 khung, 30 fps, skin/rig Mixamo; bản sao `standing-walk-forward.fbx`. File `Walking.fbx` cũ giữ làm nguồn lịch sử, không dùng trong runtime.
- `Standing Melee Attack Downward.fbx`: cùng rest skeleton 33 xương, 69 khung, 30 fps; đòn một tay giơ cao rồi bổ xuống.
- `ban_co_riu_khai_thien.glb`: model rìu riêng. Bản T-pose `ban_co.glb` vẫn giữ làm nguồn tham khảo.

FBX giữ bản sao nguyên vẹn trong `assets/3D model/pangu/animation-source/`; GLB gốc trong `assets/3D model/pangu/`. Các nguồn là file người dùng cung cấp; không có URL công khai, quyền phân phối chưa được xác minh độc lập. SHA-256, phạm vi clip và thông số xuất trong `runtime-export.json`.

Bản rig/animation tự dựng trước và bản thử Rigify **không dùng cho runtime hiện tại**. Bộ mới giữ skin và chuyển động từ FBX, không gán lại trọng số cơ thể hay thay động tác bằng xoay xương tự dựng.

## Sản xuất

`tools/assets/animate-pangu.py` ghép hai action sau khi đối chiếu rest skeleton. Loại bỏ độ trôi ngang tổng thể, giữ nhịp dịch hông và chuyển trọng tâm của nguồn; normalize theo chiều cao rest pose. Idle giữ nguyên pose sẵn sàng ở khung đầu attack, không tự chuyển động.

Rìu skin cứng vào `mixamorig:RightHand`, điểm nắm `[0, 3.5, 0]` trong hệ xương FBX, cán theo trục `-X` của bàn tay. Rìu theo tay trong walk/attack: pose giơ ở frame 19, bổ xuống ở frame 25. Vai, khuỷu và thân giữ animation nguồn. `tools/assets/pangu-weapon-grip.py` chỉnh rotation cổ tay để đầu rìu hướng lên khi đứng/đi; giảm chỉnh ở lấy đà, giữ nguyên rotation nguồn đoạn frame 17–32 để bổ đúng chiều, rồi trở lại tư thế cầm khi thu thế. Tay và rìu xoay cùng nhau, không quay riêng vũ khí trong lòng bàn tay. Mesh rìu được xoay tĩnh 180° quanh cán khi bind để lưỡi hướng ra ngoài, không đổi hướng cán hay điểm nắm; không lật gương geometry. Cần kiểm tra thêm xuyên áo/giáp ở một số góc vì asset rìu là mesh riêng.

- `.blend` nguồn có skeleton, mesh và NLA clips: `assets/3D model/pangu/pangu-animated.blend`.
- Candidate: `assets/3D model/pangu/pangu-candidate.glb`; sau rà render chép vào `apps/client/public/assets/models/pangu.glb`.
- Runtime khoảng 4,85 MB; thân 29.723 tam giác, rìu 11.992; texture 1024/JPEG quality 88; GLB nhúng texture và 33 xương. Exporter chọn/chuẩn hóa bốn trọng số lớn nhất mỗi vertex.
- `tools/assets/render-pangu-preview.py`: render pose; thêm `-- --motion` cho chuỗi và `-- --side` cho góc bên. Preview ở `plans/261024-1154-pangu-fbx/`, là render Blender, không phải capture game.

## Runtime và thời gian

`visual-pangu-model.ts` là lớp bọc của loader chung `visual-hero-model.ts` (cache container theo scene, tạo instance/rig riêng từng actor); cấu hình Bàn Cổ nằm ở `HERO_MODELS.h01B` trong `hero-models.ts`, xem [model 3D tướng](hero-3d-models.md). Body rest cao 4,8 đơn vị, HP ở 5,1; mesh thân/rìu chọn được qua actorId. Hit-stop, hit flash, reduced motion, cleanup và fallback hình học giữ đường hiện có.

`pangu-model-motion.ts` lấy đỉnh lấy đà ở `18/68` và pose bổ ở `24/68` của clip mới. Cast giơ rồi giữ; strike tiếp từ đó. Giữ pose qua khoảng chờ snapshot tối đa .5 giây, hủy khi di chuyển/hành động khác/timeout.

Đánh thường hiển thị tối đa .85 giây ở 1×. `battlefield.ts` dùng hàm `attackInterval` trên snapshot chỉ để tính tốc độ trình bày: giới hạn clip trong 95% chu kỳ đánh thực và chia cho tốc độ trận. 2×/4×, trang bị và haste không làm actor liên tục reset trước khi bổ. Walk dùng thời lượng nguồn `40/30` giây, clock theo tốc độ trận. Sát thương, luật và nhịp đánh thật vẫn thuộc server.

Log `visual.hero-model.load`, `.loaded` (`model: pangu`, nguồn standing-walk-forward-2026-10-24-grip-up-blade-forward) và `.fallback`; trước 2026-10-25 là `visual.pangu-model.*`. Không ghi token/tên người chơi.

## Kiểm tra và cập nhật phiên chơi

Đã xuất GLB, xem chuỗi đi/đánh cùng pose giơ/bổ từ góc trước/bên và rà nguồn. **Chưa chạy typecheck, test, build hoặc game; chưa nghiệm thu FPS/hình ảnh.** Người dùng chạy:

```powershell
npm run typecheck
npm test -- apps/client/test/visual-pangu-model.test.ts apps/client/test/visual-pig-model.test.ts apps/client/test/pangu-motion.test.ts apps/client/test/hero-skinned-enemy.test.ts
```

Dừng server cũ → chạy lại `start-game.cmd` để build/khởi động bản mới → Ctrl+F5. Thử Bàn Cổ đi/dừng tám hướng, đánh thường và Q, tốc độ 1×/2×/4×, buff tốc đánh, HP/chọn tướng, reduced motion, chết/rời trận. Xem điểm nắm rìu và xuyên áo/giáp khi đổi camera; xem log tải/fallback.
