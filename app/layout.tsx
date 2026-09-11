import type { Metadata } from "next";
import "./globals.css";
import "./position-aware.css";
import "./theme-preferences.css";
import "./visual-fixes.css";
import "./v1-bias.css";
import "./final-fixes.css";
import { PreferencesProvider } from "./components/Preferences";
import LanguageCompleteness from "./components/LanguageCompleteness";
import BrandMigration from "./components/BrandMigration";

export const metadata: Metadata = {
  title: "HALVER — See what matters. Before the noise.",
  description: "Curated crypto intelligence for traders.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          <LanguageCompleteness />
          <BrandMigration />
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
