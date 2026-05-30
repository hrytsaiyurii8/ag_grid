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

const EMPLOYEE_NAMES = [
  'Alex Kim', 'Sam Rivera', 'Jordan Lee', 'Taylor Brooks', 'Morgan Chen',
  'Riley Patel', 'Casey Nguyen', 'Jamie Foster', 'Avery Walsh', 'Quinn Martinez',
  'Drew Anderson', 'Skyler James', 'Reese Thompson', 'Blake Cooper', 'Cameron Reed',
  'Dakota Hayes', 'Emery Bell', 'Finley Scott', 'Harper Gray', 'Indigo Price',
  'Jules Turner', 'Kai Morgan', 'Logan Brooks', 'Marley Diaz', 'Noel Carter',
  'Oakley Ward', 'Parker Ellis', 'River Stone', 'Sage Young', 'Tatum Hale',
]
const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Marketing', 'Finance'] as const
const ROLES: Record<(typeof DEPARTMENTS)[number], string[]> = {
  Engineering: ['Developer', 'Tech Lead', 'QA Engineer', 'DevOps'],
  Sales: ['Account Exec', 'SDR', 'Sales Manager'],
  HR: ['Coordinator', 'Recruiter', 'HR Manager'],
  Marketing: ['Manager', 'Content Writer', 'Analyst'],
  Finance: ['Accountant', 'Controller', 'Analyst'],
}

const COMPANY_PREFIXES = ['Northwind', 'Brightline', 'Summit', 'Kite', 'Harbor', 'Apex', 'Vertex', 'Nova', 'Pulse', 'Zenith']
const CONTACT_FIRST = ['Elena', 'James', 'Priya', 'Noah', 'Lina', 'Marcus', 'Sofia', 'Ethan', 'Mia', 'Oliver']
const CONTACT_LAST = ['Voss', 'Ortiz', 'Shah', 'Park', 'Berg', 'Cole', 'Reed', 'Hayes', 'Kim', 'Walsh']
const TIERS = ['Enterprise', 'Pro', 'Standard'] as const
const COUNTRIES = ['Germany', 'USA', 'UK', 'Canada', 'Sweden', 'France', 'Australia', 'Japan', 'Netherlands', 'Spain']

const ORDER_CUSTOMERS = [
  'Northwind Labs', 'Brightline Co', 'Summit Retail', 'Harbor Foods', 'Kite Analytics',
  'Apex Systems', 'Vertex Media', 'Nova Health', 'Pulse Fitness', 'Zenith Travel',
]
const ORDER_STATUSES = ['Delivered', 'Processing', 'Shipped', 'Cancelled', 'Pending'] as const

const PROJECT_NAMES = [
  'Mobile App v2', 'Data Warehouse', 'Partner Portal', 'Security Audit', 'Brand Refresh',
  'API Gateway', 'Customer Portal', 'Inventory Sync', 'ML Pipeline', 'Compliance Pack',
  'Payment Integration', 'Reporting Dashboard', 'SSO Rollout', 'Cloud Migration', 'Chat Widget',
]
const PROJECT_OWNERS = EMPLOYEE_NAMES.slice(0, 15)
const PHASES = ['Discovery', 'Build', 'Review', 'Launch'] as const

const INVENTORY_ITEMS = PRODUCT_NAMES
const WAREHOUSES = ['East', 'West', 'Central'] as const

const TICKET_SUBJECTS = [
  'Login timeout on SSO', 'Export CSV missing columns', 'Billing address update',
  'API rate limit errors', 'Dark mode contrast issue', 'Password reset email delay',
  'Invoice PDF formatting', 'Mobile layout broken', 'Webhook delivery failures',
  'Search index out of sync', 'Role permissions incorrect', 'Dashboard load slow',
  'Two-factor setup error', 'Bulk import validation', 'Report timezone wrong',
  'Session expires too soon', 'Attachment upload limit', 'Filter not persisting',
  'Chart data mismatch', 'Notification duplicates', 'Audit log gap',
  'SSO certificate expiry', 'Rate card outdated', 'Merge conflict on save',
  'Cache stale after update', 'Export timeout on large set', 'Column sort broken',
  'Print view truncated', 'API docs outdated', 'Trial extension request',
]
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const

