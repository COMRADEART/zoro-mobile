// ─── DISCIPLINES ────────────────────────────────────────────────────────────

export const SWORDS = {
  wado: {
    name: 'Wado Ichimonji',
    kanji: '和道一文字',
    color: '#CFCFCF',
    accent: '#F0F0F0',
    discipline: 'MIND',
    desc: 'The path of harmony. Mental fortitude and discipline.',
    theme: 'zen', // zen | flame | mist
    exercises: [
      { id: 'wado-meditation',   name: 'Meditation',         unit: 'min',    base: 10,  caloriePerUnit: 4  },
      { id: 'wado-reading',       name: 'Reading',            unit: 'min',    base: 30,  caloriePerUnit: 2  },
      { id: 'wado-visualization', name: 'Visualization',      unit: 'min',    base: 10,  caloriePerUnit: 3  },
      { id: 'wado-breathing',     name: 'Breathing Drill',    unit: 'min',    base: 5,   caloriePerUnit: 5  },
      { id: 'wado-cold',          name: 'Cold Exposure',      unit: 'min',    base: 3,   caloriePerUnit: 8  },
      { id: 'wado-journal',       name: 'Journaling',         unit: 'min',    base: 15,  caloriePerUnit: 2  },
      { id: 'wado-sword-study',   name: 'Sword Study',        unit: 'min',    base: 30,  caloriePerUnit: 2  },
    ],
    baseExercises: ['Meditation', 'Reading', 'Visualization', 'Breathing drill', 'Cold exposure'],
    baseExerciseIds: ['wado-meditation', 'wado-reading', 'wado-visualization', 'wado-breathing', 'wado-cold'],
  },
  sandai: {
    name: 'Sandai Kitetsu',
    kanji: '三代鬼徹',
    color: '#9A9A9A',
    accent: '#F0F0F0',
    discipline: 'BODY',
    desc: 'The cursed blade. Raw physical devastation.',
    theme: 'flame',
    exercises: [
      { id: 'sandai-pushups',    name: 'Push-ups',      unit: 'reps',  base: 100, caloriePerRep: 0.3 },
      { id: 'sandai-squats',     name: 'Squats',        unit: 'reps',  base: 100, caloriePerRep: 0.25 },
      { id: 'sandai-situps',     name: 'Sit-ups',       unit: 'reps',  base: 100, caloriePerRep: 0.2  },
      { id: 'sandai-pullups',    name: 'Pull-ups',      unit: 'reps',  base: 20,  caloriePerRep: 0.5  },
      { id: 'sandai-deadlifts',  name: 'Deadlifts',     unit: 'reps',  base: 50,  caloriePerRep: 0.6  },
      { id: 'sandai-run',        name: 'Run',           unit: 'km',    base: 10,  caloriePerUnit: 100 },
      { id: 'sandai-burpees',    name: 'Burpees',       unit: 'reps',  base: 100, caloriePerRep: 0.5  },
    ],
    baseExercises: ['Push-ups x100', 'Squats x100', 'Sit-ups x100', 'Pull-ups x20', 'Deadlifts', 'Run 10km'],
    baseExerciseIds: ['sandai-pushups', 'sandai-squats', 'sandai-situps', 'sandai-pullups', 'sandai-deadlifts', 'sandai-run'],
  },
  shusui: {
    name: 'Shusui',
    kanji: '秋水',
    color: '#6E6E6E',
    accent: '#F0F0F0',
    discipline: 'SPIRIT',
    desc: 'The black blade. Unbreakable will and endurance.',
    theme: 'mist',
    exercises: [
      { id: 'shusui-plank',      name: 'Plank',         unit: 'min',    base: 5,   caloriePerUnit: 30 },
      { id: 'shusui-wallsit',    name: 'Wall Sit',      unit: 'min',    base: 3,   caloriePerUnit: 25 },
      { id: 'shusui-bag',        name: 'Heavy Bag Work',unit: 'min',   base: 15,  caloriePerUnit: 12 },
      { id: 'shusui-sparring',   name: 'Sparring',      unit: 'min',   base: 20,  caloriePerUnit: 15 },
      { id: 'shusui-endurance',  name: 'Endurance Run', unit: 'km',   base: 5,   caloriePerUnit: 80 },
      { id: 'shusui-kata',       name: 'Kata Practice', unit: 'min',  base: 20,  caloriePerUnit: 10 },
      { id: 'shusui-ice',        name: 'Ice Bath',      unit: 'min',  base: 5,   caloriePerUnit: 15 },
    ],
    baseExercises: ['Plank (5min)', 'Wall sit (3min)', 'Heavy bag work', 'Sparring', 'Endurance run'],
    baseExerciseIds: ['shusui-plank', 'shusui-wallsit', 'shusui-bag', 'shusui-sparring', 'shusui-endurance'],
  },
};

