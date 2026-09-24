import { describe, it, expect } from "vitest";
import { qualityGate } from "@/supervisor/quality-gate";

// A realistic, complete output: long, structured, matches the task keywords,
// contains numbers, and avoids AI-slop phrases.
const GOOD_OUTPUT = `Guizhou Collection market research brief

Summary: The Guizhou Collection product line targets a niche of regional cultural merchandise. Three main competitors were analyzed: local artisan cooperatives, cross-province souvenir chains, and online cultural stores. Estimated market size is roughly 120 million RMB annually with a 12% growth rate.

Key findings:
- Pricing ranges from 59 to 299 RMB across the three competitor tiers.
- Differentiation opportunity: combining mountain-city landscape motifs with modern packaging.
- Distribution gap: competitors under-serve the tourist station channel.

Recommendation: position the collection card as a premium regional gift, priced between 129 and 169 RMB, and start with a pilot run of 5,000 units.

Next steps: prototype packaging, survey 50 target customers, and schedule the November launch.`;

describe("Supervisor Quality Gate", () => {
  it("passes a complete, on-topic output (PASS)", () => {
    const score = qualityGate.evaluate(
      "content-1",
      "Content Agent",
      "Research Guizhou Collection market",
      "Analyze the competitive landscape and propose a market positioning.",
      GOOD_OUTPUT,
    );

    expect(score.dimensions).toHaveLength(5);
    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(score.passed).toBe(true);
    expect(score.status).toBe("PASS");
    expect(score.feedback.length).toBeGreaterThan(0);
  });

  it("fails a clearly incomplete output (WARN/FAIL, not passed)", () => {
    const score = qualityGate.evaluate(
      "content-1",
      "Content Agent",
      "Research Guizhou Collection market",
      "Analyze the competitive landscape and propose a market positioning.",
      "ok", // far too short to be a real deliverable
    );

    expect(score.passed).toBe(false);
    expect(score.totalScore).toBeLessThan(70);
  });

  it("quickCheck flags empty and error-containing outputs", () => {
    expect(qualityGate.quickCheck("").passed).toBe(false);
    expect(qualityGate.quickCheck("").failureType).toBe("empty_output");

    expect(qualityGate.quickCheck("The request failed with an API error")).toMatchObject({
      passed: false,
      failureType: "api_error",
    });

    expect(qualityGate.quickCheck(GOOD_OUTPUT).passed).toBe(true);
  });
});