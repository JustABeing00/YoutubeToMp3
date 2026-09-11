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