// ─── RANKS ──────────────────────────────────────────────────────────────────

// Rank colour is a brightness ramp (rises with rank) kept inside the AA-legible
// range, since rank names render as text. No hue — magnitude is value only.
export const RANKS = [
  { name: 'EAST BLUE ROOKIE',     min: 0,     max: 500,    color: '#B4B4B4' },
  { name: 'PIRATE HUNTER',         min: 500,   max: 1500,   color: '#C4C4C4' },
  { name: 'SUPERNOVA',             min: 1500,  max: 3500,   color: '#D4D4D4' },
  { name: 'WARLORD',               min: 3500,  max: 7000,   color: '#E4E4E4' },
  { name: 'YONKO COMMANDER',       min: 7000,  max: 12000,  color: '#F2F2F2' },
  { name: 'KING OF HELL',          min: 12000, max: Infinity, color: '#FCFCFC' },
];

// ─── RARITY ──────────────────────────────────────────────────────────────────

export const RARITY = {
  common:    { color: '#9A9A9A', glow: 'rgba(255,255,255,0.16)', label: 'COMMON'   },
  rare:      { color: '#B8B8B8', glow: 'rgba(255,255,255,0.22)', label: 'RARE'     },
  epic:      { color: '#D2D2D2', glow: 'rgba(255,255,255,0.30)', label: 'EPIC'     },
  legendary: { color: '#ECECEC', glow: 'rgba(255,255,255,0.40)', label: 'LEGENDARY'},
  mythic:    { color: '#FCFCFC', glow: 'rgba(255,255,255,0.55)', label: 'MYTHIC'   },
};

// ─── TECHNIQUES (XP-gated rewards) ──────────────────────────────────────────

export const REWARDS = [
  { id: 'oni-giri',     type: 'technique', name: 'Oni Giri',                      kanji: '鬼斬り',                req: 'xp',  value: 300,  rarity: 'common'    },
  { id: 'tora-gari',    type: 'technique', name: 'Tora Gari',                     kanji: '虎狩り',                req: 'xp',  value: 800,  rarity: 'common'    },
  { id: 'santoryu-ogi',type: 'technique', name: 'Santoryu Ogi: Sanzen Sekai',    kanji: '三千世界',              req: 'xp',  value: 2000, rarity: 'rare'      },
  { id: 'kokujo',       type: 'technique', name: 'Kokujo: O Tatsumaki',           kanji: '黒縄・大竜巻',          req: 'xp',  value: 5000, rarity: 'epic'      },
  { id: 'ashura',       type: 'technique', name: 'Ashura: Ichibugin',             kanji: '阿修羅 一霧銀',         req: 'xp',  value: 10000, rarity: 'legendary' },
  { id: 'king-of-hell', type: 'technique', name: 'King of Hell Three-Sword Style', kanji: '閻魔三刀流',           req: 'xp',  value: 15000, rarity: 'mythic'    },
];

// ─── TITLE PATHS ─────────────────────────────────────────────────────────────

