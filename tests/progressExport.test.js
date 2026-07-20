import { parseProgressExport, CURRENT_SCHEMA_VERSION } from '../src/storage/progressStore';
import { defaultProgress } from '../src/logic/progression';

describe('parseProgressExport', () => {
  test('round-trips a current export', () => {
    const { _pendingEvents, ...data } = { ...defaultProgress(), totalXP: 1234 };
    const result = parseProgressExport(JSON.stringify(data));
    expect(result.ok).toBe(true);
    expect(result.progress.totalXP).toBe(1234);
  });

  test('migrates an older-version export through the ladder', () => {
    const v3 = { ...defaultProgress(), schemaVersion: 3, totalXP: 77 };
    const result = parseProgressExport(JSON.stringify(v3));
    expect(result.ok).toBe(true);
    expect(result.progress.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.progress.totalXP).toBe(77);
  });

  test('rejects garbage, non-objects, and newer versions with clear errors', () => {
    expect(parseProgressExport('not json').ok).toBe(false);
    expect(parseProgressExport('[1,2,3]').ok).toBe(false);
    expect(parseProgressExport('"a string"').ok).toBe(false);
    const future = { ...defaultProgress(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 };
    const result = parseProgressExport(JSON.stringify(future));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/newer/);
  });

  test('rejects structurally invalid exports', () => {
    expect(parseProgressExport(JSON.stringify({ schemaVersion: 4, totalXP: -5 })).ok).toBe(false);
  });
});
