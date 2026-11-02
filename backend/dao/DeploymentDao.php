<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

require_once __DIR__ . '/BaseDao.php';

final class DeploymentDao extends BaseDao
{
    protected const TABLE = 'deployments';
    protected const COLUMNS = [
        'application_id', 'server_id', 'label', 'installed_version',
        'url', 'status', 'deployed_on', 'notes',
    ];
}
