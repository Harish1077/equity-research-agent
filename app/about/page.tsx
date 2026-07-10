"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import {
  Eye, ArrowLeft, ChevronDown, ChevronUp,
  GitBranch, Brain, Database, BarChart3, Scale, Zap, Shield,
  ExternalLink, Code2, Cpu, Globe
} from "lucide-react";

// ── Pipeline node card ──────────────────────────────────────
const PIPELINE_NODES = [
  {
    step: "01",
    title: "Ticker Resolver",
    role: "resolver",
    color: "#00D4FF",
    bg: "rgba(0,212,255,0.08)",
    border: "rgba(0,212,255,0.2)",
    icon: Globe,
    model: "Rule-based + Yahoo Finance",
    temp: "—",
    description: "Converts free-text company names into exchange-listed ticker symbols using Yahoo Finance's search API. Supports ambiguous input like 'the iPhone company' or 'that EV startup Elon runs'.",
  },
  {
    step: "02",
    title: "Quant Auditor",
    role: "auditor",
    color: "#4D9FFF",
    bg: "rgba(77,159,255,0.08)",
    border: "rgba(77,159,255,0.2)",
    icon: Database,
    model: "Yahoo Finance v2 (no LLM)",
    temp: "—",
    description: "Fetches 16 hard financial metrics — P/E, D/E, ROE, FCF, Revenue, Net Income, Margins, Beta, 52-week range, and more. Deliberately no LLM involvement here to prevent hallucination of numbers.",
  },
  {
    step: "03",
    title: "Quant ML Suite",
    role: "quant",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.2)",
    icon: Cpu,
    model: "7 local ML models (no API call)",
    temp: "—",
    description: "Runs 7 machine learning classifiers (Logistic Regression, Random Forest, XGBoost, LightGBM, CatBoost, SVM, MLP), plus ARIMA/LSTM time-series forecasting, Reinforcement Learning simulation, and Transformer attention-weighted sentiment analysis — all computed locally on fundamentals.",
  },
  {
    step: "04",
    title: "Bull Agent",
    role: "bull",
    color: "#00FFA3",
    bg: "rgba(0,255,163,0.08)",
    border: "rgba(0,255,163,0.2)",
    icon: Zap,
    model: "Groq Llama 3.3 70B / Gemini 2.0 Flash",
    temp: "T=0.3",
    description: "Constructs the strongest possible investment thesis — revenue growth catalysts, competitive moats, market timing, insider alignment. It argues for the bull case as an advocate, not a neutral observer.",
  },
  {
    step: "05",
    title: "Bear Agent",
    role: "bear",
    color: "#FF4466",
    bg: "rgba(255,68,102,0.08)",
    border: "rgba(255,68,102,0.2)",
    icon: Shield,
    model: "Groq Llama 3.3 70B / Gemini 2.0 Flash",
    temp: "T=0.3",
    description: "Constructs the strongest possible counter-case — leverage risk, valuation excess, macro headwinds, competitive threats, regulatory overhang. It challenges every bull assumption relentlessly.",
  },
  {
    step: "06",
    title: "Synthesis Judge",
    role: "judge",
    color: "#FFD700",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.2)",
    icon: Scale,
    model: "Groq Llama 3.3 70B / Gemini 2.0 Flash",
    temp: "T=0.15",
    description: "The Oracle. Weighs both arguments against the raw quant data and ML ensemble signals. Uses a strict scoring rubric: data > narrative. Renders a binary INVEST or PASS verdict with a 0–100 conviction score and a structured investment memorandum.",
  },
];

// ── ML Model accordion ──────────────────────────────────────
const ML_MODELS = [
  { name: "Logistic Regression",    desc: "Linear log-odds classification on normalized P/E, D/E, ROE, growth, and margin features. Interpretable baseline." },
  { name: "Random Forest",          desc: "Ensemble of 5 simulated decision trees, each testing threshold conditions on different feature subsets and voting on BUY/PASS/SELL." },
  { name: "XGBoost",                desc: "Gradient boosting simulation with 4 boosting rounds, progressive residual correction on financial ratios." },
  { name: "LightGBM",               desc: "Leaf-wise gradient boosting with categorical feature handling for sector classification signals." },
  { name: "CatBoost",               desc: "Ordered boosting approach emphasizing tail risk via beta and debt-to-equity as primary splits." },
  { name: "SVM (RBF Kernel)",       desc: "Support Vector Machine with radial basis function kernel, non-linear decision boundary on the 7-feature space." },
  { name: "MLP (Neural Network)",   desc: "Multi-layer perceptron with 2 hidden layers, tanh activation, dropout regularization, ticker-seeded deterministic weights." },
];

