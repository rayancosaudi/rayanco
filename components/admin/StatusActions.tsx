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
import { btnDanger, btnOutline, btnPrimary } from "./styles";

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

  const tones = { primary: btnPrimary, neutral: btnOutline, danger: btnDanger };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={isPending}
            onClick={() => run(a)}
            className={`${tones[a.tone]} w-full`}
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
            className={`h-11 w-full rounded-lg px-5 text-sm font-bold disabled:opacity-50 ${
              confirmDelete ? "bg-red-700 text-white" : "text-red-700 hover:bg-red-50"
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
