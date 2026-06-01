-- Converts an existing row table into one table_id-partitioned simulation section
-- and adds typed indexed columns for high-speed AG Grid filtering, sorting, and search.
--
-- Run this after 001_grid_tables.sql if dataset_rows was created before
-- partitioning/indexing was added. After running this, run npm run seed so the
-- indexed columns are populated for all 200,000 simulation rows.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  is_partitioned BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_partitioned_table pt
    JOIN pg_class c ON c.oid = pt.partrelid
    WHERE c.relname = 'dataset_rows'
  ) INTO is_partitioned;

  IF NOT is_partitioned THEN
    IF to_regclass('public.dataset_rows_unpartitioned_backup') IS NOT NULL THEN
      RAISE EXCEPTION 'dataset_rows_unpartitioned_backup already exists. Review or drop it before rerunning this migration.';
    END IF;

    ALTER TABLE dataset_rows RENAME TO dataset_rows_unpartitioned_backup;
    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.dataset_rows_unpartitioned_backup'::regclass
        AND conname = 'dataset_rows_pkey'
    ) THEN
      ALTER TABLE dataset_rows_unpartitioned_backup
        RENAME CONSTRAINT dataset_rows_pkey TO dataset_rows_unpartitioned_backup_pkey;
    END IF;

    CREATE TABLE dataset_rows (
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

    CREATE TABLE dataset_rows_simulation PARTITION OF dataset_rows FOR VALUES IN ('simulation');
    CREATE TABLE dataset_rows_default PARTITION OF dataset_rows DEFAULT;

    INSERT INTO dataset_rows (
      table_id,
      row_index,
      data,
      sku,
      name,
      category,
      region,
      supplier,
      price,
      stock,
      rating,
      active,
      search_text
    )
    SELECT
      table_id,
      row_index,
      data,
      data->>'sku',
      data->>'name',
      data->>'category',
      data->>'region',
      data->>'supplier',
      NULLIF(data->>'price', '')::numeric,
      NULLIF(data->>'stock', '')::numeric,
      NULLIF(data->>'rating', '')::numeric,
      NULLIF(data->>'active', '')::boolean,
      lower(concat_ws(' ', data->>'sku', data->>'name', data->>'category', data->>'region', data->>'supplier'))
    FROM dataset_rows_unpartitioned_backup;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS dataset_rows_simulation PARTITION OF dataset_rows FOR VALUES IN ('simulation');
CREATE TABLE IF NOT EXISTS dataset_rows_default PARTITION OF dataset_rows DEFAULT;

DROP TABLE IF EXISTS dataset_rows_products;
DROP TABLE IF EXISTS dataset_rows_employees;
DROP TABLE IF EXISTS dataset_rows_customers;
DROP TABLE IF EXISTS dataset_rows_orders;
DROP TABLE IF EXISTS dataset_rows_projects;
DROP TABLE IF EXISTS dataset_rows_inventory;
DROP TABLE IF EXISTS dataset_rows_tickets;
DROP TABLE IF EXISTS dataset_rows_transactions;

ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS stock NUMERIC;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS active BOOLEAN;
ALTER TABLE dataset_rows ADD COLUMN IF NOT EXISTS search_text TEXT;

UPDATE dataset_rows
SET
  sku = data->>'sku',
  name = data->>'name',
  category = data->>'category',
  region = data->>'region',
  supplier = data->>'supplier',
  price = NULLIF(data->>'price', '')::numeric,
  stock = NULLIF(data->>'stock', '')::numeric,
  rating = NULLIF(data->>'rating', '')::numeric,
  active = NULLIF(data->>'active', '')::boolean,
  search_text = lower(concat_ws(' ', data->>'sku', data->>'name', data->>'category', data->>'region', data->>'supplier'))
WHERE table_id = 'simulation';

CREATE INDEX IF NOT EXISTS idx_dataset_rows_table_row ON dataset_rows(table_id, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_data_gin ON dataset_rows USING GIN (data jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_sku ON dataset_rows_simulation (sku, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_name ON dataset_rows_simulation (name, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_category ON dataset_rows_simulation (category, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_region ON dataset_rows_simulation (region, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_supplier ON dataset_rows_simulation (supplier, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_price ON dataset_rows_simulation (price, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_stock ON dataset_rows_simulation (stock, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_rating ON dataset_rows_simulation (rating, row_index);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_active ON dataset_rows_simulation (active, row_index);

CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_name_trgm ON dataset_rows_simulation USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_supplier_trgm ON dataset_rows_simulation USING GIN (supplier gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dataset_rows_simulation_search_trgm ON dataset_rows_simulation USING GIN (search_text gin_trgm_ops);

ANALYZE dataset_rows;
