import { getSiteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

const SITE_URL = getSiteUrl();

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flipper",
    short_name: "Flipper",
    description:
      "Albion Online Black Market flipping tool with real-time data and private database.",
    start_url: SITE_URL,
    display: "standalone",
    background_color: "#0B0B0F",
    theme_color: "#0B0B0F",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
