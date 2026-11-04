<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\UserDao;
use DomainException;
use InvalidArgumentException;
use PDO;

final class UserService extends CrudService
{
    private UserDao $users;

    public function __construct(PDO $pdo)
    {
        $this->users = new UserDao($pdo);
        parent::__construct($pdo, $this->users);
    }

    protected function validate(array $data, bool $creating): array
    {
        $this->validateFields($data, $creating, ['name', 'email', 'password'], $creating ? [] : ['role']);
        $this->validateText($data, ['name' => 80, 'email' => 254], nonblank: true);
        if (isset($data['email']) && filter_var($data['email'], FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('Enter a valid email address.');
        }
        $this->validateChoice($data, 'role', ['admin', 'user']);
        if (array_key_exists('password', $data)) {
            $password = $data['password'];
            if (!is_string($password) || !mb_check_encoding($password, 'UTF-8')
                || mb_strlen($password, 'UTF-8') < 8 || strlen($password) > 72 || str_contains($password, "\0")) {
                throw new InvalidArgumentException('Password must have at least 8 characters and at most 72 UTF-8 bytes without NUL.');
            }
            $data['password_hash'] = password_hash($password, PASSWORD_DEFAULT);
            unset($data['password']);
        }
        return $data;
    }

    protected function present(?array $row): ?array
    {
        if ($row !== null) {
            unset($row['password_hash']);
        }
        return $row;
    }

    protected function beforeUpdate(int $id, array $data): void
    {
        if (($data['role'] ?? null) === 'user') {
            $this->keepAnAdmin($id);
        }
    }

    public function delete(int $id): bool
    {
        return $this->transaction(function () use ($id): bool {
            $this->keepAnAdmin($id);
            return parent::delete($id);
        });
    }

    private function keepAnAdmin(int $id): void
    {
        $admins = $this->users->adminIdsForUpdate();
        if (count($admins) === 1 && (int) $admins[0] === $id) {
            throw new DomainException('Keep at least one admin in the workspace.', 409);
        }
    }
}
