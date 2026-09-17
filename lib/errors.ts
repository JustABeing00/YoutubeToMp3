/** Stable error codes returned to the browser. Never leak stack traces. */
export const ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  UNSUPPORTED_SOURCE: "UNSUPPORTED_SOURCE",
  METADATA_UNAVAILABLE: "METADATA_UNAVAILABLE",
  SOURCE_UNAVAILABLE: "SOURCE_UNAVAILABLE",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  RETRIEVAL_FAILED: "RETRIEVAL_FAILED",
  CONVERSION_FAILED: "CONVERSION_FAILED",
  TIMEOUT: "TIMEOUT",
  OUTPUT_TOO_LARGE: "OUTPUT_TOO_LARGE",
  RATE_LIMITED: "RATE_LIMITED",
  NOT_FOUND: "NOT_FOUND",
  EXPIRED: "EXPIRED",
  CONFLICT: "CONFLICT",
  SERVER_ERROR: "SERVER_ERROR",
  WAKING: "WAKING",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const MESSAGES: Record<ErrorCode, string> = {
  INVALID_URL: "That URL doesn't look valid. Please paste a supported video link.",
  UNSUPPORTED_SOURCE: "This source isn't supported. Only convert media you have permission to download.",
  METADATA_UNAVAILABLE: "We couldn't fetch information for this video. It may be private or unavailable.",
  SOURCE_UNAVAILABLE: "The source media is unavailable right now. Please try again later.",
  AUTH_REQUIRED: "This video requires sign-in and can't be converted.",
  RETRIEVAL_FAILED: "We couldn't retrieve the source media. Please try a different video.",
  CONVERSION_FAILED: "We couldn't convert this file. Please try again.",
  TIMEOUT: "The conversion timed out. Try a shorter video.",
  OUTPUT_TOO_LARGE: "The resulting MP3 would be too large. Try a shorter video.",
  RATE_LIMITED: "You're doing that too often. Please wait a moment and try again.",
  NOT_FOUND: "This job doesn't exist.",
  EXPIRED: "This file has expired and was deleted. Please convert again.",
  CONFLICT: "This job can't be modified in its current state.",
  SERVER_ERROR: "Something went wrong on our side. Please try again.",
  WAKING: "Converter is waking up after idle. Please wait a moment and retry.",
};

export function errorBody(code: ErrorCode, detail?: string) {
  return { error: { code, message: MESSAGES[code] + (detail ? ` (${detail})` : "") } };
}

export function statusFor(code: ErrorCode): number {
  switch (code) {
    case "INVALID_URL":
    case "UNSUPPORTED_SOURCE":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "EXPIRED":
      return 410;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    default:
      return 500;
  }
}
