import type { CSSProperties } from "react";

const paths={
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  repo: "M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M7 7h8 M7 11h6 M3 17h16",
  health: "M2 12h5l3-7 4 14 3-7h5",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  branch: "M6 8v8 M18 8v3a5 5 0 0 1-5 5h-4 M9 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M21 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M9 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  arrow: "m9 5 7 7-7 7",
  external: "M14 3h7v7 M21 3 10 14 M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  sync: "M20 7a9 9 0 0 0-15-2L2 8 M2 2v6h6 M4 17a9 9 0 0 0 15 2l3-3 M22 22v-6h-6",
  code: "m8 5-7 7 7 7 M16 5l7 7-7 7 M14 3l-4 18",
  issue: "M12 7v6 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  board: "M3 3h7v7H3z M14 14h7v7h-7z M7 10v7h7 M10 7h7v7",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  close: "m6 6 12 12 M6 18 18 6",
} as const;
export type WorkspaceIconName=keyof typeof paths;
export default function WorkspaceIcon({ name,size=20,style }: { name: WorkspaceIconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]} /></svg>;
}
