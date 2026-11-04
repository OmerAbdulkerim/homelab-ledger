<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\BaseDao;
use InvalidArgumentException;
use PDO;
use Throwable;

abstract class CrudService
{
    protected function __construct(protected PDO $pdo, protected BaseDao $dao)
    {
    }

    public function getAll(): array
    {
        return array_map($this->present(...), $this->dao->getAll());
    }

    public function getById(int $id): ?array
    {
        return $this->present($this->dao->getById($id));
    }

    public function create(array $data): array
    {
        $data = $this->validate($data, creating: true);
        $data = $this->prepare($data, []);
        return $this->transaction(fn(): array => $this->present($this->dao->create($data)));
    }

    public function update(int $id, array $data): ?array
    {
        $data = $this->validate($data, creating: false);

        return $this->transaction(function () use ($id, $data): ?array {
            $this->beforeUpdate($id, $data);
            $current = $this->dao->getById($id, forUpdate: true);
            if ($current === null) {
                return null;
            }
            return $this->present($this->dao->update($id, $this->prepare($data, $current)));
        });
    }

    public function delete(int $id): bool
    {
        return $this->dao->delete($id);
    }

    abstract protected function validate(array $data, bool $creating): array;

    protected function beforeUpdate(int $id, array $data): void
    {
    }

    protected function prepare(array $data, array $current): array
    {
        return $data;
    }

    protected function present(?array $row): ?array
    {
        return $row;
    }

    protected function transaction(callable $work): mixed
    {
        if ($this->pdo->inTransaction()) {
            return $work();
        }

        $this->pdo->beginTransaction();
        try {
            $result = $work();
            $this->pdo->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $error;
        }
    }

    protected function validateFields(array $data, bool $creating, array $required, array $optional): void
    {
        if ($data === [] || array_diff(array_keys($data), [...$required, ...$optional]) !== []) {
            throw new InvalidArgumentException('Provide at least one writable field and omit read-only or unknown fields.');
        }
        if ($creating && ($missing = array_diff($required, array_keys($data))) !== []) {
            throw new InvalidArgumentException('Required fields: ' . implode(', ', $missing) . '.');
        }
    }

    protected function validateText(array $data, array $limits, bool $nonblank = false, bool $nullable = false): void
    {
        foreach (array_intersect_key($data, $limits) as $field => $value) {
            if ($nullable && $value === null) {
                continue;
            }
            if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')
                || mb_strlen($value, 'UTF-8') > $limits[$field]) {
                throw new InvalidArgumentException("{$field} must be text of at most {$limits[$field]} characters.");
            }
            if ($nonblank && !$this->hasText($value)) {
                throw new InvalidArgumentException("{$field} must contain non-whitespace text.");
            }
        }
    }

    protected function hasText(string $value): bool
    {
        return preg_match('/[^\p{Z}\x{0009}-\x{000D}\x{0085}\x{FEFF}]/u', $value) === 1;
    }

    protected function validateIntegers(array $data, array $limits, bool $nullable = false): void
    {
        foreach (array_intersect_key($data, $limits) as $field => $value) {
            if ($nullable && $value === null) {
                continue;
            }
            $max = $limits[$field];
            if (!is_int($value) || $value < 1 || $value > $max) {
                throw new InvalidArgumentException("{$field} must be a whole number between 1 and {$max}.");
            }
        }
    }

    protected function validateDate(array $data, string $field): void
    {
        $value = $data[$field] ?? null;
        if ($value === null) {
            return;
        }
        if (!is_string($value) || !preg_match('/\A([1-9]\d{3})-(\d{2})-(\d{2})\z/', $value, $parts)
            || !checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1])) {
            throw new InvalidArgumentException("{$field} must be a valid YYYY-MM-DD date or null.");
        }
    }

    protected function validateChoice(array $data, string $field, array $choices): void
    {
        if (array_key_exists($field, $data) && !in_array($data[$field], $choices, true)) {
            throw new InvalidArgumentException("{$field} must be one of: " . implode(', ', $choices) . '.');
        }
    }
}
