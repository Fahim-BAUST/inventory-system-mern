/**
 * Demand Forecasting Engine v2
 *
 * Weighted Moving Average + linear regression trend + day-of-week seasonality
 * with stockout-bias correction, demand variability (σ), trend-adjusted
 * projections, and category-fallback for cold-start products.
 * Pure JS — no external ML dependencies.
 */

export interface DailySale {
  date: string; // YYYY-MM-DD
  quantity: number;
}

export interface ForecastConfig {
  leadTimeDays: number; // supplier lead time (default 7)
  safetyFactor: number; // z-score multiplier for safety stock (default 1.65 → 95%)
  reviewPeriodDays: number; // how often you review stock (default 7)
}

export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  leadTimeDays: 7,
  safetyFactor: 1.65,
  reviewPeriodDays: 7,
};

export interface ForecastResult {
  dailyDemand: number;
  weeklyDemand: number;
  monthlyDemand: number;
  trend: "rising" | "stable" | "declining";
  trendSlope: number;
  demandStdDev: number; // daily demand standard deviation
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
  daysUntilStockout: number | null; // null = infinite (no demand)
  suggestedReorderQty: number;
  safetyStock: number;
  estimatedCost: number;
  urgency: "critical" | "warning" | "ok";
  nearestExpiry: string | null; // ISO date of soonest-expiring batch
  expiringQty: number; // units expiring within horizon
}

export interface DetailForecast extends ForecastResult {
  history: { date: string; quantity: number }[];
  projected: { date: string; quantity: number }[];
  depletionTimeline: { date: string; stock: number }[];
}

// ─── Stockout-bias correction (C) ──────────────────────────────────
// When stock was 0, sales = 0 doesn't mean demand = 0.
// We detect zero-stock periods and impute demand from nearby non-zero days.

export interface StockSnapshot {
  date: string; // YYYY-MM-DD
  stock: number; // end-of-day stock level (0 = out of stock)
}

function correctStockoutBias(
  sales: DailySale[],
  stockHistory?: StockSnapshot[],
): DailySale[] {
  if (!stockHistory || stockHistory.length === 0) return sales;

  const zeroStockDates = new Set(
    stockHistory.filter((s) => s.stock <= 0).map((s) => s.date),
  );
  if (zeroStockDates.size === 0) return sales;

  const salesMap = new Map(sales.map((s) => [s.date, s.quantity]));
  // Compute average demand from days that had stock
  const nonZeroDays = sales.filter((s) => !zeroStockDates.has(s.date));
  if (nonZeroDays.length === 0) return sales;
  const avgDemand =
    nonZeroDays.reduce((s, d) => s + d.quantity, 0) / nonZeroDays.length;

  // Impute stockout days with average demand
  return sales.map((s) => {
    if (zeroStockDates.has(s.date) && s.quantity === 0) {
      return { date: s.date, quantity: round2(avgDemand) };
    }
    return s;
  });
}

// ─── Core algorithm ────────────────────────────────────────────────

export function computeForecast(
  sales: DailySale[],
  windowDays = 90,
  stockHistory?: StockSnapshot[],
): ForecastResult {
  const dataPoints = sales.length;

  const confidence: ForecastResult["confidence"] =
    dataPoints < 14 ? "low" : dataPoints < 60 ? "medium" : "high";

  if (dataPoints === 0) {
    return {
      dailyDemand: 0,
      weeklyDemand: 0,
      monthlyDemand: 0,
      trend: "stable",
      trendSlope: 0,
      demandStdDev: 0,
      confidence: "low",
      seasonality: [1, 1, 1, 1, 1, 1, 1],
      dataPoints: 0,
    };
  }

  const sorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const filled = fillMissingDates(sorted);

  // (C) Correct for stockout bias before computing forecasts
  const corrected = correctStockoutBias(filled, stockHistory);

  const recent = corrected.slice(-windowDays);

  // 1. Weighted Moving Average (exponential decay: more recent = heavier)
  const wma = weightedMovingAverage(recent);

  // 2. Linear regression trend
  const { slope } = linearRegression(
    recent.map((d, i) => ({ x: i, y: d.quantity })),
  );
  const trendSlope = slope;
  const trend: ForecastResult["trend"] =
    slope > 0.05 ? "rising" : slope < -0.05 ? "declining" : "stable";

  // 3. Day-of-week seasonality (fixed: include all 7 days in denominator)
  const seasonality = computeSeasonality(corrected);

  // 4. Demand variability (D)
  const demandStdDev = computeStdDev(recent.map((d) => d.quantity));

  // Daily demand = WMA adjusted by trend
  const dailyDemand = Math.max(0, wma + trendSlope * 0.5);

  return {
    dailyDemand: round2(dailyDemand),
    weeklyDemand: round2(dailyDemand * 7),
    monthlyDemand: round2(dailyDemand * 30),
    trend,
    trendSlope: round2(trendSlope),
    demandStdDev: round2(demandStdDev),
    confidence,
    seasonality: seasonality.map(round2),
    dataPoints,
  };
}

