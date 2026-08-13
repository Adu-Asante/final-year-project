// src/shared/hooks/useBackendHealth.ts
// Polls the backend /health endpoint every 10 seconds.
// Returns isOnline: boolean so screens can show an offline warning banner.

import { useState, useEffect, useCallback, useRef } from 'react';
import { getBackendUrl } from '../config/apiConfig';

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS       = 4_000;

export function useBackendHealth() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null = unknown (first check pending)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      const baseUrl = await getBackendUrl();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    check(); // immediate first check
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  return { isOnline };
}
