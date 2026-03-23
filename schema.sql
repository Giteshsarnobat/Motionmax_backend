-- ═══════════════════════════════════════════════════════════
--   JWT Auth App — MySQL Schema
--   Run this file once to set up all tables
-- ═══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS jwt_auth_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jwt_auth_db;

-- ─── 1. USERS (Signup) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)      NOT NULL,
  mobile        VARCHAR(15)       NOT NULL UNIQUE,
  email         VARCHAR(191)      NOT NULL UNIQUE,
  password      VARCHAR(255)      NOT NULL,          -- bcrypt hash
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active     TINYINT(1)        NOT NULL DEFAULT 1,
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email  (email),
  INDEX idx_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. REFRESH TOKENS (secure token rotation) ───────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED      NOT NULL,
  token         TEXT              NOT NULL,
  expires_at    DATETIME          NOT NULL,
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. CONTACTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)      NOT NULL,
  email         VARCHAR(191)      NOT NULL,
  mobile        VARCHAR(15)       NOT NULL,
  subject       VARCHAR(255)      NOT NULL,
  message       TEXT              NOT NULL,
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1)        NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
