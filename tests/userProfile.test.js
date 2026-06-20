import { defaultProgress, normalizeProgress, sanitizeDisplayName, isEnterableName, DISPLAY_NAME_MAX } from '../src/logic/progression';

// Build risky characters from code points so this test file stays pure ASCII
// (literal bidi/zero-width chars in source are exactly what we're defending against).
const cp = (...codes) => String.fromCodePoint(...codes);
const NUL = cp(0x00);
const RLO = cp(0x202e); // RIGHT-TO-LEFT OVERRIDE (classic UI spoof)
const LRE = cp(0x202a);
const PDF = cp(0x202c);
const ZWSP = cp(0x200b); // zero-width space
const ZWJ = cp(0x200d);
const BOM = cp(0xfeff);
const WJ = cp(0x2060); // word joiner
const LRI = cp(0x2066);
const PDI = cp(0x2069);
const CJK = cp(0x7dd1); // CJK ideograph (legitimate)
const SWORD = cp(0x1f5e1) + cp(0xfe0f); // emoji + VS16 (legitimate)

describe('sanitizeDisplayName', () => {
  test('non-strings become empty string', () => {
    expect(sanitizeDisplayName(undefined)).toBe('');
    expect(sanitizeDisplayName(null)).toBe('');
    expect(sanitizeDisplayName(123)).toBe('');
    expect(sanitizeDisplayName({})).toBe('');
  });

  test('trims and collapses internal whitespace', () => {
    expect(sanitizeDisplayName('  Roronoa   Zoro  ')).toBe('Roronoa Zoro');
  });

  test('strips C0/NUL control chars and newlines (collapsed to one space)', () => {
    expect(sanitizeDisplayName('Zo' + NUL + 'ro\nthe\tHunter')).toBe('Zo ro the Hunter');
  });

  test('strips Unicode bidi-override chars (RLO / LRE / PDF)', () => {
    expect(sanitizeDisplayName('Zoro' + RLO + 'gnp.exe')).toBe('Zorognp.exe');
    expect(sanitizeDisplayName(LRE + 'evil' + PDF)).toBe('evil');
  });

  test('strips zero-width and invisible format characters', () => {
    expect(sanitizeDisplayName('Zo' + ZWSP + 'ro' + ZWJ + BOM)).toBe('Zoro');
    expect(sanitizeDisplayName('A' + WJ + 'B' + LRI + 'C' + PDI)).toBe('ABC');
  });

  test('caps length at 40 after cleaning', () => {
    expect(sanitizeDisplayName('x'.repeat(100))).toBe('x'.repeat(40));
  });

  test('caps by code point, never severing an astral char into a lone surrogate (F2)', () => {
    const EMOJI = cp(0x1f5e1); // 1 code point, 2 UTF-16 units
    // 39 ASCII + 1 emoji = exactly 40 code points: the emoji must survive whole.
    const atBoundary = sanitizeDisplayName('x'.repeat(39) + EMOJI);
    expect(atBoundary).toBe('x'.repeat(39) + EMOJI);
    // Bulk truncation must cut on code-point boundaries, not UTF-16 units.
    const truncated = sanitizeDisplayName(EMOJI.repeat(45));
    expect(Array.from(truncated)).toHaveLength(DISPLAY_NAME_MAX);
    // No unpaired surrogate may remain after removing well-formed pairs.
    const orphans = truncated.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
    expect(/[\uD800-\uDFFF]/.test(orphans)).toBe(false);
  });

  test('strips U+061C ARABIC LETTER MARK (bidi control char) (F3)', () => {
    expect(sanitizeDisplayName('Zoro' + cp(0x061c) + 'exe')).toBe('Zoroexe');
  });

  test('strips U+115F HANGUL CHOSEONG FILLER (invisible) (F4)', () => {
    expect(sanitizeDisplayName('Zoro' + cp(0x115f))).toBe('Zoro');
  });

  test('strips U+1160 HANGUL JUNGSEONG FILLER (invisible) (F4)', () => {
    expect(sanitizeDisplayName('Zoro' + cp(0x1160))).toBe('Zoro');
  });

  test('strips U+3164 HANGUL FILLER (invisible) (F4)', () => {
    expect(sanitizeDisplayName('Zoro' + cp(0x3164))).toBe('Zoro');
  });

  test('strips U+FFA0 HALFWIDTH HANGUL FILLER (invisible) (F4)', () => {
    expect(sanitizeDisplayName('Zoro' + cp(0xffa0))).toBe('Zoro');
  });

  test('a name of only format chars sanitizes to empty', () => {
    expect(sanitizeDisplayName(ZWSP + RLO + BOM)).toBe('');
  });

  test('preserves legitimate Unicode (CJK + emoji + VS16)', () => {
    const ok = 'Zoro ' + CJK + ' ' + SWORD;
    expect(sanitizeDisplayName(ok)).toBe(ok);
  });
});

