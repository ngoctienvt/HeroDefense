---
title: "Bộ kit VFX dùng chung cho 70 tướng (chuẩn Cộng Công)"
description: "Trích hạ tầng VFX của Cộng Công thành kit dùng chung, rồi đưa mọi tướng sang dạng công thức dữ liệu cộng lớp chữ ký cho bậc 5–6, giảm token cho mỗi tướng."
status: pending
priority: P2
effort: 8 giai đoạn; giai đoạn 1 khoảng 1 phiên Opus
branch: main
tags: [frontend, refactor, vfx]
blockedBy: [261020-1054-tier56-codex-ultimate-art, 261020-2126-tier34-codex-skill-art]
blocks: []
created: 2026-10-19
---

# Bộ kit VFX dùng chung (chuẩn Cộng Công)

Nguồn hợp đồng: [brainstorm](../reports/brainstorm-261019-1623-hero-vfx-kit-token-efficient.md).

## Kết quả

Cả 70 tướng có VFX đọc rõ vật chất, theo nhịp báo trước → di chuyển → va chạm → dư âm, và đồng bộ với event/snapshot server.
- Bậc 5–6: kit cộng một lớp chữ ký riêng.
- Bậc 1–4: ráp hoàn toàn từ kit theo công thức dữ liệu.
- Toàn bộ module cũ chuyển sang kit (người dùng đã chọn "chuyển hết ngay").

Chi phí cho mỗi tướng sau giai đoạn 1 chỉ còn là dữ liệu cộng (với bậc 5–6) một module chữ ký nhỏ.

## Ràng buộc

- Tuân thủ AGENTS.md: client chỉ trình bày; giới hạn số lượng và dùng pool; giữ reduced motion; log `visual.*`; không dùng asset Warcraft; TypeScript `strict`.
- Nhân vật luôn rõ nét: decal vẽ trước mọi actor, lớp vỏ vẽ ở `actorAlphaIndex - 1`.
- Agent **không** chạy game, `npm test`, typecheck hay build. Agent được phép chạy Blender và ImageMagick để tạo hoặc so sánh asset.
- Duyệt theo lô bằng `__vfxReplay(heroId, kind?)` ở `?debug=1`.
- **Mọi giai đoạn đều chạy theo skill `vfx-skill`** (`.claude/skills/vfx-skill/`):
  - mục 1: lần event thật và kiểm combat có thực sự dispatch;
  - mục 2: bảng nhịp 4 pha, số liệu lấy từ file design;
  - mục 3: shader cho hình ổn định, flipbook cho hình đổi dạng;
  - mục 4: luật đọc được, depth, hướng chiêu;
  - mục 5: tích hợp, reduced motion, log, replay;
  - mục 6: contact sheet, bàn giao phân biệt trạng thái.
  
  Nếu người dùng yêu cầu tự kiểm tra thì theo `references/review-checklist.md`.
- Skill và kit phải khớp nhau. Giai đoạn 1 cập nhật skill sang kit, nên các phiên sau chỉ cần nạp `vfx-skill` + `docs/vfx-kit.md` + bảng đặc tả của lô. Đây là đòn bẩy tiết kiệm token chính cho mỗi phiên.

## Ngoài phạm vi

Gameplay, chỉ số, mô tả chiêu, sprite thân hero, âm thanh, VFX quái.

## Các giai đoạn

| # | Giai đoạn | Trạng thái | Phụ thuộc | Model gợi ý |
|---|---|---|---|---|
| 1 | [Trích kit từ Cộng Công, giữ y nguyên hình ảnh](phase-01-extract-kit-from-congcong.md) | completed | — | Opus |
| 2 | [Pilot kit với Chúc Dung (Hỏa)](phase-02-kit-pilot-chucdung.md) | in-progress (chờ người dùng duyệt) | 1 | Opus |
| 3 | [Thư viện flipbook theo nguyên tố](phase-03-element-flipbook-library.md) | completed | 1 | Opus |
| 4 | [Chuyển ~25 module cũ sang kit và registry](phase-04-migrate-existing-modules.md) | in-progress (định tuyến xong; chờ replay) | 2, 3 | Sonnet, song song theo file |
| 5 | [Công thức bậc 1–2 (20 tướng)](phase-05-tier-1-2-recipes.md) | pending | 4 | Sonnet/Haiku |
| 6 | [Công thức bậc 3–4 (24 tướng)](phase-06-tier-3-4-recipes.md) | pending | 4 | Sonnet |
| 7 | [Lớp chữ ký bậc 5–6](phase-07-tier-5-6-signatures.md) | pending | 4 | Opus |
| 8 | [Dọn mã chết, tài liệu, credits](phase-08-cleanup-docs.md) | pending | 5, 6, 7 | Sonnet |

