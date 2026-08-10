import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GitHub redirects here with a one-time `code` after the user approves OAuth login.
 * Every time this fires (every login, not just the first one), the code is exchanged
 * for a Supabase session, then /api/auth/login is called to upsert the user's row in
 * our own database so it stays in sync with their latest GitHub profile.
 * @param request
 * - GitHub's OAuth redirect, carrying the `code` query param
 * @returns
 * - Redirects to /dashboard on success, or / if there's no code or the exchange fails
 */
// Base for building the outgoing redirect target. `request.url` looks like
// the obvious choice, but behind nginx it resolved to this Next process's
// own bind address (http://localhost:3000) instead of the public domain —
// sending the browser to a host it can't reach. NEXT_PUBLIC_API_URL is the
// one place the real deployed origin is already configured (client and API
// share one origin behind the reverse proxy), so redirects are anchored to
// that instead of anything derived from the incoming request. Falls back to
// request.url so local dev (no NEXT_PUBLIC_API_URL surprises) still works.
function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_API_URL || request.url;
}

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/', siteOrigin(request)));
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.exchangeCodeForSession(code);

  if (!data.session) {
    return NextResponse.redirect(new URL('/', siteOrigin(request)));
  }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
  } catch (err) {
    console.error('Failed to sync user with backend:', err);
  }

  return NextResponse.redirect(new URL('/dashboard', siteOrigin(request)));
}