"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiRequest } from "@/API/apiClient";
import { DeliveryAPI, workspaceKey, type WorkspaceMe } from "@/API/DeliveryAPI";

type Invitation = { id: string; email_normalized: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string };
const invitationKey = "/api/invitations";
const loadInvitations = () => apiRequest<Invitation[]>(invitationKey);
function status(invitation: Invitation) {
  if (invitation.revoked_at) return "revoked";
  if (invitation.accepted_at) return "accepted";
  if (Date.parse(invitation.expires_at) <= Date.now()) return "expired";
  return "pending";
}

export default function InvitationsPage() {
  const { data: me, error: meError, isLoading: meLoading } = useSWR<WorkspaceMe>(workspaceKey, DeliveryAPI.me);
  const authorized = me?.active === true && me.organizationRole === "admin";
  const { data, error, isLoading, mutate } = useSWR(authorized ? invitationKey : null, loadInvitations);
  const [email, setEmail] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await action(); await mutate(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Invitation action failed."); }
    finally { setBusy(false); }
  }
  if (meLoading) return <p>Checking access…</p>;
  if (meError) return <p role="alert">Could not verify administrator access.</p>;
  if (!authorized) return <p role="alert">Administrator access is required.</p>;
  return <main className="space-y-6">
    <div><h1 className="text-2xl font-semibold">Invitations</h1><p>Creating an invitation authorizes this email address to join; it does not send an email.</p></div>
    <form className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 p-4 dark:border-neutral-800" onSubmit={event => { event.preventDefault(); void run(async () => { await apiRequest(invitationKey, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, expiresAt: new Date(expiresAt).toISOString() }) }); setEmail(""); setExpiresAt(""); }); }}>
      <label className="grid gap-1">Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} className="rounded border bg-transparent p-2" /></label>
      <label className="grid gap-1">Expires at<input required type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="rounded border bg-transparent p-2" /></label>
      <button disabled={busy} className="rounded bg-[var(--ws-blue)] px-3 py-2 text-white">Create invitation</button>
    </form>
    {message && <p role="alert">{message}</p>}{error && <p role="alert">Could not load invitations: {error.message}</p>}{isLoading && <p>Loading invitations…</p>}
    {data && <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr><th>Email</th><th>Status</th><th>Expires</th><th>Created</th><th>Action</th></tr></thead><tbody>{data.map(invitation => <tr key={invitation.id} className="border-t border-neutral-200 dark:border-neutral-800"><td className="py-3">{invitation.email_normalized}</td><td>{status(invitation)}</td><td>{new Date(invitation.expires_at).toLocaleString()}</td><td>{new Date(invitation.created_at).toLocaleString()}</td><td>{(status(invitation) === "pending" || status(invitation) === "expired") && <button disabled={busy} className="underline" onClick={() => void run(() => apiRequest(`${invitationKey}/${encodeURIComponent(invitation.id)}`, { method: "DELETE" }))}>Revoke</button>}</td></tr>)}</tbody></table>{data.length === 0 && <p>No invitations yet.</p>}</div>}
  </main>;
}
