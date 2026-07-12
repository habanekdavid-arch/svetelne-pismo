import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  transpilePackages: ["three"],
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
