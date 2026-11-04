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
            $config = self::localConfig();
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

    public static function connectForApiTests(): PDO
    {
        $config = self::localConfig();
        $settings = $config['test_database'] ?? null;
        $applicationName = $config['database']['name'] ?? null;
        $testName = $settings['name'] ?? null;
        if (!is_array($settings) || ($settings['host'] ?? null) !== '127.0.0.1'
            || !is_string($applicationName) || !preg_match('/\A[a-zA-Z0-9_]+\z/', $applicationName)
            || !is_string($testName) || !str_ends_with($testName, '_test')
            || strcasecmp($applicationName, $testName) === 0) {
            throw new RuntimeException('API tests require a separate loopback database ending in _test.');
        }

        $pdo = self::connect($settings);
        if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== $testName) {
            throw new RuntimeException('API test database could not be verified.');
        }
        return $pdo;
    }

    private static function localConfig(): array
    {
        $path = __DIR__ . '/local.php';
        if (!is_file($path)) {
            throw new RuntimeException('Copy config.example.php to local.php and configure MySQL.');
        }
        return require $path;
    }
}
