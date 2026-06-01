/** Minimum rows per table required for server-side grid testing */
export const MIN_ROWS_PER_TABLE = 1000

/** Total rows inserted into the simulation dataset when running `npm run seed` */
export const SIMULATION_TOTAL_ROWS = 200000

/** Rows inserted into the single simulation dataset when running `npm run seed` */
export const SEED_ROWS_PER_TABLE = SIMULATION_TOTAL_ROWS

/** Default AG Grid pagination page size — must equal server `cacheBlockSize` */
export const DEFAULT_PAGINATION_PAGE_SIZE = 100

/** Allowed page sizes in the grid selector (each triggers one API request of that size) */
export const PAGINATION_PAGE_SIZE_OPTIONS = [50, 100, 200] as const

/** Hard API cap so the browser cannot accidentally request the whole table */
export const MAX_SERVER_PAGE_SIZE = 200
