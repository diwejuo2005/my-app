-- Accounts. Login (email codes, sessions) and profile fields (city,
-- timezone, ...) arrive in later migrations, as each feature moves over
-- from Firebase.
CREATE TABLE users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  name       text        NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Emails are case-insensitive in practice: Ada@x.com and ada@x.com must be
-- the same account, so uniqueness is enforced on the lowercased value.
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
