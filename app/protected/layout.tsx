import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/log-in");
  }

  return (
    <div className="flex min-h-screen flex-col items-center">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
}
