import type { FieldDefinition } from '../src/types/grid'
import type { ServerSideColumnVO, ServerSideRowsRequest, ServerSideValueColumnVO } from '../shared/api-types'
import { MAX_SERVER_PAGE_SIZE } from '../shared/constants.js'
import {
  normalizeFilterModel,
  type ColumnFilterModel,
  type GridFilterModel,
} from '../shared/normalizeFilterModel.js'
import { escapeIlikePattern, escapeOrFilterValue } from '../shared/filterEscape.js'
import { buildRowId } from '../shared/rowId.js'
import { normalizeRowData } from './normalizeRow.js'
import { getSupabase } from './supabase.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowsQuery = any

const META_CACHE_TTL_MS = 60_000
const tableExistsCache = new Map<string, { value: boolean; expiresAt: number }>()
const tableFieldsCache = new Map<string, { value: FieldDefinition[]; expiresAt: number }>()
const tableRowCountCache = new Map<string, { value: number; expiresAt: number }>()
const INDEXED_SIMULATION_FIELDS = new Set([
  'sku',
  'name',
  'category',
  'region',
  'supplier',
  'price',
  'stock',
  'rating',
  'active',
])

function cacheGet<T>(cache: Map<string, { value: T; expiresAt: number }>, key: string): T | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet<T>(cache: Map<string, { value: T; expiresAt: number }>, key: string, value: T): T {
  cache.set(key, { value, expiresAt: Date.now() + META_CACHE_TTL_MS })
  return value
}

export function clearQueryMetadataCache(): void {
  tableExistsCache.clear()
  tableFieldsCache.clear()
  tableRowCountCache.clear()
}

function jsonColumn(field: string): string {
  return `data->>${field}`
}

function queryColumn(field: string): string {
  return INDEXED_SIMULATION_FIELDS.has(field) ? field : jsonColumn(field)
}

function textFields(fields: FieldDefinition[]): string[] {
  return fields
    .filter((f) => !f.children?.length && (f.type === 'text' || f.type === 'set' || !f.type))
    .map((f) => f.field)
}

function fieldType(fields: FieldDefinition[], colId: string): FieldDefinition['type'] {
  const flat = fields.flatMap((f) => (f.children?.length ? f.children : [f]))
  return flat.find((f) => f.field === colId)?.type ?? 'text'
}

function fieldExists(fields: FieldDefinition[], colId: string): boolean {
  const flat = fields.flatMap((f) => (f.children?.length ? f.children : [f]))
  return flat.some((f) => f.field === colId)
}

function colField(col: ServerSideColumnVO | undefined): string {
  return col?.field ?? col?.id ?? ''
}

function validGroupCols(
  fields: FieldDefinition[],
  cols: ServerSideColumnVO[] | undefined,
): string[] {
  return (cols ?? []).map(colField).filter((field) => fieldExists(fields, field))
}

function groupPathFilters(
  query: RowsQuery,
  fields: FieldDefinition[],
  request: ServerSideRowsRequest,
): RowsQuery {
  const groupFields = validGroupCols(fields, request.rowGroupCols)
  const groupKeys = request.groupKeys ?? []
  let q = query

  for (let i = 0; i < Math.min(groupFields.length, groupKeys.length); i += 1) {
    q = q.filter(queryColumn(groupFields[i]!), 'eq', groupKeys[i]!)
  }

  return q
}