const ACCOUNTS = ['Operating', 'Payroll', 'Revenue', 'Vendor AP', 'Petty Cash', 'Tax Reserve']
const TXN_TYPES = ['Debit', 'Credit'] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function dateOffset(baseYear: number, baseMonth: number, day: number, offsetDays: number): string {
  const d = new Date(baseYear, baseMonth - 1, day + offsetDays)
  return d.toISOString().slice(0, 10)
}

const productRows = rows(ROW_COUNT, (i) => {
  const category = CATEGORIES[i % CATEGORIES.length]
  const letter = String.fromCharCode(65 + (i % 26))
  return {
    sku: `${letter}-${100 + i}`,
    name: PRODUCT_NAMES[i % PRODUCT_NAMES.length],
    category,
    price: Math.round((9.99 + (i * 17.3) % 340) * 100) / 100,
    stock: 15 + ((i * 37) % 900),
    active: i % 4 !== 2,
  }
})

const employeeRows = rows(ROW_COUNT, (i) => {
  const department = DEPARTMENTS[i % DEPARTMENTS.length]
  const roleList = ROLES[department]
  return {
    id: i + 1,
    employee: EMPLOYEE_NAMES[i],
    department,
    role: roleList[i % roleList.length],
    salary: 55000 + ((i * 4200) % 95000),
    bonus: Math.round((3 + (i * 1.7) % 18) * 10) / 10,
  }
})

const customerRows = rows(ROW_COUNT, (i) => ({
  accountId: `AC-${900 + i}`,
  company: `${COMPANY_PREFIXES[i % COMPANY_PREFIXES.length]} ${['Labs', 'Co', 'Retail', 'Analytics', 'Foods'][i % 5]}`,
  contact: `${CONTACT_FIRST[i % CONTACT_FIRST.length]} ${CONTACT_LAST[i % CONTACT_LAST.length]}`,
  tier: TIERS[i % TIERS.length],
  country: COUNTRIES[i % COUNTRIES.length],
  ltv: 12000 + ((i * 8300) % 280000),
  verified: i % 3 !== 1,
}))

const orderRows = rows(ROW_COUNT, (i) => {
  const status = ORDER_STATUSES[i % ORDER_STATUSES.length]
  const items = status === 'Cancelled' ? 0 : 1 + (i % 35)
  return {
    orderNo: `ORD-${1001 + i}`,
    customer: ORDER_CUSTOMERS[i % ORDER_CUSTOMERS.length],
    status,
    orderDate: dateOffset(2026, 4, 1, i),
    items,
    total: status === 'Cancelled' ? 0 : Math.round((items * (42 + (i * 11.3) % 380)) * 100) / 100,
    shipped: status === 'Delivered' || status === 'Shipped',
  }
})

const projectRows = rows(ROW_COUNT, (i) => {
  const budget = 40000 + ((i * 12000) % 260000)
  const complete = Math.min(99, 5 + ((i * 11) % 95))
  const spent = Math.round(budget * (complete / 100) * (0.85 + (i % 5) * 0.03))
  return {
    code: `PRJ-${pad2(i + 1)}`,
    project: PROJECT_NAMES[i % PROJECT_NAMES.length],
    owner: PROJECT_OWNERS[i % PROJECT_OWNERS.length],
    phase: PHASES[i % PHASES.length],
    complete,
    budget,
    spent,
  }
})

