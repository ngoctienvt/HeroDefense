---
title: "Nhạc nền và âm thanh đòn đánh/kỹ năng"
description: "Thay bộ âm tổng hợp đơn giản bằng hệ âm thanh nhỏ gọn: nhạc nền CC0 đổi theo pha trận/boss, SFX mẫu CC0 cho đòn đánh và kỹ năng theo vai trò/nguyên tố, giới hạn tiếng, cài đặt bật sẵn và được nhớ."
status: implemented-unverified
priority: P2
effort: 14h
branch: feat/ui-ux-overhaul
tags: [client, audio, music, sfx, assets]
blockedBy: []
blocks: []
created: 2026-10-23
---

# Nhạc nền và âm thanh chiến đấu

## Kết quả mong muốn

- Vào game là có nhạc nền. Nhạc nhẹ ở sảnh và lúc chuẩn bị, dồn dập hơn khi giao chiến, đổi sang nhạc boss khi boss chung xuất hiện. Thắng hoặc thua phát một đoạn ngắn rồi nhạc lặng dần.
- Mỗi đòn đánh thường có tiếng hợp vai trò: chém, bắn tên, phép, đập nặng. Kỹ năng có tiếng tụ lực lúc `cast` và tiếng va chạm lúc `ability`, hợp nguyên tố (lửa, nước, gỗ, kim loại, đất). Hồi máu và khiên có tiếng riêng.
- Trận đông người hoặc chạy tốc độ 4× không bị rè hay ồn hỗn loạn. Tiếng kỹ năng không bị tiếng đánh thường lấn mất.

## Hiện trạng

- `apps/client/src/visual-audio.ts` (49 dòng) chỉ phát một oscillator ngắn, không có nhạc. Toàn bộ trận dùng chung một bộ giới hạn 55 ms, nên tiếng kỹ năng dễ bị tiếng đánh thường che mất.
- `Battlefield` sở hữu `AudioContext` và đóng nó trong `dispose()`. Vì vậy nhạc không thể sống qua sảnh và màn kết quả.
- Có khoảng 25 lời gọi `this.audio.play(event)` rải trong `handleEvent` (`battlefield.ts:895-1306`). Một số nhánh return mà không phát tiếng, như `cataclysm-h01B`, `quake-h00E`, `reflect-h009`. Nhánh `peacock-poison-hit-h03R` cố ý không phát. Hiện không lọc theo zone đang xem.
- `main.ts:34` đặt `audioEnabled = false` và chỉ tạo context khi bấm nút. Nút bật/tắt nằm trong menu ⚙ (`hud-top.ts:154`).

## Đã chốt với người dùng (2026-10-23)

- **Nhạc nền**: dùng nhạc CC0 tải về, khoảng 3 bản lặp và 2 đoạn ngắn thắng/thua.
- **SFX**: dùng mẫu âm CC0 chia theo nhóm, khoảng 20 file. Mỗi lần phát lệch pitch/gain một chút để tiếng lặp lại không nhàm.
- **Mặc định**: âm thanh bật sẵn và lựa chọn của người chơi được lưu vào `localStorage`. Do chính sách autoplay, tiếng chỉ bắt đầu sau lần click hoặc phím đầu tiên.

## Không làm

- Không đổi contract mạng hay luật chơi. Âm thanh chỉ đọc `GameEvent`/`GameState` hiện có.
- Không dùng âm thanh từ map Warcraft hoặc từ game khác.
- Không làm âm thanh vị trí 3D (panning theo camera) và không làm lồng tiếng.
- Không tạo SFX riêng cho từng kỹ năng trong 70 tướng. Bảng cue cho phép thêm override theo `skillId` về sau.

## Kiến trúc

```
main.ts ── AudioManager (sống suốt phiên)
            ├─ master gain → DynamicsCompressor → destination
            ├─ musicGain ← MusicDirector (HTMLAudioElement → MediaElementSource, crossfade)
            └─ sfxGain   ← SfxPlayer (AudioBuffer, giới hạn tiếng, fallback tổng hợp)
Battlefield ── nhận SfxSink, gọi đúng 1 chỗ trong handleEvent → resolveCue(event, ctx) → sink.play(cue)
```

## Các phase

| # | Phase | Ước lượng | Trạng thái |
|---|---|---|---|
| 1 | [Chọn và chuẩn bị asset âm thanh](phase-01-audio-asset-sourcing.md) | 4h | xong (nhạc cổ phong BiteMe là nâng cấp tùy chọn, tải tay) |
| 2 | [AudioManager, cài đặt và mở khóa autoplay](phase-02-audio-manager-settings-unlock.md) | 3h | đã code, chưa chạy test |
| 3 | [Định tuyến SFX đòn đánh/kỹ năng và giới hạn tiếng](phase-03-sfx-cue-routing-voice-limits.md) | 4h | đã code, chưa chạy test |
| 4 | [Bộ điều khiển nhạc nền](phase-04-music-director.md) | 1.5h | đã code, chưa chạy test |
| 5 | [Test, tài liệu, bàn giao](phase-05-tests-docs-handoff.md) | 1.5h | đã code, chưa chạy test |

Phase 1 cần người dùng duyệt danh sách file trước khi tải. Phase 2 đến 4 có thể code song song với phase 1, dùng fallback tổng hợp cho tới khi có file.

## Tiêu chí nghiệm thu

1. Mở game, click một lần là có nhạc sảnh. Chuyển sang combat thì crossfade sang nhạc chiến đấu trong khoảng 1,5 giây. Boss chung xuất hiện thì đổi sang nhạc boss, boss chết thì quay lại nhạc chiến đấu.
2. Thắng hoặc thua phát đoạn kết ngắn rồi im. Về sảnh thì nhạc nhẹ chạy lại.
3. Đòn đánh thường của chiến binh, cung thủ, pháp sư, hộ vệ và hỗ trợ nghe khác nhau. Kỹ năng Hỏa, Thủy, Mộc, Kim, Thổ và Vô nghe khác nhau. Hồi máu và khiên có tiếng riêng.
4. Ở tốc độ 4× với 4 người chơi, không có tiếng rè hay clip, và tiếng kỹ năng vẫn nghe rõ.
5. Chỉ nghe tiếng của zone đang xem, cộng thêm boss chung và tiếng báo đợt.
6. Tắt âm thanh trong ⚙ rồi refresh, âm thanh vẫn tắt. Một file lỗi hoặc thiếu không làm vỡ game: cue đó dùng tiếng tổng hợp và có log `audio.load-failed`.
7. Mọi file nhạc và SFX có nguồn, giấy phép và ngày tải trong `docs/audio-assets.md`.

## Đã chốt thêm (2026-10-23)

- Có hai thanh âm lượng **Nhạc** và **Hiệu ứng** trong ⚙.
- Boss dungeon không đổi nhạc; chỉ boss trên đảo chính (zone 0).
- Dung lượng: "vừa cho chơi online". Thực tế SFX khoảng 300 KB, nhạc stream từng bản (boss 1,7 MB).
- Bản quyền: dự án dùng riêng, không bán. Dùng cả CC-BY cho sét, hồi máu, khiên; nguồn vẫn ghi trong `docs/audio-assets.md`.

Báo cáo triển khai: [reports/implementation.md](reports/implementation.md).