function applyFilterModel(
  query: RowsQuery,
  filterModel: GridFilterModel | undefined,
  fields: FieldDefinition[],
): RowsQuery {
  if (!filterModel) return query

  let q = query
  for (const [colId, model] of Object.entries(filterModel)) {
    if (!model || typeof model !== 'object') continue
    if (!fieldExists(fields, colId)) continue
    const col = queryColumn(colId)
    const colFieldType = fieldType(fields, colId)
    const filterType = model.filterType ?? inferFilterType(model, colFieldType)
    const op = model.type ?? 'contains'

    if (op === 'blank') {
      q = q.or(`${col}.is.null,${col}.eq.`)
      continue
    }
    if (op === 'notBlank') {
      q = q.not(col, 'is', null).neq(col, '')
      continue
    }

    if (colFieldType === 'boolean') {
      const raw = String(model.filter ?? model.values?.[0] ?? '').toLowerCase()
      if (raw === 'true' || raw === 'yes') q = q.filter(col, 'eq', true)
      else if (raw === 'false' || raw === 'no') q = q.filter(col, 'eq', false)
      continue
    }

    if (filterType === 'text') {
      const value = model.filter
      if (value == null || value === '') continue
      const str = escapeIlikePattern(String(value))
      if (op === 'contains') q = q.filter(col, 'ilike', `%${str}%`)
      else if (op === 'equals') q = q.filter(col, 'eq', String(value))
      else if (op === 'notEqual') q = q.filter(col, 'neq', String(value))
      else if (op === 'startsWith') q = q.filter(col, 'ilike', `${str}%`)
      else if (op === 'endsWith') q = q.filter(col, 'ilike', `%${str}`)
    } else if (filterType === 'number') {
      const num = Number(model.filter)
      if (Number.isNaN(num)) continue
      const str = String(num)
      if (op === 'equals') q = q.filter(col, 'eq', str)
      else if (op === 'notEqual') q = q.filter(col, 'neq', str)
      else if (op === 'greaterThan') q = q.filter(col, 'gt', str)
      else if (op === 'greaterThanOrEqual') q = q.filter(col, 'gte', str)
      else if (op === 'lessThan') q = q.filter(col, 'lt', str)
      else if (op === 'lessThanOrEqual') q = q.filter(col, 'lte', str)
      else if (op === 'inRange') {
        const to = Number(model.filterTo)
        if (!Number.isNaN(to)) q = q.filter(col, 'gte', str).filter(col, 'lte', String(to))
      }
    } else if (filterType === 'set' && Array.isArray(model.values) && model.values.length) {
      q = q.in(col, model.values.map(String))
    } else if (filterType === 'date') {
      const value = model.filter
      if (value == null || value === '') continue
      const str = String(value)
      if (op === 'equals') q = q.filter(col, 'eq', str)
      else if (op === 'greaterThan') q = q.filter(col, 'gt', str)
      else if (op === 'lessThan') q = q.filter(col, 'lt', str)
      else if (op === 'inRange' && model.filterTo != null) {
        q = q.filter(col, 'gte', str).filter(col, 'lte', String(model.filterTo))
      }
    }
  }
  return q
}

function inferFilterType(
  model: ColumnFilterModel,
  fieldTypeName: FieldDefinition['type'],
): string {
  if (model.filterType) return model.filterType
  if (Array.isArray(model.values)) return 'set'
  if (fieldTypeName === 'number' || fieldTypeName === 'currency' || fieldTypeName === 'percent') {
    return 'number'
  }
  if (fieldTypeName === 'date') return 'date'
  return 'text'
}

function applyQuickFilter(
  query: RowsQuery,
  quickFilter: string | undefined,
  fields: FieldDefinition[],
): RowsQuery {
  const term = quickFilter?.trim()
  if (!term) return query

  const escaped = escapeOrFilterValue(term)
  if (fields.some((field) => field.field === 'sku')) {
    return query.filter('search_text', 'ilike', `%${escapeIlikePattern(escaped)}%`)
  }

  const cols = textFields(fields)
  if (!cols.length) return query

  const orClause = cols
    .map((f) => `${queryColumn(f)}.ilike.%${escapeIlikePattern(escaped)}%`)
    .join(',')
  return query.or(orClause)
}

function applySort(
  query: RowsQuery,
  request: ServerSideRowsRequest,
  fields: FieldDefinition[],
): RowsQuery {
  if (!request.sortModel.length) {
    return query.order('row_index', { ascending: true })
  }

  let q = query
  for (const sort of request.sortModel) {
    if (!fieldExists(fields, sort.colId)) continue
    const col = queryColumn(sort.colId)
    const ascending = sort.sort === 'asc'
    q = q.order(col, { ascending, nullsFirst: false })
  }
  return q.order('row_index', { ascending: true })
}

