/**
 * Turn arbitrary video titles into safe `*.mp3` filenames.
 * Handles spaces, unicode, very long titles, control chars, Windows-reserved names.
 */
const MAX_BASE = 120;
const WINDOWS_RESERVED = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
]);

export function sanitizeFilename(title: string, fallback = "audio"): string {
  let base = (title ?? "").normalize("NFC");
  // Remove control chars + illegal FS chars, but KEEP unicode letters/spaces.
  base = base.replace(/[\u0000-\u001F\u007F]/g, "");
  base = base.replace(/[\\/:*?"<>|]/g, "");
  base = base.replace(/^\.+/, "").trim().replace(/\s+/g, " ");
  base = base.replace(/\.+$/g, "").trim();
  if (!base) base = fallback;
  if (WINDOWS_RESERVED.has(base.toLowerCase())) base = `_${base}`;
  // Truncate on code-point boundary, not bytes.
  const points = Array.from(base);
  if (points.length > MAX_BASE) base = points.slice(0, MAX_BASE).join("").trim();
  if (!base) base = fallback;
  return `${base}.mp3`;
}
