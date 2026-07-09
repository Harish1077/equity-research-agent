import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080A0D",
};

export const metadata: Metadata = {
  title: "EQUITY ORACLE — Adversarial Investment Research Engine",
  description:
    "An autonomous multi-agent research desk. Bull and Bear argue about every stock, and the Oracle rules on hard data alone.",
  keywords: ["stock analysis", "investment research", "AI finance", "equity analysis", "bull bear debate"],
  authors: [{ name: "Equity Oracle" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: "EQUITY ORACLE — Adversarial Investment Research Engine",
    description:
      "Bull and Bear agents debate every stock. The Oracle rules on data. AI-powered investment research.",
    siteName: "Equity Oracle",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "EQUITY ORACLE — Adversarial AI Stock Research",
    description:
      "Bull and Bear agents debate every stock. The Oracle rules on hard data alone.",
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
