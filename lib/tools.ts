import YahooFinance from "yahoo-finance2";
import type { FinancialSnapshot } from "./graph/state";

// yahoo-finance2 v3 ships its default export as a class — it must be
// instantiated once and reused, rather than called statically.
export const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });

export function timeoutPromise<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * resolveTicker
 * ─────────────
 * Converts a free-text company name ("the iPhone company") into a
 * real, tradable ticker symbol using Yahoo Finance's own search
 * endpoint. This is a real network call — no hardcoded lookup table.
 */
export async function resolveTicker(
  companyQuery: string
): Promise<{ ticker: string; longName: string } | null> {
  const normalize = (query: string) =>
    query
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[.,;:!?]+$/g, "")
      .trim();

  const stripSuffix = (query: string) =>
    query
      .replace(/\b(inc|incorporated|ltd|plc|corp|corporation|co|group|holdings|berhad|s\.a\.)\b\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const symbolLike = (query: string) => /^[A-Za-z0-9.-]{1,8}$/.test(query.trim());

  const scoreCandidate = (quote: any, normalizedQuery: string) => {
    const symbol = (quote.symbol || "").toLowerCase();
    const longname = (quote.longname || "").toLowerCase();
    const shortname = (quote.shortname || "").toLowerCase();
    const scoreMeta = typeof quote.score === "number" ? quote.score / 1000 : 0;

    let score = scoreMeta;
    if (symbol === normalizedQuery) score += 120;
    if (longname === normalizedQuery || shortname === normalizedQuery) score += 100;
    if (longname.includes(normalizedQuery) || shortname.includes(normalizedQuery)) score += 60;
    if (symbol.startsWith(normalizedQuery)) score += 30;
    if (normalizedQuery.split(" ").every((word) => word && longname.includes(word))) score += 30;
    if (quote.exchange && ["NMS", "NAS", "NYQ"].includes(quote.exchange)) score += 10;
    return score;
  };

  const queries = new Set<string>([
    companyQuery,
    normalize(companyQuery),
    stripSuffix(companyQuery),
  ].filter(Boolean));

  for (const query of queries) {
    try {
      const results = await timeoutPromise(
        yahooFinance.search(query, { quotesCount: 20, newsCount: 0 }),
        8000,
        "Yahoo Search timed out"
      );

      const candidates = (results.quotes || [])
        .filter(
          (q: any) =>
            q.quoteType === "EQUITY" && typeof q.symbol === "string" && q.symbol.length > 0,
        ) as any[];

      if (candidates.length === 0) continue;

      const best = candidates
        .map((quote) => ({ quote, score: scoreCandidate(quote, normalize(query).toLowerCase()) }))
        .sort((a, b) => b.score - a.score)[0]?.quote;

      if (best) {
        return {
          ticker: best.symbol,
          longName: best.longname || best.shortname || query,
        };
      }
    } catch (err) {
      console.error("[resolveTicker] Yahoo Finance search failed for query:", query, err);
    }
  }

  if (symbolLike(companyQuery)) {
    try {
      const summary = await timeoutPromise(
        yahooFinance.quoteSummary(companyQuery.trim(), { modules: ["price"] }),
        8000,
        "Yahoo Quote fallback timed out"
      );
      const price = summary.price;
      if (price?.symbol) {
        return {
          ticker: price.symbol,
          longName: price.longName || price.shortName || companyQuery,
        };
      }
    } catch (err) {
      console.error("[resolveTicker] Yahoo Finance quote summary fallback failed:", err);
    }
  }

  return null;
}

/**
 * fetchFundamentals
 * ──────────────────
 * Pulls hard quantitative data for a resolved ticker: valuation
 * ratios, leverage, cash generation, growth, and ownership signals.
 * This is the data the Judge uses to arbitrate the Bull/Bear debate —
 * it must never be fabricated, so every field can be null if Yahoo
 * doesn't report it for that ticker.
 */
