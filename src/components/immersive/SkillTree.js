import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { lightImpact, mediumImpact } from '../../utils/haptics';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: W, height: H } = Dimensions.get('window');

const NODE_TYPES = {
  ROOT: 'root',
  TECHNIQUE: 'technique',
  MASTERY: 'mastery',
  HIDDEN: 'hidden',
  LOCKED: 'locked',
};

const SKILL_BRANCHES = {
  wado: {
    name: 'Wado',
    color: '#D7B56B',
    nodes: [
      { id: 'wado_root', type: NODE_TYPES.ROOT, name: 'Wado Ichimonji', x: 0, y: 0, unlocked: true },
      { id: 'wado_breath', type: NODE_TYPES.TECHNIQUE, name: 'Morning Breath', x: -80, y: -120, requires: 'wado_root', unlocked: false, xpCost: 50 },
      { id: 'wado_focus', type: NODE_TYPES.TECHNIQUE, name: 'Iron Focus', x: 80, y: -120, requires: 'wado_root', unlocked: false, xpCost: 50 },
      { id: 'wado_precision', type: NODE_TYPES.MASTERY, name: 'Precision Strike', x: -120, y: -260, requires: 'wado_breath', unlocked: false, xpCost: 150 },
      { id: 'wado_calm', type: NODE_TYPES.MASTERY, name: 'Calm Mind', x: 120, y: -260, requires: 'wado_focus', unlocked: false, xpCost: 150 },
      { id: 'wado_master', type: NODE_TYPES.HIDDEN, name: 'Wado Supreme', x: 0, y: -400, requires: ['wado_precision', 'wado_calm'], unlocked: false, xpCost: 500, fogOfWar: true },
    ],
  },
  sandai: {
    name: 'Sandai',
    color: '#F0444F',
    nodes: [
      { id: 'sandai_root', type: NODE_TYPES.ROOT, name: 'Sandai Kitetsu', x: 0, y: 0, unlocked: true },
      { id: 'sandai_power', type: NODE_TYPES.TECHNIQUE, name: 'Raw Power', x: -80, y: -120, requires: 'sandai_root', unlocked: false, xpCost: 50 },
      { id: 'sandai_endure', type: NODE_TYPES.TECHNIQUE, name: 'Endurance', x: 80, y: -120, requires: 'sandai_root', unlocked: false, xpCost: 50 },
      { id: 'sandai_fury', type: NODE_TYPES.MASTERY, name: 'Burning Fury', x: -120, y: -260, requires: 'sandai_power', unlocked: false, xpCost: 150 },
      { id: 'sandai_iron', type: NODE_TYPES.MASTERY, name: 'Iron Body', x: 120, y: -260, requires: 'sandai_endure', unlocked: false, xpCost: 150 },
      { id: 'sandai_master', type: NODE_TYPES.HIDDEN, name: 'Sandai Supreme', x: 0, y: -400, requires: ['sandai_fury', 'sandai_iron'], unlocked: false, xpCost: 500, fogOfWar: true },
    ],
  },
  shusui: {
    name: 'Shusui',
    color: '#A7BECD',
    nodes: [
      { id: 'shusui_root', type: NODE_TYPES.ROOT, name: 'Shusui', x: 0, y: 0, unlocked: true },
      { id: 'shusui_flow', type: NODE_TYPES.TECHNIQUE, name: 'Flow State', x: -80, y: -120, requires: 'shusui_root', unlocked: false, xpCost: 50 },
      { id: 'shusui_spirit', type: NODE_TYPES.TECHNIQUE, name: 'Spirit Bond', x: 80, y: -120, requires: 'shusui_root', unlocked: false, xpCost: 50 },
      { id: 'shusui_zen', type: NODE_TYPES.MASTERY, name: 'Zen Mind', x: -120, y: -260, requires: 'shusui_flow', unlocked: false, xpCost: 150 },
      { id: 'shusui_wisdom', type: NODE_TYPES.MASTERY, name: 'Ancient Wisdom', x: 120, y: -260, requires: 'shusui_spirit', unlocked: false, xpCost: 150 },
      { id: 'shusui_master', type: NODE_TYPES.HIDDEN, name: 'Shusui Supreme', x: 0, y: -400, requires: ['shusui_zen', 'shusui_wisdom'], unlocked: false, xpCost: 500, fogOfWar: true },
    ],
  },
};

