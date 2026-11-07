"use client";

import { useFormStatus } from "react-dom";

/**
 * A one-button form for a server action bound to the booking id. The
 * browser's confirm() is the guard; declining cancels the submit.
 */
export function DeleteBookingButton({
  action,
  label,
}: {
  action: () => Promise<void>;
  /** Shown in the prompt, e.g. "ABC123 (Ada Lovelace)". */
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete booking ${label}? This can't be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
