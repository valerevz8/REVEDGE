import type { Metadata } from "next";
import "./globals.css";
import "./position-aware.css";
import "./theme-preferences.css";
import { PreferencesProvider } from "./components/Preferences";
import LanguageCompleteness from "./components/LanguageCompleteness";

export const metadata: Metadata = {
  title: "REVEDGE — See what matters. Before the noise.",
  description: "Curated crypto intelligence for traders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          <LanguageCompleteness />
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
