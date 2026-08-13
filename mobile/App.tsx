// App.tsx — Voxa root entry point
// Guaranteed render bootstrap with 2s safety valve (prevents blank screen under all conditions)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }       from 'react-native-safe-area-context';
import { AppNavigator }           from './src/shared/navigation/AppNavigator';
import { migrateDatabase }        from './src/data/datasources/local/db/database';
import { Colors, Typography }     from './src/shared/theme';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Safety valve: max 2s timeout guarantees UI renders even if DB or async load delays
    const timer = setTimeout(() => {
      if (mounted) setIsReady(true);
    }, 2000);

    async function bootstrap() {
      try {
        await migrateDatabase();
      } catch (e) {
        console.warn('DB migration warning:', e);
      } finally {
        if (mounted) {
          clearTimeout(timer);
          setIsReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashName}>VOXA</Text>
        <Text style={styles.splashSub}>AI Interpreter</Text>
        <Text style={styles.splashFlag}>🇬🇭 ↔ 🌍</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    gap:             12,
    padding:         24,
  },
  splashName: {
    fontSize:      Typography.fontSize['4xl'],
    fontWeight:    '900',
    color:         Colors.primary,
    letterSpacing: 12,
  },
  splashSub: {
    fontSize:      Typography.fontSize.sm,
    color:         Colors.textSecondary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  splashFlag: {
    fontSize:  Typography.fontSize['2xl'],
    marginTop: 16,
  },
});
