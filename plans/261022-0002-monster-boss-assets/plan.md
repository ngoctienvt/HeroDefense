---
title: "40 asset quái và boss Thiên Đạo"
description: "20 quái + 20 boss; chuẩn sprite tướng, boss có silhouette và diễn xuất riêng."
status: in_progress
priority: P1
effort: "Ước lượng sau pilot; chưa cam kết số lượt tạo ảnh hoặc chi phí"
tags: [assets, monsters, bosses, sprites]
created: 2026-10-22
---

# 40 asset quái và boss Thiên Đạo

## Overview

Sản xuất **40 thiết kế cá thể: 20 quái + 20 boss**, gồm nâng chuẩn 4 quái và 1 boss cũ, thêm 35 thiết kế mới. Cả 40 đạt cùng chuẩn hoàn thiện với tướng; boss được đầu tư thêm hình khối, diễn xuất và lớp hiệu ứng đặc trưng. Người dùng đã duyệt roster/brief hiện tại và yêu cầu tiếp tục trọn phạm vi không chờ duyệt thêm. Sáu master pilot đã có; theo chỉ đạo mới, tạm bỏ Đế Giang khỏi phần hoàn thiện art pilot vì các hướng tạo thử chưa giữ được brief. Năm pilot còn lại tiếp tục; chưa có art mới được tích hợp runtime.

## Quyết định và ranh giới

- Người dùng chốt ngày 22-10-2026: 40 tổng cộng, nâng 5 cũ; ưu tiên nhiều boss hơn; art riêng từng thành viên boss đôi/nhóm, giữ gameplay hiện tại. Người dùng đã duyệt đề xuất tỉ lệ **20/20**, roster và brief Ngũ Hành.
- Người dùng thu gọn action: **không cần hit/death**, tập trung di chuyển và attack. Bộ bắt buộc chỉ idle tĩnh + di chuyển + attack bốn hướng; không sản xuất cast/entrance/chuyển phase riêng trong phạm vi này.
- Boss đôi/nhóm: nhiều sprite trình bày dưới **một enemy server**, chung HP, selection và kết quả thắng/thua. Không tự tạo 2–4 mục tiêu, đòn đánh hoặc nguồn sát thương độc lập.
- Thiết kế mới trong [roster](./roster.md) là sáng tác cho bản web. Tên tám phụ bản/boss có trong catalog; ngoại hình chi tiết chưa có chứng cứ phục dựng Warcraft.
- Tạo đủ thư viện 40 bộ. Chỉ thay asset của nội dung hiện có; phân bổ 23 thiết kế mới ngoài các slot hiện hữu vào wave/phụ bản cần quyết định gameplay riêng. Con số 23 = 16 quái mới + 7 boss mới; 12 boss phụ bản có tên hiện hữu nhưng chưa có bộ sprite riêng.
- Không đổi balance, số quái, tốc độ, bán kính sát thương, collision, chiến lợi phẩm, lịch mở phụ bản. Không sửa tay `content/data/catalog.json`, không dùng art Warcraft.
- Dùng master Bàn Cổ làm tham chiếu phong cách; không sao chép nhận diện tướng sang quái. Giữ pipeline master → bốn hướng → các khung sprite tĩnh trong sheet hành động mà dự án đã chọn; không dùng image-to-video cho nhân vật.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | 40 cá thể khác silhouette, vật chất và chuyển động; không đếm đổi màu thành mẫu mới | P1 |
| 2 | Bốn hướng độc lập, idle tĩnh và chuyển động walk/attack thật; không hit/death | P1 |
| 3 | Boss epic nhưng vẫn đọc được vị trí chân, mục tiêu, HP và vùng báo chiêu | P1 |
| 4 | Có source, prompt, provenance, WebP+JSON, preview và QA cho từng bộ | P1 |

## Căn cứ đã đọc

- [README](../../README.md), [gameplay](../../docs/gameplay-spec.md), [Bàn Cổ](../../docs/pangu-sprites.md), [Linh/Huyền](../../docs/linh-huyen-sprites.md).
- `packages/game-core/src/horde-waves.ts`: m001 Thanh Lang, m002 Cốt Cung Thủ, m003 Trư Yêu, m004 Huyết Dơi, b001 Hắc Phong.
- `apps/client/src/monster-motion.ts`: 7 pose một góc, east lật gương; `visual-sprites.ts`: kích thước riêng cho 5 ID. Đây là giới hạn cần thay, không tái dùng làm chuẩn mới.
- `packages/game-core/src/dungeons.ts`: tám phụ bản, một enemy mỗi lượt, chưa gán `monsterId`; xử lý kết thúc giả định một boss. Giữ invariant này.
- `tools/assets/pack-monster-motion.py`: packer hiện crop pose/bbox; cần mở rộng theo manifest và registration thống nhất, giữ nhánh cũ khi chưa chuyển xong.
- [Kế hoạch khoảng cách quái](../261019-1303-monster-spacing/plan.md) liên quan footprint; [đảo lơ lửng](../261020-1420-floating-island-map/plan.md) là bối cảnh nghiệm thu. Hai phần đã có nguồn triển khai, chưa có phụ thuộc triển khai chặn kế hoạch art này; không sửa trạng thái nghiệm thu của chúng.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Khóa art và pilot khó](./phase-01-start.md) | In progress |
| 2 | [Sản xuất đủ 40 bộ](./phase-02-production.md) | In progress (prompt coverage; partial master/direction/action candidates; packaging pending) |
| 3 | [Tích hợp và nghiệm thu](./phase-03-integration.md) | In progress (manifest runtime foundation; art integration pending) |

