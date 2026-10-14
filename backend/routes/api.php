<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — v1
|--------------------------------------------------------------------------
|
| Contratos de la API bajo /api/v1. Autenticación SPA por sesión y cookies
| (Laravel Sanctum). /sanctum/csrf-cookie lo expone Sanctum para inicializar
| la protección CSRF del flujo del frontend.
|
*/

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
    });
});
