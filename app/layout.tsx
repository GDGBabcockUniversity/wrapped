import type { Metadata } from "next";
import { Google_Sans_Flex, Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SvgFilters } from "@/components/svg-filters";
import { Grain } from "@/components/grain";
import "./globals.css";

const googleSans = Google_Sans_Flex({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GDG Wrapped 2025/26",
  description:
    "GDG on Campus Babcock's year in review — the chapter's year and your place in it.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://wrapped.gdgbabcock.com"
  ),
};

export const viewport = {
  themeColor: "#0f0f0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${googleSans.variable} ${bricolage.variable}`}
    >
      <body>
        <SvgFilters />
        {children}
        <Grain />
        <Analytics />
      </body>
    </html>
  );
}
