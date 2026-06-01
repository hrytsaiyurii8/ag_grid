import type { FieldDefinition } from '../types/grid'

export type DynamicTableDataset = {
  id: string
  title: string
  description: string
  fields: FieldDefinition[]
  rowData: Record<string, unknown>[]
}

const ROW_COUNT = 30

function rows<T>(count: number, builder: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, i) => builder(i))
}

const PRODUCT_NAMES = [
  'Wireless Mouse', 'Desk Lamp', 'Notebook Pack', 'USB-C Hub', 'Ergonomic Chair',
  'Mechanical Keyboard', 'Monitor Stand', 'Webcam HD', 'Bluetooth Speaker', 'Tablet Sleeve',
  'HDMI Cable', 'Power Strip', 'Desk Mat', 'File Organizer', 'Label Printer',
  'Whiteboard Markers', 'Coffee Mug Set', 'Standing Desk', 'Cable Clips', 'Surge Protector',
  'Laser Pointer', 'Document Scanner', 'Paper Shredder', 'Stapler Heavy Duty', 'Ballpoint Pens',
  'Sticky Notes', 'Binder Clips', 'Highlighters', 'Calculator', 'Phone Stand',
]

const CATEGORIES = ['Electronics', 'Home', 'Office'] as const
const REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const
const SUPPLIERS = ['Apex Supply', 'Brightline Co', 'Northwind Labs', 'Summit Retail', 'Vertex Media']

const simulationRows = rows(ROW_COUNT, (i) => {
  const category = CATEGORIES[i % CATEGORIES.length]
  const letter = String.fromCharCode(65 + (i % 26))

  return {
    sku: `${letter}-${100 + i}`,
    name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
    category,
    region: REGIONS[i % REGIONS.length],
    supplier: SUPPLIERS[i % SUPPLIERS.length],
    price: Math.round((9.99 + (i * 17.3) % 340) * 100) / 100,
    stock: 15 + ((i * 37) % 900),
    rating: Math.round((2.5 + (i % 25) / 10) * 10) / 10,
    active: i % 4 !== 2,
  }
})

export const dynamicTableDatasets: DynamicTableDataset[] = [
  {
    id: 'simulation',
    title: 'Simulation Data',
    description: 'Single 200,000-row dataset for AG Grid server-side performance testing',
    fields: [
      { field: 'sku', headerName: 'SKU', type: 'text', width: 110 },
      { field: 'name', headerName: 'Product', type: 'text', minWidth: 160, rowDrag: true },
      { field: 'category', headerName: 'Category', type: 'set', width: 130 },
      { field: 'region', headerName: 'Region', type: 'set', width: 120 },
      { field: 'supplier', headerName: 'Supplier', type: 'text', minWidth: 150 },
      { field: 'price', headerName: 'Price', type: 'currency', width: 120, aggFunc: 'avg' },
      { field: 'stock', headerName: 'Stock', type: 'number', width: 100, aggFunc: 'sum' },
      { field: 'rating', headerName: 'Rating', type: 'number', width: 105, aggFunc: 'avg' },
      { field: 'active', headerName: 'Active', type: 'boolean', width: 95 },
    ],
    rowData: simulationRows,
  },
]

export const DYNAMIC_TABLE_ROW_COUNT = ROW_COUNT
