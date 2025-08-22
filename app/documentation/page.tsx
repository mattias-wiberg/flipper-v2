import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  ArrowRightLeft,
  Info,
  Lightbulb,
  MapPin,
  Settings,
  Table2,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentation | Flipper — How to use the Albion Black Market tool",
  description:
    "Step-by-step guide to using Flipper with the Albion Data Client to find profitable Black Market flips.",
  alternates: { canonical: "/documentation" },
};

const steps = [
  {
    title: "Start the Data Client",
    icon: <Terminal className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Make sure you run the Albion Data Client by opening a command prompt and
        pasting
        <span className="block my-2">
          <code className="text-primary bg-muted px-2 py-1 rounded">
            "C:\Program Files\Albion Data Client\albiondata-client.exe" -i
            "nats://albionflipper.com:4222"
          </code>
        </span>
        and that it is running in the background.
      </>
    ),
  },
  {
    title: "Update Your Location",
    icon: <MapPin className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Login to Albion Online and update the location of your character by
        switching locations (e.g. go out of the bank and then back into the
        bank). Example of how the Data Client should respond.
      </>
    ),
  },
  {
    title: "Select Market Filters",
    icon: <Settings className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Go to whatever market you want to flip from and select the{" "}
        <strong>Category</strong>, <strong>Tier</strong>,{" "}
        <strong>Enchantment</strong> and <strong>Quality</strong> of the items
        you want to flip. An efficient way of updating many items is to, for
        example, choose <strong>Tier 8</strong> and category:{" "}
        <strong>Accessories</strong>.
      </>
    ),
  },
  {
    title: "Page Through Items",
    icon: <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Keep pressing the next page arrow (marked with a red box in the image
        below) until you either hit page 20 or there are no more pages with
        items left. In the image below we hit the maximum page 20 meaning that
        there are still more items we can update.
      </>
    ),
  },
  {
    title: "Sort by Price",
    icon: <Table2 className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Click the <strong>Price</strong> column (marked with a red box in the
        image below) to sort the items in the opposite order (if previously they
        were sorted in ascending order, now they will be sorted in descending
        order). In our example the items are now in descending order (by price),
        meaning that they get cheaper as we go.
      </>
    ),
  },
  {
    title: "Repeat for All Categories",
    icon: <Table2 className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Repeat <strong>Step 4</strong>. Here you can stop once you reach the
        same prices as on the last page 20 in <strong>Step 4</strong>. In the
        image below we can see that the prices on page 10 are descending from{" "}
        <strong>1&nbsp;289&nbsp;999</strong>. This means that the range of
        prices we updated is <strong>79&nbsp;995 – 1&nbsp;332&nbsp;999</strong>{" "}
        (price of the first and last item in <strong>Step 3</strong> and{" "}
        <strong>4</strong> respectively) and{" "}
        <strong>30&nbsp;000&nbsp;000 – 1&nbsp;279 998</strong> (price of the
        first and last item in <strong>Step 5</strong> and <strong>6</strong>{" "}
        respectively). In other words, we have updated all the{" "}
        <strong>Tier 8 Accessories</strong> in the{" "}
        <strong>Fort Sterling</strong> market. Now repeat{" "}
        <strong>steps 3 – 6</strong> for <strong>Armor</strong>,{" "}
        <strong>Magic</strong>, <strong>Melee</strong>,{" "}
        <strong>Off-Hand</strong>, <strong>Ranged</strong> and{" "}
        <strong>Tool</strong> categories.
      </>
    ),
    extra: (
      <Alert className="mt-4">
        <Lightbulb className="w-4 h-4 mr-2" />
        <AlertDescription>
          While you are updating the items make sure the Albion Data Client is
          sending the updates (see the image below for how it looks when the
          items are being updated). If you are getting errors, try updating your
          location (leave and enter the market for example).
        </AlertDescription>
      </Alert>
    ),
  },
  {
    title: "Update Black Market",
    icon: <MapPin className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Fast travel to the <strong>Black Market</strong> and update the same
        items as you did in the previous market (repeat{" "}
        <strong>steps 3 – 6</strong>).
      </>
    ),
    extra: (
      <Alert className="mt-4">
        <Lightbulb className="w-4 h-4 mr-2" />
        <AlertDescription>
          Hint: have one of your characters be in the Black Market so you can
          quickly switch characters and update the Black Market without fast
          travel!
        </AlertDescription>
      </Alert>
    ),
  },
  {
    title: "Set Flipper Parameters",
    icon: <Settings className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Choose the appropriate parameters in Flipper and click the “Find Flips!”
        button. Make sure the <strong>Max BM Age</strong> and{" "}
        <strong>Max City Age</strong> are as low as possible. The API has no way
        of knowing when an item has been sold, so if you choose a too large age
        there is a chance the buy order has already been filled.
      </>
    ),
  },
  {
    title: "Sort and Execute Trades",
    icon: <Table2 className="w-5 h-5 text-muted-foreground" />,
    content: (
      <>
        Sort the table by profits by clicking the{" "}
        <strong>Profit (with tax)</strong> column title (marked with red box)
        and execute the top trades. If there are a lot of different entries feel
        free to add the ones you want to execute into the cart by pressing the
        plus button in the cart column (marked with red box).
      </>
    ),
    extra: (
      <Alert className="mt-4">
        <Lightbulb className="w-4 h-4 mr-2" />
        <AlertDescription>
          Hint: you can click on any cell in the table to copy its content. You
          can then, for example, paste the name of the item in the market search
          to find it and buy it faster!
        </AlertDescription>
      </Alert>
    ),
  },
];

const Documentation = () => {
  return (
    <section className="container max-w-3xl mx-auto py-10">
      <Alert variant="destructive" className="mb-8">
        <AlertDescription>
          <strong>Warning:</strong> This documentation is outdated and needs to
          be rewritten.
        </AlertDescription>
      </Alert>
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-3">
          <Info className="w-6 h-6 text-muted-foreground" />
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">
            For the best possible results, it is strongly suggested to use the
            Albion Data Client together with this tool. The API has no way of
            telling when an item has been sold, so it is therefore best to
            assume that if either the <strong>BM Age</strong> or{" "}
            <strong>City Age</strong> are high, the buy order has already been
            filled.
          </p>
          <p className="text-muted-foreground">
            As the best results are achieved by using the Albion Data Client,
            this tutorial will explain how to use Flipper in conjunction with
            the Albion Data Client. Start by downloading the data client from:{" "}
            <a
              href="http://www.albion-online-data.com"
              target="_blank"
              className="text-primary underline"
            >
              www.albion-online-data.com
            </a>
          </p>
        </CardContent>
      </Card>
      <Separator className="mb-8" />
      <div className="grid gap-8">
        {steps.map((step, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-3">
              {step.icon}
              <CardTitle>{step.title}</CardTitle>
              <Badge variant="outline" className="ml-auto">
                Step {i + 1}
              </Badge>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {step.content}
              {step.extra}
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-end mb-8">
          <Link href="/authenticated/deals">
            <Button size="lg" className="flex items-center gap-2">
              Get Started
              <ArrowRight />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
export default Documentation;
