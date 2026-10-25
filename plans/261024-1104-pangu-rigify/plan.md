# Rigify Bàn Cổ

Superseded: người dùng bổ sung FBX đi/đánh có skin và yêu cầu tích hợp trực tiếp. Xem [kế hoạch nguồn FBX](../261024-1154-pangu-fbx/plan.md). Bản Rigify không được chọn cho runtime.

Outcome: thay rig và chuyển động không tự nhiên của bản thử trước bằng rig Rigify thật, walk tiếp đất/nhấc chân/chuyển trọng tâm và attack điều khiển đường rìu qua IK tay.
Constraints: giữ model người dùng, idle tĩnh, contracts/gameplay không đổi; không chạy test/build/game. Giữ metarig, control rig và action nguồn trong .blend; GLB chỉ chứa deform rig đã bake.
Non-goals: thay nhận diện, thêm kỹ năng hay tướng khác.
Acceptance: control rig do Rigify generate; feet IK có stance/swing rõ; tay bám cán rìu; lấy đà → bổ → thu thể hiện qua hông/thân/đầu gối; bake idle/walk/attack giữ hợp đồng runtime.

Scout: Blender 5.2 có Rigify bundled; script cũ xoay thẳng xương theo sin, không IK/foot contact, wrist compensation lớn. Runtime hiện đã hỗ trợ clips và cast hold. Tập trung sửa pipeline Blender và asset, cập nhật regression contract nếu đổi tên bone.

Plan reviewed: tạo metarig theo tỷ lệ mesh; dùng generated IK/control rig; bake qua deform-only export rig; render cả front/side và motion trước khi thay bản runtime. Không tự chạy game.

- [ ] Metarig + Rigify, bind/weight.
- [ ] Walk/attack theo IK và bake.
- [ ] Rà render, xuất asset, cập nhật tài liệu/test nguồn, bàn giao.
