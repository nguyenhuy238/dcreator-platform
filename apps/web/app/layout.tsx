import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dCreator - Creator Commerce Platform",
  description: "Creator economy, campaign sponsorship và reward voucher platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
