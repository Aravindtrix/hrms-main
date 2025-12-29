-- Migration: change head_result from ENUM to integer rating
ALTER TABLE candidates
  MODIFY COLUMN head_result TINYINT NULL;

-- Usage: run against your hrms_db to accept numeric ratings (1-5)
-- Example:
-- mysql -u root -p hrms_db < candidates_head_result_int.sql
