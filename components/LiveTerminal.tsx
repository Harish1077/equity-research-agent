"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Filter } from "lucide-react";

export interface AgentLogEntry {
  agent: "resolver" | "auditor" | "quant" | "bull" | "bear" | "judge" | "system";
  message: string;
  timestamp: number;
}

interface LiveTerminalProps {
  entries: AgentLogEntry[];
  activeAgent: AgentLogEntry["agent"] | null;
}

const AGENT_CONFIG: Record<AgentLogEntry["agent"], { label: string; color: string; bg: string; border: string; dot: string }> = {
  resolver: { label: "TICKER",    color: "text-cyan",    bg: "bg-cyan/10",    border: "border-cyan/30",    dot: "#00D4FF" },
  auditor:  { label: "AUDITOR",   color: "text-data",    bg: "bg-data/10",    border: "border-data/30",    dot: "#4D9FFF" },
  quant:    { label: "QUANT ML",  color: "text-violet",  bg: "bg-violet/10",  border: "border-violet/30",  dot: "#A855F7" },
  bull:     { label: "BULL CASE", color: "text-bull",    bg: "bg-bull/10",    border: "border-bull/30",    dot: "#00FFA3" },
  bear:     { label: "BEAR CASE", color: "text-bear",    bg: "bg-bear/10",    border: "border-bear/30",    dot: "#FF4466" },
  judge:    { label: "SYNTHESIS", color: "text-gold",    bg: "bg-gold/10",    border: "border-gold/30",    dot: "#FFD700" },
  system:   { label: "SYSTEM",    color: "text-ink-muted", bg: "bg-white/5",  border: "border-border",     dot: "#7A8299" },
};

// ── Pipeline stages for progress bar ─────────────────────────
const PIPELINE_STAGES: Array<{ key: AgentLogEntry["agent"]; label: string; short: string }> = [
  { key: "resolver", label: "Ticker Resolver", short: "TICKER" },
  { key: "auditor",  label: "Quant Auditor",   short: "AUDIT" },
  { key: "quant",    label: "ML Suite",         short: "ML" },
  { key: "bull",     label: "Bull Agent",       short: "BULL" },
  { key: "bear",     label: "Bear Agent",       short: "BEAR" },
  { key: "judge",    label: "Synthesis Judge",  short: "JUDGE" },
];

// ── Typewriter hook ───────────────────────────────────────────
function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
}

