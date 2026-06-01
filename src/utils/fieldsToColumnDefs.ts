import type { ColDef, ColGroupDef, ValueFormatterParams } from 'ag-grid-community'
import type { FieldDefinition, FieldType } from '../types/grid'

function filterForType(type: FieldType | undefined, serverSide: boolean): string | boolean {
  if (serverSide && type === 'set') {
    return 'agTextColumnFilter'
  }
  switch (type) {
    case 'number':
    case 'currency':
    case 'percent':
      return 'agNumberColumnFilter'
    case 'boolean':
      return serverSide ? 'agTextColumnFilter' : 'agSetColumnFilter'
    case 'set':
      return 'agSetColumnFilter'
    case 'date':
      return 'agDateColumnFilter'
    case 'text':
    default:
      return 'agTextColumnFilter'
  }
}

function formatDate(value: unknown): string {
  if (value == null || value === '') return ''
  const s = String(value).slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString()
}

function formatBoolean(value: unknown): string {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return ''
}

function formatCurrency(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(n)) return ''
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function applyServerFormatters(col: ColDef, type: FieldType | undefined): void {
  col.cellDataType = false

  switch (type) {
    case 'date':
      col.valueFormatter = (p: ValueFormatterParams) => formatDate(p.value)
      break
    case 'boolean':
      col.valueFormatter = (p: ValueFormatterParams) => formatBoolean(p.value)
      break
    case 'currency':
      col.valueFormatter = (p: ValueFormatterParams) => formatCurrency(p.value)
      break
    case 'percent':
      if (!col.valueFormatter) {
        col.valueFormatter = (p: ValueFormatterParams) =>
          p.value != null && !Number.isNaN(Number(p.value))
            ? `${Number(p.value).toFixed(1)}%`
            : ''
      }
      break
    default:
      break
  }
}

function fieldToColDef(field: FieldDefinition, serverSide = false): ColDef {
  const type = field.type ?? 'text'
  const col: ColDef = {
    field: field.field,
    colId: field.field,
    headerName: field.headerName ?? field.field,
    hide: field.hide,
    width: field.width,
    minWidth: field.minWidth ?? 100,
    editable: field.editable,
    sortable: field.sortable ?? true,
    resizable: field.resizable ?? true,
    filter: field.filter ?? filterForType(type, serverSide),
    floatingFilter: field.floatingFilter ?? true,
    enableRowGroup: field.enableRowGroup ?? true,
    enablePivot: serverSide ? false : (field.enablePivot ?? true),
    enableValue:
      field.enableValue ?? (type === 'number' || type === 'currency' || type === 'percent'),
    aggFunc: field.aggFunc,
    rowDrag: field.rowDrag,
    cellRenderer: field.cellRenderer,
    valueFormatter: field.valueFormatter,
    valueGetter: field.valueGetter,
  }

  if (serverSide) {
    applyServerFormatters(col, type)
    col.filterParams = {
      debounceMs: 400,
      maxNumConditions: 1,
      ...(type === 'boolean'
        ? {
            filterOptions: ['equals'],
            defaultOption: 'equals',
          }
        : {}),
    }
  } else {
    if (type === 'currency') {
      col.cellDataType = field.cellDataType ?? 'currency'
      col.filter = field.filter ?? 'agNumberColumnFilter'
    }
    if (type === 'boolean') {
      col.cellDataType = field.cellDataType ?? 'boolean'
      col.filter = field.filter ?? 'agSetColumnFilter'
    }
    if (type === 'percent' && !col.valueFormatter) {
      col.valueFormatter = (p) =>
        p.value != null ? `${(p.value as number).toFixed(1)}%` : ''
    }
  }

  return col
}

function fieldOrGroupToCol(field: FieldDefinition, serverSide = false): ColDef | ColGroupDef {
  if (field.children?.length) {
    return {
      headerName: field.headerName ?? field.field,
      marryChildren: true,
      children: field.children.map((c) => fieldToColDef(c, serverSide)),
    }
  }
  return fieldToColDef(field, serverSide)
}

/** Build column defs from flat fields, optionally grouping by `group` property */
export function fieldsToColumnDefs(
  fields: FieldDefinition[],
  serverSide = false,
): Array<ColDef | ColGroupDef> {
  const hasGroups = fields.some((f) => f.group && !f.children?.length)
  if (!hasGroups) {
    return fields.map((f) => fieldOrGroupToCol(f, serverSide))
  }

  const result: Array<ColDef | ColGroupDef> = []
  const groups = new Map<string, FieldDefinition[]>()
  const ungrouped: FieldDefinition[] = []

  for (const f of fields) {
    if (f.group) {
      const list = groups.get(f.group) ?? []
      list.push(f)
      groups.set(f.group, list)
    } else {
      ungrouped.push(f)
    }
  }

  for (const f of ungrouped) {
    result.push(fieldOrGroupToCol(f, serverSide))
  }

  for (const [groupName, members] of groups) {
    result.push({
      headerName: groupName,
      marryChildren: true,
      children: members.map((m) => fieldToColDef(m, serverSide)),
    })
  }

  return result
}
