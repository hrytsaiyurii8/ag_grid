import { dynamicTableDatasets } from '../src/data/dynamicTableDatasets.js'
import { MIN_ROWS_PER_TABLE, SEED_ROWS_PER_TABLE } from '../shared/constants.js'
import { clearQueryMetadataCache, getTableRowCount } from './queryRows.js'
import { getSupabase } from './supabase.js'

const INSERT_BATCH = 500
const SEARCH_FIELDS = ['sku', 'name', 'category', 'region', 'supplier'] as const

function textValue(row: Record<string, unknown>, key: string): string | null {
  const value = row[key]
  if (value == null || value === '') return null
  return String(value)
}

function numericValue(row: Record<string, unknown>, key: string): number | null {
  const value = Number(row[key])
  return Number.isFinite(value) ? value : null
}

function booleanValue(row: Record<string, unknown>, key: string): boolean | null {
  const value = row[key]
  return typeof value === 'boolean' ? value : null
}

function searchText(row: Record<string, unknown>): string {
  return SEARCH_FIELDS
    .map((field) => textValue(row, field))
    .filter((value): value is string => value != null)
    .join(' ')
    .toLowerCase()
}

function indexedRowColumns(row: Record<string, unknown>) {
  return {
    sku: textValue(row, 'sku'),
    name: textValue(row, 'name'),
    category: textValue(row, 'category'),
    region: textValue(row, 'region'),
    supplier: textValue(row, 'supplier'),
    price: numericValue(row, 'price'),
    stock: numericValue(row, 'stock'),
    rating: numericValue(row, 'rating'),
    active: booleanValue(row, 'active'),
    search_text: searchText(row),
  }
}

function expandRows(
  template: Record<string, unknown>[],
  targetCount: number,
): Record<string, unknown>[] {
  if (!template.length) return []
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < targetCount; i++) {
    const base = template[i % template.length]
    const copy = { ...base }
    for (const key of Object.keys(copy)) {
      const v = copy[key]
      if (typeof v === 'number' && Number.isInteger(v) && key === 'id') {
        copy[key] = i + 1
      } else if (typeof v === 'string' && /^(A-|AC-|ORD-|PRJ-|TK-|TX-)/.test(String(v))) {
        const prefix = String(v).replace(/\d+$/, '')
        copy[key] = `${prefix}${1000 + i}`
      } else if (typeof v === 'number' && (key === 'stock' || key === 'qty' || key === 'items')) {
        copy[key] = (v as number) + (i % 50)
      } else if (typeof v === 'number' && (key === 'price' || key === 'total' || key === 'amount')) {
        copy[key] = Math.round(((v as number) + (i % 20) * 3.7) * 100) / 100
      }
    }
    out.push(copy)
  }
  return out
}

async function getTotalRowCount(supabase: ReturnType<typeof getSupabase>): Promise<number> {
  const { count, error } = await supabase
    .from('dataset_rows')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}

/** Remove all grid data (every dataset row in DB, not only known ids). */
async function clearTables(supabase: ReturnType<typeof getSupabase>) {
  const { data: existing, error: listError } = await supabase.from('datasets').select('id')
  if (listError) throw listError

  const ids = (existing ?? []).map((r) => r.id)
  for (const id of ids) {
    const { error: rowErr } = await supabase.from('dataset_rows').delete().eq('table_id', id)
    if (rowErr) throw rowErr
    const { error: fieldErr } = await supabase.from('dataset_fields').delete().eq('table_id', id)
    if (fieldErr) throw fieldErr
    const { error: dsErr } = await supabase.from('datasets').delete().eq('id', id)
    if (dsErr) throw dsErr
  }
}

export async function verifyAllTablesMeetMinimum(): Promise<{
  ok: boolean
  tables: { id: string; rowCount: number }[]
}> {
  const tables = await Promise.all(
    dynamicTableDatasets.map(async (dataset) => ({
      id: dataset.id,
      rowCount: await getTableRowCount(dataset.id),
    })),
  )
  const ok = tables.every((t) => t.rowCount >= MIN_ROWS_PER_TABLE)
  return { ok, tables }
}

