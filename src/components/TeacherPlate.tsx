import { StatusBadge } from "./StatusBadge";
import type { SafeTeacher } from "@/lib/types";

export function TeacherPlate({
  teacher,
  selected,
  onSelect,
  reasons,
  activeCount,
}: {
  teacher: SafeTeacher;
  selected?: boolean;
  onSelect?: () => void;
  reasons?: string[];
  activeCount?: number;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted">おすすめ</p>
          <h3 className="font-serif text-xl font-bold">{teacher.name}</h3>
          <p className="mt-1 text-sm text-muted">{teacher.subjects?.join("・")}</p>
        </div>
        {teacher.availability ? (
          <StatusBadge status={teacher.availability} minutes={teacher.availableInMinutes} />
        ) : null}
      </div>
      {typeof activeCount === "number" ? (
        <p className="mt-3 text-sm">現在対応中：{activeCount}件</p>
      ) : null}
      {teacher.specialties?.length ? (
        <p className="mt-1 text-sm">専門：{teacher.specialties.join("、")}</p>
      ) : null}
      {teacher.note ? <p className="mt-2 text-xs text-muted">{teacher.note}</p> : null}
      {reasons?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {reasons.map((reason) => (
            <li key={reason}>・{reason}</li>
          ))}
        </ul>
      ) : null}
    </>
  );

  if (!onSelect) {
    return <article className="card p-5">{content}</article>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card w-full p-5 text-left transition ${selected ? "ring-2 ring-terracotta" : "hover:-translate-y-0.5"}`}
    >
      {content}
    </button>
  );
}
