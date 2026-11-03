<?php
// POST submit.php  Sends one of your drafts to your manager.
// Body: { id }
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Use POST.');
$me = current_user();
$in = request_body();
$row = find_expense(isset($in['id']) ? $in['id'] : 0);
if (!$row) fail(404, 'Expense not found.');
if ($row['owner_id'] !== $me['id']) fail(403, 'You can only submit your own expenses.');
if ((int)$row['status'] !== 0) fail(409, 'Only drafts can be submitted.');

if ($row['amount'] > 75 && empty($row['receipt_path'])) {
  fail(422, 'Expenses over 75.00 need a receipt.');
}

$stmt = db()->prepare('UPDATE expenses SET status = 1, updated_at = ? WHERE id = ?');
$stmt->execute([date('Y-m-d H:i:s'), (int)$row['id']]);
json_out(['id' => (int)$row['id'], 'status' => '1']);
