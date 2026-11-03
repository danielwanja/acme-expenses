<?php
// GET export.php   Approved expenses as CSV for the accounting system.
// POST export.php  Marks every approved expense as exported.
require __DIR__ . '/lib.php';

$me = current_user();
if ($me['role'] !== 'manager') fail(403, 'Only managers can export.');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $count = db()->exec("UPDATE expenses SET status = 4, updated_at = datetime('now')
                        WHERE status = 2");
  json_out(['exported' => $count]);
}

header('Content-Type: text/csv');
echo "id,owner,date,currency,amount,amount_usd\n";
$rows = db()->query('SELECT * FROM expenses WHERE status = 2 ORDER BY approved_at, id');
foreach ($rows as $row) {
  echo implode(',', [$row['id'], $row['owner_id'], substr($row['expense_date'], 0, 10),
    $row['currency'], $row['amount'], $row['amount_usd']]) . "\n";
}
