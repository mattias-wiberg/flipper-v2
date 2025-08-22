import { ThemeSwitcher } from "@/components/theme-switcher";
import { SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Heart } from "lucide-react";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Prefer the custom domain for stable canonical/OG URLs, fall back to Vercel preview/local.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

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
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              <SidebarInset>
                <div className="flex-1 w-full flex flex-col gap-20 items-center">
                  <div className="flex flex-col gap-20 w-full max-w-7xl p-5">
                    {children}
                  </div>
                </div>

                <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-4">
                  <ThemeSwitcher />
                  <p>
                    &copy; {new Date().getFullYear()} Flipper. Open source on{" "}
                    <a
                      href="https://github.com/mattias-wiberg/flipper-v2"
                      className="underline"
                    >
                      GitHub
                    </a>
                    . Made with{" "}
                    <Heart className="inline h-4 w-4 text-red-500" /> by{" "}
                    <a
                      href="https://www.linkedin.com/in/mattiaswiberg/"
                      className="underline"
                    >
                      Mattias Wiberg
                    </a>
                  </p>
                </footer>
              </SidebarInset>
              <Toaster />
              <SpeedInsights />
              <Analytics />
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