export const TITLE_PATHS = {
  wado: {
    icon: '和', color: '#E4E4E4', name: 'Wado Ichimonji',
    tiers: [
      { weeks: 1,  name: 'Student of Wado',       kanji: '和道の徒',        rarity: 'common',    desc: 'One week forged in the path of harmony.'         },
      { weeks: 4,  name: 'Meditation Initiate',   kanji: '禅の初心',        rarity: 'rare',      desc: 'A month of stillness. The mind sharpens.'          },
      { weeks: 12, name: 'Silent Blade',          kanji: '無音の刃',        rarity: 'epic',      desc: 'Three months of unwavering focus. Strike without thought.' },
      { weeks: 52, name: 'Master of Harmony',     kanji: '和道の達人',      rarity: 'legendary', desc: 'A full year of mental mastery. Unshakeable.'      },
    ],
  },
  sandai: {
    icon: '鬼', color: '#E4E4E4', name: 'Sandai Kitetsu',
    tiers: [
      { weeks: 1,  name: 'Bloodied Rookie',       kanji: '血の新人',        rarity: 'common',    desc: 'One week of raw physical warfare.'               },
      { weeks: 4,  name: 'Demon of the Dojo',     kanji: '道場の鬼',        rarity: 'rare',      desc: 'A month of bodily devastation. The cursed blade hungers.' },
      { weeks: 12, name: 'Pirate Hunter',         kanji: '海賊狩り',       rarity: 'epic',      desc: 'Three months of pure physical dominance.'         },
      { weeks: 52, name: 'Demon of East Blue',   kanji: '東の海の悪魔',   rarity: 'legendary', desc: 'A year of feeding the cursed blade. Feared across the seas.' },
    ],
  },
  shusui: {
    icon: '秋', color: '#C8C8C8', name: 'Shusui',
    tiers: [
      { weeks: 1,  name: 'Iron Will',             kanji: '鉄の意志',       rarity: 'common',    desc: 'One week of refusing to break.'                   },
      { weeks: 4,  name: 'Unbroken Blade',        kanji: '不折の刃',       rarity: 'rare',      desc: 'A month of enduring what would shatter others.' },
      { weeks: 12, name: 'Black Blade Bearer',   kanji: '黒刀の使い手',   rarity: 'epic',      desc: 'Three months of unbreakable spirit. The blade turns black.' },
      { weeks: 52, name: "World's Greatest Swordsman", kanji: '世界一の大剣豪', rarity: 'mythic', desc: 'One year. The dream is fulfilled.' },
    ],
  },
};

// ─── SENSEI PHRASES ──────────────────────────────────────────────────────────

export const SENSEI_PHRASES = {
  // Morning
  morning_wado: [
    'A still mind cuts deeper than any blade. Center yourself before the sun rises.',
    'The morning is yours, swordsman. Breathe in strength, breathe out doubt.',
    'Before the steel sings, the spirit must be honed.',
  ],
  morning_sandai: [
    'The cursed blade hungers at dawn. Feed it.',
    'Your body is the dojo. Every morning you step into it, you train.',
    'Pain is the whetstone. Rise and sharpen.',
  ],
  morning_shusui: [
    'The cold does not break the strong — it tempers them. Begin.',
    'While others sleep, the spirit already trains. You know who you are.',
    'Endurance is not given. It is forged in the hours no one sees.',
  ],

  // Post-workout
  post_session: [
    'The blade grows sharper with every swing. Well done.',
    'You did not come here to half-commit. The curse notices.',
    'Rest now — but not for long. Tomorrow, we go again.',
    '340 calories burned. The debt to the blade grows.',
    'Your muscles scream. Good. That is the sound of becoming.',
  ],

  // Streak milestones
  streak_7:   'One week unbroken. The curse begins to recognize you.',
  streak_30:   'A month of iron. The blade will not forget this.',
  streak_100: 'One hundred days. You have become the dojo itself.',
  streak_365: 'One year. You are no longer a trainee. You are the blade.',

  // Rank up
  rank_up: [
    'Your legend grows. New techniques stir within you.',
    'Another rank claimed. The seas will speak your name.',
    'From this moment, you carry more than steel. You carry a legacy.',
  ],

  // Rest day
  rest_day: [
    'Even the hardest steel must cool. Recover, swordsman.',
    'The body heals what the will demands. Sleep deeply.',
    'Rest is not retreat. It is preparation for the next assault.',
  ],

  // Recovery low
  recovery_low: [
    'Your recovery is depleted. Push harder and you will break. Rest.',
    'The curse blade demands sacrifice — but not your destruction. Recover.',
    'Listen to the blade: even demons need rest.',
  ],

  // Boss challenge
  boss_intro:  'A trial approaches. Prove yourself, or fall back to shadows.',
  boss_win:     'The trial is complete. The blade accepts you.',
  boss_fail:    'The trial defeated you today. Return when you are stronger.',

  // Idle
  idle: [
    'Stillness is also training. Or is that just an excuse?',
    'The dojo waits. What are you waiting for?',
    'Even the legendary swordsman started with push-ups.',
  ],
};