// ─── Category-based fallback for cold-start (G) ───────────────────

export function applyCategoryFallback(
  fc: ForecastResult,
  categoryAvgDemand: number,
): ForecastResult {
  // If product has fewer than 7 data points and category average is available,
  // blend product data with category average (weighted toward category)
  if (fc.dataPoints >= 7 || categoryAvgDemand <= 0) return fc;

  const weight = fc.dataPoints / 7; // 0..1 — how much to trust product data
  const blended = fc.dailyDemand * weight + categoryAvgDemand * (1 - weight);
  const daily = round2(Math.max(0, blended));

  return {
    ...fc,
    dailyDemand: daily,
    weeklyDemand: round2(daily * 7),
    monthlyDemand: round2(daily * 30),
  };
}

// ─── Seasonality-aware stockout calculation (B) ───────────────────

export function computeDaysUntilStockout(
  currentStock: number,
  dailyDemand: number,
  trendSlope: number,
  seasonality: number[],
  startDate?: Date,
): number | null {
  if (dailyDemand <= 0) return null;
  if (currentStock <= 0) return 0;

  let stock = currentStock;
  const start = startDate || new Date();
  // Cap at 365 to avoid infinite loop for very low demand
  for (let i = 1; i <= 365; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    // (A) Trend-adjusted: demand increases/decreases over time
    const dayDemand = Math.max(
      0,
      (dailyDemand + trendSlope * i) * seasonality[dow],
    );
    stock -= dayDemand;
    if (stock <= 0) return i;
  }
  return null; // stock lasts > 1 year
}

// ─── Safety stock calculation (D) ─────────────────────────────────

export function computeSafetyStock(
  demandStdDev: number,
  leadTimeDays: number,
  safetyFactor: number,
): number {
  // Safety stock = z × σ_d × √L
  return Math.ceil(safetyFactor * demandStdDev * Math.sqrt(leadTimeDays));
}

export function computeReorderQty(
  dailyDemand: number,
  leadTimeDays: number,
  reviewPeriodDays: number,
  safetyStock: number,
  currentStock: number,
): number {
  // Reorder qty = demand during (lead time + review period) + safety stock - current stock
  const needed = Math.ceil(
    dailyDemand * (leadTimeDays + reviewPeriodDays) +
      safetyStock -
      currentStock,
  );
  return Math.max(0, needed);
}

// ─── Trend-adjusted projections (A) ──────────────────────────────

export function computeDetailForecast(
  sales: DailySale[],
  currentStock: number,
  horizon: number,
  dailyDemand: number,
  trendSlope: number,
  seasonality: number[],
  stockHistory?: StockSnapshot[],
): DetailForecast & { history: DailySale[]; projected: DailySale[] } {
  const sorted = [...sales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const filled = fillMissingDates(sorted);
  const history = filled.slice(-90);

  // (A) Project future demand with trend + seasonality
  const projected: DailySale[] = [];
  const today = new Date();
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    // Demand grows/declines with trend slope per day
    const qty = Math.max(0, (dailyDemand + trendSlope * i) * seasonality[dow]);
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

  while (depletionTimeline.length < horizon + 1) {
    const last = depletionTimeline[depletionTimeline.length - 1];
    const d = new Date(last.date);
    d.setDate(d.getDate() + 1);
    depletionTimeline.push({ date: d.toISOString().split("T")[0], stock: 0 });
  }

  // Avoid recomputing — build result from passed-in values
  const fc = computeForecast(sales, 90, stockHistory);

  return {
    ...fc,
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
  // Fixed: use all 7 days in denominator to avoid inflating multipliers
  const globalAvg = dowAvgs.reduce((s, v) => s + v, 0) / 7 || 1;

  return dowAvgs.map((avg) => (globalAvg > 0 ? avg / globalAvg : 1));
}

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
