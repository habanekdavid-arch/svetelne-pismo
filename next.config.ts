import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ["three"],
  // The price is worked out from the sign measured against the real font file
  // (lib/sign-metrics.server.ts), which reads it off disk. Files under
  // /public are served by the CDN and are NOT in the serverless bundle unless
  // they are named here — without this the measurement silently fails in
  // production and every quote falls back to an estimate.
  outputFileTracingIncludes: {
    "/api/quote": ["./public/fonts_rozsvietto/**"],
    "/api/orders": ["./public/fonts_rozsvietto/**"],
    "/api/stripe/webhook": ["./public/fonts_rozsvietto/**"],
  },
  images: {
    remotePatterns: [
      {
        // 4from.media CDN — obrázky realizácií
        // Odporúčanie: stiahni fotky do /public/realizacie/ a zmeň image pole
        // v data/realizations.ts na lokálne cesty (nezávisí od cudzieho CDN,
        // rýchlejšie, funguje aj bez internetu).
        protocol: "https",
        hostname: "www.4from.media",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
