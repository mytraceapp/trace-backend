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
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { stopAmbient } from '../../lib/ambientAudio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_SIZE = 44;
const COLS = Math.ceil(SCREEN_WIDTH / BUBBLE_SIZE) + 2;
const ROWS = Math.ceil(SCREEN_HEIGHT / BUBBLE_SIZE) + 2;

const BACKGROUND_COLOR = '#D4C9B8';
const BUBBLE_FILL = 'rgba(232, 228, 222, 0.55)';
const BUBBLE_BORDER = 'rgba(180, 168, 150, 0.45)';

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
  x: number;
  y: number;
}

const HIGHLIGHT_VARIATIONS = [
  { topOffset: 0.14, leftOffset: 0.18, size: 0.28 },
  { topOffset: 0.16, leftOffset: 0.15, size: 0.26 },
  { topOffset: 0.12, leftOffset: 0.20, size: 0.30 },
  { topOffset: 0.15, leftOffset: 0.16, size: 0.27 },
];

function Bubble({ 
  data, 
  onPop,
  variationIndex,
}: { 
  data: BubbleData; 
  onPop: (id: string) => void;
  variationIndex: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [isHidden, setIsHidden] = useState(false);
  
  const variation = HIGHLIGHT_VARIATIONS[variationIndex % HIGHLIGHT_VARIATIONS.length];
  
  useEffect(() => {
    if (data.popped) {
      scale.value = withTiming(0.15, { 
        duration: 220, 
        easing: Easing.out(Easing.cubic) 
      });
      opacity.value = withTiming(0, { 
        duration: 280, 
        easing: Easing.out(Easing.quad) 
      }, () => {
        runOnJS(setIsHidden)(true);
      });
    }
  }, [data.popped]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  
  const handlePress = () => {
    if (!data.popped) {
      onPop(data.id);
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
          left: data.x,
          top: data.y,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={handlePress} style={styles.bubblePressable}>
        <View style={styles.bubble}>
          <View style={styles.bubbleShading} />
          <View style={[
            styles.bubbleHighlight,
            {
              top: BUBBLE_SIZE * variation.topOffset,
              left: BUBBLE_SIZE * variation.leftOffset,
              width: BUBBLE_SIZE * variation.size,
              height: BUBBLE_SIZE * variation.size * 0.5,
            }
          ]} />
        </View>
      </Pressable>
    </Animated.View>
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
    const startX = -BUBBLE_SIZE / 2;
    const startY = -BUBBLE_SIZE / 2;
    
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = startX + col * BUBBLE_SIZE;
        const y = startY + row * BUBBLE_SIZE;
        initialBubbles.push({
          id: `${row}-${col}`,
          col,
          row,
          popped: false,
          x,
          y,
        });
      }
    }
    return initialBubbles;
  });
  
  const [popCount, setPopCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showHelper, setShowHelper] = useState(true);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIndexRef = useRef(-1);
  
  const messageOpacity = useSharedValue(0);
  const helperOpacity = useSharedValue(1);

  useEffect(() => {
    stopAmbient();
  }, []);
  
  const handlePop = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setBubbles(prev => prev.map(b => 
      b.id === id ? { ...b, popped: true } : b
    ));
    
    setPopCount(prev => {
      const newCount = prev + 1;
      
      if (newCount >= 3 && showHelper) {
        helperOpacity.value = withTiming(0, { duration: 500 });
        setTimeout(() => setShowHelper(false), 500);
      }
      
      if (newCount % 5 === 0 || newCount === 1) {
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
  }, [showHelper]);
  
  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));
  
  const helperStyle = useAnimatedStyle(() => ({
    opacity: helperOpacity.value,
  }));
  
  const sessionStartRef = useRef<number>(Date.now());

  const handleTracePress = () => {
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    router.replace({
      pathname: '/(tabs)/chat',
      params: {
        completedActivity: 'Drift',
        activityDuration: durationSeconds.toString(),
      },
    });
  };

  const handleEndSession = () => {
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    router.replace({
      pathname: '/(tabs)/chat',
      params: {
        completedActivity: 'Drift',
        activityDuration: durationSeconds.toString(),
      },
    });
  };

  const TAB_BAR_HEIGHT = 60;
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  const gridLines = [];
  for (let i = 0; i <= COLS; i++) {
    gridLines.push(
      <View 
        key={`v-${i}`} 
        style={[
          styles.gridLineVertical, 
          { left: i * BUBBLE_SIZE - BUBBLE_SIZE / 2 }
        ]} 
      />
    );
  }
  for (let i = 0; i <= ROWS; i++) {
    gridLines.push(
      <View 
        key={`h-${i}`} 
        style={[
          styles.gridLineHorizontal, 
          { top: i * BUBBLE_SIZE - BUBBLE_SIZE / 2 }
        ]} 
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      
      <View style={styles.gridContainer}>
        {gridLines}
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
        {bubbles.map((bubble, index) => (
          <Bubble
            key={bubble.id}
            data={bubble}
            onPop={handlePop}
            variationIndex={index}
          />
        ))}
      </View>

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

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
    backgroundColor: BACKGROUND_COLOR,
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(200, 188, 170, 0.5)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(200, 188, 170, 0.5)',
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
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
    ...Shadows.traceWordmark,
  },
  bubblesContainer: {
    flex: 1,
    position: 'relative',
  },
  bubbleContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  bubblePressable: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    padding: 1,
  },
  bubble: {
    flex: 1,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: BUBBLE_FILL,
    borderWidth: 0.75,
    borderColor: BUBBLE_BORDER,
    overflow: 'hidden',
  },
  bubbleShading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: 'transparent',
    borderBottomColor: 'rgba(160, 150, 135, 0.12)',
    borderRightColor: 'rgba(160, 150, 135, 0.08)',
  },
  bubbleHighlight: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(250, 248, 244, 0.35)',
  },
  messageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  messageText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#4A3F35',
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: 'rgba(250, 248, 244, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  helperContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  helperText: {
    fontSize: 16,
    color: '#5A4A3A',
    textAlign: 'center',
    textShadowColor: 'rgba(250, 248, 244, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  endButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  endButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(180, 170, 155, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 155, 0.3)',
  },
  endButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A3F35',
    letterSpacing: 1.5,
  },
});
