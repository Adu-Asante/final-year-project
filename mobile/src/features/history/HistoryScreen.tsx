// src/features/history/HistoryScreen.tsx
// Translation history with favourites tab, search, swipe-to-favourite, and delete feature.

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Share,
} from 'react-native';
import { StatusBar }       from 'expo-status-bar';
import { TTSService }      from '../../infrastructure/tts/TTSService';
import { SQLiteTranslationRepository } from '../../data/repositories/SQLiteTranslationRepository';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import type { Translation } from '../../core/entities/Translation';

const tts  = new TTSService();
const repo = new SQLiteTranslationRepository();

type Tab = 'all' | 'favourites';

export const HistoryScreen: React.FC = () => {
  const [tab,          setTab]          = useState<Tab>('all');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [search,       setSearch]       = useState('');
  const [speakingId,   setSpeakingId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = tab === 'all'
      ? await repo.findAll(100)
      : await repo.findFavourites();
    setTranslations(data);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleFavourite = useCallback(async (id: string) => {
    await repo.toggleFavourite(id);
    await load();
  }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert(
      'Delete Translation',
      'Are you sure you want to delete this translation from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await repo.delete(id);
            await load();
          },
        },
      ]
    );
  }, [load]);

  const handleSpeak = useCallback(async (t: Translation) => {
    setSpeakingId(t.id);
    await tts.speak(t.translatedText, t.targetLang, {
      onDone:    () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
    });
  }, []);

  const filtered = translations.filter(t =>
    !search ||
    t.sourceText.toLowerCase().includes(search.toLowerCase()) ||
    t.translatedText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        <TabButton label="All"        active={tab === 'all'}        onPress={() => setTab('all')} />
        <TabButton label="⭐ Favourites" active={tab === 'favourites'} onPress={() => setTab('favourites')} />
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search translations..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <HistoryCard
            translation={item}
            isPlaying={speakingId === item.id}
            onSpeak={() => handleSpeak(item)}
            onFavourite={() => handleFavourite(item.id)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>
              {tab === 'favourites' ? 'No favourites yet' : 'No translations yet'}
            </Text>
            <Text style={styles.emptyHint}>
              {tab === 'all' ? 'Start interpreting to see history here' : 'Star a translation to add it'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// ── Tab Button ────────────────────────────────────────────────────────────────
const TabButton: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({
  label, active, onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.tab, active && styles.tabActive]}
  >
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
  </Pressable>
);

// ── History Card ──────────────────────────────────────────────────────────────
interface HistoryCardProps {
  translation: Translation;
  isPlaying:   boolean;
  onSpeak:     () => void;
  onFavourite: () => void;
  onDelete:    () => void;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  translation, isPlaying, onSpeak, onFavourite, onDelete,
}) => {
  const srcColor = translation.sourceLang === 'twi' ? Colors.twiBadge : Colors.englishBadge;
  const tgtColor = translation.targetLang === 'twi' ? Colors.twiBadge : Colors.englishBadge;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${translation.sourceText}" → "${translation.translatedText}" (Translated with Voxa AI)`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.card}>
      {/* Direction badges */}
      <View style={styles.cardHeader}>
        <Text style={[styles.badge, { color: srcColor }]}>
          {translation.sourceLang === 'twi' ? 'Twi' : 'EN'}
        </Text>
        <Text style={styles.dirArrow}>→</Text>
        <Text style={[styles.badge, { color: tgtColor }]}>
          {translation.targetLang === 'twi' ? 'Twi' : 'EN'}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.cardDate}>
          {translation.createdAt.toLocaleDateString()}
        </Text>
      </View>

      {/* Texts */}
      <Text style={styles.cardSource}>"{translation.sourceText}"</Text>
      <Text style={styles.cardTranslated}>{translation.translatedText}</Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <Pressable
          onPress={onSpeak}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.actionText}>{isPlaying ? '⏹' : '▶'}</Text>
        </Pressable>

        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.actionText}>📤</Text>
        </Pressable>

        <Pressable
          onPress={onFavourite}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.actionText}>
            {translation.isFavourite ? '⭐' : '☆'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.actionText}>🗑</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: Colors.background },
  header:      { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title:       { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 1 },
  tabs:        { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab:         { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive:   { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  tabText:     { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  searchRow:   { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: Typography.fontSize.base },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  card:        { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge:       { fontSize: Typography.fontSize.xs, fontWeight: '700', letterSpacing: 0.8 },
  dirArrow:    { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
  cardDate:    { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
  cardSource:  { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontStyle: 'italic' },
  cardTranslated: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  actionBtn:   { padding: Spacing.xs, paddingHorizontal: Spacing.sm },
  actionText:  { fontSize: Typography.fontSize.lg },
  emptyState:  { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.sm },
  emptyEmoji:  { fontSize: 48 },
  emptyText:   { color: Colors.textSecondary, fontSize: Typography.fontSize.md, fontWeight: '600' },
  emptyHint:   { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center' },
});
