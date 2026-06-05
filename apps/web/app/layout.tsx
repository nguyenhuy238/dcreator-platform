import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Manrope, Space_Grotesk } from "next/font/google";
import { GoogleAnalyticsPageView } from "@/app/components/analytics/GoogleAnalyticsPageView";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "dCreator - Creator Commerce Platform",
  description: "Creator economy, campaign sponsorship và reward voucher platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${manrope.variable}`}>
        {children}
        {gaId ? <GoogleAnalyticsPageView gaId={gaId} /> : null}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
