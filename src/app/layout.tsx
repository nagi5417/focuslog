import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AccentProvider } from "@/components/providers/AccentProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FocusLog",
  description: "シングルタスク計測でいまに集中するためのタスク管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased">
        <ThemeProvider>
          <AccentProvider>
            <TooltipProvider delayDuration={400}>
              {children}
              <Toaster />
            </TooltipProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
