import { Token } from "@/components/token";
import { TokenTutorial } from "@/components/token-tutorial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/server";
import { HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Database token",
  alternates: { canonical: "/authenticated/token" },
};
export default async function TokenManager() {
  const supabase = await createClient();

  const { error: upsertError } = await supabase.from("tokens").upsert(
    {},
    {
      onConflict: "user_id",
      ignoreDuplicates: false,
    }
  );
  if (upsertError) {
    console.warn("Error upserting token:", upsertError);
  }

  const { data: tokenData, error: selectError } = await supabase
    .from("tokens")
    .select("token")
    .single();

  if (selectError || !tokenData) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-8 sm:py-16">
        <Card className="w-full shadow-lg border-primary/30 border-2 bg-background">
          <CardHeader className="flex flex-col items-center">
            <HelpCircle className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-primary text-xl mb-2">
              No token found
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-muted-foreground mb-2">
              No token was found for your account.
              <br />
              Please contact support on our Discord to have one generated for
              you.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="w-full font-bold"
              nativeButton={false}
              render={
                <a
                  href="https://discord.gg/2ySkAuX"
                  target="_blank"
                  rel="noopener"
                />
              }
            >
              Join the Discord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3">
      <h1 className="text-lg font-bold">Your database token</h1>
      <p className="text-sm text-center">
        Your token is used to upload your market data. Keep it secret! Anyone
        with this token can upload data to your private database.
      </p>
      <Token token={tokenData.token} />
      <p className="leading-7 text-center">
        To get started using your token launch the albion data client by doing
        the following:
      </p>
      <TokenTutorial token={tokenData.token} />
    </div>
  );
}
