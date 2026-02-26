import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_STRAPI_BASE_URL:
      process.env.STRAPI_BASE_URL || "http://localhost:1337",
  },
};

export default nextConfig;
