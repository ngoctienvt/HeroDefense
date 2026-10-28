import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GearDragPointer } from '../src/gear-drag-pointer.js';

/** Real Node events exercise listener ordering/cancellation. This adapter does not prove browser picking or pointer capture. */
function input(type: string, values: Record<string, number | boolean> = {}): Event {
  const event = new Event(type, { cancelable: true, bubbles: true });
  for (const [key, value] of Object.entries({ pointerId: 1, isPrimary: true, button: 0, clientX: 0, clientY: 0, detail: 1, ...values }))
    Object.defineProperty(event, key, { value, configurable: true });
  return event;
}

/** Only the stable root's input boundary is supplied; no fake inventory, render, or hit-test behavior. */
class InputRoot extends EventTarget {
  readonly captured = new Set<number>();
  readonly captureCalls: number[] = [];
  readonly releaseCalls: number[] = [];
  captureFails = false;
  querySelector(): null { return null; }
  setPointerCapture(id: number): void {
    if (this.captureFails) throw new Error('Pointer no longer active');
    this.captureCalls.push(id); this.captured.add(id);
  }
  hasPointerCapture(id: number): boolean { return this.captured.has(id); }
  releasePointerCapture(id: number): void {
    this.releaseCalls.push(id); this.captured.delete(id);
    this.dispatchEvent(input('lostpointercapture', { pointerId: id }));
  }
}

