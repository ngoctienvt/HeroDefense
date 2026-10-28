import { HERO_BY_ID } from '../../../content/catalog.js';
import { GEAR_LINES, GEAR_SLOT_NAMES, gearItemName, gearLineFits } from '../../../content/gear-design.js';
import type { GearDropDecision, GearDropTarget, GearInteractionView } from './gear-drop-policy.js';
import { gearComparison, gearDeltaText } from './gear-ui.js';
import { el } from './ui.js';

/** Only rendering retains DOM nodes. Gesture identity is always item/unit IDs. */
export class GearDragPresentation {
  private ghost: HTMLElement | null = null;
  private preview: HTMLElement | null = null;
  private previewKey = '';
  constructor(private readonly root: HTMLElement, private readonly layer: HTMLElement, private readonly canvas: HTMLCanvasElement) {}

  targetAt(x: number, y: number): GearDropTarget | 'world' {
    const hit = document.elementFromPoint(x, y);
    if (!hit || !this.root.contains(hit)) return { kind: 'invalid' };
    const target = this.unitTarget(hit);
    if (target) return { kind: 'unit', unitId: target.dataset.gearTargetUnitId ?? '', slot: target.dataset.gearSlot };
    const bag = hit.closest('[data-gear-bag-drop]');
    if (bag && this.bagTarget(hit, bag)) return { kind: 'bag' };
    return hit === this.canvas ? 'world' : { kind: 'invalid' };
  }
  sourceFrom(event: Event): string | null {
    return event.target instanceof Element ? event.target.closest<HTMLElement>('[data-gear-item-id]')?.dataset.gearItemId ?? null : null;
  }
  sourceIsTray(event: Event): boolean { return event.target instanceof Element && !!event.target.closest('.hud-gear-tray'); }
  sourceSizeFrom(event: Event): string | undefined { return event.target instanceof Element ? event.target.closest<HTMLElement>('[data-gear-item-id]')?.dataset.size : undefined; }
  targetFrom(event: Event): GearDropTarget {
    if (!(event.target instanceof Element)) return { kind: 'invalid' };
    const target = this.unitTarget(event.target);
    if (target) return { kind: 'unit', unitId: target.dataset.gearTargetUnitId ?? '', slot: target.dataset.gearSlot };
    const bag = event.target.closest('[data-gear-bag-drop]');
    if (bag && this.bagTarget(event.target, bag)) return { kind: 'bag' };
    return { kind: 'invalid' };
  }
  private unitTarget(hit: Element): HTMLElement | null {
    const target = hit.closest<HTMLElement>('[data-gear-target-unit-id]');
    const control = hit.closest('button,input,select,textarea,a,[role="button"]');
    if (control && control !== target && !control.matches('[data-gear-item-id],[data-gear-target-unit-id]')) return null;
    return target;
  }
  private bagTarget(hit: Element, bag: Element): boolean {
    const control = hit.closest('[data-gear-item-id],button,input,select,textarea,a,[role="button"]');
    return !control || control === bag;
  }
  begin(itemId: string, view: GearInteractionView, sourceSize?: string): void {
    this.clearGhost();
    const candidates = [...this.root.querySelectorAll<HTMLElement>('[data-gear-item-id]')].filter(node => node.dataset.gearItemId === itemId);
    const source = candidates.find(node => node.dataset.size === sourceSize) ?? candidates[0];
    const item = view.state?.players[view.selfId]?.gear.find(item => item.id === itemId);
    const ghost = el('div', 'gear-drag-ghost');
    Object.assign(ghost.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', zIndex: '1' });
    ghost.setAttribute('aria-hidden', 'true');
    if (source) {
      const clone = source.cloneNode(true);
      if (clone instanceof HTMLElement) {
        for (const node of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
          node.removeAttribute('id'); node.removeAttribute('data-gear-item-id'); node.removeAttribute('data-gear-target-unit-id');
          node.removeAttribute('tabindex'); node.removeAttribute('title'); node.removeAttribute('data-tip-gear');
        }
        const box = source.getBoundingClientRect();
        Object.assign(ghost.style, { width: `${box.width}px`, height: `${box.height}px` });
        clone.style.width = '100%'; clone.style.height = '100%'; ghost.append(clone);
      }
    } else if (item) ghost.textContent = gearItemName(item);
    this.layer.append(ghost); this.ghost = ghost;
  }
  paint(itemId: string | null, target: GearDropTarget, decision: GearDropDecision | null, view: GearInteractionView, x: number, y: number): void {
    this.clearHighlights();
    if (itemId) for (const node of this.root.querySelectorAll<HTMLElement>('[data-gear-item-id]'))
      node.classList.toggle('is-gear-armed', node.dataset.gearItemId === itemId);
    const valid = decision?.kind === 'equip' || decision?.kind === 'unequip' || decision?.kind === 'noop';
    if (target.kind === 'unit') for (const node of this.root.querySelectorAll<HTMLElement>('[data-gear-target-unit-id]')) {
      if (node.dataset.gearTargetUnitId === target.unitId && (!target.slot || node.dataset.gearSlot === target.slot))
        node.classList.add(valid ? 'is-gear-drop-valid' : 'is-gear-drop-invalid');
    }
    if (target.kind === 'bag') for (const node of this.root.querySelectorAll<HTMLElement>('[data-gear-bag-drop]')) node.classList.add(valid ? 'is-gear-drop-valid' : 'is-gear-drop-invalid');
    if (this.ghost) this.ghost.style.transform = `translate(${Math.round(x + 12)}px, ${Math.round(y + 12)}px)`;
    if (!decision || !itemId) { this.preview?.remove(); this.preview = null; this.previewKey = ''; return; }
    const key = `${itemId}:${view.state?.players[view.selfId]?.gearVersion}:${target.kind === 'unit' ? `${target.unitId}:${target.slot}` : target.kind}:${decision.kind}:${decision.reason}`;
    if (key === this.previewKey && this.preview) { this.positionPreview(this.preview, x, y); return; }
    this.preview?.remove(); this.preview = null; this.previewKey = key;
    const preview = el('div', `gear-drop-preview ${valid ? 'is-valid' : 'is-invalid'}`);
    preview.setAttribute('role', 'status');
    Object.assign(preview.style, { position: 'fixed', left: '0', top: '0', pointerEvents: 'none', maxWidth: '300px' });
    preview.append(el('strong', '', decision.reason));
    if (decision.kind === 'equip' || decision.kind === 'unequip') {
      if (decision.unit) preview.prepend(el('strong', '', `${HERO_BY_ID[decision.unit.heroId]?.name ?? 'Tướng'} · ${GEAR_SLOT_NAMES[decision.item.slot]}`));
      if (decision.replacedItem) preview.append(el('small', '', `${gearItemName(decision.replacedItem)} → kho`));
      preview.append(el('small', '', `${gearItemName(decision.item)} +${decision.item.enhance}`));
      if (decision.unit) for (const delta of gearComparison(decision.item, decision.replacedItem, decision.unit.heroId).filter(line => Math.abs(line.delta) >= .005).slice(0, 3))
        preview.append(el('small', 'gear-drop-delta', gearDeltaText(delta.stat, delta.delta)));
      if (decision.unit) {
        const heroId = decision.unit.heroId;
        const incompatible = decision.item.lines.filter(line => gearLineFits(line.stat, heroId) === false);
        if (incompatible.length) preview.append(el('small', 'muted', `Không hợp cơ chế: ${incompatible.map(line => GEAR_LINES[line.stat].name).join(', ')}. Vẫn có thể mặc.`));
      }
    }
    this.layer.append(preview); this.preview = preview;
    this.positionPreview(preview, x, y);
  }
  private positionPreview(preview: HTMLElement, x: number, y: number): void {
    const box = preview.getBoundingClientRect();
    const left = Math.max(8, Math.min(x + 64, window.innerWidth - box.width - 8));
    const top = Math.max(8, Math.min(y + 12, window.innerHeight - box.height - 8));
    preview.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
  private clearGhost(): void { this.ghost?.remove(); this.ghost = null; }
  private clearHighlights(): void {
    for (const node of this.root.querySelectorAll('.is-gear-armed,.is-gear-drop-valid,.is-gear-drop-invalid')) node.classList.remove('is-gear-armed', 'is-gear-drop-valid', 'is-gear-drop-invalid');
  }
  clear(): void { this.clearGhost(); this.preview?.remove(); this.preview = null; this.previewKey = ''; this.clearHighlights(); }
}
