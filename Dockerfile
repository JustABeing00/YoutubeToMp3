# Single-container production image: Next.js + FFmpeg + yt-dlp + SQLite.
# Cloudflare Workers CANNOT run this (no child_process, no filesystem,
# 30s CPU limits). Deploy here instead: Fly.io / Render / Railway / any VPS.
# See docs/deployment.md for the breakdown and free-tier picks.
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip ffmpeg curl ca-certificates unzip git \
 && rm -rf /var/lib/apt/lists/*
# Deno provides the JS runtime yt-dlp needs for YouTube's JS challenge.
# The adapter passes --js-runtimes "deno" (single name — yt-dlp ignores
# comma-joined values), so the "No supported JavaScript runtime" warning
# (which degrades extraction) goes away.
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh \
 && deno --version
# yt-dlp release binary (no pip needed). Re-pulled on every --no-cache build,
# so monthly rebuilds pick up YouTube fixes. Run `yt-dlp -U` inside the
# container for an in-place update without rebuilding.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod +x /usr/local/bin/yt-dlp \
 && yt-dlp --version
# The release binary is a zipapp on system Python, so optional deps come from
# site-packages: curl_cffi gives yt-dlp its CurlCffi handler, without which
# --impersonate fails ("Impersonate target chrome is not available") and
# googlevideo sees a bot-like urllib fingerprint. pysocks enables --proxy
# (used for the WARP egress route below).
RUN pip3 install --no-cache-dir --break-system-packages curl_cffi pysocks \
 && python3 -c "import curl_cffi, socks; print('curl_cffi', curl_cffi.__version__)" \
 && yt-dlp --list-impersonate-targets | grep -qi chrome

# Free Cloudflare WARP egress (pinned versions, verified Sept 2026): YouTube
# sees a Cloudflare IP instead of a flagged datacenter IP. wireproxy exposes
# it as a local SOCKS5 proxy; scripts/warp-entrypoint.sh registers the free
# account on first boot (persisted on /data), probes YouTube through it, and
# sets YTDLP_PROXY only when the probe passes.
ARG WIREPROXY_VERSION=1.1.3
ARG WGCF_VERSION=2.2.32
RUN curl -L https://github.com/windtf/wireproxy/releases/download/v${WIREPROXY_VERSION}/wireproxy_linux_amd64.tar.gz -o /tmp/wireproxy.tgz \
 && tar -xzf /tmp/wireproxy.tgz -C /usr/local/bin wireproxy \
 && rm /tmp/wireproxy.tgz \
 && curl -L https://github.com/ViRb3/wgcf/releases/download/v${WGCF_VERSION}/wgcf_${WGCF_VERSION}_linux_amd64 -o /usr/local/bin/wgcf \
 && chmod +x /usr/local/bin/wgcf /usr/local/bin/wireproxy \
 && test -x /usr/local/bin/wireproxy && test -x /usr/local/bin/wgcf

# PO-token stack for YouTube bot checks on flagged datacenter IPs (free, no
# cookies, no proxy). Pinned provider release: bump ARG to upgrade both parts
# together (plugin zip + server sources must match).
ARG BGUTIL_VERSION=2.0.0
RUN mkdir -p /opt/yt-dlp-plugins /root/bgutil-ytdlp-pot-provider \
 && curl -L https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/${BGUTIL_VERSION}/bgutil-ytdlp-pot-provider.zip \
      -o /opt/yt-dlp-plugins/bgutil-ytdlp-pot-provider.zip \
 && curl -L https://github.com/Brainicism/bgutil-ytdlp-pot-provider/archive/refs/tags/${BGUTIL_VERSION}.tar.gz \
      -o /tmp/bgutil.tgz \
 && tar -xzf /tmp/bgutil.tgz -C /root/bgutil-ytdlp-pot-provider --strip-components=1 \
 && rm /tmp/bgutil.tgz \
 && cd /root/bgutil-ytdlp-pot-provider/server && deno install --allow-scripts=npm:canvas --frozen
# Chrome TLS fingerprint + PO-token plugin dir. Overridable at runtime;
# empty locally (see .env.example) if your yt-dlp lacks curl_cffi/plugins.
ENV YTDLP_EXTRA_ARGS="--impersonate chrome --plugin-dirs /opt/yt-dlp-plugins"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV TEMP_DIR=/tmp/converter
ENV DATABASE_URL=file:/data/jobs.db
ENV WARP_DIR=/data/warp
ENV YTDLP_PROXY=""
COPY scripts/warp-entrypoint.sh /usr/local/bin/warp-entrypoint.sh
# Strip CR characters (Windows checkouts) so #!/bin/sh keeps working.
RUN sed -i 's/\r$//' /usr/local/bin/warp-entrypoint.sh && chmod +x /usr/local/bin/warp-entrypoint.sh
VOLUME ["/data", "/tmp/converter"]
EXPOSE 3000
CMD ["/usr/local/bin/warp-entrypoint.sh"]
