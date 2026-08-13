import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AvatarWidget } from '../../shared/components/AvatarWidget';
import { MicButton } from '../../shared/components/MicButton';
import { LiveSubtitleBubble } from '../../shared/components/LiveSubtitleBubble';
import { OfflineBanner } from '../../shared/components/OfflineBanner';
import { useSTT } from '../../shared/hooks/useSTT';
import { useTranslate } from '../../shared/hooks/useTranslate';
import { useBackendHealth } from '../../shared/hooks/useBackendHealth';
import { useSettingsStore } from '../../shared/stores/settingsStore';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../shared/theme';
import type { LanguageCode } from '../../core/entities/Translation';

type Direction = 'twi_to_english' | 'english_to_twi';

export const HomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [direction, setDirection] = useState<Direction>('twi_to_english');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const lastSpokenId = useRef<string | null>(null);
  const { autoSpeak, hydrate } = useSettingsStore();
  const { isOnline } = useBackendHealth();
  const sourceLang: LanguageCode = direction === 'twi_to_english' ? 'twi' : 'english';
  const stt = useSTT();
  const translate = useTranslate();

  useEffect(() => { hydrate(); }, [hydrate]);

  // Clean up and stop microphone when navigating away or unmounting
  useEffect(() => {
    return () => {
      stt.stopListening();
    };
  }, [stt]);

  const handleTranscriptReady = useCallback(async (transcript: string) => {
    setNoticeMessage(null);
    if (!transcript.trim()) {
      setNoticeMessage('No clear speech heard. Speak closer to the microphone and try again.');
      setTimeout(() => setNoticeMessage(null), 4000);
      return;
    }
    const result = await translate.interpret(transcript, direction);
    if (autoSpeak && result && result.id !== lastSpokenId.current) {
      lastSpokenId.current = result.id;
      await translate.speak(result);
    }
  }, [direction, autoSpeak, translate]);

  const handleMicPress = useCallback(async () => {
    setNoticeMessage(null);
    if (stt.isListening) {
      // Second tap → stop recording and send audio to Whisper for transcription
      return stt.stopAndTranscribe(sourceLang, handleTranscriptReady);
    }
    stt.reset();
    return stt.startListening(sourceLang, handleTranscriptReady);
  }, [stt, sourceLang, handleTranscriptReady]);

  const handleCancel = useCallback(async () => {
    await stt.stopListening();
    stt.reset();
    setNoticeMessage('Recording cancelled');
    setTimeout(() => setNoticeMessage(null), 2500);
  }, [stt]);

  const toggleDirection = useCallback(() => {
    setDirection(d => d === 'twi_to_english' ? 'english_to_twi' : 'twi_to_english');
    stt.reset();
  }, [stt]);

  const source = direction === 'twi_to_english' ? 'Twi' : 'English';
  const target = direction === 'twi_to_english' ? 'English' : 'Twi';

  return <SafeAreaView style={styles.safeArea}>
    <StatusBar style="dark" />
    <OfflineBanner visible={isOnline === false} onPress={() => navigation?.navigate('Settings')} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.appBar}>
        <Text style={styles.logo}>VOXA</Text>
        <Text style={styles.title}>Home</Text>
        <Pressable onPress={() => navigation?.navigate('Settings')} style={styles.profile}>
          <Text>⚙︎</Text>
        </Pressable>
      </View>

      {/* Language Switcher */}
      <Pressable onPress={toggleDirection} style={styles.directionPill} accessibilityLabel="Change translation direction">
        <View style={styles.activeLanguage}>
          <Text style={styles.flag}>{source === 'Twi' ? '🇬🇭' : '🇺🇸'}</Text>
          <Text style={styles.activeLanguageText}>{source}</Text>
        </View>
        <Text style={styles.switchIcon}>⇄</Text>
        <View style={styles.language}>
          <Text style={styles.flag}>{target === 'Twi' ? '🇬🇭' : '🇺🇸'}</Text>
          <Text style={styles.languageText}>{target}</Text>
        </View>
      </Pressable>

      {/* Avatar Hub */}
      <View style={styles.hub}>
        <AvatarWidget isSpeaking={translate.isSpeaking} isListening={stt.isListening} isThinking={translate.isThinking || stt.isTranscribing} size={146} />
      </View>

      {/* Mic Section */}
      <View style={styles.micSection}>
        <MicButton isListening={stt.isListening} onPress={handleMicPress} disabled={translate.isThinking || stt.isTranscribing} size={80} />
      </View>

      {/* Recording Status & Cancel Button */}
      {stt.isListening && (
        <View style={styles.activeRecordRow}>
          <Text style={styles.listeningHintText}>🔴 Recording… tap mic to finish</Text>
          <Pressable onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>✖ Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Transcribing Banner with Cancel */}
      {stt.isTranscribing && (
        <View style={styles.transcribingBanner}>
          <Text style={styles.transcribingText}>🎙 Transcribing with Whisper…</Text>
          <Pressable onPress={handleCancel} style={styles.cancelBtnSmall}>
            <Text style={styles.cancelBtnTextSmall}>✖ Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Notice Message */}
      {noticeMessage && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{noticeMessage}</Text>
        </View>
      )}

      {/* Subtitles & Results */}
      {(stt.isListening || stt.partialTranscript) && (
        <LiveSubtitleBubble partialText={stt.partialTranscript} finalText={stt.finalTranscript} isListening={stt.isListening} sourceLang={sourceLang} />
      )}
      {translate.translation && !stt.isListening && !stt.isTranscribing && (
        <TranslationCard translation={translate.translation} onSpeak={() => translate.speak(translate.translation!)} />
      )}
      {translate.error && <View style={styles.errorBox}><Text style={styles.errorText}>{translate.error}</Text></View>}
      {stt.error && <View style={styles.errorBox}><Text style={styles.errorText}>Microphone: {stt.error}</Text></View>}

      {/* Tip */}
      <View style={styles.tip}>
        <View style={styles.tipIcon}><Text>💡</Text></View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Cultural Tip</Text>
          <Text style={styles.tipText}>Using “Mepaakyɛw” is a sign of deep respect in Twi.</Text>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
};

