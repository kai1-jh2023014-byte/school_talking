import type { Availability, Classification, PublicUser, TeacherMatch } from "./types";

const AVAILABILITY_SCORE: Record<Availability, number> = {
  available: 40,
  soon: 25,
  busy: 8,
  off: 0,
};

function toPublic(user: PublicUser): PublicUser {
  return user;
}

export function matchTeachers(
  teachers: PublicUser[],
  classification: Classification,
): TeacherMatch[] {
  const pool = teachers.filter((t) => t.role === "teacher");
  const subjectPool = pool.filter((t) => t.subjects?.includes(classification.subject));
  const candidates = subjectPool.length > 0 ? subjectPool : pool;

  return candidates
    .map((teacher) => {
      const reasons: string[] = [];
      let score = 0;
      const availability = teacher.availability ?? "off";
      score += AVAILABILITY_SCORE[availability];

      if (teacher.subjects?.includes(classification.subject)) {
        score += 30;
        reasons.push(`担当科目が${classification.subject}です`);
      } else {
        reasons.push("科目は完全一致ではありませんが、候補として表示しています");
      }

      const specialtyHit = teacher.specialties?.find(
        (item) =>
          classification.topic.includes(item) ||
          item.includes(classification.topic) ||
          classification.summary.includes(item),
      );
      if (specialtyHit) {
        score += 50;
        reasons.push(`専門分野「${specialtyHit}」が質問内容と近いです`);
      }

      if (availability === "available") {
        reasons.push("いま質問を受け付けています");
      } else if (availability === "soon") {
        reasons.push(
          teacher.availableInMinutes
            ? `約${teacher.availableInMinutes}分後なら対応できそうです`
            : "少し待てば対応できそうです",
        );
      } else if (availability === "busy") {
        reasons.push("いまは対応不可ですが、待ち行列に入れられます");
      } else {
        reasons.push("本日の対応は終了しています");
      }

      return { teacher: toPublic(teacher), score, reasons };
    })
    .sort((a, b) => {
      const availabilityDelta =
        AVAILABILITY_SCORE[b.teacher.availability ?? "off"] -
        AVAILABILITY_SCORE[a.teacher.availability ?? "off"];
      if (availabilityDelta !== 0) return availabilityDelta;
      return b.score - a.score;
    });
}

export function availabilityLabel(status: Availability, minutes?: number): string {
  switch (status) {
    case "available":
      return "今質問OK";
    case "soon":
      return minutes ? `${minutes}分後なら対応可能` : "少し待てば対応可能";
    case "busy":
      return "現在対応不可";
    case "off":
      return "本日は対応終了";
  }
}
