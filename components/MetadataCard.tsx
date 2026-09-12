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
    <div className="card-charcoal animate-rise overflow-hidden">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        {meta.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.thumbnail}
            alt=""
            width={240}
            height={135}
            loading="lazy"
            className="aspect-video w-full rounded-[15px] bg-surface2 object-cover sm:w-60"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-[15px] bg-surface2 text-inkmuted sm:w-60" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m10 9 5 3-5 3V9Z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium uppercase tracking-[-0.13px] text-inkmuted">{meta.source}</p>
          <p className="mt-1 line-clamp-2 text-base font-medium leading-snug tracking-[-0.15px] text-ink">{meta.title}</p>
          <p className="mt-1 text-sm tracking-[-0.14px] text-inkmuted">
            {[meta.author, formatDuration(meta.duration)].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-4">
            <label htmlFor="bitrate" className="text-xs font-medium tracking-[-0.12px] text-ink">
              MP3 quality
            </label>
            {/* pricing-tab style: canvas default, surface2 selected */}
            <div className="mt-1.5 flex flex-wrap gap-2" role="group" aria-label="MP3 quality">
              {[128, 192, 256, 320].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onBitrate(b)}
                  aria-pressed={bitrate === b}
                  className={`rounded-full px-[14px] py-2 text-sm font-medium tabular-nums tracking-[-0.14px] transition active:scale-95 min-h-[40px] ${
                    bitrate === b ? "bg-surface2 text-ink" : "bg-canvas text-inkmuted hover:text-ink"
                  }`}
                >
                  {b}
                  <span className="ml-1 text-xs opacity-60">kbps</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs tracking-[-0.12px] text-inkmuted">
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
    <div className="card-charcoal overflow-hidden p-4 sm:p-5" aria-hidden>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="aspect-video w-full animate-pulse-soft rounded-[15px] bg-surface2 sm:w-60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 animate-pulse-soft rounded bg-surface2" />
          <div className="h-5 w-3/4 animate-pulse-soft rounded bg-surface2" />
          <div className="h-4 w-1/3 animate-pulse-soft rounded bg-surface2" />
        </div>
      </div>
      <span className="sr-only">Fetching video information…</span>
    </div>
  );
}
