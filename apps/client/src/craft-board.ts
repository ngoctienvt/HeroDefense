import { CRAFT_RECIPES, HEROES, HERO_BY_ID } from '../../../content/catalog.js';
import type { CraftRecipe, Unit } from '../../../packages/contracts/src/types.js';
import type { PanelContext } from './panel-context.js';
import { heroDetail } from './hero-detail.js';
import { debug } from './debug.js';
import { button, el, heroPortrait, iconButton } from './ui.js';
import { elementLabel, roleLabel, starText, tierLabel, TIER_TITLES } from './ui-labels.js';

let selectedHeroId = CRAFT_RECIPES[0].heroId;
let craftOnlyShowRelated = false;

export interface IngredientTreeInfo {
  directCounts: Map<string, number>;
  subCounts: Map<string, number>;
  baseTier1Counts: Map<string, number>;
  hasRecipe: boolean;
}

export function getIngredientTree(targetHeroId: string, recipeByHero: Map<string, CraftRecipe>): IngredientTreeInfo {
  const directCounts = new Map<string, number>();
  const subCounts = new Map<string, number>();
  const baseTier1Counts = new Map<string, number>();

  const recipe = recipeByHero.get(targetHeroId);
  if (!recipe) {
    return { directCounts, subCounts, baseTier1Counts, hasRecipe: false };
  }

  for (const ingId of recipe.ingredients) {
    directCounts.set(ingId, (directCounts.get(ingId) ?? 0) + 1);
  }

  function resolveSub(id: string, multiplier: number) {
    const subRecipe = recipeByHero.get(id);
    if (!subRecipe) {
      baseTier1Counts.set(id, (baseTier1Counts.get(id) ?? 0) + multiplier);
      return;
    }
    for (const subIngId of subRecipe.ingredients) {
      subCounts.set(subIngId, (subCounts.get(subIngId) ?? 0) + multiplier);
      resolveSub(subIngId, multiplier);
    }
  }

  for (const [directId, count] of directCounts.entries()) {
    resolveSub(directId, count);
  }

  for (const directId of directCounts.keys()) {
    subCounts.delete(directId);
  }

  return { directCounts, subCounts, baseTier1Counts, hasRecipe: true };
}


