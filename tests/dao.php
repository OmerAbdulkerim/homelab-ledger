<?php
declare(strict_types=1);

// CLI integration checks against an imported, disposable MySQL *_test database.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

use HomelabLedger\Config\Database;
use HomelabLedger\Dao\ApplicationDao;
use HomelabLedger\Dao\BaseDao;
use HomelabLedger\Dao\DeploymentDao;
use HomelabLedger\Dao\MaintenanceTaskDao;
use HomelabLedger\Dao\ServerDao;
use HomelabLedger\Dao\UserDao;

require_once __DIR__ . '/../backend/config/Database.php';
foreach (['User', 'Server', 'Application', 'Deployment', 'MaintenanceTask'] as $entity) {
    require_once __DIR__ . '/../backend/dao/' . $entity . 'Dao.php';
}

$checks = 0;
function check(bool $condition, string $message): void
{
    global $checks;
    if (!$condition) {
        throw new RuntimeException($message);
    }
    $checks++;
}

function checkList(BaseDao $dao, array $expectedRows, string $context): void
{
    usort($expectedRows, fn(array $a, array $b): int => $a['id'] <=> $b['id']);
    check($dao->getAll() === $expectedRows, $context);
}

function advanceTestClock(PDO $pdo, int $minute): string
{
    $epoch = strtotime('2026-11-01 12:00:00 UTC') + $minute * 60;
    $pdo->exec('SET timestamp = ' . $epoch . '.123456');
    return gmdate('Y-m-d H:i:s', $epoch) . '.123456';
}

function rejects(callable $action, string $exception, ?int $mysqlCode = null, string $context = ''): void
{
    $context = $context === '' ? '' : $context . ': ';
    try {
        $action();
    } catch (Throwable $error) {
        check($error instanceof $exception, $context . 'Unexpected exception type: ' . $error::class);
        if ($mysqlCode !== null) {
            $actual = (int) ($error->errorInfo[1] ?? 0);
            // MySQL returns the less detailed 1216/1217 with restricted DML accounts.
            $codes = match ($mysqlCode) {
                1451 => [1217, 1451],
                1452 => [1216, 1452],
                default => [$mysqlCode],
            };
            check(in_array($actual, $codes, true), $context . "Expected MySQL {$mysqlCode}, received {$actual}.");
        }
        return;
    }
    throw new RuntimeException($context . 'Expected rejection did not occur.');
}

