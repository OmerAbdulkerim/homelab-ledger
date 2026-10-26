<?php
// Copy to local.php when implementing M2. Never commit real credentials.
return [
    'database' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'homelab_ledger',
        'username' => 'replace-me',
        'password' => 'replace-me',
    ],
    'jwt_secret' => 'replace-with-a-random-secret-in-m4',
    'github_token' => null,
];
