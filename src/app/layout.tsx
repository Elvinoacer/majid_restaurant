import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-sans-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-display-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MajidOS — Restaurant Growth Platform",
    template: "%s · MajidOS",
  },
  description:
    "MajidOS — a customer acquisition and operations platform for independent Kenyan restaurants. Digital menu, online ordering, reservations, and analytics.",
  keywords: [
    "Majid Restaurant",
    "Nakuru restaurant",
    "biryani Nakuru",
    "Kenyan restaurant",
    "restaurant platform",
    "online ordering",
    "restaurant reservations",
  ],
  authors: [{ name: "GTSS — Great Thumbs Software Solutions" }],
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "MajidOS — Restaurant Growth Platform",
    description:
      "A customer acquisition and operations platform for independent Kenyan restaurants.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MajidOS",
    description:
      "A customer acquisition and operations platform for independent Kenyan restaurants.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-screen flex flex-col">{children}</div>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
