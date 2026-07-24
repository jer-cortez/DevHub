import type { ReactNode } from "react";
import SignOutButton from "@/components/SignOutButton";

const NAV_ITEMS = [
  { label: "Repositories", href: "/dashboard", enabled: true },
  { label: "Pull Requests", href: "#", enabled: false },
  { label: "Reviews", href: "#", enabled: false },
  { label: "Notifications", href: "#", enabled: false },
];

export default function DashboardShell({
  username,
  avatarUrl,
  children,
}: {
  username: string;
  avatarUrl?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <span className="font-semibold">GitHub Extension</span>
        <div className="flex items-center gap-3">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={username}
              className="h-7 w-7 rounded-full"
            />
          )}
          <span className="text-sm">{username}</span>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="w-56 shrink-0 border-r border-neutral-200 dark:border-neutral-800 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={
                item.enabled
                  ? "rounded-md px-3 py-2 text-sm font-medium bg-neutral-100 dark:bg-neutral-800"
                  : "rounded-md px-3 py-2 text-sm text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
              }
              title={item.enabled ? undefined : "Coming soon"}
            >
              {item.label}
            </div>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
