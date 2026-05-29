import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { lightImpact } from '../../utils/haptics';

const { width: W } = Dimensions.get('window');

const SENSEI_TONES = {
  WISDOM: 'wisdom',
  DISCIPLINE: 'discipline',
  FURY: 'fury',
  SILENCE: 'silence',
  CELEBRATION: 'celebration',
};

const SENSEI_PHRASES = {
  [SENSEI_TONES.WISDOM]: [
    { text: 'The blade that rests rusts. Train with purpose.', icon: '悟' },
    { text: 'Recovery is not weakness. It is sharpening of the mind.', icon: '禅' },
    { text: 'Pain is the whetstone against which the spirit is honed.', icon: '忍' },
    { text: 'In consistency lies the path to mastery.', icon: '継続' },
    { text: 'Three blades as one. Mind, body, spirit in balance.', icon: '平' },
    { text: 'The warrior who rests well, fights well.', icon: '休' },
    { text: 'Let each breath fuel your resolve.', icon: '気' },
    { text: 'Progress whispers. Consistency roars.', icon: '常' },
  ],
  [SENSEI_TONES.DISCIPLINE]: [
    { text: 'Rise. The path does not walk itself.', icon: '起' },
    { text: 'No more excuses. Only action.', icon: '断' },
    { text: 'Your potential demands execution.', icon: '行' },
    { text: 'Today you forge tomorrow\'s edge.', icon: '鍛' },
    { text: 'The iron of your will must strike while hot.', icon: '鉄' },
    { text: 'Comfort is the enemy of growth.', icon: '厳' },
    { text: 'Show me the disciple who hungers.', icon: '欲' },
    { text: 'Every repetition is a promise to yourself.', icon: '約' },
  ],
  [SENSEI_TONES.FURY]: [
    { text: 'CEASE. Your body weakens while you hesitate.', icon: '止' },
    { text: 'BURN. Let the fire of discipline consume hesitation.', icon: '炎' },
    { text: 'MORE. Hold nothing back. This is your war.', icon: '戦' },
    { text: 'The enemy is the voice that says "later." Silence it.', icon: '黙' },
    { text: 'You think you have limits? Break them.', icon: '超' },
    { text: 'STRIKE. Every moment of inactivity is defeat.', icon: '打' },
  ],
  [SENSEI_TONES.SILENCE]: [
    { text: '...', icon: '黙' },
    { text: 'Focus.', icon: '集中' },
    { text: 'Again.', icon: '再' },
    { text: 'Silence speaks louder than words.', icon: '静' },
    { text: 'Let the blade do the talking.', icon: '刀' },
  ],
  [SENSEI_TONES.CELEBRATION]: [
    { text: 'WORTHY. Your dedication echoes through the dojo.', icon: '侍' },
    { text: 'The stars witness your rise. Accept this moment.', icon: '星' },
    { text: 'Victory is not given. It is earned. Today, you earned.', icon: '勝' },
    { text: 'Your blade grows sharper with each moon.', icon: '月' },
    { text: 'The three paths converge in you. This is your nature.', icon: '三' },
    { text: 'A streak of honor. Do not let it break.', icon: '連' },
    { text: 'The sensei sees growth. The sensei is pleased.', icon: '栄' },
    { text: 'From discipline comes freedom. You understand this now.', icon: '自由' },
  ],
};

const OBSERVATION_TYPES = {
  RECOVERY_LOW: 'recovery_low',
  RECOVERY_HIGH: 'recovery_high',
  STREAK_MILESTONE: 'streak_milestone',
  STREAK_BROKEN: 'streak_broken',
  BURN_OUT_WARNING: 'burn_out_warning',
  CONSISTENCY_PRAISE: 'consistency_praise',
  RANK_UP: 'rank_up',
  SESSION_COMPLETE: 'session_complete',
  SESSION_START: 'session_start',
  EXERCISE_COMPLETE: 'exercise_complete',
  SLEEP_QUALITY: 'sleep_quality',
  PERFECT_WEEK: 'perfect_week',
  TECHNIQUE_UNLOCK: 'technique_unlock',
  BOSS_DEFEATED: 'boss_defeated',
};

