import { getSafeRedirectUrl } from "@/utils/auth";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectUrl = getSafeRedirectUrl(
    requestUrl.searchParams.get("redirect_to"),
    origin
  );

  const errorUrl = new URL("/log-in", origin);
  errorUrl.searchParams.set("error", "Authentication failed. Please try again.");

  if (!code) {
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Error exchanging code for session:", error);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(redirectUrl);
}
