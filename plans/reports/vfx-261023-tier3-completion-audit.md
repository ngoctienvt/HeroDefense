# Rà điều kiện hoàn tất VFX bậc 3

Phạm vi: mười tướng bậc 3 còn lại, làm tuần tự h00J/K/L/M/N/O/P, h03Q/R/S; h00Q Long Vương đã có. Không sửa lại Phượng Hoàng người dùng đã chỉnh. Nguồn quyết định: [kế hoạch](../261022-tier3-sequential-vfx/plan.md), [bảng nhịp từng tướng](../../docs/tier3-vfx.md), event/snapshot trong game-core/contracts.

## Bằng chứng nguồn trước đợt chạy

**Cập nhật 23/10:** người dùng đã cho phép chạy và sửa. Typecheck/build qua, 218/218 test tập trung qua, đã xem/lưu replay cả mười tướng và log event thật ở trận solo. [Báo cáo runtime](vfx-261023-runtime-validation.md) thay thế các trạng thái “chưa chạy” trong bảng lịch sử dưới đây.

| Điều kiện | Bằng chứng nguồn | Trạng thái |
|---|---|---|
| Bốn pha có lớp, chuyển động, thời lượng theo server | Mười bảng trong docs/tier3-vfx.md, timeline và combat tương ứng | Mười tướng đã rà nguồn; chưa chứng minh nhịp trong game |
| Tụ lực chuyển động, shader nhận uTime mỗi khung | Module charge riêng; Bát Giới giữ charge trong module chính | Mười tướng đã đọc; chưa chạy shader |
| Va chạm có hình vật chất, mảnh và dấu đất trên đúng recipients | Module art/resolve, spray riêng và routing Battlefield; hỗ trợ tách khỏi mục tiêu sát thương | Mười tướng đã rà nguồn; chưa duyệt va chạm động |
| Dư âm theo snapshot khi có trạng thái; kết thúc có chuyển động riêng | Tier3Snapshot, guard/fire/link/plume; ward/empower/sunder/shield dùng trạng thái chung; h03S receipt ngắn không gán timer cho shield | Mười tướng đã rà nguồn; chưa duyệt reconnect/exit trong game |
| Phạm vi, hướng và nhân vật rõ | Alpha bounds/anchor đo, foreground dưới hero/HP, world decal, reduced motion | Có bằng chứng nguồn/contact; cần duyệt chiến trường |
| Asset có thật tại runtime path | Đọc mười layout và đối chiếu public: đủ 50 lớp chính, cùng chip được layout h03S tham chiếu (51 file); các particle riêng khác ghi trong inventory | Đủ file tham chiếu; chưa chứng minh tải/render trong game |
| Debug, replay, cap, cleanup và regression | Registry/replay, log visual.*, pool/clear, mười file test nguồn và regression chung/core | Đã rà; chưa thực thi |

## Lỗi được tìm và sửa bằng rà tĩnh

- Tiểu Bạch Long: replay thiếu direction đúng hợp đồng.
- Sa Ngộ Tịnh: phần nhận hỗ trợ không được dùng phản hồi đau; dải không phóng cả ảnh để giả đường bay.
- Chung Quỳ: ground vẫn sống khi caster chết/đổi khu; không gate bằng vị trí caster hiện tại.
- Phán Quan: cần casterId tùy chọn để chứng minh nguồn soulLink; không suy execute khi event không có cờ.
- Ngưu Ma Vương: tâm ellipse khác đáy ảnh; đo lại tâm từng hàng và bound hình theo phép chiếu camera.
- Ngưu Ma Vương không có hướng bụi: bổ sung hình đá vỡ cục bộ tại target để vẫn đủ lớp vật chất; không bịa trục bay.
- Trầm Hương: supportTargets tùy chọn từ đúng vòng lặp server, không suy người nhận từ range/empower.
- Kit ring: reduced motion phải khóa uTime vì tắt swirl chưa dừng noise/caustics.
- Khổng Tước: pha ngắn và hai bên plume thử lấy lại mesh khi texture/pool sẵn sàng, giữ nguyên tuổi; không vẽ quạt tại aim khi thiếu caster. Event độc phụ không phát lại đòn đánh/âm thanh/phản hồi đau.
- Triệu Công Minh: sửa lời gọi API kit đúng chữ ký, replay mặc định/alias, tách đúng targets trộn quái/đồng minh và giữ plain shield không timer. Hướng/quỹ đạo inverse, giới hạn làn và retry đã rà nguồn.
- Routing chung: caster ngoài khu hoặc đang chết không làm gốc VFX modern tier3; giữ va chạm thật còn trong khu. Regression nguồn cho Bát Giới/Ngưu Ma/Phán Quan/Long Vương; đường legacy giữ ngữ nghĩa cũ.

## Nghiệm tra đã thực hiện và giới hạn

Xem [báo cáo runtime](vfx-261023-runtime-validation.md): 10 bộ ảnh nhịp canvas thật, log shader/asset, mẫu FPS, event/snapshot thật và kết quả lệnh. Toàn bộ source/asset đã tích hợp và build; không tuyên bố đã chạy launcher production mới.

Bộ toàn dự án còn 107 lỗi/2 worker timeout; không che lỗi và không đổi gameplay để ép xanh. Chưa nghiệm tra riêng reduced motion trong trình duyệt, trận nền tối, co-op 4 người hoặc toàn ma trận camera/reconnect. Đây là giới hạn của đợt QA, không dùng contact sheet để khẳng định đã duyệt những tình huống này.
