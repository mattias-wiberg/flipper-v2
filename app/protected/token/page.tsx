import { Token } from "@/components/token";
import { TokenTutorial } from "@/components/token-tutorial";
import { createClient } from "@/utils/supabase/server";
export default async function TokenManager() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tokens")
    .select("token")
    .single();
  if (error || !data) {
    console.error("Error fetching token:", error);
    return <div>Error fetching token</div>;
  }
  const token = data.token;

  return (
    <div className="flex-1 w-full flex flex-col">
      <h1 className="text-lg font-bold mb-4">Your database token</h1>
      <span className="text-sm">
        Your token is used to upload your market data. Keep it secret! Anyone
        with this token can upload data to your private database.
      </span>
      <Token token={token} />
      <p className="leading-7">
        To get started using your token launch the albion data client by doing
        the following:
      </p>
      <TokenTutorial token={token} />
    </div>
  );
}
