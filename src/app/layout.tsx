import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webindiz Ads — Meta Ads Dashboard",
  description: "Dashboard interne de gestion des campagnes Meta Ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
