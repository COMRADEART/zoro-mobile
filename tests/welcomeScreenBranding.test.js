import fs from 'fs';
import path from 'path';

// REGRESSION LOCK (not a behavior test): the welcome gate is a local-only
// profile capture with NO Google OAuth. Shipping Google's official "G" mark or
// "Continue with Google" wording would be brand-guideline + Play Store
// "Deceptive Behavior" exposure (Finding F1). This locks it out of the source;
// it does NOT verify the screen renders correctly.
//
// Scans ALL of src/screens + src/components (not just WelcomeScreen.js) so the
// lock can't be sidestepped by moving the mark into a separate file.
const ROOTS = ['src/screens', 'src/components'].map((d) =>
  path.join(__dirname, '..', d),
);

function collect(dir, acc) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, acc);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const FILES = ROOTS.flatMap((r) => collect(r, []));
const ALL_SRC = FILES.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

describe('No Google brand assets in screens/components (F1 regression lock)', () => {
  test('no official Google brand hex colors', () => {
    for (const hex of ['#4285F4', '#34A853', '#FBBC05', '#EA4335']) {
      expect(ALL_SRC.toUpperCase()).not.toContain(hex.toUpperCase());
    }
  });

  test('no Google sign-in wording / logo label', () => {
    expect(ALL_SRC).not.toMatch(/continue with google/i);
    expect(ALL_SRC).not.toMatch(/sign in with google/i);
    expect(ALL_SRC).not.toMatch(/google logo/i);
  });

  test('no copy-pasted Google "G" SVG path data or component name', () => {
    // Distinctive segment of the official blue "G" path + the old component id.
    expect(ALL_SRC).not.toMatch(/M22\.56 12\.25/);
    expect(ALL_SRC).not.toMatch(/\bGoogleG\b/);
  });
});
