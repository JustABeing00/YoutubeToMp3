# Single-container production image: Next.js + FFmpeg + yt-dlp + SQLite.
# Cloudflare Workers CANNOT run this (no child_process, no filesystem,
# 30s CPU limits). Deploy here instead: Fly.io / Render / Railway / any VPS.
# See docs/deployment.md for the breakdown and free-tier picks.
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 ffmpeg curl ca-certificates unzip \
 && rm -rf /var/lib/apt/lists/*
# Deno provides the JS runtime yt-dlp needs for YouTube's JS challenge.
# Node is already in the image; the adapter passes --js-runtimes "node,deno"
# so either runtime satisfies yt-dlp and the "No supported JavaScript
# runtime" warning (which degrades extraction) goes away.
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
 && deno --version
# yt-dlp static binary (no pip needed). Re-pulled on every --no-cache build,
# so monthly rebuilds pick up YouTube fixes. Run `yt-dlp -U` inside the
# container for an in-place update without rebuilding.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && yt-dlp --version

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV TEMP_DIR=/tmp/converter
ENV DATABASE_URL=file:/data/jobs.db
VOLUME ["/data", "/tmp/converter"]
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start -- -p ${PORT:-3000} -H 0.0.0.0"]
