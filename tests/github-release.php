<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use HomelabLedger\Service\GitHubReleaseService;

require __DIR__ . '/../vendor/autoload.php';
date_default_timezone_set('Europe/Sarajevo');

function check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$application = ['github_owner' => 'octocat', 'github_repo' => 'Hello-World'];
$url = 'https://api.github.com/repos/octocat/Hello-World';
$release = [
    'tag_name' => 'v2.0.0',
    'html_url' => 'https://github.com/octocat/Hello-World/releases/tag/v2.0.0',
    'published_at' => '2026-03-29T02:30:00Z',
    'draft' => false,
    'prerelease' => false,
];
$payload = json_encode($release, JSON_THROW_ON_ERROR);

$lookup = static function (
    array $responses,
    string $state,
    ?array $record = null,
    ?array $expected = null,
) use ($application, $url): array {
    $requests = [];
    $github = new GitHubReleaseService('test_token', function (string $target, array $headers, int $timeoutMs) use (&$requests, &$responses): array {
        check(in_array('Authorization: Bearer test_token', $headers, true), 'Missing Authorization header.');
        check(in_array('Accept: application/vnd.github+json', $headers, true), 'Missing Accept header.');
        check($timeoutMs >= 1 && $timeoutMs <= 5000, 'Invalid per-request timeout.');
        $requests[] = $target;
        return array_shift($responses) ?? throw new RuntimeException('Unexpected GitHub request.');
    });
    $result = $github->latest($record ?? $application);
    check($result['state'] === $state, "Expected {$state}; got {$result['state']}.");
    check($responses === [], 'Expected more GitHub requests.');
    $expected ??= array_slice([$url . '/releases/latest', $url . '/releases?per_page=1'], 0, count($requests));
    check($requests === $expected, 'Unexpected GitHub URL.');
    check(!str_contains(json_encode($result, JSON_THROW_ON_ERROR), 'test_token'), 'GitHub token leaked.');
    return $result;
};

$result = $lookup([[200, $payload, []]], 'available');
check($result['tag'] === 'v2.0.0' && $result['published'] === $release['published_at']
    && $result['releaseUrl'] === $release['html_url'], 'Release fields did not round-trip.');

$latest = $url . '/releases/latest';
$list = $url . '/releases?per_page=1';
$moved = 'https://api.github.com/repositories/123/releases';
$movedLatest = $moved . '/latest';
$movedList = $moved . '?per_page=1';
$redirected = $lookup([[301, '', ['location' => $movedLatest]], [200, $payload, []]], 'available',
    expected: [$latest, $movedLatest]);
check($redirected === $result, 'Redirect changed the release response.');
$lookup([[404, '', []], [302, '', ['location' => $moved]], [200, '[]', []]], 'no-release',
    expected: [$latest, $list, $movedList]);
$lookup([[307, '', ['location' => $movedLatest]], [404, '', []],
    [308, '', ['location' => $movedList]], [200, '[]', []]], 'no-release',
    expected: [$latest, $movedLatest, $list, $movedList]);
$lookup([[301, '', ['location' => $movedLatest]], [301, '', ['location' => $latest]]], 'unavailable',
    expected: [$latest, $movedLatest]);
$lookup([[301, '', ['location' => $movedLatest]], [429, '', []]], 'rate-limited',
    expected: [$latest, $movedLatest]);
foreach ([
    null,
    $latest,
    '/repositories/123/releases/latest',
    'http://api.github.com/repositories/123/releases/latest',
    'https://example.test/repositories/123/releases/latest',
    'https://user@api.github.com/repositories/123/releases/latest',
    'https://api.github.com:443/repositories/123/releases/latest',
    $movedLatest . '#fragment',
    $movedLatest . '?unexpected=1',
    $movedList,
    $movedLatest . ' ',
    $movedLatest . chr(92),
    'https://api.github.com/repos/owner/../releases/latest',
] as $destination) {
    $headers = $destination === null ? [] : ['location' => $destination];
    $lookup([[301, '', $headers]], 'unavailable', expected: [$latest]);
}
$lookup([], 'unlinked', ['github_owner' => '', 'github_repo' => '']);
$lookup([], 'unavailable', ['github_owner' => 'octocat', 'github_repo' => '..']);
$lookup([[404, '', []], [200, '[]', []]], 'no-release');
$lookup([[404, '', []], [200, '{}', []]], 'unavailable');
$lookup([[404, '', []], [404, '', []]], 'unavailable');
$lookup([[301, '', ['location' => 'https://example.test/']]], 'unavailable');
$lookup([[0, '', []]], 'unavailable');
$lookup([[500, '', []]], 'unavailable');
$lookup([[403, '{"message":"Resource not accessible"}', []]], 'unavailable');
$lookup([[403, '', ['x-ratelimit-remaining' => '0']]], 'rate-limited');
$lookup([[403, '{"message":"You have exceeded a secondary rate limit"}', []]], 'rate-limited');
$lookup([[429, '', []]], 'rate-limited');
$lookup([[404, '', []], [403, '', ['retry-after' => '60']]], 'rate-limited');
$lookup([[200, '{', []]], 'unavailable');
foreach ([
    ['html_url' => 'https://github.com@other.example/'],
    ['published_at' => '2026-11-31T08:00:00Z'],
    ['prerelease' => true],
] as $invalid) {
    $lookup([[200, json_encode($invalid + $release, JSON_THROW_ON_ERROR), []]], 'unavailable');
}
echo "PASS: GitHub release success, no release, unlinked, rate limits and provider failures.\n";
