import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';

interface GroundingStepProps {
  stepNumber: number;
  prompt: string;
  items: string[];
  onAddItem: (item: string) => void;
  onRemoveItem: (index: number) => void;
  fontFamily: string;
}

function Chip({ 
  text, 
  onRemove, 
  fontFamily 
}: { 
  text: string; 
  onRemove: () => void; 
  fontFamily: string;
}) {
  const scale = useSharedValue(0);
  
  React.useEffect(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove();
  };
  
  return (
    <Animated.View style={[styles.chip, animatedStyle]}>
      <Text style={[styles.chipText, { fontFamily }]} numberOfLines={1}>{text}</Text>
      <Pressable onPress={handleRemove} hitSlop={8} style={styles.chipRemove}>
        <X size={14} color="#8A8680" strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

export default function GroundingStep({
  stepNumber,
  prompt,
  items,
  onAddItem,
  onRemoveItem,
  fontFamily,
}: GroundingStepProps) {
  const [inputValue, setInputValue] = useState('');
  
  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && items.length < stepNumber) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAddItem(trimmed);
      setInputValue('');
    }
  };
  
  const isComplete = items.length >= stepNumber;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.number, { fontFamily }]}>{stepNumber}</Text>
      
      <Text style={[styles.prompt, { fontFamily }]}>{prompt}</Text>
      
      <Text style={[styles.counter, { fontFamily }]}>
        {items.length} of {stepNumber}
      </Text>
      
      <View style={styles.chipsContainer}>
        {items.map((item, index) => (
          <Chip
            key={`${item}-${index}`}
            text={item}
            onRemove={() => onRemoveItem(index)}
            fontFamily={fontFamily}
          />
        ))}
      </View>
      
      {!isComplete && (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { fontFamily }]}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleSubmit}
            placeholder="Type and press enter..."
            placeholderTextColor="#A9A5A0"
            returnKeyType="done"
            autoCapitalize="sentences"
            autoCorrect={true}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  number: {
    fontSize: 120,
    fontWeight: '200',
    color: '#4B4B4B',
    opacity: 0.15,
    position: 'absolute',
    top: '15%',
  },
  prompt: {
    fontSize: 24,
    fontWeight: '400',
    color: '#4B4B4B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  counter: {
    fontSize: 14,
    color: '#8A8680',
    opacity: 0.75,
    marginBottom: 32,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
    maxWidth: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.2)',
    maxWidth: 200,
  },
  chipText: {
    fontSize: 15,
    color: '#4B4B4B',
    marginRight: 6,
    flexShrink: 1,
  },
  chipRemove: {
    padding: 4,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#4B4B4B',
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.15)',
    textAlign: 'center',
  },
});
