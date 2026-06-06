/**
 * Seed daily-checklist templates.
 *
 * Run:  npm run seed:checklists   (after `prisma migrate deploy`)
 *
 * Currently seeds the Instrumentation DPR for a drilling rig (NG-1500-4),
 * transcribed from the field Excel "Instt DPR.xlsx". Add more templates to
 * the TEMPLATES array — the form renders entirely from this structure.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AnyTemplate = {
  code: string;
  name: string;
  discipline: 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION';
  description?: string;
  rigType?: string;
  headerFields: any[];
  sections: any[];
  // Usernames allowed to approve each gate. ADMIN role can always approve.
  approvers?: { shiftIncharge: string[]; instrumentIncharge: string[] };
};

const INSTRUMENT_DPR: AnyTemplate = {
  code: 'INST_DPR_RIG',
  name: 'Instrumentation DPR — Drilling Rig',
  discipline: 'INSTRUMENTATION',
  description: 'Daily Progress Report for rig instrumentation: drilling parameters, savers, inspection jobs, and maintenance work.',
  rigType: 'NG-1500-4',
  // Designated approvers (usernames). ADMIN can always approve. Update via the
  // template API or here to add real Shift/Instrument Incharge accounts.
  approvers: {
    shiftIncharge: ['admin'],
    instrumentIncharge: ['admin'],
  },
  headerFields: [
    { key: 'wellName', label: 'Well Name', type: 'text' },
    { key: 'rigName', label: 'Rig Name', type: 'text', default: 'NG-1500-4' },
    { key: 'operation', label: 'Present Operation', type: 'text' },
    { key: 'section', label: 'Section', type: 'text', default: 'Instrumentation' },
  ],
  sections: [
    {
      key: 'drilling_params',
      title: 'Parameter Checklist — Drilling',
      type: 'PARAMETERS',
      items: [
        { key: 'hook_load', label: 'Hook Load (WOH)', unit: 'T' },
        { key: 'hole_depth', label: 'Hole Depth', unit: 'm' },
        { key: 'bit_position', label: 'Bit Position', unit: 'm' },
        { key: 'block_height', label: 'Block Height', unit: 'm' },
        { key: 'tds_rpm', label: 'TDS RPM', unit: 'rpm' },
        { key: 'tds_torque', label: 'TDS Torque', unit: 'lbf-ft' },
        { key: 'pump_spm', label: 'Pump SPM', unit: 'spm' },
        { key: 'pump_pressure', label: 'Pump Pressure', unit: 'psi' },
        { key: 'return_flow', label: 'Return Flow', unit: '%' },
        { key: 'hc_gas', label: 'HC Gas Sensor (LEL)', note: 'Note reading from sensor', cols: [{ key: 'ss', label: 'SS' }, { key: 'bn', label: 'BN' }] },
        { key: 'h2s_gas', label: 'H2S Gas Sensor', note: 'Note reading from sensor', cols: [{ key: 'ss', label: 'SS' }, { key: 'bn', label: 'BN' }] },
        { key: 'trip_tanks', label: 'Trip Tanks', unit: 'm3', cols: [{ key: 'tt1', label: 'TT-1' }, { key: 'tt2', label: 'TT-2' }] },
        { key: 'suction_tank', label: 'Suction Tank Level (Pit3)', unit: 'm3' },
        { key: 'interm_tank', label: 'Interm. Tank Level (Pit2)', unit: 'm3' },
        { key: 'ss_tank', label: 'SS Tank Level (Pit1)', unit: 'm3' },
        { key: 'reserve_tank', label: 'Reserve Tank Level', unit: 'm3' },
        { key: 'dgb_gas', label: 'DGB Gas Consumption (if in use)', unit: 'm3' },
      ],
    },
    {
      key: 'saver_params',
      title: 'Parameter Checklist — Saver',
      type: 'STATUS_LIST',
      // each item response: { status: OK | ATTENTION | NA, value }
      items: [
        { key: 'acs', label: 'ACS', defaultValue: 'NA' },
        { key: 'drawworks_cal', label: 'Drawworks Calibration', defaultValue: 'NA' },
        { key: 'bottom_saver', label: 'Bottom Saver' },
        { key: 'casing_board_saver', label: 'Casing Strabbing Board Saver' },
        { key: 'catwalk_saver', label: 'Catwalk Saver' },
        { key: 'crown_saver', label: 'Crown Saver' },
        { key: 'floor_saver', label: 'Floor Saver' },
        { key: 'monkey_board_saver', label: 'Monkey Board Saver (Up/Down)' },
        { key: 'power_tong_saver', label: 'Power Tong Saver' },
        { key: 'avph_saver', label: 'AVPH Saver' },
      ],
    },
    {
      key: 'inspection_jobs',
      title: 'Inspection Job',
      type: 'INSPECTION_GROUP',
      // each item response: { status: OK | ATTENTION | NA, remark }
      groups: [
        { key: 'comm_redundancy', title: '1. Communication Redundancy Status', items: [
          { key: 'fo_status', label: 'Status of FO1, FO2, FO3, FO4 communication' },
        ]},
        { key: 'camera', title: '2. Camera Inspection', items: [
          { key: 'op_cam', label: 'Working and viewing angle of Operation Camera' },
          { key: 'surv_cam', label: 'Working and viewing angle of Surveillance Camera' },
          { key: 'cam_recording', label: 'Camera recording status' },
        ]},
        { key: 'gas_panel', title: '3. Gas Sensor Control Panel', items: [
          { key: 'power_fault', label: 'Check for Power ON and any fault status' },
        ]},
        { key: 'talkback', title: '4. Talkback Status', items: [
          { key: 'dcc_derrick', label: 'DCC to Derrick Talkback' },
          { key: 'dcc_racking', label: 'DCC to Racking Board Talkback' },
        ]},
        { key: 'active_alarms', title: '5. Relevant Active Alarms', items: [
          { key: 'alarms', label: 'Review relevant active alarms' },
        ]},
        { key: 'wireless', title: '6. Wireless Sensor Modules', items: [
          { key: 'tds_wireless', label: 'Communication status of TDS wireless sensors' },
          { key: 'catwalk_wireless', label: 'Communication status of Catwalk wireless sensors' },
        ]},
        { key: 'function_test', title: '7. Function Test of Equipment', items: [
          { key: 'catwalk_test', label: 'Test working of Catwalk' },
          { key: 'pct_test', label: 'Test working of PCT (Centre Well/Park movement)' },
          { key: 'tds_rla', label: 'Top Drive RLA Function' },
          { key: 'hmanifold', label: 'Match Raw Counts and Valve status in H-Manifold' },
          { key: 'latch_test', label: 'Test Open/Close working of frequently used latches' },
          { key: 'joystick', label: 'Test Joystick feedback from HMI' },
        ]},
        { key: 'fire_detector', title: '8. Fire Detector PCR', items: [
          { key: 'smoke_blink', label: 'Check for blinking status of Smoke Detectors' },
          { key: 'mcp_power', label: 'Check for power active status of MCP and smoke detectors' },
        ]},
        { key: 'pcr_ups', title: '9. PCR UPS Status', items: [
          { key: 'ups_status', label: 'Battery percent and charging status' },
        ]},
        { key: 'general_inspection', title: '10. General Inspection', items: [
          { key: 'pct_cables', label: 'PCT Cables and Sensors' },
          { key: 'drawworks_jb', label: 'Drawworks JB and Crown Saver' },
          { key: 'mudpump_jb', label: 'Mud Pump JB and Sensors' },
          { key: 'avph', label: 'AVPH' },
          { key: 'catwalk_gen', label: 'Catwalk' },
        ]},
      ],
    },
    {
      key: 'maintenance_work',
      title: 'Maintenance Work Details',
      type: 'WORK_LOG',
      // response: { DAY: {crew, jobs}, NIGHT: {crew, jobs} }
      shifts: [
        { key: 'DAY', label: 'Day Shift' },
        { key: 'NIGHT', label: 'Night Shift' },
      ],
    },
    {
      key: 'signoff',
      title: 'Sign-off',
      type: 'SIGNOFF',
      items: [
        { key: 'shift_incharge', label: 'Shift Incharge' },
        { key: 'dept_incharge', label: 'Instrumentation Incharge' },
      ],
    },
  ],
};

const TEMPLATES: AnyTemplate[] = [INSTRUMENT_DPR];

async function main() {
  for (const t of TEMPLATES) {
    const existing = await prisma.checklistTemplate.findUnique({ where: { code: t.code } });
    if (existing) {
      await prisma.checklistTemplate.update({
        where: { code: t.code },
        data: {
          name: t.name,
          discipline: t.discipline,
          description: t.description ?? null,
          rigType: t.rigType ?? null,
          headerFields: t.headerFields,
          sections: t.sections,
          approvers: t.approvers ?? undefined,
          isActive: true,
        },
      });
      console.log(`Updated template: ${t.code}`);
    } else {
      await prisma.checklistTemplate.create({
        data: {
          code: t.code,
          name: t.name,
          discipline: t.discipline,
          description: t.description ?? null,
          rigType: t.rigType ?? null,
          headerFields: t.headerFields,
          sections: t.sections,
          approvers: t.approvers ?? undefined,
          isActive: true,
          createdBy: 'seed',
        },
      });
      console.log(`Created template: ${t.code}`);
    }
  }
  console.log('Checklist templates seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
