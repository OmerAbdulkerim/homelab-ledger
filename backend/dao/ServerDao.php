<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

require_once __DIR__ . '/BaseDao.php';

final class ServerDao extends BaseDao
{
    protected const TABLE = 'servers';
    protected const COLUMNS = [
        'name', 'hostname', 'purpose', 'operating_system', 'os_version',
        'cpu_model', 'cpu_cores', 'ram_mib', 'storage_gib', 'notes',
    ];
}