const getRecommendedTone = (observation, context) => {
  switch (observation) {
    case OBSERVATION_TYPES.RECOVERY_LOW:
      return SENSEI_TONES.WISDOM;
    case OBSERVATION_TYPES.BURN_OUT_WARNING:
      return SENSEI_TONES.WISDOM;
    case OBSERVATION_TYPES.STREAK_MILESTONE:
      return SENSEI_TONES.CELEBRATION;
    case OBSERVATION_TYPES.STREAK_BROKEN:
      return SENSEI_TONES.DISCIPLINE;
    case OBSERVATION_TYPES.CONSISTENCY_PRAISE:
      return SENSEI_TONES.CELEBRATION;
    case OBSERVATION_TYPES.RANK_UP:
      return SENSEI_TONES.CELEBRATION;
    case OBSERVATION_TYPES.SESSION_START:
      return SENSEI_TONES.DISCIPLINE;
    case OBSERVATION_TYPES.SESSION_COMPLETE:
      return SENSEI_TONES.WISDOM;
    case OBSERVATION_TYPES.EXERCISE_COMPLETE:
      return SENSEI_TONES.SILENCE;
    case OBSERVATION_TYPES.BOSS_DEFEATED:
      return SENSEI_TONES.FURY;
    case OBSERVATION_TYPES.TECHNIQUE_UNLOCK:
      return SENSEI_TONES.CELEBRATION;
    default:
      return SENSEI_TONES.WISDOM;
  }
};

const SenseiAvatar = ({ tone, isActive }) => {
  const avatarOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.8);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      avatarOpacity.value = withTiming(1, { duration: 600 });
      avatarScale.value = withSpring(1, { tension: 100, friction: 8 });
    } else {
      avatarOpacity.value = withTiming(0, { duration: 300 });
      avatarScale.value = withTiming(0.8, { duration: 300 });
    }
  }, [isActive]);

  useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [
      { scale: avatarScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const toneColors = {
    [SENSEI_TONES.WISDOM]: '#D7B56B',
    [SENSEI_TONES.DISCIPLINE]: '#F0444F',
    [SENSEI_TONES.FURY]: '#FF4B58',
    [SENSEI_TONES.SILENCE]: '#6B7280',
    [SENSEI_TONES.CELEBRATION]: '#F7B733',
  };

  const toneBgColors = {
    [SENSEI_TONES.WISDOM]: 'rgba(215, 181, 107, 0.15)',
    [SENSEI_TONES.DISCIPLINE]: 'rgba(240, 68, 79, 0.15)',
    [SENSEI_TONES.FURY]: 'rgba(255, 75, 88, 0.2)',
    [SENSEI_TONES.SILENCE]: 'rgba(107, 114, 128, 0.15)',
    [SENSEI_TONES.CELEBRATION]: 'rgba(247, 183, 51, 0.15)',
  };

  const color = toneColors[tone] || '#D7B56B';
  const bgColor = toneBgColors[tone] || 'rgba(215, 181, 107, 0.15)';

  return (
    <Animated.View style={[styles.avatarContainer, avatarStyle]}>
      <View style={[styles.avatarCircle, { backgroundColor: bgColor, borderColor: color }]}>
        <View style={[styles.avatarInner, { borderColor: color }]}>
          <Text style={[styles.avatarKanji, { color }]}>師</Text>
        </View>
      </View>
      <View style={[styles.avatarGlow, { backgroundColor: color }]} />
    </Animated.View>
  );
};

const SenseiMessage = ({ phrase, tone, isVisible }) => {
  const messageOpacity = useSharedValue(0);
  const messageTranslateY = useSharedValue(20);

  useEffect(() => {
    if (isVisible) {
      messageOpacity.value = withTiming(1, { duration: 500 });
      messageTranslateY.value = withSpring(0, { tension: 80, friction: 10 });
    } else {
      messageOpacity.value = withTiming(0, { duration: 300 });
      messageTranslateY.value = withTiming(20, { duration: 300 });
    }
  }, [isVisible]);

  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [{ translateY: messageTranslateY.value }],
  }));

  const toneColors = {
    [SENSEI_TONES.WISDOM]: '#D7B56B',
    [SENSEI_TONES.DISCIPLINE]: '#F0444F',
    [SENSEI_TONES.FURY]: '#FF4B58',
    [SENSEI_TONES.SILENCE]: '#6B7280',
    [SENSEI_TONES.CELEBRATION]: '#F7B733',
  };

  const color = toneColors[tone] || '#D7B56B';

  // currentPhrase starts null (before the first observation fires); guard after
  // hooks so a screen-reader/initial render can't crash on phrase.icon/.text.
  if (!phrase) return null;

  return (
    <Animated.View style={[styles.messageContainer, messageStyle]}>
      <View style={styles.messageBubble}>
        <Text style={[styles.messageIcon]}>{phrase.icon}</Text>
        <Text style={[styles.messageText, { color }]}>{phrase.text}</Text>
      </View>
    </Animated.View>
  );
};

