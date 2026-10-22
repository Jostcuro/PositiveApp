<?php

use App\Http\Controllers\Api\ConversationAssignmentController;
use App\Http\Controllers\Api\ConversationController;
use App\Http\Controllers\Api\ConversationStatusController;
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

        // Read-only API for conversations and messages (Tarea 06B).
        Route::get('conversations', [ConversationController::class, 'index']);
        Route::get('conversations/{conversation:public_id}', [ConversationController::class, 'show']);
        Route::get('conversations/{conversation:public_id}/messages', [ConversationController::class, 'messages']);

        // Internal write operations for the Inbox (Tarea 09).
        Route::post('conversations/{conversation:public_id}/assignment', [ConversationAssignmentController::class, 'store']);
        Route::delete('conversations/{conversation:public_id}/assignment', [ConversationAssignmentController::class, 'destroy']);
        Route::patch('conversations/{conversation:public_id}/status', [ConversationStatusController::class, 'update']);
    });
});
