import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Story Market Desk",
  description: "Book format and language planning with Google Trends and KDP estimation source data.",
  manifest: "/manifest.webmanifest",
  applicationName: "Story Market Desk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Story Market Desk"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
