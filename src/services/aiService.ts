/**
 * The single entry point screens use for on-device AI. It NEVER throws and
 * NEVER blocks a render path: every method returns either an on-device
 * Gemini Nano result or the caller-supplied deterministic fallback.
 *
 * Fallback is the default path — the native module is absent on iOS, web,
 * Jest, and every Android device without AICore (the large majority). The
 * AI layer is a pure enhancement; removing it changes nothing functionally.
 *
 * Verified model constraints (Google docs, May 2026), enforced here:
 *   - input < ~4000 tokens  -> we clamp to ~2500 words
 *   - output should stay < ~256 tokens -> prompts instruct brevity
 *   - no structured/JSON output mode -> NL parsing is best-effort + validated
 *   - English/Korean validated only
 */
import ExpoGeminiNano, { type GeminiStatus } from '../../modules/expo-gemini-nano';

export type AICapability =
  | 'unavailable'   // no native module / no AICore / unsupported device
  | 'downloadable'  // supported, model not yet downloaded
  | 'downloading'   // model download in progress
  | 'ready'         // model usable now
  | 'error';        // status check itself failed

export type Discipline = 'wado' | 'sandai' | 'shusui';

/** Conservative NL-parse result. We deliberately do NOT infer exact
 *  exercises/values (unreliable without a JSON mode) — only the discipline
 *  plus a free-text note. The manual form stays the source of truth. */
export interface ParsedSessionHint {
  discipline: Discipline;
  note: string;
}

const GENERATE_TIMEOUT_MS = 12000;
const MAX_INPUT_WORDS = 2500;
const DISCIPLINES: readonly Discipline[] = ['wado', 'sandai', 'shusui'];

function clampWords(text: string, maxWords = MAX_INPUT_WORDS): string {
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords ? text.trim() : words.slice(0, maxWords).join(' ');
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ai_timeout')), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function mapStatus(s: GeminiStatus): AICapability {
  switch (s) {
    case 'available': return 'ready';
    case 'downloading': return 'downloading';
    case 'downloadable': return 'downloadable';
    default: return 'unavailable';
  }
}

let capabilityCache: Promise<AICapability> | null = null;

/** Cached capability probe. Pass force=true after a download attempt. */
export async function getCapability(force = false): Promise<AICapability> {
  if (!ExpoGeminiNano) return 'unavailable';
  if (!force && capabilityCache) return capabilityCache;
  capabilityCache = (async (): Promise<AICapability> => {
    try {
      return mapStatus(await ExpoGeminiNano.checkStatus());
    } catch {
      return 'error';
    }
  })();
  return capabilityCache;
}

/** Best-effort: if the model is downloadable, kick off the AICore download.
 *  Returns the capability after the attempt. Safe to call repeatedly. */
export async function ensureModel(): Promise<AICapability> {
  if (!ExpoGeminiNano) return 'unavailable';
  const cap = await getCapability();
  if (cap !== 'downloadable') return cap;
  try {
    await ExpoGeminiNano.download();
  } catch {
    /* download failure is non-fatal — caller still gets a fallback */
  }
  return getCapability(true);
}

export async function isAIReady(): Promise<boolean> {
  return (await getCapability()) === 'ready';
}

/** Internal: run a generation only when ready; otherwise signal fallback
 *  by returning null. Never throws. */
async function tryGenerate(prompt: string): Promise<string | null> {
  if (!ExpoGeminiNano) return null;
  if ((await getCapability()) !== 'ready') return null;
  try {
    const out = await withTimeout(ExpoGeminiNano.generate(clampWords(prompt)), GENERATE_TIMEOUT_MS);
    const trimmed = (out ?? '').trim();
    return trimmed.length ? trimmed : null;
  } catch {
    return null;
  }
}

async function trySummarize(text: string): Promise<string | null> {
  if (!ExpoGeminiNano) return null;
  if ((await getCapability()) !== 'ready') return null;
  try {
    const out = await withTimeout(ExpoGeminiNano.summarize(clampWords(text)), GENERATE_TIMEOUT_MS);
    const trimmed = (out ?? '').trim();
    return trimmed.length ? trimmed : null;
  } catch {
    return null;
  }
}

// ─── Feature methods ─────────────────────────────────────────────────────────
// Each takes the data needed to build a prompt AND the deterministic
// fallback the app already produces. They always resolve to a usable string.

/** Voyage-log narration. `fallback` is the existing templated narrative. */
export async function narrate(args: { statsText: string; fallback: string }): Promise<string> {
  const ai = await trySummarize(
    `Write a short, vivid One Piece / swordsman-themed recap of this training month. ` +
    `Second person, motivational, 2-3 sentences, no preamble.\n${args.statsText}`,
  );
  return ai ?? args.fallback;
}

/** A single short coaching line to replace the static recommendation phrase. */
export async function recommend(args: { context: string; fallback: string }): Promise<string> {
  const ai = await tryGenerate(
    `You are a terse sword master coaching a fitness trainee. ` +
    `Given this state, give ONE short motivational line (max 20 words, no quotes):\n${args.context}`,
  );
  return ai ?? args.fallback;
}

/** Sensei reply. `fallback` is a random SENSEI_PHRASES line. */
export async function senseiReply(args: { userText: string; context: string; fallback: string }): Promise<string> {
  const ai = await tryGenerate(
    `Roleplay as a stern, wise sword sensei (One Piece / Zoro tone). ` +
    `Reply in at most 3 sentences, no markdown.\n` +
    `Trainee state: ${args.context}\nTrainee says: "${args.userText}"`,
  );
  return ai ?? args.fallback;
}

/** Best-effort NL → discipline hint. Returns null on ANY doubt so the
 *  caller keeps the normal manual flow. Never auto-commits a session. */
export async function parseSessionHint(text: string): Promise<ParsedSessionHint | null> {
  const raw = await tryGenerate(
    `Classify the training note into exactly one discipline and echo a 1-line note. ` +
    `Disciplines: wado (mind/meditation/focus), sandai (body/strength/reps), ` +
    `shusui (spirit/endurance/cardio). ` +
    `Answer on ONE line as: <discipline>|<short note>. Nothing else.\nNote: "${text}"`,
  );
  if (!raw) return null;
  const [discPart, ...noteParts] = raw.split('|');
  const discipline = discPart?.trim().toLowerCase() as Discipline;
  if (!DISCIPLINES.includes(discipline)) return null; // strict: bail to manual
  const note = noteParts.join('|').trim().slice(0, 140) || text.slice(0, 140);
  return { discipline, note };
}

/** Test/maintenance hook: drop the memoized capability probe. */
export function _resetCapabilityCache(): void {
  capabilityCache = null;
}
