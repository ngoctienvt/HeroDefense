# Gear foundation delivery

Status: DONE_WITH_CONCERNS

## Source changes

- Added contracts `gear-types.ts` (three slots, four rarities, 23 normal stats, 17 uniques, GearItem, GearCommand, GearStats). All IDs kebab-case English. Percent values use percentage points, normalized by `gear-stats.ts`.
- Added `content/gear-design.ts`: all pools/ranges, base stats, names, unique descriptions, costs, formatters, mechanic compatibility. Shared geometry excludes the 25 heroes that dispatch their own attack module. Summoner list comes from real summon creation: h012/h01E/h03Z/h03P/h00R.
- Added `gear-items.ts`: separate xorshift seed, deterministic distinct-line rolls, weighted rarity/quality, owned reward events, boss/kill drops, three-wave drought, inactive dungeon participant helper. Reward event uses `skillId: gear-drop`, `target: item.id`, `owner`.
- Added `gear-commands.ts`: ownership, slots/transfers, enhance cap/currency, single-line reroll, salvage only unequipped, admin unique consistency, inheritance on consumed units. `releaseUnitGear` returns gear and increments version; craft/merge/sell caller refreshes stats after removal/rank update.
- Updated server whitelist; added generation/inventory/server parser regression tests.
- User steering removed all block stat declarations, values, buff design and prose from `content/*.ts`; original generated JSON and brief remain untouched. Catalog and tier3/4 mappings explicitly select supported fields so removed JSON block values cannot leak into runtime. Sea-anchor keeps only stun/knockback immunity, with no attack-speed penalty.
- Updated README, gameplay spec, detailed mechanics (gear/economy/formulas/current twenty-wave progression, removed obsolete dungeon workflow/commands).

## Twenty-wave adaptation and source evidence

- `wave-plan.ts` has 456 lane enemies and six shared Boss entities (milestones 5/10/15/20, twin Bosses at 10/20). No active dungeon module or commands.
- Guaranteed stones: `500 + sum(180+40*w, w=1..20) = 12,500`.
- Enhance coefficient 3: +10 costs 1,155; fifteen +10 items cost 17,325; guaranteed income affords 10.82 complete +10 items before rerolls/salvage.
- Kill drop 5%; level scale denominator 20; ordinary rarity uses compressed legacy progress `wave*45/20`, Boss progress `wave*9/20`. Estimated solo total about 29 items / 3 gold. This is probability arithmetic, not a measured benchmark result.
- Star-absorption description matches integrated .25% per kill count, Boss 20 counts, 60% cap.

## Benchmark added, not executed

`gear-balance-benchmark.test.ts` prints:

1. Thirty-two seeded real wave-roster kill-hook replays, 462 deaths each, observed loot distribution and target-band indicators.
2. A bounded full `stepGame` run with fixed five Thánh/Thần heroes, actual kills/deaths/loot/reached wave. It reports loss or incomplete runs honestly. It does not model normal summon progression or force a win.
3. Sixteen seeded level-20 purple +6 samples: basic-hit DPS/EHP proxies versus removed level-5 formulas, skill multiplier/cooldown. Proxies exclude geometry/passive/unique combat interactions. ±15% is a printed target, not a claimed result.
4. Actual `supportAmount` helper reference values including recipient HP share versus legacy attack×2.1 and old magic×2.25.
5. Guaranteed income versus enhancement costs.

## Verification boundary

Read changed source and contracts; statically traced commands/drop/deletion hooks; `git diff --check` on tracked owning files showed no whitespace errors. No typecheck, test, benchmark, build, game, browser or launcher execution, per project instructions. Main agent owns integration and full review.

User checks: `npm run typecheck`, `npm test`; then stop old server, run `start-game.cmd`, Ctrl+F5. Check item transfer/consumption/HP fraction, parser ownership, all unique options, private loot notifications and returned benchmark rows.

## Concerns

- Statistical/drop/strength bands and support balance remain unmeasured. No claim of ±15% parity, full-run completion, visual quality or FPS acceptance.
- Dungeon helper has no live caller; do not count dungeon rewards in current-run economics.
- Detailed mechanics retains historical hero tables, explicitly marked as historical; runtime numeric authority remains catalog/design source.

Unresolved questions: none requiring a product decision; empirical validation remains with the user.
