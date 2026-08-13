// src/features/settings/SettingsScreen.tsx
// All toggles persist via settingsStore (Zustand + AsyncStorage)
// Network section now shows current active URL + "Test Connection" button

import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { useSettingsStore } from '../../shared/stores/settingsStore';
import {
  getBackendUrl,
  setBackendUrl,
  resetBackendUrl,
  invalidateBackendCache,
} from '../../shared/config/apiConfig';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export const SettingsScreen: React.FC = () => {
  const { autoSpeak, slowSpeech, saveHistory, hapticFeedback, hydrated, hydrate, update } =
    useSettingsStore();

  const [backendUrl,  setBackendUrlState] = useState('');
  const [urlSaved,    setUrlSaved]        = useState(false);
  const [testState,   setTestState]       = useState<TestState>('idle');
  const [testLatency, setTestLatency]     = useState<number | null>(null);

  // Hydrate settings from AsyncStorage on mount
  useEffect(() => { hydrate(); }, []);

  // Load saved backend URL
  useEffect(() => {
    getBackendUrl().then(url => setBackendUrlState(url));
  }, []);

  const handleSaveUrl = async () => {
    if (!backendUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    await setBackendUrl(backendUrl);
    setUrlSaved(true);
    setTestState('idle');
    setTimeout(() => setUrlSaved(false), 2500);
  };

  const handleResetUrl = async () => {
    invalidateBackendCache();
    await resetBackendUrl();
    const defaultUrl = await getBackendUrl();
    setBackendUrlState(defaultUrl);
    setTestState('idle');
    setTestLatency(null);
  };

  const handleTestConnection = useCallback(async () => {
    setTestState('testing');
    setTestLatency(null);
    const t0 = Date.now();
    try {
      await axios.get(`${backendUrl}/health`, { timeout: 6000 });
      setTestLatency(Date.now() - t0);
      setTestState('ok');
    } catch {
      setTestState('fail');
    }
  }, [backendUrl]);

  const testLabel =
    testState === 'testing' ? '⏳ Testing…'
    : testState === 'ok'    ? `✅ Connected${testLatency ? ` · ${testLatency}ms` : ''}`
    : testState === 'fail'  ? '❌ Cannot reach server'
    :                         '🔌 Test Connection';

  const testColor =
    testState === 'ok'   ? Colors.success
    : testState === 'fail' ? Colors.error
    : Colors.primary;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* ── App version ── */}
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>VOXA v1.0.0</Text>
          <Text style={styles.versionSub}>AI Interpreter — Twi ↔ English</Text>
        </View>

        {/* ── Network (MOST IMPORTANT — shown first) ── */}
        <SettingsSection title="🔗 Network · Backend Server">
          <View style={styles.urlSection}>

            {/* Warning box */}
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>⚠️ Physical Device Requirement</Text>
              <Text style={styles.warningBody}>
                Your phone cannot reach{' '}
                <Text style={styles.mono}>localhost</Text>. You must enter your
                Mac's WiFi IP address below. Mac IP: <Text style={styles.mono}>10.233.122.34</Text>
              </Text>
            </View>

            <Text style={styles.rowLabel}>Backend Server URL</Text>
            <TextInput
              style={styles.urlInput}
              value={backendUrl}
              onChangeText={text => {
                setBackendUrlState(text);
                setTestState('idle');
              }}
              placeholder="http://10.233.122.34:8000"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            {/* Test button */}
            <TouchableOpacity
              onPress={handleTestConnection}
              disabled={testState === 'testing'}
              style={[styles.testBtn, { borderColor: testColor + '60' }]}
            >
              <Text style={[styles.testBtnText, { color: testColor }]}>{testLabel}</Text>
            </TouchableOpacity>

            <View style={styles.urlButtons}>
              <TouchableOpacity onPress={handleSaveUrl} style={styles.urlSaveBtn}>
                <Text style={styles.urlSaveBtnText}>
                  {urlSaved ? '✅ Saved' : 'Save URL'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleResetUrl} style={styles.urlResetBtn}>
                <Text style={styles.urlResetBtnText}>Reset to Default</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.urlHint}>
              Default: http://10.233.122.34:8000 · Change if you switch WiFi networks
            </Text>
          </View>
        </SettingsSection>

        {/* ── TTS section ── */}
        <SettingsSection title="Speech">
          <SettingsRow
            label="Auto-speak translation"
            description="Avatar speaks immediately after translating"
            value={autoSpeak}
            onToggle={v => update({ autoSpeak: v })}
          />
          <SettingsRow
            label="Slow speech"
            description="Speak translation at reduced speed"
            value={slowSpeech}
            onToggle={v => update({ slowSpeech: v })}
          />
        </SettingsSection>

        {/* ── Privacy section ── */}
        <SettingsSection title="Privacy">
          <SettingsRow
            label="Save translation history"
            description="Store translations locally on device"
            value={saveHistory}
            onToggle={v => update({ saveHistory: v })}
          />
        </SettingsSection>

        {/* ── UI section ── */}
        <SettingsSection title="Interface">
          <SettingsRow
            label="Haptic feedback"
            description="Vibrate on mic start/stop"
            value={hapticFeedback}
            onToggle={v => update({ hapticFeedback: v })}
          />
        </SettingsSection>

        {/* ── Info ── */}
        <SettingsSection title="About">
          <InfoRow label="Translation model"   value="NLLB-200 (600M)" />
          <InfoRow label="Speech recognition" value="@react-native-voice" />
          <InfoRow label="TTS engine"         value="expo-speech + Backend" />
          <InfoRow label="Storage"            value="SQLite (on-device)" />
          <InfoRow label="Offline capable"    value="Phrasebook only" />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Settings Section ──────────────────────────────────────────────────────────
