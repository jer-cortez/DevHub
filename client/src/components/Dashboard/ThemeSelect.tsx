"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "devhub-theme";
const CHANGE_EVENT = "devhub-theme-change";
type Theme = "system" | "light" | "dark";
let sessionPreference: Theme | undefined;

function getPreference(): Theme {
  if (sessionPreference) return sessionPreference;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
  return "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export default function ThemeSelect() {
  const preference = useSyncExternalStore(subscribe, getPreference, () => "system" as const);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = preference === "system"
        ? media.matches ? "dark" : "light"
        : preference;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  function changeTheme(value: Theme) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      sessionPreference = undefined;
    } catch {
      sessionPreference = value;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <label className="ws-theme-control">
      <span className="sr-only">Color theme</span>
      <select value={preference} onChange={event => changeTheme(event.target.value as Theme)}>
        <option value="system">System theme</option>
        <option value="light">Light mode</option>
        <option value="dark">Dark mode</option>
      </select>
    </label>
  );
}
