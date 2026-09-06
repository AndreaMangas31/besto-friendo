import type { MetadataRoute } from "next";

// Mismo navy que el recorte de la bolita. iOS usa apple-icon; Android estos PNG.
const NAVY = "#0b1220";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Besto Friendo",
    short_name: "Besto Friendo",
    description: "Tutor de conversación en japonés",
    start_url: "/",
    display: "standalone",
    background_color: NAVY,
    theme_color: NAVY,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
