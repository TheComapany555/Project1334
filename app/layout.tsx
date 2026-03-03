import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { Providers } from "./providers";
import { TopLoader } from "@/components/top-loader";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Salebiz | Business for Sale",
  description: "Buy and sell businesses across Australia",
  icons: {
    icon: "/Salebizsvg.svg",
    apple: "/Salebizsvg.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={publicSans.variable} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TopLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
