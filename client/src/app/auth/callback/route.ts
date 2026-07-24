import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.session) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
      } catch (err) {
        console.error('Failed to sync user with backend:', err);
      }
    }
  }
  return NextResponse.redirect(new URL('/dashboard', request.url));
}