$pdo = null;
try {
    $path = __DIR__ . '/../backend/config/local.php';
    if (!is_file($path)) {
        throw new RuntimeException('Configure local.php and import the SQL into a separate *_test database first.');
    }
    $config = require $path;
    $settings = $config['test_database'] ?? [];
    check(str_ends_with($settings['name'] ?? '', '_test')
        && ($settings['name'] ?? '') !== ($config['database']['name'] ?? ''),
        'Tests require a separate database whose name ends in _test.');
    $pdo = Database::connect($settings);
    check($pdo->query('SELECT DATABASE()')->fetchColumn() === $settings['name'], 'Wrong test database.');
    check(!$pdo->getAttribute(PDO::ATTR_EMULATE_PREPARES), 'Native prepared statements required.');
    check($pdo->query('SELECT @@session.time_zone')->fetchColumn() === '+00:00', 'UTC connection required.');
    check(str_contains($pdo->query('SELECT @@session.sql_mode')->fetchColumn(), 'STRICT_TRANS_TABLES'), 'Strict SQL mode required.');
    check($pdo->query('SELECT @@character_set_connection')->fetchColumn() === 'utf8mb4', 'UTF-8 connection required.');
    check((int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND engine = 'InnoDB'")->fetchColumn() === 5, 'Expected five InnoDB tables.');

    $users = new UserDao($pdo);
    $servers = new ServerDao($pdo);
    $apps = new ApplicationDao($pdo);
    $deployments = new DeploymentDao($pdo);
    $tasks = new MaintenanceTaskDao($pdo);
    $daos = [$users, $servers, $apps, $deployments, $tasks];
    $before = array_map(fn($dao) => $dao->getAll(), $daos);
    check(array_map('count', $before) === [2, 2, 4, 4, 4], 'Import the unmodified SQL sample data before testing.');
    check(password_verify('ledger-admin', $users->getByEmail('ADMIN@homelab.example')['password_hash']), 'Admin seed hash invalid.');
    check(password_verify('ledger-user', $users->getByEmail('user@homelab.example')['password_hash']), 'User seed hash invalid.');
    check($tasks->getById(4)['completed_at'] === '2026-10-20 15:00:00', 'Seed completion time must be UTC.');
    check($users->getByEmail("' OR 1=1 -- ") === null, 'Email lookup must bind input.');
    check($users->getByEmail('missing@example.test') === null, 'Missing email must return null.');

    // DML only; every change is rolled back, including when a check fails.
    $pdo->beginTransaction();
    $hash = password_hash('test-only-password', PASSWORD_DEFAULT);
    $user = $users->create(['name' => 'DAO tester', 'email' => 'dao@example.test', 'password_hash' => $hash]);
    check($user['role'] === 'user', 'New users must default to regular users.');
    check(password_verify('test-only-password', $user['password_hash']), 'Hash must round-trip.');
    $payload = "O'Reilly 😀 <script>text only</script> \\ '); DROP TABLE servers; --";
    $server = $servers->create(['name' => 'DAO server', 'hostname' => 'dao.example.test', 'purpose' => 'Testing', 'notes' => $payload]);
    check($server['notes'] === $payload, 'Quotes, backslashes, markup and emoji must round-trip literally.');
    $app = $apps->create(['name' => 'DAO app', 'description' => 'Testing']);
    check($app['github_owner'] === '' && $app['github_repo'] === '', 'Optional repository pair defaults to blank.');
    $deploymentInput = ['application_id' => $app['id'], 'server_id' => $server['id'], 'label' => 'staging'];
    $deployment = $deployments->create($deploymentInput);
    check($deployment['status'] === 'planned' && $deployment['deployed_on'] === null, 'Planned deployment defaults incorrect.');
    $task = $tasks->create(['title' => 'DAO task', 'deployment_id' => $deployment['id'], 'assigned_user_id' => $user['id']]);
    check($task['server_id'] === null && $task['due_on'] === null && $task['completed_at'] === null, 'Nullable task fields must round-trip.');

    // Every required text field, including fields required only in certain states.
    // Test both INSERT and UPDATE so rejecting one path cannot hide a broken other path.
    $requiredText = [
        ['users', $users, $user['id'], ['name' => 'Whitespace tester', 'email' => 'whitespace@example.test', 'password_hash' => $hash], ['name', 'email', 'password_hash']],
        ['servers', $servers, $server['id'], ['name' => 'Whitespace server', 'hostname' => 'whitespace.example.test', 'purpose' => 'Whitespace checks', 'operating_system' => 'Debian', 'os_version' => '12', 'cpu_model' => 'Test CPU'], ['name', 'hostname', 'purpose', 'operating_system', 'os_version', 'cpu_model']],
        ['applications', $apps, $app['id'], ['name' => 'Whitespace app', 'description' => 'Whitespace checks', 'github_owner' => 'owner', 'github_repo' => 'repo'], ['name', 'description', 'github_owner', 'github_repo']],
        ['deployments', $deployments, $deployment['id'], [...$deploymentInput, 'label' => 'whitespace-check', 'status' => 'running', 'installed_version' => 'v1'], ['label', 'installed_version']],
        ['maintenance_tasks', $tasks, $task['id'], ['title' => 'Whitespace task', 'deployment_id' => $deployment['id'], 'status' => 'completed', 'completed_at' => '2026-10-27 12:00:00', 'outcome' => 'Verified'], ['title', 'outcome']],
    ];
    $blanks = [
        '', ' ', "\t", "\n", "\r", "\r\n", "\v", "\f", "\u{0085}",
        "\u{00A0}", "\u{1680}", "\u{2003}", "\u{2028}", "\u{2029}",
        "\u{202F}", "\u{205F}", "\u{3000}", "\u{FEFF}", " \t\r\n\u{00A0}\u{2003}\u{FEFF} ",
    ];
    foreach ($requiredText as [$table, $dao, $id, $valid, $fields]) {
        // Prove the fixture is otherwise valid; no unrelated constraint should cause rejection.
        $validRow = $dao->create($valid);
        check($dao->delete($validRow['id']), "{$table}: valid whitespace fixture cleanup failed.");
        foreach ($fields as $field) {
            foreach ($blanks as $blank) {
                $invalid = [...$valid, $field => $blank];
                $context = "{$table}.{$field} = " . json_encode($blank);
                rejects(fn() => $dao->create($invalid), PDOException::class, 3819, $context . ' INSERT');
                rejects(fn() => $dao->update($id, $invalid), PDOException::class, 3819, $context . ' UPDATE');
            }
        }
    }
    $padded = " \t\u{00A0}\u{FEFF}café 😀\u{2003}\n ";
    check($servers->update($server['id'], ['name' => $padded])['name'] === $padded, 'Nonblank Unicode text must remain unchanged.');
    $server = $servers->update($server['id'], ['name' => $server['name']]);
    check($tasks->update($task['id'], ['status' => 'completed', 'completed_at' => '2026-10-27 12:00:00', 'outcome' => $padded])['outcome'] === $padded, 'Nonblank completion outcome must remain unchanged.');
    $tasks->update($task['id'], ['status' => 'open', 'completed_at' => null, 'outcome' => '']);
    check($tasks->getById($task['id'])['outcome'] === '', 'Open tasks may still have an empty optional outcome.');
    check($deployments->getById($deployment['id'])['installed_version'] === '', 'Planned deployments may still have an empty optional version.');
    check($apps->getById($app['id'])['github_owner'] === '' && $apps->getById($app['id'])['github_repo'] === '', 'Both optional repository fields may still be empty.');

    // The optional-pair branch must recognize literal emptiness, not collation equality.
    $pairInput = ['name' => 'GitHub pair checks', 'description' => 'Dedicated pair fixture'];
    $pairSubject = $apps->create($pairInput);
    $pairs = [
        'empty pair' => ['', '', true],
        'valid pair' => ['owner', 'repo', true],
        'BOM-only pair' => ["\u{FEFF}", "\u{FEFF}", false],
        'empty owner and BOM repository' => ['', "\u{FEFF}", false],
        'BOM owner and empty repository' => ["\u{FEFF}", '', false],
        'tab-only pair' => ["\t", "\t", false],
        'nonbreaking-space pair' => ["\u{00A0}", "\u{00A0}", false],
        'owner without repository' => ['owner', '', false],
        'repository without owner' => ['', 'repo', false],
    ];
    foreach ($pairs as $label => [$owner, $repo, $accepted]) {
        $pair = ['github_owner' => $owner, 'github_repo' => $repo];
        if ($accepted) {
            $created = $apps->create([...$pairInput, ...$pair]);
            check($created['github_owner'] === $owner && $created['github_repo'] === $repo, "{$label}: inserted pair must remain unchanged.");
            check($apps->delete($created['id']), "{$label}: inserted fixture cleanup failed.");
            $updated = $apps->update($pairSubject['id'], $pair);
            check($updated['github_owner'] === $owner && $updated['github_repo'] === $repo, "{$label}: updated pair must remain unchanged.");
        } else {
            $beforeApps = $apps->getAll();
            $beforePair = $apps->getById($pairSubject['id']);
            rejects(fn() => $apps->create([...$pairInput, ...$pair]), PDOException::class, 3819, "GitHub {$label} INSERT");
            check($apps->getAll() === $beforeApps, "{$label}: rejected insert must leave rows unchanged.");
            rejects(fn() => $apps->update($pairSubject['id'], $pair), PDOException::class, 3819, "GitHub {$label} UPDATE");
            check($apps->getById($pairSubject['id']) === $beforePair, "{$label}: rejected update must leave the fixture unchanged.");
        }
    }
    check($apps->delete($pairSubject['id']), 'GitHub pair fixture cleanup failed.');

    // Unknown specifications are NULL; supplied values must survive partial updates.
    $specInput = ['name' => 'Specification checks', 'hostname' => 'specs.example.test', 'purpose' => 'Manual inventory'];
    $specifications = [
        'operating_system' => 'Debian', 'os_version' => '12', 'cpu_model' => $payload,
        'cpu_cores' => 8, 'ram_mib' => 32768, 'storage_gib' => 2048,
    ];
    foreach (array_keys($specifications) as $field) {
        check($server[$field] === null, "Omitted {$field} must default to NULL.");
    }
    $specServer = $servers->create([...$specInput, ...$specifications]);
    foreach ($specifications as $field => $value) {
        check($specServer[$field] === $value, "{$field}: inserted specification must round-trip literally.");
    }
    $specServer = $servers->update($specServer['id'], ['purpose' => 'Edited inventory']);
    foreach ($specifications as $field => $value) {
        check($specServer[$field] === $value, "{$field}: unrelated partial update must preserve the specification.");
    }
    $cleared = array_fill_keys(array_keys($specifications), null);
    $specServer = $servers->update($specServer['id'], $cleared);
    foreach ($cleared as $field => $value) {
        check($specServer[$field] === null, "{$field}: specification must be clearable to NULL.");
    }
    $unknown = $servers->create([...$specInput, ...$cleared]);
    foreach ($cleared as $field => $value) {
        check($unknown[$field] === null, "{$field}: explicit NULL insert must remain unknown.");
    }
    check($servers->delete($unknown['id']), 'Unknown specification fixture cleanup failed.');
    $specServer = $servers->update($specServer['id'], $specifications);
    foreach ($specifications as $field => $value) {
        check($specServer[$field] === $value, "{$field}: updated specification must round-trip literally.");
    }
    foreach (['operating_system' => 100, 'os_version' => 100, 'cpu_model' => 160] as $field => $limit) {
        $maxText = str_repeat('é', $limit);
        $created = $servers->create([...$specInput, $field => $maxText]);
        check($created[$field] === $maxText, "{$field}: character limit must accept multibyte text.");
        check($servers->delete($created['id']), "{$field}: length fixture cleanup failed.");
        check($servers->update($specServer['id'], [$field => $padded])[$field] === $padded, "{$field}: valid Unicode padding must be preserved.");
        $unchanged = $servers->getById($specServer['id']);
        rejects(fn() => $servers->create([...$specInput, $field => str_repeat('x', $limit + 1)]), PDOException::class, 1406);
        rejects(fn() => $servers->update($specServer['id'], [$field => str_repeat('x', $limit + 1)]), PDOException::class, 1406);
        check($servers->getById($specServer['id']) === $unchanged, "{$field}: failed update must preserve values and timestamps.");
    }
    foreach (['cpu_cores' => 65535, 'ram_mib' => 4294967295, 'storage_gib' => 4294967295] as $field => $max) {
        foreach ([1, $max] as $value) {
            $created = $servers->create([...$specInput, $field => $value]);
            check($created[$field] === $value, "{$field}: valid numeric boundary must round-trip on insert.");
            check($servers->delete($created['id']), "{$field}: numeric boundary fixture cleanup failed.");
            check($servers->update($specServer['id'], [$field => $value])[$field] === $value, "{$field}: valid numeric boundary must round-trip on update.");
        }
        foreach ([[0, 3819], [-1, 1264], [$max + 1, 1264], ['invalid', 1366]] as [$invalid, $code]) {
            $unchanged = $servers->getById($specServer['id']);
            rejects(fn() => $servers->create([...$specInput, $field => $invalid]), PDOException::class, $code);
            rejects(fn() => $servers->update($specServer['id'], [$field => $invalid]), PDOException::class, $code);
            check($servers->getById($specServer['id']) === $unchanged, "{$field}: rejected numeric update must preserve values and timestamps.");
        }
        rejects(fn() => $servers->create([...$specInput, $field => 1.5]), InvalidArgumentException::class);
        rejects(fn() => $servers->update($specServer['id'], [$field => 1.5]), InvalidArgumentException::class);
    }
    check($servers->delete($specServer['id']), 'Specification fixture cleanup failed.');

    // Control this connection's clock rather than sleeping to test automatic UTC times.
    try {
        foreach ([[$servers, $specInput, 'name'], [$deployments, [...$deploymentInput, 'label' => 'timestamp-check'], 'label']] as [$dao, $input, $field]) {
            $pdo->exec('SET timestamp = ' . strtotime('2026-11-01 08:00:00 UTC') . '.123456');
            $timed = $dao->create($input);
            check($timed['created_at'] === '2026-11-01 08:00:00.123456', $dao::class . ': creation timestamp must use the UTC session clock.');
            check($timed['updated_at'] === $timed['created_at'], $dao::class . ': initial update time must equal creation time.');
            $pdo->exec('SET timestamp = ' . strtotime('2026-11-01 09:00:00 UTC') . '.654321');
            $edited = $dao->update($timed['id'], [$field => 'Timestamp edited']);
            check($edited['created_at'] === $timed['created_at'], $dao::class . ': updates must preserve creation time.');
            check($edited['updated_at'] === '2026-11-01 09:00:00.654321', $dao::class . ': changed row must receive a new UTC update time.');
            $pdo->exec('SET timestamp = ' . strtotime('2026-11-01 10:00:00 UTC') . '.999999');
            check($dao->update($timed['id'], [$field => 'Timestamp edited']) === $edited, $dao::class . ': no-op update must preserve both timestamps.');
            foreach (['created_at', 'updated_at'] as $timestamp) {
                rejects(fn() => $dao->create([...$input, $timestamp => '2000-01-01 00:00:00']), InvalidArgumentException::class);
                rejects(fn() => $dao->update($timed['id'], [$timestamp => '2000-01-01 00:00:00']), InvalidArgumentException::class);
            }
            check($dao->getById($timed['id']) === $edited, $dao::class . ': rejected timestamp writes must leave the row unchanged.');
            check($dao->delete($timed['id']), $dao::class . ': timestamp fixture cleanup failed.');
        }
    } finally {
        $pdo->exec('SET timestamp = 0');
    }

    foreach (array_map(null, $daos, [$user, $server, $app, $deployment, $task], ['name', 'name', 'name', 'label', 'title'], $before) as [$dao, $row, $field, $seedRows]) {
        check(is_int($row['id']) && $row['id'] > 0, 'Auto-increment ID must be returned.');
        check($dao->getById($row['id']) === $row, 'Created row must be readable.');
        checkList($dao, [...$seedRows, $row], $dao::class . ': created list must contain the exact rows in ID order.');
        $edited = $dao->update($row['id'], [$field => 'Edited']);
        check($edited[$field] === 'Edited', 'Partial update failed.');
        check($dao->update($row['id'], [$field => 'Edited']) === $edited, 'No-op update must still return existing row.');
        checkList($dao, [...$seedRows, $edited], $dao::class . ': updated list must contain the exact rows in ID order.');
        check($dao->getById(4294967295) === null, 'Missing read must return null.');
        check($dao->update(4294967295, [$field => 'Missing']) === null, 'Missing update must return null.');
        check(!$dao->delete(4294967295), 'Missing delete must return false.');
        rejects(fn() => $dao->create([]), InvalidArgumentException::class);
        rejects(fn() => $dao->create(['id' => 44]), InvalidArgumentException::class);
        rejects(fn() => $dao->update($row['id'], []), InvalidArgumentException::class);
        rejects(fn() => $dao->update($row['id'], ['name` = NULL; --' => 'unsafe']), InvalidArgumentException::class);
        rejects(fn() => $dao->update($row['id'], [$field => ['nested']]), InvalidArgumentException::class);
        rejects(fn() => $dao->getById(0), InvalidArgumentException::class);
        rejects(fn() => $dao->update(-1, [$field => 'bad']), InvalidArgumentException::class);
        rejects(fn() => $dao->delete(0), InvalidArgumentException::class);
    }

    // Uniqueness and foreign keys reject invalid writes without deleting history.
    rejects(fn() => $users->create(['name' => 'Duplicate', 'email' => 'DAO@example.test', 'password_hash' => $hash]), PDOException::class, 1062);
    rejects(fn() => $deployments->create([...$deploymentInput, 'label' => 'EDITED']), PDOException::class, 1062);
    $second = $deployments->create([...$deploymentInput, 'label' => 'production']);
    check($second['id'] !== $deployment['id'], 'Distinct instance labels must be allowed.');
    check($deployments->delete($second['id']), 'Unreferenced deployment delete failed.');
    rejects(fn() => $deployments->create([...$deploymentInput, 'server_id' => 4294967295]), PDOException::class, 1452);
    rejects(fn() => $deployments->create([...$deploymentInput, 'application_id' => 4294967295]), PDOException::class, 1452);
    rejects(fn() => $tasks->update($task['id'], ['assigned_user_id' => 4294967295]), PDOException::class, 1452);
    rejects(fn() => $tasks->update($task['id'], ['deployment_id' => 4294967295]), PDOException::class, 1452);
    rejects(fn() => $apps->delete($app['id']), PDOException::class, 1451);
    rejects(fn() => $servers->delete($server['id']), PDOException::class, 1451);
    rejects(fn() => $deployments->delete($deployment['id']), PDOException::class, 1451);

    // CHECK constraints must be enforced by the actual MySQL server.
    rejects(fn() => $tasks->create(['title' => 'No target']), PDOException::class, 3819);
    rejects(fn() => $tasks->update($task['id'], ['server_id' => $server['id']]), PDOException::class, 3819);
    rejects(fn() => $tasks->update($task['id'], ['deployment_id' => null]), PDOException::class, 3819);
    rejects(fn() => $tasks->update($task['id'], ['status' => 'completed']), PDOException::class, 3819);
    rejects(fn() => $tasks->update($task['id'], ['status' => 'completed', 'completed_at' => '2026-10-27 12:00:00', 'outcome' => '  ']), PDOException::class, 3819);
    $complete = $tasks->update($task['id'], ['status' => 'completed', 'completed_at' => '2026-10-27 12:00:00', 'outcome' => 'Verified']);
    check($complete['outcome'] === 'Verified', 'Completion update failed.');
    rejects(fn() => $tasks->update($task['id'], ['status' => 'open']), PDOException::class, 3819);
    $tasks->update($task['id'], ['status' => 'open', 'completed_at' => null]);
    $tasks->update($task['id'], ['server_id' => $server['id'], 'deployment_id' => null]);
    check($tasks->getById($task['id'])['deployment_id'] === null, 'Task target switch failed.');
    check($deployments->delete($deployment['id']), 'Deployment delete after retargeting failed.');
    rejects(fn() => $servers->delete($server['id']), PDOException::class, 1451);
    rejects(fn() => $apps->update($app['id'], ['github_owner' => 'owner']), PDOException::class, 3819);
    $apps->update($app['id'], ['github_owner' => 'owner', 'github_repo' => 'repo']);
    rejects(fn() => $servers->update($server['id'], ['name' => '  ']), PDOException::class, 3819);
    rejects(fn() => $servers->update($server['id'], ['notes' => str_repeat('x', 5001)]), PDOException::class, 3819);
    rejects(fn() => $users->update($user['id'], ['role' => 'superuser']), PDOException::class, 1265);
    rejects(fn() => $users->update($user['id'], ['password_hash' => '']), PDOException::class, 3819);
    rejects(fn() => $tasks->update($task['id'], ['status' => 'invalid']), PDOException::class, 1265);
    rejects(fn() => $tasks->update($task['id'], ['due_on' => '2026-02-31']), PDOException::class, 1292);
    rejects(fn() => $tasks->update($task['id'], ['due_on' => '0000-00-00']), PDOException::class, 1292);
    rejects(fn() => $servers->update($server['id'], ['name' => str_repeat('x', 81)]), PDOException::class, 1406);
    rejects(fn() => $tasks->update($task['id'], ['title' => null]), PDOException::class, 1048);

    $active = $deployments->create([...$deploymentInput, 'label' => 'version-check']);
    rejects(fn() => $deployments->update($active['id'], ['status' => 'running']), PDOException::class, 3819);
    $deployments->update($active['id'], ['status' => 'running', 'installed_version' => 'commit-arbitrary']);
    rejects(fn() => $deployments->update($active['id'], ['status' => 'healthy']), PDOException::class, 1265);
    check($deployments->delete($active['id']), 'Version-check deployment cleanup failed.');

    check($users->delete($user['id']), 'User delete failed.');
    check($tasks->getById($task['id'])['assigned_user_id'] === null, 'Deleting user must unassign, preserving task.');
    check($tasks->delete($task['id']), 'Task delete failed.');
    check($apps->delete($app['id']), 'Application delete failed.');
    check($servers->delete($server['id']), 'Server delete failed.');
    foreach (array_map(null, $daos, [$user, $server, $app, $deployment, $task], $before) as [$dao, $row, $seedRows]) {
        check($dao->getById($row['id']) === null, 'Deleted row still exists.');
        checkList($dao, $seedRows, $dao::class . ': deleted list must contain only seed rows in ID order.');
    }

    foreach (['host' => 'localhost;dbname=other', 'name' => 'test;bad', 'port' => 0] as $key => $value) {
        rejects(fn() => Database::connect([...$settings, $key => $value]), InvalidArgumentException::class);
    }

    $pdo->rollBack();
    check(array_map(fn($dao) => $dao->getAll(), $daos) === $before, 'Tests must leave sample rows unchanged.');

    // Review regressions use their own rolled-back transaction and exact seed lists.
    $pdo->beginTransaction();
    $clockMinute = 0;
    try {
        $time = advanceTestClock($pdo, $clockMinute++);
        $reviewServerInput = [
            'name' => 'Specification regression', 'hostname' => 'spec-regression.example.test', 'purpose' => 'Regression checks',
            'operating_system' => 'Linux', 'os_version' => '1', 'cpu_model' => 'CPU',
            'cpu_cores' => 1, 'ram_mib' => 1, 'storage_gib' => 1,
        ];
        $reviewServer = $servers->create($reviewServerInput);
        check($reviewServer['created_at'] === $time && $reviewServer['updated_at'] === $time, 'Server timestamps must use six-digit UTC precision.');
        checkList($servers, [...$before[1], $reviewServer], 'Created server list must retain populated specifications and timestamps.');
        foreach (['operating_system' => str_repeat('é', 100), 'os_version' => str_repeat('é', 100), 'cpu_model' => str_repeat('é', 160), 'cpu_cores' => 65535, 'ram_mib' => 4294967295, 'storage_gib' => 4294967295] as $field => $max) {
            $time = advanceTestClock($pdo, $clockMinute++);
            $expected = array_replace($reviewServer, [$field => $max, 'updated_at' => $time]);
            $reviewServer = $servers->update($reviewServer['id'], [$field => $max]);
            check($reviewServer === $expected, "{$field}: maximum update must preserve unrelated values and creation time.");
            check($servers->getById($reviewServer['id']) === $expected, "{$field}: maximum update must persist.");
            checkList($servers, [...$before[1], $reviewServer], "{$field}: updated list must preserve every specification and timestamp.");
            advanceTestClock($pdo, $clockMinute++);
            check($servers->update($reviewServer['id'], [$field => $max]) === $reviewServer, "{$field}: no-op must preserve update time.");
            $time = advanceTestClock($pdo, $clockMinute++);
            $expected = array_replace($reviewServer, [$field => null, 'updated_at' => $time]);
            $reviewServer = $servers->update($reviewServer['id'], [$field => null]);
            check($reviewServer === $expected, "{$field}: clearing one field must preserve other values and creation time.");
            checkList($servers, [...$before[1], $reviewServer], "{$field}: list must retain individually cleared specifications and timestamps.");
        }
        $time = advanceTestClock($pdo, $clockMinute++);
        $reviewDeploymentInput = ['application_id' => $before[2][0]['id'], 'server_id' => $reviewServer['id'], 'label' => 'spec-regression'];
        $reviewDeployment = $deployments->create($reviewDeploymentInput);
        check($reviewDeployment['created_at'] === $time && $reviewDeployment['updated_at'] === $time, 'Deployment timestamps must use six-digit UTC precision.');
        checkList($deployments, [...$before[3], $reviewDeployment], 'Created deployment list must preserve exact timestamps.');
        foreach ([[$servers, $reviewServerInput, $reviewServer, 'name', $before[1]], [$deployments, $reviewDeploymentInput, $reviewDeployment, 'label', $before[3]]] as [$dao, $create, $row, $field, $seeds]) {
            foreach (['created_at', 'updated_at'] as $timestamp) {
                foreach ([null, '2000-01-01 00:00:00'] as $value) {
                    advanceTestClock($pdo, $clockMinute++);
                    rejects(fn() => $dao->create([...$create, $timestamp => $value]), InvalidArgumentException::class, null, $dao::class . ": {$timestamp} INSERT");
                    rejects(fn() => $dao->update($row['id'], [$field => 'Must not be stored', $timestamp => $value]), InvalidArgumentException::class, null, $dao::class . ": mixed {$timestamp} UPDATE");
                    checkList($dao, [...$seeds, $row], $dao::class . ': rejected timestamp writes must leave every row unchanged.');
                }
            }
            advanceTestClock($pdo, $clockMinute++);
            rejects(fn() => $dao->update($row['id'], [$field => '']), PDOException::class, null, $dao::class . ': invalid text UPDATE');
            check($dao->getById($row['id']) === $row, $dao::class . ': SQL rejection with a later clock must preserve timestamps and all values.');
            checkList($dao, [...$seeds, $row], $dao::class . ': SQL rejection must leave every row unchanged.');
        }
        check($deployments->delete($reviewDeployment['id']), 'Specification regression deployment cleanup failed.');
        check($servers->delete($reviewServer['id']), 'Specification regression server cleanup failed.');
        check(array_map(fn($dao) => $dao->getAll(), $daos) === $before, 'Review regressions must preserve all five seed lists before rollback.');
        $pdo->rollBack();
        check(array_map(fn($dao) => $dao->getAll(), $daos) === $before, 'Review regression rollback must leave every seed row unchanged.');
    } finally {
        $pdo->exec('SET timestamp = 0');
    }
    echo "PASS: {$checks} MySQL DAO checks; test row changes rolled back (ID counters may advance).\n";
} catch (Throwable $error) {
    if ($pdo?->inTransaction()) {
        $pdo->rollBack();
    }
    // Avoid printing SQL, credentials or connection details, even on failure.
    fwrite(STDERR, 'FAIL: ' . ($error instanceof PDOException ? 'Database operation failed (MySQL ' . ($error->errorInfo[1] ?? 'unknown') . ').' : $error->getMessage()) . "\n");
    exit(1);
}
