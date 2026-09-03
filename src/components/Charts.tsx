export function BarList({
  items,
  max,
}: {
  items: { label: string; count: number }[];
  max?: number;
}) {
  const peak = max ?? Math.max(...items.map((item) => item.count), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-serif text-lg">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy to-terracotta"
              style={{ width: `${Math.max(8, (item.count / peak) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HourBars({ items }: { items: { hour: number; count: number }[] }) {
  const peak = Math.max(...items.map((item) => item.count), 1);
  return (
    <div className="flex h-40 items-end gap-1">
      {items.map((item) => (
        <div key={item.hour} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-navy/80"
            style={{ height: `${Math.max(4, (item.count / peak) * 100)}%` }}
            title={`${item.hour}時 ${item.count}件`}
          />
          {item.hour % 3 === 0 ? (
            <span className="text-[10px] text-muted">{item.hour}</span>
          ) : (
            <span className="h-3" />
          )}
        </div>
      ))}
    </div>
  );
}
