"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmailLoginForm({ denied }: { denied: boolean }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
      setMessage("If this email is eligible, a sign-in link will arrive shortly.");
    } catch { setMessage("Could not start email sign-in. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="w-full space-y-3">
    {denied && <p role="alert" className="text-sm text-red-700 dark:text-red-300">This account is not authorized to join this workspace. Ask an administrator for an invitation.</p>}
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm">Sign in with email<input className="mt-1 w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2.5" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <button disabled={busy} className="w-full rounded-lg bg-[#0074ce] px-4 py-2.5 text-sm font-medium text-white">{busy ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