// ─── SKILL TREES ─────────────────────────────────────────────────────────────
// Each discipline has 3 branches. XP spent in discipline = skill points earned.

export const SKILL_TREES = {
  wado: {
    branches: {
      focus: {
        name: 'Focus',
        kanji: '集中',
        icon: '◎',
        unlocks: [
          { id: 'wado-focus-1', name: 'Extended Meditation',  desc: 'Meditation extends to 20min', xp: 300,  exerciseOverride: { id: 'wado-meditation',   base: 20 } },
          { id: 'wado-focus-2', name: 'Deep Reading',          desc: 'Reading extends to 60min',   xp: 800,  exerciseOverride: { id: 'wado-reading',       base: 60 } },
          { id: 'wado-focus-3', name: 'Master Visualization', desc: 'Visualization extends to 20min', xp: 2000 },
        ],
      },
      resilience: {
        name: 'Resilience',
        kanji: '忍耐',
        icon: '◇',
        unlocks: [
          { id: 'wado-res-1', name: 'Cold Mastery',   desc: 'Cold exposure extends to 10min',  xp: 500,  exerciseOverride: { id: 'wado-cold', base: 10 } },
          { id: 'wado-res-2', name: 'Breath Control', desc: 'Breathing drills extend to 15min', xp: 1200, exerciseOverride: { id: 'wado-breathing', base: 15 } },
        ],
      },
      wisdom: {
        name: 'Wisdom',
        kanji: '智慧',
        icon: '☯',
        unlocks: [
          { id: 'wado-wis-1', name: 'Journaling',       desc: 'Add journaling 15min', xp: 400,  exerciseOverride: { id: 'wado-journal', base: 15, caloriePerUnit: 2 } },
          { id: 'wado-wis-2', name: 'Study of blades',  desc: 'Add sword study 30min', xp: 1000, exerciseOverride: { id: 'wado-sword-study', base: 30, caloriePerUnit: 2 } },
        ],
      },
    },
  },
  sandai: {
    branches: {
      strength: {
        name: 'Strength',
        kanji: '力',
        icon: '⬢',
        unlocks: [
          { id: 'sandai-str-1', name: 'Push-ups x200',     desc: 'Push-up target increases to 200', xp: 400,  exerciseOverride: { id: 'sandai-pushups', base: 200 } },
          { id: 'sandai-str-2', name: 'Pull-ups x50',      desc: 'Pull-up target increases to 50',   xp: 800,  exerciseOverride: { id: 'sandai-pullups', base: 50 } },
          { id: 'sandai-str-3', name: 'Deadlift x100',     desc: 'Deadlift target increases to 100', xp: 1500, exerciseOverride: { id: 'sandai-deadlifts', base: 100 } },
        ],
      },
      endurance: {
        name: 'Endurance',
        kanji: '持久',
        icon: '⬡',
        unlocks: [
          { id: 'sandai-end-1', name: 'Run 15km',      desc: 'Run target increases to 15km',   xp: 500,  exerciseOverride: { id: 'sandai-run', base: 15 } },
          { id: 'sandai-end-2', name: 'Run 21km',      desc: 'Full marathon distance unlocked', xp: 1200, exerciseOverride: { id: 'sandai-run', base: 21 } },
          { id: 'sandai-end-3', name: 'Spartan Circuit', desc: '500 squats, 200 sit-ups, 15km run', xp: 3000 },
        ],
      },
      power: {
        name: 'Power',
        kanji: '剛',
        icon: '✦',
        unlocks: [
          { id: 'sandai-pow-1', name: 'Explosive Bursts', desc: 'Add burpees 5x20', xp: 600,  exerciseOverride: { id: 'sandai-burpees', base: 100, caloriePerRep: 0.5 } },
          { id: 'sandai-pow-2', name: 'Iron Body',        desc: 'Add Hindu push-ups 5x50', xp: 1400 },
        ],
      },
    },
  },
  shusui: {
    branches: {
      endurance: {
        name: 'Endurance',
        kanji: '持久',
        icon: '⬡',
        unlocks: [
          { id: 'shusui-end-1', name: 'Plank 10min',   desc: 'Plank extends to 10min',      xp: 400,  exerciseOverride: { id: 'shusui-plank',   base: 10 } },
          { id: 'shusui-end-2', name: 'Wall Sit 7min', desc: 'Wall sit extends to 7min',   xp: 700,  exerciseOverride: { id: 'shusui-wallsit', base: 7  } },
          { id: 'shusui-end-3', name: 'Endure 10km',   desc: 'Endurance run extends to 10km', xp: 1500, exerciseOverride: { id: 'shusui-endurance', base: 10 } },
        ],
      },
      combat: {
        name: 'Combat',
        kanji: '闘',
        icon: '✖',
        unlocks: [
          { id: 'shusui-com-1', name: 'Heavy Bag 30min', desc: 'Heavy bag extends to 30min',  xp: 500,  exerciseOverride: { id: 'shusui-bag',    base: 30 } },
          { id: 'shusui-com-2', name: 'Sparring 40min',  desc: 'Sparring extends to 40min',  xp: 1100, exerciseOverride: { id: 'shusui-sparring', base: 40 } },
          { id: 'shusui-com-3', name: 'Kata Practice',   desc: 'Add kata 20min',             xp: 2000, exerciseOverride: { id: 'shusui-kata', base: 20, caloriePerUnit: 10 } },
        ],
      },
      will: {
        name: 'Will',
        kanji: '意志',
        icon: '◈',
        unlocks: [
          { id: 'shusui-wil-1', name: 'Ice Bath',     desc: 'Add ice bath 5min', xp: 800,  exerciseOverride: { id: 'shusui-ice', base: 5, caloriePerUnit: 15 } },
          { id: 'shusui-wil-2', name: 'Fasting Training', desc: 'Add 24h fast', xp: 2000 },
        ],
      },
    },
  },
};