const SkillNode = ({
  node,
  isActive,
  isConnected,
  onPress,
  showFogOfWar,
  energyColor,
}) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const fogOpacity = useSharedValue(node.fogOfWar ? 1 : 0);

  useEffect(() => {
    if (node.unlocked) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000 }),
          withTiming(0.4, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [node.unlocked]);

  useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1.2, { tension: 150, friction: 8 });
      lightImpact();
    } else {
      scale.value = withSpring(1, { tension: 150, friction: 8 });
    }
  }, [isActive]);

  const nodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * (node.unlocked ? 1 : 0.2),
  }));

  const fogStyle = useAnimatedStyle(() => ({
    opacity: fogOpacity.value,
  }));

  const nodeColors = {
    [NODE_TYPES.ROOT]: energyColor,
    [NODE_TYPES.TECHNIQUE]: energyColor,
    [NODE_TYPES.MASTERY]: '#FFFFFF',
    [NODE_TYPES.HIDDEN]: '#4B5563',
    [NODE_TYPES.LOCKED]: '#374151',
  };

  const isRevealed = !node.fogOfWar || (showFogOfWar && isConnected);
  const displayColor = node.unlocked ? nodeColors[node.type] : nodeColors[NODE_TYPES.LOCKED];

  return (
    <Animated.View
      style={[
        styles.skillNode,
        {
          left: W / 2 + node.x - 30,
          top: H / 2 + node.y - 30,
          borderColor: displayColor,
        },
        nodeStyle,
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(node)}
        disabled={!node.unlocked || !isRevealed}
        style={styles.nodeTouchable}
      >
        <Animated.View
          style={[
            styles.nodeGlow,
            { backgroundColor: displayColor, shadowColor: displayColor },
            glowStyle,
          ]}
        />

        <View
          style={[
            styles.nodeCore,
            {
              backgroundColor: node.unlocked ? 'rgba(10,10,10,0.9)' : 'rgba(20,20,20,0.9)',
              borderColor: displayColor,
            },
          ]}
        >
          <Text style={[styles.nodeKanji, { color: displayColor }]}>
            {node.unlocked ? getKanjiForNode(node) : '×'}
          </Text>
        </View>

        <Text style={[styles.nodeName, { color: displayColor }]} numberOfLines={1}>
          {node.name}
        </Text>

        {node.xpCost && (
          <Text style={styles.nodeCost}>{node.xpCost} XP</Text>
        )}

        {node.fogOfWar && (
          <Animated.View style={[styles.fogOverlay, fogStyle]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const getKanjiForNode = (node) => {
  if (node.type === NODE_TYPES.ROOT) return '根';
  if (node.id.includes('breath') || node.id.includes('flow')) return '気';
  if (node.id.includes('focus') || node.id.includes('zen')) return '禅';
  if (node.id.includes('power') || node.id.includes('fury')) return '力';
  if (node.id.includes('endure') || node.id.includes('iron')) return '耐';
  if (node.id.includes('precision') || node.id.includes('strike')) return '確';
  if (node.id.includes('calm')) return '静';
  if (node.id.includes('master') || node.id.includes('supreme')) return '極';
  return '技';
};

const ConnectionLine = ({ from, to, isActive, isUnlocked, energyColor }) => {
  const lineOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive || isUnlocked) {
      lineOpacity.value = withTiming(0.8, { duration: 500 });
    } else {
      lineOpacity.value = withTiming(0.15, { duration: 300 });
    }
  }, [isActive, isUnlocked]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
  }));

  const x1 = W / 2 + from.x + 30;
  const y1 = H / 2 + from.y + 30;
  const x2 = W / 2 + to.x + 30;
  const y2 = H / 2 + to.y + 30;

  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  return (
    <Animated.View
      style={[
        styles.connectionLine,
        {
          width: length,
          height: 2,
          left: x1,
          top: y1,
          transform: [{ rotate: `${angle}deg` }],
          backgroundColor: energyColor,
          shadowColor: energyColor,
        },
        lineStyle,
      ]}
    />
  );
};

const EnergyStream = ({ color, intensity = 1 }) => {
  const streamY = useSharedValue(0);
  const streamOpacity = useSharedValue(0);

  useEffect(() => {
    streamY.value = withRepeat(
      withTiming(H, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    streamOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6 * intensity, { duration: 1500 }),
        withTiming(0.2 * intensity, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [intensity]);

  const streamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: streamY.value }],
    opacity: streamOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.energyStream,
        { backgroundColor: color, shadowColor: color },
        streamStyle,
      ]}
    />
  );
};

const ConstellationBackground = ({ color, nodeCount }) => {
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.5 + Math.random() * 1.5,
      twinkleOffset: Math.random() * 5000,
    }));
  }, []);

  return (
    <View style={styles.constellationContainer} pointerEvents="none">
      {stars.map((star) => (
        <TwinkleStar
          key={star.id}
          x={star.x}
          y={star.y}
          size={star.size}
          delay={star.twinkleOffset}
          color={color}
        />
      ))}
    </View>
  );
};

