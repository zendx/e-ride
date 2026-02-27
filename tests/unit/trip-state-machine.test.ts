import { describe, expect, it } from "vitest";
import { assertValidTransition } from "@/lib/modules/trips/state-machine";

describe("trip lifecycle transitions", () => {
  it("allows requested -> assigned", () => {
    expect(() => assertValidTransition("requested", "assigned")).not.toThrow();
  });

  it("rejects completed -> in_progress", () => {
    expect(() => assertValidTransition("completed", "in_progress")).toThrow();
  });
});
