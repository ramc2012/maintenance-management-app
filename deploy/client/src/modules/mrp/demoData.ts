export const DEMO_REQUIREMENTS = [
  {
    id: 'demo-mrp-001',
    title: 'Air Compressor A Quarterly Spares',
    vendorName: 'Atlas Copco Services',
    vendorContact: 'svc-west@atlascopco.demo',
    category: 'SPARES',
    department: 'Mechanical',
    priority: 'HIGH',
    financialYear: '2026-27',
    status: 'PENDING',
    createdAt: '2026-04-18T09:30:00.000Z',
    totalValue: 186500,
    remarks: 'Prepared for Q2 preventive maintenance window at ANK-GGS-2.',
    items: [
      { id: 'demo-mrp-001-1', matCode: 'AC-KIT-01', description: 'Air filter element kit', hsnCode: '8421', quantity: 4, unit: 'Set', y1: 4, y2: 4, y3: 2, deliveryPeriod: '2 Weeks', unitPrice: 12500, total: 50000 },
      { id: 'demo-mrp-001-2', matCode: 'AC-LUBE-05', description: 'Compressor lubricant 20L', hsnCode: '2710', quantity: 6, unit: 'Ltr', y1: 6, y2: 4, y3: 2, deliveryPeriod: '1 Week', unitPrice: 4750, total: 28500 },
      { id: 'demo-mrp-001-3', matCode: 'AC-SEAL-03', description: 'Seal and gasket overhaul pack', hsnCode: '4016', quantity: 3, unit: 'Set', y1: 3, y2: 2, y3: 1, deliveryPeriod: '3 Weeks', unitPrice: 36000, total: 108000 },
    ],
    files: [],
  },
  {
    id: 'demo-mrp-002',
    title: 'Calibration Van Support Materials',
    vendorName: 'Precision Field Instruments',
    vendorContact: 'ops@precision-field.demo',
    category: 'STORES',
    department: 'Instrumentation',
    priority: 'MEDIUM',
    financialYear: '2026-27',
    status: 'APPROVED',
    createdAt: '2026-04-16T14:15:00.000Z',
    totalValue: 84200,
    remarks: 'Routine instrument calibration consumables for CMS contract support.',
    items: [
      { id: 'demo-mrp-002-1', matCode: 'CAL-TUBE-02', description: 'Impulse tubing SS 1/4"', hsnCode: '7306', quantity: 120, unit: 'Mtr', y1: 40, y2: 40, y3: 40, deliveryPeriod: '10 Days', unitPrice: 185, total: 22200 },
      { id: 'demo-mrp-002-2', matCode: 'CAL-FIT-09', description: 'Instrumentation compression fittings', hsnCode: '7307', quantity: 80, unit: 'Nos', y1: 30, y2: 30, y3: 20, deliveryPeriod: '2 Weeks', unitPrice: 450, total: 36000 },
      { id: 'demo-mrp-002-3', matCode: 'CAL-TAG-11', description: 'SS tag plates and ferrules', hsnCode: '8310', quantity: 200, unit: 'Nos', y1: 100, y2: 50, y3: 50, deliveryPeriod: '1 Week', unitPrice: 130, total: 26000 },
    ],
    files: [],
  },
];

export const DEMO_DRAFTS = [
  {
    id: 'demo-draft-001',
    title: 'Fire Water Pump Engine Service Kit',
    vendorName: 'Kirloskar Emergency Systems',
    category: 'SERVICE',
    department: 'Mechanical',
    items: [
      { id: 'demo-draft-001-1', description: 'Annual engine inspection and injector tuning', quantity: 1, unit: 'Set', unitPrice: 95000, total: 95000 },
      { id: 'demo-draft-001-2', description: 'On-site load test support', quantity: 1, unit: 'Set', unitPrice: 42000, total: 42000 },
    ],
    savedAt: '2026-04-19T17:45:00.000Z',
  },
];
