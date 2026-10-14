<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects authenticated requests whose account has been deactivated after the
 * session was created (AUTH-AUDIT-008).
 *
 * Login already blocks deactivated accounts, but a session started while the
 * account was active would otherwise keep working until it expires. When the
 * user is no longer active the session is invalidated and the request is
 * answered with 401, mirroring an unauthenticated request.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->isActive()) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'Unauthenticated.'], Response::HTTP_UNAUTHORIZED);
        }

        return $next($request);
    }
}
