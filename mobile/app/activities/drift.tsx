import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FontFamily } from '../../constants/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_SIZE = 44;
const BUBBLE_GAP = 2;
const COLS = Math.floor(SCREEN_WIDTH / (BUBBLE_SIZE + BUBBLE_GAP));
const ROWS = Math.floor((SCREEN_HEIGHT - 120) / (BUBBLE_SIZE * 0.85));
const OFFSET_X = (SCREEN_WIDTH - (COLS * (BUBBLE_SIZE + BUBBLE_GAP) - BUBBLE_GAP)) / 2;

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
}

interface HaloEffect {
  id: string;
  x: number;
  y: number;
}

function Bubble({ 
  data, 
  onPop,
  targetRow,
}: { 
  data: BubbleData; 
  onPop: (id: string, x: number, y: number) => void;
  targetRow: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  
  const isOddRow = data.row % 2 === 1;
  const baseX = OFFSET_X + data.col * (BUBBLE_SIZE + BUBBLE_GAP) + (isOddRow ? BUBBLE_SIZE / 2 : 0);
  const baseY = 80 + data.row * (BUBBLE_SIZE * 0.85);
  
  const rowDiff = targetRow - data.row;
  
  useEffect(() => {
    if (rowDiff > 0 && !data.popped) {
      translateY.value = withSpring(rowDiff * (BUBBLE_SIZE * 0.85), {
        damping: 20,
        stiffness: 120,
        mass: 0.8,
      });
    }
  }, [targetRow, data.popped]);
  
  useEffect(() => {
    if (data.popped) {
      scale.value = withTiming(0.3, { duration: 150, easing: Easing.out(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
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
      onPop(data.id, baseX + BUBBLE_SIZE / 2, baseY + BUBBLE_SIZE / 2 + translateY.value);
    }
  };
  
  if (data.popped && opacity.value === 0) {
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
        <LinearGradient
          colors={['#FFFFFF', '#F5F5F5', '#E8E8E8', '#D8D8D8']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
          style={styles.bubble}
        >
          <View style={styles.bubbleHighlight} />
          <View style={styles.bubbleHighlightSmall} />
        </LinearGradient>
        <View style={styles.bubbleShadow} />
      </Pressable>
    </Animated.View>
  );
}

function Halo({ x, y, onComplete }: { x: number; y: number; onComplete: () => void }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);
  
  useEffect(() => {
    scale.value = withTiming(2.5, { duration: 400, easing: Easing.out(Easing.ease) });
    opacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }, () => {
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
      const colsInRow = isOddRow ? COLS - 1 : COLS;
      for (let col = 0; col < colsInRow; col++) {
        initialBubbles.push({
          id: `${row}-${col}`,
          col,
          row,
          popped: false,
        });
      }
    }
    return initialBubbles;
  });
  
  const [halos, setHalos] = useState<HaloEffect[]>([]);
  const [popCount, setPopCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showHelper, setShowHelper] = useState(true);
  
  const messageOpacity = useSharedValue(0);
  const helperOpacity = useSharedValue(1);
  
  const columnHeights = useMemo(() => {
    const heights: { [key: string]: number } = {};
    for (let col = 0; col < COLS; col++) {
      heights[`even-${col}`] = 0;
      heights[`odd-${col}`] = 0;
    }
    
    bubbles.forEach(bubble => {
      if (bubble.popped) {
        const isOddRow = bubble.row % 2 === 1;
        const key = `${isOddRow ? 'odd' : 'even'}-${bubble.col}`;
        heights[key]++;
      }
    });
    
    return heights;
  }, [bubbles]);
  
  const getTargetRow = useCallback((bubble: BubbleData) => {
    if (bubble.popped) return bubble.row;
    
    const isOddRow = bubble.row % 2 === 1;
    const key = `${isOddRow ? 'odd' : 'even'}-${bubble.col}`;
    
    let poppedBelow = 0;
    bubbles.forEach(b => {
      if (b.col === bubble.col && 
          b.row > bubble.row && 
          b.row % 2 === bubble.row % 2 && 
          b.popped) {
        poppedBelow++;
      }
    });
    
    return bubble.row + poppedBelow;
  }, [bubbles]);
  
  const handlePop = useCallback((id: string, x: number, y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setBubbles(prev => prev.map(b => 
      b.id === id ? { ...b, popped: true } : b
    ));
    
    setHalos(prev => [...prev, { id: `halo-${Date.now()}`, x, y }]);
    
    setPopCount(prev => {
      const newCount = prev + 1;
      
      if (newCount >= 3 && showHelper) {
        helperOpacity.value = withTiming(0, { duration: 500 });
        setTimeout(() => setShowHelper(false), 500);
      }
      
      if (newCount % 3 === 0 || newCount === 1) {
        const randomMessage = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
        setCurrentMessage(randomMessage);
        messageOpacity.value = 0;
        messageOpacity.value = withTiming(0.4, { duration: 600 });
        
        setTimeout(() => {
          messageOpacity.value = withTiming(0, { duration: 800 });
        }, 2500);
      }
      
      return newCount;
    });
  }, [showHelper]);
  
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
      <LinearGradient
        colors={['#E8E5E0', '#DDD9D2', '#D3CFC8']}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
            targetRow={getTargetRow(bubble)}
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
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  bubbleHighlight: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: BUBBLE_SIZE * 0.35,
    height: BUBBLE_SIZE * 0.25,
    borderRadius: BUBBLE_SIZE * 0.15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transform: [{ rotate: '-25deg' }],
  },
  bubbleHighlightSmall: {
    position: 'absolute',
    top: 12,
    left: 18,
    width: BUBBLE_SIZE * 0.12,
    height: BUBBLE_SIZE * 0.08,
    borderRadius: BUBBLE_SIZE * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    transform: [{ rotate: '-25deg' }],
  },
  bubbleShadow: {
    position: 'absolute',
    bottom: -2,
    left: 4,
    right: 4,
    height: 6,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    transform: [{ scaleY: 0.5 }],
  },
  halo: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(138, 155, 140, 0.5)',
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
    zIndex: 1,
  },
  messageText: {
    fontSize: 28,
    color: '#4A4A4A',
    textAlign: 'center',
    paddingHorizontal: 40,
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
    color: 'rgba(90, 90, 90, 0.7)',
    textAlign: 'center',
  },
});
