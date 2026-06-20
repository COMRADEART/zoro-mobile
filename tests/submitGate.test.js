import { createSubmitGate } from '../src/utils/submitGate';

describe('createSubmitGate', () => {
  test('fires the action exactly once across repeated calls', () => {
    const gate = createSubmitGate();
    let n = 0;
    const inc = () => { n++; };
    gate.tryFire(inc);
    gate.tryFire(inc);
    gate.tryFire(inc);
    expect(n).toBe(1);
  });

  test('independent gates do not share latch state', () => {
    const a = createSubmitGate();
    const b = createSubmitGate();
    let na = 0;
    let nb = 0;
    a.tryFire(() => { na += 1; });
    a.tryFire(() => { na += 1; });
    b.tryFire(() => { nb += 1; });
    expect(na).toBe(1);
    expect(nb).toBe(1);
  });
});
