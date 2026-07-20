const appJson = require('../app.json');

// Both local config plugins have been silently dropped from app.json during
// merge-conflict resolution before (withGeminiNano was lost when PR #1's
// app.json took precedence over PR #2's). Without withGeminiNano the Gemini
// Nano native module autolinks at minSdk 26 into a minSdk 24 app and the
// Android build breaks; without withAndroidBackup the backup rules vanish.
describe('expo config plugins', () => {
  const plugins = appJson.expo.plugins.map(p => (Array.isArray(p) ? p[0] : p));

  test('withGeminiNano plugin is registered', () => {
    expect(plugins).toContain('./plugins/withGeminiNano');
  });

  test('withAndroidBackup plugin is registered', () => {
    expect(plugins).toContain('./plugins/withAndroidBackup');
  });
});
