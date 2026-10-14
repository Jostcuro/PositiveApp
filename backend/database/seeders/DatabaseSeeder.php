<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Solo crea cuentas de desarrollo cuando se ejecuta en local y las
     * contraseñas se inyectan por variables de entorno; nunca se seedean
     * contraseñas fijas ni se exponen credenciales en el repositorio.
     */
    public function run(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        $this->createDevUser('admin', 'admin@positive.local', 'DEV_SEED_ADMIN_PASSWORD', 'Administrador');
        $this->createDevUser('agent', 'agent@positive.local', 'DEV_SEED_AGENT_PASSWORD', 'Agente');
    }

    private function createDevUser(string $role, string $email, string $envKey, string $name): void
    {
        $password = env($envKey);

        if (! is_string($password) || $password === '') {
            $this->command?->warn("Seed de usuario {$role} omitido: define {$envKey} en el .env local.");

            return;
        }

        User::firstOrCreate(['email' => $email], [
            'name' => $name,
            'password' => Hash::make($password),
            'role' => $role,
            'is_active' => true,
        ]);
    }
}
