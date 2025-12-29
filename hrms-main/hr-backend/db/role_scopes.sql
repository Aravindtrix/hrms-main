-- Migration: create role_scopes table and seed default 5 scopes per existing role
CREATE TABLE IF NOT EXISTS role_scopes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_id INT UNSIGNED NOT NULL,
  label VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_role (role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Seed default scopes for existing roles (if any)
INSERT INTO role_scopes (role_id, label, sort_order)
SELECT r.id, 'Technical Skills', 1 FROM roles r;
INSERT INTO role_scopes (role_id, label, sort_order)
SELECT r.id, 'Problem Solving', 2 FROM roles r;
INSERT INTO role_scopes (role_id, label, sort_order)
SELECT r.id, 'Communication', 3 FROM roles r;
INSERT INTO role_scopes (role_id, label, sort_order)
SELECT r.id, 'Team Fit', 4 FROM roles r;
INSERT INTO role_scopes (role_id, label, sort_order)
SELECT r.id, 'Leadership', 5 FROM roles r;

-- Usage: mysql -u root -p hrms_db < role_scopes.sql
