import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { stopAmbient } from '../../lib/ambientAudio';

interface StepData {
  number: string;
  instruction: string;
  hint: string;
}

const STEPS: StepData[] = [
  {
    number: '5',
    instruction: 'Look around. Name five things you can see.',
    hint: 'Let your eyes rest on simple details.',
  },
  {
    number: '4',
    instruction: 'Notice four sensations on your body.',
    hint: 'Fabric, temperature, the chair beneath you…',
  },
  {
    number: '3',
    instruction: 'Listen for three sounds around you.',
    hint: 'Near or far, loud or subtle.',
  },
  {
    number: '2',
    instruction: 'Identify two scents nearby.',
    hint: 'Or simply notice the air as it is.',
  },
  {
    number: '1',
    instruction: 'Notice the taste in your mouth.',
    hint: 'Whatever is present, without judgment.',
  },
];

interface BubbleProps {
  size: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  delay: number;
  duration: number;
  floatDistance: number;
}

function FloatingBubble({ size, top, bottom, left, right, delay, duration, floatDistance }: BubbleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  
  useEffect(() => {
    const startDelay = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(-floatDistance, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      translateX.value = withRepeat(
        withTiming(floatDistance * 0.3, { duration: duration * 1.2, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, delay);
    
    return () => clearTimeout(startDelay);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));
  
  const positionStyle: any = { width: size, height: size };
  if (top) positionStyle.top = top;
  if (bottom) positionStyle.bottom = bottom;
  if (left) positionStyle.left = left;
  if (right) positionStyle.right = right;
  
  return (
    <Animated.View style={[styles.patternCircle, positionStyle, animatedStyle]} />
  );
}

function StepIndicator({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number; 
  totalSteps: number; 
}) {
  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            index === currentStep && styles.indicatorActive,
            index < currentStep && styles.indicatorComplete,
          ]}
        />
      ))}
    </View>
  );
}

