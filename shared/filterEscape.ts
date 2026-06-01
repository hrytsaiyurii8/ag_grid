/** Escape user input for PostgREST `ilike` patterns */
export function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/** Escape characters that break PostgREST `.or()` filter strings */
export function escapeOrFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/,/g, '')
}
