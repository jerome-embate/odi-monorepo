"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  BOOKING_FIELDS,
  clampToMin,
  unknownFieldErrors,
  type BookingField,
  type BookingFormState,
} from "@/lib/booking-form";
import type { BookingStatus, Option } from "@/lib/types";

type BookingAction = (
  state: BookingFormState,
  formData: FormData,
) => Promise<BookingFormState>;

interface Props {
  action: BookingAction;
  initialState: BookingFormState;
  bays: Option[];
  /** Omit to hide the status field (create: new bookings are pending). */
  statuses?: Option<BookingStatus>[];
  submitLabel: string;
  cancelHref: string;
  /** Earliest selectable time (workshop wall clock), computed on the server. */
  minStart?: string;
}

const inputClass =
  "mt-1 block w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-500 dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Create/edit form. Laravel is the single source of validation (`noValidate`
 * stops the browser blocking submit first), and its errors render under
 * each field. Inputs are uncontrolled with `defaultValue` from the action
 * state, so values survive a failed submit and the form works without JS.
 */
export function BookingForm({ action, initialState, ...rest }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);

  // Keyed on the attempt: remounting restores the submitted values (React
  // resets a form after its action) and clears the "edited" tracking below.
  return (
    <BookingFormBody
      key={state.attempt}
      state={state}
      formAction={formAction}
      pending={pending}
      {...rest}
    />
  );
}

function BookingFormBody({
  state,
  formAction,
  pending,
  bays,
  statuses,
  submitLabel,
  cancelHref,
  minStart,
}: Omit<Props, "action" | "initialState"> & {
  state: BookingFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const { values } = state;

  // A field's error stays until that field is changed, then it's gone
  // until the next submit says otherwise.
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const [start, setStart] = useState(values.starts_at);

  const errors = Object.fromEntries(
    Object.entries(state.errors).filter(([name]) => !edited.has(name)),
  );

  const shown = statuses
    ? BOOKING_FIELDS
    : BOOKING_FIELDS.filter((name) => name !== "status");
  const firstInvalid = shown.find((name) => state.errors[name]?.length);
  const otherErrors = unknownFieldErrors(errors, shown);
  const hasErrors = Object.keys(errors).length > 0;

  /** Change events from every input bubble up to the form. */
  function handleChange(event: React.FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    if (target instanceof HTMLInputElement && target.type === "datetime-local") {
      // Safety net for anything that bypasses the picker (e.g. autofill).
      target.value = clampToMin(target.value, target.min);
    }
    const { name, value } = target;
    if (!edited.has(name)) setEdited(new Set(edited).add(name));
    if (name === "starts_at") setStart(value);
  }

  /** Props shared by every input: name, id, error wiring, focus. */
  const field = (name: BookingField) => ({
    id: name,
    name,
    defaultValue: values[name],
    "aria-invalid": errors[name]?.length ? true : undefined,
    "aria-describedby": errors[name]?.length ? `${name}-error` : undefined,
    autoFocus: name === firstInvalid,
    className: inputClass,
  });

  return (
    <form
      action={formAction}
      onChange={handleChange}
      noValidate
      aria-busy={pending}
      className="mt-6 space-y-5"
    >
      {hasErrors && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        >
          <p className="font-medium">Please fix the highlighted fields.</p>
          {otherErrors.map((message) => (
            <p key={message} className="mt-1">
              {message}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="customer_name" label="Customer name" errors={errors}>
          <input type="text" autoComplete="name" required {...field("customer_name")} />
        </Field>
        <Field name="customer_email" label="Email" errors={errors}>
          <input type="email" autoComplete="email" required {...field("customer_email")} />
        </Field>
        <Field name="rego" label="Rego" errors={errors}>
          <input
            type="text"
            autoComplete="off"
            maxLength={20}
            required
            {...field("rego")}
            className={`${inputClass} font-mono uppercase`}
          />
        </Field>
        <Field name="service_bay" label="Service bay" errors={errors}>
          <select required {...field("service_bay")}>
            <option value="">Select a bay</option>
            {bays.map((bay) => (
              <option key={bay.value} value={bay.value}>
                {bay.label}
              </option>
            ))}
          </select>
        </Field>
        <Field name="starts_at" label="Start time" errors={errors}>
          <input
            type="datetime-local"
            min={minStart}
            required
            {...field("starts_at")}
            {...pickerOnly}
          />
        </Field>
        <Field name="ends_at" label="End time" errors={errors}>
          <input
            type="datetime-local"
            min={start || minStart}
            required
            {...field("ends_at")}
            {...pickerOnly}
          />
        </Field>
        {statuses && (
          <Field name="status" label="Status" errors={errors}>
            <select required {...field("status")}>
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <Field name="notes" label="Notes (optional)" errors={errors}>
        <textarea rows={4} maxLength={2000} {...field("notes")} />
      </Field>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link href={cancelHref} className="text-sm underline-offset-2 hover:underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}

/**
 * Date/time inputs are picker-only: typing could enter a past time, which
 * the picker greys out. Click, Enter or Space opens the picker, so keyboard
 * users can still choose a time; Tab and browser shortcuts still work.
 */
const pickerOnly = {
  onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab" || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    if (event.key === "Enter" || event.key === " ") openPicker(event.currentTarget);
  },
  onClick(event: React.MouseEvent<HTMLInputElement>) {
    openPicker(event.currentTarget);
  },
};

function openPicker(input: HTMLInputElement) {
  try {
    input.showPicker();
  } catch {
    // Unsupported, or not from a user gesture: the native icon still works.
  }
}

function Field({
  name,
  label,
  errors,
  children,
}: {
  name: BookingField;
  label: string;
  errors: BookingFormState["errors"];
  children: React.ReactNode;
}) {
  const messages = errors[name] ?? [];
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {messages.length > 0 && (
        <div id={`${name}-error`} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </div>
  );
}
