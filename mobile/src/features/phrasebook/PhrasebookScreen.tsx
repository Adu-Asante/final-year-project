// src/features/phrasebook/PhrasebookScreen.tsx
// Emoji category grid → phrase list → tap → database increment → avatar speaks it
// Integrated with SQLitePhraseRepository and added Twi numbers.

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { PHRASE_CATEGORIES, type PhraseCategory, type CategoryMeta, type Phrase } from '../../core/entities/Phrase';
import { AvatarWidget }  from '../../shared/components/AvatarWidget';
import { TTSService }    from '../../infrastructure/tts/TTSService';
import { SQLitePhraseRepository } from '../../data/repositories/SQLitePhraseRepository';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';

import { STARTER_PHRASES } from '../../data/datasets/starterPhrases';

const tts = new TTSService();
const phraseRepo = new SQLitePhraseRepository();

export const PhrasebookScreen: React.FC = () => {
  const [phrases,          setPhrases]          = useState<Phrase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [speakingId,       setSpeakingId]       = useState<string | null>(null);
  const [isSpeaking,       setIsSpeaking]       = useState(false);

  // Load / Seed Phrases
  const loadPhrases = useCallback(async () => {
    try {
      // Seed first if empty
      await phraseRepo.seed(STARTER_PHRASES);

      let data: Phrase[];
      if (searchQuery.trim()) {
        data = await phraseRepo.search(searchQuery);
        // Filter search results by category if one is selected
        if (selectedCategory) {
          data = data.filter(p => p.category === selectedCategory);
        }
      } else if (selectedCategory) {
        data = await phraseRepo.findByCategory(selectedCategory);
      } else {
        data = await phraseRepo.findAll();
      }

      // Sort by usageCount desc, then category/alphabetical
      data.sort((a, b) => b.usageCount - a.usageCount);
      setPhrases(data);
    } catch (err) {
      console.error('Failed to load phrases:', err);
    }
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    loadPhrases();
  }, [loadPhrases]);

  const handlePhrasePress = useCallback(async (phrase: Phrase) => {
    setSpeakingId(phrase.id);
    setIsSpeaking(true);
    try {
      // Record usage
      await phraseRepo.incrementUsage(phrase.id);

      // Refresh phrase list in background to show updated usage order/count
      loadPhrases();

      await tts.speak(phrase.twiText, 'twi', {
        onDone:    () => { setIsSpeaking(false); setSpeakingId(null); },
        onStopped: () => { setIsSpeaking(false); setSpeakingId(null); },
        onError:   () => { setIsSpeaking(false); setSpeakingId(null); },
      });
    } catch {
      setIsSpeaking(false);
      setSpeakingId(null);
    }
  }, [loadPhrases]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Phrasebook</Text>
        <Text style={styles.subtitle}>Tap a phrase — avatar speaks it</Text>
      </View>

      {/* ── Mini avatar ── */}
      <View style={styles.miniAvatar}>
        <AvatarWidget isSpeaking={isSpeaking} isListening={false} isThinking={false} size={72} />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search phrases..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* ── Category grid ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={({ pressed }) => [
            styles.catChip,
            selectedCategory === null ? styles.catChipSelected : styles.catChipUnselected,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="grid-outline" size={16} color={selectedCategory === null ? '#FFFFFF' : '#B45309'} />
          <Text style={[styles.catLabel, { color: selectedCategory === null ? '#FFFFFF' : '#92400E' }]}>All Phrases</Text>
        </Pressable>
        {PHRASE_CATEGORIES.map(cat => (
          <CategoryChip
            key={cat.id}
            cat={cat}
            isSelected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
          />
        ))}
      </ScrollView>

      {/* ── Phrase list ── */}
      <FlatList
        data={phrases}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.phraseList}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PhraseRow
            phrase={item}
            isPlaying={speakingId === item.id}
            onPress={() => handlePhrasePress(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No phrases found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// ── Category Chip ──────────────────────────────────────────────────────────────
const CategoryChip: React.FC<{
  cat: CategoryMeta;
  isSelected: boolean;
  onPress: () => void;
}> = ({ cat, isSelected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.catChip,
      isSelected ? styles.catChipSelected : styles.catChipUnselected,
      pressed && { opacity: 0.85 },
    ]}
  >
    <Ionicons
      name={(cat.iconName || 'bookmark-outline') as any}
      size={16}
      color={isSelected ? '#FFFFFF' : '#B45309'}
    />
    <Text style={[styles.catLabel, { color: isSelected ? '#FFFFFF' : '#92400E' }]}>{cat.label}</Text>
  </Pressable>
);

// ── Phrase Row ────────────────────────────────────────────────────────────────
const PhraseRow: React.FC<{
  phrase: Phrase;
  isPlaying: boolean;
  onPress: () => void;
}> = ({ phrase, isPlaying, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.phraseRow,
        { backgroundColor: isPlaying ? Colors.primary + '22' : Colors.surface, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.phraseTexts}>
        <Text style={styles.phraseTwi}>{phrase.twiText}</Text>
        <Text style={styles.phraseEn}>{phrase.englishText}</Text>
        {phrase.usageCount > 0 && (
          <Text style={styles.usageText}>Used {phrase.usageCount} times</Text>
        )}
      </View>
      <Text style={styles.playSpeaker}>{isPlaying ? '♪' : '▶'}</Text>
    </Pressable>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: Colors.background },
  header:      { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  title:       { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 1 },
  subtitle:    { fontSize: Typography.fontSize.xs, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  miniAvatar:  { alignItems: 'center', paddingVertical: Spacing.sm },
  searchRow:   { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.full,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    color:           Colors.textPrimary,
    fontSize:        Typography.fontSize.base,
  },
  catScroll:   { height: 52, flexGrow: 0, marginVertical: 4 },
  catContent:  { alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm },
  catChip:     { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5 },
  catChipSelected: { backgroundColor: '#D97706', borderColor: '#B45309' },
  catChipUnselected: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  catLabel:    { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.1, textAlign: 'center' },
  phraseList:  { padding: Spacing.md, gap: Spacing.sm },
  phraseRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  phraseEmoji: { fontSize: 22 },
  phraseTexts: { flex: 1, gap: 2 },
  phraseTwi:   { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '600' },
  phraseEn:    { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  usageText:   { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  playSpeaker: { color: Colors.primary, fontSize: Typography.fontSize.lg },
  emptyState:  { alignItems: 'center', paddingTop: Spacing.xl },
  emptyText:   { color: Colors.textMuted, fontStyle: 'italic' },
});
