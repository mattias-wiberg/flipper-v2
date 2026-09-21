import { ThemeSwitcher } from "@/components/theme-switcher";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { getSiteUrl } from "@/lib/site-url";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const SITE_URL = getSiteUrl();

const SITE_NAME = "Flipper";
const SITE_TITLE =
  "Albion Online Black Market Flipping Tool | Real-Time Profitable Trades & Data";
const SITE_DESCRIPTION =
  "Find the most profitable Albion Online Black Market flips instantly. Real-time data, private database, and seamless integration for serious traders.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: [
    "Albion Online",
    "Black Market",
    "flipping",
    "trading",
    "profit calculator",
    "market data",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: new URL("/opengraph-image", SITE_URL).toString(),
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [new URL("/opengraph-image", SITE_URL).toString()],
    creator: "@mattiaswiberg",
  },
  authors: [{ name: "Mattias Wiberg", url: "https://mattiaswiberg.com" }],
  creator: "Mattias Wiberg",
  publisher: "Mattias Wiberg",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "WNOS3zUs2euwVuDCpl7GcgzdR3b-JOxlmG9So0FJpOE",
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "business",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <div className="flex min-h-svh w-full flex-col">
                <div className="flex min-w-0 flex-1 flex-col">{children}</div>

                <footer className="flex w-full flex-col items-center justify-center gap-3 border-t px-4 py-4 text-center text-xs sm:flex-row sm:gap-8">
                  <ThemeSwitcher />
                  <p>
                    &copy; {new Date().getFullYear()} Flipper. Open source on{" "}
                    <a
                      href="https://github.com/mattias-wiberg/flipper-v2"
                      className="underline underline-offset-4"
                    >
                      GitHub
                    </a>
                    . Made with <Heart className="inline size-4 text-red-500" />{" "}
                    by{" "}
                    <a
                      href="https://www.linkedin.com/in/mattiaswiberg/"
                      className="underline underline-offset-4"
                    >
                      Mattias Wiberg
                    </a>
                  </p>
                </footer>
              </div>
              <Toaster />
              {/* JSON-LD structured data for a web app/software application */}
              <Script
                id="ld-software-application"
                type="application/ld+json"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    name: SITE_NAME,
                    applicationCategory: "BusinessApplication",
                    operatingSystem: "Web",
                    url: SITE_URL,
                    description: SITE_DESCRIPTION,
                    offers: {
                      "@type": "Offer",
                      price: "0",
                      priceCurrency: "USD",
                    },
                    creator: {
                      "@type": "Person",
                      name: "Mattias Wiberg",
                      url: "https://mattiaswiberg.com",
                    },
                  }),
                }}
              />
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
