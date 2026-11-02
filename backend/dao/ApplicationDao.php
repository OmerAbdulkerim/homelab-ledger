<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

require_once __DIR__ . '/BaseDao.php';

final class ApplicationDao extends BaseDao
{
    protected const TABLE = 'applications';
    protected const COLUMNS = ['name', 'description', 'github_owner', 'github_repo', 'notes'];
}
