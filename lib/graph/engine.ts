import { StateGraph, END, START } from "@langchain/langgraph";
import { ResearchStateAnnotation, type ResearchState } from "./state";
import {
  tickerResolverNode,
  quantAuditorNode,
  quantMLNode,
  bullAgentNode,
  bearAgentNode,
  synthesisJudgeNode,
} from "./nodes";

/**
 * STOCKSAGE — Adversarial Research Graph
 * ────────────────────────────────────────────
 *
 *        START
 *          │
 *   ┌──────▼───────┐
 *   │ Ticker        │   free text → tradable symbol
 *   │ Resolver      │
 *   └──────┬───────┘
 *          │ (abort early if unresolved)
 *   ┌──────▼───────┐
 *   │ Quant         │   hard numbers, no LLM opinion
 *   │ Auditor       │
 *   └──────┬───────┘
 *          │ (abort early if data fetch fails)
 *   ┌──────▼───────┐
 *   │ Quant ML      │   runs 10 ML models, time-series, RL, transformer attention
 *   │ Node          │
 *   └──────┬───────┘
 *          │ (abort early if ML setup fails)
 *   ┌──────▼───────┐
 *   │ Bull Agent    │   strongest possible BUY case
 *   └──────┬───────┘
 *          │
 *   ┌──────▼───────┐
 *   │ Bear Agent    │   strongest possible SELL case
 *   └──────┬───────┘
 *          │
 *   ┌──────▼───────┐
 *   │ Synthesis     │   The Oracle: weighs debate vs. data,
 *   │ Judge         │   renders binary verdict + memorandum
 *   └──────┬───────┘
 *          │
 *         END
 */

function routeAfterResolver(state: ResearchState): "quantAuditor" | typeof END {
  if (state.error || !state.ticker) return END;
  return "quantAuditor";
}

function routeAfterAuditor(state: ResearchState): "quantMLSuite" | typeof END {
  if (state.error || !state.fundamentals) return END;
  return "quantMLSuite";
}

function routeAfterQuantML(state: ResearchState): "bullAgent" | typeof END {
  if (state.error || !state.quantML) return END;
  return "bullAgent";
}

export function buildResearchGraph() {
  const graph = new StateGraph(ResearchStateAnnotation)
    .addNode("tickerResolver", tickerResolverNode)
    .addNode("quantAuditor", quantAuditorNode)
    .addNode("quantMLSuite", quantMLNode)
    .addNode("bullAgent", bullAgentNode)
    .addNode("bearAgent", bearAgentNode)
    .addNode("synthesisJudge", synthesisJudgeNode)
    .addEdge(START, "tickerResolver")
    .addConditionalEdges("tickerResolver", routeAfterResolver, {
      quantAuditor: "quantAuditor",
      [END]: END,
    })
    .addConditionalEdges("quantAuditor", routeAfterAuditor, {
      quantMLSuite: "quantMLSuite",
      [END]: END,
    })
    .addConditionalEdges("quantMLSuite", routeAfterQuantML, {
      bullAgent: "bullAgent",
      [END]: END,
    })
    .addEdge("bullAgent", "bearAgent")
    .addEdge("bearAgent", "synthesisJudge")
    .addEdge("synthesisJudge", END);

  return graph.compile();
}

export type CompiledResearchGraph = ReturnType<typeof buildResearchGraph>;
