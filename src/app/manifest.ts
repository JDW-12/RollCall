import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roll Call",
    short_name: "Roll Call",
    description: "The app for your crew. Pin the session, everyone taps in, turning up becomes a stat.",
    start_url: "/home",
    display: "standalone",
    background_color: "#0b1210",
    theme_color: "#35d07a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
