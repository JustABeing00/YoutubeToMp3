/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // All API routes that touch the filesystem / spawn processes need Node.
  // (Cloudflare Workers cannot run them — see docs/deployment.md.)
};

export default nextConfig;
