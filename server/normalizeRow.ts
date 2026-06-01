import type { FieldDefinition } from '../src/types/grid'

function flatFields(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.flatMap((f) => (f.children?.length ? f.children : [f]))
}

/** Coerce JSONB values so AG Grid formatters receive consistent types */
export function normalizeRowData(
  row: Record<string, unknown>,
  fields: FieldDefinition[],
): Record<string, unknown> {
  const out = { ...row }

  for (const f of flatFields(fields)) {
    const key = f.field
    const raw = out[key]
    if (raw === undefined || raw === null) continue

    switch (f.type) {
      case 'number':
      case 'currency':
      case 'percent': {
        const n = typeof raw === 'number' ? raw : Number(raw)
        if (!Number.isNaN(n)) out[key] = n
        break
      }
      case 'boolean':
        if (raw === true || raw === false) break
        if (raw === 'true' || raw === 1 || raw === '1') out[key] = true
        else if (raw === 'false' || raw === 0 || raw === '0') out[key] = false
        break
      case 'date':
        if (raw instanceof Date) {
          out[key] = raw.toISOString().slice(0, 10)
        } else {
          out[key] = String(raw).slice(0, 10)
        }
        break
      default:
        if (typeof raw !== 'string' && typeof raw !== 'number' && typeof raw !== 'boolean') {
          out[key] = String(raw)
        }
    }
  }

  return out
}
