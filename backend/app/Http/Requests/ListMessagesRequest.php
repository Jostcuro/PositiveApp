<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Pagination\Cursor;

/**
 * Validates the message history parameters (Tarea 06B).
 *
 * The cursor must be well formed for this endpoint's `id` ordering. Without
 * this check a crafted cursor could either silently restart from the first
 * page or make cursor resolution fail while reading the missing ordering
 * parameter.
 */
class ListMessagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'cursor' => ['sometimes', 'string', $this->validCursorRule()],
        ];
    }

    private function validCursorRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $cursor = is_string($value) ? Cursor::fromEncoded($value) : null;
            $parameters = $cursor?->toArray() ?? [];

            if ($cursor === null || ! array_key_exists('id', $parameters) || ! is_numeric($parameters['id'])) {
                $fail('El cursor proporcionado no es válido.');
            }
        };
    }
}
