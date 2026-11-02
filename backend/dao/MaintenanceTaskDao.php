<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

require_once __DIR__ . '/BaseDao.php';

final class MaintenanceTaskDao extends BaseDao
{
    protected const TABLE = 'maintenance_tasks';
    protected const COLUMNS = [
        'server_id', 'deployment_id', 'assigned_user_id', 'title',
        'description', 'status', 'due_on', 'completed_at', 'outcome',
    ];
}
