import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useFonts } from 'expo-font';
import { FontFamily } from '../constants/typography';

interface EntryPreviewCardProps {
  title: string;
  preview: string;
  timestamp: string;
  onPress?: () => void;
}

export function EntryPreviewCard({ title, preview, timestamp, onPress }: EntryPreviewCardProps) {
  const [fontsLoaded] = useFonts({
    'Canela': require('../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.7 : 1 }
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { fontFamily: canelaFont }]}>{title}</Text>
        <Text style={[styles.preview, { fontFamily: canelaFont }]}>{preview}</Text>
        <Text style={[styles.timestamp, { fontFamily: canelaFont }]}>{timestamp}</Text>
      </View>
      <ChevronRight size={18} color="#A49485" strokeWidth={1.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 170, 158, 0.15)',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '400',
    color: '#4B4B4B',
    marginBottom: 2,
  },
  preview: {
    fontSize: 13,
    fontWeight: '300',
    color: '#8A8680',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '300',
    color: '#A49485',
    opacity: 0.8,
  },
});

export default EntryPreviewCard;
