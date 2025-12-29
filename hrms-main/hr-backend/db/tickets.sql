-- Migration: create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_key VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_by VARCHAR(100) NOT NULL,
  jd_required TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('new','assigned','acknowledged','closed') NOT NULL DEFAULT 'new',
  is_read_by_hr TINYINT(1) NOT NULL DEFAULT 0,
  payload JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_role_department (role_key, department)
);
