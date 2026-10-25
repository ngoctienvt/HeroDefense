# Âm thanh: nhạc nền và hiệu ứng

Game có **một bản nhạc nền lặp liên tục suốt game** (sảnh, chuẩn bị, giao chiến, boss, màn kết quả) và tiếng cho đòn đánh, kỹ năng, chết, đầu đợt và boss. Âm thanh bật sẵn. Trình duyệt chỉ cho phát sau lần click hoặc bấm phím đầu tiên. Menu ⚙ có nút bật/tắt và hai thanh **Nhạc** / **Hiệu ứng** (0–100%). Lựa chọn lưu trong `localStorage` (`thienDao.audio.v1`). Âm thanh chỉ là trình bày: không có gì trong phần này ảnh hưởng tới kết quả trận.

## Kiến trúc

| File | Vai trò |
|---|---|
| `apps/client/src/audio-manager.ts` | Sống suốt phiên (sảnh → trận → kết quả), nhạc không bị dựng lại khi đổi pha. Mở khóa autoplay, ngắt khi tab ẩn. Graph: bus nhạc + bus SFX → master → compressor → loa. Phát `boss-spawn` khi boss đảo chính xuất hiện. |
| `audio-settings.ts` | Đọc/ghi và kiểm tra cài đặt. Dữ liệu hỏng thì về mặc định `{ enabled: true, music: .7, sfx: .8 }`. |
| `audio-music-director.ts` | Một `<audio loop>` stream `music-main.mp3` qua `MediaElementSource`, fade-in 2 giây ở lần phát đầu. Không đổi theo pha trận, boss hay thắng/thua; chỉ nút âm thanh mới tạm dừng/tiếp tục (phát tiếp từ chỗ cũ). |
| `audio-cue-routing.ts` | Bảng cue (`CUES`) và `resolveCue(event, ctx)`. Đây là nơi duy nhất quyết định một event phát tiếng gì. |
| `audio-voice-limiter.ts` | Giới hạn tiếng đồng thời theo nhóm, cooldown từng cue và số cue mới mỗi khung 16 ms. Tính theo đồng hồ thật nên tốc độ 2×/4× tự bị chặn. |
| `audio-sfx-player.ts` | Tải và decode SFX sau khi mở khóa. Mỗi lần phát lệch ±6% pitch và ±10% gain. File lỗi thì dùng tiếng tổng hợp (`audio-synth-fallback.ts`). |
| `battlefield.ts` → `playEventCue` | Gọi một lần ở đầu `handleEvent` với zone, vai trò/nguyên tố tướng, rank quái và tướng của mình hay không. Phân thân/linh thú (`source` không phải tướng) lấy tướng từ hậu tố `-hXXX` của `skillId`. |

### Thứ tự chọn cue (dừng ở bước đầu khớp)

1. `wave` → `wave-start`. Kind khác ngoài attack/cast/ability/death thì im lặng. Event `trait` là hiệu ứng phụ của đòn đánh, đòn đánh đã có tiếng nên giữ im.
2. Event ở zone khác zone đang xem thì im lặng. Ngoại lệ là boss đảo chính (zone 0).
3. `SILENT_SKILLS`: dư chấn hoặc điểm nhấn của chiêu đã có tiếng (`peacock-poison-hit-h03R`, `cataclysm-h01B`, `quake-h00E`).
4. `death` → `death-hero` / `death-enemy`.
5. `SKILL_CUE_OVERRIDES` theo `skillId` (không áp cho `cast`): sét `tier3-tier4-h00T`, `skill-h019`, `bolt-h019`, `skill-h040`, `bolt-h040`; băng `tier3-tier4-h00Z`, `freeze-h018`; chuông `reflect-h009` → `skill-kim`.
6. `cast` → `cast-charge`, pitch theo nguyên tố (Kim cao, Thổ/Hỏa trầm). Quái/boss dùng pitch 0,72.
7. `ability: heal` → `skill-heal`; `ability: shield` → `skill-shield`.
8. Quái: boss → `boss-hit` (đánh thường) / `skill-tho` pitch 0,8 (kỹ năng). Quái khác → `enemy-hit` / `skill-tho`.
9. Kỹ năng tướng → theo `HeroDef.element`: Vô `skill-vo`, Kim `skill-kim`, Mộc `skill-moc`, Thủy `skill-thuy`, Hỏa `skill-hoa`, Thổ `skill-tho`.
10. Đòn đánh tướng → theo `role`: warrior `atk-slash`, ranger `atk-arrow`, mage `atk-bolt`, guardian `atk-blunt`, support `atk-chime`.

Ưu tiên khi đầy tiếng: tiếng nhịp trận (đợt, boss, tướng chết) > kỹ năng > đòn của tướng mình > đồng đội > quái. Giới hạn: attack 6, enemy 4, skill 6, beat 2, tổng 14, tối đa 8 cue mới mỗi khung.

**Thêm tiếng riêng cho một kỹ năng:** thêm file vào `build-runtime-audio.sh`, thêm cue vào `CUES`, thêm `skillId → cue` vào `SKILL_CUE_OVERRIDES`, rồi ghi nguồn vào bảng dưới. Test `audio-system.test.ts` sẽ báo lỗi nếu `skillId` không tồn tại, thiếu file, hoặc cue chưa có trong tài liệu này.

### Log (`?debug=1`)

`audio.unlock`, `audio.unavailable`, `audio.settings`, `audio.settings-not-saved`, `audio.sfx-loaded` (số file ok/lỗi, thời gian), `audio.load-failed`, `audio.music` (bắt đầu phát), `audio.music-failed`, `audio.voices-dropped` (tối đa một dòng mỗi 10 giây).