export function renderCraftBoard(container: HTMLElement, ctx: PanelContext): void {
  container.classList.add('craft-layout');
  const owned = Object.values(ctx.state.units).filter(unit => unit.owner === ctx.selfId);
  const embryos = ctx.state.players[ctx.selfId]?.embryos;
  const available = owned.filter(unit => unit.rank === 1 && unit.zone === 0);
  const count = (id: string) => available.filter(unit => unit.heroId === id).length;
  const ownedCount = (id: string) => owned.filter(unit => unit.heroId === id).length;
  const recipeByHero = new Map(CRAFT_RECIPES.map(recipe => [recipe.heroId, recipe]));

  // --- HEADER ---
  const header = el('header', 'craft-header');
  const intro = el('div', 'craft-intro-block');
  intro.append(
    el('h2', '', 'Bát Quái Đồ · Ghép Tướng'),
      el('p', 'muted', `Chọn tướng để xem công thức. Linh Phôi Phẩm 3: ${embryos?.tier3 ?? 0} · Phẩm 4: ${embryos?.tier4 ?? 0}.`)
  );

  const legend = el('div', 'craft-legend');
  const itemDirect = el('span', 'legend-item');
  const dotDirect = el('span', 'legend-dot direct');
  itemDirect.append(dotDirect, el('span', '', 'Nguyên liệu trực tiếp'));

  const itemSub = el('span', 'legend-item');
  const dotSub = el('span', 'legend-dot sub');
  itemSub.append(dotSub, el('span', '', 'Nguyên liệu thành phần'));

  const itemReady = el('span', 'legend-item');
  const dotReady = el('span', 'legend-dot ready');
  itemReady.append(dotReady, el('span', '', 'Đã đủ nguyên liệu'));

  const filterBtn = button(craftOnlyShowRelated ? 'Hiện tất cả 70 tướng' : 'Chỉ hiện tướng ghép liên quan', () => {
    craftOnlyShowRelated = !craftOnlyShowRelated;
    filterBtn.textContent = craftOnlyShowRelated ? 'Hiện tất cả 70 tướng' : 'Chỉ hiện tướng ghép liên quan';
    filterBtn.classList.toggle('active', craftOnlyShowRelated);
    updateHighlights();
  }, `craft-filter-btn ${craftOnlyShowRelated ? 'active' : ''}`);

  legend.append(itemDirect, itemSub, itemReady, filterBtn);
  intro.append(legend);

  if (owned.length > 0) {
    const ownedBar = el('div', 'craft-owned-bar');
    ownedBar.append(el('span', 'craft-owned-label', `Đang sở hữu (${owned.length}):`));
    const heroGroups = new Map<string, Unit[]>();
    for (const u of owned) {
      const g = heroGroups.get(u.heroId) ?? [];
      g.push(u);
      heroGroups.set(u.heroId, g);
    }
    for (const [hId, units] of heroGroups.entries()) {
      const h = HERO_BY_ID[hId];
      if (!h) continue;
      const rankSummary = units.map(u => starText(u.rank)).join(',');
      const chip = button(`${h.name} (${rankSummary})`, () => {
        selectHero(hId);
        const targetIcon = gallery.querySelector<HTMLButtonElement>(`[data-hero-id="${hId}"]`);
        targetIcon?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 'craft-owned-chip');
      chip.dataset.heroId = hId;
      chip.title = `${h.name} (Phẩm ${h.tier}) · Đang có ${units.length} bản sao · Nhấp để xem công thức ghép`;
      ownedBar.append(chip);
    }
    intro.append(ownedBar);
  }

  header.append(
    intro,
    iconButton('dong', 'Đóng [Esc]', () => ctx.openPanel(null), 'ghost')
  );

  // --- MAIN CONTENT ---
  const gallery = el('div', 'craft-gallery');
  gallery.setAttribute('aria-label', 'Danh sách 70 nhân vật theo phẩm chất');
  const detail = el('section', 'craft-detail');

  const updateHighlights = () => {
    const { directCounts, subCounts, hasRecipe } = getIngredientTree(selectedHeroId, recipeByHero);
    const icons = gallery.querySelectorAll<HTMLButtonElement>('.craft-icon');
    for (const icon of icons) {
      const heroId = icon.dataset.heroId;
      if (!heroId) continue;
      const isSelected = heroId === selectedHeroId;
      icon.classList.toggle('selected', isSelected);
      icon.setAttribute('aria-pressed', String(isSelected));

      const badge = icon.querySelector<HTMLSpanElement>('.craft-ingredient-badge');

      if (directCounts.has(heroId)) {
        const needed = directCounts.get(heroId)!;
        const have = count(heroId);
        const isReady = have >= needed;
        icon.classList.add('is-direct-ingredient');
        icon.classList.remove('is-sub-ingredient');
        icon.classList.toggle('ingredient-ready', isReady);
        icon.classList.toggle('ingredient-missing', !isReady);
        if (badge) {
          badge.textContent = isReady ? `✓ Đủ ${needed}` : `Cần x${needed}`;
          badge.hidden = false;
        }
      } else if (subCounts.has(heroId)) {
        const subNeed = subCounts.get(heroId)!;
        icon.classList.add('is-sub-ingredient');
        icon.classList.remove('is-direct-ingredient', 'ingredient-ready', 'ingredient-missing');
        if (badge) {
          badge.textContent = `Gốc x${subNeed}`;
          badge.hidden = false;
        }
      } else {
        icon.classList.remove('is-direct-ingredient', 'is-sub-ingredient', 'ingredient-ready', 'ingredient-missing');
        if (badge) {
          badge.textContent = '';
          badge.hidden = true;
        }
      }

      if (hasRecipe) {
        const isRelevant = isSelected || directCounts.has(heroId) || subCounts.has(heroId);
        icon.classList.toggle('is-dimmed', !isRelevant);
        icon.classList.toggle('is-hidden', craftOnlyShowRelated && !isRelevant);
      } else {
        icon.classList.remove('is-dimmed');
        icon.classList.remove('is-hidden');
      }
    }

    const tierSections = gallery.querySelectorAll<HTMLElement>('.craft-tier-section');
    for (const section of tierSections) {
      if (!craftOnlyShowRelated || !hasRecipe) {
        section.classList.remove('is-hidden');
      } else {
        const visibleIcons = section.querySelectorAll<HTMLElement>('.craft-icon:not(.is-hidden)');
        section.classList.toggle('is-hidden', visibleIcons.length === 0);
      }
    }

    const ownedChips = intro.querySelectorAll<HTMLButtonElement>('.craft-owned-chip');
    for (const chip of ownedChips) {
      const hId = chip.dataset.heroId;
      if (!hId) continue;
      const isTarget = hId === selectedHeroId;
      const isDirect = directCounts.has(hId);
      const isSub = subCounts.has(hId);
      const isRelevant = isTarget || isDirect || isSub;
      chip.classList.toggle('is-target', isTarget);
      chip.classList.toggle('is-needed-direct', isDirect);
      chip.classList.toggle('is-needed-sub', isSub);
      chip.classList.toggle('is-dimmed', hasRecipe && !isRelevant);
    }
  };

  const selectHero = (heroId: string) => {
    selectedHeroId = heroId;
    debug('client.craft-preview', { heroId });
    updateHighlights();
    updateDetail();
  };

  const updateDetail = () => {
    detail.replaceChildren();
    const hero = HERO_BY_ID[selectedHeroId];
    if (!hero) return;
    const recipe = recipeByHero.get(selectedHeroId);

    // Hero Header
    const title = el('div', 'craft-result');
    const info = el('div', 'craft-result-info');
    info.append(
      el('h3', '', hero.name),
      el('p', 'muted', `${roleLabel(hero.role)} · Hành ${elementLabel(hero.element)} · ${tierLabel(hero.tier)}`)
    );


    title.append(heroPortrait(hero), info);
    detail.append(title);

    detail.append(heroDetail(hero));

    // Tier 1 Hero (No recipe to craft)
    if (!recipe) {
      detail.append(
        el('p', 'hint', 'Tướng Phẩm 1 là nguyên liệu khởi đầu từ Chiêu Mộ [B], không cần công thức ghép.')
      );

      const usedIn = CRAFT_RECIPES.filter(r => r.ingredients.includes(selectedHeroId));
      if (usedIn.length > 0) {
        detail.append(el('h3', 'craft-subtitle', 'Có thể dùng để ghép các tướng:'));
        const usesList = el('div', 'craft-tier1-uses');
        for (const r of usedIn) {
          const targetHero = HERO_BY_ID[r.heroId];
          if (!targetHero) continue;
          const chip = el('div', 'craft-use-chip');
          chip.append(
            heroPortrait(targetHero),
            el('span', '', `${targetHero.name} (${tierLabel(targetHero.tier)})`)
          );
          chip.title = `Nhấp để xem công thức ghép ${targetHero.name}`;
          chip.addEventListener('click', () => {
            selectHero(targetHero.id);
            const targetIcon = gallery.querySelector<HTMLButtonElement>(`[data-hero-id="${targetHero.id}"]`);
            targetIcon?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          });
          usesList.append(chip);
        }
        detail.append(usesList);
      }
      return;
    }

    // Direct Ingredients
    const ingredientsTitle = el('h3', 'craft-subtitle', `Công thức ghép (${recipe.ingredients.length} tướng)`);
    detail.append(ingredientsTitle);

    const ingredients = el('div', 'craft-ingredients');
    const used = new Map<string, number>();
    const chosen: Unit[] = [];
    const missing: string[] = [];
    for (const id of recipe.ingredients) {
      const needed = (used.get(id) ?? 0) + 1;
      used.set(id, needed);
      const unit = available.find(item => item.heroId === id && !chosen.includes(item));
      if (unit) chosen.push(unit);
      else missing.push(id);
      const ingredient = HERO_BY_ID[id];
      const row = el('div', `craft-ingredient ${unit ? 'ready' : 'missing'}`);
      row.append(heroPortrait(ingredient));
      const ingInfo = el('div', 'craft-ingredient-info');
      ingInfo.append(
        el('strong', '', ingredient.name),
        el('small', '', `${roleLabel(ingredient.role)} · ${tierLabel(ingredient.tier)}`)
      );
      const haveCount = count(id);
      const status = el('span', 'craft-ingredient-status', `${Math.min(haveCount, needed)}/${needed} ${haveCount >= needed ? '✓' : ''}`);
      row.append(ingInfo, status);
      row.title = `Nhấp để xem công thức ghép ${ingredient.name}`;
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        selectHero(id);
        const targetIcon = gallery.querySelector<HTMLButtonElement>(`[data-hero-id="${id}"]`);
        targetIcon?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      ingredients.append(row);
    }
    detail.append(ingredients);

    // Sub-ingredients summary for higher tier heroes (Tier 3-6)
    const { baseTier1Counts } = getIngredientTree(selectedHeroId, recipeByHero);
    if (baseTier1Counts.size > 0 && hero.tier > 2) {
      const subSec = el('div', 'craft-sub-section');
      subSec.append(el('h4', 'craft-sub-title', 'Tổng nguyên liệu Phẩm 1 khởi đầu cần:'));
      const chips = el('div', 'craft-sub-ingredients');
      for (const [id, reqCount] of baseTier1Counts.entries()) {
        const subHero = HERO_BY_ID[id];
        if (!subHero) continue;
        const chip = el('button', 'craft-sub-chip', `${subHero.name} x${reqCount} (có ${count(id)})`);
        chip.type = 'button';
        chip.title = `Nhấp để xem ${subHero.name}`;
        chip.addEventListener('click', () => {
          selectHero(id);
          const targetIcon = gallery.querySelector<HTMLButtonElement>(`[data-hero-id="${id}"]`);
          targetIcon?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        chips.append(chip);
      }
      subSec.append(chips);
      detail.append(subSec);
    }

    // Craft Button
    const missingTier = missing.length === 1 ? HERO_BY_ID[missing[0]]?.tier : 0;
    const useEmbryo = missingTier === 3 && (embryos?.tier3 ?? 0) > 0 || missingTier === 4 && (embryos?.tier4 ?? 0) > 0;
    if (useEmbryo) {
      const substitute = ingredients.querySelector<HTMLElement>('.craft-ingredient.missing');
      substitute?.classList.replace('missing', 'ready');
      const status = substitute?.querySelector<HTMLElement>('.craft-ingredient-status');
      if (status) status.textContent = `Linh Phôi ${tierLabel(missingTier)} ✓`;
    }
    const ready = missing.length === 0 || useEmbryo;
    detail.append(button(ready ? `Ghép ${hero.name}${useEmbryo ? ` · dùng Linh Phôi ${tierLabel(missingTier)}` : ''}` : `Thiếu ${missing.length} nguyên liệu`, () => {
      debug('client.craft-selected', { heroId: selectedHeroId });
      ctx.send({ type: 'craft', heroId: selectedHeroId });
    }, 'primary', !ready));

    detail.append(el('p', 'hint', 'Dùng tướng đúng công thức; có thể thay một nguyên liệu Phẩm 3 hoặc 4 còn thiếu bằng Linh Phôi cùng phẩm. Tướng mới vào bộ sưu tập; giữ cấp trang bị cao nhất từng nhóm.'));
  };

  // Build Gallery Bands
  for (let tier = 1; tier <= 6; tier++) {
    const heroesInTier = HEROES.filter(item => item.tier === tier);
    const section = el('section', `craft-tier-section tier-${tier}`);
    section.setAttribute('aria-label', `Phẩm ${tier}`);

    const label = el('div', 'craft-tier-label', `${TIER_TITLES[tier] ?? tierLabel(tier)} (${heroesInTier.length})`);
    const grid = el('div', 'craft-band-grid');

    for (const hero of heroesInTier) {
      const total = ownedCount(hero.id);
      const icon = button('', () => selectHero(hero.id), `craft-icon ${total ? 'owned' : 'unowned'}`);
      icon.dataset.heroId = hero.id;
      icon.title = `${hero.name} (${tierLabel(tier)} · ${roleLabel(hero.role)}) · Đang có ${total}`;
      icon.setAttribute('aria-label', `${hero.name}, phẩm ${tier}, đang có ${total}`);
      icon.append(heroPortrait(hero));
      icon.append(el('span', 'craft-name', hero.name));
      if (total) icon.append(el('small', 'craft-count', `x${total}`));

      const badge = el('span', 'craft-ingredient-badge');
      badge.hidden = true;
      icon.append(badge);

      grid.append(icon);
    }

    section.append(label, grid);
    gallery.append(section);
  }

  const body = el('div', 'craft-body');
  body.append(gallery, detail);
  container.append(header, body);

  updateHighlights();
  updateDetail();
}
