export function Progress({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
          <span className="font-medium tabular-nums" aria-live="polite">
            {pct}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      >
        <div
          className="h-full rounded-full bg-neutral-900 transition-[width] duration-500 ease-out dark:bg-white"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
