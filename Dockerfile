# Single-container production image: Next.js + FFmpeg + yt-dlp + SQLite.
# Cloudflare Workers CANNOT run this (no child_process, no filesystem,
# 30s CPU limits). Deploy here instead: Fly.io / Render / Railway / any VPS.
# See docs/deployment.md for the breakdown and free-tier picks.
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 ffmpeg curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# yt-dlp static binary (no pip needed)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV TEMP_DIR=/tmp/converter
ENV DATABASE_URL=file:/data/jobs.db
VOLUME ["/data", "/tmp/converter"]
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && npm run start -- -p ${PORT:-3000} -H 0.0.0.0"]
