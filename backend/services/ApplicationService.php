<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\ApplicationDao;
use InvalidArgumentException;
use PDO;

final class ApplicationService extends CrudService
{
    public function __construct(PDO $pdo)
    {
        parent::__construct($pdo, new ApplicationDao($pdo));
    }

    protected function validate(array $data, bool $creating): array
    {
        $this->validateFields($data, $creating, ['name', 'description'], ['github_owner', 'github_repo', 'notes']);
        $this->validateText($data, ['name' => 80, 'description' => 500], nonblank: true);
        $this->validateText($data, ['github_owner' => 100, 'github_repo' => 100, 'notes' => 5000]);
        return $data;
    }

    protected function prepare(array $data, array $current): array
    {
        if (isset($data['github_owner']) || isset($data['github_repo'])) {
            $owner = $data['github_owner'] ?? $current['github_owner'] ?? '';
            $repo = $data['github_repo'] ?? $current['github_repo'] ?? '';
            if (($owner !== '' || $repo !== '') && !self::validRepository($owner, $repo)) {
                throw new InvalidArgumentException('Provide a valid GitHub owner and repository together, or leave both empty.');
            }
        }
        return $data;
    }

    private static function validRepository(string $owner, string $repo): bool
    {
        return preg_match('/\A[a-zA-Z0-9-]{1,100}\z/', $owner) === 1
            && preg_match('/\A[a-zA-Z0-9_.-]{1,100}\z/', $repo) === 1
            && !in_array($repo, ['.', '..'], true);
    }
}
