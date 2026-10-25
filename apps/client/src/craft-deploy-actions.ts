import type { Unit } from '../../../packages/contracts/src/types.js';
import type { PanelContext } from './panel-context.js';
import { ownUnits } from './panel-context.js';
import { debug } from './debug.js';
import { el, iconButton } from './ui.js';
import { slotLabel, SLOT_COUNT, starText } from './ui-labels.js';

/**
 * Lets the player deploy the inspected hero straight from Ghép Tướng instead of switching to Đội Hình.
 * Mirrors the roster rules: first free slot, only bench copies in the base zone; the server still validates.
 */
export function craftDeployActions(heroId: string, ctx: PanelContext): HTMLElement | null {
  const units = ownUnits(ctx).filter(unit => !unit.summonKind);
  const copies = units.filter(unit => unit.heroId === heroId);
  if (!copies.length) return null;

  const free = Array.from({ length: SLOT_COUNT }, (_, slot) => slot).find(slot => !units.some(other => other.slot === slot));
  const section = el('div', 'craft-deploy');
  section.append(el('h4', 'craft-deploy-title', 'Xuất trận'));

  const deployed = copies.filter(unit => unit.slot >= 0).sort((a, b) => a.slot - b.slot);
  if (deployed.length) {
    section.append(el('p', 'craft-deploy-note', `Đang xuất trận: ${deployed.map(unit => `${slotLabel(unit.slot)} (${starText(unit.rank)})`).join(', ')}`));
  }

  const bench = copies.filter(unit => unit.slot < 0).sort((a, b) => b.rank - a.rank);
  if (bench.length) {
    const row = el('div', 'craft-deploy-row');
    for (const unit of bench) row.append(deployButton(unit, free, ctx));
    section.append(row);
  }
  return section;
}

function deployButton(unit: Unit, free: number | undefined, ctx: PanelContext): HTMLElement {
  const label = free === undefined ? `${starText(unit.rank)} · Đội hình đầy` : `${starText(unit.rank)} · Xuất trận Ô ${free + 1}`;
  return iconButton('xuat-tran', label, () => {
    if (free === undefined) return;
    debug('client.craft-deploy', { heroId: unit.heroId, rank: unit.rank, slot: free });
    ctx.send({ type: 'deploy', unitId: unit.id, slot: free });
  }, 'primary small', free === undefined || unit.zone !== 0);
}
