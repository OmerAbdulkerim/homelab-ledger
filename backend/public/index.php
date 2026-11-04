<?php
declare(strict_types=1);

use flight\Engine;
use flight\net\Route;
use HomelabLedger\Config\Database;
use HomelabLedger\Service\ApplicationService;
use HomelabLedger\Service\CrudService;
use HomelabLedger\Service\DeploymentService;
use HomelabLedger\Service\MaintenanceTaskService;
use HomelabLedger\Service\ServerService;
use HomelabLedger\Service\UserService;

// M3 API preview is loopback-only until M4 adds authentication.
if (PHP_SAPI !== 'cli-server'
    || realpath($_SERVER['DOCUMENT_ROOT'] ?? '') !== __DIR__
    || ($_SERVER['REMOTE_ADDR'] ?? '') !== '127.0.0.1'
    || !preg_match('/\A127\.0\.0\.1(?::[0-9]+)?\z/', $_SERVER['HTTP_HOST'] ?? '')) {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__, 2);
require $root . '/vendor/autoload.php';

$app = new Engine();
$app->set('flight.allow_method_override', false);
$app->response()->header('Cache-Control', 'no-store')->header('X-Content-Type-Options', 'nosniff');

$testRun = getenv('HOMELAB_API_TEST_RUN', true);
$requestedTestRun = $_SERVER['HTTP_X_HOMELAB_TEST_RUN'] ?? null;
$testConnection = null;
if ($testRun !== false || $requestedTestRun !== null) {
    $runPattern = '/\A[a-f0-9]{32}\z/';
    if ($testRun === false || !preg_match($runPattern, $testRun)
        || $requestedTestRun === null || !preg_match($runPattern, $requestedTestRun)
        || !hash_equals($testRun, $requestedTestRun)) {
        $app->json(['error' => 'API test run not authorized.'], 403);
        $app->response()->send();
        exit;
    }

    try {
        $testConnection = Database::connectForApiTests();
    } catch (Throwable) {
        $app->json(['error' => 'API test database unavailable.'], 503);
        $app->response()->send();
        exit;
    }
    $app->response()->header('X-Homelab-Test-Run', $testRun);
}

$app->map('notFound', fn() => $app->json(['error' => 'Endpoint not found.'], 404));
$app->map('methodNotFound', function (Route $route) use ($app): void {
    $app->response()->header('Allow', implode(', ', $route->methods));
    $app->json(['error' => 'Method not allowed.'], 405);
});
$app->map('error', function (Throwable $error) use ($app): void {
    [$status, $message] = match (true) {
        $error instanceof DomainException => [$error->getCode(), $error->getMessage()],
        $error instanceof PDOException => match ($error->errorInfo[1] ?? null) {
            1062 => [409, 'A record with the same unique fields already exists.'],
            1217, 1451 => [409, 'Remove the related records before deleting this record.'],
            1216, 1452 => [422, 'A referenced record does not exist.'],
            1205, 1213 => [409, 'A concurrent change interrupted this request. Try again.'],
            default => [500, 'An internal error occurred.'],
        },
        default => [500, 'An internal error occurred.'],
    };
    $app->json(['error' => $message], $status);
    $app->response()->send();
});

foreach ([
    '/docs' => ['text/html; charset=utf-8', $root . '/docs/swagger.html'],
    '/openapi.json' => ['application/json', $root . '/docs/openapi.json'],
    '/swagger-ui.css' => ['text/css', $root . '/node_modules/swagger-ui-dist/swagger-ui.css'],
    '/swagger-ui-bundle.js' => ['text/javascript', $root . '/node_modules/swagger-ui-dist/swagger-ui-bundle.js'],
] as $url => [$type, $file]) {
    $app->route('GET ' . $url, function () use ($app, $type, $file): void {
        $app->response()->header('Content-Type', $type)->write(file_get_contents($file));
    });
}

$resources = [
    '/api/servers' => ServerService::class,
    '/api/applications' => ApplicationService::class,
    '/api/deployments' => DeploymentService::class,
    '/api/maintenance-tasks' => MaintenanceTaskService::class,
    '/api/users' => UserService::class,
];
$makeService = static fn(string $class): CrudService => new $class($testConnection ?? Database::connect());
require dirname(__DIR__) . '/routes/crud.php';
require dirname(__DIR__) . '/routes/releases.php';
$app->start();
