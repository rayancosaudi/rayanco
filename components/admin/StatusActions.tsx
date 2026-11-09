"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteListing,
  setListingStatus,
  submitForReview,
  type ActionResult,
} from "@/app/actions/admin-listings";
import type { ListingStatus } from "@/lib/supabase/models";

type Action = { label: string; run: () => Promise<ActionResult>; tone: "primary" | "neutral" | "danger" };

/** One-tap status changes (CLAUDE.md §7). The server re-checks every permission. */
export function StatusActions({
  listingId,
  status,
  isOwner,
  isCreator,
}: {
  listingId: string;
  status: ListingStatus;
  isOwner: boolean;
  isCreator: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const to = (s: ListingStatus) => () => setListingStatus(listingId, s);
  const actions: Action[] = [];

  if (status === "draft" && isCreator && !isOwner) {
    actions.push({ label: "Submit for review", run: () => submitForReview(listingId), tone: "primary" });
  }
  if (isOwner) {
    if (status === "draft" || status === "pending") {
      actions.push({ label: status === "pending" ? "Approve & publish" : "Publish", run: to("available"), tone: "primary" });
      if (status === "pending") actions.push({ label: "Send back to draft", run: to("draft"), tone: "neutral" });
    }
    if (status === "available") {
      actions.push({ label: "Mark reserved", run: to("reserved"), tone: "neutral" });
      actions.push({ label: "Mark sold", run: to("sold"), tone: "primary" });
    }
    if (status === "reserved") {
      actions.push({ label: "Mark sold", run: to("sold"), tone: "primary" });
      actions.push({ label: "Back to available", run: to("available"), tone: "neutral" });
    }
    if (status === "sold") actions.push({ label: "Back to available", run: to("available"), tone: "neutral" });
    if (status === "archived") actions.push({ label: "Restore (available)", run: to("available"), tone: "neutral" });
    if (status !== "archived" && status !== "draft" && status !== "pending") {
      actions.push({ label: "Archive", run: to("archived"), tone: "danger" });
    }
  }

  function run(action: Action) {
    setError(null);
    startTransition(async () => {
      const res = await action.run();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  if (!actions.length && !isOwner) return null;

  const tones = {
    primary: "bg-accent-500 text-white hover:bg-accent-600",
    neutral: "border-[1.5px] border-steel-200 bg-white text-steel-900 hover:bg-steel-50",
    danger: "border-[1.5px] border-red-200 bg-white text-red-700 hover:bg-red-50",
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={isPending}
            onClick={() => run(a)}
            className={`h-11 rounded-full px-5 text-sm font-bold transition-colors disabled:opacity-50 ${tones[a.tone]}`}
          >
            {a.label}
          </button>
        ))}
        {isOwner ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              run({ label: "Delete", run: () => deleteListing(listingId), tone: "danger" });
            }}
            onBlur={() => setConfirmDelete(false)}
            className={`h-11 rounded-full px-5 text-sm font-bold disabled:opacity-50 ${
              confirmDelete ? "bg-red-700 text-white" : "text-red-700 underline"
            }`}
          >
            {confirmDelete ? "Tap again to delete for good" : "Delete"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
