import { button, el } from './ui.js';
import { icon } from './ui-icons.js';

/**
 * Floating HUD layer that lives outside the containers `render()` rebuilds every second, so menus,
 * the summon choice, tooltips and confirm dialogs survive re-renders (and keep focus). Callers
 * refill a popover's body when their own state signature changes.
 */
export interface ConfirmOptions { title: string; message: string; confirmLabel: string; danger?: boolean }
interface PopoverEntry { key: string; root: HTMLElement; body: HTMLElement; modal: boolean; onClose?: () => void }

export class HudOverlay {
  readonly layer = el('div', 'hud-overlay-layer');
  private readonly tooltip = el('div', 'hud-tooltip');
  private readonly popovers: PopoverEntry[] = [];
  private confirmClose: ((value: boolean) => void) | null = null;
  private readonly outsidePointer = (event: PointerEvent) => {
    const top = this.popovers.at(-1);
    if (!top?.modal || this.confirmClose) return;
    const target = event.target as Node | null;
    if (target && (top.root.contains(target) || (target instanceof Element && target.closest(`[data-popover-toggle="${top.key}"]`)))) return;
    this.closePopover(top.key);
  };

  constructor(parent: HTMLElement) {
    this.tooltip.hidden = true;
    this.tooltip.setAttribute('role', 'tooltip');
    this.layer.append(this.tooltip);
    parent.append(this.layer);
    document.addEventListener('pointerdown', this.outsidePointer, true);
  }

  /** True while a dialog or a modal popover is open: the keymap then only handles Escape. */
  get blocking(): boolean { return this.confirmClose !== null || this.popovers.some(entry => entry.modal); }

  isOpen(key: string): boolean { return this.popovers.some(entry => entry.key === key); }

  /** Opens (or returns the already open) popover body. Modal popovers close on outside click. */
  openPopover(key: string, className: string, options: { modal?: boolean; label?: string; onClose?: () => void } = {}): HTMLElement {
    const existing = this.popovers.find(entry => entry.key === key);
    if (existing) return existing.body;
    const root = el('section', `hud-popover ${className}`);
    root.setAttribute('role', options.modal ? 'dialog' : 'region');
    if (options.label) root.setAttribute('aria-label', options.label);
    const body = el('div', 'hud-popover-body');
    root.append(body);
    this.layer.append(root);
    this.popovers.push({ key, root, body, modal: options.modal ?? false, onClose: options.onClose });
    return body;
  }

  closePopover(key: string): void {
    const index = this.popovers.findIndex(entry => entry.key === key);
    if (index < 0) return;
    const [entry] = this.popovers.splice(index, 1);
    entry.root.remove();
    entry.onClose?.();
  }

  /** Escape handling: closes the dialog, else the newest popover. Returns what closed, or null. */
  closeTop(): string | null {
    if (this.confirmClose) { this.confirmClose(false); return 'confirm'; }
    const top = this.popovers.at(-1);
    if (!top) return null;
    this.closePopover(top.key);
    return top.key;
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.confirmClose?.(false);
    return new Promise(resolve => {
      const backdrop = el('div', 'hud-confirm-backdrop');
      const dialog = el('section', 'hud-confirm');
      dialog.setAttribute('role', 'alertdialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', options.title);
      const finish = (value: boolean) => { this.confirmClose = null; backdrop.remove(); resolve(value); };
      const cancel = button('Hủy', () => finish(false), 'secondary');
      const accept = button(options.confirmLabel, () => finish(true), options.danger ? 'danger-solid' : 'primary');
      const actions = el('div', 'hud-confirm-actions');
      actions.append(cancel, accept);
      dialog.append(el('h2', '', options.title), el('p', '', options.message), actions);
      // Two-button focus trap; Escape is routed here through closeTop().
      dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        (document.activeElement === cancel ? accept : cancel).focus();
      });
      backdrop.addEventListener('pointerdown', event => { if (event.target === backdrop) finish(false); });
      backdrop.append(dialog);
      this.layer.append(backdrop);
      this.confirmClose = finish;
      cancel.focus();
    });
  }

  /** Shows the tooltip next to a rect (flips to stay on screen) or at a pointer position. */
  showTooltip(content: Node, at: DOMRect | { x: number; y: number }): void {
    this.tooltip.replaceChildren(content);
    this.tooltip.hidden = false;
    this.positionTooltip(at);
  }

  /** Moves the visible tooltip without rebuilding it (pointer tracking over the battlefield). */
  positionTooltip(at: DOMRect | { x: number; y: number }): void {
    if (this.tooltip.hidden) return;
    const box = this.tooltip.getBoundingClientRect();
    const margin = 10;
    let x: number, y: number;
    if (at instanceof DOMRect) {
      x = at.left + at.width / 2 - box.width / 2;
      y = at.top - box.height - margin;
      if (y < margin) y = at.bottom + margin;
    } else {
      x = at.x + 18;
      y = at.y - box.height - 12;
      if (y < margin) y = at.y + 22;
    }
    x = Math.max(margin, Math.min(window.innerWidth - box.width - margin, x));
    y = Math.max(margin, Math.min(window.innerHeight - box.height - margin, y));
    this.tooltip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  hideTooltip(): void { this.tooltip.hidden = true; this.tooltip.replaceChildren(); }

  dispose(): void {
    document.removeEventListener('pointerdown', this.outsidePointer, true);
    this.confirmClose?.(false);
    this.layer.remove();
  }
}

/** Small close button used in popover headers. */
export function closeButton(label: string, action: () => void): HTMLButtonElement {
  const node = button('', action, 'icon-button');
  node.setAttribute('aria-label', label);
  node.append(icon('dong', { size: 16 }));
  return node;
}