const TranslationCard: React.FC<{ translation: { sourceText: string; translatedText: string }; onSpeak: () => void }> = ({ translation, onSpeak }) => (
  <View style={styles.resultCard}>
    <View style={styles.resultLine}><View style={[styles.dot, styles.twiDot]} /><Text style={styles.sourceText}>{translation.sourceText}</Text></View>
    <View style={styles.rule} />
    <View style={styles.resultLine}><View style={[styles.dot, styles.enDot]} /><Text style={styles.translatedText}>{translation.translatedText}</Text></View>
    <View style={styles.cardActions}>
      <Pressable onPress={onSpeak}><Text style={styles.action}>◖ Listen</Text></Pressable>
      <Text style={styles.action}>⧉ Copy</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20, paddingBottom: Spacing.xl, gap: Spacing.lg },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  logo: { fontSize: 18, fontWeight: '900', letterSpacing: 2, color: Colors.primary },
  title: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.primary, flex: 1 },
  profile: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  directionPill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceMuted, borderRadius: BorderRadius.full, padding: 4, ...Shadows.sm },
  activeLanguage: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 14, borderRadius: BorderRadius.full, backgroundColor: Colors.surface },
  language: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingHorizontal: 12 },
  flag: { fontSize: 15 },
  activeLanguageText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  languageText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  switchIcon: { color: Colors.textMuted, paddingHorizontal: 4 },
  hub: { minHeight: 208, alignItems: 'center', justifyContent: 'center' },
  micSection: { marginTop: -32, alignItems: 'center', zIndex: 2 },
  activeRecordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  listeningHintText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  cancelBtn: { backgroundColor: Colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  transcribingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: Colors.primary + '18', borderRadius: BorderRadius.md, padding: Spacing.sm },
  transcribingText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  cancelBtnSmall: { backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border },
  cancelBtnTextSmall: { color: Colors.error, fontSize: 11, fontWeight: '700' },
  noticeBox: { backgroundColor: '#FFF3CD', borderRadius: BorderRadius.md, padding: Spacing.sm, borderWidth: 1, borderColor: '#FFCA28' },
  noticeText: { color: '#7A5C00', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  resultCard: { backgroundColor: Colors.surfaceElevated, borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md, minHeight: 160, ...Shadows.sm },
  resultLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { height: 8, width: 8, borderRadius: 4, marginTop: 8 },
  twiDot: { backgroundColor: Colors.accent },
  enDot: { backgroundColor: Colors.primaryContainer },
  sourceText: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSize.md, lineHeight: 26, fontWeight: '600' },
  translatedText: { flex: 1, color: Colors.textSecondary, fontSize: Typography.fontSize.md, lineHeight: 26, fontStyle: 'italic' },
  rule: { height: 1, backgroundColor: Colors.border + '80' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.lg },
  action: { color: Colors.primary, fontSize: Typography.fontSize.xs, fontWeight: '700' },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.md, backgroundColor: Colors.accentLight, borderRadius: BorderRadius.lg },
  tipIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: Colors.accent },
  tipContent: { flex: 1 },
  tipTitle: { color: '#6C5000', fontWeight: '700', fontSize: 14 },
  tipText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  errorBox: { backgroundColor: '#FFDAD6', borderRadius: BorderRadius.md, padding: Spacing.md },
  errorText: { color: Colors.error, textAlign: 'center' },
});
