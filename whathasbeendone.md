# What Has Been Done — kharb.online (YoutubeToMp3)

Handoff doc for starting a new session. Important points only.

## 1. Project
- Next.js 16 (App Router) + FFmpeg + yt-dlp + SQLite (`node:sqlite`, no native deps).
- Flow: paste URL → `POST /api/analyze` → pick bitrate → `POST /api/jobs` → worker pipeline (retrieve → ffmpeg transcode → verify) → SSE/poll progress → `GET /api/download/:id`. Files auto-expire (`JOB_EXPIRATION_MINUTES=30`).
- Key files: `components/Converter.tsx`, `app/api/*/route.ts`, `lib/jobs/manager.ts`, `lib/media/youtube-adapter.ts`, `lib/ffmpeg/transcode.ts`, `lib/storage/files.ts`.
- Only convert content the operator owns or has permission to download.

## 2. Deployment (live)
- **VPS:** Hostinger KVM 1, Ubuntu 24.04. App lives in `/opt/kharb` (git clone). All `docker compose` commands must run from `/opt/kharb`.
- **Domain:** `kharb.online` (+ `www`). Hostinger DNS: A `@` and A `www` → VPS IP.
- **Web:** Nginx reverse proxy `kharb.online` → `127.0.0.1:3000`. TLS via Certbot (Let's Encrypt, both apex+www, auto-renew verified with `certbot renew --dry-run`). Keep Nginx — do NOT migrate to Caddy.
- **Run:** single Docker container (`docker-compose.yml`, `restart: unless-stopped`). Volumes: `jobdata:/data` (SQLite + cache + WARP identity), `jobtmp:/tmp/converter`.
- **Production env:** `NEXT_PUBLIC_SITE_URL=https://kharb.online` baked at build via `Dockerfile` `ARG/ENV` + `docker-compose.yml` `environment:` (compose `environment:` overrides `.env`; a rebuild — not restart — is required to change it). VPS `.env` must also say the apex URL for consistency.

## 3. Docker build fixes (applied)
- `COPY package.json package-lock.json` + `npm ci` (was bare `npm install` → hit npm `edgesOut` bug).
- Base `node:22-bookworm-slim`; removed stray Windows-only `@rolldown/binding-win32-x64-msvc` from deps.
- `Dockerfile` bundles: ffmpeg, yt-dlp release binary, Deno (JS runtime for yt-dlp), `curl_cffi`+`pysocks` (pip, system site-packages — the yt-dlp zipapp needs them for `--impersonate`/`--proxy`), bgutil POT plugin (see §5), wireproxy+wgcf (see §6).

## 4. YouTube 403 saga — root cause (proven by logs)
- YouTube gates by **IP reputation first**: extraction/metadata/POT-minting all succeeded, then `googlevideo.com` 403'd the bytes. Valid PO tokens + Chrome fingerprint + `web/mweb/tv/android/ios` clients ALL still 403'd from Hostinger's IP. Cookies can't fix an IP block. IPv6 has no route on this VPS (v6 tests → unreachable).
- yt-dlp subtlety found: `--js-runtimes "node,deno"` is ignored (comma-joined = one name); must be single `--js-runtimes deno`.
- Public Piped/Invidious fallback APIs were probed live (Sept 2026) — effectively all dead (525/502/403/401/DNS). `lib/media/fallback.ts` exists as best-effort insurance only, NOT the fix.

## 5. Anti-block stack (current, all free)
- `YTDLP_EXTRA_ARGS="--impersonate chrome --plugin-dirs /opt/yt-dlp-plugins"` (Docker ENV; empty locally).
- PO-token plugin `Brainicism/bgutil-ytdlp-pot-provider` pinned `2.0.0` (zip + server sources via `ARG BGUTIL_VERSION`; both must match). Deno `script` provider mints tokens (verified in verbose logs). HTTP provider unused (no sidecar) — its warning is harmless.
- `lib/media/fallback.ts`: Piped→Invidious resolver, proxied hosts preferred; wired into `YoutubeAdapter.downloadSource` after direct failure (auth/size verdicts stay final). Env: `FALLBACK_ENABLED`, `PIPED_API_URLS`, `INVIDIOUS_API_URLS`, `FALLBACK_API_TIMEOUT_SEC`.
- **WARP egress (the actual fix):** `wireproxy v1.1.3` (windtf fork) + `wgcf v2.2.32`, `scripts/warp-entrypoint.sh` is container `CMD`: reuses `/data/warp/wgcf-profile.conf`, else registers free account, starts SOCKS5 on `127.0.0.1:1080`, probes YouTube, sets `YTDLP_PROXY=socks5h://...` only on probe success (else direct egress). `WARP_ENABLED=false` disables. Verified live: control video `100% of 9.73MiB in 00:00:04` via Cloudflare IN exit IP.
- **WARP registration caveat:** `wgcf register` from Hostinger IP → Cloudflare `429`. Solution used: profile generated on home PC (`wgcf.exe register --accept-tos` → `generate`, appended `[Socks5] BindAddress`), `scp` to VPS, `docker cp` into `/data/warp/`, restart. **NEVER commit `wgcf-profile.conf`** (lives in volume + PC backup `~\warp\`; `.gitignore` covers `data/`, `.env`, `*.db*`).

## 6. Resilience features
- `lib/media/oembed.ts`: Analyze uses YouTube oEmbed first (unlimited, unblockable; live-tested), yt-dlp fills duration. `getMetadata` succeeds on oEmbed alone (duration null).
- `lib/jobs/cache.ts` + `manager.ts`: completed MP3s cached by `videoId-bitrate` under `<dbdir>/cache`; repeats finish in seconds with zero YouTube contact; corrupt entries self-delete and fall through. Bounded by `CACHE_MAX_MB=2000`, `CACHE_TTL_HOURS=168`; swept in `scripts/cleanup.ts`.
- `lib/jobs/breaker.ts` + `manager.ts`: after `BREAKER_THRESHOLD=5` consecutive upstream failures, YouTube jobs fail fast ("cooling down") for `BREAKER_COOLDOWN_MIN=30` min. Success resets.
- New tests: `tests/unit/fallback.test.ts`, `tests/unit/resilience.test.ts`. NOTE: `vitest` can't run on the Windows dev box (broken rolldown native binding, pre-existing); `tsc --noEmit` is the gate. Logic was verified via throwaway `tsx` scripts (deleted).

## 7. Analytics + SEO (in repo, partly uncommitted — see §9)
- GA tag `G-70T5R1L88F` in `app/layout.tsx` `<head>` via `next/script` (site-wide, single tag; verified in build output).
- 7 indexable pages: `/`, `/how-to-convert-video-to-mp3`, `/faq`, `/privacy`, `/terms`, `/about`, `/contact` (+ `not-found.tsx`, `error.tsx`, `manifest.ts`, `robots.ts`, `sitemap.ts`). Helpers: `lib/seo.ts`, `components/SiteHeader|SiteFooter|InfoPage.tsx`. Header/footer live in layout; `Converter`'s old header removed; video title demoted to preserve single H1.
- `next.config.mjs`: `/:path*` security headers + staged `Strict-Transport-Security: max-age=300` (raise to `max-age=63072000; includeSubDomains` after a clean HTTPS day; never `preload` casually), `/api/*` → `X-Robots-Tag: noindex, nofollow`, `www.kharb.online` → 301 apex (verified live: 308, path preserved).
- Canonicals/OG/sitemap all `https://kharb.online/...` (verified in build output). Remaining: Rich Results/PageSpeed checks, Search Console submission of the 7 URLs, optional HSTS raise + GA conversion events.

## 8. Standard VPS workflows (all run from `/opt/kharb` — compose file lives only there)

**Update source code on VPS (normal deploy):**
```bash
cd /opt/kharb
git pull                                        # PC is source of truth: edit → commit → push → pull here
docker compose up -d --build                    # rebuild: restart alone won't bake env/code changes
docker compose logs --tail 25                   # expect [warp] verdict, migrate, ✓ Ready
```

**If VPS has local edits (stash → pull → pop):**
```bash
cd /opt/kharb
git stash push <file> -m "reason"               # park local change; tree must be clean before pull
git pull
git stash pop                                   # re-applies; if it refuses, a conflict is pending (see below)
```

**Merge-conflict recovery (unmerged files / `needs merge` / go-yaml errors):**
```bash
cd /opt/kharb
git status --short                              # UU = conflicted file
git stash list && git stash show -p stash@{0}   # confirm parked work is safe
git diff <file>                                 # inspect <<<<<<< markers
git checkout --theirs -- <file>                 # take GitHub version (verify it contains the VPS intent!)
git add <file> && git commit --no-edit          # finish the pull-merge
grep -n "SITE_URL" docker-compose.yml           # sanity: must show https://kharb.online
git stash drop                                  # only after the line above is correct
docker compose config > /dev/null && echo "YAML OK"   # markers gone?
docker compose up -d --build
```
Rule: never hand-edit tracked files on VPS. VPS-only values go in `.env` (gitignored).

**Health / diagnostics:**
```bash
cd /opt/kharb
docker ps                                       # kharb-web-1 must be Up
docker compose logs --tail 50                   # app + [warp] lines
docker compose logs -f                          # live tail (Ctrl+C to exit)
docker compose exec web yt-dlp --version
docker compose exec web yt-dlp -U               # in-place yt-dlp update (no rebuild)
curl -I http://localhost:3000                   # expect 200/307
curl -sI https://kharb.online/ | head -n 5
curl -sI https://kharb.online/ | grep -i strict-transport
curl -s https://kharb.online/ | grep -o '<link rel="canonical"[^>]*>'
curl -s https://kharb.online/sitemap.xml | grep '<loc>'
nslookup kharb.online; nslookup www.kharb.online
df -h                                           # disk; prune with: docker system prune -f
```

**YouTube path probe (the moment-of-truth test):**
```bash
cd /opt/kharb
docker compose exec web curl -sS --max-time 15 -x socks5h://127.0.0.1:1080 https://cloudflare.com/cdn-cgi/trace | grep -E "^(ip|loc)"
docker compose exec web yt-dlp --impersonate chrome --plugin-dirs /opt/yt-dlp-plugins --force-ipv4 --js-runtimes deno --no-playlist --proxy socks5h://127.0.0.1:1080 -f bestaudio --no-part -o "/tmp/probe.%(ext)s" "https://www.youtube.com/watch?v=aqz-KE-bpKQ" 2>&1 | tail -n 8
# want: 100% download. 403 = egress flagged again (see §4/§5).
```

- Monthly: `docker compose build --no-cache && docker compose up -d` (fresh yt-dlp/Deno vs YouTube changes).
- Logs to watch: `[warp] proxy OK|probe failed`, `media.fallback_used`, `job.completed cached:true`, breaker cooldown failures.
- Don't rapid-fire failing test videos — hammering deepens YouTube throttling.

## 9. Git state (as of this doc)
- Uncommitted: SEO batch (`app/*/`, `components/Site*`, `lib/seo.ts`, `public/`, layout/page/robots/sitemap/Converter/MetadataCard) + hardening (`Dockerfile`, `docker-compose.yml`, `next.config.mjs`, `.env.example`).
- Planned: commit A = SEO batch; commit B = prod hardening (`Dockerfile docker-compose.yml next.config.mjs .env.example`); then `push` + VPS pull/rebuild. Never commit `.env`, `data/`, `*.db*`, `wgcf-profile.conf`, `node_modules/`, `.next/`.
