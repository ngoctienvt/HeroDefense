import { GEAR_RARITY_NAMES, GEAR_SLOT_NAMES, GEAR_UNIQUES, gearItemName } from '../../../content/gear-design.js';
import type { GearItem, GearSlot } from '../../../packages/contracts/src/gear-types.js';
import { assetUrl } from './asset-version.js';
import { debug } from './debug.js';
import { el } from './ui.js';
import { icon, type IconName } from './ui-icons.js';

export const GEAR_SLOT_ICONS: Record<GearSlot, IconName> = { weapon: 'vu-khi', armor: 'giap', talisman: 'phap-khi' };
const failedArt = new Set<string>();
let pendingItem: (itemId: string) => boolean = () => false;
let pendingSlot: (unitId: string, slot: GearSlot) => boolean = () => false;
export function configureGearTilePending(query: (itemId: string) => boolean, slotQuery: (unitId: string, slot: GearSlot) => boolean = () => false): void { pendingItem = query; pendingSlot = slotQuery; }
export function gearItemPending(itemId: string): boolean { return pendingItem(itemId); }
export function gearSlotPending(unitId: string, slot: GearSlot): boolean { return pendingSlot(unitId, slot); }

export interface GearTileOptions {
  slot?: GearSlot;
  size: 32 | 44 | 48;
  selected?: boolean;
  pending?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
}

export function gearTileLabel(item: GearItem | undefined, slot: GearSlot): string {
  return item ? `${GEAR_RARITY_NAMES[item.rarity]} · ${gearItemName(item)} · Cấp ${item.level} · +${item.enhance}${item.unique ? ` · Độc nhất: ${GEAR_UNIQUES[item.unique].name}` : ''} · ${item.unitId ? 'Đang mặc' : 'Trong kho'}` : `${GEAR_SLOT_NAMES[slot]} · Trống`;
}

/** Shared raster tile; IDs and state describe the snapshot without changing it. */
export function gearTile(item: GearItem | undefined, options: GearTileOptions): HTMLElement {
  const slot = item?.slot ?? options.slot ?? 'weapon';
  const node = options.interactive || options.onSelect ? el('button', 'gear-tile') : el('span', 'gear-tile');
  if (node instanceof HTMLButtonElement) node.type = 'button';
  node.dataset.size = String(options.size); node.dataset.gearSlot = slot;
  node.dataset.rarity = item?.rarity ?? 'empty';
  node.classList.toggle('is-empty', !item); node.classList.toggle('is-selected', !!options.selected);
  const pending = options.pending ?? (item ? gearItemPending(item.id) : false);
  node.classList.toggle('is-pending', pending);
  if (pending) node.setAttribute('aria-busy', 'true');
  const label = gearTileLabel(item, slot); node.title = label; node.setAttribute('aria-label', label);
  const glyph = icon(GEAR_SLOT_ICONS[slot], { size: Math.round(options.size * .62), className: 'gear-tile-fallback' });
  node.append(glyph);
  if (item) {
    node.dataset.gearItemId = item.id; node.dataset.tipGear = item.id;
    const url = assetUrl(`/assets/gear/${slot}.webp`);
    if (!failedArt.has(url)) {
      const image = el('img', 'gear-tile-art'); image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.draggable = false;
      image.addEventListener('load', () => { glyph.classList.add('is-hidden'); });
      image.addEventListener('error', () => {
        image.remove(); glyph.classList.remove('is-hidden');
        if (!failedArt.has(url)) { failedArt.add(url); debug('client.gear-art-fallback', { slot, url }); }
      }, { once: true });
      image.src = url; node.append(image);
    }
    node.append(el('span', 'gear-tile-enhance', `+${item.enhance}`));
    if (item.unique) {
      const unique = icon('dao-duyen', { size: 12, className: 'gear-tile-unique' });
      unique.setAttribute('aria-hidden', 'true'); node.append(unique);
    }
  } else node.append(el('span', 'gear-tile-empty', '—'));
  if (options.selected !== undefined && node instanceof HTMLButtonElement) node.setAttribute('aria-pressed', String(options.selected));
  if (options.onSelect) node.addEventListener('click', event => { event.stopPropagation(); options.onSelect?.(); });
  return node;
}
