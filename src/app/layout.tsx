import { ReactNode } from "react";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap"
});

export const metadata = {
  title: "CarryGo",
  description: "White-label multi-tenant ride-hailing SaaS"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
