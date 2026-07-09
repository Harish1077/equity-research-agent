# EQUITY ORACLE

> **An adversarial, multi-agent AI investment research engine.**
> Bull and Bear agents debate every stock. The Oracle rules on hard data alone.

---

## Table of Contents

1. [Overview](#1-overview)
2. [How to Run It](#2-how-to-run-it)
3. [How It Works](#3-how-it-works)
4. [Key Decisions & Trade-offs](#4-key-decisions--trade-offs)
5. [Example Runs](#5-example-runs)
6. [What I Would Improve With More Time](#6-what-i-would-improve-with-more-time)
7. [AI / LLM Chat Transcript](#7-ai--llm-chat-transcript)

---

## 1. Overview

**Equity Oracle** is a full-stack AI application that applies an adversarial research methodology to equity analysis. Rather than asking a single AI model "is this a good stock?", the system runs a structured multi-agent debate:

1. A **Bull Agent** is mandated to build the strongest possible buy thesis.
2. A **Bear Agent** is mandated to build the strongest possible sell/avoid case.
3. A **Synthesis Judge** — the "Oracle" — weighs both arguments against hard quantitative data and renders a binary verdict: **INVEST** or **PASS**.

The key insight is that **adversarial pressure produces more disciplined output than consensus**. A system told to argue one side will find every real edge case and risk; a system told to synthesise two opposing cases must resolve them with evidence, not narrative.

### What it does, end-to-end:

- Accepts a free-text company query (e.g. *"the iPhone company"* or *"TSLA"*)
- Resolves it to a real, tradable ticker via Yahoo Finance's search API
- Fetches live financial fundamentals (P/E, D/E, FCF, revenue, margins, ROE, beta, 52-week range)
- Runs **7 classic ML classifiers** on the normalised fundamentals (Logistic Regression, Random Forest, XGBoost, LightGBM, CatBoost, SVM, MLP)
- Runs an **LSTM + GRU-style time-series forecast** over 180 days of historical prices
- Simulates a **Q-Learning reinforcement learning** trading agent vs. buy-and-hold benchmark
- Computes a **Transformer self-attention heatmap** over news headline tokens
- Enriches context with **live web news** via Tavily (biased for growth catalysts for Bull, and red flags for Bear)
- Synthesises everything into a formal **Investment Memorandum** (Executive Summary ? Bull/Bear conflict analysis ? Quant Scorecard ? Risk Heatmap ? Final Verdict)
- Streams all intermediate agent log messages live to the UI via NDJSON over HTTP

The UI is a real-time "war room" with a live agent terminal feed, a central verdict + memorandum display, and a right-hand metrics panel with animated financial data and ML model signals.

---

## 2. How to Run It

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 18.x |
| npm | >= 9.x |

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd equity-oracle

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root (already in `.gitignore`):

```env
# Required
# Groq is FREE — 14,400 requests/day — get your key at console.groq.com
GROQ_API_KEY=gsk_...

# Optional LLM fallbacks (used if Groq fails or is unavailable)
GEMINI_API_KEY=AIza...          # Google Gemini 2.0 Flash
OPENAI_API_KEY=sk-proj-...      # GPT-4o

# Optional news enrichment
# Without this, agents debate from fundamentals only (still works well)
TAVILY_API_KEY=tvly-...         # Real-time web search for news context

# Optional data upgrade
# If set, SEC-sourced financials from Polygon.io override Yahoo Finance values
POLYGON_API_KEY=...
```

> **The minimum viable setup is just `GROQ_API_KEY`.** Everything else is optional. Yahoo Finance is used for market data at no cost.

### Running locally

```bash
npm run dev
```

Open http://localhost:3000

### Building for production

```bash
npm run build
npm run start
```

---

## 3. How It Works

### Architecture Overview

```
User Query (free text)
        |
        v
+--------------------+
|  Ticker Resolver   |  Yahoo Finance search -> scored candidate ranking -> best match
+--------+-----------+
         | abort if no match
+--------v-----------+
|  Quant Auditor     |  Yahoo Finance quoteSummary -> 16 hard financial fields
+--------+-----------+        (Polygon.io upgrade if key is set)
         | abort if data fails
+--------v-----------+
|  Quant ML Suite    |  7 ML classifiers + LSTM forecast + RL sim + attention
+--------+-----------+
         |
    +----+----+
+---v--+  +--v---+
| Bull  |  | Bear |   Each fetches targeted Tavily news, then calls LLM
+---+---+  +--+---+
    +----+----+
+--------v-----------+
|  Synthesis Judge   |  Weighs Bull vs Bear vs hard data -> JSON verdict
+--------------------+
         |
    INVEST / PASS
```

### Key Components

#### `lib/graph/engine.ts` — The LangGraph State Machine
The research pipeline is a **LangGraph StateGraph** with conditional edges. Each node writes to a shared `ResearchState` blackboard. Conditional routing allows early abort (e.g. if the ticker cannot be resolved, the graph terminates immediately rather than burning LLM calls on a bad input).

#### `lib/graph/nodes.ts` — The Five Agents

| Agent | LLM Temp | Mandate |
|-------|----------|---------|
| Ticker Resolver | none | Convert free text to a real ticker using scored Yahoo Finance search |
| Quant Auditor | none | Pull 16 financial fields from Yahoo Finance — numbers never touch an LLM |
| Quant ML Suite | none | Run 7 classifiers, LSTM forecast, RL sim, transformer attention |
| Bull Agent | 0.3 | Build the strongest BUY case — not asked to be balanced |
| Bear Agent | 0.3 | Build the strongest SELL/AVOID case — not asked to be balanced |
| Synthesis Judge | 0.15 | Arbitrate the debate against hard data — defaults to PASS |

#### `lib/graph/llm.ts` — Multi-Provider LLM Fallback
LLM calls try providers in priority order: **Groq (Llama 3.3 70B) -> Gemini 2.0 Flash -> GPT-4o**. Any provider failure is silently retried on the next. The Judge uses a lower temperature (0.15) because it must produce clean JSON.

#### `lib/graph/quant-ml.ts` — The ML Suite (pure TypeScript, no Python)
All ML runs in the Node.js server process, using closed-form numerical simulations:
- **Feature normalisation** uses sigmoid/tanh scaling to bound all inputs to [0, 1]
- **7 classifiers** (LR, RF, XGB, LGB, CatBoost, SVM, MLP) each encode domain-expert financial heuristics
- **LSTM/GRU forecast** fits exponential smoothing with momentum over 180 days of real historical prices, projecting 7 days forward with confidence intervals
- **RL simulation** runs a Q-table agent with epsilon-greedy exploration over real price data, benchmarked against passive buy-and-hold
- **Transformer attention** hashes news headline tokens into a seeded matrix, simulates self-attention scores, and maps sentiment intensity to each token

#### `lib/tools.ts` — Data Layer
- `resolveTicker`: Multi-pass scorer over Yahoo Finance search. Prioritises exact symbol match, then full-name match, then exchange (NYSE/NASDAQ preferred).
- `fetchFundamentals`: Yahoo Finance quoteSummary with 6 modules. Optionally upgraded with SEC data from Polygon.io for more precise balance sheet figures.
- `fetchNews`: Tavily web search, angled per-agent (Bull gets "growth catalysts" context, Bear gets "red flags" context).

#### `app/api/research/route.ts` — Streaming API
The research endpoint streams NDJSON events over HTTP. Event types:
- `log` — agent activity entries (rendered in the live terminal)
- `state` — partial state patches (ticker, fundamentals, quantML)
- `final` — the complete final state (verdict, score, analysis)
- `error` — any caught failure

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Agent framework | LangGraph.js |
| Primary LLM | Groq (Llama 3.3 70B) |
| Fallback LLMs | Gemini 2.0 Flash, GPT-4o |
| Market data | Yahoo Finance (via yahoo-finance2) |
| News enrichment | Tavily Search API |
| Optional financials | Polygon.io |
| UI animations | Framer Motion |
| Styling | Tailwind CSS |
| Markdown rendering | react-markdown + remark-gfm |
| Icons | Lucide React |

---

## 4. Key Decisions & Trade-offs

### Adversarial architecture over single-agent summarisation

**Decision:** Use three separate agents with opposing mandates rather than one balanced agent.

**Why:** A single balanced agent produces hedged, non-committal output. Forcing explicit advocacy — "build the strongest possible BUY case you can" — ensures the agent finds real catalysts, not just a restatement of the obvious. The tension between Bull and Bear is resolved by a third agent with access to hard numbers, which creates a disciplined binary outcome rather than "it depends."

**Trade-off:** Three LLM calls per research run means higher latency (typically 10–20s total) and higher token cost. Accepted because the output quality improvement is significant.

---

### Numbers must never pass through an LLM

**Decision:** The Quant Auditor fetches all financial data and writes it directly to state. The LLM agents receive it as a formatted string but are never asked to retrieve or calculate numbers themselves.

**Why:** LLMs hallucinate numbers. By separating data retrieval (deterministic, sourced) from reasoning (generative, opinionated), we guarantee the verdict is grounded in real data.

**Trade-off:** The data is only as fresh as Yahoo Finance's cache. Some fields (e.g. insider ownership) may lag by days.

---

### Pure TypeScript ML suite (no Python, no external ML service)

**Decision:** Implement all 7 classifiers and the time-series/RL/attention models as closed-form computations in TypeScript.

**Why:** A Python microservice would require a separate runtime, Docker orchestration, and a cross-process API. The classifiers encode domain-expert financial heuristics that are interpretable and produce genuinely different outputs per company because they use real fundamental inputs and real historical price data.

**Trade-off:** These are not trained models. The ensemble signals should be read as a structured heuristic checklist, not calibrated probabilities. A production system would replace these with real trained models served via ONNX or a Python FastAPI microservice.

---

### Groq as primary LLM, with Gemini + OpenAI fallbacks

**Decision:** Default to Groq (Llama 3.3 70B) because it is free (14,400 req/day), with fallback to Gemini Flash then GPT-4o.

**Trade-off:** Groq has rate limits. Under heavy concurrent usage the system will fall over to paid providers. The fallback chain handles this silently.

---

### Synthesis Judge defaults to PASS

**Decision:** The Judge's system prompt explicitly says: "If the Bear case identifies a credible structural risk that the Bull case does not rebut with specific quantitative evidence, rule PASS."

**Why:** Conviction should be the exceptional case, not the default. A system that says INVEST 80% of the time is useless as a filter.

**Trade-off:** The Judge may be too conservative for high-growth stocks where the Bear case (high P/E) is technically valid but the long-term thesis is intact.

---

### Streaming NDJSON over HTTP (not WebSockets)

**Decision:** Stream agent logs and state patches as newline-delimited JSON over a single HTTP POST response.

**Why:** Simpler than WebSockets — no socket lifecycle management, no reconnect logic, compatible with Next.js Route Handlers out of the box, works on Vercel. The client aborts with AbortController when needed.

---

### What was left out

| Feature | Reason |
|---------|--------|
| Portfolio-level analysis | Out of scope for single-company research format |
| User accounts / saved analyses | Requires a database; adds infrastructure complexity |
| Real trained ML models | Would require a Python runtime and model serving |
| Live streaming ticker prices | Requires a WebSocket market data feed |
| PDF export of the memorandum | Deferred as a nice-to-have |
| International exchange tuning | Yahoo Finance works globally but ML suite is calibrated for USD equities |

---

## 5. Example Runs

### Run 1: NVIDIA (NVDA) — INVEST

**Query:** "nvidia"
**Resolved:** NVDA — NVIDIA Corporation

**Key Fundamentals:**
- Market Cap: ~$3.1T
- P/E (TTM): ~55x
- Revenue Growth YoY: +122%
- Profit Margin: ~55%
- ROE: ~120%
- FCF: ~$60B

**ML Consensus:** 6/7 models BUY — exceptional ROE and revenue growth override the stretched P/E signal.

**Bull Case Summary:** Dominant AI data centre compute monopoly, CUDA software moat, accelerating inference demand across hyperscalers, expanding gross margins as supply normalises, Blackwell architecture cycle just beginning.

**Bear Case Summary:** 55x trailing earnings prices in perfection with no margin for execution error; AMD and in-house chip programmes (Google TPU, AWS Trainium) offer long-run moat erosion; customer concentration in a handful of hyperscalers creates revenue fragility.

**Verdict: INVEST — Conviction 82/100**

> "Bull case is directly corroborated by the hard data. The bear case's moat erosion narrative is structurally valid but not yet reflected in trailing numbers. Ruling INVEST with high conviction on execution and margin trajectory."

---

### Run 2: Peloton Interactive (PTON) — PASS

**Query:** "peloton"
**Resolved:** PTON — Peloton Interactive, Inc.

**Key Fundamentals:**
- Market Cap: ~$1.2B
- P/E (TTM): N/A (negative earnings)
- Revenue Growth YoY: -8%
- Profit Margin: -25%
- Debt/Equity: 580%
- FCF: -$200M

**ML Consensus:** 6/7 models SELL — extreme leverage, negative growth, deeply negative margins.

**Bull Case Summary:** Restructuring in progress, subscription revenue provides recurring base, brand still resonates with fitness enthusiasts, possible acquisition target at depressed valuation.

**Bear Case Summary:** Cash burn at current rate raises solvency questions, hardware market saturated post-COVID, content moat weaker than originally modelled, debt load constrains all strategic options.

**Verdict: PASS — Conviction 12/100**

> "Bear case's balance sheet analysis is supported by every quantitative data point. The bull case's turnaround thesis is unquantified and speculative. Ruling PASS with high conviction."

---

### Run 3: JPMorgan Chase (JPM) — INVEST

**Query:** "jpmorgan"
**Resolved:** JPM — JPMorgan Chase & Co.

**Key Fundamentals:**
- Market Cap: ~$700B
- P/E (TTM): ~13x
- Revenue Growth YoY: +12%
- ROE: ~17%
- Profit Margin: ~32%
- Beta: 1.1

**ML Consensus:** 5/7 models BUY — reasonable P/E, strong ROE, controlled leverage.

**Bull Case Summary:** Best-in-class US megabank, diversified revenue across IB, consumer, and wealth management, fortress balance sheet, strong capital return programme, beneficiary of higher-for-longer rates.

**Bear Case Summary:** Rate cycle peaking limits NIM expansion, commercial real estate exposure remains a tail risk, Basel III endgame capital requirements may constrain buybacks.

**Verdict: INVEST — Conviction 71/100**

> "Bull case supported by valuation metrics and ROE. Bear case's CRE and regulatory risks are real but not catastrophic at current exposure levels. Ruling INVEST with moderate conviction."

---

### Run 4: Snap Inc. (SNAP) — PASS

**Query:** "snap"
**Resolved:** SNAP — Snap Inc.

**Key Fundamentals:**
- Market Cap: ~$14B
- P/E (TTM): N/A (negative earnings)
- Revenue Growth YoY: +14%
- Profit Margin: -27%
- FCF: -$400M
- Beta: 1.8

**ML Consensus:** 5/7 models SELL — cash burn and structural ad market share risk.

**Verdict: PASS — Conviction 28/100**

> "Revenue growth cannot offset the structural cash burn and negative margin trajectory. The bear case's advertising market share concentration risk (Meta/TikTok) is not rebutted by the Bull case with specific evidence."

---

## 6. What I Would Improve With More Time

### High Priority

**1. Replace simulated ML with real trained models**
Train actual scikit-learn or PyTorch models on historical fundamentals mapped to 1-year forward returns. Host as a lightweight Python FastAPI microservice. Use SHAP for genuine per-stock feature importance.

**2. Parallel Bull + Bear execution**
Currently Bull and Bear run sequentially. They are independent and could run with Promise.all, cutting ~40% off total latency.

**3. Streaming the Memorandum token-by-token**
The Judge's full memorandum appears at once on completion. Streaming the tokens would reduce perceived latency dramatically.

**4. Persistent results / history**
A simple Postgres or SQLite store would let users revisit past verdicts and build a watchlist. Currently every session is ephemeral.

**5. Portfolio-level view**
Allow a list of tickers and return a ranked verdict table ordered by conviction score.

### Medium Priority

**6. Rate limiting and caching**
Cache FinancialSnapshot for 15 minutes per ticker to prevent redundant Yahoo Finance calls under concurrent usage.

**7. Better error differentiation**
Distinguish "API rate limit hit", "company not found", and "LLM timeout" with specific recovery instructions in the UI.

**8. Real LSTM / Transformer forecast**
The current forecast is exponential smoothing. An ONNX model running in Node.js would produce genuinely learned patterns.

### Low Priority / Stretch

- Export memorandum as a formatted PDF
- Email/Slack delivery of verdicts
- Comparative mode (run two companies side-by-side)
- Backtesting: how accurate were verdicts 6 months ago?
- International exchange support with currency normalisation

---

## 7. AI / LLM Chat Transcript

This project was built in an **AI-assisted pair programming session** using **Antigravity (powered by Claude/Gemini models)** inside VS Code. The LLM was used throughout for:

- Designing the adversarial LangGraph architecture
- Writing the system prompts for Bull, Bear, and Judge agents
- Implementing the Yahoo Finance + Tavily data layer with graceful fallbacks
- Building the TypeScript ML simulation suite (quant-ml.ts)
- Designing the streaming NDJSON API route
- Creating the React UI components with glassmorphism styling and animations
- Debugging Groq API integration and JSON parsing edge cases
- Pre-deployment improvements: viewport meta, Open Graph tags, mobile tabbed layout, retry button, disclaimers

### Sample Conversation Extracts

---

**[Architecture design]**

> **Me:** I want to build a stock research tool that uses multiple AI agents — one arguing to buy, one arguing to sell, and a final judge. Can you help me design the architecture?
>
> **AI:** Great framing. This maps well to an adversarial debate pattern. I'd use LangGraph for the state machine — you get conditional routing for early exits, a shared state blackboard, and clean node separation. Here's the graph: Ticker Resolver ? Quant Auditor ? Quant ML Suite ? [Bull ? Bear] ? Synthesis Judge ? END. Critical design constraint: numbers must never pass through the LLM. Fetch all financial data first, pass it as a formatted string to the agents so they reason over it but cannot fabricate it.

---

**[ML suite design]**

> **Me:** I want to show ML model signals — LSTM forecast, RL trading sim, ensemble classifiers — but I cannot set up a Python service. Can we do this in TypeScript?
>
> **AI:** Yes, with a clear caveat: you will not get trained models, but you can get deterministic, financial-heuristic simulations that produce meaningfully different outputs per company because they use the real fundamental inputs and real historical price data. For the classifiers, encode domain knowledge directly as weighted logistic functions and decision tree rules. For the LSTM, use exponential smoothing with momentum over real Yahoo Finance price history. For the RL agent, implement Q-learning with a simple state space over real price data. Label them clearly in the UI as simulations, not trained models.

---

**[Streaming API]**

> **Me:** How do I stream the agent logs and state patches to the UI as the graph runs?
>
> **AI:** Use NDJSON over HTTP — a single POST route that writes newline-delimited JSON events to a ReadableStream. The frontend reads with getReader() and splits on newlines. Three event types: log for terminal entries, state for partial patches (fundamentals, quantML), and final for the complete result. This is simpler than WebSockets, works on Vercel, and the client can abort with AbortController. I would avoid SSE because Next.js Route Handler streaming support is cleaner with raw ReadableStream.

---

**[Pre-deployment review]**

> **Me:** I am about to deploy. What should I fix first?
>
> **AI:** Critical: 1) Add a viewport meta tag — your layout.tsx does not have one so mobile rendering will be broken. 2) Add Open Graph tags so link sharing looks presentable. 3) Add a favicon. 4) Your mobile war-room collapses to a broken single-column view — you need a tabbed navigation for Feed / Verdict / Metrics on small screens. 5) The error state has no retry button. 6) Add a Not financial advice disclaimer in the hero. 7) Label the ticker strip as Indicative — it shows stale hardcoded prices.
>
> *All of these were implemented in the session.*

---

**Design philosophy note**

The AI was most useful as a **thinking partner for architecture decisions** — particularly the adversarial agent design, the data integrity rule (numbers never through LLMs), and the NDJSON streaming approach. Code generation was accurate for boilerplate but required iteration on the LangGraph conditional edges and the Yahoo Finance multi-module query structure, where subtle API shape mismatches were caught and fixed collaboratively.

The full conversation log (tool calls, model responses, file edits) is stored locally at:

```
C:\Users\91966\.gemini\antigravity-ide\brain\cfadc6d4-3c1c-47f6-a833-9f4491770274\.system_generated\logs\transcript.jsonl
```

---

*For educational and demonstration purposes only. Not financial advice.*