async function fetchFundamentalsYahoo(
  ticker: string
): Promise<FinancialSnapshot> {
  const emptySnapshot = (): FinancialSnapshot => ({
    companyName: ticker,
    currency: "USD",
    price: null,
    marketCap: null,
    peRatio: null,
    forwardPE: null,
    debtToEquity: null,
    freeCashFlow: null,
    totalRevenue: null,
    netIncome: null,
    revenueGrowthYoY: null,
    profitMargin: null,
    returnOnEquity: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    beta: null,
    insiderOwnershipPct: null,
  });

  try {
    let summary: any = null;

    try {
      summary = await timeoutPromise(
        yahooFinance.quoteSummary(ticker, {
          modules: [
            "price",
            "summaryDetail",
            "financialData",
            "defaultKeyStatistics",
            "incomeStatementHistory",
            "majorHoldersBreakdown",
          ],
        }),
        8000,
        "Yahoo library query timed out"
      );
    } catch (libErr: any) {
      console.warn(`[fetchFundamentalsYahoo] Library query failed: ${libErr.message}. Trying direct quoteSummary fallback...`);
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker.toUpperCase()}?modules=price,summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,majorHoldersBreakdown`;
      const res = await timeoutPromise(fetch(url), 8000, "Direct Yahoo query timed out");
      if (!res.ok) {
        throw new Error(`Direct query failed with status ${res.status}`);
      }
      const data = await res.json();
      const result = data.quoteSummary?.result?.[0];
      if (!result) {
        throw new Error(`Direct query returned no result for ${ticker}`);
      }
      summary = result;
    }

    const price = summary.price;
    const summaryDetail = summary.summaryDetail;
    const financialData = summary.financialData;
    const keyStats = summary.defaultKeyStatistics;

    const getVal = (obj: any) => {
      if (obj === null || obj === undefined) return null;
      if (typeof obj === "object" && "raw" in obj) return obj.raw;
      return obj;
    };

    const incomeHistory = summary.incomeStatementHistory?.incomeStatementHistory || [];
    const holders = summary.majorHoldersBreakdown;

    const latestIncome = incomeHistory.length > 0 ? incomeHistory[0] : null;
    const priorIncome = incomeHistory.length > 1 ? incomeHistory[1] : null;

    let revenueGrowthYoY: number | null = null;
    const latRev = getVal(latestIncome?.totalRevenue);
    const priRev = getVal(priorIncome?.totalRevenue);
    if (latRev !== null && priRev) {
      revenueGrowthYoY = ((latRev - priRev) / Math.abs(priRev)) * 100;
    } else {
      const revGrowth = getVal(financialData?.revenueGrowth);
      if (revGrowth !== null) {
        revenueGrowthYoY = revGrowth * 100;
      }
    }

    const priceVal = getVal(price?.regularMarketPrice);
    const marketCapVal = getVal(price?.marketCap);
    const peRatioVal = getVal(summaryDetail?.trailingPE) ?? getVal(summaryDetail?.trailingPe);
    const forwardPEVal = getVal(summaryDetail?.forwardPE) ?? getVal(summaryDetail?.forwardPe);
    const debtToEquityVal = getVal(financialData?.debtToEquity);
    const freeCashFlowVal = getVal(financialData?.freeCashflow);
    const totalRevenueVal = getVal(financialData?.totalRevenue) ?? getVal(latestIncome?.totalRevenue);
    const netIncomeVal = getVal(latestIncome?.netIncome);
    const profitMarginVal = getVal(financialData?.profitMargins);
    const returnOnEquityVal = getVal(financialData?.returnOnEquity);
    const fiftyTwoWeekHighVal = getVal(summaryDetail?.fiftyTwoWeekHigh);
    const fiftyTwoWeekLowVal = getVal(summaryDetail?.fiftyTwoWeekLow);
    const betaVal = getVal(summaryDetail?.beta) ?? getVal(keyStats?.beta);
    const insiderOwnershipPctVal = getVal(holders?.insidersPercentHeld);

    return {
      companyName: price?.longName || price?.shortName || ticker,
      currency: price?.currency || "USD",
      price: priceVal,
      marketCap: marketCapVal,
      peRatio: peRatioVal,
      forwardPE: forwardPEVal,
      debtToEquity: debtToEquityVal,
      freeCashFlow: freeCashFlowVal,
      totalRevenue: totalRevenueVal,
      netIncome: netIncomeVal,
      revenueGrowthYoY,
      profitMargin: profitMarginVal !== null ? profitMarginVal * 100 : null,
      returnOnEquity: returnOnEquityVal !== null ? returnOnEquityVal * 100 : null,
      fiftyTwoWeekHigh: fiftyTwoWeekHighVal,
      fiftyTwoWeekLow: fiftyTwoWeekLowVal,
      beta: betaVal,
      insiderOwnershipPct: insiderOwnershipPctVal !== null ? insiderOwnershipPctVal * 100 : null,
    };
  } catch (err) {
    console.error("[fetchFundamentalsYahoo] Yahoo Finance data fetch failed:", err);
    return emptySnapshot();
  }
}

// ────────────────────────────────────────────────────────────────
// Polygon.io Advanced Data Fetch Helpers
// ────────────────────────────────────────────────────────────────

async function fetchPolygonTickerDetails(ticker: string, apiKey: string) {
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker.toUpperCase()}?apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Polygon details failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.results || {};
}

async function fetchPolygonFinancials(ticker: string, apiKey: string) {
  const url = `https://api.polygon.io/vX/reference/financials?ticker=${ticker.toUpperCase()}&limit=2&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Polygon financials failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

async function fetchPolygonHistoricalPrices(ticker: string, fromDate: string, toDate: string, apiKey: string) {
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=300&apiKey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Polygon aggregates failed with status ${res.status}`);
  }
  const data = await res.json();
  return data.results || [];
}

/**
 * fetchFundamentals
 * ──────────────────
 * Pulls quantitative company financials. If POLYGON_API_KEY is defined in the
 * environment, it upgrades key balance sheet and income metrics with official 
 * SEC filings from Polygon.io, falling back transparently to Yahoo Finance on 
 * quota rate limits or configuration absence.
 */
export async function fetchFundamentals(ticker: string): Promise<FinancialSnapshot> {
  const base = await fetchFundamentalsYahoo(ticker);
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return base;
  }

  try {
    console.log(`[fetchFundamentals] Upgrading with Polygon.io financials for ${ticker}`);
    
    const [details, financials] = await Promise.all([
      fetchPolygonTickerDetails(ticker, apiKey).catch((err) => {
        console.warn(`[fetchFundamentals] Polygon details query failed:`, err.message);
        return {};
      }),
      fetchPolygonFinancials(ticker, apiKey).catch((err) => {
        console.warn(`[fetchFundamentals] Polygon financials query failed:`, err.message);
        return [];
      }),
    ]);

    const latest = financials[0];
    const prior = financials[1];

    const balanceSheet = latest?.financials?.balance_sheet || {};
    const incomeStatement = latest?.financials?.income_statement || {};
    const cashFlow = latest?.financials?.cash_flow_statement || {};

    const totalRevenue = incomeStatement.revenues?.value ?? null;
    const netIncome = incomeStatement.net_income_loss?.value ?? null;
    const liabilities = balanceSheet.liabilities?.value ?? null;
    const equity = balanceSheet.equity?.value ?? balanceSheet.stockholders_equity?.value ?? null;
    const operatingCashFlow = cashFlow.net_cash_flow_from_operating_activities?.value ?? null;
    const capEx = cashFlow.capital_expenditures?.value ?? 0;

    const freeCashFlow = operatingCashFlow !== null ? (operatingCashFlow - capEx) : base.freeCashFlow;
    const profitMargin = (netIncome !== null && totalRevenue) ? (netIncome / totalRevenue) * 100 : base.profitMargin;
    const debtToEquity = (liabilities !== null && equity) ? (liabilities / equity) * 100 : base.debtToEquity;

    let revenueGrowthYoY = base.revenueGrowthYoY;
    const priorRevenue = prior?.financials?.income_statement?.revenues?.value;
    if (totalRevenue !== null && priorRevenue) {
      revenueGrowthYoY = ((totalRevenue - priorRevenue) / Math.abs(priorRevenue)) * 100;
    }

    const returnOnEquity = (netIncome !== null && equity) ? (netIncome / equity) * 100 : base.returnOnEquity;

    return {
      ...base,
      companyName: details.name || base.companyName,
      marketCap: details.market_cap || base.marketCap,
      currency: details.currency_name?.toUpperCase() || base.currency,
      totalRevenue: totalRevenue ?? base.totalRevenue,
      netIncome: netIncome ?? base.netIncome,
      freeCashFlow,
      profitMargin,
      debtToEquity,
      revenueGrowthYoY,
      returnOnEquity,
    };
  } catch (err: any) {
    console.warn(`[fetchFundamentals] Polygon upgrade wrapper crashed: ${err.message}. Using Yahoo Finance.`);
    return base;
  }
}

/**
 * fetchHistoricalPrices
 * ──────────────────────
 * Pulls daily historical OHLCV chart bars for time-series forecasting models.
 * Utilizes Polygon.io if available, falling back to Yahoo Finance quote charts.
 */
export async function fetchHistoricalPrices(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<{ date: Date; close: number }[]> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (apiKey) {
    try {
      console.log(`[fetchHistoricalPrices] Querying Polygon.io aggregates for ${ticker}`);
      const results = await fetchPolygonHistoricalPrices(ticker, fromDate, toDate, apiKey);
      if (results && results.length > 0) {
        return results.map((r: any) => ({
          date: new Date(r.t),
          close: Number(r.c),
        }));
      }
    } catch (err: any) {
      console.warn(`[fetchHistoricalPrices] Polygon aggregates fetch failed: ${err.message}. Falling back to Yahoo Finance.`);
    }
  }

  const chartData = await timeoutPromise(
    yahooFinance.chart(ticker, {
      period1: fromDate,
      period2: toDate,
      interval: "1d",
    }),
    10000,
    "Yahoo Chart query timed out"
  );
  const quotes = chartData.quotes || [];
  return quotes
    .filter((q: any) => typeof q.close === "number" && q.date)
    .map((q: any) => ({
      date: new Date(q.date),
      close: q.close,
    }));
}

export interface NewsItem {
  title: string;
  url: string;
  snippet: string;
}

/**
 * fetchNews
 * ─────────
 * Pulls recent, sourced news/context via Tavily's search API so the
 * Bull and Bear agents argue from current events, not just static
 * financials. Gracefully degrades to an empty list if no Tavily key
 * is configured — the graph still runs on fundamentals alone.
 */
export async function fetchNews(
  companyName: string,
  angle: "growth catalysts and competitive moat" | "red flags and regulatory risk"
): Promise<NewsItem[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await timeoutPromise(
      fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: `${companyName} ${angle} latest news`,
          search_depth: "advanced",
          max_results: 5,
          include_answer: false,
        }),
      }),
      10000,
      "Tavily News search query timed out"
    );

    if (!response.ok) {
      console.error("[fetchNews] Tavily request failed:", response.status);
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 400) || "",
    }));
  } catch (err) {
    console.error("[fetchNews] Tavily search failed:", err);
    return [];
  }
}

/**
 * formatFundamentalsForPrompt
 * ────────────────────────────
 * Renders the snapshot as a compact, LLM-friendly block so the
 * Bull, Bear, and Judge nodes all reason over identical hard numbers.
 */
export function formatFundamentalsForPrompt(f: FinancialSnapshot): string {
  const fmt = (n: number | null, suffix = "") =>
    n === null || n === undefined ? "N/A" : `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;

  const fmtLarge = (n: number | null) => {
    if (n === null || n === undefined) return "N/A";
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    return n.toLocaleString();
  };

  return [
    `Company: ${f.companyName}`,
    `Currency: ${f.currency}`,
    `Share Price: ${fmt(f.price)}`,
    `Market Cap: ${fmtLarge(f.marketCap)}`,
    `Trailing P/E: ${fmt(f.peRatio)}`,
    `Forward P/E: ${fmt(f.forwardPE)}`,
    `Debt-to-Equity: ${fmt(f.debtToEquity)}`,
    `Free Cash Flow: ${fmtLarge(f.freeCashFlow)}`,
    `Total Revenue: ${fmtLarge(f.totalRevenue)}`,
    `Net Income: ${fmtLarge(f.netIncome)}`,
    `Revenue Growth YoY: ${fmt(f.revenueGrowthYoY, "%")}`,
    `Profit Margin: ${fmt(f.profitMargin, "%")}`,
    `Return on Equity: ${fmt(f.returnOnEquity, "%")}`,
    `52-Week Range: ${fmt(f.fiftyTwoWeekLow)} - ${fmt(f.fiftyTwoWeekHigh)}`,
    `Beta: ${fmt(f.beta)}`,
    `Insider Ownership: ${fmt(f.insiderOwnershipPct, "%")}`,
  ].join("\n");
}
