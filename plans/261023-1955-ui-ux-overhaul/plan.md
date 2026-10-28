---
title: "Hoàn thiện UI/UX: gọn, đồng bộ phong cách, dễ phân biệt"
description: "Dọn HUD/bảng DOM và chỉ báo trên chiến trường: một hệ token màu, bộ icon SVG vẽ tay theo phong cách game, rail còn 5 nút, menu cài đặt, tooltip kỹ năng khi rê chuột, thanh máu phân biệt phe."
status: implemented-unverified
priority: P1
effort: 32h
branch: feat/ui-ux-overhaul
tags: [client, ui, ux, hud, icons, babylon]
blockedBy: []
blocks: []
created: 2026-10-23
---

# Hoàn thiện UI/UX

## Kế hoạch nối tiếp cho trang bị

[Kho icon và kéo thả trang bị 28-10-2026](../261028-1413-gear-drag-drop-ui/plan.md) đề xuất cập nhật riêng khay đồ/dock, Kho I, tooltip và tương tác với chiến trường. Giữ phong cách/token và luồng RTS của kế hoạch này; không thiết kế lại toàn bộ HUD. Chỉ mới lập kế hoạch, chưa đổi source theo đề xuất mới.

## Kết quả mong muốn

Người chơi mới nhìn một lần là biết: đang ở đợt mấy, còn bao lâu, Linh Trụ còn bao nhiêu máu, boss đang làm gì, tướng nào của mình, kỹ năng nào sẵn sàng, bấm đâu để chiêu mộ/ghép/xếp đội. Toàn bộ giao diện dùng chung một bảng màu, một bộ icon và một bộ thuật ngữ.

## Đã chốt với người dùng (2026-10-23)

- **Admin**: bỏ khỏi mọi chỗ nhìn thấy được (rail, cẩm nang, link trong Chiêu Mộ). Phím `K` vẫn mở bảng Admin. Không chặn lệnh admin ở server.
- **Icon**: agent tự làm bộ icon theo phong cách game, trực tiếp trong repo, không qua Codex. Icon phải đọc được bằng hình, không dựa vào chữ Hán/triện. Bỏ hết emoji. Người dùng để agent tự chọn cách làm; agent chọn SVG viết tay trong code vì nét rõ ở 16 px, đổi màu được theo hệ và phẩm, và không cần file ảnh.
- **Phạm vi**: HUD DOM và chỉ báo trên chiến trường Babylon (thanh máu, vòng chọn, rê chuột).
- **Cắt gọn**:
  - Nâng trang bị chỉ làm ở Đội Hình; dock chỉ hiện cấp.
  - Gộp Duyên Phận và Trận Pháp thành một bảng có hai tab.
  - Gom các nút phụ vào menu Cài đặt (⚙).
  - Tàng Kinh Các thành tab riêng trong Cẩm Nang.
- **Thêm**:
  - Rê chuột lên thẻ tướng ở dock hoặc lên tướng trên sân để xem kỹ năng, trạng thái và hồi chiêu.
  - Thanh chiêu mộ nhanh nằm ngoài bảng, luôn hiện cạnh dock: thấy ngay 3 gói, giá và trạng thái khóa/mở; nhấp một lần là mua (phase 4).
- **Thuật ngữ**: căn cứ gọi là **Linh Trụ** ở mọi nơi.

## Không làm

- Không đổi luật chơi, số liệu, contract mạng hay quyền lệnh. Ngoại lệ duy nhất là hook `onHover` nội bộ của client.
- Không làm UI di động, vì game chỉ chạy trên máy tính với chuột và bàn phím.
- Không vẽ lại chân dung hoặc sprite tướng.

## Phases

| # | Phase | Trạng thái | Phụ thuộc | Effort |
|---|---|---|---|---|
| 0 | [Chuẩn bị: tách nhánh, ảnh gốc, thuật ngữ](phase-00-baseline-branch-glossary.md) | code xong, chờ nghiệm thu | — | 2h |
| 1 | [Token màu + tách styles.css theo bề mặt](phase-01-design-tokens-css-split.md) | code xong, chờ nghiệm thu | 0 | 4h |
| 2 | [Bộ icon SVG theo phong cách game](phase-02-hand-drawn-svg-icon-set.md) | code xong, chờ nghiệm thu | 1 | 6h |
| 3 | [Thanh trên + menu Cài đặt](phase-03-top-hud-settings-menu.md) | code xong, chờ nghiệm thu | 1, 2 | 3h |
| 4 | [Dock, chiêu mộ nhanh, thanh hành động, tooltip kỹ năng](phase-04-dock-action-bar-skill-tooltip.md) | code xong, chờ nghiệm thu | 1, 2 | 7h |
| 5 | [Rail 5 nút, gộp/tách bảng, ẩn Admin](phase-05-rail-panels-admin-hidden.md) | code xong, chờ nghiệm thu | 1, 2 | 5h |
| 6 | [Chỉ báo chiến trường: phe, vòng chọn, rê chuột](phase-06-battlefield-indicators.md) | code xong, chờ nghiệm thu | 1, 4 | 3h |
| 7 | [Dọn mã chết, test hồi quy, tài liệu](phase-07-cleanup-tests-docs.md) | code xong, chờ nghiệm thu | 3–6 | 2h |

Phase 3, 4 và 5 đều sửa `main.ts`, nên làm tuần tự theo thứ tự 3 → 4 → 5. Không chạy song song.

## Trạng thái (2026-10-23)