const pointers: GearDragPointer[] = [];
let windowInput: EventTarget;
beforeEach(() => { windowInput = new EventTarget(); vi.stubGlobal('window', windowInput); vi.spyOn(Date, 'now').mockReturnValue(1000); });
afterEach(() => { pointers.splice(0).forEach(pointer => pointer.dispose()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup() {
  const root = new InputRoot(), calls: string[] = [];
  let active = false;
  const callbacks = {
    active: () => active,
    press: vi.fn(() => { active = true; calls.push('press'); return true; }),
    begin: vi.fn(() => calls.push('begin')),
    move: vi.fn(() => calls.push('move')),
    drop: vi.fn(() => { active = false; calls.push('drop'); }),
    click: vi.fn(() => calls.push('click')),
    key: vi.fn(),
    cancel: vi.fn((reason: string) => { active = false; calls.push(`cancel:${reason}`); }),
  };
  const pointer = new GearDragPointer(root as unknown as HTMLElement, callbacks); pointers.push(pointer);
  const down = (values: Record<string, number | boolean> = {}) => { const event = input('pointerdown', values); root.dispatchEvent(event); return event; };
  const move = (x: number, y = 0) => { const event = input('pointermove', { clientX: x, clientY: y }); windowInput.dispatchEvent(event); return event; };
  return { root, callbacks, pointer, calls, down, move };
}

describe('gear pointer input boundary', () => {
  it('keeps a pressed item and active drag alive when only a HUD control loses focus', () => {
    const { root, callbacks, down, move } = setup();
    const controlBlur = () => {
      // Model an element blur reaching the window listener. Native DOM propagation is user QA;
      // the input boundary must distinguish this target from an actual window blur.
      const event = new Event('blur');
      Object.defineProperty(event, 'target', { value: new EventTarget() });
      windowInput.dispatchEvent(event);
    };
    down(); controlBlur(); move(6);
    expect(callbacks.begin).toHaveBeenCalledTimes(1);
    expect(root.hasPointerCapture(1)).toBe(true);
    controlBlur(); move(12); windowInput.dispatchEvent(input('pointerup'));
    expect(callbacks.cancel).not.toHaveBeenCalled();
    expect(callbacks.drop).toHaveBeenCalledTimes(1);
    expect(root.hasPointerCapture(1)).toBe(false);
  });

  it('waits for six CSS pixels before capturing the stable root and begins before moving', () => {
    const { root, callbacks, calls, down, move } = setup();
    expect(down().defaultPrevented).toBe(false);
    expect(move(5.9).defaultPrevented).toBe(false);
    expect(root.captureCalls).toEqual([]); expect(callbacks.begin).not.toHaveBeenCalled(); expect(callbacks.move).not.toHaveBeenCalled();
    expect(move(6).defaultPrevented).toBe(true);
    expect(root.captureCalls).toEqual([1]); expect(calls).toEqual(['press', 'begin', 'move']);
    move(12); expect(callbacks.begin).toHaveBeenCalledTimes(1); expect(callbacks.move).toHaveBeenCalledTimes(2);
  });

  it('drops once, releases capture, and suppresses the resulting mouse click', () => {
    const { root, callbacks, down, move } = setup(); down(); move(6);
    const up = input('pointerup'); windowInput.dispatchEvent(up); windowInput.dispatchEvent(input('pointerup'));
    expect(up.defaultPrevented).toBe(true); expect(callbacks.drop).toHaveBeenCalledTimes(1);
    expect(root.releaseCalls).toEqual([1]); expect(root.captured.size).toBe(0); expect(callbacks.cancel).not.toHaveBeenCalled();
    const click = input('click'); root.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true); expect(callbacks.click).not.toHaveBeenCalled();
    root.dispatchEvent(input('click')); expect(callbacks.click).toHaveBeenCalledTimes(1);
  });

  it('allows a short click without capturing, dropping, or suppressing the click', () => {
    const { root, callbacks, down, move } = setup(); down(); move(5.9); windowInput.dispatchEvent(input('pointerup'));
    const click = input('click'); root.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false); expect(callbacks.click).toHaveBeenCalledTimes(1);
    expect(callbacks.drop).not.toHaveBeenCalled(); expect(root.captureCalls).toEqual([]); expect(root.releaseCalls).toEqual([]);
  });

  it('consumes a right click before an order listener and cancels the active interaction', () => {
    const { root, callbacks, down, move } = setup(); down(); move(6);
    const order = vi.fn(); root.addEventListener('pointerdown', order);
    const right = down({ button: 2 });
    expect(right.defaultPrevented).toBe(true); expect(order).not.toHaveBeenCalled();
    expect(callbacks.cancel).toHaveBeenCalledWith('rightclick'); expect(root.captured.size).toBe(0);
    windowInput.dispatchEvent(input('pointerup')); expect(callbacks.drop).not.toHaveBeenCalled();
    const context = input('contextmenu'); windowInput.dispatchEvent(context); expect(context.defaultPrevented).toBe(true);
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'pagehide'])('cleans capture and prevents a later drop after %s', reason => {
    const { root, callbacks, down, move } = setup(); down(); move(6);
    (reason === 'lostpointercapture' ? root : windowInput).dispatchEvent(input(reason));
    expect(callbacks.cancel).toHaveBeenCalledTimes(1); expect(callbacks.cancel).toHaveBeenCalledWith(reason);
    expect(root.captured.size).toBe(0); expect(root.releaseCalls).toEqual([1]);
    windowInput.dispatchEvent(input('pointerup')); expect(callbacks.drop).not.toHaveBeenCalled();
  });

  it('ignores another pointer cancellation while a primary drag owns capture', () => {
    const { callbacks, root, down, move } = setup(); down(); move(6);
    windowInput.dispatchEvent(input('pointercancel', { pointerId: 2 }));
    expect(callbacks.cancel).not.toHaveBeenCalled(); expect(root.hasPointerCapture(1)).toBe(true);
    windowInput.dispatchEvent(input('pointerup')); expect(callbacks.drop).toHaveBeenCalledTimes(1);
  });

  it('does not treat synchronous or delayed lost capture after commit as another cancellation', () => {
    const { callbacks, root, down, move } = setup(); down(); move(6); windowInput.dispatchEvent(input('pointerup'));
    root.dispatchEvent(input('lostpointercapture')); windowInput.dispatchEvent(input('pointerup'));
    expect(callbacks.drop).toHaveBeenCalledTimes(1); expect(callbacks.cancel).not.toHaveBeenCalled(); expect(root.releaseCalls).toEqual([1]);
  });

  it('cancels cleanly when the browser refuses capture and never begins a drag', () => {
    const { callbacks, root, down, move } = setup(); root.captureFails = true; down(); move(6);
    expect(callbacks.cancel).toHaveBeenCalledWith('capture-failed'); expect(callbacks.begin).not.toHaveBeenCalled(); expect(callbacks.move).not.toHaveBeenCalled();
    windowInput.dispatchEvent(input('pointerup')); expect(callbacks.drop).not.toHaveBeenCalled();
  });

  it('disposes capture and listeners so subsequent input cannot restart a drag', () => {
    const { callbacks, root, pointer, down, move } = setup(); down(); move(6); pointer.dispose();
    down(); move(12); windowInput.dispatchEvent(input('pointerup')); root.dispatchEvent(input('click'));
    expect(root.captured.size).toBe(0); expect(callbacks.press).toHaveBeenCalledTimes(1);
    expect(callbacks.move).toHaveBeenCalledTimes(1); expect(callbacks.drop).not.toHaveBeenCalled(); expect(callbacks.click).not.toHaveBeenCalled();
  });
});