const TwinkleStar = ({ x, y, size, delay, color }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 2000 }),
          withTiming(0.2, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const starStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        starStyle,
      ]}
    />
  );
};

const MasteryWorld = ({
  discipline = 'wado',
  nodes = [],
  unlockedNodes = [],
  onNodePress,
  showFogOfWar = true,
  currentX = 0,
  currentY = 0,
  onPan,
}) => {
  // Fall back to a valid branch so an unexpected discipline prop ('mind'/'body'
  // naming, etc.) can't crash every `branch.nodes` access below.
  const branch = SKILL_BRANCHES[discipline] ?? SKILL_BRANCHES.wado;
  const [activeNodeId, setActiveNodeId] = useState(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = currentX + e.translationX;
      translateY.value = currentY + e.translationY;
    })
    .onEnd(() => {
      // Pass the function reference to runOnJS (and call the bridged thunk with
      // the args) — the previous form invoked onPan on the UI thread and handed
      // its undefined return to runOnJS, a no-op that also broke worklet purity.
      if (onPan) runOnJS(onPan)({ x: translateX.value, y: translateY.value });
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(2, e.scale));
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const energyFlows = useMemo(() => {
    const flows = [];
    branch.nodes.forEach((node) => {
      if (node.requires) {
        const requires = Array.isArray(node.requires) ? node.requires : [node.requires];
        requires.forEach((reqId) => {
          const reqNode = branch.nodes.find((n) => n.id === reqId);
          if (reqNode) {
            flows.push({ from: reqNode, to: node });
          }
        });
      }
    });
    return flows;
  }, [branch.nodes]);

  const isConnected = useCallback((nodeId) => {
    const visited = new Set();
    const queue = [branch.nodes.find((n) => n.id.includes('_root'))];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);

      if (current.id === nodeId) return true;

      branch.nodes
        .filter((n) => {
          const requires = Array.isArray(n.requires) ? n.requires : [n.requires];
          return requires.includes(current.id);
        })
        .forEach((child) => queue.push(child));
    }

    return false;
  }, [branch]);

  const handleNodePress = useCallback((node) => {
    setActiveNodeId(node.id);
    onNodePress?.(node);
    mediumImpact();
  }, [onNodePress]);

  return (
    <GestureHandlerRootView style={styles.masteryWorldContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.worldContent, containerStyle]}>
          <ConstellationBackground color={branch.color} nodeCount={branch.nodes.length} />

          {energyFlows.map((flow, i) => (
            <ConnectionLine
              key={`flow-${i}`}
              from={flow.from}
              to={flow.to}
              isActive={activeNodeId === flow.to.id}
              isUnlocked={flow.to.unlocked}
              energyColor={branch.color}
            />
          ))}

          {branch.nodes.map((node) => (
            <SkillNode
              key={node.id}
              node={{ ...node, unlocked: unlockedNodes.includes(node.id) || node.unlocked }}
              isActive={activeNodeId === node.id}
              isConnected={isConnected(node.id)}
              onPress={handleNodePress}
              showFogOfWar={showFogOfWar}
              energyColor={branch.color}
            />
          ))}

          <EnergyStream color={branch.color} intensity={0.5} />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const SkillTree = ({
  discipline = 'wado',
  nodes = [],
  unlockedNodes = [],
  onNodePress,
  showFogOfWar = true,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handlePan = useCallback((newPos) => {
    setPosition(newPos);
  }, []);

  return (
    <View style={styles.skillTreeContainer}>
      <MasteryWorld
        discipline={discipline}
        nodes={nodes}
        unlockedNodes={unlockedNodes}
        onNodePress={onNodePress}
        showFogOfWar={showFogOfWar}
        currentX={position.x}
        currentY={position.y}
        onPan={handlePan}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  masteryWorldContainer: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  worldContent: {
    width: W * 3,
    height: H * 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  constellationContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  connectionLine: {
    position: 'absolute',
    transformOrigin: 'left center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  skillNode: {
    position: 'absolute',
    width: 60,
    height: 80,
    alignItems: 'center',
  },
  nodeTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  nodeCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeKanji: {
    fontSize: 18,
    fontWeight: '300',
  },
  nodeName: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 60,
  },
  nodeCost: {
    fontSize: 8,
    color: '#6B7280',
    marginTop: 2,
  },
  fogOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 22,
  },
  energyStream: {
    position: 'absolute',
    width: 2,
    height: 200,
    top: 0,
    left: W / 2 - 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  skillTreeContainer: {
    flex: 1,
  },
});

export {
  SkillTree,
  MasteryWorld,
  SKILL_BRANCHES,
  NODE_TYPES,
  SkillNode,
  ConnectionLine,
  EnergyStream,
  ConstellationBackground,
};
export default SkillTree;