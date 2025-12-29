-- Migration: convert candidates.role_key from VARCHAR to INT to store role id
ALTER TABLE candidates
  MODIFY COLUMN role_key INT NULL;

-- Usage: mysql -u root -p hrms_db < alter_candidates_rolekey_to_int.sql
