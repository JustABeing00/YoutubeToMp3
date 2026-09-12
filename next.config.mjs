/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // All API routes that touch the filesystem / spawn processes need Node.
  // (Cloudflare Workers cannot run them — see docs/deployment.md.)
  async headers() {
    return [
      {
        // Temporary conversion resources must never be indexed.
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          // Staged HSTS rollout: short max-age first to prove HTTPS is solid,
          // then raise to "max-age=63072000; includeSubDomains". Never add
          // "preload" until certain — HSTS preload is effectively irreversible.
          { key: "Strict-Transport-Security", value: "max-age=300" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        // Preferred canonical hostname is the apex: https://kharb.online
        source: "/:path*",
        has: [{ type: "host", value: "www.kharb.online" }],
        destination: "https://kharb.online/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