## Runtime

`apps/client/public/assets/audio/`: SFX mono MP3 96 kbps, cắt lặng đầu, đỉnh −3 dBFS, tổng khoảng 300 KB. Nhạc: một file stereo MP3 128 kbps, loudness −16 LUFS, 3 MB, được stream nên phát được trước khi tải xong. Dựng lại toàn bộ:

```bash
bash assets/audio-source/build-runtime-audio.sh
```

Script tự giải nén các gói. Thư mục `extracted/` không đưa vào git.

| Cue / track | Ghép từ | Nguồn |
|---|---|---|
| `atk-slash` | swosh 05/12 (pitch 1,25–1,3) + knifeSlice / knifeSlice2 | OGA swish + Kenney RPG Audio |
| `atk-arrow` | swosh 20/27 (pitch 1,8–1,9, highpass) + impactWood_light | OGA swish + Kenney Impact |
| `atk-bolt` | swosh 33/38 (highpass) + impactGlass_light | OGA swish + Kenney Impact |
| `atk-blunt` | impactPunch_heavy 000/002 | Kenney Impact |
| `atk-chime` | impactBell_heavy 001/003 (pitch 2,2–2,4) | Kenney Impact |
| `enemy-hit` | impactPunch_medium / impactSoft_heavy | Kenney Impact |
| `boss-hit` | impactPlate_heavy + impactPunch_heavy (pitch 0,7) | Kenney Impact |
| `cast-charge` | swosh 15 đảo ngược | OGA swish |
| `skill-kim` | impactMetal_heavy + impactPlate_heavy | Kenney Impact |
| `skill-moc` | impactWood_heavy + impactPlank_medium | Kenney Impact |
| `skill-thuy` | splash_03 + splash_08 | OGA water/splash (rubberduck) |
| `skill-hoa` | flame + impactSoft_heavy (pitch 0,7) | OGA Catching fire + Kenney Impact |
| `skill-tho` | Earth Element Magic Spell + impactMining | OGA (qubodup) + Kenney Impact |
| `skill-vo` | Earth Element Magic Spell (pitch 1,45) + impactGlass_medium | OGA (qubodup) + Kenney Impact |
| `skill-ice` | ice.wav + impactGlass_heavy | OGA Ice spells (bart) + Kenney Impact |
| `skill-thunder` | thunderclap (1,4 giây đầu) | OGA Thunder (Jerimee) |
| `skill-heal` | Replenish | OGA Replenish (qubodup) |
| `skill-shield` | Magic Shield + impactBell (pitch 1,6) | OGA Magic Shield (spookymodem) + Kenney Impact |
| `death-enemy` | impactSoft_medium (pitch 0,8) | Kenney Impact |
| `death-hero` | impactMetal_heavy (pitch 0,6) | Kenney Impact |
| `wave-start` | impactBell_heavy (pitch 0,75), như tiếng cồng | Kenney Impact |
| `boss-spawn` | impactBell_heavy + impactPlate_heavy (pitch 0,5–0,55) | Kenney Impact |
| `music-main` | asianoriental2 (192 giây, đàn koto/dây, lặp liên tục) | OGA Asianoriental2 (Tozan) |

## Nguồn và giấy phép (tải ngày 23-10-2026)

Dự án dùng riêng cho nhóm bạn, không bán. Nguồn vẫn được ghi đầy đủ để truy vết. Các file CC-BY được ghi công dưới đây.

| Gói | URL | Giấy phép | Bản lưu |
|---|---|---|---|
| Kenney Impact Sounds | https://kenney.nl/assets/impact-sounds | CC0 | `assets/audio-source/kenney-impact-sounds/` |
| Kenney RPG Audio | https://kenney.nl/assets/rpg-audio | CC0 | `assets/audio-source/kenney-rpg-audio/` |
| Swish – bamboo stick weapon swooshes (qubodup) | https://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes | CC0 | `assets/audio-source/oga-swish/` |
| Ice spells (bart) | https://opengameart.org/content/ice-spells | CC0 | `assets/audio-source/oga-ice-spells/` |
| 40 CC0 water/splash/slime SFX (rubberduck) | https://opengameart.org/content/40-cc0-water-splash-slime-sfx | CC0 | `assets/audio-source/oga-water-splash/` |
| Catching fire (themightyglider) | https://opengameart.org/content/catching-fire | CC0 | `assets/audio-source/oga-catching-fire/` |
| Earth Element Magic Spell (qubodup) | https://opengameart.org/content/earth-element-magic-spell | CC0 | `assets/audio-source/oga-earth-spell/` |
| Thunder (Jerimee) | https://opengameart.org/content/thunder | **CC-BY 3.0** | `assets/audio-source/oga-thunder/` |
| Replenish Life Force (Iwan "qubodup" Gabovitch) | https://opengameart.org/content/replenish-life-force-sound | **CC-BY 3.0** | `assets/audio-source/oga-replenish/` |
| Magic Shield (spookymodem) | https://opengameart.org/content/magic-shield | **CC-BY 3.0** | `assets/audio-source/oga-magic-shield/` |
| Asianoriental2 (Tozan) | https://opengameart.org/content/asianoriental2 | CC0 | `assets/audio-source/oga-asianoriental2/` |

Thay đổi so với bản gốc: cắt lặng đầu, cắt độ dài, fade-out, đổi pitch, ghép lớp, chuẩn hóa đỉnh/loudness và đổi sang MP3. Lệnh cụ thể nằm trong `assets/audio-source/build-runtime-audio.sh`.
