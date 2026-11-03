-- Seed data for the local stub. POST /api/reset.php restores it.

INSERT INTO users (id, name, role, manager_id) VALUES
  ('max',  'Max Ortiz',  'manager',  'max'),
  ('lee',  'Lee Park',   'manager',  'lee'),
  ('erin', 'Erin Shaw',  'employee', 'max'),
  ('sam',  'Sam Rivera', 'employee', 'max'),
  ('zoe',  'Zoe Tran',   'employee', 'lee');

INSERT INTO expenses (id, owner_id, amount, currency, category, expense_date, note,
  receipt_path, status, amount_usd, approved_by, approved_at, rejection_reason, updated_at)
VALUES
  (1040, 'erin', 42.5,    'USD', 'MEALS',  '2026-02-27 00:00:00', 'Team lunch',
   NULL, 2, 42.5, 'max', '2026-02-28 09:12:00', NULL, '2026-02-28 09:12:00'),
  (1041, 'erin', 19.99,   'USD', 'OFFICE', '2026-02-28 00:00:00', 'Notebooks',
   NULL, 0, NULL, NULL, NULL, NULL, '2026-02-28 10:00:00'),
  (1042, 'erin', 1234.5,  'USD', 'TRAVEL', '2026-03-01 00:00:00', 'Hotel, 3 nights',
   'receipts/1042.pdf', 0, NULL, NULL, NULL, 'Missing receipt', '2026-03-03 16:40:00'),
  (1043, 'erin', 310,     'USD', 'TRAVEL', '2026-03-02 00:00:00', 'Train to Denver',
   NULL, 3, NULL, NULL, NULL, 'Book the cheaper fare', '2026-03-04 11:05:00'),
  (1044, 'erin', 64.2,    'USD', 'MEALS',  '2026-03-03 00:00:00', 'Client dinner',
   NULL, 1, NULL, NULL, NULL, NULL, '2026-03-03 21:00:00'),
  (1045, 'sam',  89.99,   'EUR', 'MEALS',  '2026-03-04 00:00:00', 'Berlin offsite lunch',
   'receipts/1045.jpg', 1, NULL, NULL, NULL, NULL, '2026-03-05 08:30:00'),
  (1046, 'max',  2750,    'USD', 'TRAVEL', '2026-03-05 00:00:00', 'Conference flight',
   'receipts/1046.pdf', 1, NULL, NULL, NULL, NULL, '2026-03-05 14:00:00'),
  (1047, 'sam',  0.01,    'USD', 'OFFICE', '2026-03-06 00:00:00', 'Rounding test',
   NULL, 0, NULL, NULL, NULL, NULL, '2026-03-06 09:00:00'),
  (1048, 'sam',  1500,    'GBP', 'TRAVEL', '2026-03-07 00:30:00', 'Red-eye to London',
   'receipts/1048.pdf', 1, NULL, NULL, NULL, NULL, '2026-03-07 07:15:00'),
  (1049, 'zoe',  120,     'USD', 'MEALS',  '2026-03-08 00:00:00', 'Workshop catering',
   'receipts/1049.jpg', 1, NULL, NULL, NULL, NULL, '2026-03-08 18:00:00');

INSERT INTO fx_rates (month, currency, rate) VALUES
  ('2026-02', 'EUR', 1.0791), ('2026-02', 'GBP', 1.2644), ('2026-02', 'JPY', 0.0067),
  ('2026-03', 'EUR', 1.0842), ('2026-03', 'GBP', 1.2710), ('2026-03', 'JPY', 0.0068);
