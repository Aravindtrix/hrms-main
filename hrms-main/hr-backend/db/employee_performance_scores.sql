CREATE TABLE IF NOT EXISTS employee_performance_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  category_1 INT NULL,
  category_2 INT NULL,
  category_3 INT NULL,
  category_4 INT NULL,
  category_5 INT NULL,
  period_start DATE NULL,
  period_end DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_performance_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  action VARCHAR(32) NOT NULL,
  increment_ctc DECIMAL(12,2) NULL,
  training_feedback TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_action (employee_id)
);
