import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavHeader } from "@/components/NavHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VestaAI — Professionele vastgoedcontent in 90 seconden",
  description:
    "VestaAI genereert Funda-teksten, brochures en social media content voor makelaars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <NavHeader />
        {children}
      </body>
    </html>
  );
}
