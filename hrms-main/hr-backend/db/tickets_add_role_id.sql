-- Migration: add role_id to tickets
ALTER TABLE tickets
  ADD COLUMN role_id INT NULL AFTER role_key;
