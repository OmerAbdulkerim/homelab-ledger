<?php
declare(strict_types=1);

namespace HomelabLedger\Config;

use InvalidArgumentException;
use PDO;
use RuntimeException;

final class Database
{
    /** Pass settings explicitly for tests; otherwise read the ignored local config. */
    public static function connect(?array $settings = null): PDO
    {
        if ($settings === null) {
            $path = __DIR__ . '/local.php';
            if (!is_file($path)) {
                throw new RuntimeException('Copy config.example.php to local.php and configure MySQL.');
            }
            $config = require $path;
            $settings = $config['database'] ?? [];
        }

        $host = $settings['host'] ?? '';
        $port = $settings['port'] ?? 3306;
        $name = $settings['name'] ?? '';
        // DSN identifiers cannot be bound as query parameters.
        if (!is_string($host) || !preg_match('/\A[a-zA-Z0-9.:-]+\z/', $host)
            || !is_int($port) || $port < 1 || $port > 65535
            || !is_string($name) || !preg_match('/\A[a-zA-Z0-9_]+\z/', $name)
            || !isset($settings['username']) || !is_string($settings['username'])
            || !isset($settings['password']) || !is_string($settings['password'])) {
            throw new InvalidArgumentException('Invalid database configuration.');
        }

        $pdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $settings['username'],
            $settings['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ],
        );
        $pdo->exec("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec("SET SESSION time_zone = '+00:00'");
        return $pdo;
    }
}
