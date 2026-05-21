import type { Metadata } from "next";
import Link from "next/link";
import { NotificationBell } from "@/app/_components/NotificationBell";
import "./globals.css";

export const metadata: Metadata = {
  title: "dCreator Standalone",
  description: "Standalone Creator Economy platform"
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/wallet", label: "Wallet" },
  { href: "/vouchers", label: "Vouchers" },
  { href: "/notifications", label: "Notifications" },
  { href: "/dashboard/user", label: "User" },
  { href: "/dashboard/creator", label: "Creator" },
  { href: "/dashboard/brand", label: "Brand" },
  { href: "/admin/vouchers", label: "Admin Vouchers" },
  { href: "/admin", label: "Admin" }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <header className="topbar">
          <div className="container nav">
            <strong>dCreator</strong>
            <nav>
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <NotificationBell />
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
