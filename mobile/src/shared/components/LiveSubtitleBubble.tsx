// src/shared/components/LiveSubtitleBubble.tsx
// Displays real-time speech-to-text as words appear
// Words fade in one by one for that "Netflix subtitle" feel

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, BorderRadius, Typography } from '../theme';

interface LiveSubtitleBubbleProps {
  partialText: string;    // Streaming partial from STT
  finalText:   string;    // Finalized transcript
  isListening: boolean;
  sourceLang:  'twi' | 'english';
}

export const LiveSubtitleBubble: React.FC<LiveSubtitleBubbleProps> = ({
  partialText,
  finalText,
  isListening,
  sourceLang,
}) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  const displayText = finalText || partialText;
  const isPartial   = !finalText && Boolean(partialText);

  useEffect(() => {
    if (displayText) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      slideAnim.setValue(10);
    }
  }, [displayText]);

  if (!displayText && !isListening) return null;

  const langLabel = sourceLang === 'twi' ? 'Twi' : 'English';
  const langColor = sourceLang === 'twi' ? Colors.twiBadge : Colors.englishBadge;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Language badge */}
      <View style={[styles.badge, { backgroundColor: langColor + '33' }]}>
        <Text style={[styles.badgeText, { color: langColor }]}>{langLabel}</Text>
      </View>

      {/* Transcript text */}
      <Text style={[styles.transcript, isPartial && styles.transcriptPartial]}>
        {displayText || '...'}
      </Text>

      {/* Streaming dots */}
      {isPartial && <Text style={styles.dots}>●●●</Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.lg,
    padding:         16,
    gap:             8,
    borderWidth:     1,
    borderColor:     Colors.border + '80',
    minHeight:       72,
  },
  badge: {
    alignSelf:    'flex-start',
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  transcript: {
    color:      Colors.textPrimary,
    fontSize:   Typography.fontSize.lg,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed,
    fontWeight: '600',
  },
  transcriptPartial: {
    color: Colors.textSecondary,
  },
  dots: {
    color:    Colors.primary,
    fontSize: 10,
    letterSpacing: 3,
  },
});
