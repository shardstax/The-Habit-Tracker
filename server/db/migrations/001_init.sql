-- 001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  timezone VARCHAR(64) NOT NULL,
  week_starts_on ENUM('MONDAY') NOT NULL DEFAULT 'MONDAY',
  last_daily_key VARCHAR(16) NULL,
  last_weekly_key VARCHAR(16) NULL,
  last_monthly_key VARCHAR(16) NULL,
  last_quarterly_key VARCHAR(16) NULL,
  last_half_yearly_key VARCHAR(16) NULL,
  last_yearly_key VARCHAR(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description_markdown TEXT NULL,
  horizon ENUM('DAILY','WEEKLY','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY') NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('PENDING','DONE') NOT NULL DEFAULT 'PENDING',
  period_key VARCHAR(16) NOT NULL,
  due_at_utc DATETIME NULL,
  template_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description_markdown TEXT NULL,
  horizon ENUM('DAILY','WEEKLY','MONTHLY','QUARTERLY','HALF_YEARLY','YEARLY') NOT NULL,
  priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time_local TIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_templates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @fk_tasks_template_exists := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'tasks'
    AND constraint_name = 'fk_tasks_template'
);
SET @fk_tasks_template_sql := IF(
  @fk_tasks_template_exists = 0,
  'ALTER TABLE tasks ADD CONSTRAINT fk_tasks_template FOREIGN KEY (template_id) REFERENCES recurring_task_templates(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE fk_tasks_template_stmt FROM @fk_tasks_template_sql;
EXECUTE fk_tasks_template_stmt;
DEALLOCATE PREPARE fk_tasks_template_stmt;

CREATE TABLE IF NOT EXISTS goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description_markdown TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS task_goals (
  task_id INT NOT NULL,
  goal_id INT NOT NULL,
  PRIMARY KEY (task_id, goal_id),
  CONSTRAINT fk_task_goals_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_goals_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  color VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tags_user_name (user_id, name),
  CONSTRAINT fk_tags_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tag_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tag_id INT NOT NULL,
  entity_type ENUM('TASK','JOURNAL','MINDSET') NOT NULL,
  entity_id INT NOT NULL,
  UNIQUE KEY uniq_tag_assignments (user_id, tag_id, entity_type, entity_id),
  CONSTRAINT fk_tag_assignments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tag_assignments_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_date DATE NOT NULL,
  content_markdown TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_journal_user_date (user_id, entry_date),
  CONSTRAINT fk_journal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS journal_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id INT NOT NULL,
  task_id INT NOT NULL,
  UNIQUE KEY uniq_journal_mentions (journal_entry_id, task_id),
  CONSTRAINT fk_journal_mentions_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_journal_mentions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mindset_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_markdown TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mindset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_id INT NOT NULL,
  remind_at_utc DATETIME NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reminders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reminders_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS motivation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quote TEXT NOT NULL,
  author VARCHAR(255) NULL,
  background_image_url TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS github_settings (
  user_id INT PRIMARY KEY,
  github_username VARCHAR(255) NOT NULL,
  github_token_encrypted TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_github_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS github_stats_cache (
  user_id INT PRIMARY KEY,
  fetched_at_utc DATETIME NOT NULL,
  next_allowed_refresh_at_utc DATETIME NOT NULL,
  payload_json JSON NOT NULL,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_github_cache_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @idx_tasks_user_horizon_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND index_name = 'idx_tasks_user_horizon_period'
);
SET @idx_tasks_user_horizon_sql := IF(
  @idx_tasks_user_horizon_exists = 0,
  'CREATE INDEX idx_tasks_user_horizon_period ON tasks(user_id, horizon, period_key)',
  'SELECT 1'
);
PREPARE idx_tasks_user_horizon_stmt FROM @idx_tasks_user_horizon_sql;
EXECUTE idx_tasks_user_horizon_stmt;
DEALLOCATE PREPARE idx_tasks_user_horizon_stmt;

SET @idx_tasks_user_status_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND index_name = 'idx_tasks_user_status'
);
SET @idx_tasks_user_status_sql := IF(
  @idx_tasks_user_status_exists = 0,
  'CREATE INDEX idx_tasks_user_status ON tasks(user_id, status)',
  'SELECT 1'
);
PREPARE idx_tasks_user_status_stmt FROM @idx_tasks_user_status_sql;
EXECUTE idx_tasks_user_status_stmt;
DEALLOCATE PREPARE idx_tasks_user_status_stmt;

SET @idx_tasks_user_due_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND index_name = 'idx_tasks_user_due'
);
SET @idx_tasks_user_due_sql := IF(
  @idx_tasks_user_due_exists = 0,
  'CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_at_utc)',
  'SELECT 1'
);
PREPARE idx_tasks_user_due_stmt FROM @idx_tasks_user_due_sql;
EXECUTE idx_tasks_user_due_stmt;
DEALLOCATE PREPARE idx_tasks_user_due_stmt;