const inventoryRows = rows(ROW_COUNT, (i) => {
  const qty = 10 + ((i * 29) % 950)
  const reorderAt = 20 + (i % 80)
  return {
    bin: `${String.fromCharCode(65 + (i % 5))}${1 + (i % 4)}-${pad2((i % 12) + 1)}`,
    item: INVENTORY_ITEMS[i % INVENTORY_ITEMS.length],
    warehouse: WAREHOUSES[i % WAREHOUSES.length],
    qty,
    unitCost: Math.round((3.5 + (i * 6.7) % 220) * 100) / 100,
    reorderAt,
    lowStock: qty < reorderAt,
  }
})

const ticketRows = rows(ROW_COUNT, (i) => ({
  ticketId: `TK-${4401 + i}`,
  subject: TICKET_SUBJECTS[i % TICKET_SUBJECTS.length],
  priority: PRIORITIES[i % PRIORITIES.length],
  assignee: EMPLOYEE_NAMES[i % EMPLOYEE_NAMES.length],
  opened: dateOffset(2026, 5, 1, i),
  slaHours: [72, 48, 24, 4, 2][i % 5],
  resolved: i % 3 === 0,
}))

const transactionRows = rows(ROW_COUNT, (i) => ({
  txnId: `TX-${90001 + i}`,
  account: ACCOUNTS[i % ACCOUNTS.length],
  type: TXN_TYPES[i % TXN_TYPES.length],
  posted: dateOffset(2026, 5, 1, i),
  amount: Math.round((500 + (i * 3100) % 72000) * 100) / 100,
  fee: i % 4 === 0 ? Math.round((i % 30) * 2.5 * 10) / 10 : 0,
  reconciled: i % 2 === 0,
}))

