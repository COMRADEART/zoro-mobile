import { Animated } from 'react-native';
import { THEMES } from '../theme/themes';
import { SWORDS } from '../data/gameData';
import { rankUp, bossDefeat, bossFail, themeUnlock } from '../utils/haptics';
import { playRankUp } from '../services/audioService';

export function buildEventHandlers(ctx) {
  return {
    rank_up: (ev) => {
      rankUp();
      playRankUp();
      ctx.setPendingRankUp(ev.rank);
      ctx.showToast({ title: 'RANK UP', body: ev.rank.name });
    },
    boss_completed: (ev) => {
      bossDefeat();
      ctx.showToast({
        title: 'BOSS DEFEATED',
        body: `${ev.boss?.name ?? 'Challenge'} · +${ev.boss?.xpReward?.toLocaleString() ?? '?'} XP`,
      });
    },
    boss_failed: () => {
      bossFail();
      ctx.showToast({ title: 'NOTHING HAPPENED.', body: 'Train harder.' });
    },
    boss_hint: (ev) => {
      bossFail();
      ctx.setBossHint(ev.boss?.name ?? 'this challenge');
    },
    theme_unlocked: (ev) => {
      themeUnlock();
      const tc = THEMES[ev.themeKey];
      if (tc) {
        ctx.flashAnim.stopAnimation();
        ctx.setThemeFlash({ color: tc.accent, key: ev.themeKey });
        Animated.sequence([
          Animated.timing(ctx.flashAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.delay(600),
          Animated.timing(ctx.flashAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) ctx.setThemeFlash(null); });
      }
      ctx.showToast({ title: 'THEME UNLOCKED', body: tc?.name ?? ev.themeKey });
    },
    data_reset: () => {
      ctx.showToast({ title: 'DATA RESET', body: 'Progress was reset. A backup was saved.' });
    },
    technique_unlocked: (ev) => {
      ctx.showToast({ title: 'TECHNIQUE UNLOCKED', body: `${ev.reward?.kanji} · ${ev.reward?.name}` });
    },
    title_earned: (ev) => {
      ctx.showToast({ title: 'TITLE EARNED', body: `${ev.tier?.kanji} · ${ev.tier?.name}` });
    },
    week_completed: (ev) => {
      ctx.showToast({ title: 'WEEK COMPLETE', body: `Week ${ev.weekNum} · ${SWORDS[ev.path]?.name}` });
    },
    bounty_completed: (ev) => {
      ctx.showToast({ title: 'BOUNTY CLAIMED', body: `${ev.bounty?.kanji} · +${ev.bounty?.xpReward} XP` });
    },
    arc_week_complete: (ev) => {
      ctx.showToast({ title: 'ARC WEEK DONE', body: `Week ${ev.weekNum} complete` });
    },
    arc_completed: (ev) => {
      ctx.showToast({ title: 'ARC COMPLETE', body: `${ev.arc?.name} · +${ev.arc?.xpReward?.toLocaleString()} XP` });
    },
  };
}