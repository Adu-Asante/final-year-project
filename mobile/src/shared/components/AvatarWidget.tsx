// src/shared/components/AvatarWidget.tsx
// 2D animated AI Interpreter avatar
// Uses emoji + Animated API for lip-sync simulation
// (Replace the emoji face with a Rive .riv file when asset is available)

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, BorderRadius, Shadows } from '../theme';

interface AvatarWidgetProps {
  isSpeaking:  boolean;
  isListening: boolean;
  isThinking:  boolean;
  size?:       number;
}

// Mouth frames for lip-sync simulation
const MOUTH_FRAMES = ['😐', '🙂', '😮', '🙂', '😐', '😄', '😐'];

export const AvatarWidget: React.FC<AvatarWidgetProps> = ({
  isSpeaking,
  isListening,
  isThinking,
  size = 140,
}) => {
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [mouthFrame, setMouthFrame] = useState(0);

  // Glow ring when speaking/listening
  useEffect(() => {
    if (isSpeaking || isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  }, [isSpeaking, isListening]);

  // Lip-sync: cycle mouth frames while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthFrame(f => (f + 1) % MOUTH_FRAMES.length);
    }, 120);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Gentle breathing / thinking bob
  useEffect(() => {
    if (isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0.97, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      bounceAnim.stopAnimation();
      Animated.spring(bounceAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }).start();
    }
  }, [isThinking]);

  const glowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.7],
  });

  const avatarFace = isSpeaking ? MOUTH_FRAMES[mouthFrame] : isListening ? '👂' : isThinking ? '🤔' : '🙂';
  const statusLabel = isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : isThinking ? 'Translating...' : 'Your AI Interpreter';
  const ringColor = isListening ? Colors.micListening : Colors.primary;

  return (
    <View style={styles.wrapper}>
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width:        size * 1.4,
            height:       size * 1.4,
            borderRadius: (size * 1.4) / 2,
            borderColor:  ringColor,
            opacity:      glowOpacity,
          },
        ]}
      />

      {/* Avatar circle */}
      <Animated.View
        style={[
          styles.avatarCircle,
          {
            width:        size,
            height:       size,
            borderRadius: size / 2,
            transform:    [{ scale: bounceAnim }],
          },
          Shadows.lg,
        ]}
      >
        <Text style={{ fontSize: size * 0.55 }}>{avatarFace}</Text>
      </Animated.View>

      {/* Status label */}
      <Text style={styles.statusLabel}>{statusLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  glowRing: {
    position:  'absolute',
    borderWidth: 2.5,
  },
  avatarCircle: {
    backgroundColor: Colors.surfaceMuted,
    alignItems:      'center',
    justifyContent:  'center',
    borderColor:     Colors.surface,
    borderWidth:     4,
  },
  statusLabel: {
    color:         Colors.textSecondary,
    fontSize:      13,
    letterSpacing: 0.4,
    marginTop:     4,
    fontStyle:     'normal',
  },
});
