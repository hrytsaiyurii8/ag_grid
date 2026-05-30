import type { ColDef, ColGroupDef } from 'ag-grid-community'
import type { FieldDefinition } from '../types/grid'

function filterForType(type: FieldDefinition['type']): string | boolean {
  switch (type) {
    case 'number':
    case 'currency':
    case 'percent':
      return 'agNumberColumnFilter'
    case 'boolean':
    case 'set':
      return 'agSetColumnFilter'
    case 'date':
      return 'agDateColumnFilter'
    case 'text':
    default:
      return 'agTextColumnFilter'
  }
}

function fieldToColDef(field: FieldDefinition): ColDef {
  const type = field.type ?? 'text'
  const col: ColDef = {
    field: field.field,
    headerName: field.headerName ?? field.field,
    hide: field.hide,
    width: field.width,
    minWidth: field.minWidth ?? 100,
    editable: field.editable,
    sortable: field.sortable ?? true,
    resizable: field.resizable ?? true,
    filter: field.filter ?? filterForType(type),
    floatingFilter: field.floatingFilter ?? true,
    enableRowGroup: field.enableRowGroup ?? true,
    enablePivot: field.enablePivot ?? true,
    enableValue: field.enableValue ?? (type === 'number' || type === 'currency'),
    aggFunc: field.aggFunc,
    rowDrag: field.rowDrag,
    cellRenderer: field.cellRenderer,
    valueFormatter: field.valueFormatter,
    valueGetter: field.valueGetter,
    cellDataType: field.cellDataType,
  }

  if (type === 'currency') {
    col.cellDataType = col.cellDataType ?? 'currency'
    col.filter = field.filter ?? 'agNumberColumnFilter'
  }
  if (type === 'boolean') {
    col.cellDataType = col.cellDataType ?? 'boolean'
    col.filter = field.filter ?? 'agSetColumnFilter'
  }
  if (type === 'percent' && !col.valueFormatter) {
    col.valueFormatter = (p) =>
      p.value != null ? `${(p.value as number).toFixed(1)}%` : ''
  }

  return col
}

function fieldOrGroupToCol(field: FieldDefinition): ColDef | ColGroupDef {
  if (field.children?.length) {
    return {
      headerName: field.headerName ?? field.field,
      marryChildren: true,
      children: field.children.map((c) => fieldToColDef(c)),
    }
  }
  return fieldToColDef(field)
}

/** Build column defs from flat fields, optionally grouping by `group` property */
export function fieldsToColumnDefs(fields: FieldDefinition[]): Array<ColDef | ColGroupDef> {
  const hasGroups = fields.some((f) => f.group && !f.children?.length)
  if (!hasGroups) {
    return fields.map((f) => fieldOrGroupToCol(f))
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
    result.push(fieldOrGroupToCol(f))
  }

  for (const [groupName, members] of groups) {
    result.push({
      headerName: groupName,
      marryChildren: true,
      children: members.map((m) => fieldToColDef(m)),
    })
  }

  return result
}
