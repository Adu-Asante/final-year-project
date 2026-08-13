// src/features/transcript/TranscriptScreen.tsx
// Live Conversation Transcript — shows every spoken/translated turn with timestamps.
// Pulls from SQLite (persisted) + in-memory session turns.
// Supports: full-session export (Share), individual copy, clear session.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar }  from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { SQLiteTranslationRepository } from '../../data/repositories/SQLiteTranslationRepository';
import { TTSService }   from '../../infrastructure/tts/TTSService';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import type { Translation } from '../../core/entities/Translation';

const repo = new SQLiteTranslationRepository();
const tts  = new TTSService();

// ──────────────────────────────────────────────────────────────────────────────
export const TranscriptScreen: React.FC = () => {
  const [entries,    setEntries]    = useState<Translation[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<'all' | 'twi' | 'english'>('all');
  const listRef = useRef<FlatList>(null);

  // Reload every time this tab is focused (live updates from Home / Conversation)
  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    const data = await repo.findAll(200);
    setEntries(data);
    // Scroll to top (most recent first)
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
  };

  const filtered = entries.filter(e => {
    if (filter === 'twi')     return e.sourceLang === 'twi';
    if (filter === 'english') return e.sourceLang === 'english';
    return true;
  });

  const handleExportAll = async () => {
    if (filtered.length === 0) {
      Alert.alert('Empty Transcript', 'No translations to export yet.');
      return;
    }
    const lines = filtered.map(e => {
      const time = new Date(e.createdAt).toLocaleString([], {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const dir = e.sourceLang === 'twi' ? '🇬🇭 Twi → EN 🌍' : '🌍 EN → Twi 🇬🇭';
      return `[${time}] ${dir}\n"${e.sourceText}"\n→ ${e.translatedText}`;
    }).join('\n\n─────────────\n\n');

    try {
      await Share.share({
        message: `Voxa AI Transcript\n${'─'.repeat(30)}\n\n${lines}`,
        title:   'Voxa Transcript Export',
      });
    } catch {}
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Transcript',
      'This will permanently delete ALL translation history. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await repo.deleteAll();
            setEntries([]);
          },
        },
      ]
    );
  };

  const handleSpeak = async (t: Translation) => {
    if (speakingId === t.id) {
      await tts.stop();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(t.id);
    await tts.speak(t.translatedText, t.targetLang, {
      onDone:    () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError:   () => setSpeakingId(null),
    });
  };

  const handleShareEntry = async (t: Translation) => {
    try {
      await Share.share({
        message: `"${t.sourceText}" → "${t.translatedText}" — Voxa AI`,
      });
    } catch {}
  };

  const renderEntry = ({ item, index }: { item: Translation; index: number }) => {
    const isTwi   = item.sourceLang === 'twi';
    const time    = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit',
    });
    const date    = new Date(item.createdAt).toLocaleDateString([], {
      month: 'short', day: 'numeric',
    });
    const srcColor = isTwi ? Colors.twiBadge : Colors.englishBadge;
    const isActive = speakingId === item.id;

    return (
      <View style={[styles.entry, isActive && styles.entryActive]}>
        {/* ── Number + timestamp ── */}
        <View style={styles.entryMeta}>
          <View style={[styles.entryNumber, { backgroundColor: srcColor + '22' }]}>
            <Text style={[styles.entryNumberText, { color: srcColor }]}>
              {filtered.length - index}
            </Text>
          </View>
          <View style={styles.entryBadge}>
            <View style={[styles.langDot, { backgroundColor: srcColor }]} />
            <Text style={[styles.langLabel, { color: srcColor }]}>
              {isTwi ? 'Twi → EN' : 'EN → Twi'}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.timeText}>{date} · {time}</Text>
        </View>

        {/* ── Source text ── */}
        <Text style={styles.sourceText}>"{item.sourceText}"</Text>

        {/* ── Translated text ── */}
        <View style={styles.translationRow}>
          <Text style={styles.arrow}>↓</Text>
          <Text style={styles.translatedText}>{item.translatedText}</Text>
        </View>

        {/* ── Actions ── */}
        <View style={styles.entryActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => handleSpeak(item)}
          >
            <Text style={styles.actionIcon}>{isActive ? '⏹' : '▶'}</Text>
            <Text style={styles.actionLabel}>{isActive ? 'Stop' : 'Listen'}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => handleShareEntry(item)}
          >
            <Text style={styles.actionIcon}>📤</Text>
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          {item.isFavourite && (
            <View style={styles.favBadge}>
              <Text style={styles.favIcon}>⭐</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Transcript</Text>
          <Text style={styles.subtitle}>{filtered.length} translation{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
            onPress={handleExportAll}
          >
            <Text style={styles.headerBtnText}>Export All</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, styles.headerBtnDanger, pressed && { opacity: 0.7 }]}
            onPress={handleClearAll}
          >
            <Text style={[styles.headerBtnText, { color: Colors.error }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Filter pills ── */}
      <View style={styles.filterRow}>
        {(['all', 'twi', 'english'] as const).map(f => (
          <Pressable
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
              {f === 'all' ? 'All' : f === 'twi' ? '🇬🇭 Twi' : '🌍 English'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Live indicator ── */}
      <View style={styles.liveBar}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Updates when you translate on Home or Chat tabs</Text>
      </View>

      {/* ── Transcript list ── */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={renderEntry}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No transcript yet</Text>
            <Text style={styles.emptyHint}>
              Go to Home and tap the mic to start interpreting.{'\n'}
              Every translation is logged here automatically.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title:    { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, marginTop: 2 },

  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  headerBtn: {
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerBtnDanger: { borderColor: Colors.error + '60' },
  headerBtnText:   { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.primary },

  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive:     { backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  filterPillText:       { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  filterPillTextActive: { color: Colors.primary },

  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { fontSize: 11, color: Colors.textMuted, flex: 1 },

  listContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },

  entry: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entryActive: {
    borderColor: Colors.primary + '80',
    backgroundColor: Colors.primary + '08',
  },

  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  entryNumber: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  entryNumberText: { fontSize: 11, fontWeight: '800' },

  entryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  langDot:    { width: 6, height: 6, borderRadius: 3 },
  langLabel:  { fontSize: Typography.fontSize.xs, fontWeight: '700', letterSpacing: 0.5 },

  timeText: { fontSize: 10, color: Colors.textMuted },

  sourceText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  translationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  arrow: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, paddingTop: 2 },
  translatedText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    lineHeight: 22,
  },

  entryActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceMuted,
  },
  actionBtnPressed: { opacity: 0.6 },
  actionIcon:  { fontSize: 13 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

  favBadge: { marginLeft: 'auto' as any },
  favIcon:  { fontSize: 14 },

  emptyState: { alignItems: 'center', paddingTop: Spacing.xl * 2, gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  emptyHint:  { fontSize: Typography.fontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
