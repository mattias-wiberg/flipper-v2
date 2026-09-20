import { AuthenticatedShell } from "@/components/authenticated-shell";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: {
    default: "Dashboard | Flipper",
    template: "%s | Flipper",
  },
  robots: { index: false, follow: false },
};

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
    <AuthenticatedShell nickname={user.user_metadata.nickname}>
      {children}
    </AuthenticatedShell>
  );
}
