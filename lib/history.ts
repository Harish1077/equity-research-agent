/**
 * lib/history.ts
 * ──────────────
 * Client-side localStorage layer for persisting analysis history and watchlist.
 * All operations are safe to call in SSR contexts (they no-op when window is not available).
 */

import type { FinancialSnapshot, Verdict } from "@/lib/graph/state";

// ── Types ─────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  ticker: string;
  resolvedCompanyName: string;
  verdict: Verdict;
  convictionScore: number;
  analysis: string;
  riskFactors: string[];
  fundamentals: FinancialSnapshot | null;
  quantML: any;
  analyzedAt: number; // unix ms
}

export interface WatchlistEntry {
  ticker: string;
  resolvedCompanyName: string;
  addedAt: number;
}

// ── Constants ─────────────────────────────────────────────────

const HISTORY_KEY    = "stocksage_history_v2";
const WATCHLIST_KEY  = "stocksage_watchlist_v2";
const MAX_HISTORY    = 25;

// ── Safe localStorage wrapper ─────────────────────────────────

function getStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

// ── History API ───────────────────────────────────────────────

export function getHistory(): HistoryEntry[] {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as HistoryEntry[]).sort((a, b) => b.analyzedAt - a.analyzedAt);
  } catch {
    return [];
  }
}

export function saveAnalysis(entry: Omit<HistoryEntry, "id" | "analyzedAt">): HistoryEntry {
  const store = getStore();
  const full: HistoryEntry = {
    ...entry,
    id: `${entry.ticker}_${Date.now()}`,
    analyzedAt: Date.now(),
  };
  if (!store) return full;

  try {
    const existing = getHistory();
    // Remove old entry for same ticker so we always have the freshest result
    const filtered = existing.filter((e) => e.ticker !== entry.ticker);
    const updated = [full, ...filtered].slice(0, MAX_HISTORY);
    store.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // If storage is full, clear oldest half and retry
    try {
      const trimmed = getHistory().slice(0, Math.floor(MAX_HISTORY / 2));
      store.setItem(HISTORY_KEY, JSON.stringify([full, ...trimmed]));
    } catch { /* give up gracefully */ }
  }

  return full;
}

export function getHistoryEntry(ticker: string): HistoryEntry | null {
  return getHistory().find((e) => e.ticker === ticker) ?? null;
}

export function deleteHistoryEntry(id: string): void {
  const store = getStore();
  if (!store) return;
  try {
    const updated = getHistory().filter((e) => e.id !== id);
    store.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch { /* no-op */ }
}

export function clearHistory(): void {
  const store = getStore();
  if (!store) return;
  try { store.removeItem(HISTORY_KEY); } catch { /* no-op */ }
}

// ── Watchlist API ─────────────────────────────────────────────

export function getWatchlist(): WatchlistEntry[] {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as WatchlistEntry[]).sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
}

export function addToWatchlist(ticker: string, resolvedCompanyName: string): void {
  const store = getStore();
  if (!store) return;
  try {
    const current = getWatchlist();
    if (current.some((e) => e.ticker === ticker)) return;
    const updated: WatchlistEntry[] = [
      { ticker, resolvedCompanyName, addedAt: Date.now() },
      ...current,
    ];
    store.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  } catch { /* no-op */ }
}

export function removeFromWatchlist(ticker: string): void {
  const store = getStore();
  if (!store) return;
  try {
    const updated = getWatchlist().filter((e) => e.ticker !== ticker);
    store.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  } catch { /* no-op */ }
}

export function isOnWatchlist(ticker: string): boolean {
  return getWatchlist().some((e) => e.ticker === ticker);
}

export function clearWatchlist(): void {
  const store = getStore();
  if (!store) return;
  try { store.removeItem(WATCHLIST_KEY); } catch { /* no-op */ }
}

// ── Recent searches (used by NeuralSearch) ────────────────────

const RECENT_KEY = "stocksage_recent_v2";
const MAX_RECENT = 8;

export function getRecentSearches(): string[] {
  const store = getStore();
  if (!store) return [];
  try {
    const raw = store.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(query: string): void {
  const store = getStore();
  if (!store) return;
  try {
    const current = getRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase());
    const updated = [query, ...current].slice(0, MAX_RECENT);
    store.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch { /* no-op */ }
}

export function clearRecentSearches(): void {
  const store = getStore();
  if (!store) return;
  try { store.removeItem(RECENT_KEY); } catch { /* no-op */ }
}
