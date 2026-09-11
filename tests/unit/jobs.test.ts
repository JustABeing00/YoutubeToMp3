import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/jobs/types";

describe("job state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("queued", "analyzing")).toBe(true);
    expect(canTransition("analyzing", "retrieving")).toBe(true);
    expect(canTransition("retrieving", "processing")).toBe(true);
    expect(canTransition("processing", "finalizing")).toBe(true);
    expect(canTransition("finalizing", "completed")).toBe(true);
    expect(canTransition("completed", "expired")).toBe(true);
  });

  it("allows cancellation from any active state", () => {
    for (const s of ["queued", "analyzing", "retrieving", "processing", "finalizing"] as const) {
      expect(canTransition(s, "cancelled")).toBe(true);
    }
  });

  it("forbids resurrection from terminal states", () => {
    for (const s of ["completed", "failed", "cancelled", "expired"] as const) {
      expect(canTransition(s, "queued")).toBe(false);
      expect(canTransition(s, "processing")).toBe(false);
    }
    expect(canTransition("failed", "completed")).toBe(false);
  });
});
