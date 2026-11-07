import Link from "next/link";

import { StatusBadge } from "@/components/StatusBadge";
import { getBookings, getMeta } from "@/lib/api";
import { listHref, parseListFilters } from "@/lib/bookings-query";
import { bayLabel, formatAuditTimestamp, formatSlot } from "@/lib/format";
import type { Booking, BookingStatus, Option } from "@/lib/types";

export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  const params = await searchParams;
  const meta = await getMeta();

  const { status, page } = parseListFilters(params, meta.statuses);

  const bookings = await getBookings({ status, page });
  const { current_page, last_page, total } = bookings.meta;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Link
          href="/bookings/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New booking
        </Link>
      </div>

      <StatusFilter statuses={meta.statuses} active={status} />

      {bookings.data.length === 0 ? (
        // No pager here: "Page 3 of 2" is noise, and the empty state links
        // back to the first page.
        <EmptyState status={status} beyondLastPage={current_page > last_page} />
      ) : (
        <>
          <BookingsTable bookings={bookings.data} bays={meta.bays} />
          <Pagination
            status={status}
            currentPage={current_page}
            lastPage={last_page}
            total={total}
          />
        </>
      )}
    </main>
  );
}

function Pagination({
  status,
  currentPage,
  lastPage,
  total,
}: {
  status: BookingStatus | undefined;
  currentPage: number;
  lastPage: number;
  total: number;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between text-sm"
    >
      <PageLink
        href={listHref(status, currentPage - 1)}
        disabled={currentPage <= 1}
        rel="prev"
      >
        ← Previous
      </PageLink>
      <span className="text-zinc-600 dark:text-zinc-400">
        Page {currentPage} of {lastPage} · {total}{" "}
        {total === 1 ? "booking" : "bookings"}
      </span>
      <PageLink
        href={listHref(status, currentPage + 1)}
        disabled={currentPage >= lastPage}
        rel="next"
      >
        Next →
      </PageLink>
    </nav>
  );
}

function StatusFilter({
  statuses,
  active,
}: {
  statuses: Option<BookingStatus>[];
  active: BookingStatus | undefined;
}) {
  const options: { value: BookingStatus | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    ...statuses,
  ];

  return (
    <nav aria-label="Filter by status" className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <Link
            key={option.value ?? "all"}
            href={listHref(option.value)}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${
              isActive
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BookingsTable({
  bookings,
  bays,
}: {
  bookings: Booking[];
  bays: Option[];
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Customer</th>
            <th scope="col" className="px-3 py-2 font-medium">Rego</th>
            <th scope="col" className="px-3 py-2 font-medium">Bay</th>
            <th scope="col" className="px-3 py-2 font-medium">Slot</th>
            <th scope="col" className="px-3 py-2 font-medium">Status</th>
            <th scope="col" className="px-3 py-2 font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {bookings.map((booking) => (
            <tr key={booking.id}>
              <td className="px-3 py-2">
                <Link
                  href={`/bookings/${booking.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {booking.customer_name}
                </Link>
                <div className="text-zinc-600 dark:text-zinc-400">
                  {booking.customer_email}
                </div>
              </td>
              <td className="px-3 py-2 font-mono">{booking.rego}</td>
              <td className="px-3 py-2">
                {bayLabel(bays, booking.service_bay)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatSlot(booking.starts_at, booking.ends_at)}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={booking.status} />
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                {formatAuditTimestamp(booking.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  status,
  beyondLastPage,
}: {
  status: BookingStatus | undefined;
  beyondLastPage: boolean;
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <p className="font-medium">
        {beyondLastPage
          ? "This page is past the end of the list."
          : status
            ? `No ${status} bookings.`
            : "No bookings yet."}
      </p>
      {(beyondLastPage || status) && (
        <Link
          href={listHref(beyondLastPage ? status : undefined)}
          className="mt-2 inline-block text-sm underline"
        >
          {beyondLastPage ? "Go to the first page" : "Show all bookings"}
        </Link>
      )}
    </div>
  );
}

function PageLink({
  href,
  disabled,
  rel,
  children,
}: {
  href: string;
  disabled: boolean;
  rel: "prev" | "next";
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="px-3 py-1 text-zinc-400 dark:text-zinc-600">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      rel={rel}
      className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {children}
    </Link>
  );
}
