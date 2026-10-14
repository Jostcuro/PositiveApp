<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Lista de orígenes permitidos para la API. En desarrollo el frontend usa
    | el proxy de Vite (mismo origen), por lo que el CORS prácticamente no se
    | ejercita; se mantiene esta configuración como línea base segura y para
    | despliegues sin proxy. Nunca se admite el comodín "*" junto con credenciales.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173',
    ))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-CSRF-TOKEN', 'X-XSRF-TOKEN', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
