import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./data/jobs.db"),
  TEMP_DIR: z.string().default("./tmp/converter"),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
  YTDLP_PATH: z.string().default("yt-dlp"),
  // Comma-separated list of enabled adapters: "youtube,direct"
  ENABLED_ADAPTERS: z.string().default("youtube,direct"),
  MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(16).default(2),
  MAX_JOBS_PER_IP: z.coerce.number().int().min(1).max(100).default(5),
  ANALYZE_PER_MIN_PER_IP: z.coerce.number().int().min(1).max(120).default(20),
  JOBS_PER_HOUR_PER_IP: z.coerce.number().int().min(1).max(100).default(10),
  MAX_INPUT_DURATION_SEC: z.coerce.number().int().min(60).max(14400).default(3600),
  MAX_FILE_MB: z.coerce.number().int().min(5).max(2000).default(200),
  JOB_EXPIRATION_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  CLEANUP_INTERVAL_MIN: z.coerce.number().int().min(1).max(240).default(5),
  PROCESSING_TIMEOUT_MIN: z.coerce.number().int().min(2).max(120).default(15),
  DEFAULT_BITRATE: z.coerce.number().default(192),
  NODE_ENV: z.string().default("development"),
  // Free Piped/Invidious fallback when direct yt-dlp download is IP-blocked.
  // "true" keeps conversions working on flagged datacenter IPs; set "false"
  // to force direct-only downloads.
  FALLBACK_ENABLED: z.string().default("true"),
  // Comma-separated public API bases, tried in order. Override when instances die.
  PIPED_API_URLS: z
    .string()
    .default("https://pipedapi.kavin.rocks,https://pipedapi.adminforge.de,https://pipedapi.leptons.xyz"),
  INVIDIOUS_API_URLS: z.string().default("https://inv.invidious.nerdvpn.de,https://invidious.nerdvpn.de"),
  FALLBACK_API_TIMEOUT_SEC: z.coerce.number().int().min(3).max(60).default(10),
  // Extra argv appended to every yt-dlp call (space-separated, no quoting).
  // Operator-owned env, never user input. Docker image sets Chrome TLS
  // fingerprint + PO-token plugin dir; leave empty on machines whose yt-dlp
  // lacks curl_cffi or the plugin.
  YTDLP_EXTRA_ARGS: z.string().default(""),
  // SOCKS/HTTP proxy URL for all yt-dlp traffic (e.g. the WARP sidecar at
  // socks5h://127.0.0.1:1080). Empty = direct egress. Managed at runtime by
  // scripts/warp-entrypoint.sh; override with WARP_ENABLED=false to disable.
  YTDLP_PROXY: z.string().default(""),
  // Persistent conversion cache (videoId+bitrate) + cooldown breaker.
  CACHE_MAX_MB: z.coerce.number().int().min(100).max(20000).default(2000),
  CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  BREAKER_THRESHOLD: z.coerce.number().int().min(2).max(50).default(5),
  BREAKER_COOLDOWN_MIN: z.coerce.number().int().min(1).max(240).default(30),
});

export type AppConfig = z.infer<typeof envSchema>;

let cached: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast with a readable message rather than cryptic runtime errors.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Reset cache — used by tests only. */
export function _resetConfigCache() {
  cached = null;
}

export const ALLOWED_BITRATES = [128, 192, 256, 320] as const;
export type AllowedBitrate = (typeof ALLOWED_BITRATES)[number];

export function isAllowedBitrate(v: unknown): v is AllowedBitrate {
  return typeof v === "number" && (ALLOWED_BITRATES as readonly number[]).includes(v);
}
