process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { NextRequest } from "next/server";
import YahooFinance from "yahoo-finance2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yahoo = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }

  try {
    const results = await yahoo.search(q, { quotesCount: 10, newsCount: 0 });

    const candidates = (results.quotes || [])
      .filter((q: any) => q.quoteType === "EQUITY" && typeof q.symbol === "string")
      .slice(0, 8)
      .map((q: any) => ({ symbol: q.symbol, name: q.longname || q.shortname || q.symbol }));

    return new Response(JSON.stringify({ results: candidates }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/search] yahoo search failed:", err);
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }
}
