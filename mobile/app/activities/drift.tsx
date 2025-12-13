import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { useGlobalAudio } from '../../contexts/AudioContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_SIZE = 48;
const BUBBLE_GAP = 0;
const COLS = Math.ceil(SCREEN_WIDTH / BUBBLE_SIZE) + 1;
const ROWS = Math.ceil(SCREEN_HEIGHT / (BUBBLE_SIZE * 0.866)) + 2;

const ENCOURAGEMENT_MESSAGES = [
  "Each pop releases a little weight.",
  "You're creating space for peace.",
  "Tension doesn't belong here.",
  "Let the pressure float away.",
  "Your calm is returning.",
  "This moment is just for you.",
  "Every release brings relief.",
  "You deserve this stillness.",
  "Breathe into the quiet.",
  "Stress has no hold on you.",
  "Peace flows through you now.",
  "You're lighter with each one.",
  "The heaviness is lifting.",
  "Soften. Release. Be free.",
  "Your peace is worth protecting.",
  "Nothing to carry right now.",
  "Let the worry dissolve.",
  "You are doing beautifully.",
];

interface BubbleData {
  id: string;
  col: number;
  row: number;
  popped: boolean;
  baseY: number;
}

interface HaloEffect {
  id: string;
  x: number;
  y: number;
}

function Bubble({ 
  data, 
  onPop,
  yOffset,
  fallDelay,
}: { 
  data: BubbleData; 
  onPop: (id: string, x: number, y: number) => void;
  yOffset: number;
  fallDelay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const [isHidden, setIsHidden] = useState(false);
  
  const isOddRow = data.row % 2 === 1;
  const baseX = data.col * BUBBLE_SIZE + (isOddRow ? BUBBLE_SIZE / 2 : 0) - BUBBLE_SIZE / 2;
  const baseY = data.baseY;
  
  useEffect(() => {
    if (yOffset > 0) {
      translateY.value = withDelay(
        fallDelay,
        withSpring(yOffset, {
          damping: 15,
          stiffness: 60,
          mass: 1.2,
        })
      );
    }
  }, [yOffset, fallDelay]);
  
  useEffect(() => {
    if (data.popped) {
      scale.value = withTiming(0.2, { duration: 120, easing: Easing.out(Easing.ease) });
      opacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
        runOnJS(setIsHidden)(true);
      });
    }
  }, [data.popped]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));
  
  const handlePress = () => {
    if (!data.popped) {
      onPop(data.id, baseX + BUBBLE_SIZE / 2, baseY + BUBBLE_SIZE / 2);
    }
  };
  
  if (isHidden) {
    return null;
  }
  
  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        {
          position: 'absolute',
          left: baseX,
          top: baseY,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={handlePress} style={styles.bubblePressable}>
        <View style={styles.bubble}>
          <View style={styles.bubbleInner}>
            <View style={styles.bubbleHighlight} />
            <View style={styles.bubbleHighlightSmall} />
            <View style={styles.bubbleShimmer} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Halo({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.5);
  
  useEffect(() => {
    scale.value = withTiming(2.2, { duration: 350, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(onComplete)();
    });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View
      style={[
        styles.halo,
        {
          left: x - 30,
          top: y - 30,
        },
        animatedStyle,
      ]}
    />
  );
}

function GridBackground() {
  const rows = [];
  const gridSize = BUBBLE_SIZE;
  const numCols = Math.ceil(SCREEN_WIDTH / gridSize) + 1;
  const numRows = Math.ceil(SCREEN_HEIGHT / gridSize) + 1;
  
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const isOddRow = row % 2 === 1;
      const x = col * gridSize + (isOddRow ? gridSize / 2 : 0);
      const y = row * gridSize * 0.866;
      rows.push(
        <View
          key={`grid-${row}-${col}`}
          style={[
            styles.gridCircle,
            {
              left: x - gridSize / 2,
              top: y - gridSize / 2,
              width: gridSize,
              height: gridSize,
              borderRadius: gridSize / 2,
            },
          ]}
        />
      );
    }
  }
  
  return <View style={styles.gridContainer}>{rows}</View>;
}

