/**
 * Demand Forecasting Engine
 *
 * Uses Weighted Moving Average + linear regression trend + day-of-week
 * seasonality to predict per-product demand and reorder quantities.
 * Pure JS — no external ML dependencies.
 */

export interface DailySale {
  date: string; // YYYY-MM-DD
  quantity: number;
}

export interface ForecastResult {
  dailyDemand: number;
  weeklyDemand: number;
  monthlyDemand: number;
  trend: "rising" | "stable" | "declining";
  trendSlope: number;
  confidence: "low" | "medium" | "high";
  seasonality: number[]; // index 0=Sun…6=Sat, values are multipliers (1.0 = avg)
  dataPoints: number;
}

export interface ProductForecast extends ForecastResult {
  productId: string;
  productName: string;
  sku: string;
  image: string | null;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  daysUntilStockout: number;
  suggestedReorderQty: number;
  estimatedCost: number;
  urgency: "critical" | "warning" | "ok";
}

export interface DetailForecast extends ForecastResult {
  history: { date: string; quantity: number }[];
  projected: { date: string; quantity: number }[];
  depletionTimeline: { date: string; stock: number }[];
}

// ─── Core algorithm ────────────────────────────────────────────────

export function computeForecast(
  sales: DailySale[],
  windowDays = 90,
): ForecastResult {
  const dataPoints = sales.length;

  // Confidence based on data availability
  const confidence: ForecastResult["confidence"] =
    dataPoints < 14 ? "low" : dataPoints < 60 ? "medium" : "high";

  if (dataPoints === 0) {
    return {
      dailyDemand: 0,
      weeklyDemand: 0,
      monthlyDemand: 0,
      trend: "stable",
      trendSlope: 0,
      confidence: "low",
      seasonality: [1, 1, 1, 1, 1, 1, 1],
      dataPoints: 0,
    };
  }

  // Sort by date
  const sorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Fill missing dates with 0
  const filled = fillMissingDates(sorted);
  const recent = filled.slice(-windowDays);

  // 1. Weighted Moving Average (exponential decay: more recent = heavier)
  const wma = weightedMovingAverage(recent);

  // 2. Linear regression trend
  const { slope, intercept } = linearRegression(
    recent.map((d, i) => ({ x: i, y: d.quantity })),
  );
  const trendSlope = slope;
  const trend: ForecastResult["trend"] =
    slope > 0.05 ? "rising" : slope < -0.05 ? "declining" : "stable";

  // 3. Day-of-week seasonality
  const seasonality = computeSeasonality(filled);

  // Daily demand = WMA adjusted slightly by trend
  const dailyDemand = Math.max(0, wma + trendSlope * 0.5);

  return {
    dailyDemand: round2(dailyDemand),
    weeklyDemand: round2(dailyDemand * 7),
    monthlyDemand: round2(dailyDemand * 30),
    trend,
    trendSlope: round2(trendSlope),
    confidence,
    seasonality: seasonality.map(round2),
    dataPoints,
  };
}

export function computeDetailForecast(
  sales: DailySale[],
  currentStock: number,
  horizon: number,
  dailyDemand: number,
  seasonality: number[],
): DetailForecast & { history: DailySale[]; projected: DailySale[] } {
  const sorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const filled = fillMissingDates(sorted);
  const history = filled.slice(-90);

  // Project future demand using seasonality
  const projected: DailySale[] = [];
  const today = new Date();
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const qty = Math.max(0, dailyDemand * seasonality[dow]);
    projected.push({
      date: d.toISOString().split("T")[0],
      quantity: round2(qty),
    });
  }

  // Stock depletion timeline
  const depletionTimeline: { date: string; stock: number }[] = [];
  let stock = currentStock;
  depletionTimeline.push({
    date: today.toISOString().split("T")[0],
    stock,
  });
  for (const p of projected) {
    stock = Math.max(0, stock - p.quantity);
    depletionTimeline.push({ date: p.date, stock: round2(stock) });
    if (stock <= 0) break;
  }

  // Fill remaining horizon with 0 stock
  while (depletionTimeline.length < horizon + 1) {
    const last = depletionTimeline[depletionTimeline.length - 1];
    const d = new Date(last.date);
    d.setDate(d.getDate() + 1);
    depletionTimeline.push({ date: d.toISOString().split("T")[0], stock: 0 });
  }

  return {
    ...computeForecast(sales),
    history,
    projected,
    depletionTimeline: depletionTimeline.slice(0, horizon + 1),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function fillMissingDates(sorted: DailySale[]): DailySale[] {
  if (sorted.length === 0) return [];
  const result: DailySale[] = [];
  const byDate = new Map(sorted.map((s) => [s.date, s.quantity]));
  const start = new Date(sorted[0].date);
  const end = new Date(sorted[sorted.length - 1].date);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, quantity: byDate.get(key) || 0 });
  }
  return result;
}

function weightedMovingAverage(data: DailySale[]): number {
  if (data.length === 0) return 0;
  const n = data.length;
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    // Exponential decay: recent days get higher weight
    const weight = Math.exp((-3 * (n - 1 - i)) / n);
    weightedSum += data[i].quantity * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeSeasonality(data: DailySale[]): number[] {
  const dowTotals = [0, 0, 0, 0, 0, 0, 0]; // Sun=0 … Sat=6
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const d of data) {
    const dow = new Date(d.date + "T00:00:00").getDay();
    dowTotals[dow] += d.quantity;
    dowCounts[dow] += 1;
  }

  const dowAvgs = dowTotals.map((total, i) =>
    dowCounts[i] > 0 ? total / dowCounts[i] : 0,
  );
  const globalAvg =
    dowAvgs.reduce((s, v) => s + v, 0) / dowAvgs.filter((v) => v > 0).length ||
    1;

  // Seasonality index: 1.0 = average, >1 = above average, <1 = below
  return dowAvgs.map((avg) => (globalAvg > 0 ? avg / globalAvg : 1));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
