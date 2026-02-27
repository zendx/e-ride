import { PricingRule } from "@prisma/client";
import { FareBreakdown } from "@/types/domain";

export function calculateFare(
  pricing: Pick<PricingRule, "baseFareMinor" | "perKmMinor" | "perMinuteMinor" | "bookingFeeMinor" | "minimumFareMinor" | "surgeMultiplier" >,
  distanceKm: number,
  durationMin: number,
  commissionBps: number
): FareBreakdown {
  const rawSubtotal = pricing.baseFareMinor + pricing.perKmMinor * distanceKm + pricing.perMinuteMinor * durationMin;
  const subtotalMinor = Math.max(Math.round(rawSubtotal), pricing.minimumFareMinor);
  const surgeMinor = Math.round(subtotalMinor * (pricing.surgeMultiplier - 1));
  const feesMinor = pricing.bookingFeeMinor;
  const totalMinor = subtotalMinor + surgeMinor + feesMinor;
  const commissionMinor = Math.round((totalMinor * commissionBps) / 10000);

  return {
    subtotalMinor,
    surgeMinor,
    feesMinor,
    totalMinor,
    commissionMinor,
    tenantRevenueMinor: totalMinor - commissionMinor
  };
}
