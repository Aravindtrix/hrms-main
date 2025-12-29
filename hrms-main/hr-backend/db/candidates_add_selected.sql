-- Migration: add 'selected' to candidates.status enum
ALTER TABLE candidates
  MODIFY COLUMN status ENUM('applied','shortlisted','interviewed','selected','rejected','hired') DEFAULT 'applied';

-- Note: run this against your `hrms_db` database. Example:
-- mysql -u root -p hrms_db < candidates_add_selected.sql
