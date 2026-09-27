import type { Metadata } from "next";
import "./globals.css";
import "./sentinel.css";

export const metadata: Metadata = {
  title: "Sentinel | World Monitor Security Assessment",
  description: "SIH 2026 security assessment cockpit for World Monitor.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
