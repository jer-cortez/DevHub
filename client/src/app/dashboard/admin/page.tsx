"use client";
import useSWR from "swr";
import { DeliveryAPI, workspaceKey } from "@/API/DeliveryAPI";
import OverviewContent from "@/components/Dashboard/OverviewContent";
import Link from "next/link";
export default function AdminPage() { const { data: me, error, isLoading } = useSWR(workspaceKey, DeliveryAPI.me); if (isLoading) return <p>Checking access…</p>; if (error) return <p role="alert">{error.message}</p>; if (!me?.active || me.organizationRole !== "admin" || !me.permissions.viewOrganizationOverview) return <p role="alert">You do not have access to the organization overview.</p>; return <div className="space-y-5"><Link href="/dashboard/admin/invitations" className="inline-block underline">Manage invitations</Link><OverviewContent /></div>; }
