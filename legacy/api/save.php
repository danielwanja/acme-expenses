<?php
// POST save.php  Creates a draft, or saves changes to one of your expenses.
// Body: { id?, amount, currency, category, expense_date, note, receipt_path }
require __DIR__ . '/lib.php';

$CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];
$CATEGORIES = ['MEALS', 'TRAVEL', 'OFFICE', 'OTHER'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Use POST.');
$me = current_user();
$in = request_body();
$errors = [];

// --- amount -----------------------------------------------------------------
$amount = isset($in['amount']) ? trim((string)$in['amount']) : '';
if ($amount === '') {
  $errors['amount'] = 'Amount is required.';
} else {
  $amount = str_replace(',', '', $amount);
  if (!is_numeric($amount)) {
    $errors['amount'] = 'Amount must be a number.';
  } elseif ((float)$amount <= 0) {
    $errors['amount'] = 'Amount must be greater than zero.';
  }
}

// --- currency and category ----------------------------------------------------
$currency = isset($in['currency']) ? strtoupper($in['currency']) : 'USD';
if (!in_array($currency, $CURRENCIES, true)) {
  $errors['currency'] = 'Unknown currency.';
}
$category = isset($in['category']) ? strtoupper($in['category']) : '';
if (!in_array($category, $CATEGORIES, true)) {
  $errors['category'] = 'Pick a category.';
}

// --- date ---------------------------------------------------------------------
// The date picker sends YYYY-MM-DD; stored as midnight server time.
$date = isset($in['expense_date']) ? trim($in['expense_date']) : '';
if ($date === '') {
  $errors['expense_date'] = 'Date is required.';
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}/', $date)) {
  $errors['expense_date'] = 'Use a date like 2026-03-01.';
} elseif (strlen($date) === 10) {
  $date .= ' 00:00:00';
}

// --- note and receipt ---------------------------------------------------------
$note = isset($in['note']) ? trim($in['note']) : '';
if (strlen($note) > 500) {
  $errors['note'] = 'Note is too long (500 characters).';
}
$receipt = isset($in['receipt_path']) && $in['receipt_path'] !== ''
  ? $in['receipt_path'] : null;

if ($errors) {
  json_out(['error' => 'Please fix the highlighted fields.', 'fields' => $errors], 422);
}

$now = date('Y-m-d H:i:s');

// --- new draft ------------------------------------------------------------------
if (empty($in['id'])) {
  $id = (int)db()->query('SELECT COALESCE(MAX(id), 1000) + 1 FROM expenses')->fetchColumn();
  $stmt = db()->prepare(
    'INSERT INTO expenses (id, owner_id, amount, currency, category, expense_date, note,
       receipt_path, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
  $stmt->execute([$id, $me['id'], (float)$amount, $currency, $category, $date, $note,
    $receipt, $now]);
  json_out(['id' => $id, 'status' => '0', 'message' => 'Draft saved.']);
}

// --- existing expense -----------------------------------------------------------
$row = find_expense($in['id']);
if (!$row) fail(404, 'Expense not found.');
if ($row['owner_id'] !== $me['id']) fail(403, 'You can only edit your own expenses.');

$status = (int)$row['status'];
if ($status === 1 || $status === 2 || $status === 4) {
  fail(409, 'Only drafts can be edited.');
}

// Keep the old receipt unless a new one was uploaded.
if ($receipt === null) {
  $receipt = $row['receipt_path'];
}

if ($status === 3) $status = 0;

$stmt = db()->prepare(
  'UPDATE expenses SET amount = ?, currency = ?, category = ?, expense_date = ?,
     note = ?, receipt_path = ?, status = ?, updated_at = ? WHERE id = ?');
$stmt->execute([(float)$amount, $currency, $category, $date, $note, $receipt, $status,
  $now, (int)$row['id']]);

json_out(['id' => (int)$row['id'], 'status' => (string)$status, 'message' => 'Saved.']);
