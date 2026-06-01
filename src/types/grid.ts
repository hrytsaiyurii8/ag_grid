import type { ColDef, ColGroupDef, GridOptions, Theme } from 'ag-grid-community'

/** Simple field schema — pass to DynamicAgGrid `fields` prop */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'currency'
  | 'percent'
  | 'date'
  | 'set'

export type FieldDefinition = {
  field: string
  headerName?: string
  type?: FieldType
  width?: number
  minWidth?: number
  group?: string
  editable?: boolean
  filter?: boolean | string
  floatingFilter?: boolean
  sortable?: boolean
  resizable?: boolean
  hide?: boolean
  aggFunc?: string
  enableRowGroup?: boolean
  enablePivot?: boolean
  enableValue?: boolean
  rowDrag?: boolean
  cellRenderer?: string
  valueFormatter?: ColDef['valueFormatter']
  valueGetter?: ColDef['valueGetter']
  cellDataType?: ColDef['cellDataType']
  children?: FieldDefinition[]
}

export type GridThemeMode = 'quartz-dark' | 'quartz-light'

export type DynamicGridToolbar = {
  showQuickFilter?: boolean
  quickFilterPlaceholder?: string
}

export type DynamicAgGridProps = {
  /**
   * Simple field list — grid builds ColDefs automatically (filters, types, grouping).
   * Use this for arbitrary dynamic tables.
   */
  fields?: FieldDefinition[]
  /**
   * Full AG Grid column definitions (for advanced / demo configs).
   * Ignored if `fields` is provided.
   */
  columns?: Array<ColDef | ColGroupDef>
  rowData?: Record<string, unknown>[] | null
  loading?: boolean
  theme?: GridThemeMode
  height?: string
  class?: string
  defaultColDef?: ColDef
  gridOptions?: GridOptions
  columnTypes?: GridOptions['columnTypes']
  dataTypeDefinitions?: GridOptions['dataTypeDefinitions']
  components?: GridOptions['components']
  quickFilterText?: string
  showSidebar?: boolean
  showRowGroupPanel?: boolean
  showStatusBar?: boolean
  rowNumbers?: boolean
  pagination?: boolean
  paginationPageSize?: number
  paginationPageSizeSelector?: number[]
  toolbar?: DynamicGridToolbar
  themeOverride?: Theme
  /**
   * Use AG Grid Server-Side Row Model — loads blocks from `tableId` via API
   * instead of passing all rows in `rowData`.
   */
  serverSide?: boolean
  /** Required when `serverSide` is true — backend table identifier */
  tableId?: string
  /**
   * Rows per server request. With server-side + pagination, set equal to
   * `paginationPageSize` so AG Grid fetches exactly one page per request.
   */
  cacheBlockSize?: number
  /** Keep low (e.g. 1) with server-side pagination to avoid extra cached pages */
  maxBlocksInCache?: number
  /** Use AG Grid pagination UI with server-side row model (recommended for 1000+ rows) */
  serverSidePagination?: boolean
  /** Total rows in DB — sets SSRM row count so pagination shows correctly */
  serverRowCount?: number
}
