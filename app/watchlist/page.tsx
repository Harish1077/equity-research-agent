"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Eye, ArrowLeft, Star, StarOff, Trash2, RefreshCw,
  TrendingUp, TrendingDown, BarChart3, AlertCircle,
  Clock, Info
} from "lucide-react";
import {
  getHistory,
  getWatchlist,
  removeFromWatchlist,
  addToWatchlist,
  isOnWatchlist,
  type HistoryEntry,
  type WatchlistEntry,
} from "@/lib/history";
import type { Verdict } from "@/lib/graph/state";

// ── Verdict badge ────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const cfg =
    verdict === "INVEST"
      ? { label: "INVEST", color: "#00FFA3", bg: "rgba(0,255,163,0.1)", border: "rgba(0,255,163,0.3)" }
      : verdict === "PASS"
      ? { label: "PASS", color: "#FF4466", bg: "rgba(255,68,102,0.1)", border: "rgba(255,68,102,0.3)" }
      : { label: "—", color: "#7A8299", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
  return (
    <span
      className="px-3 py-1 rounded-full font-mono text-xs font-black"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}

// ── Mini conviction ring ─────────────────────────────────────
function ConvictionRing({ score, verdict }: { score: number; verdict: Verdict }) {
  const color = verdict === "INVEST" ? "#00FFA3" : verdict === "PASS" ? "#FF4466" : "#7A8299";
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <motion.circle
          cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${circ}`}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[9px] font-bold" style={{ color }}>{score.toFixed(0)}</span>
      </div>
    </div>
  );
}

// ── Mini sparkline from RL simulation data ─────────────────
function MiniSparkline({ quantML, verdict }: { quantML: any; verdict: Verdict }) {
  if (!quantML?.rlSimulation?.steps?.length) {
    return <div className="w-20 h-8 rounded bg-white/[0.03] flex items-center justify-center"><span className="text-[8px] text-ink-faint">No data</span></div>;
  }
  const steps = quantML.rlSimulation.steps as Array<{ portfolioValue: number }>;
  const vals = steps.map((s) => s.portfolioValue);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const W = 80, H = 32;
  const points = vals
    .map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(" ");
  const color = verdict === "INVEST" ? "#00FFA3" : verdict === "PASS" ? "#FF4466" : "#7A8299";
  return (
    <svg width={W} height={H} className="overflow-visible shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
      />
    </svg>
  );
}

// ── Ticker card ─────────────────────────────────────────────
function TickerCard({ entry, onReanalyze }: { entry: HistoryEntry; onReanalyze: (ticker: string) => void }) {
  const [watchlisted, setWatchlisted] = useState(false);
  useEffect(() => setWatchlisted(isOnWatchlist(entry.ticker)), [entry.ticker]);

  const timeAgo = () => {
    const diff = Date.now() - entry.analyzedAt;
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor(diff / 60000);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    return `${mins}m ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.015, y: -2 }}
      className="glass-card p-4 flex flex-col gap-3"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-black text-ink">{entry.ticker}</div>
          <div className="text-xs text-ink-muted truncate">{entry.resolvedCompanyName}</div>
        </div>
        <VerdictBadge verdict={entry.verdict} />
      </div>

      {/* Sparkline + ring */}
      <div className="flex items-center justify-between">
        <MiniSparkline quantML={entry.quantML} verdict={entry.verdict} />
        <ConvictionRing score={entry.convictionScore} verdict={entry.verdict} />
      </div>

      {/* Fundamentals mini row */}
      {entry.fundamentals && (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "P/E", value: entry.fundamentals.peRatio?.toFixed(1) ?? "—" },
            { label: "ROE", value: entry.fundamentals.returnOnEquity ? `${entry.fundamentals.returnOnEquity.toFixed(1)}%` : "—" },
            { label: "β", value: entry.fundamentals.beta?.toFixed(2) ?? "—" },
          ].map((m) => (
            <div key={m.label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="font-mono text-[9px] text-ink-faint">{m.label}</div>
              <div className="font-mono text-xs font-bold text-ink">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/30">
        <div className="flex items-center gap-1 text-ink-faint flex-1">
          <Clock className="h-2.5 w-2.5" />
          <span className="font-mono text-[8px]">{timeAgo()}</span>
        </div>
        {/* Watchlist toggle */}
        <button
          onClick={() => {
            if (watchlisted) removeFromWatchlist(entry.ticker);
            else addToWatchlist(entry.ticker, entry.resolvedCompanyName);
            setWatchlisted(!watchlisted);
          }}
          className={`p-1.5 rounded-lg transition-colors duration-150 ${
            watchlisted ? "text-gold bg-gold/10" : "text-ink-faint hover:text-gold hover:bg-gold/10"
          }`}
        >
          {watchlisted ? <Star className="h-3.5 w-3.5" /> : <StarOff className="h-3.5 w-3.5" />}
        </button>
        {/* Re-analyze */}
        <Link
          href={`/?q=${encodeURIComponent(entry.ticker)}`}
          onClick={() => onReanalyze(entry.ticker)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[9px] font-bold transition-all duration-150"
          style={{
            background: "rgba(77,159,255,0.1)",
            border: "1px solid rgba(77,159,255,0.2)",
            color: "#4D9FFF",
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Re-analyze
        </Link>
      </div>
    </motion.div>
  );
}

// ── Stats bar ────────────────────────────────────────────────
function StatsBar({ entries }: { entries: HistoryEntry[] }) {
  const invest = entries.filter((e) => e.verdict === "INVEST").length;
  const pass = entries.filter((e) => e.verdict === "PASS").length;
  const avgConviction = entries.length
    ? entries.reduce((s, e) => s + e.convictionScore, 0) / entries.length
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Analyzed", value: entries.length.toString(), color: "text-data", icon: BarChart3 },
        { label: "INVEST", value: invest.toString(), color: "text-bull", icon: TrendingUp },
        { label: "PASS", value: pass.toString(), color: "text-bear", icon: TrendingDown },
        { label: "Avg Conviction", value: `${avgConviction.toFixed(1)}%`, color: "text-gold", icon: Star },
      ].map((s) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          className="glass-card p-3 text-center"
        >
          <s.icon className={`h-4 w-4 mx-auto mb-1.5 ${s.color}`} />
          <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
          <div className="mono-label text-[8px] mt-0.5">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function WatchlistPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "invest" | "pass">("all");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(getHistory());
    setLoaded(true);
  }, []);

  const filtered = entries.filter((e) => {
    if (filter === "invest") return e.verdict === "INVEST";
    if (filter === "pass") return e.verdict === "PASS";
    return true;
  });

  return (
    <main className="min-h-screen relative">
      <div className="aurora-bg" aria-hidden />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0"
        style={{ background: "linear-gradient(180deg, rgba(8,10,13,0.97), rgba(8,10,13,0.90))", backdropFilter: "blur(20px)", zIndex: 20 }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4D9FFF, #00FFA3)" }}>
            <Eye className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-ink text-sm leading-none">STOCKSAGE</div>
            <div className="mono-label text-[9px] mt-0.5">watchlist dashboard</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/about" className="font-mono text-[10px] text-ink-muted hover:text-ink transition-colors uppercase tracking-widest">About</Link>
          <Link href="/" className="flex items-center gap-1.5 font-mono text-[10px] text-data hover:text-data/80 transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-3 w-3" /> Oracle
          </Link>
        </nav>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10 space-y-8">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="h-5 w-5 text-data" />
            <h1 className="text-2xl font-black text-ink">Research Dashboard</h1>
          </div>
          <p className="text-sm text-ink-muted">
            All analyses run during this browser session, powered by localStorage.
          </p>
        </motion.div>

        {!loaded ? null : entries.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-data/10 border border-data/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-data/40" />
            </div>
            <h2 className="text-xl font-bold text-ink">No analyses yet</h2>
            <p className="text-sm text-ink-muted text-center max-w-sm">
              Run your first stock analysis from the main page. Results will appear here automatically.
            </p>
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-2"
              style={{ background: "linear-gradient(135deg, rgba(77,159,255,0.2), rgba(0,255,163,0.15))", border: "1px solid rgba(77,159,255,0.35)", color: "#4D9FFF" }}
            >
              <Eye className="h-4 w-4" /> Start Researching
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <StatsBar entries={entries} />

            {/* Filter tabs */}
            <div className="flex gap-2">
              {(["all", "invest", "pass"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-4 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all duration-200"
                  style={
                    filter === f
                      ? {
                          background: f === "invest" ? "rgba(0,255,163,0.15)" : f === "pass" ? "rgba(255,68,102,0.15)" : "rgba(77,159,255,0.15)",
                          border: `1px solid ${f === "invest" ? "rgba(0,255,163,0.4)" : f === "pass" ? "rgba(255,68,102,0.4)" : "rgba(77,159,255,0.4)"}`,
                          color: f === "invest" ? "#00FFA3" : f === "pass" ? "#FF4466" : "#4D9FFF",
                        }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#7A8299" }
                  }
                >
                  {f === "all" ? `All (${entries.length})` : f === "invest" ? `INVEST (${entries.filter((e)=>e.verdict==="INVEST").length})` : `PASS (${entries.filter((e)=>e.verdict==="PASS").length})`}
                </button>
              ))}
            </div>

            {/* Grid of cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map((entry) => (
                  <TickerCard
                    key={entry.id}
                    entry={entry}
                    onReanalyze={(ticker) => {
                      /* navigation handled by Link */
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-xl border border-border/30 bg-white/[0.02]">
              <Info className="h-3.5 w-3.5 text-ink-faint shrink-0 mt-0.5" />
              <p className="text-[10px] text-ink-faint leading-relaxed">
                Data is stored locally in your browser (localStorage) and never sent to any server. Clearing browser data will remove all saved analyses.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
