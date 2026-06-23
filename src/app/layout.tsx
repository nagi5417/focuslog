import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import {
  AccentProvider,
  type Accent,
} from "@/components/providers/AccentProvider";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

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

function toAccent(value: string | undefined): Accent {
  switch (value) {
    case "green":
    case "blue":
    case "yellow":
    case "orange":
    case "violet":
      return value;
    default:
      return "blue";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieAccent = toAccent((await cookies()).get("fl-accent")?.value);
  const session = await auth();
  const setting = session?.user?.id
    ? await prisma.setting.findUnique({
        where: { userId: session.user.id },
        select: { accent: true },
      })
    : null;
  const initialAccent = toAccent(setting?.accent ?? cookieAccent);

  return (
    <html
      lang="ja"
      data-accent={initialAccent}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased">
        <ThemeProvider>
          <AccentProvider initialAccent={initialAccent}>
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
