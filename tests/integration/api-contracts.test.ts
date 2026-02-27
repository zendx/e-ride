import { describe, expect, it } from "vitest";
import { createTripSchema } from "@/lib/validation/trip";

describe("trip creation contract", () => {
  it("accepts valid passenger ride request", () => {
    const input = createTripSchema.parse({
      pickupAddress: "Ikeja",
      dropoffAddress: "Lekki",
      pickupLat: 6.6018,
      pickupLng: 3.3515,
      dropoffLat: 6.4698,
      dropoffLng: 3.5852,
      estimatedDistanceKm: 25,
      estimatedDurationMin: 40
    });

    expect(input.estimatedDistanceKm).toBe(25);
  });

  it("rejects invalid coordinates", () => {
    expect(() =>
      createTripSchema.parse({
        pickupAddress: "A",
        dropoffAddress: "B",
        pickupLat: 200,
        pickupLng: 3,
        dropoffLat: 0,
        dropoffLng: 0,
        estimatedDistanceKm: 10,
        estimatedDurationMin: 20
      })
    ).toThrow();
  });
});
