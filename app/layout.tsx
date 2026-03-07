import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { TopLoader } from "@/components/top-loader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Salebiz | Business for Sale",
  description: "Buy and sell businesses across Australia",
  icons: {
    icon: "https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg",
    apple: "https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${geistMono.variable} antialiased`}>
        <TopLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
