/**
 * One-shot latch for submit handlers. A fast double-tap on "Enter the dojo"
 * can fire onSignIn twice before React state propagates; wrap the handler in
 * `gate.tryFire(fn)` so it runs at most once for the gate's lifetime. Hold the
 * gate in a ref (`useRef(createSubmitGate()).current`) so it survives re-renders.
 */
export function createSubmitGate(): { tryFire: (fn: () => void) => void } {
  let fired = false;
  return {
    tryFire(fn: () => void): void {
      if (fired) return;
      fired = true;
      fn();
    },
  };
}
