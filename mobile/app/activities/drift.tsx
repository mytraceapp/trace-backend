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
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FontFamily } from '../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_SIZE = 48;
const BUBBLE_GAP = 0;
const COLS = Math.ceil(SCREEN_WIDTH / BUBBLE_SIZE) + 1;
const ROWS = Math.ceil(SCREEN_HEIGHT / (BUBBLE_SIZE * 0.866)) + 2;

const ENCOURAGEMENT_MESSAGES = [
  "You're doing great.",
  "Let it go.",
  "One at a time.",
  "Breathe.",
  "Release.",
  "You've got this.",
  "Lighter now.",
  "Keep going.",
  "Peace is near.",
  "Almost there.",
  "Exhale.",
  "Feel the calm.",
  "Tension fading.",
  "You are safe.",
  "Let it drift away.",
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
}: { 
  data: BubbleData; 
  onPop: (id: string, x: number, y: number) => void;
  yOffset: number;
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
      translateY.value = withSpring(yOffset, {
        damping: 12,
        stiffness: 100,
        mass: 0.8,
      });
    }
  }, [yOffset]);
  
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
  const [halos, setHalos] = useState<HaloEffect[]>([]);
  const [popCount, setPopCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showHelper, setShowHelper] = useState(true);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIndexRef = useRef(-1);
  
  const messageOpacity = useSharedValue(0);
  const helperOpacity = useSharedValue(1);
  
  const handlePop = useCallback((id: string, x: number, y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const poppedBubble = bubbles.find(b => b.id === id);
    if (!poppedBubble) return;
    
    setBubbles(prev => prev.map(b => 
      b.id === id ? { ...b, popped: true } : b
    ));
    
    const bubblesAbove = bubbles.filter(b => 
      !b.popped && 
      b.row < poppedBubble.row &&
      Math.abs(b.col - poppedBubble.col) <= 1
    );
    
    const ROW_HEIGHT = BUBBLE_SIZE * 0.866;
    const newOffsets = { ...bubbleOffsets };
    bubblesAbove.forEach(b => {
      const currentOffset = newOffsets[b.id] || 0;
      newOffsets[b.id] = currentOffset + ROW_HEIGHT;
    });
    setBubbleOffsets(newOffsets);
    
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
        messageOpacity.value = withTiming(0.5, { duration: 800 });
        
        messageTimeoutRef.current = setTimeout(() => {
          messageOpacity.value = withTiming(0, { duration: 1000 });
        }, 5000);
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

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <GridBackground />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    paddingBottom: 8,
  },
  traceLabel: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#5A5A5A',
    opacity: 0.8,
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
    backgroundColor: '#F5F3F0',
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 160, 0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleInner: {
    flex: 1,
    position: 'relative',
  },
  bubbleHighlight: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: BUBBLE_SIZE * 0.3,
    height: BUBBLE_SIZE * 0.2,
    borderRadius: BUBBLE_SIZE * 0.12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    transform: [{ rotate: '-30deg' }],
  },
  bubbleHighlightSmall: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: BUBBLE_SIZE * 0.1,
    height: BUBBLE_SIZE * 0.06,
    borderRadius: BUBBLE_SIZE * 0.04,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    transform: [{ rotate: '-30deg' }],
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
    zIndex: 200,
  },
  messageText: {
    fontSize: 28,
    color: '#4A4A4A',
    textAlign: 'center',
    paddingHorizontal: 40,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
});
