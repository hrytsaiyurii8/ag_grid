/** AG Grid SSRM column filter entry (subset) */
export type ColumnFilterModel = {
  filterType?: string
  type?: string
  filter?: unknown
  filterTo?: unknown
  values?: unknown[]
  conditions?: ColumnFilterModel[]
  filterModels?: ColumnFilterModel[]
  operator?: string
}

export type GridFilterModel = Record<string, ColumnFilterModel>

/**
 * Flatten join/multi filters into simple per-column models the API understands.
 */
export function normalizeFilterModel(
  raw: Record<string, unknown> | null | undefined,
): GridFilterModel | undefined {
  if (!raw || typeof raw !== 'object') return undefined

  const out: GridFilterModel = {}

  for (const [colId, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue
    const model = entry as ColumnFilterModel

    if (model.filterType === 'join' && Array.isArray(model.conditions)) {
      const active = model.conditions.find(
        (c) =>
          !!c &&
          ((c.filter != null && c.filter !== '') ||
            (Array.isArray(c.values) && c.values.length > 0)),
      )
      if (active) out[colId] = active
      continue
    }

    if (model.filterType === 'multi' && Array.isArray(model.filterModels)) {
      const nested = model.filterModels
      const active = nested?.find(
        (c) =>
          c &&
          ((c.filter != null && c.filter !== '') ||
            (Array.isArray(c.values) && c.values.length > 0)),
      )
      if (active) out[colId] = active
      continue
    }

    const hasValue =
      (model.filter != null && model.filter !== '') ||
      (Array.isArray(model.values) && model.values.length > 0)
    if (hasValue || model.filterType === 'set') {
      out[colId] = model
    }
  }

  return Object.keys(out).length ? out : undefined
}