Giai đoạn 2–8 mới ở mức khung. Mỗi giai đoạn sẽ được viết chi tiết ngay trước khi chạy, dựa trên kit thực tế và `docs/vfx-kit.md`, để không tốn token lập kế hoạch cho phần còn có thể thay đổi.

**Bổ sung 20-10-2026 — phụ thuộc cục bộ giai đoạn7:** [Kế hoạch ảnh Codex bậc5–6](../261020-1054-tier56-codex-ultimate-art/plan.md) cung cấp inventory và nguồn ảnh tuyệt kỹ/trạng thái cho25 tướng, trừ Cộng Công. `blockedBy` trên chỉ áp dụng phần tích hợp cần lô ảnh mới trong giai đoạn7; không chặn các phần kit và giai đoạn khác độc lập. Người dùng chốt phong cách **stylized như Cộng Công** cho lô này, Cộng Công giữ vai trò chuẩn chất lượng tích hợp. Kế hoạch mới không thay phạm vi đòn thường/nội tại của toàn kit.

**Bổ sung 20-10-2026 — phụ thuộc cục bộ giai đoạn 6:** [Kế hoạch ảnh Codex bậc 3–4](../261020-2126-tier34-codex-skill-art/plan.md) cung cấp ảnh tuyệt kỹ/trạng thái cho 24 tướng bậc 3–4 và thêm hai dấu chung `shared-attack-down-mark`, `shared-vulnerable-mark`. Ảnh đi vào khe motif/flipbook/ribbon/decal của kit qua `visual-kit-recipes-tier34.ts`; bậc 3–4 vẫn là công thức dữ liệu, không thêm module riêng từng tướng. `blockedBy` chỉ áp dụng cho phần tích hợp cần lô ảnh này.

## Tiêu chí nghiệm thu toàn plan

1. Cộng Công trên kit nhìn y hệt bản cũ (người dùng so bằng replay; flipbook re-render khớp pixel với bản cũ).
2. Mọi tướng đi qua registry; `visual-effects.ts` không còn chuỗi `if skillId` theo từng tướng.
3. `__vfxReplay(heroId, kind?)` phát được mọi tướng.
4. Có test dạng bảng đối chiếu registry với catalog: bán kính, kiểu mục tiêu, đơn mục tiêu hay AoE, đủ các pha.
5. Mỗi tướng qua cổng nhận diện; test vân tay không có trùng lặp.
6. Mỗi lô qua cổng duyệt phong cách cạnh Cộng Công; test chặn import vật liệu thô.
7. Atlas của mỗi tướng hoặc nguyên tố chỉ tải khi tướng đó có mặt trên sân.

## Cách agent làm để tiết kiệm context

Mọi phiên thực hiện plan này phải tuân theo **mục 7 "Làm việc tiết kiệm context"** của `.claude/skills/vfx-skill/SKILL.md`. Quy tắc chỉ ghi ở đó, plan không chép lại. Tóm tắt:
- chỉ nạp skill, `docs/vfx-kit.md`, bảng đặc tả của lô và file design;
- Grep hoặc đọc theo đoạn thay vì đọc cả file lớn;
- một contact sheet cho mỗi flipbook, tối đa 2 lần render lại;
- một phiên làm một lô, bảng đặc tả được duyệt một lần;
- subagent rẻ hơn, có brief tự đủ và sở hữu file riêng;
- bàn giao qua file phase cùng `docs/vfx-kit.md`.

Mỗi file phase có hai mục để bàn giao: **Trạng thái phiên** và **Kit cần bổ sung**.

## Chuẩn phong cách: không hời hợt, không "đồ chơi"

Bậc 1–4 có thể nhỏ và ngắn hơn, nhưng phải **cùng chất liệu hình ảnh** với Cộng Công và sprite hero (stylized, cel shading).

