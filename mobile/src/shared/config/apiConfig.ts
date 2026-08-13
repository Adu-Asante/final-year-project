// src/shared/config/apiConfig.ts
// Centralised backend URL configuration.
// Hardcoded to current Mac LAN IP so physical devices (both iOS and Android) work reliably.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'voxa_backend_url';

// ── YOUR MAC'S CURRENT LAN / HOTSPOT IP ───────────────────────────────────────
const MAC_LAN_IP = '172.20.10.14';
const BACKEND_PORT = 8000;

function getDefaultUrl(): string {
  return `http://${MAC_LAN_IP}:${BACKEND_PORT}`;
}

let _cachedUrl: string | null = null;

/** Get the backend base URL */
export async function getBackendUrl(): Promise<string> {
  if (_cachedUrl) return _cachedUrl;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    // If stored URL is stale, 10.0.2.2, localhost, or old IP, force update to current MAC_LAN_IP
    if (stored && stored.includes(MAC_LAN_IP)) {
      _cachedUrl = stored;
    } else {
      _cachedUrl = getDefaultUrl();
      await AsyncStorage.setItem(STORAGE_KEY, _cachedUrl);
    }
  } catch {
    _cachedUrl = getDefaultUrl();
  }

  return _cachedUrl;
}

export function invalidateBackendCache(): void {
  _cachedUrl = null;
}

export async function setBackendUrl(url: string): Promise<void> {
  const trimmed = url.trim().replace(/\/$/, '');
  _cachedUrl = trimmed;
  await AsyncStorage.setItem(STORAGE_KEY, trimmed);
}

export async function resetBackendUrl(): Promise<void> {
  _cachedUrl = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function getBackendUrlSync(): string {
  return _cachedUrl ?? getDefaultUrl();
}
