import type { ReplayFile } from '../game/types';

const REPLAYS_KEY = 'billiards_replays';
const SETTINGS_KEY = 'billiards_settings';

export function loadReplays(): ReplayFile[] {
  try {
    const raw = localStorage.getItem(REPLAYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReplay(replay: ReplayFile): void {
  const replays = loadReplays();
  replays.unshift(replay);
  const limited = replays.slice(0, 20);
  try {
    localStorage.setItem(REPLAYS_KEY, JSON.stringify(limited));
  } catch (e) {
    console.error('Failed to save replay:', e);
  }
}

export function deleteReplay(id: string): void {
  const replays = loadReplays();
  const filtered = replays.filter((r) => r.id !== id);
  try {
    localStorage.setItem(REPLAYS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete replay:', e);
  }
}

export function getReplay(id: string): ReplayFile | null {
  const replays = loadReplays();
  return replays.find((r) => r.id === id) || null;
}

interface GameSettings {
  aiDifficulty: 'easy' | 'hard';
  showAimLine: boolean;
  volume: number;
}

const defaultSettings: GameSettings = {
  aiDifficulty: 'easy',
  showAimLine: true,
  volume: 0.7,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Partial<GameSettings>): void {
  const current = loadSettings();
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
