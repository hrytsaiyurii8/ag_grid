let seed = 123456789
const m = 2 ** 32
const a = 1103515245
const c = 12345

export const pseudoRandom = () => {
  seed = (a * seed + c) % m
  return seed / m
}

export const createDataSizeValue = (rows: number, cols: number) => `${rows}x${cols}`

export const parseDataSizeValue = (value: string): { rows: number; cols: number } => {
  const [rows, cols] = value.split('x').map((part) => parseInt(part, 10))
  return { rows: rows || 1000, cols: cols || 22 }
}
