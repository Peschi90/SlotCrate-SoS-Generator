import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SlotCrate Sorting System Konfigurator",
    short_name: "SlotCrate SoS",
    description: "Konfiguriere und exportiere modulare SlotCrate-Sortierkästen.",
    start_url: "/",
    display: "standalone",
    background_color: "#080b08",
    theme_color: "#3f8f1c",
    icons: [
      {
        src: "/SC-SOS-Logo.png",
        sizes: "1254x1254",
        type: "image/png"
      },
      {
        src: "/SC-SOS-Logo.png",
        sizes: "1254x1254",
        type: "image/png"
      }
    ]
  };
}