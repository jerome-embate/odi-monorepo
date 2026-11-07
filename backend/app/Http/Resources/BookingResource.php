<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Booking */
class BookingResource extends JsonResource
{
    /**
     * Two date formats on purpose:
     * - starts_at/ends_at are workshop wall-clock times ("09:00 at this workshop"), sent
     *   without an offset so they round-trip through HTML datetime-local inputs unchanged.
     * - created_at/updated_at are audit instants, sent as UTC ("...Z"); clients convert
     *   them to a display timezone.
     */
    private const DATETIME_LOCAL = 'Y-m-d\TH:i';

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'customer_name' => $this->customer_name,
            'customer_email' => $this->customer_email,
            'rego' => $this->rego,
            'service_bay' => $this->service_bay,
            'starts_at' => $this->starts_at->format(self::DATETIME_LOCAL),
            'ends_at' => $this->ends_at->format(self::DATETIME_LOCAL),
            'status' => $this->status->value,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->utc()->toIso8601ZuluString(),
            'updated_at' => $this->updated_at?->utc()->toIso8601ZuluString(),
        ];
    }
}
