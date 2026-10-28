# Content provenance and web adaptations

`content/catalog.ts` exports the generated playable catalog in `content/data/catalog.json`.
Run `npm run extract:content` to reproduce the JSON offline from the committed evidence
in `plans/261012-1846-thien-dao-web-coop/research/map-evidence`. The extractor only parses
bounded text/SLK files. It never executes JASS or loads embedded programs. The generated
provenance records SHA-256 for every input. `content/data/extraction-debug.log` records
successful extraction counts or an explicit failure; timestamps are excluded from the
catalog so repeated extraction produces identical catalog bytes.

The source archive is `ThienDao v2.1.w3x`, SHA-256
`ddc4be147dc7afd262be6193b94f1f06f786e7222c4ea7dd444feeda63f9a8e8`.
Archive recovery details and limits are in the
[map inspection](../plans/261012-1846-thien-dao-web-coop/reports/map-inspection.md).

## Preserved identities and relationships

- All 70 indexed `pK` registrations, rawcodes, Vietnamese names, elements and source line
  anchors. Names come from recovered CampaignUnitStrings via `roster-evidence.json`.
- All five roles come from the 70 `A027.Unubertip` CSV entries, joined by character index,
  including indices 57–70 which occur out of order in the source registrations.
- `pK` group codes 1–6 represent rarity: Linh, Huyền, Siêu, Tiên, Thánh, Thần. `tier`
  preserves this code. The current contract's `faction` field aliases the same source
  group; a separate faction system was not established by the evidence.
- All 27 Tiên Duyên names and original effect descriptions come from `A027.Tip/Ubertip`.
  Membership lists preserve `pR` indices exactly, excluding only zero placeholders.
- All 62 nonempty crafting recipes come from `MRxr.Ubertip`, aligned with the 70
  indexed characters. The first eight characters have no recipe. Ingredient names
  are resolved to roster IDs, preserving duplicate ingredients where specified.
- All eight formation names and original descriptions come from `A02J.Tip`.
- Difficulty branches preserve Bình Thường 45 waves at 1/1, Ác Mộng 45 at 1.1/1.3,
  Địa Ngục 45 at 1.2/1.6, Tối Thượng 60 at 1.2/1.6 attack/health multipliers.
- Eight encounter unlocks preserve the script's waves 5–40, announcements and boss
  labels. Lưỡng Giới combines Kim Giác and Ngân Giác; Bất Chu Thiên Quan combines Ma Gia
  Tứ Tướng. Ngũ Hành Linh Giới is supreme-only. Its encounter label also serves as the
  boss label because the unlock announcement does not establish a single named boss.

## Adapted combat values

Every hero declares `source.adapted = true`. This is an approximate browser adaptation,
not exact Warcraft native combat execution. For heroes outside the first two tiers,
except Pangu h01B (see below), source HP comes from UnitBalance and is divided by 10, then multiplied by role:
warrior 1.1, ranger .85, mage .8, guardian 1.55, support 1. Source movement speed is
divided by 100. Source `pK` range is divided by 100 and clamped to the minimum range
for the role. Attack is `(28 + 15 × tier)` times a role multiplier, rounded; armor and
attack interval use role presets in `tools/map-extraction/web-adaptation.ts`.

The first two rarity groups use explicit web stats and combat designs in
[`content/tier-hero-design.ts`](../content/tier-hero-design.ts): eight Linh heroes
have passive basic-attack traits and no active ability; twelve Huyền heroes have
active skills. The remaining 50 playable skills come from
[`content/hero-abilities.ts`](../content/hero-abilities.ts); its earlier 12 Huyền
seeds are superseded by the tier design during extraction. The extractor joins
these designs to the map-backed roster by rawcode when generating the playable
catalog. Five shared handlers implement cleave, chain, nova, shield and heal;
character traits and statuses are resolved in game-core. These are original web
designs informed by hero identity and the user's tier brief.
No per-hero Warcraft skill dispatch has been verified: **0/70** abilities are
claimed to match an individual map skill. `provenance: original` on playable
skills and `evidence.status: unverified` in the older skill inventory describe
that boundary; roster registration and name lines prove identity, not skill behavior. The
[ability inventory](../plans/261013-0017-hero-skills-assets-animation/reports/ability-evidence-inventory.md)
records the source evidence and earlier representative designs; the Linh/Huyền
combat specification is now in `content/tier-hero-design.ts`. At runtime the
`HERO_STATS_OVERRIDES` table in `content/catalog.ts` overrides those Linh/Huyền
stats, traits and skill text, so later web tuning lives there.

The 19-10-2026 Linh–Tiên rework keeps every kit but changes three things:
hard control stays only on control specialists, ally heals/shields add a share
of the recipient's max HP, and no damage reads enemy HP. For Siêu/Tiên heroes
the player's brief in `content/tier3-tier4-brief.json` is left as the record of
that brief; `content/tier3-tier4-rework.ts` applies exact text substitutions and
the changed numbers on top, and fails loudly if the brief text drifts. These are
web design decisions, not map evidence.

