export const SUBJECTS = ["数学", "英語", "国語", "理科", "社会", "情報"] as const;

export const GRADES = ["1年", "2年", "3年"] as const;

export const CLASS_NAMES = ["A", "B", "C", "D"] as const;

export const QUESTION_TYPES = ["解法", "概念", "計算", "確認", "その他"] as const;

export function homeroomOf(grade?: string, className?: string): string | undefined {
  if (!grade || !className) return undefined;
  return `${grade}${className}組`;
}
