<?php
declare(strict_types=1);

namespace HomelabLedger\Dao;

use InvalidArgumentException;
use PDO;
use RuntimeException;

abstract class BaseDao
{
    // Identifiers come only from the concrete DAO, never from request data.
    protected const TABLE = '';
    protected const COLUMNS = [];

    public function __construct(protected PDO $pdo)
    {
    }

    public function getAll(): array
    {
        $statement = $this->pdo->prepare('SELECT * FROM `' . static::TABLE . '` ORDER BY id');
        $statement->execute();
        return $statement->fetchAll();
    }

    public function getById(int $id): ?array
    {
        $this->validateId($id);
        $statement = $this->pdo->prepare('SELECT * FROM `' . static::TABLE . '` WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->fetch() ?: null;
    }

    public function create(array $data): array
    {
        $this->validateData($data);
        $columns = array_keys($data);
        $names = '`' . implode('`, `', $columns) . '`';
        $parameters = ':' . implode(', :', $columns);
        $statement = $this->pdo->prepare('INSERT INTO `' . static::TABLE . "` ({$names}) VALUES ({$parameters})");
        $statement->execute($data);
        return $this->getById((int) $this->pdo->lastInsertId())
            ?? throw new RuntimeException('Created record could not be read.');
    }

    /** Partial update. Unchanged records still return their data; missing IDs return null. */
    public function update(int $id, array $data): ?array
    {
        $this->validateId($id);
        $this->validateData($data);
        $assignments = array_map(fn(string $column): string => "`{$column}` = :{$column}", array_keys($data));
        $statement = $this->pdo->prepare('UPDATE `' . static::TABLE . '` SET ' . implode(', ', $assignments) . ' WHERE id = :id');
        $statement->execute([...$data, 'id' => $id]);
        return $this->getById($id);
    }

    public function delete(int $id): bool
    {
        $this->validateId($id);
        $statement = $this->pdo->prepare('DELETE FROM `' . static::TABLE . '` WHERE id = :id');
        $statement->execute(['id' => $id]);
        return $statement->rowCount() === 1;
    }

    private function validateId(int $id): void
    {
        if ($id < 1) {
            throw new InvalidArgumentException('Record ID must be positive.');
        }
    }

    private function validateData(array $data): void
    {
        if ($data === [] || array_diff(array_keys($data), static::COLUMNS) !== []) {
            throw new InvalidArgumentException('Provide only writable fields for this entity; IDs and record timestamps are read-only.');
        }
        foreach ($data as $value) {
            if ($value !== null && !is_string($value) && !is_int($value)) {
                throw new InvalidArgumentException('Database values must be strings, integers or null.');
            }
        }
    }
}
