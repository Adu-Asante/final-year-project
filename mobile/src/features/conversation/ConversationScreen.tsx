// src/features/conversation/ConversationScreen.tsx
// Two-way AI Interpreter — Twi speaker ↔ Avatar ↔ English speaker
// Fixed: tapping active speaker button now calls stopAndTranscribe() to finalize speech

import React, { useState, useCallback, useRef } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar }          from 'expo-status-bar';
import { AvatarWidget }       from '../../shared/components/AvatarWidget';
import { LiveSubtitleBubble } from '../../shared/components/LiveSubtitleBubble';
import { useSTT }             from '../../shared/hooks/useSTT';
import { useTranslate }       from '../../shared/hooks/useTranslate';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import type { ConversationTurn } from '../../core/entities/Conversation';
import { createTurn }            from '../../core/entities/Conversation';
import { SQLiteConversationRepository } from '../../data/repositories/SQLiteConversationRepository';
import type { LanguageCode } from '../../core/entities/Translation';

type ActiveSpeaker = 'twi' | 'english' | null;

const convRepo = new SQLiteConversationRepository();
const SESSION_ID = `conv-${Date.now()}`;
let sessionCreated = false;

export const ConversationScreen: React.FC = () => {
  const [turns,         setTurns]         = useState<ConversationTurn[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeaker>(null);

  const stt       = useSTT();
  const translate = useTranslate();
  const listRef   = useRef<FlatList>(null);
  const activeRef = useRef<ActiveSpeaker>(null); // sync ref to avoid stale closure

  // Ensure conversation session exists in SQLite
  const ensureSession = useCallback(async () => {
    if (sessionCreated) return;
    sessionCreated = true;
    await convRepo.createConversation(SESSION_ID, `Session ${new Date().toLocaleTimeString()}`);
  }, []);

  // Clean up and stop microphone when navigating away or unmounting
  useEffect(() => {
    return () => {
      stt.stopListening();
    };
  }, [stt]);

  /**
   * Core handler — called directly from useSTT's onResult callback,
   * so there's no stale React state. speakerLang read from ref.
   */
  const handleTranscript = useCallback(async (transcript: string) => {
    const speakerLang = activeRef.current;
    if (!speakerLang || !transcript.trim()) return;

    const direction: 'twi_to_english' | 'english_to_twi' =
      speakerLang === 'twi' ? 'twi_to_english' : 'english_to_twi';

    // Translate — returns result directly (no stale closure)
    const result = await translate.interpret(transcript, direction);
    if (!result) return;

    // Build turn
    const turn = createTurn({
      conversationId: SESSION_ID,
      speakerLang:    speakerLang as LanguageCode,
      sourceText:     transcript,
      translatedText: result.translatedText,
    });

    // Add to UI
    setTurns(prev => [...prev, turn]);

    // Persist to SQLite
    await ensureSession();
    await convRepo.addTurn(turn);

    // Reset active speaker
    setActiveSpeaker(null);
    activeRef.current = null;

    // Avatar speaks the translation
    await translate.speak(result);

    // Scroll to bottom
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [translate, ensureSession]);

  const handleSpeak = useCallback(async (speakerLang: LanguageCode) => {
    if (stt.isListening) {
      // Second tap → stop recording & send to Whisper for transcription
      const currentLang = activeRef.current ?? speakerLang;
      return stt.stopAndTranscribe(currentLang, handleTranscript);
    }

    const lang = speakerLang as ActiveSpeaker;
    setActiveSpeaker(lang);
    activeRef.current = lang;
    stt.reset();

    // Pass handleTranscript as the onResult callback
    await stt.startListening(speakerLang, handleTranscript);
  }, [stt, handleTranscript]);

  const renderTurn = useCallback(({ item, index }: { item: ConversationTurn; index: number }) => (
    <TurnCard
      turn={item}
      isActive={index === turns.length - 1 && translate.isSpeaking}
    />
  ), [turns.length, translate.isSpeaking]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Conversation</Text>
        <Text style={styles.subtitle}>Two-way interpreter</Text>
      </View>

      {/* ── Avatar ── */}
      <View style={styles.avatarSection}>
        <AvatarWidget
          isSpeaking={translate.isSpeaking}
          isListening={stt.isListening}
          isThinking={translate.isThinking || stt.isTranscribing}
          size={110}
        />
      </View>

      {/* ── Transcribing banner ── */}
      {stt.isTranscribing && (
        <View style={styles.transcribingBanner}>
          <Text style={styles.transcribingText}>🎙 Transcribing with Whisper…</Text>
        </View>
      )}

      {/* ── Live subtitles ── */}
      {(stt.isListening || stt.partialTranscript) && (
        <View style={styles.subtitleSection}>
          <LiveSubtitleBubble
            partialText={stt.partialTranscript}
            finalText={stt.finalTranscript}
            isListening={stt.isListening}
            sourceLang={activeSpeaker ?? 'english'}
          />
        </View>
      )}

      {/* ── Conversation log ── */}
      <FlatList
        ref={listRef}
        data={turns}
        renderItem={renderTurn}
        keyExtractor={item => item.id}
        style={styles.turnList}
        contentContainerStyle={styles.turnListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Tap a speaker button below to start interpreting
            </Text>
          </View>
        }
      />

      {/* ── Error message banner ── */}
      {stt.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Microphone: {stt.error}</Text>
        </View>
      )}

      {/* ── Speaker buttons ── */}
      <View style={styles.speakerRow}>
        <SpeakerButton
          label="Twi"
          emoji="🇬🇭"
          color={Colors.twiBadge}
          isActive={activeSpeaker === 'twi' && (stt.isListening || stt.isTranscribing)}
          onPress={() => handleSpeak('twi')}
        />
        <View style={styles.divider} />
        <SpeakerButton
          label="English"
          emoji="🌍"
          color={Colors.englishBadge}
          isActive={activeSpeaker === 'english' && (stt.isListening || stt.isTranscribing)}
          onPress={() => handleSpeak('english')}
        />
      </View>
    </SafeAreaView>
  );
};

// ── Turn Card ─────────────────────────────────────────────────────────────────
const TurnCard: React.FC<{ turn: ConversationTurn; isActive: boolean }> = ({
  turn, isActive,
}) => {
  const isTwi       = turn.speakerLang === 'twi';
  const accentColor = isTwi ? Colors.twiBadge : Colors.englishBadge;
  const align       = isTwi ? 'flex-start' : 'flex-end';

  return (
    <View style={[styles.turnContainer, { alignItems: align }]}>
      <View style={[
        styles.turnCard,
        {
          borderLeftWidth:  isTwi ? 3 : 0,
          borderRightWidth: isTwi ? 0 : 3,
          borderColor:      accentColor,
          backgroundColor:  isActive ? accentColor + '18' : Colors.surface,
        },
      ]}>
        <Text style={styles.turnSourceText}>"{turn.sourceText}"</Text>
        <Text style={[styles.turnArrow, { color: accentColor }]}>↓</Text>
        <Text style={styles.turnTranslatedText}>{turn.translatedText}</Text>
      </View>
    </View>
  );
};

// ── Speaker Button ────────────────────────────────────────────────────────────
interface SpeakerButtonProps {
  label: string; emoji: string; color: string; isActive: boolean; onPress: () => void;
}

const SpeakerButton: React.FC<SpeakerButtonProps> = ({
  label, emoji, color, isActive, onPress,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }).start();
    }
  }, [isActive]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], flex: 1 }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.speakerBtn,
          {
            backgroundColor: isActive ? color + '33' : Colors.surface,
            borderColor:     color,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
        accessible
        accessibilityLabel={`${isActive ? 'Stop' : 'Start'} ${label} speaker`}
      >
        <Text style={styles.speakerEmoji}>{emoji}</Text>
        <Text style={[styles.speakerLabel, { color }]}>
          {isActive ? 'Listening...' : label}
        </Text>
        <Text style={styles.speakerMic}>{isActive ? '⏹' : '🎤'}</Text>
      </Pressable>
    </Animated.View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: Colors.background },
  header:        { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title:         { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 1 },
  subtitle:      { fontSize: Typography.fontSize.xs, color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  avatarSection: { alignItems: 'center', paddingVertical: Spacing.sm },
  subtitleSection: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  turnList:      { flex: 1 },
  turnListContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyState:    { alignItems: 'center', paddingTop: Spacing.xl },
  emptyText:     { color: Colors.textMuted, fontSize: Typography.fontSize.sm, textAlign: 'center', fontStyle: 'italic' },
  turnContainer: { width: '100%' },
  turnCard:      { maxWidth: '80%', borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.xs, borderWidth: 0 },
  turnSourceText:     { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontStyle: 'italic' },
  turnArrow:          { fontSize: Typography.fontSize.sm, textAlign: 'center' },
  turnTranslatedText: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '600' },
  speakerRow:    { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  divider:       { width: 1, backgroundColor: Colors.border },
  speakerBtn:    { alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.lg, borderWidth: 1.5, paddingVertical: Spacing.md, gap: Spacing.xs },
  speakerEmoji:  { fontSize: 28 },
  speakerLabel:  { fontSize: Typography.fontSize.sm, fontWeight: '700', letterSpacing: 0.5 },
  speakerMic:    { fontSize: Typography.fontSize.md },
  transcribingBanner: { alignItems: 'center', marginHorizontal: Spacing.md, backgroundColor: Colors.primary + '18', borderRadius: BorderRadius.md, padding: Spacing.sm },
  transcribingText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  errorBox:      { backgroundColor: '#FFDAD6', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: BorderRadius.md, padding: Spacing.sm },
  errorText:     { color: Colors.error, textAlign: 'center', fontSize: 12 },
});
