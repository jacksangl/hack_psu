import { describe, expect, it } from "vitest";

import { briefDraftSchema } from "../src/schemas/briefSchemas";

describe("briefDraftSchema", () => {
  it("accepts a valid AI brief payload", () => {
    const parsed = briefDraftSchema.parse({
      summary: "Coverage focuses on elections, trade, and public demonstrations.",
      sentiment: "neutral",
      keyActors: ["Prime Minister", "Parliament"],
      topicTags: ["Politics", "Economy"],
    });

    expect(parsed.sentiment).toBe("neutral");
    expect(parsed.keyActors).toHaveLength(2);
  });

  it("rejects invalid AI output", () => {
    expect(() =>
      briefDraftSchema.parse({
        summary: "",
        sentiment: "mixed",
        keyActors: ["Leader"],
        topicTags: ["Politics"],
      }),
    ).toThrow();
  });
});
