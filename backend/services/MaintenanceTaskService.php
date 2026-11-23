<?php
declare(strict_types=1);

namespace HomelabLedger\Service;

use HomelabLedger\Dao\MaintenanceTaskDao;
use InvalidArgumentException;
use PDO;

final class MaintenanceTaskService extends CrudService
{
    public function __construct(PDO $pdo)
    {
        parent::__construct($pdo, new MaintenanceTaskDao($pdo));
    }

    protected function validate(array $data, bool $creating): array
    {
        $this->validateFields($data, $creating, ['title'], [
            'server_id', 'deployment_id', 'assigned_user_id', 'description', 'status', 'due_on', 'outcome',
        ]);
        $this->validateIntegers($data, [
            'server_id' => 4294967295, 'deployment_id' => 4294967295, 'assigned_user_id' => 4294967295,
        ], nullable: true);
        $this->validateText($data, ['title' => 160], nonblank: true);
        $this->validateText($data, ['description' => 5000, 'outcome' => 5000]);
        $this->validateChoice($data, 'status', ['open', 'in_progress', 'completed']);
        $this->validateDate($data, 'due_on');
        return $data;
    }

    protected function prepare(array $data, array $current): array
    {
        $task = $data + $current;
        if (isset($task['server_id']) === isset($task['deployment_id'])) {
            throw new InvalidArgumentException('Choose exactly one server or deployment for this task.');
        }

        if (($task['status'] ?? 'open') === 'completed') {
            if (!$this->hasText($task['outcome'] ?? '')) {
                throw new InvalidArgumentException('An outcome is required for a completed task.');
            }
            $data['completed_at'] = $current['completed_at'] ?? gmdate('Y-m-d H:i:s');
        } else {
            $data['completed_at'] = null;
        }
        return $data;
    }
}
