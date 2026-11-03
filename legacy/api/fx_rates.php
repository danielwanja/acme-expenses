<?php
// GET fx_rates.php?month=2026-03  The month's rates, for the submit screen's estimate.
require __DIR__ . '/lib.php';

current_user();
$month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
$stmt = db()->prepare('SELECT currency, rate FROM fx_rates WHERE month = ?');
$stmt->execute([$month]);

$rates = ['USD' => 1];
foreach ($stmt->fetchAll() as $row) {
  $rates[$row['currency']] = (float)$row['rate'];
}
json_out(['month' => $month, 'rates' => $rates]);