Mã nguồn của 8 phase đã được sửa và commit trên nhánh `feat/ui-ux-overhaul`. Agent **chưa** chạy typecheck, test, build hay game (theo AGENTS.md); các file chỉ được esbuild parse cú pháp. Bộ icon đã được kết xuất ra ảnh và xem ở 16/20/28 px trên nền tối và sáng. HUD trong game chưa được nghiệm thu bằng hình ảnh.

Khác plan ban đầu:
- **Nhấp nháy khi máu thấp:** thanh máu trên sân chỉ sẫm màu khi dưới 35%, không nhấp nháy.
- **Tín hiệu hình dạng cho phe:** chỉ có vạch vàng ở tướng mình và khung vàng dày ở boss/đầu lĩnh; bỏ ý tưởng khung góc nhọn cho quái.
- **Admin trong Ghép Tướng:** bảng Ghép Tướng từng hiện nút Admin "Nhận test" và "+ Mua" cho mọi người chơi; các nút này đã được gỡ để đúng quyết định ẩn Admin.
- **Logic dùng chung với server:** `sellRefund`, `SUMMON_PITY` và `SUMMON_FAIL_PELLETS` được tách sang `game-core/rules.ts` để client dùng chung thay vì chép số; hành vi server giữ nguyên.

## Kiến trúc đích (client)

```
apps/client/src/
  ui.ts                      el/button/heading/number (giữ, bỏ phần thẻ)
  ui-labels.ts               thuật ngữ + formatter: starText, tierLabel, gearLabel, roleLabel, elementLabel
  ui-palette.ts              màu ngữ nghĩa (một nguồn cho cả CSS và Babylon)
  ui-icons.ts                bộ icon SVG + icon(name, opts)
  hero-status.ts             hpPercent, energyState (rage/cooldown), abilityReady — dùng chung cho dock, action bar, battlefield
  hud-top.ts                 thanh trên + menu Cài đặt
  hud-dock.ts                badge người chơi + 5 thẻ tướng
  hud-summon-bar.ts          thanh chiêu mộ nhanh (3 gói) + chọn tướng khi có pendingChoice
  hud-action-bar.ts          thanh hành động của tướng đang chọn
  hud-tooltip.ts             tooltip kỹ năng (dock + chiến trường)
  panel-shop.ts | panel-roster.ts | panel-bonds.ts | panel-guide.ts | panel-admin.ts
  panels.ts                  chỉ còn router renderPanel + kiểu Panel
  craft-board.ts             giữ, đổi sang token + icon
  styles/                    base.css, tokens.css, lobby.css, hud-top.css, hud-dock.css, rail-drawer.css, panels.css, craft.css, admin.css, tooltip.css
```

## Kiểm tra và bàn giao

Agent không chạy game, typecheck, test hay build (theo AGENTS.md). Sau mỗi phase, người dùng làm các bước sau:

1. Dừng server cũ.
2. Chạy `start-game.cmd`.
3. Bấm `Ctrl+F5`.
4. Kiểm tra các màn hình ghi trong mục "Người dùng kiểm tra" của phase đó.

Lệnh kiểm tra cho người dùng: `npm run typecheck`, `npx vitest run apps/client/test`.

## Ràng buộc kỹ thuật chung (áp cho phase 3–6)

- **Lớp nổi đặt ngoài các vùng bị dựng lại.** `render()` dựng lại `hudTop`, `hudDock` và `hudActionBar` bằng `replaceChildren` ít nhất một lần mỗi giây trong trận, vì `remaining` và `abilityCooldown` nằm trong `hudKey`. Do đó:
  - Menu ⚙, tooltip và hộp xác nhận gắn vào một lớp `hud-overlay-layer`, là sibling của `game`.
  - Trạng thái mở và id tướng đang được rê chuột giữ trong `main.ts`.
  - Sau mỗi lần render, tìm lại anchor theo `data-slot` hoặc `data-unit-id`, rồi làm mới nội dung tooltip từ snapshot mới.
  - Bắt sự kiện rê chuột bằng delegation trên container dock và thanh hành động, không gắn listener cho từng thẻ.
- **Bàn phím khi có lớp nổi.** Khi hộp xác nhận hoặc popover đang mở, keymap chỉ xử lý `Esc`, và `Esc` chỉ đóng lớp trên cùng. Các phím `B/C/P/1–5/Q/X/H` bị chặn cho tới khi lớp đó đóng.

## Rủi ro

- **Lẫn diff**: cây làm việc đang có rất nhiều thay đổi VFX chưa commit, trong đó có `main.ts`, `panels.ts`, `ui.ts` và `styles.css`. Phase 0 bắt buộc commit phần VFX trước, hoặc tách nhánh.
- **Lệnh admin vẫn mở trên server**: người biết phím `K` hoặc tự gửi lệnh vẫn dùng được. Người dùng đã chấp nhận điều này.
- **Icon tự vẽ có thể kém thẩm mỹ**: mỗi icon được duyệt ở cỡ thật 16, 20 và 28 px trên nền tối của HUD trước khi thay hàng loạt. Có trang xem trước `?icons=1` (phase 2).

## Câu hỏi mở

1. Màu phe trên thanh máu (phase 6) đang đề xuất: tướng của mình xanh lục, tướng đồng đội xanh lam ngọc, quái đỏ, boss/đầu lĩnh đỏ có viền vàng. Để người mù màu đỏ-lục vẫn phân biệt được, thêm tín hiệu hình dạng: thanh quái có khung góc nhọn, thanh phe ta có đầu tròn, tướng mình có chấm nhỏ. Nếu người dùng không phản đối, làm theo đề xuất này.