const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

// ── Settings Toggle Row ───────────────────────────────────────────────────────
const SettingsRow: React.FC<{
  label:       string;
  description: string;
  value:       boolean;
  onToggle:    (v: boolean) => void;
}> = ({ label, description, value, onToggle }) => (
  <View style={styles.row}>
    <View style={styles.rowTexts}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDesc}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: Colors.border, true: Colors.primary + '88' }}
      thumbColor={value ? Colors.primary : Colors.textMuted}
    />
  </View>
);

// ── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content:  { padding: Spacing.md, gap: Spacing.lg, paddingBottom: 100 },
  header:   { alignItems: 'center', paddingTop: Spacing.md },
  title:    { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 1 },
  versionBadge: { alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  versionText: { fontSize: Typography.fontSize.lg, fontWeight: '900', color: Colors.primary, letterSpacing: 4 },
  versionSub:  { fontSize: Typography.fontSize.xs, color: Colors.textMuted, letterSpacing: 1 },

  section:      { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.xs, color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase', paddingLeft: Spacing.xs },
  sectionCard:  { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowTexts:    { flex: 1, gap: 2 },
  rowLabel:    { color: Colors.textPrimary, fontSize: Typography.fontSize.base, fontWeight: '500' },
  rowDesc:     { color: Colors.textMuted, fontSize: Typography.fontSize.xs },
  infoValue:   { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: '600' },

  urlSection:  { padding: Spacing.md, gap: Spacing.sm },

  warningBox: {
    backgroundColor: '#FFF3CD',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FFCA28',
    padding: Spacing.md,
    gap: 4,
  },
  warningTitle: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: '#7A5C00' },
  warningBody:  { fontSize: Typography.fontSize.xs, color: '#5C4200', lineHeight: 18 },
  mono:         { fontFamily: 'monospace', fontWeight: '700' },

  urlInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'monospace',
  },

  testBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  testBtnText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },

  urlButtons:  { flexDirection: 'row', gap: Spacing.sm },
  urlSaveBtn:  { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: Spacing.xs, alignItems: 'center' },
  urlSaveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: Typography.fontSize.sm },
  urlResetBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, paddingVertical: Spacing.xs, alignItems: 'center' },
  urlResetBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },

  urlHint: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});