// ── Terminal entry ────────────────────────────────────────────
function TerminalEntry({ entry, isLast }: { entry: AgentLogEntry; isLast: boolean }) {
  const cfg = AGENT_CONFIG[entry.agent];
  const text = useTypewriter(isLast ? entry.message : "", 14);
  const displayed = isLast ? text : entry.message;

  const ts = new Date(entry.timestamp);
  const timeStr = `${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}:${String(ts.getSeconds()).padStart(2,"0")}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="group"
    >
      <div className={`flex gap-2 p-2.5 rounded-lg border mb-1.5 ${cfg.bg} ${cfg.border} overflow-hidden`}>
        {/* Left accent bar */}
        <div
          className="w-0.5 rounded-full shrink-0 self-stretch min-h-[16px]"
          style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`font-mono text-[9px] font-bold tracking-widest ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="font-mono text-[9px] text-ink-faint">{timeStr}</span>
          </div>
          <p className="font-mono text-[10px] text-ink-muted leading-relaxed break-words">
            {displayed}
            {isLast && displayed.length < entry.message.length && (
              <span className="terminal-cursor" />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Pipeline progress bar ─────────────────────────────────────
function PipelineProgress({
  entries,
  activeAgent,
}: {
  entries: AgentLogEntry[];
  activeAgent: AgentLogEntry["agent"] | null;
}) {
  // Determine which stages have fired
  const firedAgents = new Set(entries.map((e) => e.agent));

  // Compute first/last timestamp per stage for elapsed time
  const stageTiming: Record<string, { start: number; end: number }> = {};
  for (const e of entries) {
    if (!stageTiming[e.agent]) stageTiming[e.agent] = { start: e.timestamp, end: e.timestamp };
    stageTiming[e.agent].end = e.timestamp;
  }

  const activeIdx = PIPELINE_STAGES.findIndex((s) => s.key === activeAgent);

  return (
    <div className="px-3 py-2 border-b border-border/40 shrink-0">
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, i) => {
          const done   = firedAgents.has(stage.key) && stage.key !== activeAgent;
          const active = stage.key === activeAgent;
          const pending = !done && !active;
          const elapsed = done && stageTiming[stage.key]
            ? stageTiming[stage.key].end - stageTiming[stage.key].start
            : null;
          const cfg = AGENT_CONFIG[stage.key];

          return (
            <div key={stage.key} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                {/* Node */}
                <motion.div
                  className="h-4 w-full rounded flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: done
                      ? `${cfg.dot}20`
                      : active
                      ? `${cfg.dot}15`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${done || active ? `${cfg.dot}50` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {active && (
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(90deg, transparent, ${cfg.dot}25, transparent)` }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <span
                    className="font-mono text-[7px] font-bold relative z-10 truncate px-0.5"
                    style={{
                      color: done ? cfg.dot : active ? cfg.dot : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {done ? "✓" : stage.short}
                  </span>
                </motion.div>
                {/* Elapsed */}
                {elapsed !== null && (
                  <span className="font-mono text-[7px] text-ink-faint">
                    {elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>

              {/* Connector */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className="h-px w-2 shrink-0 mt-[-6px]"
                  style={{
                    background: i < activeIdx || (done && !active)
                      ? PIPELINE_STAGES[i].key === activeAgent ? cfg.dot : `${cfg.dot}60`
                      : "rgba(255,255,255,0.06)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main terminal ─────────────────────────────────────────────
export default function LiveTerminal({ entries, activeAgent }: LiveTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<AgentLogEntry["agent"] | "all">("all");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  const handleCopy = useCallback(() => {
    const text = entries
      .map((e) => {
        const ts = new Date(e.timestamp).toISOString().slice(11, 19);
        return `[${ts}] ${AGENT_CONFIG[e.agent].label}: ${e.message}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [entries]);

  const visibleEntries = filter === "all" ? entries : entries.filter((e) => e.agent === filter);

  // Agents that have actually appeared
  const seenAgents = Array.from(new Set(entries.map((e) => e.agent)));

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0"
        style={{ background: "linear-gradient(180deg, rgba(14,17,23,0.9), rgba(8,10,13,0.5))" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-bear/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-gold/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-bull/70" />
          </div>
          <span className="mono-label text-[9px] ml-1">Neural Feed</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Active agent indicator */}
          <AnimatePresence>
            {activeAgent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5"
              >
                <motion.div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: AGENT_CONFIG[activeAgent].dot }}
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className={`mono-label text-[9px] ${AGENT_CONFIG[activeAgent].color}`}>
                  {AGENT_CONFIG[activeAgent].label}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Copy button */}
          {entries.length > 0 && (
            <button
              onClick={handleCopy}
              title="Copy log to clipboard"
              className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-white/[0.06] transition-colors duration-150"
            >
              {copied ? <Check className="h-3 w-3 text-bull" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Pipeline progress bar */}
      {entries.length > 0 && (
        <PipelineProgress entries={entries} activeAgent={activeAgent} />
      )}

      {/* Filter chips */}
      {seenAgents.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/30 shrink-0 overflow-x-auto">
          <Filter className="h-2.5 w-2.5 text-ink-faint shrink-0" />
          {(["all", ...seenAgents] as const).map((a) => {
            const cfg = a !== "all" ? AGENT_CONFIG[a] : null;
            const isActive = filter === a;
            return (
              <button
                key={a}
                onClick={() => setFilter(a)}
                className="shrink-0 px-2 py-0.5 rounded-full font-mono text-[8px] font-bold transition-all duration-150"
                style={
                  isActive && cfg
                    ? { background: `${cfg.dot}20`, border: `1px solid ${cfg.dot}50`, color: cfg.dot }
                    : isActive
                    ? { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#E8EBF0" }
                    : { background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }
                }
              >
                {a === "all" ? "ALL" : AGENT_CONFIG[a as AgentLogEntry["agent"]].label}
              </button>
            );
          })}
        </div>
      )}

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visibleEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <div className="relative">
              <div className="h-8 w-8 rounded-full border border-data/30 flex items-center justify-center">
                <motion.div
                  className="h-3 w-3 rounded-full bg-data/50"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
            </div>
            <p className="mono-label text-[9px] text-center">
              {entries.length === 0 ? "Awaiting research signal..." : "No entries for this agent"}
            </p>
          </div>
        ) : (
          visibleEntries.map((entry, i) => (
            <TerminalEntry
              key={`${entry.timestamp}-${i}`}
              entry={entry}
              isLast={i === visibleEntries.length - 1}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Bottom scan line when active */}
      {activeAgent && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${AGENT_CONFIG[activeAgent].dot}, transparent)` }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}
