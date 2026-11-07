/** Mirrors App\Http\Resources\BookingResource. */
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Booking {
  id: number;
  customer_name: string;
  customer_email: string;
  rego: string;
  service_bay: string;
  /** Workshop wall-clock time, `YYYY-MM-DDTHH:mm`, no offset. Display as is. */
  starts_at: string;
  /** Workshop wall-clock time, `YYYY-MM-DDTHH:mm`, no offset. Display as is. */
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  /** Audit timestamp, UTC ISO-8601 (`…Z`). */
  created_at: string | null;
  /** Audit timestamp, UTC ISO-8601 (`…Z`). */
  updated_at: string | null;
}

/** Laravel's paginated resource collection (`data`, `links`, `meta`). */
export interface Paginated<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** `GET /api/meta`: dropdown and filter options. */
export interface Meta {
  bays: Option[];
  statuses: Option<BookingStatus>[];
}

/** Laravel 422 body. */
export interface ValidationErrors {
  message: string;
  errors: Record<string, string[]>;
}
