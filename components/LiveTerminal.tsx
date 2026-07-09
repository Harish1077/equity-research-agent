"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

// Typewriter hook
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

export default function LiveTerminal({ entries, activeAgent }: LiveTerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="glass-panel h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 shrink-0"
        style={{ background: "linear-gradient(180deg, rgba(14,17,23,0.9), rgba(8,10,13,0.5))" }}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-bear/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-gold/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-bull/70" />
          </div>
          <span className="mono-label text-[9px] ml-1">Neural Feed</span>
        </div>

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
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {entries.length === 0 ? (
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
            <p className="mono-label text-[9px] text-center">Awaiting research signal...</p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <TerminalEntry key={`${entry.timestamp}-${i}`} entry={entry} isLast={i === entries.length - 1} />
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
