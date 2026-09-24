import { describe, expect, it } from "vitest";
import type { Question, StoreData } from "./types";
import {
  bodyRadius,
  buildUniverse,
  growthLabel,
  planetPosition,
  satelliteOrbit,
} from "./universe";

function q(partial: Partial<Question> & Pick<Question, "id" | "createdAt" | "subject" | "topic" | "status">): Question {
  return {
    studentId: "s",
    body: "body",
    summary: partial.summary ?? `${partial.subject}の${partial.topic}`,
    urgency: "normal",
    recommendedDept: "数学科",
    questionType: "解法",
    classifyReasons: [],
    suggestedTeacherIds: [],
    transferHistory: [],
    events: [],
    ...partial,
  };
}

describe("bodyRadius", () => {
  it("grows with count but stays inside the given range", () => {
    const small = bodyRadius(1, 20, 52);
    const mid = bodyRadius(8, 20, 52);
    const large = bodyRadius(40, 20, 52);
    const empty = bodyRadius(0, 20, 52);
    expect(empty).toBeLessThan(small);
    expect(small).toBeLessThan(mid);
    expect(mid).toBeLessThanOrEqual(large);
    expect(large).toBeLessThanOrEqual(52);
    expect(empty).toBeGreaterThanOrEqual(8);
  });
});

describe("growthLabel", () => {
  it("states an increase without calling it a crisis", () => {
    expect(growthLabel(40, 20)).toMatch(/質問数が増えています/);
    expect(growthLabel(40, 20)).not.toMatch(/深刻|危機|悪化/);
    expect(growthLabel(11, 10)).toBe("質問数が増えています");
    expect(growthLabel(3, 0)).toMatch(/直近30日に質問が集まっています/);
    expect(growthLabel(1, 0)).toBeUndefined();
    expect(growthLabel(2, 2)).toBeUndefined();
  });
});

describe("buildUniverse", () => {
  const now = new Date("2026-09-24T05:00:00.000Z");

  it("reuses existing questions as stars and keeps every catalog subject", () => {
    const store: StoreData = {
      users: [],
      questions: [
        q({
          id: "q-math-1",
          createdAt: "2026-09-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
          summary: "最大値が分からない",
        }),
        q({
          id: "q-math-2",
          createdAt: "2026-09-12T08:00:00.000Z",
          subject: "数学",
          topic: "確率",
          status: "matched",
          summary: "場合の数が分からない",
        }),
        q({
          id: "q-en",
          createdAt: "2026-09-15T08:00:00.000Z",
          subject: "英語",
          topic: "関係詞",
          status: "deferred",
          summary: "which と that",
        }),
      ],
    };

    const universe = buildUniverse(store, now);
    expect(universe.total).toBe(3);
    expect(universe.windowDays).toBe(30);
    expect(universe.planets.map((planet) => planet.subject)).toEqual([
      "数学",
      "英語",
      "国語",
      "理科",
      "社会",
      "情報",
    ]);

    const math = universe.planets[0];
    expect(math.count).toBe(2);
    expect(math.satellites.map((sat) => sat.topic).sort()).toEqual(["二次関数", "確率"].sort());
    const quadratic = math.satellites.find((sat) => sat.topic === "二次関数");
    expect(quadratic?.stars[0]).toMatchObject({
      id: "q-math-1",
      summary: "最大値が分からない",
    });

    const ids = universe.planets.flatMap((planet) =>
      planet.satellites.flatMap((sat) => sat.stars.map((star) => star.id)),
    );
    expect(ids.sort()).toEqual(["q-en", "q-math-1", "q-math-2"]);
    expect(universe.planets.find((planet) => planet.subject === "情報")?.count).toBe(0);
  });

  it("compares the last 30 days with the 30 days before that", () => {
    const store: StoreData = {
      users: [],
      questions: [
        q({
          id: "old-1",
          createdAt: "2026-08-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-1",
          createdAt: "2026-09-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-2",
          createdAt: "2026-09-12T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-3",
          createdAt: "2026-09-14T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
      ],
    };

    const universe = buildUniverse(store, now);
    const field = universe.planets[0].satellites[0];
    expect(field.growth).toMatchObject({
      recentCount: 3,
      previousCount: 1,
    });
    expect(field.growth.label).toMatch(/質問数が増えています/);
    expect(field.stars.filter((star) => star.recent)).toHaveLength(3);
    expect(universe.recentTotal).toBe(3);
    expect(universe.previousTotal).toBe(1);
  });

  it("does not invent a second question store", () => {
    const store: StoreData = { users: [], questions: [] };
    const universe = buildUniverse(store, now);
    expect(universe.total).toBe(0);
    expect(universe.planets.every((planet) => planet.satellites.length === 0)).toBe(true);
  });
});

describe("layout helpers", () => {
  it("places planets on a ring and keeps satellite orbits outside the planet", () => {
    const a = planetPosition(0, 6, 400, 280, 240, 180);
    const b = planetPosition(3, 6, 400, 280, 240, 180);
    expect(a.y).toBeLessThan(280);
    expect(b.y).toBeGreaterThan(280);
    expect(satelliteOrbit(40, 4)).toBeGreaterThan(40);
  });
});