function normalizePrimitive(value: unknown): string {
  if (value == null || value === '') return '(Blank)'
  return String(value)
}

function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const av = typeof a === 'number' ? a : Number(a)
  const bv = typeof b === 'number' ? b : Number(b)
  const bothNumeric = Number.isFinite(av) && Number.isFinite(bv)
  const result = bothNumeric
    ? av - bv
    : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true })
  return dir === 'asc' ? result : -result
}

function aggregate(values: unknown[], aggFunc: string | undefined): number {
  const nums = values.map(Number).filter(Number.isFinite)
  if (aggFunc === 'count') return values.length
  if (!nums.length) return 0
  if (aggFunc === 'min') return Math.min(...nums)
  if (aggFunc === 'max') return Math.max(...nums)
  if (aggFunc === 'avg') return nums.reduce((sum, n) => sum + n, 0) / nums.length
  return nums.reduce((sum, n) => sum + n, 0)
}

function applyGroupAggregations(
  row: Record<string, unknown>,
  rows: { data: Record<string, unknown> }[],
  fields: FieldDefinition[],
  valueCols: ServerSideValueColumnVO[] | undefined,
) {
  const explicit = valueCols?.length
    ? valueCols
    : fields
        .filter((field) => field.aggFunc && fieldExists(fields, field.field))
        .map((field) => ({ field: field.field, aggFunc: field.aggFunc }))

  for (const col of explicit) {
    const field = colField(col)
    if (!field || !fieldExists(fields, field)) continue
    row[field] = aggregate(
      rows.map((r) => r.data[field]),
      col.aggFunc,
    )
  }
}

async function fetchFilteredRowsForGrouping(
  tableId: string,
  fields: FieldDefinition[],
  request: ServerSideRowsRequest,
): Promise<{ data: Record<string, unknown>; row_index: number }[]> {
  const supabase = getSupabase()
  const filterModel = normalizeFilterModel(request.filterModel as Record<string, unknown>)

  let query = supabase
    .from('dataset_rows')
    .select('data, row_index')
    .eq('table_id', tableId)

  query = applyFilterModel(query, filterModel, fields)
  query = applyQuickFilter(query, request.quickFilter, fields)
  query = groupPathFilters(query, fields, request)
  query = query.order('row_index', { ascending: true }).range(0, 9999)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as { data: Record<string, unknown>; row_index: number }[]
}

function isGroupingRequest(fields: FieldDefinition[], request: ServerSideRowsRequest): boolean {
  const groupFields = validGroupCols(fields, request.rowGroupCols)
  return groupFields.length > (request.groupKeys?.length ?? 0)
}

async function queryServerSideGroups(
  tableId: string,
  fields: FieldDefinition[],
  request: ServerSideRowsRequest,
  startRow: number,
  pageSize: number,
): Promise<{
  rowData: Record<string, unknown>[]
  rowCount: number
  pageSize: number
  startRow: number
  endRow: number
}> {
  const groupFields = validGroupCols(fields, request.rowGroupCols)
  const level = request.groupKeys?.length ?? 0
  const groupField = groupFields[level]!
  const rows = await fetchFilteredRowsForGrouping(tableId, fields, request)
  const grouped = new Map<string, { data: Record<string, unknown>; row_index: number }[]>()

  for (const row of rows) {
    const key = normalizePrimitive(row.data[groupField])
    const bucket = grouped.get(key) ?? []
    bucket.push(row)
    grouped.set(key, bucket)
  }

  let groupRows = [...grouped.entries()].map(([key, bucket]) => {
    const row: Record<string, unknown> = {
      [groupField]: key,
      __group: true,
      __groupField: groupField,
      __groupKey: key,
      __childrenCount: bucket.length,
      rowId: buildRowId(tableId, `${groupField}-${key}`),
    }
    applyGroupAggregations(row, bucket, fields, request.valueCols)
    return row
  })

  for (const sort of request.sortModel) {
    if (sort.colId === groupField || fieldExists(fields, sort.colId)) {
      groupRows = groupRows.sort((a, b) => compareValues(a[sort.colId], b[sort.colId], sort.sort))
    }
  }
  if (!request.sortModel.length) {
    groupRows = groupRows.sort((a, b) => compareValues(a[groupField], b[groupField], 'asc'))
  }

  const rowCount = groupRows.length
  const rowData = groupRows.slice(startRow, startRow + pageSize)

  return {
    rowData,
    rowCount,
    pageSize,
    startRow,
    endRow: startRow + pageSize,
  }
}