class SenseiMentorEngine {
  constructor() {
    this.observationHistory = [];
    this.lastPhraseTime = 0;
    this.minPhraseInterval = 30000;
    this.currentContext = {};
    this.listeners = [];
    this.silenceMode = false;
  }

  setContext(context) {
    this.currentContext = { ...this.currentContext, ...context };
  }

  observe(observation, data = {}) {
    this.observationHistory.push({ observation, data, time: Date.now() });

    const recentObs = this.observationHistory.slice(-5);
    let urgencyLevel = 0;

    recentObs.forEach((obs) => {
      if (obs.observation === OBSERVATION_TYPES.BURN_OUT_WARNING) urgencyLevel = Math.max(urgencyLevel, 2);
      if (obs.observation === OBSERVATION_TYPES.STREAK_MILESTONE) urgencyLevel = Math.max(urgencyLevel, 1);
      if (obs.observation === OBSERVATION_TYPES.BOSS_DEFEATED) urgencyLevel = Math.max(urgencyLevel, 1);
    });

    if (this.silenceMode && urgencyLevel < 2) return;

    const now = Date.now();
    const interval = urgencyLevel > 1 ? 5000 : this.minPhraseInterval;

    if (now - this.lastPhraseTime < interval) return;

    const phrase = this.generatePhrase(observation, data);
    this.lastPhraseTime = now;
    this.notifyListeners({ observation, phrase, tone: getRecommendedTone(observation, this.currentContext) });
  }

  generatePhrase(observation, data) {
    const tone = getRecommendedTone(observation, this.currentContext);
    const phrases = SENSEI_PHRASES[tone];

    const contextPhrases = this.getContextualPhrase(observation, data, tone);

    if (contextPhrases) return contextPhrases;

    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  getContextualPhrase(observation, data, tone) {
    const { streak, recovery, rank, intensity } = data;

    if (observation === OBSERVATION_TYPES.STREAK_MILESTONE && streak) {
      if (streak === 7) {
        return { text: 'A full cycle. The dojo recognizes your commitment.', icon: '七' };
      }
      if (streak === 30) {
        return { text: 'Thirty moons of discipline. The sensei kneels before you.', icon: '三' };
      }
      if (streak === 100) {
        return { text: 'One hundred days. You have become the blade itself.', icon: '百' };
      }
    }

    if (observation === OBSERVATION_TYPES.RECOVERY_LOW) {
      return { text: 'The body begs for rest. Listen. Recovery is training too.', icon: '癒' };
    }

    if (observation === OBSERVATION_TYPES.BURN_OUT_WARNING) {
      return { text: 'You push beyond breaking. That is not strength. That is ruin.', icon: '警' };
    }

    if (observation === OBSERVATION_TYPES.RANK_UP && rank) {
      const rankTexts = {
        ozaringu: 'From nothing, something. You begin your ascent.',
        tenchi: 'Ten realms conquered. The heavens take notice.',
        meifu: 'The flame of the underworld awakens within.',
        kyokotsu: 'Beyond the blade, beyond fear. A new rank.',
        jotun: 'Giant blood flows. The sensei speaks: impressive.',
      };
      return { text: rankTexts[rank] || 'Your rank grows. Your power grows. Continue.', icon: '位' };
    }

    return null;
  }

  setSilenceMode(enabled) {
    this.silenceMode = enabled;
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  notifyListeners(data) {
    this.listeners.forEach((listener) => listener(data));
  }

  reset() {
    this.observationHistory = [];
    this.lastPhraseTime = 0;
    this.currentContext = {};
  }
}

const senseiEngine = new SenseiMentorEngine();

const useSenseiMentor = () => {
  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTone, setCurrentTone] = useState(SENSEI_TONES.WISDOM);
  const [isAvatarActive, setIsAvatarActive] = useState(false);

  useEffect(() => {
    const handlePhrase = ({ phrase, tone }) => {
      setCurrentPhrase(phrase);
      setCurrentTone(tone);
      setIsAvatarActive(true);
      setIsVisible(true);

      if (phrase.text !== '...' && phrase.text !== 'Focus.') {
        lightImpact();
      }

      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => setIsAvatarActive(false), 500);
      }, 5000);
    };

