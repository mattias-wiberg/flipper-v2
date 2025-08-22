"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  BarChart2,
  Database,
  Github,
  Link2,
  PlayCircle,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center flex-1 py-24 px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
          Dominate the Albion Black Market
        </h1>
        <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-8 text-muted-foreground">
          Instantly find the most profitable flips in Albion Online. Powered by
          real-time data. Trusted by serious traders.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
          <Link href="/sign-up">
            <Button size="lg" className="font-bold">
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <a
            href="https://www.youtube.com/watch?v=cz4VEmaDG7k&ab_channel=KillAxe22"
            target="_blank"
            rel="noopener"
          >
            <Button variant="outline" size="lg" className="font-bold">
              <PlayCircle className="mr-2 w-5 h-5" /> See it in Action
            </Button>
          </a>
        </div>
      </section>

      <Separator className="my-8" />

      {/* How It Works */}
      <section className="py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          How It Works
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-col items-center">
              <Database className="w-8 h-8 mb-2 text-muted-foreground" />
              <CardTitle className="text-lg">Connect Data Client</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Run the Albion Data Client for real-time market updates.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col items-center">
              <BarChart2 className="w-8 h-8 mb-2 text-muted-foreground" />
              <CardTitle className="text-lg">Scan Markets</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Flipper compares Black Market and city prices instantly.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col items-center">
              <Zap className="w-8 h-8 mb-2 text-muted-foreground" />
              <CardTitle className="text-lg">Find Profitable Trades</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              See which items to buy, where, and your exact profit.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col items-center">
              <Link2 className="w-8 h-8 mb-2 text-muted-foreground" />
              <CardTitle className="text-lg">Execute & Profit</CardTitle>
            </CardHeader>
            <CardContent className="text-center text-muted-foreground">
              Act fast, flip items, and maximize your silver!
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Feature Highlights */}
      <section className="py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Why Flipper?
        </h2>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Database className="w-6 h-6 text-muted-foreground" />
              <CardTitle className="text-lg">Private Database</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Flipper provides your own private data instance, ensuring no one
              can see your found flips.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Zap className="w-6 h-6 text-muted-foreground" />
              <CardTitle className="text-lg">Real-Time Data</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Flipper provides your scanned data in real-time so you never miss
              a profitable opportunity.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <BarChart2 className="w-6 h-6 text-muted-foreground" />
              <CardTitle className="text-lg">
                Enchantment &amp; Quality Upgrades
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Flipper considers potential enchantment and quality upgrades to
              maximize your profits.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Link2 className="w-6 h-6 text-muted-foreground" />
              <CardTitle className="text-lg">Seamless Integration</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Works perfectly with the Albion Data Client for the best results.
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Example Profitable Trades */}
      <section className="py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          See the Profits
        </h2>
        <div className="flex flex-col items-center justify-center gap-8">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Example Trade</CardTitle>
              <CardDescription>
                Buy in Martlock, sell on the Black Market
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Buy Price</TableHead>
                    <TableHead>Sell Price</TableHead>
                    <TableHead>Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>8.2 Elder's Halberd</TableCell>
                    <TableCell>1,200,000</TableCell>
                    <TableCell>1,826,296</TableCell>
                    <TableCell>
                      <Badge variant="outline">626,296</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="mt-4 text-muted-foreground text-sm">
                Flipper finds these trades for you—no spreadsheets, no
                guesswork, just pure profit.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="my-8" />

      {/* Community & Support */}
      <section className="py-16 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Join the Community
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <a href="https://discord.gg/2ySkAuX" target="_blank" rel="noopener">
            <Button
              size="lg"
              variant="secondary"
              className="min-w-[200px] flex items-center justify-center"
            >
              <Users className="mr-2 w-5 h-5" /> Join the Discord
            </Button>
          </a>
          <a
            href="https://github.com/mattias-wiberg/flipper-v2"
            target="_blank"
            rel="noopener"
          >
            <Button
              size="lg"
              variant="ghost"
              className="min-w-[200px] flex items-center justify-center"
            >
              <Github className="mr-2 w-5 h-5" /> GitHub
            </Button>
          </a>
        </div>
        <p className="text-center text-muted-foreground mt-8">
          Need help? Check out our{" "}
          <Link href="/documentation" className="underline">
            documentation
          </Link>{" "}
          or join the Discord.
        </p>
      </section>
      {/* JSON-LD feature list */}
      <Script
        id="ld-features"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Flipper Features",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Private Database" },
              { "@type": "ListItem", position: 2, name: "Real-Time Data" },
              {
                "@type": "ListItem",
                position: 3,
                name: "Enchantment & Quality Upgrades",
              },
              {
                "@type": "ListItem",
                position: 4,
                name: "Seamless Integration",
              },
            ],
          }),
        }}
      />
    </main>
  );
}
