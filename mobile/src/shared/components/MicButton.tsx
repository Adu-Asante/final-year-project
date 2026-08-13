// src/shared/components/MicButton.tsx
// Animated microphone button with pulse ring when listening + haptic feedback

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Shadows } from '../theme';
import { useSettingsStore } from '../stores/settingsStore';

interface MicButtonProps {
  isListening: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

export const MicButton: React.FC<MicButtonProps> = ({
  isListening,
  onPress,
  disabled = false,
  size = 80,
}) => {
  const hapticEnabled = useSettingsStore(s => s.hapticFeedback);

  const handlePress = () => {
    if (hapticEnabled) {
      // Medium impact when starting to listen, light when stopping
      if (!isListening) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    onPress();
  };
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isListening) {
      // Pulse ring animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.8,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Scale button slightly when listening
      Animated.spring(scaleAnim, {
        toValue: 1.08,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 6,
      }).start();
    }
  }, [isListening]);

  const bgColor = isListening ? Colors.micListening : Colors.micIdle;

  return (
    <View style={styles.container}>
      {/* Pulse ring */}
      {isListening && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width:  size * 1.5,
              height: size * 1.5,
              borderRadius: (size * 1.5) / 2,
              backgroundColor: Colors.micPulse,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      )}

      {/* Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            {
              width:       size,
              height:      size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
              opacity: pressed ? 0.85 : 1,
            },
            Shadows.md,
          ]}
          accessible
          accessibilityLabel={isListening ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
        >
          <Text style={[styles.icon, { fontSize: size * 0.38 }]}>
            {isListening ? '⏹' : '●'}
          </Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.label}>
        {isListening ? 'Listening...' : 'Tap to Speak'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pulseRing: {
    position: 'absolute',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 4,
  },
});
