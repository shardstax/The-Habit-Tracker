-- seed.sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE github_stats_cache;
TRUNCATE TABLE github_settings;
TRUNCATE TABLE reminders;
TRUNCATE TABLE journal_mentions;
TRUNCATE TABLE tag_assignments;
TRUNCATE TABLE task_goals;
TRUNCATE TABLE journal_entries;
TRUNCATE TABLE mindset_notes;
TRUNCATE TABLE tasks;
TRUNCATE TABLE recurring_task_templates;
TRUNCATE TABLE goals;
TRUNCATE TABLE tags;
TRUNCATE TABLE motivation_items;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users
  (name, email, password_hash, timezone, week_starts_on, last_daily_key, last_weekly_key, last_monthly_key, last_quarterly_key, last_half_yearly_key, last_yearly_key, created_at, updated_at)
VALUES
  ('Demo User', 'demo@example.com', '{{DEMO_PASSWORD_HASH}}', 'America/New_York', 'MONDAY', NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-21 08:00:00', '2026-02-21 08:00:00');

INSERT INTO goals (user_id, title, description_markdown, created_at, updated_at) VALUES
  (1, 'Health Momentum', 'Build consistent habits around movement, sleep, and nutrition.', '2026-02-21 08:05:00', '2026-02-21 08:05:00'),
  (1, 'Career Growth', 'Sharpen engineering craft and ship visible wins.', '2026-02-21 08:05:00', '2026-02-21 08:05:00');

INSERT INTO tags (user_id, name, color, created_at) VALUES
  (1, 'work', '#2F6BFF', '2026-02-21 08:10:00'),
  (1, 'health', '#13A36A', '2026-02-21 08:10:00'),
  (1, 'mindset', '#F59E0B', '2026-02-21 08:10:00');

INSERT INTO recurring_task_templates
  (user_id, title, description_markdown, horizon, priority, is_active, start_date, end_date, reminder_enabled, reminder_time_local, created_at, updated_at)
VALUES
  (1, 'Morning walk', '20 minutes outdoors.', 'DAILY', 'MEDIUM', TRUE, '2026-01-01', NULL, TRUE, '07:30:00', '2026-02-21 08:15:00', '2026-02-21 08:15:00'),
  (1, 'Weekly review', 'Review wins, blockers, and next steps.', 'WEEKLY', 'HIGH', TRUE, '2026-01-01', NULL, FALSE, NULL, '2026-02-21 08:15:00', '2026-02-21 08:15:00');

INSERT INTO tasks
  (user_id, title, description_markdown, horizon, priority, status, period_key, due_at_utc, template_id, created_at, updated_at)
VALUES
  (1, 'Plan today''s top 3', 'List the three most important outcomes.', 'DAILY', 'HIGH', 'PENDING', '2026-02-21', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Write a status update', 'Share progress with the team.', 'DAILY', 'MEDIUM', 'DONE', '2026-02-21', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Weekly review', 'Review wins, blockers, and next steps.', 'WEEKLY', 'HIGH', 'PENDING', '2026-W08', NULL, 2, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Ship a learning note', 'Summarize one lesson from this week.', 'WEEKLY', 'MEDIUM', 'PENDING', '2026-W08', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Monthly reflection', 'What improved and what needs focus?', 'MONTHLY', 'MEDIUM', 'PENDING', '2026-02', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Quarterly roadmap', 'Define 3 outcomes for the quarter.', 'QUARTERLY', 'HIGH', 'PENDING', '2026-Q1', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Half-year audit', 'Check progress and adjust goals.', 'HALF_YEARLY', 'MEDIUM', 'PENDING', '2026-H1', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00'),
  (1, 'Yearly vision', 'Write a one-page vision for the year.', 'YEARLY', 'HIGH', 'PENDING', '2026', NULL, NULL, '2026-02-21 08:20:00', '2026-02-21 08:20:00');

INSERT INTO task_goals (task_id, goal_id) VALUES
  (1, 2),
  (3, 2),
  (5, 2),
  (6, 2),
  (2, 1);

INSERT INTO journal_entries
  (user_id, entry_date, content_markdown, created_at, updated_at)
VALUES
  (1, '2026-02-21', 'Today I focused on deep work and a calm pace. @[Plan today''s top 3](task:1)', '2026-02-21 19:00:00', '2026-02-21 19:00:00');

INSERT INTO journal_mentions (journal_entry_id, task_id) VALUES
  (1, 1);

INSERT INTO mindset_notes (user_id, title, content_markdown, created_at, updated_at) VALUES
  (1, 'Daily grounding', 'Breathe, reset posture, then start.', '2026-02-21 09:00:00', '2026-02-21 09:00:00');

INSERT INTO tag_assignments (user_id, tag_id, entity_type, entity_id) VALUES
  (1, 1, 'TASK', 1),
  (1, 1, 'TASK', 2),
  (1, 2, 'TASK', 1),
  (1, 3, 'MINDSET', 1),
  (1, 2, 'JOURNAL', 1);

INSERT INTO motivation_items (quote, author, background_image_url, created_at) VALUES
  ('Small steps add up to massive change.', 'Unknown', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429', '2026-02-21 08:00:00'),
  ('Consistency beats intensity when intensity is inconsistent.', 'Unknown', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', '2026-02-21 08:00:00'),
  ('Start where you are. Use what you have. Do what you can.', 'Arthur Ashe', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e', '2026-02-21 08:00:00'),
  ('Clarity comes from action.', 'Marie Forleo', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e', '2026-02-21 08:00:00'),
  ('Keep your eyes on the horizon, feet on the ground.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Momentum is built in ordinary days.', 'Unknown', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', '2026-02-21 08:00:00'),
  ('Progress is a practice.', 'Unknown', 'https://images.unsplash.com/photo-1435777940218-be0b632d06db', '2026-02-21 08:00:00'),
  ('Do the next right thing.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Energy follows focus.', 'Unknown', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '2026-02-21 08:00:00'),
  ('Choose the pace you can sustain.', 'Unknown', 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c', '2026-02-21 08:00:00'),
  ('Discipline is remembering what you want.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Make it simple, make it repeatable.', 'Unknown', 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c', '2026-02-21 08:00:00'),
  ('A calm mind can move mountains.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Decide, commit, repeat.', 'Unknown', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '2026-02-21 08:00:00'),
  ('Let today be the day you show up.', 'Unknown', 'https://images.unsplash.com/photo-1435777940218-be0b632d06db', '2026-02-21 08:00:00'),
  ('One focused hour beats a day of distraction.', 'Unknown', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e', '2026-02-21 08:00:00'),
  ('Trade busy for meaningful.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Choose your hard.', 'Unknown', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '2026-02-21 08:00:00'),
  ('Compound your habits.', 'Unknown', 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c', '2026-02-21 08:00:00'),
  ('Stay close to the work.', 'Unknown', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', '2026-02-21 08:00:00'),
  ('Make time for what matters.', 'Unknown', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee', '2026-02-21 08:00:00'),
  ('The plan is a compass, not a cage.', 'Unknown', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '2026-02-21 08:00:00'),
  ('Keep the promises you make to yourself.', 'Unknown', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e', '2026-02-21 08:00:00'),
  ('Practice the basics relentlessly.', 'Unknown', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', '2026-02-21 08:00:00'),
  ('Today is a good day to start.', 'Unknown', 'https://images.unsplash.com/photo-1435777940218-be0b632d06db', '2026-02-21 08:00:00'),
  ('Focus is a force multiplier.', 'Unknown', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', '2026-02-21 08:00:00'),
  ('Show up for future you.', 'Unknown', 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c', '2026-02-21 08:00:00'),
  ('Simple beats complex when done daily.', 'Unknown', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa', '2026-02-21 08:00:00'),
  ('Your habits write your story.', 'Unknown', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e', '2026-02-21 08:00:00'),
  ('Do fewer things better.', 'Unknown', 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429', '2026-02-21 08:00:00');

INSERT INTO github_settings (user_id, github_username, github_token_encrypted, created_at, updated_at) VALUES
  (1, 'octocat', NULL, '2026-02-21 08:00:00', '2026-02-21 08:00:00');
