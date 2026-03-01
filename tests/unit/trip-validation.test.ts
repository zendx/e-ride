import { describe, expect, it } from "vitest";
import { tripStatusUpdateSchema } from "@/lib/validation/trip";

describe("trip status validation", () => {
  it("requires cancellation reason when status is cancelled", () => {
    expect(() => tripStatusUpdateSchema.parse({ status: "cancelled" })).toThrow();
  });

  it("accepts cancellation reason when status is cancelled", () => {
    const parsed = tripStatusUpdateSchema.parse({
      status: "cancelled",
      cancelReason: "Vehicle issue"
    });

    expect(parsed.status).toBe("cancelled");
    expect(parsed.cancelReason).toBe("Vehicle issue");
  });
});
