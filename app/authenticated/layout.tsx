import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserNav } from "../../components/user-nav";

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
    <div className="flex flex-col w-full items-center">
      <div className="hidden h-full w-full flex-1 flex-col gap-8 p-8 md:flex">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
              {user.user_metadata.nickname &&
                ", " + user.user_metadata.nickname}
            </h2>
            <p className="text-muted-foreground">
              Thank you for using Flipper!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UserNav />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
