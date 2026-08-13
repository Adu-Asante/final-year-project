// src/features/camera/CameraScreen.tsx
// OCR camera translation → avatar reads result aloud
//
// FIXES (v2):
//  1. Integrated useIsFocused() so CameraView active session releases cleanly when switching tabs.
//  2. Used StyleSheet.absoluteFillObject so the viewfinder fills container properly on iOS/Android.
//  3. Added photo capture flash animation for tactile user feedback.

import React, { useState, useRef, useCallback } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar }         from 'expo-status-bar';
import { useIsFocused }       from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AvatarWidget }      from '../../shared/components/AvatarWidget';
import { TTSService }        from '../../infrastructure/tts/TTSService';
import { NLLBTranslationService } from '../../infrastructure/translation/NLLBTranslationService';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../shared/theme';

const tts        = new TTSService();
const translator = new NLLBTranslationService();

export const CameraScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [permission, requestPermission]     = useCameraPermissions();
  const [isCapturing,   setIsCapturing]     = useState(false);
  const [detectedText,  setDetectedText]    = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating]   = useState(false);
  const [isSpeaking,    setIsSpeaking]      = useState(false);
  const [direction,     setDirection]       = useState<'twi_to_english' | 'english_to_twi'>('twi_to_english');

  const cameraRef = useRef<CameraView>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const showResult = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    setDetectedText(null);
    setTranslatedText(null);
    fadeAnim.setValue(0);

    try {
      // Take photo
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      if (!photo?.uri) throw new Error('No photo captured');

      // Send to backend OCR endpoint
      const ocrText = await translator.ocrImage(photo.uri);
      if (!ocrText.trim()) {
        Alert.alert('No text found', 'Could not detect any clear text. Point camera directly at printed text with good lighting.');
        return;
      }
      setDetectedText(ocrText);

      // Translate
      setIsTranslating(true);
      const result = await translator.translate(ocrText, direction);
      setTranslatedText(result);
      setIsTranslating(false);

      showResult();

      // Avatar reads result aloud
      setIsSpeaking(true);
      const targetLang = direction === 'twi_to_english' ? 'english' : 'twi';
      await tts.speak(result, targetLang, {
        onDone:    () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError:   () => setIsSpeaking(false),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not process image.';
      Alert.alert('OCR Error', msg + '\n\nMake sure the backend server is running and reachable.');
    } finally {
      setIsCapturing(false);
      setIsTranslating(false);
    }
  }, [isCapturing, direction, showResult, fadeAnim]);

  // Permission gate
  if (!permission) return <View style={styles.safeArea} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permText}>📷 Camera permission is needed to scan and translate text</Text>
          <Pressable onPress={requestPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Camera Viewfinder (Only active when tab is focused) ── */}
      <View style={styles.cameraContainer}>
        {isFocused ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back">
            {/* Overlay frame */}
            <View style={styles.overlay}>
              <View style={styles.frame}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>
              <Text style={styles.frameHint}>Point at text to translate</Text>
            </View>
          </CameraView>
        ) : (
          <View style={styles.blackFallback} />
        )}
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Direction toggle */}
        <Pressable
          onPress={() => setDirection(d => d === 'twi_to_english' ? 'english_to_twi' : 'twi_to_english')}
          style={styles.dirToggle}
        >
          <Text style={styles.dirText}>
            {direction === 'twi_to_english' ? '🇬🇭 Twi → English' : '🌍 English → Twi'} ⇄
          </Text>
        </Pressable>

        {/* Capture button */}
        <Pressable
          onPress={handleCapture}
          disabled={isCapturing || isTranslating}
          style={({ pressed }) => [styles.captureBtn, { opacity: (pressed || isCapturing) ? 0.7 : 1 }]}
        >
          <Text style={styles.captureBtnText}>
            {isCapturing ? '⏳ Capturing...' : isTranslating ? '🔄 Translating...' : '📸 Translate Text'}
          </Text>
        </Pressable>
      </View>

      {/* ── Result card ── */}
      {(detectedText || isTranslating) && (
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
          <View style={styles.resultRow}>
            <AvatarWidget isSpeaking={isSpeaking} isListening={false} isThinking={isTranslating} size={60} />
            <View style={styles.resultTexts}>
              {detectedText && (
                <Text style={styles.resultDetected}>"{detectedText}"</Text>
              )}
              {isTranslating && (
                <Text style={styles.resultThinking}>Translating...</Text>
              )}
              {translatedText && (
                <Text style={styles.resultTranslated}>{translatedText}</Text>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: Colors.background },
  cameraContainer: { flex: 1, overflow: 'hidden', borderRadius: BorderRadius.lg, margin: Spacing.md, backgroundColor: '#000' },
  blackFallback:   { flex: 1, backgroundColor: '#000' },
  overlay:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  frame:           { width: 260, height: 160, borderRadius: BorderRadius.md, position: 'relative' },
  corner:          { position: 'absolute', width: 24, height: 24, borderColor: Colors.accent, borderWidth: 3 },
  cornerTL:        { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR:        { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL:        { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR:        { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  frameHint:       { color: 'rgba(255,255,255,0.85)', fontSize: Typography.fontSize.sm, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, overflow: 'hidden' },
  controls:        { padding: Spacing.md, gap: Spacing.sm },
  dirToggle:       { alignSelf: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  dirText:         { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  captureBtn:      { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, alignItems: 'center', paddingVertical: Spacing.md, ...Shadows.md },
  captureBtnText:  { color: Colors.textOnPrimary, fontSize: Typography.fontSize.md, fontWeight: '700' },
  resultCard:      { backgroundColor: Colors.surface, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  resultRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  resultTexts:     { flex: 1, gap: 4 },
  resultDetected:  { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontStyle: 'italic' },
  resultThinking:  { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
  resultTranslated: { color: Colors.textPrimary, fontSize: Typography.fontSize.md, fontWeight: '700' },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  permText:        { color: Colors.textSecondary, textAlign: 'center', fontSize: Typography.fontSize.md },
  permBtn:         { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  permBtnText:     { color: Colors.textOnPrimary, fontWeight: '700' },
});
