import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, LayoutAnimation, UIManager } from 'react-native';
import { ChevronDown, ChevronUp, Activity, BookOpen } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { FontFamily } from '../constants/typography';
import { Shadows } from '../constants/shadows';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EntryAccordionProps {
  title: string;
  count: number;
  type: 'daily' | 'notes';
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

export function EntryAccordion({ 
  title, 
  count, 
  type, 
  isExpanded, 
  onToggle, 
  children 
}: EntryAccordionProps) {
  const [fontsLoaded] = useFonts({
    'Canela': require('../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const Icon = type === 'daily' ? Activity : BookOpen;
  const countText = count === 1 ? '1 entry' : `${count} entries`;

  return (
    <View style={[styles.container, Shadows.card]}>
      <Pressable 
        style={({ pressed }) => [
          styles.header,
          { opacity: pressed ? 0.8 : 1 }
        ]}
        onPress={handleToggle}
      >
        <View style={styles.iconContainer}>
          <Icon size={20} color="#8A8680" strokeWidth={1.5} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>{title}</Text>
          <Text style={[styles.count, { fontFamily: canelaFont }]}>{countText}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#A49485" strokeWidth={1.5} />
        ) : (
          <ChevronDown size={20} color="#A49485" strokeWidth={1.5} />
        )}
      </Pressable>
      
      {isExpanded && children && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FDFCFA',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(180, 170, 158, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4B4B4B',
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
    fontWeight: '300',
    color: '#8A8680',
  },
  content: {
    paddingBottom: 8,
  },
});

export default EntryAccordion;
