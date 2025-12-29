-- Migration: allow role_key to be NULL (so we can store role_id only)
ALTER TABLE tickets
  MODIFY COLUMN role_key VARCHAR(100) NULL;

-- Optional: if you want to enforce uniqueness by role_id+department instead of role_key+department,
-- consider updating/removing the existing unique key `uq_role_department`.
-- Example to drop the old unique key (uncomment to use):
-- ALTER TABLE tickets DROP INDEX uq_role_department;

-- And to add a new unique key on (role_id, department) (if desired):
-- ALTER TABLE tickets ADD UNIQUE KEY uq_roleid_department (role_id, department);
