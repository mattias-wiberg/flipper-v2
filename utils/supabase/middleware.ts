import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const copySessionResponse = (source: NextResponse, target: NextResponse) => {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) {
      target.headers.set(header, value);
    }
  }
};

export const updateSession = async (request: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value)
            );
          },
        },
      }
    );

    // Verify the cookie and refresh an expiring session before rendering.
    const { data, error } = await supabase.auth.getClaims();
    const isAuthenticated = !error && Boolean(data?.claims);

    if (
      request.nextUrl.pathname.startsWith("/authenticated") &&
      !isAuthenticated
    ) {
      const redirectResponse = NextResponse.redirect(
        new URL("/log-in", request.url)
      );
      copySessionResponse(response, redirectResponse);
      return redirectResponse;
    }

    if (
      (request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname === "/sign-up" ||
        request.nextUrl.pathname === "/log-in") &&
      isAuthenticated
    ) {
      const redirectResponse = NextResponse.redirect(
        new URL("/authenticated/deals", request.url)
      );
      copySessionResponse(response, redirectResponse);
      return redirectResponse;
    }

    return response;
  } catch {
    if (request.nextUrl.pathname.startsWith("/authenticated")) {
      return NextResponse.redirect(new URL("/log-in", request.url));
    }

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
