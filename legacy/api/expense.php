<?php
// GET expense.php?id=1042  One expense, as the edit screen loads it.
require __DIR__ . '/lib.php';

$me = current_user();
$row = find_expense(isset($_GET['id']) ? $_GET['id'] : 0);
if (!$row) fail(404, 'Expense not found.');

if ($row['owner_id'] !== $me['id']) {
  $stmt = db()->prepare('SELECT manager_id FROM users WHERE id = ?');
  $stmt->execute([$row['owner_id']]);
  if ($stmt->fetchColumn() !== $me['id']) fail(403, 'Not your expense.');
}

$amount = $row['amount'];
json_out([
  'id' => (int)$row['id'],
  'amount' => number_format($amount, 2),
  'currency' => $row['currency'],
  'status' => (string)$row['status'],
  'expense_date' => $row['expense_date'],
]);
