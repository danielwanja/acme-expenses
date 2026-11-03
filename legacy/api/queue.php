<?php
// GET queue.php  Submitted expenses waiting for the signed-in manager.
require __DIR__ . '/lib.php';

$me = current_user();
if ($me['role'] !== 'manager') fail(403, 'Only managers have an approval queue.');

$stmt = db()->prepare(
  'SELECT e.id, e.owner_id, u.name AS owner_name, e.amount, e.currency, e.category,
          e.expense_date, e.note, e.receipt_path
     FROM expenses e JOIN users u ON u.id = e.owner_id
    WHERE e.status = 1 AND u.manager_id = ?
    ORDER BY e.expense_date, e.id');
$stmt->execute([$me['id']]);

$rows = [];
foreach ($stmt->fetchAll() as $row) {
  $row['id'] = (int)$row['id'];
  $row['amount'] = number_format($row['amount'], 2);
  $rows[] = $row;
}
json_out(['me' => $me['id'], 'items' => $rows]);
