-- Acme Expenses (legacy), MySQL 5.7 schema.
-- The local stub runs these same statements on SQLite (see api/lib.php).

CREATE TABLE users (
  id          VARCHAR(32)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(16)  NOT NULL,          -- 'employee' or 'manager'
  manager_id  VARCHAR(32)  NULL               -- top managers point at themselves
);

CREATE TABLE expenses (
  id                INTEGER      PRIMARY KEY,
  owner_id          VARCHAR(32)  NOT NULL,
  amount            FLOAT        NOT NULL,    -- major units, e.g. 19.99
  currency          CHAR(3)      NOT NULL,
  category          VARCHAR(32)  NOT NULL,
  expense_date      DATETIME     NOT NULL,    -- server local time
  note              TEXT         NULL,
  receipt_path      VARCHAR(255) NULL,
  status            TINYINT      NOT NULL DEFAULT 0,
                                              -- 0 draft, 1 submitted, 2 approved,
                                              -- 3 rejected, 4 exported
  amount_usd        FLOAT        NULL,        -- set at approval
  approved_by       VARCHAR(32)  NULL,
  approved_at       DATETIME     NULL,
  rejection_reason  VARCHAR(255) NULL,
  updated_at        DATETIME     NULL
);

CREATE TABLE fx_rates (
  month     CHAR(7)  NOT NULL,                -- '2026-03'
  currency  CHAR(3)  NOT NULL,
  rate      FLOAT    NOT NULL,                -- USD per one unit
  PRIMARY KEY (month, currency)
);
