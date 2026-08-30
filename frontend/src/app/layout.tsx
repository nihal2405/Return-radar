import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReturnMinder — Autonomous Returns & Warranty Tracking Agent",
  description: "ReturnMinder autonomously tracks purchase return deadlines, parses fine-print policies with Gemini 3.5 Flash, and ensures you never miss a return window.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
