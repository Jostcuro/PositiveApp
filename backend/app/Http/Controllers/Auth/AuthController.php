<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate the user and start a session.
     *
     * Returns a single generic 422 for invalid credentials or deactivated
     * accounts to avoid revealing whether an account exists.
     */
    public function login(Request $request): UserResource|JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $attempted = Auth::guard('web')->attempt($credentials);

        /** @var User|null $user */
        $user = Auth::guard('web')->user();

        if (! $attempted || $user === null || ! $user->isActive()) {
            if ($attempted) {
                Auth::guard('web')->logout();
            }

            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        session()->regenerate();

        return new UserResource($user);
    }

    /**
     * Return the authenticated user's public profile.
     */
    public function me(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new UserResource($user);
    }

    /**
     * Invalidate the session and the CSRF token.
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        session()->invalidate();
        session()->regenerateToken();

        return response()->json(null, JsonResponse::HTTP_NO_CONTENT);
    }
}
