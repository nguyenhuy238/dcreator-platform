import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
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
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
