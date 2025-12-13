import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { addEntry } from '../../lib/entries';

export default function NewJournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleTracePress = () => {
    router.replace('/(tabs)/chat');
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);

    try {
      await addEntry({
        type: 'journal',
        group: 'notes',
        title: title.trim() || 'Untitled',
        preview: content.trim().substring(0, 100),
      });
      router.back();
    } catch (error) {
      console.error('Failed to save entry:', error);
      setIsSaving(false);
    }
  };

  const canSave = title.trim().length > 0 || content.trim().length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF8F5', '#F5F2ED', '#EDE9E3', '#E8E4DD', '#E3DFD8']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={18} color="#8DA18F" strokeWidth={2} />
          </Pressable>

          <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!canSave || isSaving}
          >
            <Text style={[
              styles.saveButtonText, 
              { fontFamily: canelaFont },
              !canSave && styles.saveButtonTextDisabled
            ]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.screenTitle, { fontFamily: canelaFont }]}>New Entry</Text>
          
          <TextInput
            style={[styles.titleInput, { fontFamily: canelaFont }]}
            placeholder="Title"
            placeholderTextColor="#A49485"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <TextInput
            style={[styles.contentInput, { fontFamily: canelaFont }]}
            placeholder="What's on your mind?"
            placeholderTextColor="#A49485"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(220, 226, 216, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.4)',
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
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 226, 216, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(141, 161, 143, 0.4)',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8DA18F',
  },
  saveButtonTextDisabled: {
    color: '#A49485',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#4B4B4B',
    letterSpacing: -0.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '400',
    color: '#4B4B4B',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180, 170, 158, 0.2)',
    marginBottom: 16,
  },
  contentInput: {
    fontSize: 16,
    fontWeight: '300',
    color: '#4B4B4B',
    lineHeight: 26,
    minHeight: 200,
    paddingTop: 8,
  },
});
