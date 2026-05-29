import React, { useEffect, useCallback, useState } from 'react';
import { View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const SOUND_PRESETS = {
  ambient: {
    low: 0.15,
    mid: 0.1,
    high: 0.05,
  },
  training: {
    low: 0.25,
    mid: 0.2,
    high: 0.15,
  },
  celebration: {
    low: 0.3,
    mid: 0.25,
    high: 0.2,
  },
  rest: {
    low: 0.1,
    mid: 0.08,
    high: 0.03,
  },
};

const FREQUENCIES = {
  low: 80,
  mid: 200,
  high: 400,
};

class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.currentPreset = 'ambient';
    this.layers = {};
    this.isMuted = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') {
        this.isInitialized = true;
        return;
      }

      this.isInitialized = true;
    } catch (error) {
      console.warn('Audio engine initialization failed:', error);
    }
  }

  setMasterVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setPreset(presetName) {
    const preset = SOUND_PRESETS[presetName];
    if (preset) {
      this.currentPreset = presetName;
      this.updateLayers();
    }
  }

  updateLayers() {
    const preset = SOUND_PRESETS[this.currentPreset];
    if (!preset || !this.isInitialized) return;

    Object.keys(FREQUENCIES).forEach((key) => {
      if (this.layers[key]) {
        this.layers[key].gain.value = preset[key] || 0;
      }
    });
  }

  async playTone(frequency, duration, type = 'sine') {
    if (!this.isInitialized || this.isMuted) return;

    try {
    } catch (error) {
      // Silent fail for audio
    }
  }

  async playAmbientDrone(intensity = 0.5) {
    if (!this.isInitialized) return;

    this.playTone(FREQUENCIES.low, 2000, 'sine');
    this.playTone(FREQUENCIES.mid, 2000, 'sine');
  }

  async playSessionStart() {
    if (!this.isInitialized || this.isMuted) return;

    await this.playTone(FREQUENCIES.mid, 300, 'sine');
    await new Promise((r) => setTimeout(r, 100));
    await this.playTone(FREQUENCIES.mid * 1.5, 300, 'sine');
  }

  async playSessionComplete() {
    if (!this.isInitialized || this.isMuted) return;

    await this.playTone(FREQUENCIES.low, 200, 'sine');
    await new Promise((r) => setTimeout(r, 150));
    await this.playTone(FREQUENCIES.mid, 200, 'sine');
    await new Promise((r) => setTimeout(r, 150));
    await this.playTone(FREQUENCIES.high, 400, 'sine');
  }

  async playRankUp() {
    if (!this.isInitialized || this.isMuted) return;

    const notes = [1, 1.25, 1.5, 2];
    for (const mult of notes) {
      await this.playTone(FREQUENCIES.mid * mult, 300, 'sine');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  async playBreathingInhale() {
    if (!this.isInitialized || this.isMuted) return;
    await this.playTone(FREQUENCIES.low, 4000, 'sine');
  }

  async playBreathingExhale() {
    if (!this.isInitialized || this.isMuted) return;
    await this.playTone(FREQUENCIES.low * 0.8, 4000, 'sine');
  }

  async playSwordSlash() {
    if (!this.isInitialized || this.isMuted) return;

    await this.playTone(FREQUENCIES.high * 1.5, 100, 'sawtooth');
    await this.playTone(FREQUENCIES.mid, 150, 'triangle');
  }

  async playUnlockTechnique() {
    if (!this.isInitialized || this.isMuted) return;

    await this.playTone(FREQUENCIES.mid, 200, 'sine');
    await new Promise((r) => setTimeout(r, 100));
    await this.playTone(FREQUENCIES.mid * 1.25, 200, 'sine');
    await new Promise((r) => setTimeout(r, 100));
    await this.playTone(FREQUENCIES.mid * 1.5, 400, 'sine');
  }

  async playStreakMilestone() {
    if (!this.isInitialized || this.isMuted) return;

    for (let i = 0; i < 3; i++) {
      await this.playTone(FREQUENCIES.mid * (1 + i * 0.25), 250, 'sine');
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  mute() {
    this.isMuted = true;
    if (this.masterGain) {
      this.masterGain.gain.value = 0;
    }
  }

  unmute() {
    this.isMuted = false;
    this.updateLayers();
  }

  dispose() {
    if (this.context) {
      this.context.close();
      this.isInitialized = false;
    }
  }
}

const audioEngine = new AudioEngine();

const HAPTIC_PATTERNS = {
  light_tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium_tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy_tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
  },
  rank_up: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 150);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 300);
  },
  sword_slash: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 50);
  },
  breathing_pulse: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  milestone: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);
  },
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
  warning: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};

const useAudioHaptics = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    audioEngine.initialize().then(() => {
      setIsInitialized(true);
    });
  }, []);

  const playSessionStart = useCallback(async () => {
    await audioEngine.playSessionStart();
    HAPTIC_PATTERNS.sword_slash();
  }, []);

  const playSessionComplete = useCallback(async () => {
    await audioEngine.playSessionComplete();
    HAPTIC_PATTERNS.success();
  }, []);

  const playRankUp = useCallback(async () => {
    await audioEngine.playRankUp();
    HAPTIC_PATTERNS.rank_up();
  }, []);

  const playBreathingPhase = useCallback(async (phase) => {
    if (phase === 'inhale' || phase === 'hold_in') {
      await audioEngine.playBreathingInhale();
    } else {
      await audioEngine.playBreathingExhale();
    }
    HAPTIC_PATTERNS.breathing_pulse();
  }, []);

  const playSwordSlash = useCallback(async () => {
    await audioEngine.playSwordSlash();
    HAPTIC_PATTERNS.sword_slash();
  }, []);

  const playUnlock = useCallback(async () => {
    await audioEngine.playUnlockTechnique();
    HAPTIC_PATTERNS.success();
  }, []);

  const playMilestone = useCallback(async () => {
    await audioEngine.playStreakMilestone();
    HAPTIC_PATTERNS.milestone();
  }, []);

  const playAmbient = useCallback(async () => {
    await audioEngine.playAmbientDrone();
  }, []);

  const setPreset = useCallback((preset) => {
    audioEngine.setPreset(preset);
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      audioEngine.unmute();
      setIsMuted(false);
    } else {
      audioEngine.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const triggerHaptic = useCallback((pattern) => {
    const hapticFn = HAPTIC_PATTERNS[pattern];
    if (hapticFn) {
      hapticFn();
    }
  }, []);

  return {
    isInitialized,
    isMuted,
    playSessionStart,
    playSessionComplete,
    playRankUp,
    playBreathingPhase,
    playSwordSlash,
    playUnlock,
    playMilestone,
    playAmbient,
    setPreset,
    toggleMute,
    triggerHaptic,
    audioEngine,
  };
};

const ImmersionProvider = ({
  children,
  soundEnabled = true,
  hapticsEnabled = true,
  onHapticTrigger,
}) => {
  const {
    playSessionStart,
    playSessionComplete,
    playRankUp,
    playBreathingPhase,
    playSwordSlash,
    playUnlock,
    playMilestone,
    setPreset,
    toggleMute,
    triggerHaptic,
  } = useAudioHaptics();

  useEffect(() => {
    if (soundEnabled) {
      setPreset('ambient');
    }
  }, [soundEnabled]);

  return (
    <View style={{ flex: 1 }}>
      {children}
    </View>
  );
};

export {
  audioEngine,
  useAudioHaptics,
  HAPTIC_PATTERNS,
  SOUND_PRESETS,
  ImmersionProvider,
};
export default audioEngine;