## Visual and audio sources

The Babylon.js terrain, character meshes, shared materials, short event effects
and synthesized sound cues are created by project code. Seventy hero portraits
were generated for this project with OpenAI imagegen, using the user's image
only as a style reference. The client does not import Warcraft models,
textures, audio or art from the reference image.
The [procedural asset manifest](../plans/261013-0017-hero-skills-assets-animation/reports/procedural-asset-manifest.md)
lists their source modules and current safeguards. It also distinguishes
implemented limits from load and frame-rate targets that still require device
measurements.

Tiên Duyên retains the original description and appends a web adaptation label.
From 2026-10-28 the flat bonuses are replaced by per-bond mechanics in `content/bond-design.ts`; each tier carries `adapted` (follows the map description, e.g. Lý Tịnh heals 50%, Hậu Nghệ hits 5 targets) or `original` (web design, e.g. Phật Quang Phổ Chiếu, because the map grants stun immunity). Members and thresholds still come from the catalog; the five replaced identities (h03W, h03X, h01I, h01J, h014) are substituted in five bonds by thematic successors listed in `SYNERGY_SUCCESSORS` (`content/catalog.ts`) - a web design decision, not map data - and tiers whose roster is too small to reach are not published.
The earlier generic +8% / +3 armor / +0.015 regeneration bonuses were removed; the hero-specific procs and spell interactions now live in the bond handlers.

Formation descriptions preserve source text for reference; the web engine maps their
effects onto its supported attack/health/speed/armor fields. Tam Tài, Ngũ Hành, Thất
Tinh and Cửu Cung map to attack +5%; Tứ Tượng and Thập Tuyệt to armor +3; Lục Hợp to
speed +5%; Bát Quái to health +5%, per level. Source-specific critical, block, accuracy,
penetration and evasion behavior remains an approximation.

`npm run test:content` checks source counts, every roster identity and role, exact `pR`
relationships, named formations, difficulty values, encounter unlocks, finite playable
stats, ability inventory and evidence hashes. Runtime balance and character-specific
Warcraft ability parity are outside this catalog's claims.

## Pangu override (2026-10-15)

The user-authored Supreme Creator design supersedes generated h01B combat values at runtime in `content/catalog.ts`, with ability constants in `content/pangu-design.ts`. Recipe, name, element and source identity are preserved. Generated JSON and Warcraft archive were not edited. `provenance: original` describes this explicit web design. See [Pangu combat](pangu-combat.md) for exact rules and pending user validation.

## New brief roster mapping (2026-10-19)

The newer user brief names five characters absent from the extracted roster. Runtime overrides in `content/catalog.ts` reuse the retired slots h03W (Nhiên Đăng), h03X (Bồ Đề), h01I (Đế Tuấn), h01J (Như Lai) and h014 (Nguyên Thủy, now tier 6). Their web stats and abilities follow `content/new-divine-design.ts` and the [gameplay specification](gameplay-spec.md). The numeric IDs in the brief were AI-assigned placeholders, so identity is matched by name for existing characters. All 24 named characters receive the brief's crafting recipes mapped by character name. Old source synergies no longer assign the five replaced identities to unrelated character groups. The generated `content/data/catalog.json` still describes the older extracted map and has not been hand edited; runtime names, combat and recipes are adapted user content, not map-proven identities. The user will provide the omitted final character; h015 remains the old Thái Bạch slot provisionally so the playable catalog retains 70 entries, not as the selected replacement. At the user's request, h015 now has a complete stylized sprite and portrait bundle in `assets/sprites/tier5-tier6/h015/`; this art addition does not decide the omitted roster identity or alter gameplay.

On 2026-10-19 the user asked the agent to design h015 Thái Bạch Kim Tinh itself. Its stats and skills (`content/thaibach-design.ts`) are an original web design, not map evidence. The same rebalance is also web-only. It covers tier-scaled hard-control chances (`packages/game-core/src/crowd-control.ts`), the removal of all enemy %-health damage in favour of attack-scaled values, and the tier 5–6 stat and skill changes recorded in the [gameplay specification](gameplay-spec.md). The numbers are initial proposals awaiting playtest tuning.

## Linh and Huyền visual replacement (2026-10-15)

All 20 characters in these tiers now use original generated stylized artwork inspired by the accepted Pangu master. Builtin `image_gen` produced four-direction masters and separate walk/attack sheets; exact prompts, original images, source hashes and alpha/registration reports are retained in `assets/sprites/linh-huyen-stylized/`. No Warcraft imagery was used. This changes battlefield sprites and portraits, not catalog identity, balance or combat rules. Model/cost are undisclosed by the host tool. See [sprite package and validation limits](linh-huyen-sprites.md).
