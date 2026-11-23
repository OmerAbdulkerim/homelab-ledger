<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use Closure;
use DateTimeImmutable;
use DateTimeZone;

final class GitHubReleaseService
{
    private const FAILURE = [
        'state' => 'unavailable',
        'message' => 'GitHub release information is unavailable.',
    ];
    private const RATE_LIMIT = [
        'state' => 'rate-limited',
        'message' => 'GitHub rate limit reached. Try again later.',
    ];

    public function __construct(private ?string $token = null, private ?Closure $request = null)
    {
    }

    public static function validRepository(string $owner, string $repo): bool
    {
        return preg_match('/\A[a-zA-Z0-9-]{1,100}\z/', $owner) === 1
            && preg_match('/\A[a-zA-Z0-9_.-]{1,100}\z/', $repo) === 1
            && !in_array($repo, ['.', '..'], true);
    }

    public function latest(array $application): array
    {
        $owner = $application['github_owner'];
        $repo = $application['github_repo'];
        if ($owner === '' && $repo === '') {
            return ['state' => 'unlinked'];
        }
        if (!self::validRepository($owner, $repo)
            || ($this->token !== null && !preg_match('/\A[a-zA-Z0-9_]+\z/', $this->token))) {
            return self::FAILURE;
        }

        $path = rawurlencode($owner) . '/' . rawurlencode($repo);
        $reference = [
            'name' => "{$owner}/{$repo}",
            'repositoryUrl' => 'https://github.com/' . $path,
        ];
        $url = 'https://api.github.com/repos/' . $path;
        $request = $this->request ?? self::get(...);
        $headers = [
            'Accept: application/vnd.github+json',
            'User-Agent: Homelab-Ledger',
            'X-GitHub-Api-Version: 2022-11-28',
        ];
        if ($this->token !== null) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $deadline = hrtime(true) + 10_000_000_000;
        [$status, $body, $responseHeaders] = self::requestRelease(
            $request, $url . '/releases/latest', $headers, $deadline, latest: true,
        );
        if ($status === 404) {
            // Listing releases requires the same access as reading the latest release.
            [$status, $body, $responseHeaders] = self::requestRelease(
                $request, $url . '/releases?per_page=1', $headers, $deadline, latest: false,
            );
            if ($status === 200 && is_array(json_decode($body, false, 32))) {
                return ['state' => 'no-release'] + $reference;
            }
        } elseif ($status === 200) {
            $release = json_decode($body, true, 32);
            if (is_array($release) && self::validRelease($release)) {
                return ['state' => 'available'] + $reference + [
                    'tag' => $release['tag_name'],
                    'releaseUrl' => $release['html_url'],
                    'published' => $release['published_at'],
                ];
            }
        }

        $message = $status === 403 ? (json_decode($body, true, 32)['message'] ?? null) : null;
        if ($status === 429 || ($status === 403 && (
            ($responseHeaders['x-ratelimit-remaining'] ?? null) === '0'
            || isset($responseHeaders['retry-after'])
            || (is_string($message) && preg_match('/rate limit/i', $message) === 1)
        ))) {
            return self::RATE_LIMIT;
        }
        return self::FAILURE;
    }

    private static function requestRelease(
        Closure $request,
        string $url,
        array $headers,
        int|float $deadline,
        bool $latest,
    ): array {
        // Each leg can follow one redirect within the shared lookup budget.
        for ($hop = 0; $hop <= 1; $hop++) {
            $timeoutMs = min(5000, (int) floor(($deadline - hrtime(true)) / 1_000_000));
            if ($timeoutMs < 1) {
                break;
            }
            $response = $request($url, $headers, $timeoutMs);
            if (!in_array($response[0], [301, 302, 307, 308], true)) {
                return $response;
            }
            if ($hop === 1) {
                break;
            }
            $target = self::redirectTarget($response[2]['location'] ?? '', $latest);
            if ($target === null || $target === $url) {
                break;
            }
            $url = $target;
        }
        return [0, '', []];
    }

    private static function redirectTarget(string $location, bool $latest): ?string
    {
        if (str_contains($location, '\\') || preg_match('/[\x00-\x20\x7f]/', $location)
            || filter_var($location, FILTER_VALIDATE_URL) === false) {
            return null;
        }
        $parts = parse_url($location);
        if (($parts['scheme'] ?? '') !== 'https' || ($parts['host'] ?? '') !== 'api.github.com'
            || isset($parts['user']) || isset($parts['pass']) || isset($parts['port']) || isset($parts['fragment'])) {
            return null;
        }

        $operation = $latest ? '/releases/latest' : '/releases';
        if (!preg_match('~\A/(?:repositories/[0-9]+|repos/([^/]+)/([^/]+))' . $operation . '\z~', $parts['path'] ?? '', $path)
            || (isset($path[1]) && !self::validRepository($path[1], $path[2]))) {
            return null;
        }

        $query = $parts['query'] ?? null;
        if ($query !== null && ($latest || $query !== 'per_page=1')) {
            return null;
        }
        return !$latest && $query === null ? $location . '?per_page=1' : $location;
    }

    private static function validRelease(array $release): bool
    {
        $url = $release['html_url'] ?? null;
        $published = $release['published_at'] ?? null;
        if (!is_string($url) || filter_var($url, FILTER_VALIDATE_URL) === false
            || !is_string($published) || !preg_match('/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\z/', $published)
            || !is_string($release['tag_name'] ?? null) || trim($release['tag_name']) === ''
            || ($release['draft'] ?? null) !== false || ($release['prerelease'] ?? null) !== false) {
            return false;
        }
        $parts = parse_url($url);
        $date = DateTimeImmutable::createFromFormat('!Y-m-d\TH:i:s\Z', $published, new DateTimeZone('UTC'));
        return ($parts['scheme'] ?? '') === 'https' && ($parts['host'] ?? '') === 'github.com'
            && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['port'])
            && $date !== false && $date->format('Y-m-d\TH:i:s\Z') === $published;
    }

    private static function get(string $url, array $headers, int $timeoutMs): array
    {
        $responseHeaders = [];
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT_MS => min(2000, $timeoutMs),
            CURLOPT_TIMEOUT_MS => $timeoutMs,
            CURLOPT_MAXFILESIZE => 2 * 1024 * 1024,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$responseHeaders): int {
                $parts = explode(':', $line, 2);
                if (count($parts) === 2) {
                    $responseHeaders[strtolower($parts[0])] = trim($parts[1], " \t\r\n");
                }
                return strlen($line);
            },
        ]);
        $body = curl_exec($curl);
        return $body === false
            ? [0, '', []]
            : [curl_getinfo($curl, CURLINFO_RESPONSE_CODE), $body, $responseHeaders];
    }
}
