// .mjs (not .ts): prod runs `npm install --omit=dev`, and loading next.config.ts needs `typescript`
// (a devDependency) — without it `next start` crash-looped on every deploy.

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_STRAPI_BASE_URL:
      process.env.NEXT_PUBLIC_STRAPI_BASE_URL ||
      process.env.STRAPI_BASE_URL ||
      "http://localhost:1337",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