    senseiEngine.addListener(handlePhrase);

    return () => {
      senseiEngine.removeListener(handlePhrase);
    };
  }, []);

  const triggerObservation = useCallback((observation, data = {}) => {
    senseiEngine.setContext(data);
    senseiEngine.observe(observation, data);
  }, []);

  const enterSilenceMode = useCallback(() => {
    senseiEngine.setSilenceMode(true);
  }, []);

  const exitSilenceMode = useCallback(() => {
    senseiEngine.setSilenceMode(false);
  }, []);

  return {
    currentPhrase,
    currentTone,
    isVisible,
    isAvatarActive,
    triggerObservation,
    enterSilenceMode,
    exitSilenceMode,
    engine: senseiEngine,
  };
};

const SenseiMentorOverlay = ({
  currentPhrase,
  currentTone,
  isVisible,
  isAvatarActive,
}) => {
  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <SenseiAvatar tone={currentTone} isActive={isAvatarActive} />
      <SenseiMessage phrase={currentPhrase} tone={currentTone} isVisible={isVisible} />
    </View>
  );
};

const SenseiMentor = ({ state = {} }) => {
  const {
    currentPhrase,
    currentTone,
    isVisible,
    isAvatarActive,
    triggerObservation,
  } = useSenseiMentor();

  useEffect(() => {
    const { streak, recovery, rank, burnoutLevel, sessionActive } = state;

    if (recovery !== undefined && recovery < 30) {
      triggerObservation(OBSERVATION_TYPES.RECOVERY_LOW, { recovery });
    }

    if (burnoutLevel !== undefined && burnoutLevel > 0.7) {
      triggerObservation(OBSERVATION_TYPES.BURN_OUT_WARNING, { burnoutLevel });
    }

    if (streak !== undefined && streak > 0 && streak % 7 === 0) {
      triggerObservation(OBSERVATION_TYPES.STREAK_MILESTONE, { streak });
    }

    if (rank !== undefined && state.justRankedUp) {
      triggerObservation(OBSERVATION_TYPES.RANK_UP, { rank });
    }
  }, [state]);

  return (
    <SenseiMentorOverlay
      currentPhrase={currentPhrase}
      currentTone={currentTone}
      isVisible={isVisible}
      isAvatarActive={isAvatarActive}
    />
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
  },
  avatarInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarKanji: {
    fontSize: 24,
    fontWeight: '300',
  },
  avatarGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.15,
    blurRadius: 20,
  },
  messageContainer: {
    maxWidth: W * 0.8,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(215, 181, 107, 0.2)',
  },
  messageIcon: {
    fontSize: 20,
    marginRight: 12,
    color: 'rgba(215, 181, 107, 0.5)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export {
  SenseiMentor,
  SenseiMentorOverlay,
  SenseiMentorEngine,
  useSenseiMentor,
  senseiEngine,
  OBSERVATION_TYPES,
  SENSEI_TONES,
};
export default SenseiMentor;