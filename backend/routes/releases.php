<?php
declare(strict_types=1);

use HomelabLedger\Service\ApplicationService;
use HomelabLedger\Service\GitHubReleaseService;

if (!isset($app, $makeService, $recordId)) {
    http_response_code(404);
    return;
}

$app->route('GET /api/applications/@id/release', function (string $value) use ($app, $makeService, $recordId): void {
    $id = $recordId($value);
    $application = $makeService(ApplicationService::class)->getById($id);
    if ($application === null) {
        throw new DomainException('Application not found.', 404);
    }

    $config = require dirname(__DIR__) . '/config/local.php';
    $token = $config['github_token'] ?? null;
    $github = new GitHubReleaseService($token === '' ? null : $token);
    $result = $github->latest($application);
    $status = match ($result['state']) {
        'unavailable' => 502,
        'rate-limited' => 503,
        default => 200,
    };
    $app->json($result, $status);
});
