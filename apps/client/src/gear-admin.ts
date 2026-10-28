import { GEAR_RARITY_NAMES, GEAR_SLOT_NAMES, GEAR_UNIQUES } from '../../../content/gear-design.js';
import { GEAR_RARITIES, GEAR_SLOTS, GEAR_UNIQUE_IDS, type GearRarity, type GearSlot, type GearUniqueId } from '../../../packages/contracts/src/gear-types.js';
import type { Command } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { PanelContext } from './panel-context.js';
import { button, el, heading } from './ui.js';

let chosenSlot: GearSlot | '' = '';
let chosenRarity: GearRarity | '' = '';
let chosenUnique: GearUniqueId | '' = '';

export function renderGearAdmin(ctx: PanelContext): HTMLElement {
  const root = el('section', 'admin-gear-section');
  root.append(heading('Tạo trang bị thử nghiệm', 'Chọn dòng độc nhất sẽ khóa khe tương ứng và phẩm Vàng. Món được đưa vào Kho Đồ [I].'));
  const slot = el('select'), rarity = el('select'), unique = el('select');
  slot.setAttribute('aria-label', 'Khe trang bị thử nghiệm'); rarity.setAttribute('aria-label', 'Phẩm trang bị thử nghiệm'); unique.setAttribute('aria-label', 'Dòng độc nhất thử nghiệm');
  const add = (select: HTMLSelectElement, value: string, text: string) => { const option = el('option', '', text); option.value = value; select.append(option); };
  add(slot, '', 'Khe ngẫu nhiên'); add(rarity, '', 'Phẩm ngẫu nhiên'); add(unique, '', 'Dòng độc nhất ngẫu nhiên theo phẩm');
  for (const value of GEAR_SLOTS) add(slot, value, GEAR_SLOT_NAMES[value]);
  for (const value of GEAR_RARITIES) add(rarity, value, GEAR_RARITY_NAMES[value]);
  for (const value of GEAR_UNIQUE_IDS) add(unique, value, `${GEAR_UNIQUES[value].name} · ${GEAR_SLOT_NAMES[GEAR_UNIQUES[value].slot]}`);
  slot.value = chosenSlot; rarity.value = chosenRarity; unique.value = chosenUnique;
  const description = el('p', 'hint');
  const update = () => {
    slot.disabled = !!chosenUnique; rarity.disabled = !!chosenUnique;
    slot.value = chosenUnique ? GEAR_UNIQUES[chosenUnique].slot : chosenSlot;
    rarity.value = chosenUnique ? 'gold' : chosenRarity;
    description.textContent = chosenUnique ? GEAR_UNIQUES[chosenUnique].description : 'Dùng phẩm Vàng để tạo món có dòng độc nhất ngẫu nhiên.';
  };
  slot.addEventListener('change', () => { chosenSlot = GEAR_SLOTS.find(id => id === slot.value) ?? ''; });
  rarity.addEventListener('change', () => { chosenRarity = GEAR_RARITIES.find(id => id === rarity.value) ?? ''; });
  unique.addEventListener('change', () => { chosenUnique = GEAR_UNIQUE_IDS.find(id => id === unique.value) ?? ''; update(); });
  root.append(slot, rarity, unique, description, button('Tạo món', () => {
    const command: Extract<Command, { type: 'admin-item' }> = { type: 'admin-item',
      ...(chosenUnique ? { slot: GEAR_UNIQUES[chosenUnique].slot, rarity: 'gold' as const, unique: chosenUnique } : {
        ...(chosenSlot ? { slot: chosenSlot } : {}), ...(chosenRarity ? { rarity: chosenRarity } : {}),
      }),
    };
    debug('client.gear-admin-item', { slot: command.slot, rarity: command.rarity, unique: command.unique });
    ctx.send(command);
  }, 'primary'));
  update(); return root;
}
