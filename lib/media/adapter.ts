/**
 * Media retrieval is isolated behind this interface so the conversion
 * pipeline never depends on yt-dlp (or any single downloader) directly.
 *
 * Pipeline talks to `MediaSourceAdapter` only; concrete adapters live in
 * ./youtube-adapter.ts and ./direct-adapter.ts and are picked by hostname.
 */

export interface MediaMetadata {
  title: string;
  duration: number | null; // seconds; null when unknown
  thumbnail: string | null;
  source: string; // e.g. "YouTube"
  author: string | null;
  available: boolean;
}

export interface ValidationResult {
  supported: boolean;
  reason?: string;
}

export interface DownloadResult {
  filePath: string; // absolute path of downloaded source file
  bytes: number;
  ext: string;
  duration: number | null;
}

export interface MediaSourceAdapter {
  readonly name: string;
  validateUrl(url: string): Promise<ValidationResult>;
  getMetadata(url: string): Promise<MediaMetadata>;
  downloadSource(url: string, outputPath: string, opts: { timeoutMs: number; maxBytes: number; onProgress?: (p: number) => void }): Promise<DownloadResult>;
}

export class AdapterError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
