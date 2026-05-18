import { defaultProgress, normalizeProgress } from '../src/logic/progression';

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
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'local', signedIn: true, createdAt: '2026-05-17' },
    };
    expect(normalizeProgress(raw).userProfile).toEqual({
      name: 'Zoro',
      provider: 'local',
      signedIn: true,
      createdAt: '2026-05-17',
    });
  });

  test('name is trimmed and capped at 40 chars', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: '  ' + 'a'.repeat(60) + '  ', provider: 'local', signedIn: true, createdAt: '' },
    };
    expect(normalizeProgress(raw).userProfile.name).toBe('a'.repeat(40));
  });

  test('whitespace-only name collapses to null', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: '   ', provider: 'local', signedIn: true, createdAt: '' },
    };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('signedIn must be strictly true', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'local', signedIn: false, createdAt: '' },
    };
    expect(normalizeProgress(raw).userProfile).toBeNull();
  });

  test('unknown provider falls back to local', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'github', signedIn: true, createdAt: '' },
    };
    expect(normalizeProgress(raw).userProfile.provider).toBe('local');
  });

  test('google provider is honored', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'google', signedIn: true, createdAt: '' },
    };
    expect(normalizeProgress(raw).userProfile.provider).toBe('google');
  });

  test('non-string createdAt becomes empty string', () => {
    const raw = {
      ...defaultProgress(),
      userProfile: { name: 'Zoro', provider: 'local', signedIn: true, createdAt: 12345 },
    };
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
