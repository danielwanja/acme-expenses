<?php
// POST reset.php  Local stub only: restore the seed data (db/seed.sql).
// Parity recordings assume the seed, so reset before you record or replay.
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Use POST.');
load_seed(db());
json_out(['reset' => true]);