export async function tableExists(tableId: string): Promise<boolean> {
  const cached = cacheGet(tableExistsCache, tableId)
  if (cached != null) return cached

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('datasets')
    .select('id')
    .eq('id', tableId)
    .maybeSingle()

  if (error) throw error
  return cacheSet(tableExistsCache, tableId, !!data)
}

export async function getTableFields(tableId: string): Promise<FieldDefinition[]> {
  const cached = cacheGet(tableFieldsCache, tableId)
  if (cached) return cached

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('dataset_fields')
    .select('definition')
    .eq('table_id', tableId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return cacheSet(
    tableFieldsCache,
    tableId,
    (data ?? []).map((r) => r.definition as FieldDefinition),
  )
}

export async function getTableRowCount(tableId: string): Promise<number> {
  const cached = cacheGet(tableRowCountCache, tableId)
  if (cached != null) return cached

  const supabase = getSupabase()
  const { count, error } = await supabase
    .from('dataset_rows')
    .select('*', { count: 'exact', head: true })
    .eq('table_id', tableId)

  if (error) throw error
  return cacheSet(tableRowCountCache, tableId, count ?? 0)
}

export async function queryServerSideRows(
  tableId: string,
  fields: FieldDefinition[],
  request: ServerSideRowsRequest,
): Promise<{
  rowData: Record<string, unknown>[]
  rowCount: number
  pageSize: number
  startRow: number
  endRow: number
}> {
  const supabase = getSupabase()
  const startRow = Math.max(0, Math.floor(request.startRow))
  const endRow = Math.max(startRow, Math.floor(request.endRow))
  const requestedPageSize = endRow - startRow
  const pageSize = Math.min(requestedPageSize, MAX_SERVER_PAGE_SIZE)

  if (pageSize <= 0) {
    return { rowData: [], rowCount: 0, pageSize: 0, startRow, endRow }
  }

  if (isGroupingRequest(fields, request)) {
    return queryServerSideGroups(tableId, fields, request, startRow, pageSize)
  }

  const from = startRow
  const to = startRow + pageSize - 1
  const filterModel = normalizeFilterModel(request.filterModel as Record<string, unknown>)

  let query = supabase
    .from('dataset_rows')
    .select('data, row_index', { count: 'exact' })
    .eq('table_id', tableId)

  query = applyFilterModel(query, filterModel, fields)
  query = applyQuickFilter(query, request.quickFilter, fields)
  query = groupPathFilters(query, fields, request)
  query = applySort(query, request, fields)

  const { data, count, error } = await query.range(from, to)

  if (error) {
    console.error('[api] queryServerSideRows failed:', error.message, {
      tableId,
      sortModel: request.sortModel,
      filterModel,
      quickFilter: request.quickFilter,
    })
    throw new Error(error.message)
  }

  const rowData = (data ?? []).map((r: { data: Record<string, unknown>; row_index: number }) => {
    const rowId = buildRowId(tableId, r.row_index)
    return normalizeRowData(
      { ...r.data, __rowIndex: r.row_index, rowId },
      fields,
    )
  })

  return {
    rowData,
    rowCount: count ?? 0,
    pageSize,
    startRow,
    endRow,
  }
}

export async function fetchTableList(): Promise<
  { id: string; title: string; description: string; rowCount: number }[]
> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('datasets')
    .select('id, title, description')
    .order('title', { ascending: true })

  if (error) throw error

  const datasets = data ?? []
  return Promise.all(
    datasets.map(async (ds) => ({
      ...ds,
      rowCount: await getTableRowCount(ds.id),
    })),
  )
}
