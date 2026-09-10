import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev-mode "N" badge covered the sidebar footer; build/runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