// ─── BOSS CHALLENGES ─────────────────────────────────────────────────────────

export const BOSS_CHALLENGES = [
  {
    id: 'mihawks-trial',
    name: "Mihawk's Trial",
    kanji: '鷹目の試練',
    desc: 'The greatest swordsman has set a trial. Complete all exercises to prove your worth.',
    discipline: 'sandai',
    exercises: [
      { name: 'Push-ups',    reps: 500 },
      { name: 'Pull-ups',    reps: 200 },
      { name: 'Squats',      reps: 500 },
      { name: 'Sit-ups',     reps: 300 },
      { name: 'Run',         km: 10 },
    ],
    xpReward: 5000,
    techniqueReward: 'ashura',
    weeksRequired: 4,
  },
  {
    id: 'shusui-torrent',
    name: 'Shusui Torrent',
    kanji: '秋水の洪流',
    desc: 'Unleash the full spirit. No retreat. No mercy.',
    discipline: 'shusui',
    exercises: [
      { name: 'Plank',       min: 10 },
      { name: 'Wall Sit',    min: 7  },
      { name: 'Heavy Bag Work',   min: 30 },
      { name: 'Sparring',    min: 40 },
      { name: 'Endurance Run', km: 10 },
    ],
    xpReward: 4000,
    techniqueReward: 'kokujo',
    weeksRequired: 3,
  },
  {
    id: 'wado-enlightenment',
    name: 'Wado Enlightenment',
    kanji: '和道の覚醒',
    desc: 'Silence the mind. Conquer the self.',
    discipline: 'wado',
    exercises: [
      { name: 'Meditation',    min: 30 },
      { name: 'Visualization', min: 20 },
      { name: 'Breathing Drill', min: 15 },
      { name: 'Cold Exposure', min: 10 },
      { name: 'Reading',       min: 60 },
    ],
    xpReward: 3500,
    techniqueReward: 'santoryu-ogi',
    weeksRequired: 3,
  },
];

