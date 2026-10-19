---
phase: 4
title: "Chuyển ~25 module cũ sang kit và registry"
status: in-progress (đã chuyển định tuyến; chờ người dùng replay)
dependsOn: [2, 3]
---

# Giai đoạn 4: Chuyển module cũ sang kit

> Đây mới là khung. Sẽ viết chi tiết đầu phiên.

**Phạm vi:** các module `visual-{pangu,xingtian,douzhan,kimthien,hangnga,nuwa,hienvien,shennong,chuclong,fuxi,tuong-than,phuong-hoang,hau-nghe,kimsi,khuongtu-nha,tayvuongmau,lucnhi,truong-dao-lang,divine,boss-earth*}.ts` cùng các script pack khác (huyen, beidou, boss-earth).

**Skill:** chạy theo `vfx-skill` (mục 1–6) cộng `docs/vfx-kit.md`. Mỗi phiên chỉ nạp skill, tài liệu kit và bảng đặc tả của lô.

**Cách làm (tiết kiệm token):**
- Mỗi module thành `HeroVfx`: phần lặp (pool, depth, material) đổi sang kit; phần riêng thành `signature`.
- Chia lô theo nhóm file, không trùng file giữa các lô. Chạy song song bằng Sonnet. Mỗi agent chỉ đọc `docs/vfx-kit.md` và module của mình.
- Mỗi lô có bảng trước/sau gồm: event xử lý, điểm phát, bán kính, thời lượng, cap.
- Thay chuỗi `if skillId` trong `visual-effects.ts` bằng registry. Mỗi lô chỉ xóa nhánh `if` của các tướng mình phụ trách; một agent riêng giữ quyền sửa `visual-effects.ts` để tránh xung đột.

**Nghiệm thu:** người dùng replay từng lô; không còn nhánh `if` theo từng tướng; `visual-effects.ts` giảm mạnh số dòng.

\* `boss-earth` là VFX boss, chỉ chuyển nếu dùng chung được kit.

## Trạng thái phiên

- Xong: 24 hero id (19 module + 5 divine) và 7 hero nhỏ (h015, h00J, h03U, h00U, h003, h005, h008) đăng ký registry qua `visual-hero-adapter*.ts`; xóa toàn bộ nhánh `if skillId` theo từng tướng khỏi `showCast`/`show`/`tick`/`clear` của `visual-effects.ts` (≈300 dòng); test `visual-hero-adapters.test.ts`.
- Chưa làm: đổi nội tại pool/material của module cũ sang shader kit; `visual-boss-earth` (VFX boss, không dùng chung kit); script pack huyen/beidou/boss-earth; còn 6 nhánh `web-h00x` là accent trong đường chung theo profile (không phải nhánh riêng một module).
- Cần duyệt: replay từng tướng ở `?debug=1`, đối chiếu hình y như trước (lô này chỉ đổi cách gọi, không đổi hình).

## Kit cần bổ sung

- Nếu cần chuyển sâu: `AbilityExtra` hiện chỉ có `targets`/`hasOrigin`; mark snapshot có tham số riêng (remaining, radius, kind) chưa vào `HeroVfx.mark`.
