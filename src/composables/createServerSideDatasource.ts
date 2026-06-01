import type { GridApi, IServerSideDatasource, IServerSideGetRowsParams } from 'ag-grid-community'
import type { Ref } from 'vue'
import { MAX_SERVER_PAGE_SIZE } from '../../shared/constants'
import { normalizeFilterModel } from '../../shared/normalizeFilterModel'
import { buildRowId, resolveRowId } from '../../shared/rowId'
import { fetchServerSideRows } from '../api/gridApi'
import type { ServerSideRowsRequest, ServerSideRowsResponse } from '../../shared/api-types'

type CachedRows = {
  expiresAt: number
  result: ServerSideRowsResponse
}

const ROW_CACHE_TTL_MS = 20_000
const MAX_CACHED_PAGES = 24

function rowIndexValue(row: Record<string, unknown>, fallback: number): number {
  const raw = row.__rowIndex
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string' && raw !== '') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function requestKey(table: string, request: ServerSideRowsRequest): string {
  return `${table}:${stableStringify(request)}`
}

/**
 * AG Grid Server-Side Row Model — each getRows call maps 1:1 to POST /rows.
 */
export function createServerSideDatasource(
  tableId: Ref<string>,
  quickFilter: Ref<string>,
  loadGeneration: Ref<number>,
  onError?: (message: string) => void,
): IServerSideDatasource {
  const cache = new Map<string, CachedRows>()
  const inFlight = new Map<string, Promise<ServerSideRowsResponse>>()
  const controllers = new Map<string, AbortController>()

  function getCached(key: string): ServerSideRowsResponse | null {
    const hit = cache.get(key)
    if (!hit) return null
    if (hit.expiresAt < Date.now()) {
      cache.delete(key)
      return null
    }
    cache.delete(key)
    cache.set(key, hit)
    return hit.result
  }

  function setCached(key: string, result: ServerSideRowsResponse) {
    cache.set(key, { result, expiresAt: Date.now() + ROW_CACHE_TTL_MS })
    while (cache.size > MAX_CACHED_PAGES) {
      const oldest = cache.keys().next().value
      if (oldest == null) break
      cache.delete(oldest)
    }
  }

  function complete(params: IServerSideGetRowsParams, table: string, result: ServerSideRowsResponse) {
    const rowCount = result.rowCount ?? 0
    const rowData = result.rowData.map((row, i) => {
      const index = rowIndexValue(row, result.startRow + i)
      const rowId = resolveRowId(table, row) ?? buildRowId(table, index)
      return { ...row, __rowIndex: index, rowId }
    })

    params.success({ rowData, rowCount })

    const api = params.api as GridApi
    if (rowCount === 0) {
      api.showNoRowsOverlay()
    } else {
      api.hideOverlay()
    }
  }

  return {
    destroy() {
      controllers.forEach((controller) => controller.abort())
      controllers.clear()
      inFlight.clear()
      cache.clear()
    },

    getRows(params: IServerSideGetRowsParams) {
      const table = tableId.value
      if (!table) {
        params.fail()
        return
      }

      const generationAtStart = loadGeneration.value
      const startRow = params.request.startRow ?? 0
      const endRow = params.request.endRow ?? startRow
      const pageSize = endRow - startRow
      const { sortModel, filterModel } = params.request

      if (pageSize <= 0) {
        params.success({ rowData: [], rowCount: 0 })
        return
      }

      if (pageSize > MAX_SERVER_PAGE_SIZE) {
        onError?.(`Requested ${pageSize} rows; maximum page size is ${MAX_SERVER_PAGE_SIZE}`)
        params.fail()
        return
      }

      const normalizedFilters = normalizeFilterModel(
        filterModel as Record<string, unknown> | undefined,
      )

      const request: ServerSideRowsRequest = {
        startRow,
        endRow,
        rowGroupCols: params.request.rowGroupCols.map((col) => ({
          id: col.id,
          field: col.field,
          displayName: col.displayName,
        })),
        valueCols: params.request.valueCols.map((col) => ({
          id: col.id,
          field: col.field,
          displayName: col.displayName,
          aggFunc: typeof col.aggFunc === 'string' ? col.aggFunc : undefined,
        })),
        pivotCols: params.request.pivotCols.map((col) => ({
          id: col.id,
          field: col.field,
          displayName: col.displayName,
        })),
        pivotMode: params.request.pivotMode,
        groupKeys: [...params.request.groupKeys],
        sortModel: (sortModel ?? []).map((s) => ({
          colId: s.colId,
          sort: s.sort as 'asc' | 'desc',
        })),
        filterModel: normalizedFilters,
        quickFilter: quickFilter.value.trim() || undefined,
      }
      const key = requestKey(table, request)
      const cached = getCached(key)
      if (cached) {
        complete(params, table, cached)
        return
      }

      let load = inFlight.get(key)
      if (!load) {
        const controller = new AbortController()
        controllers.set(key, controller)
        load = fetchServerSideRows(table, request, controller.signal).finally(() => {
          inFlight.delete(key)
          controllers.delete(key)
        })
        inFlight.set(key, load)
      }

      load
        .then((result) => {
          if (loadGeneration.value !== generationAtStart || tableId.value !== table) {
            return
          }

          setCached(key, result)
          complete(params, table, result)
        })
        .catch((err: unknown) => {
          if (loadGeneration.value !== generationAtStart) return
          if (err instanceof DOMException && err.name === 'AbortError') return
          const message = err instanceof Error ? err.message : 'Failed to load rows'
          console.error('[grid] getRows failed:', message)
          onError?.(message)
          params.fail()
        })
    },
  }
}
