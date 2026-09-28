import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/siteOrigin';

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
export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code');
  const origin = siteOrigin(request);
  if (!code) return NextResponse.redirect(new URL('/?error=admission_denied', origin));

  const supabase = await createClient();
  const { data } = await supabase.auth.exchangeCodeForSession(code);

  if (!data.session) return NextResponse.redirect(new URL('/?error=admission_denied', origin));

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    if (!response.ok) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/?error=admission_denied', origin));
    }
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/?error=admission_denied', origin));
  }

  return NextResponse.redirect(new URL('/dashboard', origin));
}
