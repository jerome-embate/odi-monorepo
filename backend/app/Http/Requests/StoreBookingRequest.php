<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use DateTimeImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shape validation only. The business rule (no overlapping bookings in a bay)
 * lives in BookingService, inside the write transaction.
 */
class StoreBookingRequest extends FormRequest
{
    /**
     * Workshop wall-clock time, exactly what <input type="datetime-local"> sends.
     * Stricter than the "date" rule on purpose: an offset like "Z" would be parsed
     * as another timezone and silently shift the stored wall-clock time.
     */
    private const DATETIME_LOCAL = 'Y-m-d\TH:i';

    public function authorize(): bool
    {
        return true; // no auth in scope (see SPEC)
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('rego'))) {
            $this->merge(['rego' => strtoupper(trim($this->input('rego')))]);
        }
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_email' => ['required', 'string', 'email', 'max:255'],
            'rego' => ['required', 'string', 'max:20'],
            'service_bay' => ['required', 'string', Rule::in(config('bookings.bays'))],
            'starts_at' => ['required', 'date_format:'.self::DATETIME_LOCAL],
            // Only compare against a well-formed start, so a bad start is reported once
            // (under starts_at) rather than also as a misleading ends_at error.
            'ends_at' => [
                'required',
                'date_format:'.self::DATETIME_LOCAL,
                Rule::when($this->hasValidStart(), 'after:starts_at'),
            ],
            // Optional on create: the model and column default to pending. If it's
            // sent it must be a real status (null included: "sometimes" then "required").
            'status' => ['sometimes', 'required', Rule::enum(BookingStatus::class)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    private function hasValidStart(): bool
    {
        $start = $this->input('starts_at');

        return is_string($start)
            && DateTimeImmutable::createFromFormat('!'.self::DATETIME_LOCAL, $start) !== false
            && DateTimeImmutable::getLastErrors() === false;
    }
}
