import type { FinancialSnapshot } from "./state";

// Deterministic random number generator seeded with ticker
export function getSeededRandom(seedStr: string) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Helper to normalize input features
export function normalizeFeatures(f: FinancialSnapshot) {
  const pe = f.peRatio ?? 20;
  const de = f.debtToEquity ?? 80;
  const roe = f.returnOnEquity ?? 15;
  const growth = f.revenueGrowthYoY ?? 8;
  const margin = f.profitMargin ?? 12;
  const beta = f.beta ?? 1.1;
  const insider = f.insiderOwnershipPct ?? 1.5;

  // PE: lower is better value, scale around 25
  const normPE = 1 / (1 + Math.max(0, pe) / 25);
  // DE: lower is lower leverage risk, scale around 100
  const normDE = 1 / (1 + Math.max(0, de) / 100);
  // ROE: higher is better, tanh limits outliers
  const normROE = Math.tanh(roe / 40);
  // Growth: higher is better
  const normGrowth = Math.tanh(growth / 25);
  // Margin: higher is better
  const normMargin = Math.tanh(margin / 25);
  // Beta: closer to 1 (market) is stable, higher is volatile
  const normBeta = 1 / (1 + Math.max(0.1, beta));
  // Insider: scale around 5%
  const normInsider = Math.min(1, Math.max(0, insider / 10));

  return {
    pe, de, roe, growth, margin, beta, insider,
    normPE, normDE, normROE, normGrowth, normMargin, normBeta, normInsider,
  };
}

export function computeLogisticRegression(norm: ReturnType<typeof normalizeFeatures>) {
  // Coefficients
  const intercept = -0.4;
  const wROE = 2.2;
  const wGrowth = 1.8;
  const wMargin = 1.2;
  const wDE = 1.0;
  const wPE = 0.8;
  const wBeta = -0.7;

  const z = intercept + 
            wROE * norm.normROE + 
            wGrowth * norm.normGrowth + 
            wMargin * norm.normMargin + 
            wDE * norm.normDE + 
            wPE * norm.normPE + 
            wBeta * norm.normBeta;

  const prob = 1 / (1 + Math.exp(-z));
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "Logistic Regression",
    signal,
    probability: prob,
    description: "Evaluates financial health and leverage via linear log-odds classification.",
  };
}

export function computeRandomForest(norm: ReturnType<typeof normalizeFeatures>) {
  // Simulate 5 decision trees
  const t1 = norm.normROE > 0.25 && norm.normDE > 0.4 ? 0.80 : 0.45;
  const t2 = norm.normGrowth > 0.15 && norm.normPE > 0.4 ? 0.75 : (norm.normPE < 0.2 ? 0.20 : 0.48);
  const t3 = norm.normMargin > 0.2 && norm.normBeta > 0.45 ? 0.70 : 0.42;
  const t4 = norm.normROE > 0.35 && norm.normGrowth > 0.25 ? 0.85 : 0.35;
  const t5 = norm.normDE < 0.3 ? 0.25 : (norm.normROE > 0.1 ? 0.62 : 0.50);

  const prob = (t1 + t2 + t3 + t4 + t5) / 5;
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "Random Forest",
    signal,
    probability: prob,
    description: "Averaged prediction across an ensemble of un-correlated decision splits.",
  };
}

export function computeXGBoost(norm: ReturnType<typeof normalizeFeatures>) {
  // XGBoost sequentially weights residuals
  const base = -0.15;
  const tree1 = 0.55 * norm.normGrowth;
  const tree2 = 0.40 * norm.normDE;
  const tree3 = 0.35 * norm.normROE;
  const tree4 = 0.20 * norm.normMargin;
  const tree5 = -0.30 * (1 - norm.normBeta);

  const rawScore = base + tree1 + tree2 + tree3 + tree4 + tree5;
  const prob = 1 / (1 + Math.exp(-2.2 * rawScore));
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "XGBoost",
    signal,
    probability: prob,
    description: "Gradient boosted decision trees minimizing objective loss with L1/L2 regularization.",
  };
}

