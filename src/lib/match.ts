import { teacherLoad } from "./questions";
import type { Availability, Classification, Question, SafeTeacher, TeacherMatch } from "./types";

const AVAILABILITY_SCORE: Record<Availability, number> = {
  available: 40,
  soon: 25,
  busy: 8,
  off: 0,
};

export function toSafeTeacher(teacher: SafeTeacher & { loginId?: string; passwordHash?: string }): SafeTeacher {
  const copy = { ...teacher };
  delete copy.loginId;
  delete copy.passwordHash;
  return copy;
}

export function matchTeachers(
  teachers: SafeTeacher[],
  classification: Classification,
  questions: Question[] = [],
): TeacherMatch[] {
  const pool = teachers.filter((t) => t.role === "teacher" && t.status !== "disabled");
  const subjectPool = pool.filter((t) => t.subjects?.includes(classification.subject));
  const candidates = subjectPool.length > 0 ? subjectPool : pool;

  return candidates
    .map((teacher) => {
      const reasons: string[] = [];
      let score = 0;
      const availability = teacher.availability ?? "off";
      const activeCount = teacherLoad(teacher.id, questions);
      score += AVAILABILITY_SCORE[availability];
      score -= Math.min(activeCount * 8, 24);

      if (teacher.subjects?.includes(classification.subject)) {
        score += 30;
        reasons.push(`${classification.subject}を担当しています`);
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
        reasons.push(`${specialtyHit}が専門で、この質問に近いです`);
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

      if (activeCount > 0) {
        reasons.push(`いま未処理の質問が${activeCount}件あります`);
      } else {
        reasons.push("いま抱えている未処理質問はありません");
      }

      return { teacher: toSafeTeacher(teacher), score, reasons, activeCount };
    })
    .sort((a, b) => {
      const availabilityDelta =
        AVAILABILITY_SCORE[b.teacher.availability ?? "off"] -
        AVAILABILITY_SCORE[a.teacher.availability ?? "off"];
      if (availabilityDelta !== 0) return availabilityDelta;
      if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
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
