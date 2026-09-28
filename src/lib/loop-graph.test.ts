import { describe, expect, it } from "vitest";
import { buildQuestionLoop, buildUniverseLoops, relatedStarLinks } from "./loop-graph";
import { createSeedStore } from "./seed";

describe("buildQuestionLoop", () => {
  it("opens the quadratic question into teacher, prompt, response, follow-up, and related questions", () => {
    const store = createSeedStore();
    const loop = buildQuestionLoop(store, "q-1");
    expect(loop).not.toBeNull();
    expect(loop?.body).toMatch(/頂点/);
    expect(loop?.nodes.some((node) => node.kind === "teacher" && node.label.includes("田中"))).toBe(true);
    expect(loop?.nodes.some((node) => node.kind === "prompt")).toBe(true);
    expect(loop?.nodes.some((node) => node.kind === "response")).toBe(true);
    expect(loop?.nodes.some((node) => node.kind === "action")).toBe(true);
    expect(loop?.relatedIds).toEqual(expect.arrayContaining(["q-23", "q-24"]));
    expect(loop?.edges.some((edge) => edge.label === "確認")).toBe(true);
    expect(loop?.edges.some((edge) => edge.label === "回答")).toBe(true);
    expect(loop?.edges.some((edge) => edge.label === "関連")).toBe(true);
    expect(loop?.edges.some((edge) => edge.label === "再確認")).toBe(true);
    expect(loop?.steps[0]?.kind).toBe("question");
    expect(loop?.steps.at(-1)?.title).toBe("現在");
  });

  it("does not invent questions that are not in the store", () => {
    const store = createSeedStore();
    store.questions = store.questions.filter((item) => item.id === "q-1");
    const loop = buildQuestionLoop(store, "q-1");
    expect(loop?.relatedIds).toEqual([]);
    expect(loop?.nodes.some((node) => node.kind === "related")).toBe(false);
  });
});

describe("buildUniverseLoops", () => {
  it("keeps q-1 as a featured loop and links related stars", () => {
    const loops = buildUniverseLoops(createSeedStore());
    expect(loops[0]?.questionId).toBe("q-1");
    const links = relatedStarLinks(loops);
    expect(links.some((link) => (link.from === "q-1" && link.to === "q-23") || (link.from === "q-23" && link.to === "q-1"))).toBe(
      true,
    );
  });
});