export const dynamicTableDatasets: DynamicTableDataset[] = [
  {
    id: 'products',
    title: 'Products',
    description: 'Catalog SKUs, pricing, and stock levels',
    fields: [
      { field: 'sku', headerName: 'SKU', type: 'text', width: 110 },
      { field: 'name', headerName: 'Product', type: 'text', minWidth: 160, rowDrag: true },
      { field: 'category', headerName: 'Category', type: 'set', width: 130 },
      { field: 'price', headerName: 'Price', type: 'currency', width: 120, aggFunc: 'avg' },
      { field: 'stock', headerName: 'Stock', type: 'number', width: 100 },
      { field: 'active', headerName: 'Active', type: 'boolean', width: 95 },
    ],
    rowData: productRows,
  },
  {
    id: 'employees',
    title: 'Employees',
    description: 'HR roster with grouped work and compensation columns',
    fields: [
      { field: 'id', headerName: 'ID', type: 'number', width: 80 },
      { field: 'employee', headerName: 'Name', type: 'text', minWidth: 150 },
      { field: 'department', headerName: 'Department', type: 'set', group: 'Work' },
      { field: 'role', headerName: 'Role', type: 'text', group: 'Work' },
      { field: 'salary', headerName: 'Salary', type: 'currency', group: 'Compensation', aggFunc: 'avg' },
      { field: 'bonus', headerName: 'Bonus %', type: 'percent', group: 'Compensation', width: 110 },
    ],
    rowData: employeeRows,
  },
  {
    id: 'customers',
    title: 'Customers',
    description: 'CRM accounts with tier and lifetime value',
    fields: [
      { field: 'accountId', headerName: 'Account', type: 'text', width: 100 },
      { field: 'company', headerName: 'Company', type: 'text', minWidth: 160 },
      { field: 'contact', headerName: 'Contact', type: 'text', width: 140 },
      { field: 'tier', headerName: 'Tier', type: 'set', width: 110 },
      { field: 'country', headerName: 'Country', type: 'set', width: 120 },
      { field: 'ltv', headerName: 'LTV', type: 'currency', width: 120, aggFunc: 'sum' },
      { field: 'verified', headerName: 'Verified', type: 'boolean', width: 100 },
    ],
    rowData: customerRows,
  },
  {
    id: 'orders',
    title: 'Orders',
    description: 'Sales orders with status and fulfillment dates',
    fields: [
      { field: 'orderNo', headerName: 'Order #', type: 'text', width: 110 },
      { field: 'customer', headerName: 'Customer', type: 'text', minWidth: 140 },
      { field: 'status', headerName: 'Status', type: 'set', width: 120 },
      { field: 'orderDate', headerName: 'Ordered', type: 'date', width: 120 },
      { field: 'items', headerName: 'Items', type: 'number', width: 90, aggFunc: 'sum' },
      { field: 'total', headerName: 'Total', type: 'currency', width: 120, aggFunc: 'sum' },
      { field: 'shipped', headerName: 'Shipped', type: 'boolean', width: 100 },
    ],
    rowData: orderRows,
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Delivery tracker with budget and completion',
    fields: [
      { field: 'code', headerName: 'Code', type: 'text', width: 100 },
      { field: 'project', headerName: 'Project', type: 'text', minWidth: 160 },
      { field: 'owner', headerName: 'Owner', type: 'text', width: 130 },
      { field: 'phase', headerName: 'Phase', type: 'set', group: 'Progress' },
      { field: 'complete', headerName: '% Done', type: 'percent', group: 'Progress', width: 110 },
      { field: 'budget', headerName: 'Budget', type: 'currency', group: 'Finance', aggFunc: 'sum' },
      { field: 'spent', headerName: 'Spent', type: 'currency', group: 'Finance', aggFunc: 'sum' },
    ],
    rowData: projectRows,
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Warehouse bins, quantities, and reorder thresholds',
    fields: [
      { field: 'bin', headerName: 'Bin', type: 'text', width: 90 },
      { field: 'item', headerName: 'Item', type: 'text', minWidth: 150 },
      { field: 'warehouse', headerName: 'Warehouse', type: 'set', width: 120 },
      { field: 'qty', headerName: 'Qty', type: 'number', width: 90, aggFunc: 'sum' },
      { field: 'unitCost', headerName: 'Unit Cost', type: 'currency', width: 120 },
      { field: 'reorderAt', headerName: 'Reorder At', type: 'number', width: 110 },
      { field: 'lowStock', headerName: 'Low Stock', type: 'boolean', width: 105 },
    ],
    rowData: inventoryRows,
  },
  {
    id: 'tickets',
    title: 'Support Tickets',
    description: 'Help desk queue with priority and SLA',
    fields: [
      { field: 'ticketId', headerName: 'Ticket', type: 'text', width: 100 },
      { field: 'subject', headerName: 'Subject', type: 'text', minWidth: 180 },
      { field: 'priority', headerName: 'Priority', type: 'set', width: 110 },
      { field: 'assignee', headerName: 'Assignee', type: 'text', width: 130 },
      { field: 'opened', headerName: 'Opened', type: 'date', width: 120 },
      { field: 'slaHours', headerName: 'SLA (h)', type: 'number', width: 100 },
      { field: 'resolved', headerName: 'Resolved', type: 'boolean', width: 100 },
    ],
    rowData: ticketRows,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    description: 'Ledger entries with debit/credit and reconciliation',
    fields: [
      { field: 'txnId', headerName: 'Txn ID', type: 'text', width: 100 },
      { field: 'account', headerName: 'Account', type: 'text', minWidth: 140 },
      { field: 'type', headerName: 'Type', type: 'set', width: 110 },
      { field: 'posted', headerName: 'Posted', type: 'date', width: 120 },
      { field: 'amount', headerName: 'Amount', type: 'currency', width: 120, aggFunc: 'sum' },
      { field: 'fee', headerName: 'Fee', type: 'currency', width: 100 },
      { field: 'reconciled', headerName: 'Reconciled', type: 'boolean', width: 110 },
    ],
    rowData: transactionRows,
  },
]

export const DYNAMIC_TABLE_ROW_COUNT = ROW_COUNT
