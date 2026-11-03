<?php
// GET expenses.php  The signed-in user's expenses, newest first.
require __DIR__ . '/lib.php';

$me = current_user();
$stmt = db()->prepare(
  'SELECT id, amount, currency, category, expense_date, note, receipt_path, status,
          rejection_reason
     FROM expenses WHERE owner_id = ? ORDER BY expense_date DESC, id DESC');
$stmt->execute([$me['id']]);

$rows = [];
foreach ($stmt->fetchAll() as $row) {
  $row['id'] = (int)$row['id'];
  $row['amount'] = number_format($row['amount'], 2);
  $row['status'] = (string)$row['status'];
  $rows[] = $row;
}
json_out($rows);
