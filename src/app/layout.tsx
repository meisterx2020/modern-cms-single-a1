import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Modern CMS",
  description: "A modern, flexible content management system built with Next.js, TypeScript, and modern web technologies.",
  keywords: ["CMS", "Content Management", "Next.js", "TypeScript", "MDX"],
  authors: [{ name: "Modern CMS Team" }],
  openGraph: {
    title: "Modern CMS",
    description: "A modern, flexible content management system",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modern CMS",
    description: "A modern, flexible content management system",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors`}
      >
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
