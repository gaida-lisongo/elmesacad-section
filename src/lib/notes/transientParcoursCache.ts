"use client";

const PREFIX = "titulaire-notes:parcours:";
const TTL_MS = 10 * 60 * 1000;

export function setTransientParcoursCache(payload: unknown): string {
  const key = `${PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const value = JSON.stringify({
    createdAt: Date.now(),
    payload,
  });
  sessionStorage.setItem(key, value);
  return key;
}

export function getTransientParcoursCache<T>(key: string): T | null {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { createdAt?: number; payload?: T };
    if (!parsed.createdAt || Date.now() - parsed.createdAt > TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.payload ?? null;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function removeTransientParcoursCache(key: string): void {
  sessionStorage.removeItem(key);
}

