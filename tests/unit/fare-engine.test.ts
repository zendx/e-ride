import { describe, expect, it } from "vitest";
import { calculateFare } from "@/lib/modules/trips/fare-engine";

describe("fare engine", () => {
  it("calculates subtotal, surge, fees and commission", () => {
    const fare = calculateFare(
      {
        baseFareMinor: 200,
        perKmMinor: 100,
        perMinuteMinor: 20,
        bookingFeeMinor: 50,
        minimumFareMinor: 300,
        surgeMultiplier: 1.5
      },
      10,
      15,
      1500
    );

    expect(fare.subtotalMinor).toBe(1500);
    expect(fare.surgeMinor).toBe(750);
    expect(fare.feesMinor).toBe(50);
    expect(fare.totalMinor).toBe(2300);
    expect(fare.commissionMinor).toBe(345);
    expect(fare.tenantRevenueMinor).toBe(1955);
  });
});
