<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\ServerDao;
use InvalidArgumentException;
use PDO;

final class ServerService extends CrudService
{
    private const REQUIRED_TEXT = ['name' => 80, 'hostname' => 253, 'purpose' => 200];
    private const OPTIONAL_TEXT = ['operating_system' => 100, 'os_version' => 100, 'cpu_model' => 160];
    private const OPTIONAL_NUMBERS = ['cpu_cores' => 65535, 'ram_mib' => 4294967295, 'storage_gib' => 4294967295];

    public function __construct(PDO $pdo)
    {
        parent::__construct($pdo, new ServerDao($pdo));
    }

    protected function validate(array $data, bool $creating): array
    {
        $this->validateFields($data, $creating, array_keys(self::REQUIRED_TEXT), [
            ...array_keys(self::OPTIONAL_TEXT), ...array_keys(self::OPTIONAL_NUMBERS), 'notes',
        ]);
        $this->validateText($data, self::REQUIRED_TEXT, nonblank: true);
        $this->validateText($data, self::OPTIONAL_TEXT, nonblank: true, nullable: true);
        $this->validateText($data, ['notes' => 5000]);
        $this->validateIntegers($data, self::OPTIONAL_NUMBERS, nullable: true);

        if (isset($data['hostname'])) {
            $host = $data['hostname'];
            $ip = str_starts_with($host, '[') && str_ends_with($host, ']')
                ? substr($host, 1, -1) : $host;
            if (filter_var($ip, FILTER_VALIDATE_IP) === false
                && filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) === false) {
                throw new InvalidArgumentException('Hostname must be a valid hostname or IP address.');
            }
        }
        return $data;
    }
}
