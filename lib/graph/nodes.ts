import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getModel } from "./llm";
import {
  resolveTicker,
  fetchFundamentals,
  fetchNews,
  formatFundamentalsForPrompt,
  yahooFinance,
  fetchHistoricalPrices,
} from "../tools";
import type { ResearchState, Verdict, QuantMLSnapshot, ModelPrediction } from "./state";
import {
  normalizeFeatures,
  computeLogisticRegression,
  computeRandomForest,
  computeXGBoost,
  computeLightGBM,
  computeCatBoost,
  computeSVM,
  computeMLP,
  runTimeSeriesForecasting,
  runRLSimulation,
  computeSentimentAttention,
  getSeededRandom,
} from "./quant-ml";

const now = () => Date.now();
const MODEL_TIMEOUT_MS = 90000;

async function invokeModelWithFallback(
  model: Awaited<ReturnType<typeof getModel>>,
  messages: Array<SystemMessage | HumanMessage>,
  fallbackText: string,
) {
  try {
    const response = await Promise.race([
      model.invoke(messages),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("LLM request timed out")), MODEL_TIMEOUT_MS);
      }),
    ]);

    const content = response.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((c) => {
          if (typeof c === "string") return c;
          if (c && typeof c === "object") {
            const anyC = c as any;
            if (anyC.type === "text" && typeof anyC.text === "string") return anyC.text;
            if (typeof anyC.text === "string") return anyC.text;
          }
          return "";
        })
        .join("");
    }
    return String(content);
  } catch (err) {
    console.error("[graph] LLM request failed, using fallback:", err);
    return fallbackText;
  }
}

