import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dCreator Platform",
  description: "Independent Creator Economy + Social Commerce platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
