import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Familien‑Momente",
  description: "Private Familien‑Momente teilen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
