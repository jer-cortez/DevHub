import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/auth/callback'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser(); // refreshes session

  if (!user && !PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    // Same reasoning as auth/callback/route.ts's siteOrigin(): request.url
    // behind nginx resolves to this process's own bind address rather than
    // the public domain, so anchor to NEXT_PUBLIC_API_URL (the one place the
    // real deployed origin is configured) instead.
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_API_URL || request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
