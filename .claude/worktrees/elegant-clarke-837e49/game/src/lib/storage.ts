/**
 * 抽象ストレージ層。
 * 現状は localStorage。将来 Capacitor 環境下では @capacitor/preferences に差し替え。
 */

const PREFIX = "pachishop:";

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // quota exceeded等は握り潰す（ゲーム進行を妨げない）
    }
  },
  remove(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },
};
