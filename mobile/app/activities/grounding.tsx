import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { RotateCcw } from 'lucide-react-native';
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
import GroundingStep from '../../components/GroundingStep';
import {
  GroundingProgress,
  saveGroundingProgress,
  loadGroundingProgress,
  clearGroundingProgress,
  getDefaultGroundingProgress,
} from '../../lib/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SenseKey = 'see' | 'feel' | 'hear' | 'smell' | 'taste';

const STEPS: { key: SenseKey; count: number; prompt: string }[] = [
  { key: 'see', count: 5, prompt: 'Name 5 things you can see.' },
  { key: 'feel', count: 4, prompt: 'Name 4 things you can feel.' },
  { key: 'hear', count: 3, prompt: 'Name 3 things you can hear.' },
  { key: 'smell', count: 2, prompt: 'Name 2 things you can smell.' },
  { key: 'taste', count: 1, prompt: 'Name 1 thing you can taste.' },
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
      <Text style={[styles.completionEmoji]}>&#10003;</Text>
      <Text style={[styles.completionTitle, { fontFamily }]}>Grounded</Text>
      <Text style={[styles.completionSubtitle, { fontFamily }]}>
        You've reconnected with your senses.
      </Text>
      
      <Pressable
        style={({ pressed }) => [
          styles.doneButton,
          { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        onPress={onClose}
      >
        <LinearGradient
          colors={['#C9C3BA', '#B8B2A8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.doneButtonGradient}
        >
          <Text style={[styles.doneButtonText, { fontFamily }]}>Done</Text>
        </LinearGradient>
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
  
  const [progress, setProgress] = useState<GroundingProgress>(getDefaultGroundingProgress());
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);

  useEffect(() => {
    loadGroundingProgress().then((saved) => {
      setProgress(saved);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveGroundingProgress(progress);
    }
  }, [progress, isLoading]);

  const currentStep = progress.currentStep;
  const currentStepData = STEPS[currentStep];
  const currentItems = currentStepData ? progress.responses[currentStepData.key] : [];
  const canAdvance = currentStepData && currentItems.length >= currentStepData.count;

  const handleAddItem = useCallback((item: string) => {
    if (!currentStepData) return;
    
    setProgress((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [currentStepData.key]: [...prev.responses[currentStepData.key], item],
      },
    }));
  }, [currentStepData]);

  const handleRemoveItem = useCallback((index: number) => {
    if (!currentStepData) return;
    
    setProgress((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [currentStepData.key]: prev.responses[currentStepData.key].filter((_, i) => i !== index),
      },
    }));
  }, [currentStepData]);

  const transitionToStep = (nextStep: number) => {
    contentOpacity.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
    contentTranslateX.value = withTiming(-30, { duration: 150, easing: Easing.out(Easing.ease) }, () => {
      runOnJS(setProgress)((prev: GroundingProgress) => ({ ...prev, currentStep: nextStep }));
      contentTranslateX.value = 30;
      contentOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      contentTranslateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });
    });
  };

  const handleNext = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (currentStep < STEPS.length - 1) {
      transitionToStep(currentStep + 1);
    } else {
      clearGroundingProgress();
      setIsComplete(true);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (currentStep < STEPS.length - 1) {
      transitionToStep(currentStep + 1);
    } else {
      clearGroundingProgress();
      setIsComplete(true);
    }
  };

  const handleReset = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await clearGroundingProgress();
    setProgress(getDefaultGroundingProgress());
    setIsComplete(false);
  };

  const handleClose = async () => {
    await clearGroundingProgress();
    router.back();
  };

  const handleTracePress = () => {
    router.replace('/(tabs)/chat');
  };

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#F5F1EB', '#EBE7E0', '#E2DED7']}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F5F1EB', '#EBE7E0', '#E2DED7']}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      {!isComplete && (
        <Pressable
          style={[styles.resetButton, { top: insets.top + 12 }]}
          onPress={handleReset}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <RotateCcw size={20} color="#8A8680" strokeWidth={1.5} />
        </Pressable>
      )}

      {isComplete ? (
        <CompletionScreen fontFamily={canelaFont} onClose={handleClose} />
      ) : (
        <>
          <View style={[styles.titleContainer, { marginTop: insets.top + 50 }]}>
            <Text style={[styles.title, { fontFamily: canelaFont }]}>Grounding</Text>
            <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>5–4–3–2–1 sensory reset</Text>
          </View>

          <Animated.View style={[styles.stepContent, contentAnimatedStyle]}>
            {currentStepData && (
              <GroundingStep
                stepNumber={currentStepData.count}
                prompt={currentStepData.prompt}
                items={currentItems}
                onAddItem={handleAddItem}
                onRemoveItem={handleRemoveItem}
                fontFamily={canelaFont}
              />
            )}
          </Animated.View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <StepIndicator currentStep={currentStep} totalSteps={STEPS.length} />

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.skipButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleSkip}
              >
                <Text style={[styles.skipButtonText, { fontFamily: canelaFont }]}>Skip</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.nextButton,
                  !canAdvance && styles.nextButtonDisabled,
                  { opacity: pressed && canAdvance ? 0.9 : 1, transform: [{ scale: pressed && canAdvance ? 0.98 : 1 }] },
                ]}
                onPress={handleNext}
                disabled={!canAdvance}
              >
                <LinearGradient
                  colors={canAdvance ? ['#6B7C6B', '#5A6B5A'] : ['#CFCAC2', '#C3BDB4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextButtonGradient}
                >
                  <Text style={[
                    styles.nextButtonText,
                    { fontFamily: canelaFont },
                    !canAdvance && styles.nextButtonTextDisabled,
                  ]}>
                    {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                  </Text>
                </LinearGradient>
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
  resetButton: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    padding: 8,
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '400',
    color: '#4B4B4B',
    letterSpacing: -0.56,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    color: '#8A8680',
    letterSpacing: 0.15,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    gap: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(138, 134, 128, 0.25)',
  },
  indicatorActive: {
    backgroundColor: '#6B7C6B',
    width: 24,
  },
  indicatorComplete: {
    backgroundColor: 'rgba(107, 124, 107, 0.5)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#8A8680',
    letterSpacing: 0.2,
  },
  nextButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.button,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  nextButtonTextDisabled: {
    color: '#8A8680',
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  completionEmoji: {
    fontSize: 64,
    marginBottom: 24,
    color: '#6B7C6B',
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: '#4B4B4B',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  completionSubtitle: {
    fontSize: 17,
    fontWeight: '300',
    color: '#8A8680',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 48,
  },
  doneButton: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 160,
    ...Shadows.button,
  },
  doneButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.2,
  },
});
