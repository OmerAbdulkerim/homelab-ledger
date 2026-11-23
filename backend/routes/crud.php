<?php
declare(strict_types=1);

use flight\Engine;
use HomelabLedger\Service\CrudService;

if (!isset($app, $resources)) {
    http_response_code(404);
    return;
}

$recordId = static function (string $value): int {
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 4294967295]]);
    return $id === false || !ctype_digit($value) ? throw new DomainException('Use a valid record ID.', 400) : $id;
};

$input = static function (Engine $app): array {
    $request = $app->request();
    if (strtolower(trim(explode(';', $request->type, 2)[0])) !== 'application/json') {
        throw new DomainException('Use application/json.', 415);
    }
    try {
        $body = json_decode($request->getBody(), false, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new DomainException('Send a valid JSON object.', 400);
    }
    if (!$body instanceof stdClass) {
        throw new DomainException('Send a valid JSON object.', 400);
    }
    return (array) $body;
};

foreach ($resources as $path => $serviceClass) {
    $service = static fn(): CrudService => $makeService($serviceClass);
    $app->route('GET|POST ' . $path, function () use ($app, $input, $path, $service): void {
        if ($app->request()->method !== 'POST') {
            $app->json($service()->getAll());
            return;
        }
        $data = $input($app);
        $records = $service();
        try {
            $record = $records->create($data);
        } catch (InvalidArgumentException $error) {
            throw new DomainException($error->getMessage(), 422, $error);
        }
        $app->response()->header('Location', $path . '/' . $record['id']);
        $app->json($record, 201);
    });

    $app->route('GET|PATCH|DELETE ' . $path . '/@id', function (string $value) use ($app, $recordId, $input, $service): void {
        $id = $recordId($value);
        $method = $app->request()->method;
        $data = $method === 'PATCH' ? $input($app) : null;
        $records = $service();
        if ($method === 'DELETE') {
            if (!$records->delete($id)) {
                throw new DomainException('Record not found.', 404);
            }
            $app->json(['message' => 'Record deleted successfully.'], 200);
            return;
        }

        try {
            $record = $data === null ? $records->getById($id) : $records->update($id, $data);
        } catch (InvalidArgumentException $error) {
            throw new DomainException($error->getMessage(), 422, $error);
        }
        if ($record === null) {
            throw new DomainException('Record not found.', 404);
        }
        $app->json($record);
    });
}
