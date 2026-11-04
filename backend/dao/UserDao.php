<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

use PDO;
use RuntimeException;

require_once __DIR__ . '/BaseDao.php';

final class UserDao extends BaseDao
{
    protected const TABLE = 'users';
    protected const COLUMNS = ['name', 'email', 'password_hash', 'role'];

    // Internal credential lookup. Services remove password_hash from API responses.
    public function getByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM users WHERE email = :email');
        $statement->execute(['email' => $email]);
        return $statement->fetch() ?: null;
    }

    public function adminIdsForUpdate(): array
    {
        if (!$this->pdo->inTransaction()) {
            throw new RuntimeException('Admin locks require a transaction.');
        }
        $statement = $this->pdo->prepare('SELECT id FROM users WHERE role = :role ORDER BY id FOR UPDATE');
        $statement->execute(['role' => 'admin']);
        return $statement->fetchAll(PDO::FETCH_COLUMN);
    }
}
