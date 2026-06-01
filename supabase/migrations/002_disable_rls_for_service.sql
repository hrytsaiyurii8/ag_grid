-- API uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). If you used the anon key by mistake,
-- inserts fail while SELECT still works — this matches "tables exist but have no rows".
-- Safe for this demo: disable RLS so seeding works with any server key configuration.

ALTER TABLE IF EXISTS datasets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dataset_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dataset_rows DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dataset_rows_simulation DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dataset_rows_default DISABLE ROW LEVEL SECURITY;
