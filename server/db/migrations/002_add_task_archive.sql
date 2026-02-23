SET @tasks_archived_col_exists := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND column_name = 'archived_at_utc'
);
SET @tasks_archived_col_sql := IF(
  @tasks_archived_col_exists = 0,
  'ALTER TABLE tasks ADD COLUMN archived_at_utc DATETIME NULL AFTER updated_at',
  'SELECT 1'
);
PREPARE tasks_archived_col_stmt FROM @tasks_archived_col_sql;
EXECUTE tasks_archived_col_stmt;
DEALLOCATE PREPARE tasks_archived_col_stmt;

SET @tasks_archived_idx_exists := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'tasks'
    AND index_name = 'idx_tasks_user_archived'
);
SET @tasks_archived_idx_sql := IF(
  @tasks_archived_idx_exists = 0,
  'CREATE INDEX idx_tasks_user_archived ON tasks (user_id, archived_at_utc)',
  'SELECT 1'
);
PREPARE tasks_archived_idx_stmt FROM @tasks_archived_idx_sql;
EXECUTE tasks_archived_idx_stmt;
DEALLOCATE PREPARE tasks_archived_idx_stmt;
