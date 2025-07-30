import { ThemeSwitcher } from "@/components/theme-switcher";
import { SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Heart } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Albion Online Black Market Flipping Tool | Real-Time Profitable Trades & Data",
  description:
    "Find the most profitable Albion Online Black Market flips instantly. Real-time data, private database, and seamless integration for serious traders.",
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
                    <SpeedInsights />
                    <Analytics />
                  </div>
                </div>

                {/* Footer */}
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
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
