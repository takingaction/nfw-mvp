-- Rollback for 196_grant_cycle_exceptions.sql
DROP TABLE IF EXISTS grant_cycle_exceptions;
NOTIFY pgrst, 'reload';
