<?php
declare(strict_types=1);

// Copy to local.php and fill in local credentials. Never commit real credentials.
return [
    'database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'homelab_ledger',
        'username' => 'replace-me',
        'password' => 'replace-me',
    ],
    // Import the SQL into this separate database before running tests/dao.php.
    // Use a separate account with access only to the test database.
    'test_database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'homelab_ledger_test',
        'username' => 'replace-me-test',
        'password' => 'replace-me',
    ],
    'jwt_secret' => 'replace-with-a-random-secret-in-m4',
    'github_token' => null,
];
