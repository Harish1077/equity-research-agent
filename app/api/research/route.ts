process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { NextRequest } from "next/server";
import { buildResearchGraph } from "@/lib/graph/engine";
import type { ResearchState } from "@/lib/graph/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// On Vercel Hobby (free) plan, maxDuration is capped at 10s.
// If you are on a Pro/Enterprise plan, you can uncomment this line to allow up to 120s:
// export const maxDuration = 120;

/**
 * POST /api/research
 * ───────────────────
 * Accepts { companyQuery: string } and streams newline-delimited
 * JSON events back to the client as the LangGraph workflow executes:
 *
 *   { type: "log",     entry: AgentLogEntry }        — a node started/finished
 *   { type: "state",   node: string, patch: object }  — partial state update
 *   { type: "final",   state: ResearchState }         — terminal state
 *   { type: "error",   message: string }              — hard failure
 *
 * We use graph.stream() with streamMode "values" so we get the full
 * accumulated state after every node, then diff agentLog client-side
 * to drive the Live Terminal in real time.
 */
export async function POST(req: NextRequest) {
  let body: { companyQuery?: string };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), { status: 400 });
  }

  const companyQuery = body.companyQuery?.trim();

  if (!companyQuery) {
    return new Response(JSON.stringify({ error: "companyQuery is required." }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  let lastLogIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
      };

      try {
        const hasGemini = !!process.env.GEMINI_API_KEY;

        if (!hasGemini) {
          const isProd = process.env.NODE_ENV === "production";
          send({
            type: "error",
            message: isProd
              ? "Missing Gemini credentials. Please configure GEMINI_API_KEY in your Vercel Project Settings and redeploy."
              : "Missing Gemini credentials. Add GEMINI_API_KEY to .env.local before running research.",
          });
          return;
        }

        const graph = buildResearchGraph();

        const initialState: Partial<ResearchState> = {
          companyQuery,
        };

        const eventStream = await graph.stream(initialState, {
          streamMode: "values",
        });

        let finalState: ResearchState | null = null;

        for await (const stateUpdate of eventStream) {
          const typed = stateUpdate as ResearchState;
          finalState = typed;

          // Emit any new log entries since the last chunk we saw.
          const newLogs = typed.agentLog.slice(lastLogIndex);
          lastLogIndex = typed.agentLog.length;

          for (const entry of newLogs) {
            send({ type: "log", entry });
          }

          send({
            type: "state",
            patch: {
              ticker: typed.ticker,
              resolvedCompanyName: typed.resolvedCompanyName,
              fundamentals: typed.fundamentals,
              quantML: typed.quantML,
              bullCase: typed.bullCase,
              bearCase: typed.bearCase,
              verdict: typed.verdict,
              convictionScore: typed.convictionScore,
            },
          });
        }

        if (finalState?.error) {
          send({ type: "error", message: finalState.error });
        } else {
          send({ type: "final", state: finalState });
        }
      } catch (err: any) {
        console.error("[api/research] Graph execution failed:", err);
        const message =
          err?.message && typeof err.message === "string"
            ? err.message
            : "Unknown research engine failure.";
        const friendly =
          message.includes("invalid x-api-key") ||
          message.includes("authentication_error") ||
          message.includes("credit balance") ||
          message.includes("Plans & Billing")
            ? "The configured AI key is valid but Anthropic is refusing the request. This is usually caused by expired/insufficient credits or a billing issue. Please check your Anthropic account billing/credits and update ANTHROPIC_API_KEY if needed."
            : message;
        send({ type: "error", message: friendly });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
