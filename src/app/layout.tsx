import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const sans = Instrument_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

const configuredUrl = process.env.NEXT_PUBLIC_APP_URL && !(process.env.VERCEL && /localhost/.test(process.env.NEXT_PUBLIC_APP_URL)) ? process.env.NEXT_PUBLIC_APP_URL : undefined;
const appUrl =
  configuredUrl ??
  (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "Roll Call", template: "%s · Roll Call" },
  description: "The app for your crew. Pin the session, everyone taps in, turning up becomes a stat.",
  applicationName: "Roll Call",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Roll Call", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b1210",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("rc_theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang="en-GB" data-theme={theme} className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
