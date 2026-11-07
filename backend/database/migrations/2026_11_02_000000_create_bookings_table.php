<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('rego', 20);
            $table->string('service_bay');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status')->default(BookingStatus::Pending->value);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Serves the overlap check: same bay, intersecting time range.
            $table->index(['service_bay', 'starts_at', 'ends_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
