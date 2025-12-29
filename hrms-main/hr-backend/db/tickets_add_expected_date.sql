-- Migration: add expected_date to tickets
ALTER TABLE tickets
  ADD COLUMN expected_date DATE NULL AFTER payload;