// ── Tech stack ──────────────────────────────────────────────
const TECH_STACK = [
  { name: "Next.js 14",       role: "Framework",    color: "#E8EBF0" },
  { name: "LangGraph.js",     role: "Agent Orchestration", color: "#A855F7" },
  { name: "Groq API",         role: "Primary LLM",  color: "#00FFA3" },
  { name: "Google Gemini",    role: "Fallback LLM", color: "#4D9FFF" },
  { name: "Yahoo Finance v2", role: "Market Data",  color: "#FFD700" },
  { name: "Framer Motion",    role: "Animations",   color: "#FF4466" },
  { name: "Tailwind CSS v3",  role: "Styling",      color: "#00D4FF" },
  { name: "TypeScript 5",     role: "Language",     color: "#7A8299" },
];

// ── Animation helpers ───────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export default function AboutPage() {
  const [openModel, setOpenModel] = useState<number | null>(null);

  return (
    <main className="min-h-screen relative">
      <div className="aurora-bg" aria-hidden />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-border/60"
        style={{ background: "linear-gradient(180deg, rgba(8,10,13,0.95), rgba(8,10,13,0.85))", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4D9FFF, #00FFA3)" }}>
            <Eye className="h-4 w-4 text-black" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-ink text-sm leading-none">STOCKSAGE</div>
            <div className="mono-label text-[9px] mt-0.5">adversarial stock intelligence</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/watchlist" className="font-mono text-[10px] text-ink-muted hover:text-ink transition-colors uppercase tracking-widest">Watchlist</Link>
          <Link href="/" className="flex items-center gap-1.5 font-mono text-[10px] text-data hover:text-data/80 transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>
        </nav>
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-5 py-12 space-y-20">

        {/* Hero */}
        <motion.section {...fadeUp(0)} className="text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-data/30 bg-data/10">
            <GitBranch className="h-3.5 w-3.5 text-data" />
            <span className="mono-label text-data text-[9px]">Architecture Overview</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            How the{" "}
            <span className="shimmer-text" style={{ backgroundImage: "linear-gradient(90deg, #4D9FFF 0%, #00FFA3 50%, #4D9FFF 100%)", backgroundSize: "200% auto" }}>
              Sage
            </span>{" "}
            works
          </h1>
          <p className="text-ink-muted max-w-2xl mx-auto leading-relaxed">
            StockSage is an adversarial multi-agent research system. Every company goes through a 6-node LangGraph pipeline where specialized AI agents debate its investment merit before a synthesis judge renders a verdict based on hard data.
          </p>
        </motion.section>

        {/* Pipeline diagram */}
        <motion.section {...fadeUp(0.1)}>
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-muted mb-6 text-center">Research Pipeline</h2>
          <div className="space-y-4">
            {PIPELINE_NODES.map((node, i) => (
              <motion.div
                key={node.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="relative flex gap-4 rounded-2xl p-5"
                style={{ background: node.bg, border: `1px solid ${node.border}` }}
              >
                {/* Connector line */}
                {i < PIPELINE_NODES.length - 1 && (
                  <div className="absolute left-[2.25rem] top-full h-4 w-px z-10" style={{ background: node.color + "60" }} />
                )}

                {/* Step number */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center font-mono text-xs font-black"
                    style={{ background: node.color + "20", border: `1px solid ${node.color}40`, color: node.color }}>
                    {node.step}
                  </div>
                  <node.icon className="h-3.5 w-3.5 mt-1" style={{ color: node.color + "80" }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <h3 className="font-bold text-ink">{node.title}</h3>
                    <span className="px-2 py-0.5 rounded-full font-mono text-[9px] border"
                      style={{ color: node.color, background: node.color + "10", borderColor: node.color + "30" }}>
                      {node.role.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed mb-2">{node.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="font-mono text-[9px] text-ink-faint">Model: <span className="text-ink-muted">{node.model}</span></span>
                    {node.temp !== "—" && (
                      <span className="font-mono text-[9px] text-ink-faint">Temp: <span className="text-ink-muted">{node.temp}</span></span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ML Models accordion */}
        <motion.section {...fadeUp(0.2)}>
          <div className="flex items-center gap-3 mb-6">
            <Brain className="h-5 w-5 text-violet" />
            <h2 className="text-xl font-bold text-ink">ML Model Suite</h2>
          </div>
          <p className="text-sm text-ink-muted mb-6 leading-relaxed">
            All 7 classifiers run <strong className="text-ink">locally in Node.js</strong> with no external API call. They use deterministic seeded random functions so the same ticker always produces the same ML signals — making results reproducible and audit-friendly.
          </p>
          <div className="space-y-2">
            {ML_MODELS.map((model, i) => (
              <motion.div
                key={model.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid rgba(168,85,247,0.15)" }}
              >
                <button
                  onClick={() => setOpenModel(openModel === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-violet/5 transition-colors duration-150"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet" />
                    <span className="font-semibold text-sm text-ink">{model.name}</span>
                  </div>
                  {openModel === i
                    ? <ChevronUp className="h-4 w-4 text-ink-faint shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-ink-faint shrink-0" />
                  }
                </button>
                {openModel === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="px-4 pb-4 text-sm text-ink-muted leading-relaxed border-t border-violet/10"
                    style={{ paddingTop: "12px" }}
                  >
                    {model.desc}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Tech stack */}
        <motion.section {...fadeUp(0.3)}>
          <div className="flex items-center gap-3 mb-6">
            <Code2 className="h-5 w-5 text-data" />
            <h2 className="text-xl font-bold text-ink">Tech Stack</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TECH_STACK.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                whileHover={{ scale: 1.04, y: -2 }}
                className="glass-card p-3 text-center cursor-default"
              >
                <div className="font-bold text-xs mb-1" style={{ color: t.color }}>{t.name}</div>
                <div className="mono-label text-[8px]">{t.role}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Data sources */}
        <motion.section {...fadeUp(0.4)}>
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-5 w-5 text-gold" />
            <h2 className="text-xl font-bold text-ink">Data Sources</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                name: "Yahoo Finance v2",
                color: "#FFD700",
                description: "Real-time quotes, 16 fundamental metrics, historical OHLCV data for 180-day price history, and ticker search autocomplete. No API key required.",
                tag: "Free · No auth required",
              },
              {
                name: "Groq API",
                color: "#00FFA3",
                description: "Primary LLM provider. Uses Llama 3.3 70B for Bull, Bear, and Synthesis nodes. Free tier: 14,400 requests/day. Ultra-low latency inference.",
                tag: "Free tier · 14,400 req/day",
              },
              {
                name: "Google Gemini",
                color: "#4D9FFF",
                description: "Fallback LLM if Groq is unavailable. Uses gemini-2.0-flash. The system automatically falls back without user intervention.",
                tag: "Fallback LLM",
              },
              {
                name: "Local ML Engine",
                color: "#A855F7",
                description: "All 7 ML models run in-process in Node.js. Zero external calls, zero latency for ML inference, fully reproducible with seeded random.",
                tag: "No API · Zero latency",
              },
            ].map((src, i) => (
              <motion.div
                key={src.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="rounded-2xl p-5"
                style={{ background: src.color + "06", border: `1px solid ${src.color}20` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: src.color }}>{src.name}</span>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[8px]"
                    style={{ color: src.color, background: src.color + "15", border: `1px solid ${src.color}30` }}>
                    {src.tag}
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{src.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Disclaimer */}
        <motion.section {...fadeUp(0.5)} className="text-center pb-10">
          <div className="glass-card p-6 max-w-xl mx-auto">
            <div className="h-8 w-8 rounded-full bg-bear/10 border border-bear/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="h-4 w-4 text-bear" />
            </div>
            <h3 className="font-bold text-ink mb-2">Investment Disclaimer</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              StockSage is a research and educational tool. All verdicts, analyses, and ML model outputs are generated by AI agents and should not be construed as financial advice. Past performance data from Yahoo Finance is historical and not indicative of future results. Always consult a qualified financial advisor before making investment decisions.
            </p>
          </div>
        </motion.section>

      </div>
    </main>
  );
}
