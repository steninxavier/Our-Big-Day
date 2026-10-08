import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Private gallery originals use short-lived R2 URLs and deliberately bypass
  // public image optimisation. Add public remote image patterns only when a
  // public, cache-safe image surface is introduced.
};

export default nextConfig;
