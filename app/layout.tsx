import type { Metadata } from "next";
import { Google_Sans, Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SvgFilters } from "@/components/svg-filters";
import { Grain } from "@/components/grain";
import "./globals.css";

// The chapter site's typeface (gdgbabcock.com — GDGWebsite/app/globals.css
// loads `family=Google+Sans`), not the Google Sans FLEX superfamily this app
// shipped with. Flex is a different design with a much wider axis range, so
// Wrapped was quietly off-brand next to the site it belongs to. Variable
// weight is preserved: Google Sans carries wght 400..700, which is exactly
// the range .kinetic animates over — nothing here asks for 800+, so no
// browser weight synthesis (the ghosted-stroke bug documented in the site's
// globals.css) can occur.
const googleSans = Google_Sans({
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
      <body className="overflow-x-hidden w-full">
        <SvgFilters />
        {children}
        <Grain />
        <Analytics />
      </body>
    </html>
  );
}