export async function seedDatabase(force = false) {
  const supabase = getSupabase()
  clearQueryMetadataCache()

  let verification: { ok: boolean; tables: { id: string; rowCount: number }[] }
  try {
    verification = await verifyAllTablesMeetMinimum()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('PGRST205') || msg.includes('Could not find the table')) {
      throw new Error(
        'Table "datasets" not found. Run supabase/migrations/001_grid_tables.sql in Supabase SQL editor first.',
      )
    }
    throw e
  }

  const totalRows = await getTotalRowCount(supabase)

  if (!force && verification.ok) {
    console.log(
      `[seed] All tables have >= ${MIN_ROWS_PER_TABLE} rows — skip (use --force to reseed)`,
    )
    verification.tables.forEach((t) => console.log(`  · ${t.id}: ${t.rowCount} rows`))
    return
  }

  if (totalRows === 0 && verification.tables.some((t) => t.rowCount > 0)) {
    console.warn('[seed] Row count mismatch — clearing and reseeding…')
  }

  console.log('[seed] Clearing existing data…')
  await clearTables(supabase)

  for (const dataset of dynamicTableDatasets) {
    const { error: dsError } = await supabase.from('datasets').insert({
      id: dataset.id,
      title: dataset.title,
      description: dataset.description,
    })
    if (dsError) {
      if (dsError.code === '23505') {
        await supabase.from('datasets').delete().eq('id', dataset.id)
        const { error: retry } = await supabase.from('datasets').insert({
          id: dataset.id,
          title: dataset.title,
          description: dataset.description,
        })
        if (retry) throw retry
      } else if (dsError.code === 'PGRST205') {
        throw new Error(
          'Table "datasets" not found. Run supabase/migrations/001_grid_tables.sql in Supabase SQL editor first.',
        )
      } else {
        throw new Error(`datasets insert (${dataset.id}): ${dsError.message}`)
      }
    }

    const fieldRows = dataset.fields.map((field, idx) => ({
      table_id: dataset.id,
      sort_order: idx,
      definition: field,
    }))
    const { error: fieldError } = await supabase.from('dataset_fields').insert(fieldRows)
    if (fieldError) {
      throw new Error(`dataset_fields insert (${dataset.id}): ${fieldError.message}`)
    }

    const rows = expandRows(dataset.rowData, SEED_ROWS_PER_TABLE)
    if (rows.length < MIN_ROWS_PER_TABLE) {
      throw new Error(`Seed config error: ${dataset.id} would only have ${rows.length} rows`)
    }

    for (let offset = 0; offset < rows.length; offset += INSERT_BATCH) {
      const chunk = rows.slice(offset, offset + INSERT_BATCH).map((row, i) => ({
        table_id: dataset.id,
        row_index: offset + i,
        data: row,
        ...indexedRowColumns(row),
      }))
      const { error: rowError } = await supabase.from('dataset_rows').insert(chunk)
      if (rowError) {
        throw new Error(
          `dataset_rows insert (${dataset.id} batch ${offset}): ${rowError.message}. ` +
            'Run supabase/migrations/002_disable_rls_for_service.sql and use SUPABASE_SERVICE_ROLE_KEY in .env.',
        )
      }
    }

    console.log(`[seed] ${dataset.id}: ${rows.length} rows`)
  }

  const after = await verifyAllTablesMeetMinimum()
  clearQueryMetadataCache()
  if (!after.ok) {
    const summary = after.tables.map((t) => `${t.id}=${t.rowCount}`).join(', ')
    throw new Error(
      `Seed verification failed (${summary}). Check Supabase credentials and migrations.`,
    )
  }

  console.log(`[seed] Supabase seed complete (>= ${MIN_ROWS_PER_TABLE} rows per table)`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('server/seed.ts')) {
  const force = process.argv.includes('--force')
  seedDatabase(force).catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
