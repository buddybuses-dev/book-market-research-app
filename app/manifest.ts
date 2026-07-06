import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Story Market Desk",
    short_name: "StoryDesk",
    description: "Book format and language planning with connected market data tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f2e8",
    theme_color: "#244b5a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
