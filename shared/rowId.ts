/** Stable SSRM row id — never use empty string (AG Grid warning #205) */
export function buildRowId(tableId: string, rowIndex: number | string): string {
  return `${tableId}:${rowIndex}`
}

const BUSINESS_KEYS = [
  'ticketId',
  'accountId',
  'txnId',
  'orderNo',
  'employeeId',
  'sku',
  'projectId',
  'id',
] as const

export function resolveRowId(
  tableId: string,
  data: Record<string, unknown> | undefined | null,
): string | null {
  if (!data) return null

  if (data.rowId != null && String(data.rowId) !== '') {
    return String(data.rowId)
  }
  if (data.__rowIndex != null && data.__rowIndex !== '') {
    const idx = data.__rowIndex
    return buildRowId(tableId, typeof idx === 'number' ? idx : String(idx))
  }

  for (const key of BUSINESS_KEYS) {
    const v = data[key]
    if (v != null && v !== '') return buildRowId(tableId, String(v))
  }

  return null
}
