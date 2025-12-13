import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';

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
  
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

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
        colors={['#FFFFFF', '#F8F6F3', '#F0EDE8', '#E8E4DF', '#E0DCD7']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.ambientGlow} />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      <View style={[styles.timerContainer, { top: insets.top + 12 }]}>
        <Text style={[styles.timerText, { fontFamily: canelaFont }]}>{formatTime(timeElapsed)}</Text>
      </View>

      {isComplete ? (
        <CompletionScreen fontFamily={canelaFont} onClose={handleClose} />
      ) : (
        <>
          <Animated.View style={[styles.stepContent, contentAnimatedStyle]}>
            <View style={styles.numberGlow} />
            
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
  timerContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(220, 226, 216, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
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
    marginTop: -60,
  },
  numberGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    opacity: 0.3,
  },
  largeNumber: {
    fontSize: 140,
    fontWeight: '200',
    color: 'rgba(164, 148, 133, 0.15)',
    letterSpacing: 2,
    lineHeight: 160,
    marginBottom: 24,
    textShadowColor: 'rgba(164, 148, 133, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 20,
  },
  instruction: {
    fontSize: 20,
    fontWeight: '300',
    color: '#8DA18F',
    textAlign: 'center',
    letterSpacing: 0.8,
    lineHeight: 32,
    marginBottom: 16,
    maxWidth: 300,
  },
  hint: {
    fontSize: 14,
    fontWeight: '300',
    color: '#8B7E74',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    opacity: 0.8,
    maxWidth: 280,
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
