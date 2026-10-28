import { CRAFT_RECIPES, HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import { ATTACK_GEOMETRY_NAMES, ON_HIT_TRAIT_NAMES } from '../../../packages/contracts/src/combat-profiles.js';
import type { HeroDef, Unit } from '../../../packages/contracts/src/types.js';
import { getIngredientTree } from './craft-board.js';
import { debug } from './debug.js';
import { renderGearAdmin } from './gear-admin.js';
import { abilityCost, controlLine } from './hero-detail.js';
import type { PanelContext } from './panel-context.js';
import { scaledAttackRange } from '../../../packages/game-core/src/rules.js';
import { ownUnits } from './panel-context.js';
import { button, el, heading, heroPortrait } from './ui.js';
import { elementLabel, roleLabel, starText, tierLabel } from './ui-labels.js';

/**
 * Test-only Admin drawer. It has no rail button and is not listed in the Cẩm Nang; key K opens it.
 * The server accepts its commands from anyone (an accepted trade-off for local co-op testing).
 */
const recipeByHero = new Map(CRAFT_RECIPES.map(r => [r.heroId, r]));
let adminTargetHeroId: string | null = null;
let adminOnlyShowRelated = false;
let adminSelectedRank = 1;
let adminSelectedTier = 0;

export function renderAdmin(container: HTMLElement, ctx: PanelContext): void {
  const player = ctx.state.players[ctx.selfId];
  if (!player) return;
  const ownedUnits = ownUnits(ctx);
  const countOwned = (id: string) => ownedUnits.filter(u => u.heroId === id).length;

  container.append(
    heading(
      'Cơ Chế Admin & Thử Nghiệm',
      'Mua / nhận bất cứ tướng nào trong 70 tướng của Thiên Đạo. Nhấp chọn tướng để highlight công thức và nguyên liệu ghép.'
    )
  );

  // Quick Resources
  const resSection = el('section', 'admin-res-section');
  resSection.append(el('h3', 'section-sub', 'Cấp Tài Nguyên Nhanh'));
  const resGrid = el('div', 'admin-res-grid');
  resGrid.append(
    button('+10.000 Đạo Duyên', () => {
      debug('client.admin-resources', { souls: 10000 });
      ctx.send({ type: 'admin-resources', souls: 10000 });
    }, 'admin-res-btn'),
    button('+50.000 Linh Thạch', () => {
      debug('client.admin-resources', { gold: 50000 });
      ctx.send({ type: 'admin-resources', gold: 50000 });
    }, 'admin-res-btn'),
    button('+100 Linh Đan', () => {
      debug('client.admin-resources', { pellets: 100 });
      ctx.send({ type: 'admin-resources', pellets: 100 });
    }, 'admin-res-btn'),
    button('+10 Điểm Trận Pháp', () => {
      debug('client.admin-resources', { formationPoints: 10 });
      ctx.send({ type: 'admin-resources', formationPoints: 10 });
    }, 'admin-res-btn')
  );
  resSection.append(resGrid);
  container.append(resSection);
  container.append(renderGearAdmin(ctx));

  // --- SECTION: TƯỚNG ĐANG CÓ (ALWAYS VISIBLE) ---
  const ownedSection = el('section', 'admin-owned-section');
  const deployedCount = ownedUnits.filter(u => u.slot >= 0).length;
  const benchCount = ownedUnits.filter(u => u.slot < 0).length;

  const ownedHeader = el('div', 'admin-owned-header');
  ownedHeader.append(
    el('h3', 'section-sub', `Tướng Đang Sở Hữu (${ownedUnits.length})`),
    el('span', 'admin-owned-hint', `Xuất trận: ${deployedCount}/5 · Kho: ${benchCount}`)
  );
  ownedSection.append(ownedHeader);

  const ownedList = el('div', 'admin-owned-list');
  if (ownedUnits.length === 0) {
    ownedList.append(el('p', 'hint', 'Chưa sở hữu tướng nào. Nhấp vào tướng bên dưới để nhận hoặc ra trận.'));
  } else {
    const heroGroups = new Map<string, Unit[]>();
    for (const u of ownedUnits) {
      const g = heroGroups.get(u.heroId) ?? [];
      g.push(u);
      heroGroups.set(u.heroId, g);
    }

    const tree = adminTargetHeroId ? getIngredientTree(adminTargetHeroId, recipeByHero) : null;

    for (const [heroId, units] of heroGroups.entries()) {
      const hero = HERO_BY_ID[heroId];
      if (!hero) continue;
      const isTarget = adminTargetHeroId === heroId;
      const isDirect = tree?.directCounts.has(heroId);
      const isSub = tree?.subCounts.has(heroId);

      const isDimmed = !!adminTargetHeroId && !isTarget && !isDirect && !isSub;
      const chip = el('div', `admin-owned-chip ${isTarget ? 'is-target' : ''} ${isDirect ? 'is-needed direct' : ''} ${isSub ? 'is-needed sub' : ''} ${isDimmed ? 'is-dimmed' : ''}`);
      chip.append(heroPortrait(hero, 'mini-portrait'));

      const chipInfo = el('div', 'admin-chip-info');
      chipInfo.append(
        el('span', 'admin-chip-name', hero.name),
        el('span', 'admin-chip-rank', units.map(u => starText(u.rank) + (u.slot >= 0 ? ` (Ô ${u.slot + 1})` : '')).join(', '))
      );
      chip.append(chipInfo);

      if (units.length > 1) {
        chip.append(el('span', 'admin-chip-count', `x${units.length}`));
      }
      if (isDirect) {
        chip.append(el('span', 'admin-chip-badge direct', 'Nguyên liệu'));
      } else if (isSub) {
        chip.append(el('span', 'admin-chip-badge sub', 'Thành phần'));
      } else if (isTarget) {
        chip.append(el('span', 'admin-chip-badge target', 'Đang chọn'));
      }

      chip.title = `${hero.name} (${tierLabel(hero.tier)} · ${roleLabel(hero.role)}) · nhấp để đánh dấu`;
      chip.addEventListener('click', () => {
        adminTargetHeroId = adminTargetHeroId === heroId ? null : heroId;
        update();
      });

      ownedList.append(chip);
    }
  }
  ownedSection.append(ownedList);
  container.append(ownedSection);

  // --- SECTION: DANH SÁCH 70 TƯỚNG ---
  const heroSection = el('section', 'admin-hero-section');
  heroSection.append(el('h3', 'section-sub', 'Danh Sách 70 Tướng (Nhận / Ghép / Ra Trận)'));

  const filterWrap = el('div', 'admin-filter-wrap');
  const searchInput = el('input', 'admin-search-input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Tìm tên tướng, hệ, vai trò hoặc kỹ năng…';
  filterWrap.append(searchInput);

  const tierTabs = [
    { tier: 0, label: 'Tất cả (70)' },
    { tier: 1, label: 'Bậc 1 (8)' },
    { tier: 2, label: 'Bậc 2 (12)' },
    { tier: 3, label: 'Bậc 3 (11)' },
    { tier: 4, label: 'Bậc 4 (13)' },
    { tier: 5, label: 'Bậc 5 (13)' },
    { tier: 6, label: 'Bậc 6 (13)' },
  ];
  const pillsContainer = el('div', 'admin-pills-row');
  const pillBtns: HTMLButtonElement[] = [];
  tierTabs.forEach(({ tier, label }) => {
    const pill = button(label, () => {
      adminSelectedTier = tier;
      pillBtns.forEach((b, i) => b.classList.toggle('selected', tierTabs[i].tier === adminSelectedTier));
      update();
    }, `admin-pill-btn ${tier === adminSelectedTier ? 'selected' : ''}`);
    pillBtns.push(pill);
    pillsContainer.append(pill);
  });
  filterWrap.append(pillsContainer);

  const rankWrap = el('div', 'admin-rank-selector-wrap');
  rankWrap.append(el('span', 'admin-rank-label', 'Cấp sao test:'));
  const rankPills = el('div', 'admin-pills-row');
  const rankPillBtns: HTMLButtonElement[] = [];
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(star => {
    const starBtn = button(`${star}★`, () => {
      adminSelectedRank = star;
      rankPillBtns.forEach((b, i) => b.classList.toggle('selected', i + 1 === adminSelectedRank));
      update();
    }, `admin-pill-btn ${star === adminSelectedRank ? 'selected' : ''}`);
    rankPillBtns.push(starBtn);
    rankPills.append(starBtn);
  });
  rankWrap.append(rankPills);
  filterWrap.append(rankWrap);

  heroSection.append(filterWrap);

  // Active target banner container
  const bannerContainer = el('div', 'admin-banner-container');
  heroSection.append(bannerContainer);

  const heroList = el('div', 'admin-hero-list');
  heroSection.append(heroList);
  container.append(heroSection);

  const update = () => {
    bannerContainer.replaceChildren();
    heroList.replaceChildren();

    const tree = adminTargetHeroId ? getIngredientTree(adminTargetHeroId, recipeByHero) : null;
    const targetHero = adminTargetHeroId ? HERO_BY_ID[adminTargetHeroId] : null;
    const targetRecipe = adminTargetHeroId ? recipeByHero.get(adminTargetHeroId) : null;

    if (targetHero) {
      const banner = el('div', 'admin-target-banner');
      const targetInfo = el('div', 'admin-target-info');
      targetInfo.append(
        el('div', 'admin-target-title', `Đang chọn: ${targetHero.name} (${tierLabel(targetHero.tier)} · ${roleLabel(targetHero.role)})`),
        el('div', 'admin-target-recipe', targetRecipe
          ? `Công thức ghép: ${targetRecipe.ingredients.map(id => HERO_BY_ID[id]?.name ?? id).join(' + ')}`
          : 'Tướng Phẩm 1 khởi đầu · Không cần công thức ghép')
      );
      banner.append(targetInfo);

      const bannerActions = el('div', 'admin-banner-actions');
      const toggleBtn = button(adminOnlyShowRelated ? 'Hiện tất cả 70 tướng' : 'Chỉ hiện tướng liên quan', () => {
        adminOnlyShowRelated = !adminOnlyShowRelated;
        update();
      }, 'admin-banner-btn');
      const clearBtn = button('Bỏ chọn', () => {
        adminTargetHeroId = null;
        adminOnlyShowRelated = false;
        update();
      }, 'admin-banner-btn danger');

      bannerActions.append(toggleBtn, clearBtn);
      banner.append(bannerActions);
      bannerContainer.append(banner);
    }

    const query = searchInput.value.trim().toLocaleLowerCase('vi');
    const filtered = HEROES.filter(h => {
      const isTarget = h.id === adminTargetHeroId;
      const isDirect = tree?.directCounts.has(h.id) ?? false;
      const isSub = tree?.subCounts.has(h.id) ?? false;
      const isRelated = isTarget || isDirect || isSub;

      if (adminTargetHeroId) {
        if (adminOnlyShowRelated) {
          if (!isRelated) return false;
        } else if (adminSelectedTier !== 0 && !isRelated && h.tier !== adminSelectedTier) {
          return false;
        }
      } else if (adminSelectedTier !== 0 && h.tier !== adminSelectedTier) {
        return false;
      }

      if (!query) return true;
      const matchName = h.name.toLocaleLowerCase('vi').includes(query);
      const matchRole = roleLabel(h.role).toLocaleLowerCase('vi').includes(query);
      const matchElem = elementLabel(h.element).toLocaleLowerCase('vi').includes(query);
      const matchAbility = h.ability?.name.toLocaleLowerCase('vi').includes(query);
      const matchTrait = h.trait?.name.toLocaleLowerCase('vi').includes(query);
      return matchName || matchRole || matchElem || matchAbility || matchTrait || isRelated;
    });

    // Sort: Target hero first (0) -> Direct ingredients (1) -> Sub-ingredients (2) -> Other heroes (3)
    filtered.sort((a, b) => {
      const score = (h: HeroDef) => {
        if (h.id === adminTargetHeroId) return 0;
        if (tree?.directCounts.has(h.id)) return 1;
        if (tree?.subCounts.has(h.id)) return 2;
        return 3;
      };
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;
      if (a.tier !== b.tier) return b.tier - a.tier;
      return a.name.localeCompare(b.name, 'vi');
    });

    if (!filtered.length) {
      heroList.append(el('p', 'hint', 'Không tìm thấy tướng phù hợp với bộ lọc.'));
      return;
    }

    for (const hero of filtered) {
      const isTarget = adminTargetHeroId === hero.id;
      const isDirect = tree?.directCounts.has(hero.id);
      const isSub = tree?.subCounts.has(hero.id);
      const isRelevant = isTarget || isDirect || isSub;
      const isDimmed = !!adminTargetHeroId && !isRelevant;

      const card = el('div', `admin-hero-card ${isTarget ? 'is-target-hero' : ''} ${isDirect ? 'is-craft-ingredient' : ''} ${isSub ? 'is-craft-sub-ingredient' : ''} ${isDimmed ? 'is-dimmed' : ''}`);

      if (isTarget) {
        card.append(el('div', 'admin-card-tag target', 'TƯỚNG ĐANG CHỌN'));
      } else if (isDirect) {
        const need = tree!.directCounts.get(hero.id)!;
        const have = countOwned(hero.id);
        card.append(el('div', `admin-card-tag direct-ingredient ${have >= need ? 'ready' : 'missing'}`, `NGUYÊN LIỆU TRỰC TIẾP (cần x${need} · có x${have}${have >= need ? ' ✓' : ''})`));
      } else if (isSub) {
        const subNeed = tree!.subCounts.get(hero.id)!;
        const have = countOwned(hero.id);
        card.append(el('div', 'admin-card-tag sub-ingredient', `NGUYÊN LIỆU THÀNH PHẦN (cần x${subNeed} · có x${have})`));
      }

      const headerRow = el('div', 'admin-card-header');
      headerRow.title = 'Nhấp vào đây để chọn tướng này và xem nguyên liệu ghép';
      headerRow.style.cursor = 'pointer';
      headerRow.addEventListener('click', () => {
        adminTargetHeroId = adminTargetHeroId === hero.id ? null : hero.id;
        update();
      });

      const meta = el('div', 'admin-hero-meta');
      meta.append(
        el('strong', 'admin-hero-name', hero.name),
        el('div', 'admin-hero-badges', `${tierLabel(hero.tier)} · ${roleLabel(hero.role)} · ${elementLabel(hero.element)}`),
        el('div', 'admin-hero-stats', `HP: ${hero.hp} · Công: ${hero.attack} · Giáp: ${hero.armor} · Tầm: ${scaledAttackRange(hero.range)} · Tốc: ${hero.interval}s`)
      );
      headerRow.append(heroPortrait(hero), meta);

      const descBox = el('div', 'admin-hero-desc');
      if (hero.ability) {
        descBox.append(el('p', '', `Kỹ năng [${hero.ability.name}]: ${hero.ability.description} (${abilityCost(hero)})`));
        descBox.append(el('p', 'muted', controlLine(hero)));
      }
      if (hero.trait) {
        descBox.append(el('p', 'muted', `Đặc tính [${hero.trait.name}]: ${hero.trait.description}`));
      }
      if (hero.attackGeometry) {
        descBox.append(el('p', 'muted', `Đòn đánh: ${ATTACK_GEOMETRY_NAMES[hero.attackGeometry.type] ?? hero.attackGeometry.type}`));
      }
      if (hero.onHitTrait) {
        descBox.append(el('p', 'muted', `Hiệu ứng: ${ON_HIT_TRAIT_NAMES[hero.onHitTrait.type] ?? hero.onHitTrait.type}`));
      }

      // Actions row
      const actions = el('div', 'admin-card-actions');
      actions.append(
        button(`+ Kho (${adminSelectedRank}★)`, () => {
          debug('client.admin-get-hero', { heroId: hero.id, rank: adminSelectedRank, deploy: false });
          ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: adminSelectedRank, deploy: false });
        }, 'admin-action-btn highlight'),
        button(`Ra trận (${adminSelectedRank}★)`, () => {
          debug('client.admin-get-hero', { heroId: hero.id, rank: adminSelectedRank, deploy: true });
          ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: adminSelectedRank, deploy: true });
        }, 'admin-action-btn primary'),
        button(isTarget ? 'Bỏ chọn' : 'Chọn ghép', () => {
          adminTargetHeroId = isTarget ? null : hero.id;
          update();
        }, `admin-action-btn ${isTarget ? 'active-target' : 'select-target'}`)
      );

      const quickStars = el('div', 'admin-quick-stars');
      quickStars.append(el('span', 'admin-quick-label', 'Nhận nhanh:'));
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach(star => {
        quickStars.append(
          button(`${star}★`, () => {
            debug('client.admin-get-hero', { heroId: hero.id, rank: star, deploy: false });
            ctx.send({ type: 'admin-get-hero', heroId: hero.id, rank: star, deploy: false });
          }, 'admin-star-mini-btn')
        );
      });
      actions.append(quickStars);

      card.append(headerRow, descBox, actions);
      heroList.append(card);
    }
  };

  searchInput.addEventListener('input', update);
  update();
}
