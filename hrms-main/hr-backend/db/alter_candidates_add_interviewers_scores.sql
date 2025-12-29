-- Migration: add interviewers (JSON) and head_scores (JSON) to candidates
ALTER TABLE candidates
  ADD COLUMN interviewers JSON NULL,
  ADD COLUMN head_scores JSON NULL;

-- Usage: mysql -u root -p hrms_db < alter_candidates_add_interviewers_scores.sql
