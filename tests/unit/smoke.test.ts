import { describe, expect, it } from "vitest";

/**
 * Smoke test mínimo. Confirma que vitest + projects + alias estão configurados.
 * Substitua/expanda à medida que features chegam.
 */
describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
