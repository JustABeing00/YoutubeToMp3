#!/bin/sh
# Container entrypoint: starts a free Cloudflare WARP egress proxy for
# yt-dlp (so YouTube sees a Cloudflare IP, not a flagged datacenter IP),
# then runs migrations and the Next.js server.
#
# - WARP identity persists in $WARP_DIR (on the /data volume) across rebuilds.
# - If registration or the YouTube probe fails, YTDLP_PROXY is left empty and
#   the app runs exactly as before (direct egress). Never fatal.
# - Set WARP_ENABLED=false to skip the proxy entirely.
set -eu

WARP_DIR="${WARP_DIR:-/data/warp}"
WARP_SOCKS="${WARP_SOCKS:-127.0.0.1:1080}"
export YTDLP_PROXY="${YTDLP_PROXY:-}"

if [ "${WARP_ENABLED:-true}" = "true" ]; then
  mkdir -p "$WARP_DIR"
  # Ephemeral-disk escape hatch (Render Free has no persistent volume):
  # materialize a baked profile from env instead of registering. The profile
  # travels as WGCF_PROFILE_B64 (base64 of wgcf-profile.conf) — never logged,
  # never committed. Decoding ignores whitespace/newlines, so a wrapped
  # copy-paste still works.
  if [ ! -f "$WARP_DIR/wgcf-profile.conf" ] && [ -n "${WGCF_PROFILE_B64:-}" ]; then
    echo "[warp] materializing profile from WGCF_PROFILE_B64..."
    if printf '%s' "$WGCF_PROFILE_B64" | base64 -d >"$WARP_DIR/wgcf-profile.conf" 2>/dev/null \
      && grep -q "PrivateKey" "$WARP_DIR/wgcf-profile.conf" 2>/dev/null; then
      echo "[warp] profile materialized"
    else
      echo "[warp] WGCF_PROFILE_B64 decode failed, continuing without proxy"
      rm -f "$WARP_DIR/wgcf-profile.conf"
    fi
  fi
  if [ ! -f "$WARP_DIR/wgcf-profile.conf" ]; then
    echo "[warp] registering free WARP account..."
    if (cd "$WARP_DIR" && wgcf register --accept-tos >/tmp/wgcf-register.log 2>&1 && wgcf generate >/tmp/wgcf-generate.log 2>&1); then
      printf '\n[Socks5]\nBindAddress = %s\n' "$WARP_SOCKS" >>"$WARP_DIR/wgcf-profile.conf"
      echo "[warp] profile created"
    else
      echo "[warp] registration failed, continuing without proxy"
      tail -n 5 /tmp/wgcf-register.log 2>/dev/null || true
    fi
  fi
  if [ -f "$WARP_DIR/wgcf-profile.conf" ]; then
    echo "[warp] starting wireproxy on $WARP_SOCKS..."
    wireproxy -c "$WARP_DIR/wgcf-profile.conf" >/tmp/wireproxy.log 2>&1 &
    # Wait up to ~30s for the SOCKS port, then probe YouTube through it.
    PROXY_OK=""
    for _ in $(seq 1 15); do
      if curl -sS --max-time 10 -o /dev/null -x "socks5h://$WARP_SOCKS" https://www.youtube.com/generate_204 2>/dev/null; then
        PROXY_OK="1"
        break
      fi
      sleep 2
    done
    if [ -n "$PROXY_OK" ]; then
      echo "[warp] proxy OK, routing yt-dlp via WARP"
      export YTDLP_PROXY="socks5h://$WARP_SOCKS"
    else
      echo "[warp] probe failed, disabling proxy for this run (see /tmp/wireproxy.log)"
      export YTDLP_PROXY=""
    fi
  else
    export YTDLP_PROXY=""
  fi
else
  echo "[warp] disabled via WARP_ENABLED=false"
  export YTDLP_PROXY=""
fi

npm run db:migrate
# shellcheck disable=SC2086
exec npm run start -- -p ${PORT:-3000} -H 0.0.0.0