// ─── QUOTES ───────────────────────────────────────────────────────────────────

export const QUOTES = [
  'Nothing happened.',
  "If I can't even protect my captain's dream, then whatever ambition I have is just talk.",
  'Wounds on the back are a swordsman\'s shame.',
  'Only the winners get to say what they want.',
  "I don't want to conquer anything. I just think the guy with the most freedom in this ocean is the Pirate King.",
  'There are some things in this world that transcend mortality.',
  'Pirates are evil? The Marines are righteous? These terms have always changed throughout history!',
  'Power comes not from physical strength, but from iron will!',
  'If you want to reach the top, your spirit must be unbreakable.',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function getExerciseById(id) {
  for (const swordKey of Object.keys(SWORDS)) {
    const sword = SWORDS[swordKey];
    const found = sword.exercises.find(e => e.id === id);
    if (found) return { ...found, discipline: swordKey };
  }
  return null;
}

export function getSwordExercises(swordKey: string, skillUnlocks: Record<string, Record<string, string[]>> = {}) {
  const sword = SWORDS[swordKey];
  if (!sword) return [];
  const tree = SKILL_TREES[swordKey];

  // Start from base exercises, cloned so we can mutate base targets per skill unlock
  const baseExercises = sword.exercises
    .filter(e => (sword.baseExerciseIds || []).includes(e.id))
    .map(e => ({ ...e }));

  const newExercises = [];

  if (tree) {
    const disciplineUnlocks = skillUnlocks[swordKey] || {};
    for (const [branchKey, branch] of Object.entries(tree.branches as Record<string, { unlocks: any[] }>)) {
      const unlockedIds = disciplineUnlocks[branchKey] || [];
      for (const unlockId of unlockedIds) {
        const unlock = branch.unlocks.find(u => u.id === unlockId);
        if (!unlock || !unlock.exerciseOverride) continue;

        const ov = unlock.exerciseOverride;
        const existing = baseExercises.find(e => e.id === ov.id);
        if (existing) {
          // Upgrade: raise the base target of an existing exercise
          existing.base = ov.base;
        } else if (!newExercises.find(e => e.id === ov.id)) {
          // New exercise introduced by skill unlock
          newExercises.push({
            id: ov.id,
            name: unlock.name,
            unit: ov.unit || 'min',
            base: ov.base,
            caloriePerUnit: ov.caloriePerUnit,
            caloriePerRep: ov.caloriePerRep,
            discipline: swordKey,
          });
        }
      }
    }
  }

  return [...baseExercises, ...newExercises];
}

export function senseiPhrase(category, subcategory = null, ctx = {}) {
  let pool;
  if (subcategory) {
    pool = SENSEI_PHRASES[`${category}_${subcategory}`];
  } else {
    pool = SENSEI_PHRASES[category];
  }
  if (!pool || pool.length === 0) return SENSEI_PHRASES.idle[0];
  if (typeof pool === 'string') return pool;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── BREATHING PROGRAMS ──────────────────────────────────────────────────────

export const BREATHING_PROGRAMS = [
  {
    id: 'bp-box',
    name: 'Box Breathing',
    kanji: '箱呼吸',
    desc: "Inhale 4 · Hold 4 · Exhale 4 · Hold 4. Zoro's focus ritual before battle.",
    durationMin: 5,
    pattern: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
    xpReward: 50,
    color: '#D8D8D8',
  },
  {
    id: 'bp-478',
    name: '4-7-8 Calm',
    kanji: '鎮静',
    desc: 'Inhale 4 · Hold 7 · Exhale 8. The spirit cools. Sleep follows.',
    durationMin: 4,
    pattern: { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
    xpReward: 40,
    color: '#B0B0B0',
  },
  {
    id: 'bp-power',
    name: 'Warrior Breath',
    kanji: '戦士の息',
    desc: 'Inhale 2 · Exhale 2, fast rhythm. Pre-battle activation.',
    durationMin: 3,
    pattern: { inhale: 2, holdIn: 0, exhale: 2, holdOut: 0 },
    xpReward: 30,
    color: '#EAEAEA',
  },
  {
    id: 'bp-wim',
    name: 'Demon Breath Cycle',
    kanji: '鬼息',
    desc: '30 rapid breaths, then exhale and hold. Zoro-style iron will.',
    durationMin: 7,
    pattern: { inhale: 1, holdIn: 0, exhale: 1, holdOut: 0, cycles: 30, retention: 30 },
    xpReward: 80,
    color: '#D0D0D0',
  },
];

// ─── POWER MEALS (Sanji's Power Meals) ──────────────────────────────────────

export const POWER_MEALS = [
  { id: 'pm-sanji-meat',  name: "Sanji's Red Meat",     kanji: '肉',   kcal: 650, protein: 45, carbs: 12, fat: 28, character: 'Sanji' },
  { id: 'pm-luffy-meat',  name: "Luffy's Meat on Bone", kanji: '肉骨', kcal: 800, protein: 60, carbs: 5,  fat: 35, character: 'Luffy' },
  { id: 'pm-zoro-rice',   name: "Zoro's Training Bowl",  kanji: '飯',   kcal: 420, protein: 30, carbs: 55, fat: 8,  character: 'Zoro'  },
  { id: 'pm-nami-fruit',  name: "Nami's Island Salad",   kanji: '果',   kcal: 180, protein: 4,  carbs: 32, fat: 3,  character: 'Nami'  },
  { id: 'pm-brook-soup',  name: "Brook's Bone Broth",    kanji: '汁',   kcal: 120, protein: 15, carbs: 4,  fat: 2,  character: 'Brook' },
  { id: 'pm-custom',      name: 'Custom Meal',           kanji: '自',   kcal: 0,   protein: 0,  carbs: 0,  fat: 0,  character: null    },
];

// ─── BOUNTY MISSIONS ─────────────────────────────────────────────────────────

export const BOUNTY_MISSIONS = [
  {
    id: 'bm-iron-week',
    type: 'streak',
    name: 'Iron Continuity',
    kanji: '鉄の連続',
    desc: 'Train 7 days straight. No gaps. The Marine bounty doubles.',
    tier: 'common',
    requirement: { type: 'streak', value: 7 },
    xpReward: 1500,
    color: '#C4C4C4',
  },
  {
    id: 'bm-triple-discipline',
    type: 'triple',
    name: 'The Three Sword Oath',
    kanji: '三刀の誓い',
    desc: 'Log all three disciplines in a single day. Prove the three-sword style.',
    tier: 'rare',
    requirement: { type: 'all_disciplines', value: 1 },
    xpReward: 2000,
    color: '#D0D0D0',
  },
  {
    id: 'bm-1000-kcal',
    type: 'calorie',
    name: 'Calorie Bounty',
    kanji: '熱量の賞金',
    desc: 'Burn 1,000 kcal in a single week.',
    tier: 'rare',
    requirement: { type: 'weekly_kcal', value: 1000 },
    xpReward: 2500,
    color: '#DADADA',
  },
  {
    id: 'bm-wado-monk',
    type: 'discipline',
    name: 'Monk of Wado',
    kanji: '和道の僧',
    desc: 'Complete Wado exercises for 5 consecutive days.',
    tier: 'epic',
    requirement: { type: 'discipline_streak', discipline: 'wado', value: 5 },
    xpReward: 3000,
    color: '#D8D8D8',
  },
  {
    id: 'bm-sharpness-90',
    type: 'readiness',
    name: "Razor's Edge",
    kanji: '剃刀の刃',
    desc: 'Achieve 90+ Sword Sharpness for 3 days in a row.',
    tier: 'epic',
    requirement: { type: 'sharpness_streak', value: 90, days: 3 },
    xpReward: 3500,
    color: '#D6D6D6',
  },
  {
    id: 'bm-sake-month',
    type: 'hydration',
    name: 'Full Sake Barrel',
    kanji: '満酒樽',
    desc: 'Log 8 cups of water every day for a full week.',
    tier: 'common',
    requirement: { type: 'hydration_streak', cups: 8, days: 7 },
    xpReward: 1200,
    color: '#C8C8C8',
  },
];

// ─── TRAINING ARCS ───────────────────────────────────────────────────────────

export const TRAINING_ARCS = [
  {
    id: 'arc-east-blue',
    name: 'East Blue Arc',
    kanji: '東の海',
    subtitle: 'The beginning. Prove you belong.',
    discipline: 'sandai',
    durationWeeks: 4,
    color: '#C4C4C4',
    requiredRank: 0,
    weeks: [
      { week: 1, title: 'Awakening',               objective: '3 training sessions. Build the habit.', targets: { sessions: 3, discipline: 'sandai' } },
      { week: 2, title: 'Bloodied Hands',           objective: '4 sessions. Push past the first wall.', targets: { sessions: 4, discipline: 'sandai' } },
      { week: 3, title: 'The Cursed Blade Stirs',   objective: '5 sessions. Feel the curse.',           targets: { sessions: 5, discipline: 'sandai' } },
      { week: 4, title: 'East Blue Dominance',      objective: '6 sessions. Close every ring.',          targets: { sessions: 6, discipline: 'sandai' } },
    ],
    xpReward: 3000,
    techniqueReward: 'oni-giri',
  },
  {
    id: 'arc-mihawks-trial',
    name: "Mihawk's Trial Arc",
    kanji: '鷹目の試練',
    subtitle: "The world's greatest swordsman awaits.",
    discipline: 'sandai',
    durationWeeks: 6,
    color: '#DCDCDC',
    requiredRank: 2,
    weeks: [
      { week: 1, title: 'The Challenge Issued',   objective: '5 sandai sessions.',                    targets: { sessions: 5, discipline: 'sandai' } },
      { week: 2, title: 'Forging Under Scrutiny', objective: '6 sessions.',                           targets: { sessions: 6, discipline: 'sandai' } },
      { week: 3, title: 'The Middle Wall',        objective: '5 sessions. Maintain the streak.',      targets: { sessions: 5, discipline: 'sandai' } },
      { week: 4, title: 'Sharpening the Edge',    objective: '7 sessions.',                           targets: { sessions: 7, discipline: 'sandai' } },
      { week: 5, title: "The Hawk's Gaze",        objective: "Complete Mihawk's Trial boss challenge.", targets: { sessions: 5, bossId: 'mihawks-trial' } },
      { week: 6, title: 'The Scar You Earned',    objective: '7 sessions. Leave nothing behind.',     targets: { sessions: 7, discipline: 'sandai' } },
    ],
    xpReward: 8000,
    techniqueReward: 'ashura',
  },
  {
    id: 'arc-wado-mastery',
    name: 'Wado Mastery Arc',
    kanji: '和道の道',
    subtitle: 'Still the storm within. Master the mind.',
    discipline: 'wado',
    durationWeeks: 4,
    color: '#D8D8D8',
    requiredRank: 1,
    weeks: [
      { week: 1, title: 'First Stillness',  objective: '3 wado sessions.',              targets: { sessions: 3, discipline: 'wado' } },
      { week: 2, title: 'Deeper Silence',   objective: '4 wado sessions.',              targets: { sessions: 4, discipline: 'wado' } },
      { week: 3, title: 'The Quiet Blade',  objective: '5 sessions.',                  targets: { sessions: 5, discipline: 'wado' } },
      { week: 4, title: 'Harmony Realized', objective: '6 sessions. The arc closes.', targets: { sessions: 6, discipline: 'wado' } },
    ],
    xpReward: 4000,
    techniqueReward: 'santoryu-ogi',
  },
];