**Nguyên nhân gây cảm giác đồ chơi đã gặp**: StandardMaterial tô phẳng, primitive tròn hoặc trụ hoàn hảo, texture phép chung chỉ đổi màu, chuyển động tuyến tính, đốm additive trắng xóa, vật bay không có pha lấy đà hay dư âm.

**Kit chặn những lỗi này ngay từ cấu trúc:**

1. **Mọi shader của kit đã có sẵn đủ "nguyên liệu phong cách":**
   - toon 3 bậc;
   - viền mực tối (ink);
   - mép sáng hoặc bọt;
   - nhiễu fbm phá hình học hoàn hảo;
   - palette bão hòa có bóng tối.
   
   Công thức chỉ chỉnh được tham số, không tắt được các nguyên liệu này.
2. **Thư viện chuyển động** trong `visual-kit-timeline.ts`: preset lấy đà → bứt tốc → va chạm có quá đà nhẹ (overshoot) → thu về. Công thức chọn preset, không tự viết nội suy tuyến tính.
3. **Va chạm tối thiểu 3 lớp:** hình va chạm theo vật chất (flipbook hoặc shader), mảnh văng hoặc giọt (spray), dư âm trên mặt đất (decal tan dần). Thiếu lớp nào thì test bảng báo lỗi.
4. **Flipbook thư viện** render cùng pipeline Blender với Cộng Công (cel shading, rim, outline, góc 0,84). Không dùng texture phép chung kiểu `magic_01` làm hình chính.
5. **Chặn bằng test:** file công thức không được import `StandardMaterial`, `MeshBuilder` hay `DynamicTexture`. Mọi thứ phải đi qua kit.
6. **Bảo vệ độ đọc:** giới hạn độ sáng hoặc cộng sáng để không thành mảng trắng; kiểm cả nền sáng lẫn nền tối.

**Cổng duyệt:** mỗi lô được xem **cạnh Cộng Công** trong cùng khung hình (replay hai tướng). Tiêu chí đạt: nhìn như cùng một game. Giai đoạn 2 (pilot Chúc Dung) là nơi chốt chuẩn này. Nếu bản kit còn trông "đồ chơi" thì phải nâng kit trước, chưa làm hàng loạt.

## Cổng nhận diện kỹ năng (bắt buộc với mọi tướng)

Kit chỉ dùng chung **cách vẽ** (shader, pool, depth, timeline), không dùng chung **hình chính**. Mỗi tướng phải qua đủ 4 điểm sau:

1. **Hình chính riêng** lấy từ mô tả chiêu và thần thoại của tướng (ví dụ: xích của Vô Thường, canh của Mạnh Bà, quạt của Thiết Phiến). Kit phải có khe cho hình riêng: mask hoặc motif texture, profile mesh, quỹ đạo bay. Chỉ đổi màu thì không đạt.
2. **Bảng đặc tả có cột "khác gì tướng cùng nguyên tố / cùng archetype"**. Người dùng duyệt cột này trước khi code.
3. **Test vân tay:** `(archetype, vật chất, hình chính, quỹ đạo, dấu trạng thái)` không được trùng giữa hai tướng.
4. **Lối thoát:** tướng bậc 1–4 có cơ chế độc nhất (Liên Đới, Linh Thạch, chia sát thương, khiên phản đòn…) mà kit không diễn tả được thì được thêm một lớp chữ ký nhỏ, giống bậc 5–6.

Nội tại và trạng thái riêng (đánh dấu, khiên, độc, liên kết) cũng phải nhìn thấy được, không chỉ tuyệt kỹ.

## Rủi ro chính

- **Tướng bậc 1–4 trông na ná nhau** vì cùng kit. Cổng nhận diện ở trên chặn rủi ro này; người dùng duyệt cột "khác gì" và replay cả lô cạnh nhau.

- **Kit trừu tượng sai.** Giai đoạn 2 kiểm chứng với nguyên tố khác trước khi làm hàng loạt.
- **Hồi quy khi chuyển 25 module.** Mỗi lô ghi bảng thông số trước/sau, và người dùng replay trước khi sang lô kế tiếp.
- **Uniform palette làm lệch màu Cộng Công.** Giai đoạn 1 dùng đúng giá trị const cũ và so sánh bằng replay.
