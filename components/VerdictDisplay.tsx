"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldCheck, ShieldX, ScanLine, AlertTriangle, FileText, LineChart } from "lucide-react";
import type { Verdict } from "@/lib/graph/state";

interface VerdictDisplayProps {
  status: "idle" | "running" | "error" | "done";
  ticker: string;
  resolvedCompanyName: string;
  verdict: Verdict;
  convictionScore: number;
  analysis: string;
  errorMessage: string | null;
  quantML: any;
  onRetry?: () => void;
}

export default function VerdictDisplay({
  status,
  ticker,
  resolvedCompanyName,
  verdict,
  convictionScore,
  analysis,
  errorMessage,
  quantML,
  onRetry,
}: VerdictDisplayProps) {
  const [tab, setTab] = useState<"memorandum" | "quant">("memorandum");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (status === "idle") {
    return (
      <div className="glass-panel h-full flex flex-col items-center justify-center text-center px-8 py-16">
        <ScanLine className="h-10 w-10 text-ink-faint mb-4" />
        <h2 className="text-xl font-semibold text-ink-muted">The Verdict Engine is idle</h2>
        <p className="text-sm text-ink-faint mt-2 max-w-sm">
          Enter a company above. The Bull Case, the Bear Case, and the Quant Auditor will build their
          workstreams, and the synthesis engine will render a verdict.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass-panel h-full flex flex-col items-center justify-center text-center px-8 py-16 border-bear/30">
        <AlertTriangle className="h-10 w-10 text-bear mb-4" />
        <h2 className="text-xl font-semibold text-bear">Research Halted</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-md">{errorMessage}</p>
        {onRetry && (
          <motion.button
            onClick={onRetry}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, rgba(255,68,102,0.15), rgba(168,85,247,0.1))",
              border: "1px solid rgba(255,68,102,0.35)",
              color: "#FF4466",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            Try Again
          </motion.button>
        )}
      </div>
    );
  }

  const isInvest = verdict === "INVEST";

  // Helper to generate SVG paths for forecasting chart
  const renderForecastingChart = () => {
    if (!quantML || !quantML.timeSeries || quantML.timeSeries.length === 0) return null;

    const width = 600;
    const height = 180;
    const padding = 20;

    const data = quantML.timeSeries;

    // Filter valid actual and forecast values
    const actualPoints = data.filter((d: any) => d.actual !== null);
    const forecastPoints = data.filter((d: any) => d.forecast !== null);
    
    // Connect forecast to the last actual point
    const lastActual = actualPoints[actualPoints.length - 1];
    const fullForecastPoints = lastActual ? [lastActual, ...forecastPoints] : forecastPoints;

    // Determine min/max values for scaling
    const allPrices = data.flatMap((d: any) => [
      d.actual,
      d.forecast,
      d.lower,
      d.upper
    ]).filter((v: any) => v !== null && v !== undefined) as number[];

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const range = maxPrice - minPrice || 1;

    const minVal = Math.max(0, minPrice - range * 0.05);
    const maxVal = maxPrice + range * 0.05;
    const span = maxVal - minVal || 1;

    // Map data index to X coordinate
    const getX = (idx: number) => {
      return padding + (idx / (data.length - 1)) * (width - padding * 2);
    };

    // Map price to Y coordinate
    const getY = (price: number) => {
      return height - padding - ((price - minVal) / span) * (height - padding * 2);
    };

    // Build actual path
    let actualPath = "";
    actualPoints.forEach((d: any, idx: number) => {
      const x = getX(idx);
      const y = getY(d.actual);
      actualPath += (idx === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Build forecast path
    let forecastPath = "";
    const actualLength = actualPoints.length;
    fullForecastPoints.forEach((d: any, idx: number) => {
      const globalIdx = actualLength - (lastActual ? 1 : 0) + idx;
      const x = getX(globalIdx);
      const y = getY(d.forecast ?? d.actual);
      forecastPath += (idx === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Build uncertainty polygon path
    let envelopePath = "";
    if (forecastPoints.length > 0) {
      const upperPoints: string[] = [];
      const lowerPoints: string[] = [];
      
      forecastPoints.forEach((d: any, idx: number) => {
        const globalIdx = actualLength + idx;
        const x = getX(globalIdx);
        upperPoints.push(`${x.toFixed(1)},${getY(d.upper).toFixed(1)}`);
        lowerPoints.unshift(`${x.toFixed(1)},${getY(d.lower).toFixed(1)}`);
      });

      if (lastActual) {
        const startX = getX(actualLength - 1);
        const startY = getY(lastActual.actual);
        envelopePath = `M ${startX.toFixed(1)},${startY.toFixed(1)} L ` + upperPoints.join(" L ") + " L " + lowerPoints.join(" L ") + " Z";
      } else {
        envelopePath = "M " + upperPoints.join(" L ") + " L " + lowerPoints.join(" L ") + " Z";
      }
    }

    return (
      <div className="bg-white/[0.01] rounded-xl border border-border p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-xs font-semibold text-ink">LSTM & GRU 7-Day Forecast</h4>
            <p className="text-[10px] text-ink-muted">Deep learning sequential recurrence projection</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] mono-label">
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-data rounded-full inline-block" /> Actual</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-bull rounded-full inline-block" /> Forecast</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-3 bg-data/15 border border-data/30 rounded-sm inline-block" /> Confidence</span>
          </div>
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const y = getY(minVal + p * span);
              const price = minVal + p * span;
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                  <text x={padding - 5} y={y + 3} fill="rgba(255,255,255,0.25)" className="font-mono text-[8px]" textAnchor="end">
                    {price.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Shaded confidence envelope */}
            {envelopePath && (
              <path d={envelopePath} fill="rgba(59, 130, 246, 0.08)" stroke="rgba(59, 130, 246, 0.15)" strokeWidth={1} strokeDasharray="2,2" />
            )}

            {/* Actual historical line */}
            {actualPath && (
              <path d={actualPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinecap="round" />
            )}

            {/* Forecast line */}
            {forecastPath && (
              <path d={forecastPath} fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeDasharray="2,1" />
            )}

            {/* Interactive hover overlays */}
            {data.map((pt: any, idx: number) => {
              const x = getX(idx);
              const y = getY(pt.actual ?? pt.forecast);
              const isForecast = pt.forecast !== null;

              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={hoveredIndex === idx ? 5 : 2}
                    className={`transition-all duration-150 ${
                      isForecast 
                        ? "fill-bull stroke-surface-raised group-hover:r-5" 
                        : "fill-data stroke-surface-raised group-hover:r-5"
                    }`}
                  />
                  {hoveredIndex === idx && (
                    <foreignObject x={Math.min(width - 120, Math.max(0, x - 50))} y={Math.max(5, y - 50)} width="110" height="42">
                      <div className="bg-surface-raised/95 backdrop-blur-md border border-border rounded px-1.5 py-1 text-[9px] font-mono leading-tight shadow-lg">
                        <div className="text-ink-muted">{pt.date}</div>
                        <div className="font-semibold text-ink">
                          {isForecast ? `Forecast: $${pt.forecast}` : `Close: $${pt.actual}`}
                        </div>
                        {isForecast && (
                          <div className="text-[8px] text-ink-faint">
                            Range: {pt.lower} - {pt.upper}
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Helper to generate SVG paths for Reinforcement Learning chart
  const renderRLChart = () => {
    if (!quantML || !quantML.rlSimulation || !quantML.rlSimulation.steps || quantML.rlSimulation.steps.length === 0) return null;

    const width = 600;
    const height = 180;
    const padding = 20;

    const rl = quantML.rlSimulation;
    const data = rl.steps;

    const rlVals = data.map((d: any) => d.portfolioValue);
    const bhVals = data.map((d: any) => d.buyAndHoldValue);
    const allVals = [...rlVals, ...bhVals];

    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const span = maxVal - minVal || 1;

    const getX = (idx: number) => {
      return padding + (idx / (data.length - 1)) * (width - padding * 2);
    };

    const getY = (val: number) => {
      return height - padding - ((val - minVal) / span) * (height - padding * 2);
    };

    // Build RL path
    let rlPath = "";
    data.forEach((d: any, idx: number) => {
      const x = getX(idx);
      const y = getY(d.portfolioValue);
      rlPath += (idx === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Build B&H path
    let bhPath = "";
    data.forEach((d: any, idx: number) => {
      const x = getX(idx);
      const y = getY(d.buyAndHoldValue);
      bhPath += (idx === 0 ? "M " : " L ") + `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return (
      <div className="bg-white/[0.01] rounded-xl border border-border p-4 mt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-xs font-semibold text-ink">Q-Learning Agent Trading Simulation</h4>
            <p className="text-[10px] text-ink-muted">Reinforcement learning algorithm returns (90-day backtest)</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] mono-label">
            <span className="flex items-center gap-1 font-semibold text-bull">
              RL Return: {rl.finalRLReturn >= 0 ? "+" : ""}{rl.finalRLReturn}%
            </span>
            <span className="flex items-center gap-1 font-semibold text-ink-muted">
              B&H Return: {rl.finalBHReturn >= 0 ? "+" : ""}{rl.finalBHReturn}%
            </span>
          </div>
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const y = getY(minVal + p * span);
              const val = minVal + p * span;
              return (
                <g key={idx}>
                  <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
                  <text x={padding - 5} y={y + 3} fill="rgba(255,255,255,0.25)" className="font-mono text-[8px]" textAnchor="end">
                    ${Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Buy and Hold path */}
            {bhPath && (
              <path d={bhPath} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} strokeLinecap="round" />
            )}

            {/* RL Agent portfolio path */}
            {rlPath && (
              <path d={rlPath} fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            )}

            {/* Trade Action Markers */}
            {data.map((step: any, idx: number) => {
              const x = getX(idx);
              const y = getY(step.portfolioValue);
              const isBuy = step.action === "BUY";
              const isSell = step.action === "SELL";

              if (!isBuy && !isSell) return null;

              return (
                <g key={idx} className="group cursor-pointer">
                  <circle
                    cx={x}
                    cy={y}
                    r={4.5}
                    className={`stroke-surface-raised ${isBuy ? "fill-bull" : "fill-bear"}`}
                  />
                  <foreignObject x={x - 20} y={isBuy ? y + 8 : y - 25} width="40" height="15">
                    <div className={`text-[8px] font-mono font-bold text-center px-1 rounded border ${
                      isBuy 
                        ? "bg-bull/15 text-bull border-bull/30" 
                        : "bg-bear/15 text-bear border-bear/30"
                    }`}>
                      {step.action}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  // Helper to generate the Transformer self-attention grid
  const renderAttentionHeatmap = () => {
    if (!quantML || !quantML.sentimentAttention || !quantML.sentimentAttention.weights) return null;

    const { tokens, weights } = quantML.sentimentAttention;

    return (
      <div className="bg-white/[0.01] rounded-xl border border-border p-4 mt-4">
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-ink">Transformer Self-Attention Matrix</h4>
          <p className="text-[10px] text-ink-muted">Token correlation weights in retrieved Tavily news headlines</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6 items-center">
          {/* Heatmap Grid */}
          <div className="flex flex-col">
            <div className="flex">
              {/* Corner spacer */}
              <div className="w-16 shrink-0 h-8" />
              {/* Column labels */}
              <div className="flex-1 grid grid-cols-6 text-center">
                {tokens.map((token: string) => (
                  <span key={token} className="font-mono text-[7px] rotate-12 origin-left truncate pr-0.5 text-ink-muted font-bold capitalize">
                    {token}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Heatmap Rows */}
            <div className="space-y-1">
              {weights.map((row: any, rIdx: number) => (
                <div key={row.word} className="flex items-center">
                  {/* Row label */}
                  <span className="w-16 shrink-0 font-mono text-[8px] text-right pr-2 text-ink-muted font-semibold capitalize truncate">
                    {row.word}
                  </span>
                  
                  {/* Matrix cells */}
                  <div className="flex-1 grid grid-cols-6 gap-1">
                    {row.rowWeights.map((weight: number, cIdx: number) => {
                      // Calculate opacity based on attention weight
                      const intensity = Math.min(1.0, weight * 3);
                      
                      return (
                        <div
                          key={cIdx}
                          className="aspect-square rounded-sm relative group border border-white/[0.02]"
                          style={{
                            backgroundColor: `rgba(59, 130, 246, ${intensity})`
                          }}
                        >
                          {/* Cell weight tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-30 bg-surface-raised border border-border text-[8px] font-mono px-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                            {weight.toFixed(3)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attention Sentiment Summary */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-white/[0.01] p-3">
            <h5 className="mono-label !text-[9px] mb-1">Attention-Weighted Sentiment</h5>
            
            <div className="flex flex-col gap-2">
              {weights.map((item: any) => {
                const isBull = item.sentiment > 0;
                const valueText = isBull ? `+${item.sentiment.toFixed(1)}` : item.sentiment.toFixed(1);
                
                return (
                  <div key={item.word} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isBull ? "#10B981" : "#EF4444" }} />
                      <span className="font-mono capitalize text-ink-muted">{item.word}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-ink-faint text-[9px]">attn: {item.weight}</span>
                      <span className={`font-mono font-bold ${isBull ? "text-bull" : "text-bear"}`}>
                        {valueText}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isInvestColor = isInvest ? "border-bull/40 bg-bull/5 shadow-glow-bull" : "border-bear/40 bg-bear/5 shadow-glow-bear";

  return (
    <div className="glass-panel h-full overflow-y-auto relative">
      {status === "running" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <motion.div
            className="absolute left-0 right-0 h-32 pointer-events-none"
            style={{ background: "linear-gradient(180deg, transparent, rgba(77,159,255,0.06), transparent)" }}
            animate={{ top: ["-15%", "115%"] }}
            transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="p-6">
        <AnimatePresence mode="wait">
          {status === "running" ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center py-20 gap-4"
            >
              {/* Orbiting rings animation */}
              <div className="relative h-20 w-20 flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full border border-data/40"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{ borderTopColor: "rgba(77,159,255,0.9)" }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full border border-bull/30"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ borderTopColor: "rgba(0,255,163,0.8)" }}
                />
                <ScanLine className="h-7 w-7 text-data" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">
                  {resolvedCompanyName || ticker || "Researching"}
                </h2>
                <motion.p
                  className="mono-label mt-1.5 text-data"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >the oracle is deliberating...</motion.p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verdict"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* ── Headline verdict card ── */}
              <div
                className={`rounded-2xl p-7 mb-5 text-center relative overflow-hidden`}
                style={{
                  background: isInvest
                    ? "linear-gradient(135deg, rgba(0,255,163,0.07) 0%, rgba(0,0,0,0) 60%)"
                    : "linear-gradient(135deg, rgba(255,68,102,0.07) 0%, rgba(0,0,0,0) 60%)",
                  border: `1px solid ${isInvest ? "rgba(0,255,163,0.25)" : "rgba(255,68,102,0.25)"}`,
                  boxShadow: isInvest
                    ? "0 0 0 1px rgba(0,255,163,0.15), 0 0 40px rgba(0,255,163,0.08), inset 0 0 30px rgba(0,255,163,0.03)"
                    : "0 0 0 1px rgba(255,68,102,0.15), 0 0 40px rgba(255,68,102,0.08), inset 0 0 30px rgba(255,68,102,0.03)",
                }}
              >
                {/* Holographic shimmer overlay */}
                <motion.div
                  className="absolute inset-0 pointer-events-none opacity-0"
                  animate={{ opacity: [0, 0.15, 0], x: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.15) 50%, transparent 80%)" }}
                />
                {/* Pulse rings for INVEST */}
                {isInvest && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-2xl border border-bull/20 pointer-events-none"
                      animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-2xl border border-bull/10 pointer-events-none"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
                    />
                  </>
                )}

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mono-label mb-3 text-ink-muted"
                >
                  {resolvedCompanyName} · {ticker}
                </motion.p>

                {/* Main verdict */}
                <motion.div
                  className="flex items-center justify-center gap-4 mb-3"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 15 }}
                >
                  {isInvest ? (
                    <motion.div
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      <ShieldCheck className="h-12 w-12" style={{ color: "#00FFA3", filter: "drop-shadow(0 0 12px rgba(0,255,163,0.6))" }} />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      <ShieldX className="h-12 w-12" style={{ color: "#FF4466", filter: "drop-shadow(0 0 12px rgba(255,68,102,0.6))" }} />
                    </motion.div>
                  )}
                  <h1
                    className="text-6xl font-black tracking-tight"
                    style={isInvest
                      ? { color: "#00FFA3", textShadow: "0 0 20px rgba(0,255,163,0.6), 0 0 50px rgba(0,255,163,0.3)" }
                      : { color: "#FF4466", textShadow: "0 0 20px rgba(255,68,102,0.6), 0 0 50px rgba(255,68,102,0.3)" }
                    }
                  >
                    {verdict === "PASS" ? "PASS" : verdict}
                  </h1>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed"
                >
                  {isInvest ? (
                    <span><strong style={{ color: "#00FFA3" }}>INVEST</strong>: Bull case wins. Core margins, growth trends, and quant forecasts meet institutional thresholds.</span>
                  ) : (
                    <span><strong style={{ color: "#FF4466" }}>PASS (AVOID)</strong>: Adversarial analysis flagged structural risks, weak cash generation, or unfavorable technicals.</span>
                  )}
                </motion.p>

                {/* Conviction bar */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 max-w-xs mx-auto"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="mono-label text-[9px]">Conviction Score</span>
                    <motion.span
                      className="font-mono font-bold text-sm"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      style={{ color: isInvest ? "#00FFA3" : "#FF4466" }}
                    >
                      {convictionScore}/100
                    </motion.span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${convictionScore}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.7 }}
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: isInvest
                          ? "linear-gradient(90deg, #00FFA3, #4D9FFF)"
                          : "linear-gradient(90deg, #FF4466, #A855F7)",
                        boxShadow: isInvest ? "0 0 10px rgba(0,255,163,0.5)" : "0 0 10px rgba(255,68,102,0.5)",
                      }}
                    >
                      {/* Wave shimmer */}
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)", width: "60%" }}
                        animate={{ x: ["-100%", "300%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* ── Tabs Toggle ── */}
              {quantML && (
                <div className="flex rounded-xl p-1 mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {(["memorandum", "quant"] as const).map((t) => (
                    <motion.button
                      key={t}
                      onClick={() => setTab(t)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-2 text-[10px] font-bold tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
                      style={tab === t ? {
                        background: "linear-gradient(135deg, rgba(77,159,255,0.25), rgba(0,255,163,0.15))",
                        border: "1px solid rgba(77,159,255,0.35)",
                        color: "#4D9FFF",
                        boxShadow: "0 0 12px rgba(77,159,255,0.15)",
                      } : { color: "#7A8299" }}
                    >
                      {t === "memorandum" ? <FileText className="h-3 w-3" /> : <LineChart className="h-3 w-3" />}
                      {t === "memorandum" ? "Memorandum" : "Quant Analytics"}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── Content View ── */}
              <div className="min-h-[300px]">
                {tab === "memorandum" || !quantML ? (
                  <div className="oracle-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* LSTM price forecasting */}
                    {renderForecastingChart()}

                    {/* Reinforcement Learning simulator */}
                    {renderRLChart()}

                    {/* Transformer sentiment self-attention */}
                    {renderAttentionHeatmap()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
