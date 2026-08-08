export function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="shrink-0 fill-[#54aeff]">
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      className="shrink-0 fill-none stroke-neutral-400 dark:stroke-neutral-500"
      strokeWidth="1.2"
    >
      <path d="M3 1.5h6.5L13 5v9a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 3 14V2a.5.5 0 0 1 0-.5Z" />
      <path d="M9.5 1.5V5H13" />
    </svg>
  );
}

export function BranchIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current text-neutral-500 dark:text-neutral-400">
      <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.492 2.492 0 0 1 6 7h4a1 1 0 0 0 1-1v-.128A2.25 2.25 0 0 1 9.5 3.25ZM4.25 4a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 8.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" className="fill-current text-neutral-400 dark:text-neutral-600">
      <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      className={`fill-current text-neutral-400 dark:text-neutral-600 transition-transform ${className}`}
    >
      <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function PanelIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v8.5C0 13.216.784 14 1.75 14h12.5A1.75 1.75 0 0 0 16 12.25v-8.5A1.75 1.75 0 0 0 14.25 2H1.75ZM1.5 3.75a.25.25 0 0 1 .25-.25H6v9H1.75a.25.25 0 0 1-.25-.25v-8.5ZM7.5 12.5v-9h6.75a.25.25 0 0 1 .25.25v8.5a.25.25 0 0 1-.25.25H7.5Z" />
    </svg>
  );
}
