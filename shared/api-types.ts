import type { FieldDefinition } from '../src/types/grid'

export type TableListItem = {
  id: string
  title: string
  description: string
  rowCount: number
}

export type TableSchemaResponse = {
  fields: FieldDefinition[]
  rowCount: number
}

export type SortModelItem = {
  colId: string
  sort: 'asc' | 'desc'
}

export type ServerSideColumnVO = {
  id?: string
  field?: string
  displayName?: string
  aggFunc?: string
}

export type ServerSideValueColumnVO = ServerSideColumnVO & {
  aggFunc?: 'sum' | 'avg' | 'min' | 'max' | 'count' | string
}

/** Serializable AG Grid IServerSideGetRowsRequest + app quick filter */
export type ServerSideRowsRequest = {
  startRow: number
  endRow: number
  sortModel: SortModelItem[]
  rowGroupCols?: ServerSideColumnVO[]
  valueCols?: ServerSideValueColumnVO[]
  pivotCols?: ServerSideColumnVO[]
  pivotMode?: boolean
  groupKeys?: string[]
  /** AG Grid SSRM column filters (normalized on server) */
  filterModel?: Record<string, unknown> | null
  /** Toolbar search across text columns */
  quickFilter?: string
}

export type ServerSideRowsResponse = {
  rowData: Record<string, unknown>[]
  /** Total rows in DB matching filters (for pagination last page) */
  rowCount: number
  /** Rows requested: endRow - startRow (matches pagination page size) */
  pageSize: number
  startRow: number
  endRow: number
}
