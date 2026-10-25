# Phase 5 — Rail 5 nút, gộp/tách bảng, ẩn Admin

## Rail mới

Rail còn 5 nút, mỗi nút có icon, nhãn và phím tắt:

| Nút | Phím | Nội dung |
|---|---|---|
| Chiêu Mộ | `B` | như cũ, làm lại bố cục |
| Ghép Tướng | `C` | overlay như cũ, đổi sang token và icon |
| Đội Hình | `P` | 5 ô xuất trận + bộ sưu tập, nơi duy nhất để nâng trang bị và bán tướng |
| Duyên & Trận | `T` / `F` | một bảng hai tab: Duyên Phận (`T`) và Trận Pháp (`F`) |
| Cẩm Nang | `?` / `F1` | hai tab: Điều khiển và Tàng Kinh Các (tra cứu 70 tướng) |

Mỗi nút có thể gắn chấm báo:

- Chiêu Mộ: đang chờ chọn tướng (`pendingChoice`), hoặc đủ Đạo Duyên cho gói tốt nhất đã mở.
- Ghép Tướng: có ít nhất một công thức đủ nguyên liệu.
- Duyên & Trận: có điểm trận pháp chưa dùng.

## Admin (theo quyết định người dùng)

- Bỏ khỏi `railItems`. Bỏ dòng `K` trong Cẩm Nang. Bỏ link "Admin test tướng [K]" trong Chiêu Mộ.
- Phím `K` vẫn gọi `togglePanel('admin')`. Drawer Admin dùng tiêu đề "Admin" và không hiện phím.
- Không đổi server hay contract.
- Chuyển code Admin sang `panel-admin.ts`. Thay emoji bằng icon. Không cần làm đẹp thêm.

## Các bảng

### Chiêu Mộ (`panel-shop.ts`)

- Dùng chung `summonPackState()` và thẻ chọn tướng với thanh chiêu mộ nhanh (phase 4), để hai nơi luôn hiện giống nhau.

- Ba thẻ gói ngang nhau, gồm:
  - Tên gói.
  - Giá có icon Đạo Duyên.
  - Mở từ đợt mấy; khi còn khóa thì hiện icon `khoa` và chữ "Mở từ đợt 6".
  - Tỷ lệ thành công và tỷ lệ theo phẩm.
  - Thanh bảo hiểm `2/4`.
- Tỷ lệ lấy từ `SUMMON_PACKS` nếu rules có sẵn. Nếu không, chuyển chuỗi cứng ở `panels.ts:56` sang `ui-labels.ts` kèm chú thích nguồn.
- Khi đang chờ chọn tướng: hiện 3 thẻ tướng lớn (chân dung, phẩm, hệ, vai, tên kỹ năng) và nút "Chọn". Phần cửa hàng Linh Đan bị làm mờ.
- Cửa hàng Linh Đan là mục riêng có tiêu đề, mỗi món một dòng gồm icon, tên, mô tả và giá.

### Đội Hình (`panel-roster.ts`)

- **Hàng 5 ô**: thẻ giống dock nhưng to hơn, có nút trang bị dạng `[icon] +3 → +4 · 1.200 LT`, tự khóa khi thiếu vàng hoặc đã tối đa, và nút "Thu hồi".
- **Bộ sưu tập**:
  - Lưới thẻ nhỏ, có bộ lọc theo phẩm và ô tìm tên.
  - Tướng có thể hợp nhất (đủ 3 bản cùng sao) được gắn nhãn vàng.
  - Nút trên mỗi thẻ: Xuất trận (ô trống đầu tiên), Hợp nhất, Bán. Bán phải qua `confirmDialog`, hiện số tài nguyên nhận lại nếu rules cung cấp.
- Gom khối nút trang bị đang lặp ở thẻ ô và thẻ bộ sưu tập thành `gearButtons(unit, player, send)`.
- Bỏ Tàng Kinh Các khỏi Đội Hình.

### Duyên & Trận (`panel-bonds.ts`)

- **Tab Duyên Phận**: mỗi duyên là một hàng gồm tên, các chân dung thành viên (mờ nếu chưa xuất trận) và mốc `2 · 4 · 6` với mốc đã đạt được tô sáng. Duyên đang kích hoạt xếp lên đầu.
- **Tab Trận Pháp**: trận đang dùng hiện nổi ở đầu, có cấp và mô tả. Danh sách bên dưới gồm nút "Dùng" và "Nâng cấp (1 điểm)". Hiện điểm còn lại và giới hạn cấp ("cấp 4 mở từ đợt 16").
- `T` mở tab Duyên Phận, `F` mở tab Trận Pháp. Nếu bảng đang mở đúng tab đó thì phím sẽ đóng bảng.

### Cẩm Nang (`panel-guide.ts`)

**Tab Điều khiển** liệt kê lại theo đúng mã đang chạy:

- Camera: WASD và mũi tên, rê chuột ra mép màn hình, lăn chuột để phóng to/thu nhỏ, giữ chuột giữa để kéo, `Tab` để đổi góc nhìn (không phải căn giữa), `Space` để căn giữa vào tướng.
- Chọn tướng: chuột trái, kéo khung; `Shift` để thêm vào nhóm. Ctrl + kéo: kiểm tra lại `battlefield.ts:156` trước khi ghi.
- Lệnh: chuột phải, `Z` hoặc `Shift+A`, `X`, `H`, `Q`.
- Nhóm: `1–5` chọn theo ô, `Ctrl+1–9` lưu nhóm, `6–9` gọi nhóm.
- Bảng: `B`, `C`, `P`, `T`, `F`, `?`, `Esc`.

Chia theo các nhóm trên; mỗi phím hiện dạng `<kbd>`.

**Tab Tàng Kinh Các**: tìm kiếm và lọc theo phẩm, hệ, vai. Mỗi tướng dùng `heroDetail()`.

## Router

`panels.ts` chỉ giữ `type Panel` và `renderPanel`. `main.ts` giữ state tab của từng bảng (`bondsTab`, `guideTab`) để khi render lại không bị nhảy tab.

## Người dùng kiểm tra

- Rail có đúng 5 nút, không có Admin. Nhấn `K` vẫn mở được Admin.
- Nhấn `T` rồi `F` thì đổi tab trong cùng bảng. Nhấn lại `F` thì bảng đóng.
- Trong Đội Hình: nâng trang bị hiện giá và khóa khi thiếu vàng. Bán tướng có hộp xác nhận.
- Mọi dòng trong Cẩm Nang khớp với thao tác thật.