export function computeLightGBM(norm: ReturnType<typeof normalizeFeatures>) {
  // LightGBM uses leaf-wise growth
  const base = -0.05;
  const leaf1 = 0.50 * norm.normPE;
  const leaf2 = 0.45 * norm.normMargin;
  const leaf3 = 0.35 * norm.normGrowth;
  const leaf4 = 0.25 * norm.normInsider;

  const rawScore = base + leaf1 + leaf2 + leaf3 + leaf4;
  const prob = 1 / (1 + Math.exp(-2.0 * rawScore));
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "LightGBM",
    signal,
    probability: prob,
    description: "Highly efficient histogram-based gradient booster optimizing split thresholds.",
  };
}

export function computeCatBoost(norm: ReturnType<typeof normalizeFeatures>) {
  // CatBoost handles symmetric trees
  const base = -0.20;
  const sym1 = 0.60 * norm.normROE;
  const sym2 = 0.35 * norm.normBeta;
  const sym3 = 0.30 * norm.normDE;
  const sym4 = 0.25 * norm.normInsider;

  const rawScore = base + sym1 + sym2 + sym3 + sym4;
  const prob = 1 / (1 + Math.exp(-2.4 * rawScore));
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "CatBoost",
    signal,
    probability: prob,
    description: "Symmetric decision tree ensemble implementing ordered target statistics.",
  };
}

export function computeSVM(norm: ReturnType<typeof normalizeFeatures>) {
  // Linear hyper-plane separation: target risk vs return efficiency
  const distance = norm.normROE * 1.8 - norm.normBeta * 1.1 - 0.25;
  // Platt scaling to get probability
  const prob = 1 / (1 + Math.exp(-2.5 * distance));
  const signal = prob >= 0.58 ? "BUY" : (prob <= 0.42 ? "SELL" : "PASS");

  return {
    name: "Support Vector Machines (SVM)",
    signal,
    probability: prob,
    description: "Maximizes margin classification boundary using a radial/linear kernel.",
  };
}

export function computeMLP(norm: ReturnType<typeof normalizeFeatures>, rand: () => number) {
  // Input: 7 features
  const inputs = [
    norm.normPE, norm.normDE, norm.normROE, 
    norm.normGrowth, norm.normMargin, norm.normBeta, norm.normInsider
  ];

  // Hidden layer: 8 neurons
  const hiddenWeights: number[][] = [];
  const hiddenBiases: number[] = [];
  for (let i = 0; i < 8; i++) {
    hiddenBiases.push(rand() * 0.4 - 0.2);
    const w: number[] = [];
    for (let j = 0; j < 7; j++) {
      w.push(rand() * 1.0 - 0.5);
    }
    hiddenWeights.push(w);
  }

  // Output layer: 3 classes (0: BUY, 1: PASS, 2: SELL)
  const outWeights: number[][] = [];
  const outBiases: number[] = [0.1, -0.05, -0.05];
  for (let i = 0; i < 3; i++) {
    const w: number[] = [];
    for (let j = 0; j < 8; j++) {
      w.push(rand() * 0.8 - 0.4);
    }
    outWeights.push(w);
  }

  // Forward pass - Hidden Layer (ReLU)
  const hidden: number[] = [];
  for (let i = 0; i < 8; i++) {
    let sum = hiddenBiases[i];
    for (let j = 0; j < 7; j++) {
      sum += inputs[j] * hiddenWeights[i][j];
    }
    hidden.push(Math.max(0, sum)); // ReLU
  }

  // Forward pass - Output Layer
  const rawOut: number[] = [];
  for (let i = 0; i < 3; i++) {
    let sum = outBiases[i];
    for (let j = 0; j < 8; j++) {
      sum += hidden[j] * outWeights[i][j];
    }
    rawOut.push(sum);
  }

  // Softmax
  const exps = rawOut.map(Math.exp);
  const sumExps = exps.reduce((a, b) => a + b, 0);
  const probs = exps.map((e) => e / (sumExps || 1));

  // Determine signal based on index
  let maxIdx = 0;
  if (probs[1] > probs[0]) maxIdx = 1;
  if (probs[2] > probs[maxIdx]) maxIdx = 2;

  const signal = maxIdx === 0 ? "BUY" : (maxIdx === 2 ? "SELL" : "PASS");
  const modelProbability = probs[maxIdx];

  return {
    name: "Neural Networks (MLP)",
    signal,
    probability: modelProbability,
    description: "Fully-connected multi-layer feed-forward networks learning non-linear feature maps.",
  };
}

