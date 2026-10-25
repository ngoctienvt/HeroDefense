# Standing Walk Forward cho Bàn Cổ

- Outcome: đổi riêng clip đi, tiếp tục cầm rìu đúng hướng ở tay phải; giữ attack/idle/gameplay.
- Đã chép `D:/Downloads/models_3d_2026-10-24/Standing Walk Forward.fbx` vào `assets/3D model/pangu/animation-source/standing-walk-forward.fbx`, lưu hash. Converter đối chiếu thành công rest skeleton 33 bone với FBX attack.
- Clip walk mới frames1–41,30fps, duration40/30s; đã thay cả đường import và provenance. Giữ wrist carry up, point nắm RightHand và blade roll180° đã sửa. Production log minimum shaft-upZ0.989759 toàn walk.
- Đã xuất lại `.blend`, candidate và chép vào runtime pangu.glb (4.852.064byte). Renderer có lựa chọn --walk-only; regression test đọc duration thực41 frame và rà toàn clip thay vòng32 frame cũ. Debug loaded ghi standing-walk-forward.
- Đã xem render pose đi và đọc lại pipeline/source routing. Không chạy typecheck/test/build/game; chưa nghiệm thu trong game. Người dùng dừng server → start-game.cmd → Ctrl+F5; thử đi/dừng tám hướng và attack/Q, xem hướng cán/lưỡi khi đổi camera.
