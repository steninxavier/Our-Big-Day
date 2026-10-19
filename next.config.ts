import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    incomingRequests: {
      // These URLs may carry a bearer invitation token, including in `next`.
      ignore: [/^\/member-invitations\//, /^\/api\/(?:public\/)?member-invitations\//, /^\/invite\//, /^\/api\/public\/invitations\//, /^\/api\/guests\/[^/]+\/invitation-link/, /^\/(?:login|signup)(?:\?|$)/],
    },
  },
  async headers() {
    const sensitive = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Cache-Control", value: "no-store" },
    ];
    return [
      { source: "/member-invitations/:path*", headers: sensitive },
      { source: "/invite/:path*", headers: sensitive },
      { source: "/api/public/invitations/:path*", headers: sensitive },
      { source: "/api/guests/:guestId/invitation-link", headers: sensitive },
      { source: "/api/public/member-invitations/:path*", headers: sensitive },
      { source: "/api/member-invitations/:path*", headers: sensitive },
      { source: "/login", headers: sensitive },
      { source: "/signup", headers: sensitive },
    ];
  },
  // Private gallery originals use short-lived R2 URLs and deliberately bypass
  // public image optimisation. Add public remote image patterns only when a
  // public, cache-safe image surface is introduced.
};

export default nextConfig;