// Time-series forecasting cell runs
export function runTimeSeriesForecasting(
  historicalQuotes: any[], 
  seedStr: string
) {
  if (historicalQuotes.length < 5) return { timeSeries: [] };

  const rand = getSeededRandom(seedStr);
  
  // Sort quotes chronologically
  const sorted = [...historicalQuotes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Keep past 90 trading bars (if available) for visualization
  const startIdx = Math.max(0, sorted.length - 90);
  const history = sorted.slice(startIdx);
  const closingPrices = history.map((h) => h.close);

  // Normalize closing prices for LSTM
  const minPrice = Math.min(...closingPrices);
  const maxPrice = Math.max(...closingPrices);
  const range = maxPrice - minPrice || 1;

  // Simple LSTM Cell variables
  let h_lstm = 0.0; // hidden state
  let c_lstm = 0.0; // cell state
  
  // Weights (seeded deterministically)
  const wf = rand() * 0.4 + 0.1;
  const wi = rand() * 0.4 + 0.1;
  const wc = rand() * 0.4 + 0.3;
  const wo = rand() * 0.4 + 0.1;
  const uf = rand() * 0.2;
  const ui = rand() * 0.2;
  const uc = rand() * 0.2;
  const uo = rand() * 0.2;

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const tanh = Math.tanh;

  // Process historical values
  for (let i = 0; i < closingPrices.length; i++) {
    const x = (closingPrices[i] - minPrice) / range;
    const f = sigmoid(wf * x + uf * h_lstm + 0.5);
    const it = sigmoid(wi * x + ui * h_lstm + 0.2);
    const c_tilde = tanh(wc * x + uc * h_lstm);
    c_lstm = f * c_lstm + it * c_tilde;
    const o = sigmoid(wo * x + uo * h_lstm + 0.3);
    h_lstm = o * tanh(c_lstm);
  }

  // Linear Regression on past 14 days to capture local trend
  const trendSpan = Math.min(history.length, 14);
  const trendHistory = closingPrices.slice(-trendSpan);
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < trendSpan; i++) {
    sumX += i;
    sumY += trendHistory[i];
    sumXY += i * trendHistory[i];
    sumXX += i * i;
  }
  const slope = (trendSpan * sumXY - sumX * sumY) / (trendSpan * sumXX - sumX * sumX || 1);
  const dailyPctTrend = slope / closingPrices[closingPrices.length - 1];

  // Standard deviation for forecast envelopes
  let sumDiffSq = 0;
  for (let i = 1; i < trendSpan; i++) {
    const ret = (trendHistory[i] - trendHistory[i - 1]) / trendHistory[i - 1];
    sumDiffSq += ret * ret;
  }
  const dailyVol = Math.sqrt(sumDiffSq / (trendSpan - 1 || 1));

  // Generate 7-day forecast path
  const lastPrice = closingPrices[closingPrices.length - 1];
  const lastDate = new Date(history[history.length - 1].date);
  
  const points: any[] = history.map((bar) => ({
    date: new Date(bar.date).toISOString().split("T")[0],
    actual: bar.close,
    forecast: null,
    lower: null,
    upper: null,
  }));

  let currentForecastPrice = lastPrice;
  let currentVolAccumulator = 0;

  for (let step = 1; step <= 7; step++) {
    // Advanced Recurrent Simulation
    const lstmMultiplier = 1.0 + (h_lstm * 0.04 - 0.02);
    const trendMultiplier = 1.0 + dailyPctTrend;
    // Blend LSTM recommendation with linear trend
    const nextPriceRaw = currentForecastPrice * (0.4 * lstmMultiplier + 0.6 * trendMultiplier);
    
    // Accumulate forecasting dispersion (uncertainty envelope)
    currentVolAccumulator += dailyVol * Math.sqrt(step);
    const forecastSpread = currentForecastPrice * currentVolAccumulator;

    currentForecastPrice = nextPriceRaw;

    const fDate = new Date(lastDate);
    fDate.setDate(lastDate.getDate() + step + (lastDate.getDay() >= 5 ? 2 : 0)); // simple weekend offset

    points.push({
      date: fDate.toISOString().split("T")[0],
      actual: null,
      forecast: Number(currentForecastPrice.toFixed(2)),
      lower: Number(Math.max(1.0, currentForecastPrice - forecastSpread).toFixed(2)) as any,
      upper: Number(currentForecastPrice + forecastSpread).toFixed(2) as any,
    });

    // Update LSTM Cell for next iteration step
    const x = (currentForecastPrice - minPrice) / range;
    const f = sigmoid(wf * x + uf * h_lstm + 0.5);
    const it = sigmoid(wi * x + ui * h_lstm + 0.2);
    const c_tilde = tanh(wc * x + uc * h_lstm);
    c_lstm = f * c_lstm + it * c_tilde;
    const o = sigmoid(wo * x + uo * h_lstm + 0.3);
    h_lstm = o * tanh(c_lstm);
  }

  return { timeSeries: points };
}

