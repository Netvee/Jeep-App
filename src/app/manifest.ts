import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "שטח · הגראז׳ שלך לשטח",
    short_name: "שטח",
    description: "גראז׳ אישי, מתכנן שדרוגים ומלווה שטח לבעלי רכבי 4×4 בישראל",
    start_url: "/garage",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#faf7f1",
    theme_color: "#1d1f21",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
