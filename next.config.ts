import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "m.media-amazon.com" },
      { hostname: "static.sonovente.com" },
      { hostname: "www.prozic.com" },
      { hostname: "cdn.chausson.fr" },
      { hostname: "img.pccomponentes.com" },
      { hostname: "shehds.com" },
      { hostname: "media.normequip.com" },
      { hostname: "cdn.manomano.com" },
      { hostname: "thumbs.static-thomann.de" },
      { hostname: "www.aevas-sono.com" },
      { hostname: "rvs-event.fr" },
      { hostname: "light4me.pl" },
      { hostname: "www.pioneerdj.com" },
      { hostname: "www.109.fr" },
      { hostname: "static.weezbe.com" },
      { hostname: "www.materiauxnet.com" },
      { hostname: "static.fnac-static.com" },
      { hostname: "www.audiophonics.fr" },
      { hostname: "api.qrserver.com" },
      { hostname: "sonelyx.fr" },
      { hostname: "www.sonelyx.fr" },
    ],
  },
};

export default nextConfig;
