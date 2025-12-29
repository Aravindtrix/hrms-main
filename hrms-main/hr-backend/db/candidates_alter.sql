-- Migration: extend candidates table with HR/Head workflow fields
ALTER TABLE candidates
  ADD COLUMN hr_marks DECIMAL(5,2) NULL,
  ADD COLUMN head_result ENUM('selected','rejected','on-hold') NULL,
  ADD COLUMN head_feedback TEXT NULL,
  ADD COLUMN head_notified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN hr_notified TINYINT(1) NOT NULL DEFAULT 0;
