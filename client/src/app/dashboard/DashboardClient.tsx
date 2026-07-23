"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function DashboardClient() {
  const [result, setResult] = useState<string>("Loading...");

  useEffect(() => {
    apiFetch("/api/users/all")
      .then(async (res) => setResult(`${res.status}: ${JSON.stringify(await res.json())}`))
      .catch((err) => setResult(`Error: ${err.message}`));
  }, []);

  return <pre>{result}</pre>;
}
