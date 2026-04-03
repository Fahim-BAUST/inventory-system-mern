import { PLAN_LIMITS, PlanType } from "./constants";

/**
 * Get plan config for a given planId. Falls back to "free" if unknown.
 */
export function getPlanConfig(planId: string) {
  const key = (planId || "free") as PlanType;
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.free;
}

/**
 * Check if a plan includes a specific feature.
 */
export function planHasFeature(planId: string, feature: string): boolean {
  const config = getPlanConfig(planId);
  return (config.features as readonly string[]).includes(feature);
}

/**
 * Get numeric limit from plan. Returns Infinity if unlimited.
 */
export function getPlanLimit(
  planId: string,
  limitKey: "maxUsers" | "maxProducts",
): number {
  const config = getPlanConfig(planId);
  return (config as any)[limitKey] ?? 0;
}
