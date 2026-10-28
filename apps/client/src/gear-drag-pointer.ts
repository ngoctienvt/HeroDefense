import { gearDragThreshold } from './gear-drop-policy.js';

interface GearPointerCallbacks {
  active: () => boolean; press: (event: PointerEvent) => boolean; begin: (event: PointerEvent) => void;
  move: (event: PointerEvent) => void; drop: (event: PointerEvent) => void;
  click: (event: MouseEvent) => void; key: (event: KeyboardEvent) => void; cancel: (reason: string) => void;
}
/** Capture transfers to the stable root only after threshold; no source node survives a render. */
export class GearDragPointer {
  private press: { id: number; x: number; y: number } | null = null;
  private dragging = false;
  private releasing = false;
  private suppressUntil = 0;
  private readonly removers: (() => void)[] = [];
  constructor(private readonly root: HTMLElement, private readonly callbacks: GearPointerCallbacks) {
    this.listen(root, 'pointerdown', this.down);
    this.listen(window, 'pointermove', this.move);
    this.listen(window, 'pointerup', this.up);
    this.listen(window, 'pointercancel', this.pointerCancel);
    this.listen(root, 'lostpointercapture', this.lostCapture);
    this.listen(root, 'click', this.click);
    this.listen(window, 'keydown', event => callbacks.key(event as KeyboardEvent));
    this.listen(window, 'contextmenu', this.contextMenu);
    // Element blur is captured at window too (focus changes and HUD replacement). Only leaving
    // the window cancels a gesture; focusing another control must keep the armed pointer alive.
    this.listen(window, 'blur', event => { if (event.target === window) this.abort('blur'); }, { capture: false });
    this.listen(window, 'pagehide', () => this.abort('pagehide'));
    this.listen(root, 'dragstart', event => { if (callbacks.active()) event.preventDefault(); });
    this.listen(root, 'wheel', event => {
      if (callbacks.active()) { event.stopImmediatePropagation(); if (event.target === this.root.querySelector('canvas')) event.preventDefault(); }
    }, { capture: true, passive: false });
  }
  private listen(target: EventTarget, name: string, listener: EventListener, options: AddEventListenerOptions = { capture: true }): void {
    target.addEventListener(name, listener, options); this.removers.push(() => target.removeEventListener(name, listener, options));
  }
  private down = (raw: Event): void => {
    const event = raw as PointerEvent;
    if (event.button === 2 && this.callbacks.active()) { this.consume(event); this.suppressUntil = Date.now() + 500; this.abort('rightclick'); return; }
    if (!event.isPrimary || event.button !== 0 || !this.callbacks.press(event)) return;
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  private move = (raw: Event): void => {
    const event = raw as PointerEvent, press = this.press;
    if (!press || press.id !== event.pointerId) {
      if (this.callbacks.active()) this.callbacks.move(event);
      return;
    }
    if (!this.dragging && gearDragThreshold(press.x, press.y, event.clientX, event.clientY)) {
      try { this.root.setPointerCapture(press.id); }
      catch { this.abort('capture-failed'); return; }
      this.dragging = true; this.callbacks.begin(event);
    }
    if (this.dragging) { this.consume(event); this.callbacks.move(event); }
  };
  private up = (raw: Event): void => {
    const event = raw as PointerEvent;
    if (!this.press || this.press.id !== event.pointerId) return;
    if (this.dragging) {
      this.consume(event); this.suppressUntil = Date.now() + 500;
      this.callbacks.drop(event);
    }
    this.release();
  };
  private click = (raw: Event): void => {
    const event = raw as MouseEvent;
    if (event.detail > 0 && Date.now() < this.suppressUntil) { this.suppressUntil = 0; this.consume(event); return; }
    this.callbacks.click(event);
  };
  private contextMenu = (event: Event): void => {
    if (this.callbacks.active() || Date.now() < this.suppressUntil) { this.consume(event); this.abort('rightclick'); }
  };
  private pointerCancel = (raw: Event): void => {
    if (!this.press || (raw as PointerEvent).pointerId === this.press.id) this.abort('pointercancel');
  };
  private lostCapture = (raw: Event): void => {
    if (!this.releasing && this.press?.id === (raw as PointerEvent).pointerId) this.abort('lostpointercapture');
  };
  private consume(event: Event): void { event.preventDefault(); event.stopImmediatePropagation(); }
  private abort(reason: string): void { this.release(); this.callbacks.cancel(reason); }
  release(): void {
    const press = this.press; this.press = null; this.dragging = false; this.releasing = true;
    if (press && this.root.hasPointerCapture(press.id)) this.root.releasePointerCapture(press.id);
    this.releasing = false;
  }
  dispose(): void { this.release(); this.removers.splice(0).forEach(remove => remove()); }
}
