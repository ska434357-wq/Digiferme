import { useRef, useCallback } from 'react';

/**
 * Detects 3 consecutive clicks/taps within a short time window (700ms).
 * Works reliably on both desktop mouse clicks and mobile touchscreens.
 */
export function useTripleTap(onTripleTap: () => void, windowMs = 700) {
  const tapTimestampsRef = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const recent = tapTimestampsRef.current.filter((t) => now - t <= windowMs);
    recent.push(now);

    if (recent.length >= 3) {
      tapTimestampsRef.current = [];
      onTripleTap();
    } else {
      tapTimestampsRef.current = recent;
    }
  }, [onTripleTap, windowMs]);

  return handleTap;
}
