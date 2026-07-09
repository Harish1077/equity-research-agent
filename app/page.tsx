"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Zap, TrendingUp, BarChart3, Shield, RefreshCw, TerminalSquare, LayoutDashboard, Activity } from "lucide-react";
import NeuralSearch from "@/components/NeuralSearch";
import LiveTerminal, { type AgentLogEntry } from "@/components/LiveTerminal";
import VerdictDisplay from "@/components/VerdictDisplay";
import MetricsPanel from "@/components/MetricsPanel";
import type { FinancialSnapshot, Verdict } from "@/lib/graph/state";

type RunStatus = "idle" | "running" | "error" | "done";

interface DashboardState {
  status: RunStatus;
  ticker: string;
  resolvedCompanyName: string;
  fundamentals: FinancialSnapshot | null;
  quantML: any;
  verdict: Verdict;
  convictionScore: number;
  riskFactors: string[];
  analysis: string;
  errorMessage: string | null;
  agentLog: AgentLogEntry[];
  activeAgent: AgentLogEntry["agent"] | null;
}

const INITIAL_STATE: DashboardState = {
  status: "idle",
  ticker: "",
  resolvedCompanyName: "",
  fundamentals: null,
  quantML: null,
  verdict: "UNRESOLVED",
  convictionScore: 0,
  riskFactors: [],
  analysis: "",
  errorMessage: null,
  agentLog: [],
  activeAgent: null,
};

// ── Particle Canvas Component ──────────────────────────────────
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5
        ? `rgba(77,159,255,${Math.random() * 0.5 + 0.2})`
        : `rgba(0,255,163,${Math.random() * 0.4 + 0.1})`,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });

      // draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(77,159,255,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}

// ── Ticker Strip ───────────────────────────────────────────────
const TICKER_DATA = [
  { sym: "AAPL", val: "193.42", chg: "+1.2%" },
  { sym: "MSFT", val: "421.88", chg: "+0.8%" },
  { sym: "NVDA", val: "127.25", chg: "+3.1%" },
  { sym: "TSLA", val: "248.50", chg: "-1.4%" },
  { sym: "META", val: "512.10", chg: "+2.0%" },
  { sym: "AMZN", val: "189.75", chg: "+0.6%" },
  { sym: "GOOG", val: "177.40", chg: "+1.1%" },
  { sym: "BRK.B", val: "445.20", chg: "+0.3%" },
  { sym: "JPM",  val: "198.60", chg: "-0.2%" },
  { sym: "V",    val: "278.90", chg: "+0.9%" },
];

