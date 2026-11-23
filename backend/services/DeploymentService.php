<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\DeploymentDao;
use InvalidArgumentException;
use PDO;

final class DeploymentService extends CrudService
{
    public function __construct(PDO $pdo)
    {
        parent::__construct($pdo, new DeploymentDao($pdo));
    }

    protected function validate(array $data, bool $creating): array
    {
        $this->validateFields($data, $creating, ['application_id', 'server_id', 'label'], [
            'installed_version', 'url', 'status', 'deployed_on', 'notes',
        ]);
        $this->validateIntegers($data, ['application_id' => 4294967295, 'server_id' => 4294967295]);
        $this->validateText($data, ['label' => 80], nonblank: true);
        $this->validateText($data, ['installed_version' => 100, 'url' => 2048, 'notes' => 5000]);
        $this->validateChoice($data, 'status', ['running', 'stopped', 'planned']);
        $this->validateDate($data, 'deployed_on');

        $url = $data['url'] ?? '';
        if ($url !== '') {
            $parts = parse_url($url);
            if (filter_var($url, FILTER_VALIDATE_URL) === false
                || !in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true)
                || isset($parts['user']) || isset($parts['pass'])) {
                throw new InvalidArgumentException('URL must be HTTP or HTTPS without embedded credentials.');
            }
        }
        return $data;
    }

    protected function prepare(array $data, array $current): array
    {
        $status = $data['status'] ?? $current['status'] ?? 'planned';
        $version = $data['installed_version'] ?? $current['installed_version'] ?? '';
        if ($status !== 'planned' && !$this->hasText($version)) {
            throw new InvalidArgumentException('An installed version is required for running or stopped deployments.');
        }
        return $data;
    }
}
