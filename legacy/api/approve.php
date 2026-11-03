<?php
// POST approve.php  A manager approves or rejects a submitted expense.
// Body: { id, action: "approve" | "reject", reason? }
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Use POST.');
$me = current_user();
if ($me['role'] !== 'manager') fail(403, 'Only managers can approve expenses.');

$in = request_body();
$row = find_expense(isset($in['id']) ? $in['id'] : 0);
if (!$row) fail(404, 'Expense not found.');
if ((int)$row['status'] !== 1) fail(409, 'Only submitted expenses can be approved.');

$stmt = db()->prepare('SELECT manager_id FROM users WHERE id = ?');
$stmt->execute([$row['owner_id']]);
if ($stmt->fetchColumn() !== $me['id']) fail(403, 'This expense is not from your team.');

$action = isset($in['action']) ? $in['action'] : 'approve';
$now = date('Y-m-d H:i:s');

if ($action === 'reject') {
  $reason = isset($in['reason']) ? trim($in['reason']) : '';
  if ($reason === '') fail(422, 'Give a reason for the rejection.');
  $stmt = db()->prepare(
    'UPDATE expenses SET status = 3, rejection_reason = ?, updated_at = ? WHERE id = ?');
  $stmt->execute([$reason, $now, (int)$row['id']]);
  json_out(['id' => (int)$row['id'], 'status' => '3']);
}

// Convert at approval with the month's rate (fx_rates is loaded by Finance).
$usd = (float)$row['amount'];
if ($row['currency'] !== 'USD') {
  $stmt = db()->prepare('SELECT rate FROM fx_rates WHERE month = ? AND currency = ?');
  $stmt->execute([substr($row['expense_date'], 0, 7), $row['currency']]);
  $rate = $stmt->fetchColumn();
  if ($rate === false) fail(409, 'No exchange rate for that month yet.');
  $usd = round($usd * $rate, 2);
}

$stmt = db()->prepare(
  'UPDATE expenses SET status = 2, amount_usd = ?, approved_by = ?, approved_at = ?,
     updated_at = ? WHERE id = ?');
$stmt->execute([$usd, $me['id'], $now, $now, (int)$row['id']]);
json_out(['id' => (int)$row['id'], 'status' => '2']);