function TickerStrip() {
  const items = [...TICKER_DATA, ...TICKER_DATA];
  return (
    <div className="overflow-hidden border-t border-border/50 bg-surface/40 backdrop-blur-sm shrink-0">
      <div className="flex items-center">
        {/* Disclaimer label */}
        <div className="shrink-0 px-3 border-r border-border/50 flex items-center h-full">
          <span className="font-mono text-[8px] text-ink-faint uppercase tracking-widest whitespace-nowrap">Indicative</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center animate-ticker-slide whitespace-nowrap py-1.5">
            {items.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5">
                <span className="font-mono text-[10px] text-ink-muted tracking-widest">{t.sym}</span>
                <span className="font-mono text-[10px] text-ink">{t.val}</span>
                <span className={`font-mono text-[10px] ${t.chg.startsWith("+") ? "text-bull" : "text-bear"}`}>
                  {t.chg}
                </span>
                <span className="text-border-strong mx-1">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Floating stat badges ───────────────────────────────────────
const STATS = [
  { icon: BarChart3, label: "Companies Analyzed", val: "2,841", color: "text-data" },
  { icon: TrendingUp, label: "INVEST Verdicts", val: "38%",   color: "text-bull" },
  { icon: Shield,     label: "PASS Verdicts",   val: "62%",   color: "text-bear" },
  { icon: Zap,        label: "Avg Analysis Time", val: "12s", color: "text-gold" },
];

export default function Home() {
  const [state, setState] = useState<DashboardState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  // Mobile panel tabs: "feed" | "verdict" | "metrics"
  const [mobileTab, setMobileTab] = useState<"feed" | "verdict" | "metrics">("verdict");

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resetToHome = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
    setMobileTab("verdict");
  }, []);

  const runResearch = useCallback(async (companyQuery: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...INITIAL_STATE, status: "running" });
    setMobileTab("verdict");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyQuery }),
        signal: controller.signal,
      });
      if (!res.body) throw new Error("No response stream from research engine.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          applyEvent(JSON.parse(line));
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: err.message || "Connection to the research engine failed.",
      }));
    }
  }, []);

  const applyEvent = (event: any) => {
    setState((prev) => {
      switch (event.type) {
        case "log": {
          const entry: AgentLogEntry = event.entry;
          return { ...prev, agentLog: [...prev.agentLog, entry], activeAgent: entry.agent };
        }
        case "state": {
          const patch = event.patch;
          return {
            ...prev,
            ticker: patch.ticker || prev.ticker,
            resolvedCompanyName: patch.resolvedCompanyName || prev.resolvedCompanyName,
            fundamentals: patch.fundamentals ?? prev.fundamentals,
            quantML: patch.quantML ?? prev.quantML,
          };
        }
        case "final": {
          const s = event.state;
          return {
            ...prev,
            status: "done",
            activeAgent: null,
            ticker: s?.ticker || prev.ticker,
            resolvedCompanyName: s?.resolvedCompanyName || prev.resolvedCompanyName,
            fundamentals: s?.fundamentals ?? prev.fundamentals,
            quantML: s?.quantML ?? prev.quantML,
            verdict: s?.verdict || "PASS",
            convictionScore: s?.convictionScore ?? 0,
            riskFactors: s?.riskFactors ?? [],
            analysis: s?.analysis || "",
          };
        }
        case "error":
          return { ...prev, status: "error", activeAgent: null, errorMessage: event.message };
        default:
          return prev;
      }
    });
  };

  const hasStarted = state.status !== "idle";

  return (
    <main className="h-screen flex flex-col overflow-hidden relative">
      {/* Aurora background */}
      <div className="aurora-bg" aria-hidden />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-border/60 shrink-0"
        style={{ background: "linear-gradient(180deg, rgba(8,10,13,0.95) 0%, rgba(8,10,13,0.85) 100%)", backdropFilter: "blur(20px)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            className="relative h-8 w-8 rounded-xl flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.1 }}
            style={{ background: "linear-gradient(135deg, #4D9FFF, #00FFA3)" }}
          >
            <Eye className="h-4 w-4 text-black relative z-10" />
            <motion.div
              className="absolute inset-0 opacity-0"
              whileHover={{ opacity: 1 }}
              style={{ background: "linear-gradient(135deg, #00FFA3, #4D9FFF)" }}
            />
          </motion.div>
          <div>
            <div className="font-bold tracking-tight text-ink text-sm leading-none">EQUITY ORACLE</div>
            <div className="mono-label text-[9px] mt-0.5 hidden sm:block">decision intelligence engine</div>
          </div>
        </div>

        {/* Compact search */}
        {hasStarted && (
          <div className="w-full max-w-md hidden md:block mx-4">
            <NeuralSearch onSubmit={runResearch} isRunning={state.status === "running"} compact />
          </div>
        )}

        {/* Panel toggles */}
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          {state.status === "running" && (
            <motion.div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-data/30 bg-data/10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="h-1.5 w-1.5 rounded-full bg-data"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="mono-label text-data text-[9px]">Analyzing</span>
            </motion.div>
          )}
          {hasStarted && (
            <>
              {/* Desktop panel toggles */}
              {isDesktop && (["Feed", "Metrics"] as const).map((label, i) => {
                const active = i === 0 ? showLeft : showRight;
                const toggle = i === 0 ? () => setShowLeft(!showLeft) : () => setShowRight(!showRight);
                return (
                  <motion.button
                    key={label}
                    onClick={toggle}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`hidden md:block px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-200 ${
                      active
                        ? "bg-data/15 border-data/40 text-data shadow-[0_0_12px_rgba(77,159,255,0.15)]"
                        : "bg-transparent border-border text-ink-muted hover:text-ink hover:bg-white/[0.03]"
                    }`}
                  >
                    {label}
                  </motion.button>
                );
              })}
              {/* New Analysis button */}
              <motion.button
                onClick={resetToHome}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[10px] font-mono font-bold tracking-wider uppercase text-ink-muted hover:text-ink hover:border-data/40 hover:bg-data/5 transition-all duration-200"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">New</span>
              </motion.button>
            </>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <AnimatePresence mode="wait">
        {!hasStarted ? (
          // ── HERO ──────────────────────────────────────────
          <motion.div
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex-1 relative flex flex-col items-center justify-center px-6 overflow-hidden"
          >
            <ParticleField />

            <div className="relative z-10 flex flex-col items-center max-w-3xl w-full">
              {/* Glowing orb behind headline */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(77,159,255,0.06) 0%, transparent 70%)" }} />

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-data/30 bg-data/10 backdrop-blur-sm"
              >
                <motion.div className="h-1.5 w-1.5 rounded-full bg-bull"
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                <span className="mono-label text-data text-[9px]">AI-Powered · Adversarial Research Engine</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl sm:text-6xl font-black tracking-tight text-center mb-4 leading-[1.1]"
              >
                The debate decides.{" "}
                <span
                  className="shimmer-text"
                  style={{ backgroundImage: "linear-gradient(90deg, #4D9FFF 0%, #00FFA3 50%, #4D9FFF 100%)", backgroundSize: "200% auto" }}
                >
                  The data rules.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-ink-muted text-center max-w-xl mb-10 leading-relaxed"
              >
                Every company is put through an adversarial hearing — a Bull Case, a Bear Case,
                and a disciplined synthesis engine that only rules{" "}
                <span className="text-bull font-semibold">INVEST</span> when the numbers back the story.
              </motion.p>
              {/* Disclaimer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-[10px] text-ink-faint text-center max-w-md -mt-6 mb-4"
              >
                ⚠️ For informational purposes only. Not financial advice.
              </motion.p>

              {/* Search */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full"
              >
                <NeuralSearch onSubmit={runResearch} isRunning={false} />
              </motion.div>

              {/* Stat badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10 w-full"
              >
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    className="glass-card p-3 text-center cursor-default"
                  >
                    <s.icon className={`h-4 w-4 mx-auto mb-1.5 ${s.color}`} />
                    <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                    <div className="mono-label text-[8px] mt-0.5">{s.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>

        ) : (
          // ── WAR ROOM ──────────────────────────────────────
          <motion.div
            key="warroom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="flex-1 min-h-0 overflow-hidden relative z-10"
          >
            {isDesktop ? (
              // ── Desktop: 3-column grid ──
              <div
                className="h-full grid gap-3 p-3"
                style={{
                  gridTemplateColumns: `${showLeft ? "260px" : ""} 1fr ${showRight ? "280px" : ""}`.trim()
                }}
              >
                {showLeft && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full min-h-0 overflow-hidden"
                  >
                    <LiveTerminal entries={state.agentLog} activeAgent={state.activeAgent} />
                  </motion.div>
                )}
                <div className="h-full min-h-0 overflow-hidden">
                  <VerdictDisplay
                    status={state.status}
                    ticker={state.ticker}
                    resolvedCompanyName={state.resolvedCompanyName}
                    verdict={state.verdict}
                    convictionScore={state.convictionScore}
                    analysis={state.analysis}
                    errorMessage={state.errorMessage}
                    quantML={state.quantML}
                    onRetry={resetToHome}
                  />
                </div>
                {showRight && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full min-h-0 overflow-hidden"
                  >
                    <MetricsPanel
                      fundamentals={state.fundamentals}
                      riskFactors={state.riskFactors}
                      quantML={state.quantML}
                    />
                  </motion.div>
                )}
              </div>
            ) : (
              // ── Mobile: tabbed single-panel view ──
              <div className="h-full flex flex-col">
                {/* Mobile tab bar */}
                <div className="flex shrink-0 border-b border-border/50 bg-surface/60 backdrop-blur-sm">
                  {([
                    { id: "feed" as const,    label: "Feed",    icon: TerminalSquare },
                    { id: "verdict" as const, label: "Verdict", icon: LayoutDashboard },
                    { id: "metrics" as const, label: "Metrics", icon: Activity },
                  ]).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setMobileTab(t.id)}
                      className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-mono font-bold uppercase tracking-widest transition-all duration-200 ${
                        mobileTab === t.id
                          ? "text-data border-b-2 border-data bg-data/5"
                          : "text-ink-muted border-b-2 border-transparent"
                      }`}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Mobile panel content */}
                <div className="flex-1 min-h-0 overflow-hidden p-2">
                  <AnimatePresence mode="wait">
                    {mobileTab === "feed" && (
                      <motion.div key="m-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <LiveTerminal entries={state.agentLog} activeAgent={state.activeAgent} />
                      </motion.div>
                    )}
                    {mobileTab === "verdict" && (
                      <motion.div key="m-verdict" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <VerdictDisplay
                          status={state.status}
                          ticker={state.ticker}
                          resolvedCompanyName={state.resolvedCompanyName}
                          verdict={state.verdict}
                          convictionScore={state.convictionScore}
                          analysis={state.analysis}
                          errorMessage={state.errorMessage}
                          quantML={state.quantML}
                          onRetry={resetToHome}
                        />
                      </motion.div>
                    )}
                    {mobileTab === "metrics" && (
                      <motion.div key="m-metrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                        <MetricsPanel
                          fundamentals={state.fundamentals}
                          riskFactors={state.riskFactors}
                          quantML={state.quantML}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticker strip at bottom */}
      <TickerStrip />
    </main>
  );
}