export default function DriftScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;
  
  const [bubbles, setBubbles] = useState<BubbleData[]>(() => {
    const initialBubbles: BubbleData[] = [];
    for (let row = 0; row < ROWS; row++) {
      const isOddRow = row % 2 === 1;
      const colsInRow = isOddRow ? COLS : COLS + 1;
      for (let col = 0; col < colsInRow; col++) {
        const baseY = row * (BUBBLE_SIZE * 0.866) - BUBBLE_SIZE / 2;
        initialBubbles.push({
          id: `${row}-${col}`,
          col,
          row,
          popped: false,
          baseY,
        });
      }
    }
    return initialBubbles;
  });
  
  const [bubbleOffsets, setBubbleOffsets] = useState<Record<string, number>>({});
  const [bubbleDelays, setBubbleDelays] = useState<Record<string, number>>({});
  const [halos, setHalos] = useState<HaloEffect[]>([]);
  const [popCount, setPopCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showHelper, setShowHelper] = useState(true);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIndexRef = useRef(-1);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const messageOpacity = useSharedValue(0);
  const helperOpacity = useSharedValue(1);

  const { pauseForActivity, resumeFromActivity } = useGlobalAudio();

  useEffect(() => {
    pauseForActivity();
    return () => {
      resumeFromActivity();
    };
  }, [pauseForActivity, resumeFromActivity]);
  
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/pop.mp3')
      );
      soundRef.current = sound;
    };
    loadSound();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playPopSound = async () => {
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(0.3);
      await soundRef.current.setRateAsync(0.85, true);
      await soundRef.current.replayAsync();
    }
  };
  
  const handlePop = useCallback((id: string, x: number, y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    playPopSound();
    
    const poppedBubble = bubbles.find(b => b.id === id);
    if (!poppedBubble) return;
    
    setBubbles(prev => prev.map(b => 
      b.id === id ? { ...b, popped: true } : b
    ));
    
    const bubblesInColumn = bubbles.filter(b => 
      !b.popped && 
      b.row < poppedBubble.row &&
      b.col === poppedBubble.col
    );
    
    if (bubblesInColumn.length > 0) {
      const ROW_HEIGHT = BUBBLE_SIZE * 0.866;
      const newOffsets = { ...bubbleOffsets };
      const newDelays = { ...bubbleDelays };
      
      bubblesInColumn.forEach(b => {
        const currentOffset = newOffsets[b.id] || 0;
        newOffsets[b.id] = currentOffset + ROW_HEIGHT;
        const rowDistance = poppedBubble.row - b.row;
        newDelays[b.id] = rowDistance * 120;
      });
      
      setBubbleOffsets(newOffsets);
      setBubbleDelays(newDelays);
    }
    
    setHalos(prev => [...prev, { id: `halo-${Date.now()}`, x, y }]);
    
    setPopCount(prev => {
      const newCount = prev + 1;
      
      if (newCount >= 3 && showHelper) {
        helperOpacity.value = withTiming(0, { duration: 500 });
        setTimeout(() => setShowHelper(false), 500);
      }
      
      if (newCount % 4 === 0 || newCount === 1) {
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
        }
        
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length);
        } while (randomIndex === lastMessageIndexRef.current && ENCOURAGEMENT_MESSAGES.length > 1);
        lastMessageIndexRef.current = randomIndex;
        
        setCurrentMessage(ENCOURAGEMENT_MESSAGES[randomIndex]);
        messageOpacity.value = withTiming(0.6, { duration: 1200 });
        
        messageTimeoutRef.current = setTimeout(() => {
          messageOpacity.value = withTiming(0, { duration: 1500 });
        }, 11000);
      }
      
      return newCount;
    });
  }, [bubbles, bubbleOffsets, showHelper]);
  
  const removeHalo = useCallback((id: string) => {
    setHalos(prev => prev.filter(h => h.id !== id));
  }, []);
  
  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));
  
  const helperStyle = useAnimatedStyle(() => ({
    opacity: helperOpacity.value,
  }));
  
  const handleTracePress = () => {
    router.replace('/(tabs)/chat');
  };

  const handleEndSession = () => {
    router.replace('/(tabs)/chat');
  };

  const TAB_BAR_HEIGHT = 60;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <GridBackground />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.messageContainer, messageStyle]} pointerEvents="none">
        <Text style={[styles.messageText, { fontFamily: canelaFont }]}>
          {currentMessage}
        </Text>
      </Animated.View>

      {showHelper && (
        <Animated.View style={[styles.helperContainer, helperStyle]} pointerEvents="none">
          <Text style={[styles.helperText, { fontFamily: canelaFont }]}>
            Pop what you're holding.
          </Text>
        </Animated.View>
      )}

      <View style={styles.bubblesContainer}>
        {bubbles.map(bubble => (
          <Bubble
            key={bubble.id}
            data={bubble}
            onPop={handlePop}
            yOffset={bubbleOffsets[bubble.id] || 0}
            fallDelay={bubbleDelays[bubble.id] || 0}
          />
        ))}
      </View>

      {halos.map(halo => (
        <Halo
          key={halo.id}
          x={halo.x}
          y={halo.y}
          onComplete={() => removeHalo(halo.id)}
        />
      ))}

      <View style={[styles.endButtonContainer, { bottom: TAB_BAR_HEIGHT + bottomPadding + 30 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.endButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          onPress={handleEndSession}
        >
          <Text style={[styles.endButtonText, { fontFamily: canelaFont }]}>
            End Session
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C4B8A8',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(139, 119, 101, 0.25)',
    backgroundColor: 'transparent',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: TraceWordmark.color,
    opacity: TraceWordmark.opacity,
    ...Shadows.traceWordmark,
  },
  bubblesContainer: {
    flex: 1,
    position: 'relative',
  },
  bubbleContainer: {
    zIndex: 10,
  },
  bubblePressable: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    position: 'relative',
  },
  bubble: {
    width: BUBBLE_SIZE - 2,
    height: BUBBLE_SIZE - 2,
    borderRadius: (BUBBLE_SIZE - 2) / 2,
    margin: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    overflow: 'hidden',
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  bubbleInner: {
    flex: 1,
    position: 'relative',
  },
  bubbleHighlight: {
    position: 'absolute',
    top: 4,
    left: 6,
    width: BUBBLE_SIZE * 0.45,
    height: BUBBLE_SIZE * 0.22,
    borderRadius: BUBBLE_SIZE * 0.15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    transform: [{ rotate: '-40deg' }],
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  bubbleHighlightSmall: {
    position: 'absolute',
    top: 10,
    left: 14,
    width: BUBBLE_SIZE * 0.15,
    height: BUBBLE_SIZE * 0.08,
    borderRadius: BUBBLE_SIZE * 0.06,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '-40deg' }],
  },
  bubbleShimmer: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    width: BUBBLE_SIZE * 0.2,
    height: BUBBLE_SIZE * 0.1,
    borderRadius: BUBBLE_SIZE * 0.08,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ rotate: '30deg' }],
    shadowColor: 'rgba(255, 255, 255, 1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  halo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(138, 155, 140, 0.4)',
    backgroundColor: 'transparent',
    zIndex: 50,
  },
  messageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  messageText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#3D3D3D',
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  helperContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 200,
  },
  helperText: {
    fontSize: 16,
    color: 'rgba(80, 70, 60, 0.7)',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  endButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  endButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(100, 85, 70, 0.85)',
    letterSpacing: 1.5,
  },
});
