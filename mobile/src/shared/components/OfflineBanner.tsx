// src/shared/components/OfflineBanner.tsx
// Animated slide-down banner shown when the FastAPI backend is unreachable.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, Pressable } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

interface OfflineBannerProps {
  visible: boolean;
  onPress?: () => void; // e.g. open settings to reconfigure backend URL
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible, onPress }) => {
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue:         visible ? 0 : -60,
      useNativeDriver: true,
      tension:         80,
      friction:        10,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.text}>
        AI backend offline — translations unavailable
      </Text>
      {onPress && (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.action}>Fix</Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          100,
    backgroundColor: '#B45309', // amber-700
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    gap:             Spacing.sm,
  },
  icon: { fontSize: 16 },
  text: {
    flex:     1,
    color:    '#FEF3C7',
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
  },
  action: {
    color:      '#FEF3C7',
    fontWeight: '800',
    fontSize:   Typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
