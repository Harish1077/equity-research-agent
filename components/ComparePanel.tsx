"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, GitCompare, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import type { HistoryEntry } from "@/lib/history";
import type { Verdict } from "@/lib/graph/state";

interface ComparePanelProps {
  entryA: HistoryEntry;
  entryB: HistoryEntry;
  onClose: () => void;
}

// ── Color helpers ────────────────────────────────────────────
const VERDICT_COLOR: Record<Verdict, string> = {
  INVEST: "#00FFA3",
  PASS: "#FF4466",
  UNRESOLVED: "#7A8299",
};

function fmt(n: number | null, suffix = ""): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}${suffix}`;
}

function fmtLarge(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

// ── Radar chart (pure SVG, no deps) ─────────────────────────
interface RadarPoint { label: string; aVal: number; bVal: number; }

function RadarChart({ points, colorA, colorB }: { points: RadarPoint[]; colorA: string; colorB: string }) {
  const cx = 110, cy = 110, R = 85, n = points.length;

  const toXY = (index: number, val: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = val * R;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const axisPoints = points.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  const polyPath = (vals: number[]) =>
    vals.map((v, i) => {
      const { x, y } = toXY(i, v);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  const aVals = points.map((p) => p.aVal);
  const bVals = points.map((p) => p.bVal);

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[220px] mx-auto">
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={axisPoints.map(({ x, y }) => {
            const dx = (x - cx) * r, dy = (y - cy) * r;
            return `${cx + dx},${cy + dy}`;
          }).join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {axisPoints.map(({ x, y }, i) => (
        <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}

      {/* B polygon */}
      <path d={polyPath(bVals)} fill={`${colorB}20`} stroke={colorB} strokeWidth="1.5" strokeLinejoin="round" />
      {/* A polygon */}
      <path d={polyPath(aVals)} fill={`${colorA}20`} stroke={colorA} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Dots */}
      {aVals.map((v, i) => {
        const { x, y } = toXY(i, v);
        return <circle key={`a${i}`} cx={x} cy={y} r="3" fill={colorA} />;
      })}
      {bVals.map((v, i) => {
        const { x, y } = toXY(i, v);
        return <circle key={`b${i}`} cx={x} cy={y} r="3" fill={colorB} />;
      })}

      {/* Labels */}
      {points.map(({ label }, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + (R + 18) * Math.cos(angle);
        const ly = cy + (R + 18) * Math.sin(angle);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="7"
            fill="rgba(255,255,255,0.4)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Metric row ───────────────────────────────────────────────
function MetricRow({
  label,
  aVal,
  bVal,
  rawA,
  rawB,
  higherIsBetter,
  colorA,
  colorB,
}: {
  label: string;
  aVal: string;
  bVal: string;
  rawA: number | null;
  rawB: number | null;
  higherIsBetter: boolean;
  colorA: string;
  colorB: string;
}) {
  const aWins =
    rawA !== null && rawB !== null
      ? higherIsBetter
        ? rawA > rawB
        : rawA < rawB
      : null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30">
      <span className="text-[10px] text-ink-muted w-28 shrink-0">{label}</span>
      <span
        className="flex-1 text-center font-mono text-xs font-bold transition-colors"
        style={{ color: aWins === true ? colorA : aWins === false ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)" }}
      >
        {aVal} {aWins === true && "↑"}
      </span>
      <span
        className="flex-1 text-center font-mono text-xs font-bold transition-colors"
        style={{ color: aWins === false ? colorB : aWins === true ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)" }}
      >
        {bVal} {aWins === false && "↑"}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export default function ComparePanel({ entryA, entryB, onClose }: ComparePanelProps) {
  const colorA = VERDICT_COLOR[entryA.verdict];
  const colorB = VERDICT_COLOR[entryB.verdict];

  const fA = entryA.fundamentals;
  const fB = entryB.fundamentals;

  // Normalize to [0,1] for radar chart
  const norm = (val: number | null, min: number, max: number) =>
    val === null ? 0.5 : Math.max(0, Math.min(1, (val - min) / (max - min)));

  const radarPoints = [
    { label: "ROE",    aVal: norm(fA?.returnOnEquity ?? null, 0, 50), bVal: norm(fB?.returnOnEquity ?? null, 0, 50) },
    { label: "Growth", aVal: norm(fA?.revenueGrowthYoY ?? null, -20, 50), bVal: norm(fB?.revenueGrowthYoY ?? null, -20, 50) },
    { label: "Margin", aVal: norm(fA?.profitMargin ?? null, -10, 40), bVal: norm(fB?.profitMargin ?? null, -10, 40) },
    { label: "FCF",    aVal: norm(fA?.freeCashFlow ? Math.log10(Math.abs(fA.freeCashFlow) + 1) : null, 0, 12), bVal: norm(fB?.freeCashFlow ? Math.log10(Math.abs(fB.freeCashFlow) + 1) : null, 0, 12) },
    { label: "Value",  aVal: fA?.peRatio ? norm(1 / fA.peRatio, 0, 0.08) : 0.5, bVal: fB?.peRatio ? norm(1 / fB.peRatio, 0, 0.08) : 0.5 },
    { label: "Safety", aVal: norm(fA?.beta ? 1 - fA.beta / 3 : null, 0, 1), bVal: norm(fB?.beta ? 1 - fB.beta / 3 : null, 0, 1) },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-60 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(10,13,18,0.98), rgba(6,8,12,0.99))",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-violet" />
              <span className="font-semibold text-sm text-ink">Side-by-Side Comparison</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Ticker headers */}
          <div className="grid grid-cols-2 gap-px p-4 border-b border-border/40">
            {[entryA, entryB].map((e, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
                style={{
                  background: `${i === 0 ? colorA : colorB}10`,
                  border: `1px solid ${i === 0 ? colorA : colorB}30`,
                }}
              >
                <span className="font-mono text-xl font-black" style={{ color: i === 0 ? colorA : colorB }}>
                  {e.ticker}
                </span>
                <span className="text-[10px] text-ink-muted text-center">{e.resolvedCompanyName}</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold border"
                  style={{
                    color: i === 0 ? colorA : colorB,
                    background: `${i === 0 ? colorA : colorB}15`,
                    borderColor: `${i === 0 ? colorA : colorB}40`,
                  }}
                >
                  {e.verdict} · {e.convictionScore.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>

          {/* Radar chart */}
          <div className="p-4 border-b border-border/30">
            <p className="mono-label text-[9px] text-center mb-3">6-Axis Financial Radar</p>
            <RadarChart points={radarPoints} colorA={colorA} colorB={colorB} />
            <div className="flex items-center justify-center gap-6 mt-2">
              {[entryA, entryB].map((e, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="h-2 w-4 rounded-sm" style={{ background: i === 0 ? colorA : colorB }} />
                  <span className="font-mono text-[9px] text-ink-muted">{e.ticker}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics table */}
          <div className="p-4">
            <div className="flex items-center gap-3 pb-2 border-b border-border/60 mb-1">
              <span className="text-[10px] text-ink-faint w-28 shrink-0">METRIC</span>
              <span className="flex-1 text-center font-mono text-[10px] font-bold" style={{ color: colorA }}>{entryA.ticker}</span>
              <span className="flex-1 text-center font-mono text-[10px] font-bold" style={{ color: colorB }}>{entryB.ticker}</span>
            </div>
            {[
              { label: "Price",        aVal: fmt(fA?.price ?? null, " "+( fA?.currency||"")), bVal: fmt(fB?.price ?? null, " "+(fB?.currency||"")), rawA: fA?.price ?? null, rawB: fB?.price ?? null, higher: true },
              { label: "Market Cap",   aVal: fmtLarge(fA?.marketCap ?? null), bVal: fmtLarge(fB?.marketCap ?? null), rawA: fA?.marketCap ?? null, rawB: fB?.marketCap ?? null, higher: true },
              { label: "P/E Ratio",    aVal: fmt(fA?.peRatio ?? null), bVal: fmt(fB?.peRatio ?? null), rawA: fA?.peRatio ?? null, rawB: fB?.peRatio ?? null, higher: false },
              { label: "ROE %",        aVal: fmt(fA?.returnOnEquity ?? null, "%"), bVal: fmt(fB?.returnOnEquity ?? null, "%"), rawA: fA?.returnOnEquity ?? null, rawB: fB?.returnOnEquity ?? null, higher: true },
              { label: "Revenue Gr.",  aVal: fmt(fA?.revenueGrowthYoY ?? null, "%"), bVal: fmt(fB?.revenueGrowthYoY ?? null, "%"), rawA: fA?.revenueGrowthYoY ?? null, rawB: fB?.revenueGrowthYoY ?? null, higher: true },
              { label: "Profit Margin",aVal: fmt(fA?.profitMargin ?? null, "%"), bVal: fmt(fB?.profitMargin ?? null, "%"), rawA: fA?.profitMargin ?? null, rawB: fB?.profitMargin ?? null, higher: true },
              { label: "D/E Ratio",    aVal: fmt(fA?.debtToEquity ?? null), bVal: fmt(fB?.debtToEquity ?? null), rawA: fA?.debtToEquity ?? null, rawB: fB?.debtToEquity ?? null, higher: false },
              { label: "Free CF",      aVal: fmtLarge(fA?.freeCashFlow ?? null), bVal: fmtLarge(fB?.freeCashFlow ?? null), rawA: fA?.freeCashFlow ?? null, rawB: fB?.freeCashFlow ?? null, higher: true },
              { label: "Beta",         aVal: fmt(fA?.beta ?? null), bVal: fmt(fB?.beta ?? null), rawA: fA?.beta ?? null, rawB: fB?.beta ?? null, higher: false },
              { label: "Conviction",   aVal: `${entryA.convictionScore.toFixed(1)}%`, bVal: `${entryB.convictionScore.toFixed(1)}%`, rawA: entryA.convictionScore, rawB: entryB.convictionScore, higher: true },
            ].map((m) => (
              <MetricRow
                key={m.label}
                label={m.label}
                aVal={m.aVal}
                bVal={m.bVal}
                rawA={m.rawA}
                rawB={m.rawB}
                higherIsBetter={m.higher}
                colorA={colorA}
                colorB={colorB}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
