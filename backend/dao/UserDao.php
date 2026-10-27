<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

require_once __DIR__ . '/BaseDao.php';

final class UserDao extends BaseDao
{
    protected const TABLE = 'users';
    protected const COLUMNS = ['name', 'email', 'password_hash', 'role'];

    // Internal credential lookup. Future services must remove password_hash from API responses.
    public function getByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM users WHERE email = :email');
        $statement->execute(['email' => $email]);
        return $statement->fetch() ?: null;
    }
}
