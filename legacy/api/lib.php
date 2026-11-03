<?php
// Shared helpers for every endpoint. Production ran on MySQL 5.7; the local
// stub runs the same schema on SQLite so the app starts with `php -S`.

function db() {
  static $pdo = null;
  if ($pdo) return $pdo;
  $file = getenv('LEGACY_DB') ?: sys_get_temp_dir() . '/acme-legacy.sqlite';
  $fresh = !file_exists($file);
  $pdo = new PDO('sqlite:' . $file);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  if ($fresh) load_seed($pdo);
  return $pdo;
}

function load_seed($pdo) {
  foreach (['users', 'expenses', 'fx_rates'] as $table) {
    $pdo->exec("DROP TABLE IF EXISTS $table");
  }
  $pdo->exec(file_get_contents(__DIR__ . '/../db/schema.sql'));
  $pdo->exec(file_get_contents(__DIR__ . '/../db/seed.sql'));
}

// The old app trusted a header set by the corporate proxy.
function current_user() {
  $id = isset($_SERVER['HTTP_X_LEGACY_USER']) ? $_SERVER['HTTP_X_LEGACY_USER'] : '';
  $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
  $stmt->execute([$id]);
  $user = $stmt->fetch();
  if (!$user) fail(401, 'Please sign in.');
  return $user;
}

function find_expense($id) {
  $stmt = db()->prepare('SELECT * FROM expenses WHERE id = ?');
  $stmt->execute([(int)$id]);
  return $stmt->fetch();
}

function request_body() {
  $data = json_decode(file_get_contents('php://input'), true);
  return is_array($data) ? $data : [];
}

function json_out($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function fail($code, $message) {
  json_out(['error' => $message], $code);
}
