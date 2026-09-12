import { formatDuration } from "@/lib/validation/url";

export interface Meta {
  title: string;
  duration: number | null;
  thumbnail: string | null;
  source: string;
  author: string | null;
}

export function MetadataCard({ meta, bitrate, onBitrate }: { meta: Meta; bitrate: number; onBitrate: (b: number) => void }) {
  return (
    <div className="animate-rise overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {meta.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.thumbnail}
            alt=""
            width={240}
            height={135}
            loading="lazy"
            className="aspect-video w-full rounded-xl bg-neutral-100 object-cover sm:w-60 dark:bg-neutral-800"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 sm:w-60 dark:bg-neutral-800" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m10 9 5 3-5 3V9Z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{meta.source}</p>
          <p className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{meta.title}</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {[meta.author, formatDuration(meta.duration)].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-4">
            <label htmlFor="bitrate" className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              MP3 quality
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="MP3 quality">
              {[128, 192, 256, 320].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onBitrate(b)}
                  aria-pressed={bitrate === b}
                  className={`rounded-full border px-3.5 py-1.5 text-sm tabular-nums transition active:scale-95 ${
                    bitrate === b
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-700 dark:hover:border-neutral-500"
                  }`}
                >
                  {b}
                  <span className="ml-1 text-xs opacity-60">kbps</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
              192 kbps default. Higher numbers don&apos;t restore quality lost in the source.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetadataSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:p-5" aria-hidden>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="aspect-video w-full animate-pulse-soft rounded-xl bg-neutral-200 sm:w-60 dark:bg-neutral-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 animate-pulse-soft rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-5 w-3/4 animate-pulse-soft rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-1/3 animate-pulse-soft rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
      <span className="sr-only">Fetching video information…</span>
    </div>
  );
}
