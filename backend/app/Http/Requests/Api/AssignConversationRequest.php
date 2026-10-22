<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignConversationRequest extends FormRequest
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
            'user' => [
                'required',
                'string',
                'size:26',
                Rule::exists('users', 'public_id'),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user.required' => 'Debes indicar el usuario a asignar.',
            'user.string' => 'El usuario indicado no es válido.',
            'user.size' => 'El usuario indicado no es válido.',
            'user.exists' => 'El usuario indicado no existe.',
        ];
    }
}