function CompletionScreen({ 
  fontFamily,
  onClose,
}: { 
  fontFamily: string;
  onClose: () => void;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View style={[styles.completionContainer, animatedStyle]}>
      <Text style={[styles.completionTitle, { fontFamily }]}>You're here now.</Text>
      <Text style={[styles.completionSubtitle, { fontFamily }]}>
        Your mind has returned to the present moment.
      </Text>
      
      <Pressable
        style={({ pressed }) => [
          styles.doneButton,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={onClose}
      >
        <View style={styles.doneButtonInner}>
          <Text style={[styles.doneButtonText, { fontFamily }]}>End Session</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function GroundingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  useEffect(() => {
    stopAmbient();
  }, []);

  useEffect(() => {
    const loadAndPlayAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/grounding-ambient.mp3'),
          { 
            isLooping: true,
            volume: 0,
            rate: 0.90,
            shouldCorrectPitch: true,
          }
        );
        soundRef.current = sound;
        await sound.playAsync();
        
        let vol = 0;
        const fadeIn = setInterval(async () => {
          vol += 0.02;
          if (vol >= 0.25) {
            await sound.setVolumeAsync(0.25);
            clearInterval(fadeIn);
          } else {
            await sound.setVolumeAsync(vol);
          }
        }, 50);
      } catch (error) {
        console.log('Audio load error:', error);
      }
    };
    
    loadAndPlayAudio();
    
    return () => {
      if (soundRef.current) {
        const fadeOutAndUnload = async () => {
          if (!soundRef.current) return;
          try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
              let vol = status.volume || 0.25;
              const fadeOut = setInterval(async () => {
                vol -= 0.03;
                if (vol <= 0 || !soundRef.current) {
                  clearInterval(fadeOut);
                  if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                  }
                } else {
                  await soundRef.current?.setVolumeAsync(vol);
                }
              }, 40);
            }
          } catch (e) {}
        };
        fadeOutAndUnload();
      }
    };
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepData = STEPS[currentStep];

  const transitionToStep = (nextStep: number, callback: () => void) => {
    contentOpacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
    contentTranslateY.value = withTiming(-20, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(callback)();
      contentTranslateY.value = 20;
      contentOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      contentTranslateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
    });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < STEPS.length - 1) {
      transitionToStep(currentStep + 1, () => setCurrentStep(currentStep + 1));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      transitionToStep(currentStep - 1, () => setCurrentStep(currentStep - 1));
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleTracePress = () => {
    router.replace('/(tabs)/chat');
  };

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EDE8E0', '#E5DFD5', '#DDD6CB', '#D5CEC2', '#CDC5B9']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      
      <View style={styles.circlePattern} pointerEvents="none">
        {/* Large floating bubbles - edges only */}
        <FloatingBubble size={320} top="-5%" left="-10%" delay={0} duration={4000} floatDistance={15} />
        <FloatingBubble size={280} top="2%" right="-8%" delay={500} duration={4500} floatDistance={12} />
        <FloatingBubble size={260} top="8%" left="-5%" delay={200} duration={5000} floatDistance={18} />
        <FloatingBubble size={300} top="15%" right="-12%" delay={800} duration={4200} floatDistance={14} />
        <FloatingBubble size={340} top="25%" left="-18%" delay={300} duration={4800} floatDistance={16} />
        <FloatingBubble size={220} top="32%" right="-8%" delay={1000} duration={4400} floatDistance={13} />
        <FloatingBubble size={280} top="48%" left="-15%" delay={600} duration={5200} floatDistance={17} />
        <FloatingBubble size={240} top="55%" right="-10%" delay={400} duration={4600} floatDistance={15} />
        <FloatingBubble size={300} top="68%" left="-12%" delay={900} duration={4300} floatDistance={14} />
        <FloatingBubble size={200} top="75%" right="-5%" delay={700} duration={4700} floatDistance={12} />
        
        {/* Medium floating bubbles - upper and side areas */}
        <FloatingBubble size={180} top="5%" left="60%" delay={150} duration={3800} floatDistance={10} />
        <FloatingBubble size={160} top="12%" right="55%" delay={450} duration={4100} floatDistance={11} />
        <FloatingBubble size={140} top="20%" left="75%" delay={650} duration={3900} floatDistance={9} />
        <FloatingBubble size={170} top="28%" right="70%" delay={350} duration={4300} floatDistance={12} />
        
        {/* Small floating bubbles - scattered upper areas */}
        <FloatingBubble size={100} top="3%" left="40%" delay={100} duration={3500} floatDistance={8} />
        <FloatingBubble size={90} top="10%" right="35%" delay={250} duration={3700} floatDistance={7} />
        <FloatingBubble size={80} top="18%" left="85%" delay={550} duration={3600} floatDistance={6} />
        <FloatingBubble size={110} top="25%" right="80%" delay={750} duration={3800} floatDistance={9} />
        <FloatingBubble size={70} top="35%" left="80%" delay={850} duration={3400} floatDistance={5} />
        <FloatingBubble size={95} top="42%" right="85%" delay={950} duration={3900} floatDistance={8} />
      </View>

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={handleClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ArrowLeft size={18} color="#8DA18F" strokeWidth={2} />
      </Pressable>

      <View style={[styles.timerContainer, { top: insets.top + 12 }]}>
        <Text style={[styles.timerText, { fontFamily: canelaFont }]}>{formatTime(timeElapsed)}</Text>
      </View>

      {isComplete ? (
        <CompletionScreen fontFamily={canelaFont} onClose={handleClose} />
      ) : (
        <>
          <Animated.View style={[styles.stepContent, contentAnimatedStyle]}>
            <Text style={[styles.largeNumber, { fontFamily: canelaFont }]}>
              {currentStepData.number}
            </Text>

            <Text style={[styles.instruction, { fontFamily: canelaFont }]}>
              {currentStepData.instruction}
            </Text>

            <Text style={[styles.hint, { fontFamily: canelaFont }]}>
              {currentStepData.hint}
            </Text>
          </Animated.View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} />

            <View style={styles.buttonRow}>
              {currentStep > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.prevButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={handlePrevious}
                >
                  <Text style={[styles.prevButtonText, { fontFamily: canelaFont }]}>Previous</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  currentStep === 0 && styles.nextButtonFull,
                  { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                onPress={handleNext}
              >
                <View style={styles.nextButtonInner}>
                  <Text style={[styles.nextButtonText, { fontFamily: canelaFont }]}>
                    {currentStep === STEPS.length - 1 ? 'Complete' : 'Next'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    width: 400,
    height: 400,
    left: '50%',
    top: '40%',
    marginLeft: -200,
    marginTop: -200,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.5,
  },
  circlePattern: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 170, 158, 0.15)',
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
    paddingLeft: TraceWordmark.paddingLeft,
    textAlign: 'center',
    ...Shadows.traceWordmark,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 100,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(220, 226, 216, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.4)',
    shadowColor: 'rgba(141, 161, 143, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  timerContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(220, 226, 216, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.4)',
    shadowColor: 'rgba(141, 161, 143, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#8DA18F',
    letterSpacing: 0.5,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -20,
  },
  largeNumber: {
    fontSize: 140,
    fontWeight: '300',
    color: '#DDD6CB',
    letterSpacing: 1,
    lineHeight: 150,
    marginTop: 60,
    marginBottom: -12,
    textShadowColor: 'rgba(50, 40, 35, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 1.5,
  },
  instruction: {
    fontSize: 21,
    fontWeight: '300',
    color: '#8DA18F',
    textAlign: 'center',
    letterSpacing: 0.6,
    lineHeight: 32,
    marginBottom: 12,
    maxWidth: 320,
  },
  hint: {
    fontSize: 14,
    fontWeight: '300',
    color: '#A49485',
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 22,
    opacity: 0.85,
    maxWidth: 300,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(164, 148, 133, 0.25)',
  },
  indicatorActive: {
    backgroundColor: '#8DA18F',
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowColor: 'rgba(141, 161, 143, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  indicatorComplete: {
    backgroundColor: '#A49485',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  prevButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(220, 226, 216, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  prevButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#8B7E74',
    letterSpacing: 0.6,
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(141, 161, 143, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  nextButtonFull: {
    minWidth: 120,
  },
  nextButtonInner: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(220, 226, 216, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.4)',
    borderRadius: 24,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#8DA18F',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '300',
    color: '#8DA18F',
    letterSpacing: 1.2,
    marginBottom: 16,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  completionSubtitle: {
    fontSize: 15,
    fontWeight: '300',
    color: '#A49485',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 24,
    marginBottom: 48,
  },
  doneButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  doneButtonInner: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.3)',
    borderRadius: 24,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#A49485',
    letterSpacing: 0.8,
  },
});
