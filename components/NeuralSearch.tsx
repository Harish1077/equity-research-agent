"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ChevronRight } from "lucide-react";

interface NeuralSearchProps {
  onSubmit: (query: string) => void;
  isRunning: boolean;
  compact?: boolean;
}

export default function NeuralSearch({ onSubmit, isRunning, compact = false }: NeuralSearchProps) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const skipFetchRef = useRef(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isRunning) return;
    skipFetchRef.current = true;
    setIsOpen(false);
    onSubmit(value.trim());
  };

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(json.results || []);
        setActiveIndex(-1);
        setIsOpen((json.results || []).length > 0);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
      }
    }, 220);
  }, []);

  useEffect(() => {
    if (isRunning) { setIsOpen(false); return; }
    if (skipFetchRef.current) { skipFetchRef.current = false; return; }
    fetchSuggestions(value);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [value, fetchSuggestions, isRunning]);

  const chooseSuggestion = (s: { symbol: string; name: string }) => {
    skipFetchRef.current = true;
    setValue(s.symbol);
    setIsOpen(false);
    onSubmit(s.symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      layout
      className={compact ? "w-full" : "w-full max-w-2xl mx-auto"}
    >
      <div className="relative group">
        {/* Multi-layer glow ring */}
        <motion.div
          className="absolute -inset-[2px] rounded-2xl pointer-events-none"
          animate={{
            opacity: isRunning ? 1 : isFocused ? 0.8 : 0.3,
          }}
          transition={{ duration: 0.4 }}
          style={{
            background: isRunning
              ? "linear-gradient(90deg, #4D9FFF, #00FFA3, #A855F7, #4D9FFF)"
              : "linear-gradient(90deg, #4D9FFF, #00FFA3)",
            backgroundSize: "300% 100%",
            filter: "blur(8px)",
            animation: isRunning ? "gradient-shift 2s linear infinite" : undefined,
          }}
        />

        {/* Main input container */}
        <div
          className="relative flex items-center gap-3 rounded-2xl border px-5 py-4 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(14,17,23,0.95) 0%, rgba(8,10,13,0.98) 100%)",
            borderColor: isFocused ? "rgba(77,159,255,0.4)" : isRunning ? "rgba(0,255,163,0.4)" : "rgba(255,255,255,0.1)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Laser scan line while running */}
          {isRunning && (
            <motion.div
              className="absolute top-0 bottom-0 w-12 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(77,159,255,0.4), transparent)",
                zIndex: 0,
              }}
              animate={{ left: ["-10%", "110%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Icon */}
          <div className="relative z-10 shrink-0">
            {isRunning ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5 text-data" />
              </motion.div>
            ) : (
              <Search className={`h-5 w-5 transition-colors duration-300 ${isFocused ? "text-data" : "text-ink-faint"}`} />
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={compact ? "Search another company..." : "Enter a company name — e.g. \"the iPhone company\""}
            disabled={isRunning}
            autoFocus={!compact}
            className="relative z-10 flex-1 bg-transparent outline-none text-ink placeholder:text-ink-faint text-base disabled:opacity-50"
          />

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={isRunning || !value.trim()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="relative z-10 shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
            style={{
              background: isRunning
                ? "linear-gradient(135deg, rgba(0,255,163,0.2), rgba(77,159,255,0.2))"
                : "linear-gradient(135deg, rgba(77,159,255,0.25), rgba(0,255,163,0.2))",
              border: "1px solid rgba(77,159,255,0.35)",
              color: "#4D9FFF",
            }}
          >
            {isRunning ? (
              <span className="mono-label text-data text-[10px]">Running...</span>
            ) : (
              <>
                <span>Analyze</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {isOpen && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-2 w-full rounded-xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(14,17,23,0.98), rgba(8,10,13,0.99))",
                border: "1px solid rgba(77,159,255,0.2)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
                backdropFilter: "blur(24px)",
              }}
            >
              {suggestions.map((s, idx) => (
                <motion.li
                  key={s.symbol + idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => chooseSuggestion(s)}
                  className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-all duration-150 ${
                    idx === activeIndex
                      ? "bg-data/15 border-l-2 border-data"
                      : "hover:bg-white/[0.04] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-data">{s.symbol}</span>
                    <span className="text-ink-muted text-xs truncate max-w-[200px]">{s.name}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-ink-faint shrink-0" />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {!compact && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mono-label text-center mt-4 tracking-[0.25em]"
        >
          autonomous · adversarial · quant-audited
        </motion.p>
      )}
    </motion.form>
  );
}
