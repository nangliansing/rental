export const MIGRATION_COLLECTION = "database_migrations";
export const MIGRATION_LOCK_COLLECTION = "database_migration_locks";
export const MIGRATION_LOCK_ID = "database-migrations";

export const MIGRATION_STATUSES = Object.freeze({
  APPLIED: "APPLIED",
  FAILED: "FAILED",
  RUNNING: "RUNNING",
});
