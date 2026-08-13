// src/shared/stores/settingsStore.ts
// Persistent settings store using Zustand + AsyncStorage.
// Single source of truth for all user preferences — survives app restarts.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'voxa_settings_v1';

export interface Settings {
  autoSpeak:      boolean;
  slowSpeech:     boolean;
  saveHistory:    boolean;
  hapticFeedback: boolean;
}

const DEFAULTS: Settings = {
  autoSpeak:      true,
  slowSpeech:     false,
  saveHistory:    true,
  hapticFeedback: true,
};

interface SettingsStore extends Settings {
  hydrated: boolean;
  hydrate:  () => Promise<void>;
  update:   (patch: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  /** Load settings from AsyncStorage on app start */
  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Partial<Settings> = JSON.parse(raw);
        set({ ...DEFAULTS, ...saved, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  /** Update one or more settings and persist */
  update: async (patch) => {
    set(patch);
    try {
      const current = get();
      const toSave: Settings = {
        autoSpeak:      current.autoSpeak,
        slowSpeech:     current.slowSpeech,
        saveHistory:    current.saveHistory,
        hapticFeedback: current.hapticFeedback,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, ...patch }));
    } catch {
      // Silently continue — settings are already updated in memory
    }
  },
}));