Chi tiết nhận diện: [Roster 40 cá thể](./roster.md). Hợp đồng đầu ra: [Chuẩn art và QA](./art-contract.md).

## Trình tự và cổng duyệt

Khóa roster → master pilot → bốn hướng pilot → hành động/alpha pilot → tích hợp thử nội dung hiện có → người dùng xem trong game → sản xuất từng lô → nghiệm thu toàn bộ.

Pilot ban đầu gồm Thanh Lang (bốn chân), Huyết Dơi (bay), Hắc Phong (boss có event thật), Đế Giang (nhiều chi) và cặp Kim/Ngân Giác (hai thiết kế, một entity). Tổng 6 cá thể, tính trong 40. Người dùng sau đó cho phép bỏ qua Đế Giang nếu khó đạt chuẩn; tạm loại asset này khỏi sản xuất pilot, giữ roster ID và master concept hiện có, không tính là bộ hoàn chỉnh. Năm pilot khác tiếp tục. Ngày 2026-10-23, người dùng yêu cầu ưu tiên sản xuất boss trước, làm theo batch và giới hạn thời gian sửa trên từng cá thể; các monster legacy/new được hoàn thiện sau boss. Phase 1 gồm sản xuất/QA pilot và lát tích hợp; người dùng yêu cầu không chờ cổng duyệt hoặc nghiệm thu trong game để tiếp tục sản xuất, nên phase 2 đã bắt đầu phần master lô A trong khi phase 1 còn mở. Phase 3 đã bắt đầu làm consumer manifest song song, nhưng không tích hợp/đánh packaged art trước khi source, action và QA đạt hợp đồng; không ghi nghiệm thu game thay người dùng. Không tạo hàng loạt 40 master rồi mới phát hiện sai camera hoặc scale.

## Quy mô và tài nguyên

- Baseline đề xuất: quái 52 frame/cá thể; boss 68 frame/cá thể. 20 × 52 + 20 × 68 = **2.400 frame runtime** trước mọi bổ sung cho walk/attack; không tính master, turnaround, portrait hoặc atlas nhóm phái sinh. Xem phép tính trong art-contract.
- Đây là sàn lập kế hoạch pose, không bảo đảm độ mượt. Boss nhiều chi hoặc vũ khí dài được tăng frame/canvas sau pilot; không hạ chất lượng để giữ số frame.
- Không chốt ước lượng ngày hoặc tiền khi chưa biết số lượt sửa thực tế. Sau 6 pilot ghi số lượt generate/edit, thời gian xử lý/QA, dung lượng và route; dự báo 34 bộ còn lại từ từng loại cơ thể. Chỉ ghi chi phí nếu công cụ trả số liệu, không đoán giá.
- Không tải 40 atlas cùng lúc. Tải theo encounter/làn/khu vực, preload phần sắp dùng, dùng chung texture giữa actor, thu hồi khi hết tham chiếu. WebP nhỏ trên đĩa không đồng nghĩa texture GPU nhỏ.
- Ví dụ ngân sách, không phải số đã đo: một atlas RGBA 2048² khoảng 16 MiB, mipmap đầy đủ khoảng 21,3 MiB; 40 atlas cùng resident khoảng 640/853 MiB, chưa tính tướng/VFX/map. Pilot phải đo cả bộ nhớ giải nén và texture đồng thời.

## Success Criteria

- [ ] Đủ 40 ID cá thể, 20 quái/20 boss; 5 ID cũ giữ tương thích; không lấy recolor thay số lượng.
- [ ] Tất cả có master, bốn hướng đúng, action hoàn chỉnh, source/provenance, export và QA.
- [ ] Không dùng lật gương hoặc biến dạng ảnh tĩnh làm chuyển động chính; idle đứng im.
- [ ] Boss nhóm hiện đủ thành viên bằng art riêng, vẫn một enemy/HP/kết quả server.
- [ ] Không chặn sản xuất lô tiếp theo chờ duyệt; người dùng nghiệm thu trong game độc lập sau build mới, không tự ghi pass thay họ.
- [ ] Phân biệt rõ bộ art đã hoàn thiện, asset đã tích hợp, đã build, đã chạy, đã nghiệm thu.

## Kiểm tra và bàn giao

Agent đọc lại source/manifest, kiểm tra hợp đồng giữa các lớp và viết/cập nhật test khi triển khai. Theo AGENTS.md, agent không tự chạy test/build/game trong phạm vi hiện tại. Người dùng chạy `npm run typecheck`, `npm test`, `npm run build`; dừng server cũ → `start-game.cmd` → `Ctrl+F5` để xem bản mới. Không cần chạy các lệnh này chỉ để đọc kế hoạch.

## Câu hỏi còn mở

- Tỉ lệ 20 quái/20 boss, roster và brief hiện thân Ngũ Hành Linh Giới đã được người dùng duyệt.
- Sau pilot: ngân sách dung lượng/bộ nhớ và lịch sản xuất; chưa có số đo để cam kết.

<!-- slug: monster-boss-assets -->
