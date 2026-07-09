import { Annotation } from "@langchain/langgraph";

/**
 * ResearchState
 * ─────────────
 * The single shared blackboard every node in the graph reads from
 * and writes to. Each node is responsible for only its own slice —
 * the Reducer functions below define how concurrent/sequential
 * writes are merged so nodes never clobber each other's work.
 */

export interface FinancialSnapshot {
  companyName: string;
  currency: string;
  price: number | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  debtToEquity: number | null;
  freeCashFlow: number | null;
  totalRevenue: number | null;
  netIncome: number | null;
  revenueGrowthYoY: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  beta: number | null;
  insiderOwnershipPct: number | null;
}

export interface AgentLogEntry {
  agent: "resolver" | "auditor" | "bull" | "bear" | "judge" | "system";
  message: string;
  timestamp: number;
}

export type Verdict = "INVEST" | "PASS" | "UNRESOLVED";

export interface ModelPrediction {
  name: string;
  signal: "BUY" | "PASS" | "SELL";
  probability: number;
  description: string;
}

export interface TimeSeriesPoint {
  date: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface TradingStep {
  date: string;
  price: number;
  action: "BUY" | "SELL" | "HOLD";
  portfolioValue: number;
  buyAndHoldValue: number;
}

export interface AttentionWeight {
  word: string;
  weight: number;
  rowWeights: number[];
  sentiment: number;
}

export interface QuantMLSnapshot {
  models: ModelPrediction[];
  featureImportance: { feature: string; importance: number }[];
  timeSeries: TimeSeriesPoint[];
  rlSimulation: {
    steps: TradingStep[];
    finalRLReturn: number;
    finalBHReturn: number;
  };
  sentimentAttention: {
    tokens: string[];
    weights: AttentionWeight[];
  };
}

export const ResearchStateAnnotation = Annotation.Root({
  // ── Input ──────────────────────────────────────────────
  companyQuery: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // ── Quant ML Output ────────────────────────────────────
  quantML: Annotation<QuantMLSnapshot | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // ── Ticker Resolver output ─────────────────────────────
  ticker: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  resolvedCompanyName: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // ── Quant Auditor output ───────────────────────────────
  fundamentals: Annotation<FinancialSnapshot | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),

  // ── Bull / Bear debate ─────────────────────────────────
  bullCase: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  bearCase: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),

  // ── Synthesis Judge output ─────────────────────────────
  analysis: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  verdict: Annotation<Verdict>({
    reducer: (_prev, next) => next,
    default: () => "UNRESOLVED",
  }),
  convictionScore: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  riskFactors: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),

  // ── Observability: the live agent log stream ───────────
  agentLog: Annotation<AgentLogEntry[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),

  // ── Error channel ───────────────────────────────────────
  error: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
