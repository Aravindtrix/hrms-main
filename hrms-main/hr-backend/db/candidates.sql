-- Migration: create candidates table linked to tickets
CREATE TABLE IF NOT EXISTS candidates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NULL,
  role_key VARCHAR(100) NULL,
  candidate_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50) NULL,
  experience_years DECIMAL(4,1) NULL,
  resume_filename VARCHAR(255) NULL,
  resume_blob LONGBLOB NULL,
  status ENUM('applied','shortlisted','interviewed','rejected','hired') DEFAULT 'applied',
  interviewer VARCHAR(100) NULL,
  notes JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ticket (ticket_id),
  INDEX idx_role (role_key)
);
