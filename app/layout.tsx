import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { TopLoader } from "@/components/top-loader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://salebiz.com.au";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Salebiz | Businesses for Sale in Australia",
    template: "%s | Salebiz",
  },
  description:
    "Australia's trusted marketplace for buying and selling businesses. Browse thousands of verified listings from licensed brokers across all states and territories.",
  keywords: [
    "business for sale",
    "buy a business",
    "sell a business",
    "business broker Australia",
    "businesses for sale Australia",
    "franchise for sale",
    "small business for sale",
  ],
  authors: [{ name: "Salebiz" }],
  creator: "Salebiz",
  icons: {
    icon: "https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg",
    apple: "https://g44yi0ry58orcc8h.public.blob.vercel-storage.com/Salebizsvg.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Salebiz",
    title: "Salebiz | Businesses for Sale in Australia",
    description:
      "Australia's trusted marketplace for buying and selling businesses. Browse thousands of verified listings from licensed brokers.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Salebiz | Businesses for Sale in Australia",
    description:
      "Australia's trusted marketplace for buying and selling businesses.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
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
