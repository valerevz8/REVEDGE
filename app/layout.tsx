import type { Metadata } from "next";
import "./globals.css";
import "./position-aware.css";

export const metadata: Metadata = {
  title: "REVEDGE — See what matters. Before the noise.",
  description: "Curated crypto intelligence for traders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
