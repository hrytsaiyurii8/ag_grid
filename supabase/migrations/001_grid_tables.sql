-- Run in Supabase SQL Editor (Dashboard -> SQL -> New query)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_fields (
  table_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  definition JSONB NOT NULL,
  PRIMARY KEY (table_id, sort_order)
);

CREATE TABLE IF NOT EXISTS dataset_rows (
  table_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  sku TEXT,
  name TEXT,
  category TEXT,
  region TEXT,
  supplier TEXT,
  price NUMERIC,
  stock NUMERIC,
  rating NUMERIC,
  active BOOLEAN,
  search_text TEXT,
  PRIMARY KEY (table_id, row_index)
) PARTITION BY LIST (table_id);

CREATE TABLE IF NOT EXISTS dataset_rows_simulation PARTITION OF dataset_rows FOR VALUES IN ('simulation');
CREATE TABLE IF NOT EXISTS dataset_rows_default PARTITION OF dataset_rows DEFAULT;

CREATE INDEX IF NOT EXISTS idx_dataset_rows_table_row ON dataset_rows(table_id, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_data_gin ON dataset_rows USING GIN (data jsonb_path_ops);

-- Typed indexes for fields used by AG Grid filters, grouping, and sorting.
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_sku ON dataset_rows_simulation (sku, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_name ON dataset_rows_simulation (name, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_category ON dataset_rows_simulation (category, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_region ON dataset_rows_simulation (region, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_supplier ON dataset_rows_simulation (supplier, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_price ON dataset_rows_simulation (price, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_stock ON dataset_rows_simulation (stock, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_rating ON dataset_rows_simulation (rating, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_active ON dataset_rows_simulation (active, row_index);

-- Trigram indexes accelerate contains/quick-search patterns such as ILIKE '%desk%'.
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_name_trgm ON dataset_rows_simulation USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_supplier_trgm ON dataset_rows_simulation USING GIN (supplier gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_search_trgm ON dataset_rows_simulation USING GIN (search_text gin_trgm_ops);

-- RLS is not enabled here. If you enabled RLS manually, run 002_disable_rls_for_service.sql
-- so seeding can INSERT rows (anon key + SELECT-only policies cause "tables exist but no rows").
