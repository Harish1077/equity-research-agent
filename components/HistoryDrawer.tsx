"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Star,
  StarOff,
  Trash2,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  AlertCircle,
  ChevronRight,
  GitCompare,
} from "lucide-react";
import {
  getHistory,
  deleteHistoryEntry,
  clearHistory,
  addToWatchlist,
  removeFromWatchlist,
  isOnWatchlist,
  type HistoryEntry,
} from "@/lib/history";
import type { Verdict } from "@/lib/graph/state";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreEntry: (entry: HistoryEntry) => void;
  onCompare: (a: HistoryEntry, b: HistoryEntry) => void;
}

// ── Verdict pill ──────────────────────────────────────────────
function VerdictPill({ verdict }: { verdict: Verdict }) {
  const cfg =
    verdict === "INVEST"
      ? { label: "INVEST", color: "text-bull", bg: "bg-bull/10", border: "border-bull/30" }
      : verdict === "PASS"
      ? { label: "PASS", color: "text-bear", bg: "bg-bear/10", border: "border-bear/30" }
      : { label: "—", color: "text-ink-muted", bg: "bg-white/5", border: "border-border" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

// ── Conviction mini-bar ───────────────────────────────────────
function ConvictionBar({ score, verdict }: { score: number; verdict: Verdict }) {
  const color =
    verdict === "INVEST" ? "#00FFA3" : verdict === "PASS" ? "#FF4466" : "#7A8299";
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
    </div>
  );
}

// ── Single history row ────────────────────────────────────────
function HistoryRow({
  entry,
  isCompareSelected,
  onRestore,
  onDelete,
  onWatchlistToggle,
  onToggleCompare,
}: {
  entry: HistoryEntry;
  isCompareSelected: boolean;
  onRestore: () => void;
  onDelete: () => void;
  onWatchlistToggle: () => void;
  onToggleCompare: () => void;
}) {
  const [watchlisted, setWatchlisted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setWatchlisted(isOnWatchlist(entry.ticker));
  }, [entry.ticker]);

  const timeAgo = () => {
    const diff = Date.now() - entry.analyzedAt;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return "just now";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, height: 0 }}
      className={`relative group rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
        isCompareSelected
          ? "border-violet/50 bg-violet/10"
          : "border-border hover:border-border-strong bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
      onClick={onRestore}
    >
      {/* Compare selection highlight */}
      {isCompareSelected && (
        <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-violet border-2 border-violet-dim" />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-ink shrink-0">{entry.ticker}</span>
          <span className="text-[10px] text-ink-muted truncate">{entry.resolvedCompanyName}</span>
        </div>
        <VerdictPill verdict={entry.verdict} />
      </div>

      <ConvictionBar score={entry.convictionScore} verdict={entry.verdict} />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-ink-faint">
          <Clock className="h-2.5 w-2.5" />
          <span className="font-mono text-[9px]">{timeAgo()}</span>
        </div>

        {/* Actions (shown on hover) */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compare toggle */}
          <button
            onClick={onToggleCompare}
            title="Add to comparison"
            className={`p-1 rounded-md transition-colors duration-150 ${
              isCompareSelected
                ? "bg-violet/20 text-violet"
                : "text-ink-faint hover:text-violet hover:bg-violet/10"
            }`}
          >
            <GitCompare className="h-3 w-3" />
          </button>

          {/* Watchlist toggle */}
          <button
            onClick={() => {
              if (watchlisted) {
                removeFromWatchlist(entry.ticker);
              } else {
                addToWatchlist(entry.ticker, entry.resolvedCompanyName);
              }
              setWatchlisted(!watchlisted);
              onWatchlistToggle();
            }}
            title={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
            className={`p-1 rounded-md transition-colors duration-150 ${
              watchlisted
                ? "text-gold bg-gold/10"
                : "text-ink-faint hover:text-gold hover:bg-gold/10"
            }`}
          >
            {watchlisted ? <Star className="h-3 w-3" /> : <StarOff className="h-3 w-3" />}
          </button>

          {/* Delete */}
          {showConfirm ? (
            <button
              onClick={() => { onDelete(); setShowConfirm(false); }}
              className="px-2 py-0.5 rounded-md bg-bear/20 text-bear text-[9px] font-mono font-bold"
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              title="Delete entry"
              className="p-1 rounded-md text-ink-faint hover:text-bear hover:bg-bear/10 transition-colors duration-150"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main drawer ───────────────────────────────────────────────
export default function HistoryDrawer({
  isOpen,
  onClose,
  onRestoreEntry,
  onCompare,
}: HistoryDrawerProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [compareSet, setCompareSet] = useState<string[]>([]); // ids
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [tab, setTab] = useState<"history" | "watchlist">("history");

  const reload = useCallback(() => setEntries(getHistory()), []);

  useEffect(() => {
    if (isOpen) { reload(); setCompareSet([]); }
  }, [isOpen, reload]);

  const handleToggleCompare = (id: string) => {
    setCompareSet((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // slide window
      return [...prev, id];
    });
  };

  const handleLaunchCompare = () => {
    const [a, b] = compareSet.map((id) => entries.find((e) => e.id === id)!).filter(Boolean);
    if (a && b) onCompare(a, b);
  };

  const investCount = entries.filter((e) => e.verdict === "INVEST").length;
  const passCount   = entries.filter((e) => e.verdict === "PASS").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 flex flex-col"
            style={{
              background: "linear-gradient(180deg, rgba(8,10,13,0.98) 0%, rgba(4,6,10,0.99) 100%)",
              borderRight: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-data" />
                <span className="font-semibold text-sm text-ink">Research History</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors duration-150"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0 border-b border-border/40">
              {(["history", "watchlist"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-all duration-200 ${
                    tab === t
                      ? "text-data border-b-2 border-data"
                      : "text-ink-muted border-b-2 border-transparent hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Stats row */}
            {tab === "history" && entries.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-bull" />
                  <span className="font-mono text-[10px] text-bull font-bold">{investCount} INVEST</span>
                </div>
                <div className="w-px h-3 bg-border-strong" />
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-bear" />
                  <span className="font-mono text-[10px] text-bear font-bold">{passCount} PASS</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3 text-ink-muted" />
                  <span className="font-mono text-[10px] text-ink-muted">{entries.length} total</span>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {tab === "history" ? (
                entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-faint">
                    <AlertCircle className="h-8 w-8 opacity-30" />
                    <p className="text-xs text-center opacity-50">
                      No analyses yet. Run your first research to see it here.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {entries.map((entry) => (
                      <HistoryRow
                        key={entry.id}
                        entry={entry}
                        isCompareSelected={compareSet.includes(entry.id)}
                        onRestore={() => { onRestoreEntry(entry); onClose(); }}
                        onDelete={() => { deleteHistoryEntry(entry.id); reload(); }}
                        onWatchlistToggle={reload}
                        onToggleCompare={() => handleToggleCompare(entry.id)}
                      />
                    ))}
                  </AnimatePresence>
                )
              ) : (
                <WatchlistTab onRestore={(e) => { onRestoreEntry(e); onClose(); }} />
              )}
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-border/40 p-3 space-y-2">
              {/* Compare button */}
              <AnimatePresence>
                {compareSet.length === 2 && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    onClick={handleLaunchCompare}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(77,159,255,0.15))",
                      border: "1px solid rgba(168,85,247,0.4)",
                      color: "#A855F7",
                    }}
                  >
                    <GitCompare className="h-4 w-4" />
                    Compare {entries.find(e=>e.id===compareSet[0])?.ticker} vs{" "}
                    {entries.find(e=>e.id===compareSet[1])?.ticker}
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Clear history */}
              {tab === "history" && entries.length > 0 && (
                showClearConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { clearHistory(); reload(); setShowClearConfirm(false); }}
                      className="flex-1 py-2 rounded-xl text-xs font-mono font-bold bg-bear/20 text-bear border border-bear/30"
                    >
                      Yes, clear all
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-mono font-bold bg-white/5 text-ink-muted border border-border"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-mono text-ink-muted hover:text-bear hover:bg-bear/5 border border-border hover:border-bear/20 transition-all duration-200"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear all history
                  </button>
                )
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Watchlist tab sub-component ───────────────────────────────
function WatchlistTab({ onRestore }: { onRestore: (entry: HistoryEntry) => void }) {
  const [watchlist, setWatchlist] = useState<ReturnType<typeof import("@/lib/history").getWatchlist>>([]);
  const history = getHistory();

  useEffect(() => {
    import("@/lib/history").then(({ getWatchlist }) => setWatchlist(getWatchlist()));
  }, []);

  if (watchlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-faint">
        <Star className="h-8 w-8 opacity-30" />
        <p className="text-xs text-center opacity-50">
          Star tickers from your history to track them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {watchlist.map((w) => {
        const histEntry = history.find((h) => h.ticker === w.ticker);
        return (
          <motion.div
            key={w.ticker}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-xl border border-border bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer group transition-all duration-150"
            onClick={() => histEntry && onRestore(histEntry)}
          >
            <div>
              <div className="font-mono text-xs font-bold text-ink">{w.ticker}</div>
              <div className="text-[10px] text-ink-muted">{w.resolvedCompanyName}</div>
            </div>
            <div className="flex items-center gap-2">
              {histEntry && <VerdictPill verdict={histEntry.verdict} />}
              <ChevronRight className="h-3.5 w-3.5 text-ink-faint group-hover:text-ink transition-colors" />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
