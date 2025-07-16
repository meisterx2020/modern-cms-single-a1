import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingExcludes: {
    '*': ['./scripts/**/*'],
  },
};

export default nextConfig;
