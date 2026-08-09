"use client";

import { useState } from "react";
import useSWR from "swr";
import { ExpertiseAPI, suggestionOptInKey } from "@/API/ExpertiseAPI";

/**
 * Personal opt-out from automated reviewer suggestions. Lives next to the
 * repo-follow controls because both answer the same question — how much of
 * the org's activity should reach you.
 *
 * Defaults to on, but being surfaced as "the auth expert" across every repo
 * in the org is exactly the sort of thing people want a say in, so it's one
 * click to leave.
 */
export default function ReviewSuggestionsToggle() {
  const { data, mutate } = useSWR(suggestionOptInKey, () => ExpertiseAPI.getOptIn());
  const [busy, setBusy] = useState(false);

  const allow = data?.allow_review_suggestions ?? true;

  const handleToggle = async () => {
    setBusy(true);
    try {
      // Optimistic: the checkbox should respond immediately, and a failed
      // write reverts on revalidate.
      await mutate(ExpertiseAPI.setOptIn(!allow).then(() => ({ allow_review_suggestions: !allow })), {
        optimisticData: { allow_review_suggestions: !allow },
        rollbackOnError: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allow}
          onChange={handleToggle}
          disabled={busy || !data}
          className="mt-0.5"
        />
        <span>
          <span className="text-sm font-medium">Allow automated PR review suggestions</span>
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
            Lets the platform suggest you as a reviewer on pull requests that touch code like the
            code you&apos;ve worked on, including in repositories you&apos;re not on. Turning this
            off removes you from suggestions everywhere; it doesn&apos;t affect review requests
            people send you directly.
          </span>
        </span>
      </label>
    </div>
  );
}
