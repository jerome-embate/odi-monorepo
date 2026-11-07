<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use Illuminate\Validation\Rule;

/**
 * PUT is a full replacement (the edit form always sends every field), so the
 * rules are create's, except that status is required: changing it is how a
 * booking gets cancelled, and there's no default to fall back on.
 */
class UpdateBookingRequest extends StoreBookingRequest
{
    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'status' => ['required', Rule::enum(BookingStatus::class)],
        ];
    }
}