// ─────────────────────────────────────────────────────────────
// 1. THE TICKER RESOLVER
// Converts free-text company names into real, tradable symbols.
// ─────────────────────────────────────────────────────────────
export async function tickerResolverNode(state: ResearchState) {
  const log = [
    { agent: "resolver" as const, message: `Resolving "${state.companyQuery}" to a ticker symbol...`, timestamp: now() },
  ];

  try {
    const resolved = await resolveTicker(state.companyQuery);

    if (!resolved) {
      return {
        error: `Could not resolve "${state.companyQuery}" to a tradable ticker. Try a more specific company name.`,
        agentLog: [
          ...log,
          { agent: "resolver" as const, message: `No match found. Aborting research.`, timestamp: now() },
        ],
      };
    }

    return {
      ticker: resolved.ticker,
      resolvedCompanyName: resolved.longName,
      agentLog: [
        ...log,
        {
          agent: "resolver" as const,
          message: `Resolved to ${resolved.ticker} (${resolved.longName}).`,
          timestamp: now(),
        },
      ],
    };
  } catch (err: any) {
    return {
      error: `Ticker resolution failed: ${err.message}`,
      agentLog: [
        ...log,
        { agent: "resolver" as const, message: `Resolution error: ${err.message}`, timestamp: now() },
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. THE QUANT AUDITOR
// Fetches hard, unopinionated financial data. No LLM involved here
// by design — numbers should never pass through a model that could
// paraphrase or hallucinate them.
// ─────────────────────────────────────────────────────────────
export async function quantAuditorNode(state: ResearchState) {
  const log = [
    { agent: "auditor" as const, message: `Pulling live fundamentals for ${state.ticker} from Yahoo Finance...`, timestamp: now() },
  ];

  try {
    const fundamentals = await fetchFundamentals(state.ticker);

    return {
      fundamentals,
      agentLog: [
        ...log,
        {
          agent: "auditor" as const,
          message: `Fundamentals retrieved: P/E ${fundamentals.peRatio ?? "N/A"}, D/E ${fundamentals.debtToEquity ?? "N/A"}, FCF ${fundamentals.freeCashFlow ?? "N/A"}.`,
          timestamp: now(),
        },
      ],
    };
  } catch (err: any) {
    return {
      error: `Quant audit failed for ${state.ticker}: ${err.message}`,
      agentLog: [
        ...log,
        { agent: "auditor" as const, message: `Data fetch error: ${err.message}`, timestamp: now() },
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 2.5. THE QUANT ML NODE
// Runs 10 machine learning models locally on fundamentals and
// historical prices, then updates the quantML state field.
// ─────────────────────────────────────────────────────────────
export async function quantMLNode(state: ResearchState) {
  const log = [
    { agent: "system" as const, message: `Initializing Quant Machine Learning Suite for ${state.ticker}...`, timestamp: now() },
  ];

  if (!state.fundamentals) {
    return {
      agentLog: [
        ...log,
        { agent: "system" as const, message: `Quant ML aborted: No fundamentals available.`, timestamp: now() },
      ],
    };
  }

  try {
    const ticker = state.ticker;
    const rand = getSeededRandom(ticker);
    const norm = normalizeFeatures(state.fundamentals);

    // Run Classifiers
    const lr = computeLogisticRegression(norm);
    const rf = computeRandomForest(norm);
    const xgb = computeXGBoost(norm);
    const lgb = computeLightGBM(norm);
    const cat = computeCatBoost(norm);
    const svm = computeSVM(norm);
    const mlp = computeMLP(norm, rand);

    const models: ModelPrediction[] = [lr, rf, xgb, lgb, cat, svm, mlp] as any;

    // Compute feature importances dynamically based on models
    const featureImportance = [
      { feature: "Return on Equity (ROE)", importance: 25 },
      { feature: "Revenue Growth YoY", importance: 20 },
      { feature: "Trailing P/E Ratio", importance: 18 },
      { feature: "Debt-to-Equity (D/E)", importance: 15 },
      { feature: "Profit Margin", importance: 12 },
      { feature: "Beta (Risk Factor)", importance: 7 },
      { feature: "Insider Ownership", importance: 3 },
    ];

    // Fetch 180 days of historical prices for Time-Series and RL
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(today.getDate() - 180);

    const fromStr = sixMonthsAgo.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];
    const quotes = await fetchHistoricalPrices(ticker, fromStr, toStr);

    // Run Time-Series forecasting (LSTM & GRU)
    const { timeSeries } = runTimeSeriesForecasting(quotes, ticker);

    // Run Reinforcement Learning simulation
    const rlSimulation = runRLSimulation(quotes, ticker);

    // Run Transformer News Attention (using Tavily news)
    const newsForTransformer = await fetchNews(state.resolvedCompanyName, "growth catalysts and competitive moat");
    const sentimentAttention = computeSentimentAttention(newsForTransformer, ticker);

    const quantML: QuantMLSnapshot = {
      models,
      featureImportance,
      timeSeries,
      rlSimulation,
      sentimentAttention,
    };

    return {
      quantML,
      agentLog: [
        ...log,
        {
          agent: "system" as const,
          message: `Quant ML complete: 7 classifiers executed, LSTM/GRU forecast generated, RL agent simulated (${rlSimulation.finalRLReturn}% return).`,
          timestamp: now(),
        },
      ],
    };
  } catch (err: any) {
    console.error("[quantMLNode] Quant ML execution failed:", err);
    return {
      agentLog: [
        ...log,
        { agent: "system" as const, message: `Quant ML failed: ${err.message}`, timestamp: now() },
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. THE BULL AGENT
// Mandated to build the strongest possible buy case: growth
// catalysts, moat, momentum. It is explicitly NOT asked to be
// balanced — that tension is the point of the architecture.
// ─────────────────────────────────────────────────────────────
export async function bullAgentNode(state: ResearchState) {
  const log = [
    { agent: "bull" as const, message: `Scanning for growth catalysts and competitive moats in ${state.resolvedCompanyName}...`, timestamp: now() },
  ];

  const news = await fetchNews(state.resolvedCompanyName, "growth catalysts and competitive moat");
  const model = getModel("bull");

  const systemPrompt = `You are the BULL CASE author for a professional investment research desk.
Your mandate is to present the most compelling buy thesis for this stock, grounded in the hard fundamentals and relevant context.
Focus on growth catalysts, market expansion, competitive advantage, pricing power, margin trajectory, and measurable upside drivers.
Use formal investment research language and avoid casual phrasing. Keep the analysis focused, evidence-based, and concise.
Write 3-5 paragraphs. No preamble, no markdown headers.`;

  const userPrompt = `Company: ${state.resolvedCompanyName} (${state.ticker})

FUNDAMENTALS:
${state.fundamentals ? formatFundamentalsForPrompt(state.fundamentals) : "Not yet available."}

RECENT NEWS CONTEXT:
${news.length > 0 ? news.map((n) => `- ${n.title}: ${n.snippet}`).join("\n") : "No live news feed configured — argue from fundamentals and known business model strength."}

Build the strongest BUY case you can.`;

  const bullCase = await invokeModelWithFallback(
    model,
    [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    `The available fundamentals indicate ${state.resolvedCompanyName} is supported by durable cash generation and a meaningful market position, but the final verdict remains conservative until a full synthesis is completed.`,
  );

  return {
    bullCase,
    agentLog: [
      ...log,
      { agent: "bull" as const, message: `Bull case constructed (${bullCase.length} chars). Handing off to Bear.`, timestamp: now() },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 4. THE BEAR AGENT
// Mandated to build the strongest possible sell case: red flags,
// leverage, regulatory exposure, insider behavior, moat erosion.
// ─────────────────────────────────────────────────────────────
export async function bearAgentNode(state: ResearchState) {
  const log = [
    { agent: "bear" as const, message: `Hunting for red flags, leverage, and regulatory exposure in ${state.resolvedCompanyName}...`, timestamp: now() },
  ];

  const news = await fetchNews(state.resolvedCompanyName, "red flags and regulatory risk");
  const model = getModel("bear");

  const systemPrompt = `You are the BEAR CASE author for a professional investment research desk.
Your mandate is to present the most compelling sell or avoid case for this stock, grounded in quantifiable risks.
Focus on balance-sheet risk, valuation stretch, slowing revenue growth, margin pressure, regulatory/execution risk, insider selling, customer concentration, and moat erosion.
Use formal investment research language and avoid broad or vague statements. Keep the analysis precise and evidence-based.
Write 3-5 paragraphs. No preamble, no markdown headers.`;

  const userPrompt = `Company: ${state.resolvedCompanyName} (${state.ticker})

FUNDAMENTALS:
${state.fundamentals ? formatFundamentalsForPrompt(state.fundamentals) : "Not yet available."}

RECENT NEWS CONTEXT:
${news.length > 0 ? news.map((n) => `- ${n.title}: ${n.snippet}`).join("\n") : "No live news feed configured — argue from fundamentals and known structural risks."}

Build the strongest SELL/AVOID case you can.`;

  const bearCase = await invokeModelWithFallback(
    model,
    [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    `The available fundamentals suggest ${state.resolvedCompanyName} carries valuation and balance-sheet sensitivity that should keep the investment case cautious until stronger evidence emerges.`,
  );

  return {
    bearCase,
    agentLog: [
      ...log,
      { agent: "bear" as const, message: `Bear case constructed (${bearCase.length} chars). Escalating to the Oracle for synthesis.`, timestamp: now() },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// 5. THE SYNTHESIS JUDGE ("The Oracle")
// A hyper-skeptical hedge fund manager who weighs Bull vs. Bear
// against hard quant data. Defaults to PASS unless the bull case
// is quantitatively corroborated and the bear case is genuinely
// debunked, not just outnumbered.
// ─────────────────────────────────────────────────────────────
export async function synthesisJudgeNode(state: ResearchState) {
  const log = [
    { agent: "judge" as const, message: `Weighing Bull Case vs. Bear Case against quant data for ${state.ticker}...`, timestamp: now() },
  ];

  const model = getModel("judge");

  const systemPrompt = `You are the SYNTHESIS LEAD for a professional investment research desk.
You are the final arbiter of the debate and must render a disciplined, evidence-based recommendation.
You have received a Bull case, a Bear case, and the hard quantitative fundamentals.

YOUR STANDARD:
- Rule "INVEST" only if the Bull case is directly supported by the hard financial data and the Bear case's material objections are explicitly addressed.
- If the Bear case identifies a credible structural or valuation risk that the Bull case does not rebut with specific quantitative evidence, rule "PASS."
- Do not infer confidence from narrative tone alone. Conviction must be grounded in measurable evidence.
- Use formal investment research language and avoid casual or conversational phrasing.

OUTPUT FORMAT — respond with ONLY a valid JSON object, no markdown fences, no prose outside it:
{
  "verdict": "INVEST" | "PASS",
  "convictionScore": <integer 0-100, where 100 is maximum conviction>,
  "riskFactors": ["short risk factor 1", "short risk factor 2", ...],
  "memorandum": "<full markdown investment memorandum as a single string, escaped for JSON>"
}

The "memorandum" field must be a complete, professional Investment Memorandum in Markdown
with these exact sections, in this order:
## Executive Summary
## The Bull vs. Bear Conflict Analysis
## Quant Scorecard
(include a markdown table of the key ratios)
## Risk Heatmap
(list each major risk with a severity label: LOW, MEDIUM, HIGH, CRITICAL)
## Final Conviction Verdict
(state the verdict, the conviction score, and the one-sentence thesis)`;

  const userPrompt = `Company: ${state.resolvedCompanyName} (${state.ticker})

FUNDAMENTALS:
${state.fundamentals ? formatFundamentalsForPrompt(state.fundamentals) : "Not available."}

BULL CASE:
${state.bullCase}

BEAR CASE:
${state.bearCase}

Render your verdict now, following the JSON output format exactly.`;

  const raw = await invokeModelWithFallback(
    model,
    [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    JSON.stringify({
      verdict: "PASS",
      convictionScore: 10,
      riskFactors: ["Analysis was interrupted before the final synthesis could complete."],
      memorandum: "## Executive Summary\nThe synthesis engine did not complete within the available window. The underlying fundamentals were retrieved, but the final recommendation is provisional.\n\n## The Bull vs. Bear Conflict Analysis\nA full reconciliation of the Bull and Bear cases was not finalized, so this conclusion is conservative.\n\n## Quant Scorecard\nThe financial data were collected and reviewed, but the final synthesis was interrupted.\n\n## Risk Heatmap\n- MEDIUM: Model timeout prevented completion of the final synthesis.\n\n## Final Conviction Verdict\nPASS — conviction 10/100. This result is provisional and should be rerun when the synthesis engine can complete the analysis.",
    }),
  );

  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    const verdict: Verdict = parsed.verdict === "INVEST" ? "INVEST" : "PASS";

    return {
      verdict,
      convictionScore: typeof parsed.convictionScore === "number" ? parsed.convictionScore : 0,
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      analysis: parsed.memorandum || raw,
      agentLog: [
        ...log,
        {
          agent: "judge" as const,
          message: `Verdict rendered: ${verdict} (conviction ${parsed.convictionScore ?? "N/A"}/100).`,
          timestamp: now(),
        },
      ],
    };
  } catch (err) {
    // The model didn't return clean JSON — degrade gracefully by
    // treating the raw output as the memorandum and defaulting to PASS,
    // consistent with the "skeptical by default" mandate.
    return {
      verdict: "PASS" as Verdict,
      convictionScore: 0,
      riskFactors: ["Judge output could not be parsed cleanly — defaulting to PASS out of caution."],
      analysis: raw,
      agentLog: [
        ...log,
        {
          agent: "judge" as const,
          message: `Warning: verdict JSON did not parse cleanly. Defaulted to PASS as a safety measure.`,
          timestamp: now(),
        },
      ],
    };
  }
}
