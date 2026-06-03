// Contract: aiService NEVER throws and ALWAYS returns a usable value —
// the deterministic fallback whenever the native module is absent,
// not-ready, erroring, empty, or slow. The native side is unverifiable
// here; this suite is the guarantee that its absence/failure degrades
// gracefully instead of crashing the app.

const NATIVE_PATH = '../modules/expo-gemini-nano';
const SERVICE_PATH = '../src/services/aiService';

/** Load a fresh aiService with the native module mocked to `impl`
 *  (`null` simulates iOS/web/Jest/unsupported Android). */
function loadService(impl) {
  let svc;
  jest.isolateModules(() => {
    jest.doMock(NATIVE_PATH, () => ({ __esModule: true, default: impl }));
    svc = require(SERVICE_PATH);
  });
  return svc;
}

function makeNative(over = {}) {
  return {
    checkStatus: jest.fn().mockResolvedValue('available'),
    download: jest.fn().mockResolvedValue(true),
    generate: jest.fn().mockResolvedValue('AI-GEN'),
    summarize: jest.fn().mockResolvedValue('AI-SUM'),
    ...over,
  };
}

afterEach(() => jest.dontMock(NATIVE_PATH));

describe('native module absent (default path: iOS/web/Jest/unsupported)', () => {
  test('capability is unavailable and every feature returns its fallback', async () => {
    const ai = loadService(null);
    expect(await ai.getCapability()).toBe('unavailable');
    expect(await ai.isAIReady()).toBe(false);
    expect(await ai.narrate({ statsText: 's', fallback: 'FB' })).toBe('FB');
    expect(await ai.recommend({ context: 'c', fallback: 'FB' })).toBe('FB');
    expect(await ai.senseiReply({ userText: 'u', context: 'c', fallback: 'FB' })).toBe('FB');
    expect(await ai.parseSessionHint('did pushups')).toBeNull();
    expect(await ai.ensureModel()).toBe('unavailable');
  });
});

describe('native module present and ready', () => {
  test('feature methods return AI output', async () => {
    const native = makeNative();
    const ai = loadService(native);
    expect(await ai.getCapability()).toBe('ready');
    expect(await ai.narrate({ statsText: 's', fallback: 'FB' })).toBe('AI-SUM');
    expect(await ai.recommend({ context: 'c', fallback: 'FB' })).toBe('AI-GEN');
    expect(await ai.senseiReply({ userText: 'u', context: 'c', fallback: 'FB' })).toBe('AI-GEN');
  });

  test('parseSessionHint parses a valid discipline line, else null', async () => {
    const ai = loadService(makeNative({ generate: jest.fn().mockResolvedValue('sandai | did 30 pushups') }));
    expect(await ai.parseSessionHint('30 pushups')).toEqual({ discipline: 'sandai', note: 'did 30 pushups' });

    const ai2 = loadService(makeNative({ generate: jest.fn().mockResolvedValue('nonsense|x') }));
    expect(await ai2.parseSessionHint('???')).toBeNull();
  });

  test('empty / whitespace AI output falls back', async () => {
    const ai = loadService(makeNative({ summarize: jest.fn().mockResolvedValue('   ') }));
    expect(await ai.narrate({ statsText: 's', fallback: 'FB' })).toBe('FB');
  });
});

describe('degraded states all fall back', () => {
  test('downloadable: not ready -> fallback; ensureModel triggers download', async () => {
    const native = makeNative({ checkStatus: jest.fn().mockResolvedValue('downloadable') });
    const ai = loadService(native);
    expect(await ai.getCapability()).toBe('downloadable');
    expect(await ai.recommend({ context: 'c', fallback: 'FB' })).toBe('FB');
    await ai.ensureModel();
    expect(native.download).toHaveBeenCalledTimes(1);
  });

  test('checkStatus throws -> error -> fallback', async () => {
    const ai = loadService(makeNative({ checkStatus: jest.fn().mockRejectedValue(new Error('x')) }));
    expect(await ai.getCapability()).toBe('error');
    expect(await ai.senseiReply({ userText: 'u', context: 'c', fallback: 'FB' })).toBe('FB');
  });

  test('generate rejects -> fallback', async () => {
    const ai = loadService(makeNative({ generate: jest.fn().mockRejectedValue(new Error('boom')) }));
    expect(await ai.recommend({ context: 'c', fallback: 'FB' })).toBe('FB');
  });

  test('generate hangs past the timeout -> fallback', async () => {
    jest.useFakeTimers();
    const ai = loadService(makeNative({ generate: jest.fn(() => new Promise(() => {})) }));
    const p = ai.recommend({ context: 'c', fallback: 'FB' });
    await jest.advanceTimersByTimeAsync(13000);
    expect(await p).toBe('FB');
    jest.useRealTimers();
  });
});

describe('capability cache', () => {
  test('checkStatus is memoized until reset', async () => {
    const native = makeNative();
    const ai = loadService(native);
    await ai.getCapability();
    await ai.getCapability();
    expect(native.checkStatus).toHaveBeenCalledTimes(1);
    ai._resetCapabilityCache();
    await ai.getCapability();
    expect(native.checkStatus).toHaveBeenCalledTimes(2);
  });
});