describe('isEnterableName (single source of truth for the welcome button) (F5)', () => {
  test('true only when the name survives sanitization as non-empty', () => {
    expect(isEnterableName('Zoro')).toBe(true);
    expect(isEnterableName('  Roronoa  ')).toBe(true);
  });
  test('false for empty / whitespace-only / non-string', () => {
    expect(isEnterableName('')).toBe(false);
    expect(isEnterableName('   ')).toBe(false);
    expect(isEnterableName(null)).toBe(false);
    expect(isEnterableName(123)).toBe(false);
  });
  test('false for input that LOOKS non-empty but sanitizes away (the dead-button case)', () => {
    // What the old screen check (raw.trim().length > 0) wrongly accepted:
    const invisibleOnly = cp(0x200b) + cp(0x202e) + cp(0xfeff);
    expect(invisibleOnly.trim().length > 0).toBe(true); // old, naive check
    expect(isEnterableName(invisibleOnly)).toBe(false);  // new, correct check
  });
});

describe('normalizeProgress: userProfile', () => {
  test('default progress has no signed-in profile', () => {
    expect(defaultProgress().userProfile).toBeNull();
  });

  test('absent userProfile normalizes to null', () => {
    const raw = { ...defaultProgress() };
    delete raw.userProfile;
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('valid signed-in profile is preserved', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zoro', provider: 'local', signedIn: true, createdAt: '2026-05-17' } };
    expect(normalizeProgress(raw).userProfile).toEqual({ name: 'Zoro', provider: 'local', signedIn: true, createdAt: '2026-05-17' });
  });

  test('name is trimmed and capped at 40 chars', () => {
    const raw = { ...defaultProgress(), userProfile: { name: '  ' + 'a'.repeat(60) + '  ', provider: 'local', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile.name).toBe('a'.repeat(40));
  });

  test('a stored name with bidi-override / zero-width chars is sanitized on load', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zo' + ZWSP + 'ro' + RLO + 'exe', provider: 'local', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile.name).toBe('Zoroexe');
  });

  test('a stored name that sanitizes to empty collapses the profile to null', () => {
    const raw = { ...defaultProgress(), userProfile: { name: ZWSP + RLO + BOM, provider: 'local', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('whitespace-only name collapses to null', () => {
    const raw = { ...defaultProgress(), userProfile: { name: '   ', provider: 'local', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('signedIn must be strictly true', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zoro', provider: 'local', signedIn: false, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('unknown provider falls back to local', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zoro', provider: 'github', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile.provider).toBe('local');
  });

  test('google provider is honored', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zoro', provider: 'google', signedIn: true, createdAt: '' } };
    expect(normalizeProgress(raw).userProfile.provider).toBe('google');
  });

  test('non-string createdAt becomes empty string', () => {
    const raw = { ...defaultProgress(), userProfile: { name: 'Zoro', provider: 'local', signedIn: true, createdAt: 12345 } };
    expect(normalizeProgress(raw).userProfile.createdAt).toBe('');
  });

  test('non-object userProfile collapses to null', () => {
    const raw = { ...defaultProgress(), userProfile: 'invalid' };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('null userProfile stays null', () => {
    const raw = { ...defaultProgress(), userProfile: null };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });
});
