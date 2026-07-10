# STOCKSAGE - Adversarial Investment Research Engine

**Every stock is put on trial. Bull and Bear argue. The Oracle rules on data alone.**

> Warning: For educational and research purposes only. Not financial advice.

---

## What is STOCKSAGE?

STOCKSAGE is an autonomous multi-agent investment research system built on LangGraph.js. It simulates an adversarial investment committee where:

- Bull Agent builds the strongest possible BUY case for any stock
- Bear Agent constructs the most devastating counter-argument
- Synthesis Judge weighs both arguments against hard quant data and renders a binary INVEST or PASS verdict

---

## Architecture

`
START
  |
  v
01. Ticker Resolver    - "the iPhone company" -> AAPL (Yahoo Finance Search)
  |
  v
02. Quant Auditor      - 16 hard metrics, zero LLM involvement (Yahoo Finance v2)
  |                      P/E, D/E, ROE, FCF, Revenue, Beta...
  v
03. Quant ML Suite     - 7 ML classifiers + time-series + RL simulation
  |                      Logistic Reg, Random Forest, XGBoost, LightGBM, CatBoost, SVM, MLP
  v
04. Bull Agent         - Strongest possible investment thesis (Llama 3.3 70B, T=0.3)
  |
  v
05. Bear Agent         - Strongest possible counter-case (Llama 3.3 70B, T=0.3)
  |
  v
06. Synthesis Judge    - INVEST or PASS + Conviction Score (Llama 3.3 70B, T=0.15)
  |
 END -> Structured Investment Memorandum
`

---

## Features

- Neural Search with autocomplete, recent searches, and market status badge
- 6-Node LangGraph adversarial research pipeline
- 7 ML models running locally (no API calls for ML inference)
- Time-series price forecasting with confidence intervals
- Reinforcement Learning trading simulation vs buy-and-hold
- Transformer attention weights on news sentiment
- Structured markdown investment memorandum
- localStorage analysis history (persists between sessions)
- Watchlist dashboard with sparklines and mini metrics
- Side-by-side radar chart comparison of two tickers
- Sector benchmarks tab comparing vs industry averages
- Export full analysis to JSON
- Live terminal with pipeline progress bar and per-agent timing
- Fully responsive: tabbed mobile + 3-column desktop war room
- Glassmorphism dark UI with aurora backgrounds

---

## Quick Start

### Prerequisites

- Node.js >= 18
- At least one LLM API key (Groq recommended - free)

### 1. Clone and install

`ash
git clone https://github.com/your-username/equity-oracle.git
cd equity-oracle
npm install
`

### 2. Set up environment variables

`ash
cp .env.example .env.local
`

Edit .env.local:

`env
# Groq - RECOMMENDED. Free: 14,400 req/day, ultra-low latency
# Sign up at: https://console.groq.com
GROQ_API_KEY=gsk_...

# Google Gemini - Fallback LLM
# Sign up at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...

# OpenAI - Alternative fallback
# Sign up at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...
`

The system falls back automatically: Groq -> Gemini -> OpenAI. You only need one.

### 3. Run the development server

`ash
npm run dev
`

Open http://localhost:3000 - the Oracle awaits.

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| Next.js | 14 | Full-stack React framework |
| LangGraph.js | 0.2 | Multi-agent orchestration |
| LangChain.js | 0.3 | LLM abstraction layer |
| Groq API | - | Primary LLM (Llama 3.3 70B) |
| Google Gemini | 2.0 Flash | Fallback LLM |
| Yahoo Finance v2 | 3.x | Market data provider |
| Framer Motion | 11 | Animations and transitions |
| Tailwind CSS | 3 | Utility-first styling |
| TypeScript | 5 | Type-safe development |

---

## Project Structure

`
equity-oracle/
+-- app/
|   +-- page.tsx              # Main dashboard (hero + war room)
|   +-- about/page.tsx        # Architecture and how it works page
|   +-- watchlist/page.tsx    # Research history dashboard
|   +-- globals.css           # Global styles and design tokens
|   +-- layout.tsx            # Root layout with SEO metadata
|   +-- api/
|       +-- research/         # Streaming SSE research endpoint
|       +-- search/           # Yahoo Finance autocomplete API
+-- components/
|   +-- NeuralSearch.tsx      # Search bar with autocomplete and recent searches
|   +-- LiveTerminal.tsx      # Real-time agent log with pipeline progress bar
|   +-- VerdictDisplay.tsx    # Verdict + memorandum + quant charts + debate tab
|   +-- MetricsPanel.tsx      # Fundamentals + ML ensemble + sector benchmarks
|   +-- HistoryDrawer.tsx     # Slide-in history and watchlist drawer
|   +-- ComparePanel.tsx      # Side-by-side radar chart comparison modal
+-- lib/
    +-- history.ts            # localStorage history, watchlist, and recent searches API
    +-- tools.ts              # Yahoo Finance data fetching utilities
    +-- utils.ts              # Shared helpers
    +-- graph/
        +-- engine.ts         # LangGraph pipeline builder and compiler
        +-- state.ts          # ResearchState annotation schema
        +-- llm.ts            # Multi-provider LLM with automatic fallback
        +-- nodes.ts          # All 6 agent node implementations
        +-- quant-ml.ts       # 7 ML models + forecasting + RL + attention
`

---

## ML Model Suite

All 7 models run locally in Node.js - no external API calls, zero latency for inference.

| Model | Type | Primary Features |
|---|---|---|
| Logistic Regression | Linear classifier | P/E, D/E, ROE, Growth, Margin |
| Random Forest | Ensemble | 5 decision trees, majority vote |
| XGBoost | Gradient boosting | 4 boosting rounds |
| LightGBM | Leaf-wise boosting | Categorical feature handling |
| CatBoost | Ordered boosting | Tail risk emphasis (beta, D/E) |
| SVM (RBF Kernel) | Kernel machine | Non-linear 7-feature decision boundary |
| MLP Neural Network | Deep learning | 2 hidden layers, tanh activation, dropout |

Plus:
- Time-Series Forecasting: ARIMA/LSTM-style price prediction with confidence bands
- RL Simulation: Q-learning trading agent vs. buy-and-hold benchmark
- Sentiment Attention: Transformer attention weights on financial news tokens

---

## API Reference

### POST /api/research

Runs the full 6-node research pipeline. Returns a Server-Sent Events stream.

Request body: { "companyQuery": "Apple" }

Stream event types:
- {"type":"log","entry":{"agent":"resolver","message":"...","timestamp":1234}}
- {"type":"state","patch":{"ticker":"AAPL","fundamentals":{...}}}
- {"type":"final","state":{...full ResearchState...}}
- {"type":"error","message":"..."}

### GET /api/search?q=apple

Returns Yahoo Finance autocomplete results.

Response: { "results": [{"symbol":"AAPL","name":"Apple Inc."}] }

---

## License

MIT License

---

Built with adversarial AI. The debate decides. The data rules.

