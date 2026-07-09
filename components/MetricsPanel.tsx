"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, TrendingUp, TrendingDown, BrainCircuit, Zap } from "lucide-react";
import type { FinancialSnapshot } from "@/lib/graph/state";

interface MetricsPanelProps {
  fundamentals: FinancialSnapshot | null;
  riskFactors: string[];
  quantML: any;
}

function fmtLarge(n: number | null): string {
  if (n === null || n === undefined) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

function fmt(n: number | null, suffix = ""): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}${suffix}`;
}

function severityFromFactor(factor: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const lower = factor.toLowerCase();
  if (lower.includes("critical") || lower.includes("severe")) return "CRITICAL";
  if (lower.includes("high") || lower.includes("significant")) return "HIGH";
  if (lower.includes("low") || lower.includes("minor")) return "LOW";
  return "MEDIUM";
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; color: string; dot: string; bar: string }> = {
  LOW:      { bg: "rgba(0,255,163,0.07)",   border: "rgba(0,255,163,0.25)",   color: "#00FFA3", dot: "#00FFA3", bar: "#00FFA3" },
  MEDIUM:   { bg: "rgba(77,159,255,0.07)",  border: "rgba(77,159,255,0.25)",  color: "#4D9FFF", dot: "#4D9FFF", bar: "#4D9FFF" },
  HIGH:     { bg: "rgba(255,165,0,0.07)",   border: "rgba(255,165,0,0.25)",   color: "#FFA500", dot: "#FFA500", bar: "#FFA500" },
  CRITICAL: { bg: "rgba(255,68,102,0.07)",  border: "rgba(255,68,102,0.25)",  color: "#FF4466", dot: "#FF4466", bar: "#FF4466" },
};

// Animated count-up number
function CountUp({ value, duration = 1.2 }: { value: string; duration?: number }) {
  const isNumber = value !== "—" && !isNaN(parseFloat(value.replace(/[^0-9.-]/g, "")));
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {value}
    </motion.span>
  );
}

// Animated bar
function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1, ease: "easeOut", delay }}
        className="h-full rounded-full relative overflow-hidden"
        style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)", width: "60%" }}
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
        />
      </motion.div>
    </div>
  );
}

export default function MetricsPanel({ fundamentals, riskFactors, quantML }: MetricsPanelProps) {
  const [tab, setTab] = useState<"fundamentals" | "ml">("fundamentals");

  const metrics = fundamentals ? [
    { label: "Market Cap",     value: fmtLarge(fundamentals.marketCap) },
    { label: "P/E (TTM)",      value: fmt(fundamentals.peRatio) },
    { label: "Forward P/E",    value: fmt(fundamentals.forwardPE) },
    { label: "Debt/Equity",    value: fmt(fundamentals.debtToEquity) },
    { label: "Free Cash Flow", value: fmtLarge(fundamentals.freeCashFlow) },
    { label: "Revenue",        value: fmtLarge(fundamentals.totalRevenue) },
    { label: "Net Income",     value: fmtLarge(fundamentals.netIncome) },
    { label: "Rev Growth YoY", value: fmt(fundamentals.revenueGrowthYoY, "%") },
    { label: "Profit Margin",  value: fmt(fundamentals.profitMargin, "%") },
    { label: "ROE",            value: fmt(fundamentals.returnOnEquity, "%") },
    { label: "Beta",           value: fmt(fundamentals.beta) },
  ] : [];

  const TABS = [
    { id: "fundamentals" as const, label: "Hard Metrics", icon: Activity },
    { id: "ml" as const,           label: "ML Ensemble",  icon: BrainCircuit, disabled: !quantML },
  ];

  return (
    <div className="glass-panel flex flex-col h-full overflow-hidden">
      {/* Header tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {TABS.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            disabled={t.disabled}
            whileHover={!t.disabled ? { backgroundColor: "rgba(255,255,255,0.02)" } : undefined}
            className="flex-1 py-3 text-center flex items-center justify-center gap-1.5 transition-all duration-200 relative"
            style={{ opacity: t.disabled ? 0.35 : 1, cursor: t.disabled ? "not-allowed" : "pointer" }}
          >
            <t.icon className="h-3.5 w-3.5" style={{ color: tab === t.id ? "#4D9FFF" : "#7A8299" }} />
            <span className="font-mono text-[10px] uppercase tracking-widest font-bold"
              style={{ color: tab === t.id ? "#4D9FFF" : "#7A8299" }}>
              {t.label}
            </span>
            {tab === t.id && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(90deg, transparent, #4D9FFF, #00FFA3, transparent)" }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!fundamentals ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Zap className="h-6 w-6 text-ink-faint" />
            <p className="mono-label text-[9px] text-center">Awaiting quant data...</p>
          </div>
        ) : tab === "fundamentals" ? (
          <>
            {/* Company header */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <p className="text-xs font-semibold text-ink truncate">{fundamentals.companyName}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {fundamentals.revenueGrowthYoY !== null && fundamentals.revenueGrowthYoY >= 0 ? (
                  <TrendingUp className="h-4 w-4" style={{ color: "#00FFA3" }} />
                ) : (
                  <TrendingDown className="h-4 w-4" style={{ color: "#FF4466" }} />
                )}
                <span className="text-2xl font-black font-mono" style={{
                  background: "linear-gradient(90deg, #E8EBF0, #4D9FFF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {fundamentals.currency} {fmt(fundamentals.price)}
                </span>
              </div>
            </motion.div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, ease: "easeOut" }}
                  whileHover={{ scale: 1.03, borderColor: "rgba(77,159,255,0.3)" }}
                  className="rounded-xl px-3 py-2.5 cursor-default transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <p className="mono-label text-[9px] mb-0.5">{m.label}</p>
                  <p className="font-mono text-sm font-bold text-ink">
                    <CountUp value={m.value} />
                  </p>
                </motion.div>
              ))}
            </div>

            {/* 52-week range */}
            {fundamentals.fiftyTwoWeekLow !== null && fundamentals.fiftyTwoWeekHigh !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5"
              >
                <p className="mono-label mb-2 text-[9px]">52-Week Range</p>
                <div className="relative h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {/* Gradient fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, Math.max(0,
                        ((fundamentals.price! - fundamentals.fiftyTwoWeekLow) /
                          (fundamentals.fiftyTwoWeekHigh - fundamentals.fiftyTwoWeekLow || 1)) * 100
                      ))}%`,
                    }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #FF4466, #FFD700, #00FFA3)" }}
                  />
                  {/* Price cursor dot */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3 }}
                    className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 -translate-x-1/2"
                    style={{
                      background: "#4D9FFF",
                      borderColor: "#000",
                      boxShadow: "0 0 8px rgba(77,159,255,0.8)",
                      left: `${Math.min(100, Math.max(0,
                        ((fundamentals.price! - fundamentals.fiftyTwoWeekLow) /
                          (fundamentals.fiftyTwoWeekHigh - fundamentals.fiftyTwoWeekLow || 1)) * 100
                      ))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mono-label text-[9px] mt-2">
                  <span className="text-bear">{fmt(fundamentals.fiftyTwoWeekLow)}</span>
                  <span className="text-bull">{fmt(fundamentals.fiftyTwoWeekHigh)}</span>
                </div>
              </motion.div>
            )}

            {/* Risk heatmap */}
            {riskFactors.length > 0 && (
              <div className="mt-5">
                <p className="mono-label mb-3 text-[9px]">Risk Heatmap</p>
                <div className="space-y-2">
                  {riskFactors.map((factor, i) => {
                    const sev = severityFromFactor(factor);
                    const cfg = SEVERITY_CONFIG[sev];
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 + 0.3 }}
                        className="rounded-xl px-3 py-2.5 text-xs"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <motion.div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                          />
                          <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: cfg.color }}>
                            {sev}
                          </span>
                        </div>
                        <p className="text-ink-muted leading-snug text-[10px]">{factor}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ML Ensemble view */
          <>
            <div className="mb-4">
              <p className="mono-label text-[9px] mb-3">Model Consensus Signals</p>
              <div className="space-y-2">
                {quantML.models.map((model: any, i: number) => {
                  const isBuy  = model.signal === "BUY";
                  const isSell = model.signal === "SELL";
                  const signalColor = isBuy ? "#00FFA3" : isSell ? "#FF4466" : "#7A8299";
                  const signalBg    = isBuy ? "rgba(0,255,163,0.1)" : isSell ? "rgba(255,68,102,0.1)" : "rgba(255,255,255,0.05)";
                  const signalBd    = isBuy ? "rgba(0,255,163,0.3)" : isSell ? "rgba(255,68,102,0.3)" : "rgba(255,255,255,0.1)";

                  return (
                    <motion.div
                      key={model.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="rounded-xl p-3 flex flex-col gap-1.5 cursor-default"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-ink">{model.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-muted">
                            {(model.probability * 100).toFixed(1)}%
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-[9px] font-mono border font-bold"
                            style={{ color: signalColor, background: signalBg, borderColor: signalBd }}
                          >
                            {model.signal}
                          </span>
                        </div>
                      </div>
                      {/* Probability bar */}
                      <AnimatedBar value={model.probability * 100} color={signalColor} delay={i * 0.05} />
                      <p className="text-[10px] text-ink-muted leading-relaxed">{model.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="mono-label text-[9px] mb-3">Feature Importance</p>
              <div className="space-y-3">
                {quantML.featureImportance.map((item: any, i: number) => {
                  const hue = 200 + i * 25;
                  const barColor = `hsl(${hue}, 80%, 60%)`;
                  return (
                    <motion.div
                      key={item.feature}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.06 + 0.3 }}
                    >
                      <div className="flex justify-between items-center mb-1.5 text-[10px]">
                        <span className="text-ink-muted">{item.feature}</span>
                        <span className="font-mono font-bold text-ink">{item.importance}%</span>
                      </div>
                      <AnimatedBar value={item.importance} color={barColor} delay={i * 0.06 + 0.4} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
