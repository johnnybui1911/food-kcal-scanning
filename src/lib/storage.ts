import AsyncStorage from "@react-native-async-storage/async-storage";
import { HISTORY_LIMIT } from "./config";
import type { NutritionResult } from "./nutrition-schema";

export type Locale = "vi" | "en";

export type HistoryFeedback = { rating: "up" | "down"; reasons: string[]; comment: string };

export type HistoryItem = {
  id: string;
  createdAt: number;
  note: string;
  thumbnail: string;
  result: NutritionResult;
  model: string;
  promptVersion: string;
  multiplier: number;
  feedback?: HistoryFeedback;
};

const KEYS = {
  onboarded: "calobi.onboarded.v1",
  locale: "calobi.locale.v1",
  deviceId: "calobi.deviceId.v1",
  history: "calobi.history.v1",
  a2hsDismissed: "calobi.a2hsDismissed.v1",
};

async function read(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode) or full; the app keeps working in memory.
  }
}

export async function getOnboarded(): Promise<boolean> {
  return (await read(KEYS.onboarded)) === "1";
}

export async function setOnboarded(): Promise<void> {
  await write(KEYS.onboarded, "1");
}

export async function getLocale(): Promise<Locale | null> {
  const v = await read(KEYS.locale);
  return v === "vi" || v === "en" ? v : null;
}

export async function setLocale(l: Locale): Promise<void> {
  await write(KEYS.locale, l);
}

function randomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const existing = await read(KEYS.deviceId);
  if (existing) return (cachedDeviceId = existing);
  const id = randomId();
  await write(KEYS.deviceId, id);
  return (cachedDeviceId = id);
}

export async function listHistory(): Promise<HistoryItem[]> {
  const raw = await read(KEYS.history);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? (items as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

async function writeHistory(items: HistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.history, JSON.stringify(items));
  } catch {
    // Most likely quota exceeded: drop the oldest 10 and retry once.
    try {
      await AsyncStorage.setItem(KEYS.history, JSON.stringify(items.slice(0, Math.max(0, items.length - 10))));
    } catch {
      // Give up silently; history is a convenience.
    }
  }
}

export async function getHistoryItem(id: string): Promise<HistoryItem | null> {
  return (await listHistory()).find((i) => i.id === id) ?? null;
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  const rest = (await listHistory()).filter((i) => i.id !== item.id);
  const next = [item, ...rest].sort((a, b) => b.createdAt - a.createdAt).slice(0, HISTORY_LIMIT);
  await writeHistory(next);
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await writeHistory((await listHistory()).filter((i) => i.id !== id));
}

export async function getA2hsDismissed(): Promise<boolean> {
  return (await read(KEYS.a2hsDismissed)) === "1";
}

export async function setA2hsDismissed(): Promise<void> {
  await write(KEYS.a2hsDismissed, "1");
}