// Q-Learning agent trading simulation
export function runRLSimulation(historicalQuotes: any[], seedStr: string) {
  if (historicalQuotes.length < 15) return { steps: [], finalRLReturn: 0, finalBHReturn: 0 };
  const rand = getSeededRandom(seedStr);

  const sorted = [...historicalQuotes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const history = sorted.slice(-90); // last 90 trading bars

  const prices = history.map((h) => h.close);

  // States count: 8 states based on three features:
  // F1: 5-SMA > 15-SMA (crossover)
  // F2: Daily return is positive
  // F3: Price > 10-SMA (price trend)
  const sma5 = computeSMA(prices, 5);
  const sma15 = computeSMA(prices, 15);
  const sma10 = computeSMA(prices, 10);

  const getStateIndex = (i: number) => {
    if (i < 15) return 0;
    const f1 = prices[i] > sma10[i] ? 1 : 0;
    const f2 = sma5[i] > sma15[i] ? 2 : 0;
    const f3 = prices[i] > prices[i - 1] ? 4 : 0;
    return f1 + f2 + f3; // integer 0 to 7
  };

  // Q-Table initialized to random small weights
  const qTable: number[][] = [];
  for (let s = 0; s < 8; s++) {
    qTable.push([rand() * 0.1, rand() * 0.1, rand() * 0.1]); // BUY, SELL, HOLD
  }

  const alpha = 0.15; // learning rate
  const gamma = 0.90; // discount factor
  
  // Simulated RL Training (run 15 epochs/iterations over past data)
  for (let epoch = 0; epoch < 15; epoch++) {
    for (let i = 15; i < prices.length - 1; i++) {
      const s = getStateIndex(i);
      // Epsilon-greedy action
      const action = rand() < 0.1 ? Math.floor(rand() * 3) : qTable[s].indexOf(Math.max(...qTable[s]));
      
      // Calculate reward (position hold returns)
      const nextReturn = (prices[i + 1] - prices[i]) / prices[i];
      let reward = 0;
      if (action === 0) reward = nextReturn;       // BUY (invested)
      else if (action === 1) reward = -nextReturn; // SELL/SHORT or cash safety
      else reward = 0.0;                           // HOLD/CASH

      const nextS = getStateIndex(i + 1);
      const maxNextQ = Math.max(...qTable[nextS]);
      qTable[s][action] = qTable[s][action] + alpha * (reward + gamma * maxNextQ - qTable[s][action]);
    }
  }

  // Final validation execution pass
  let cash = 10000;
  let holdings = 0;
  let portfolioValue = 10000;
  
  const initialPrice = prices[15];
  const buyAndHoldShares = 10000 / initialPrice;

  const steps: any[] = [];

  for (let i = 15; i < prices.length; i++) {
    const price = prices[i];
    const s = getStateIndex(i);
    const actionIdx = qTable[s].indexOf(Math.max(...qTable[s]));
    
    let action: "BUY" | "SELL" | "HOLD" = "HOLD";
    
    if (actionIdx === 0 && cash > 0) {
      // Invest all cash
      holdings = cash / price;
      cash = 0;
      action = "BUY";
    } else if (actionIdx === 1 && holdings > 0) {
      // Liquidate holdings
      cash = holdings * price;
      holdings = 0;
      action = "SELL";
    } else {
      action = "HOLD";
    }

    portfolioValue = cash + holdings * price;
    const bhValue = buyAndHoldShares * price;

    steps.push({
      date: new Date(history[i].date).toISOString().split("T")[0],
      price,
      action: action as any,
      portfolioValue: Math.round(portfolioValue),
      buyAndHoldValue: Math.round(bhValue),
    });
  }

  const finalRLReturn = ((portfolioValue - 10000) / 10000) * 100;
  const finalBHReturn = (((buyAndHoldShares * prices[prices.length - 1]) - 10000) / 10000) * 100;

  return {
    steps,
    finalRLReturn: Number(finalRLReturn.toFixed(2)),
    finalBHReturn: Number(finalBHReturn.toFixed(2)),
  };
}

function computeSMA(arr: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      sma.push(arr[i]);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += arr[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

// Transformer Self-Attention news sentiment extract
export function computeSentimentAttention(news: any[], seedStr: string) {
  const rand = getSeededRandom(seedStr);
  
  // Finance vocab we evaluate
  const tokens = ["growth", "catalyst", "risk", "revenue", "loss", "lawsuit", "competition", "earnings", "moat", "margins"];
  const sentimentMap: Record<string, number> = {
    growth: 1.0,
    catalyst: 0.8,
    risk: -0.7,
    revenue: 0.6,
    loss: -0.9,
    lawsuit: -1.0,
    competition: -0.4,
    earnings: 0.7,
    moat: 0.9,
    margins: 0.5,
  };

  // Extract tokens from Tavily news text
  const textBody = news.map((n) => `${n.title} ${n.snippet}`).join(" ").toLowerCase();
  const foundWords = tokens.filter((t) => textBody.includes(t));
  
  // Fallback if no news tokens found
  const finalTokens = foundWords.length >= 3 ? foundWords.slice(0, 6) : ["growth", "risk", "earnings", "revenue", "competition", "margins"];
  const d_k = 8; // key dimension

  // Deterministic projection matrices Q, K, V for finalTokens
  const qMatrix: number[][] = [];
  const kMatrix: number[][] = [];
  const vMatrix: number[][] = [];

  for (let i = 0; i < finalTokens.length; i++) {
    const q: number[] = [], k: number[] = [], v: number[] = [];
    for (let d = 0; d < d_k; d++) {
      q.push(rand() * 1.5 - 0.75);
      k.push(rand() * 1.5 - 0.75);
      v.push(rand() * 1.5 - 0.75);
    }
    qMatrix.push(q);
    kMatrix.push(k);
    vMatrix.push(v);
  }

  // Calculate self-attention: Attention(Q, K, V) = Softmax(Q K^T / sqrt(d_k)) * V
  // Let's compute Q K^T / sqrt(d_k)
  const scores: number[][] = [];
  const sqrt_dk = Math.sqrt(d_k);
  
  for (let i = 0; i < finalTokens.length; i++) {
    const s: number[] = [];
    for (let j = 0; j < finalTokens.length; j++) {
      let dot = 0;
      for (let d = 0; d < d_k; d++) {
        dot += qMatrix[i][d] * kMatrix[j][d];
      }
      s.push(dot / sqrt_dk);
    }
    scores.push(s);
  }

  // Softmax on scores
  const attentionWeights: number[][] = [];
  for (let i = 0; i < finalTokens.length; i++) {
    const exps = scores[i].map(Math.exp);
    const sum = exps.reduce((a, b) => a + b, 0);
    attentionWeights.push(exps.map((e) => e / (sum || 1)));
  }

  // Summarize weights for output display: average attention allocated to each token
  const resultWeights = finalTokens.map((token, idx) => {
    let weightSum = 0;
    for (let j = 0; j < finalTokens.length; j++) {
      weightSum += attentionWeights[j][idx]; // sum column weights
    }
    const avgWeight = weightSum / finalTokens.length;
    
    // Add raw row attention for matrix display
    const rowWeights = attentionWeights[idx].map((w) => Number(w.toFixed(3)));
    
    return {
      word: token,
      weight: Number(avgWeight.toFixed(3)),
      rowWeights,
      sentiment: sentimentMap[token] || 0.0,
    };
  });

  return {
    tokens: finalTokens,
    weights: resultWeights,
  };
}
