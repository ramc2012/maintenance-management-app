import { Discipline, PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { ensureOperationalCatalog, toLogDate } from '../src/services/operationsCatalog';

const prisma = new PrismaClient();

const SEED_USER = 'dpr-report-seed';

type MaintenanceSeed = {
  id: string;
  date: string;
  service: string;
  section: string;
  installationId: string;
  location?: string;
  jobType: string;
  criticality?: number;
  notificationNo?: string;
  description: string;
  status: string;
  remarks?: string;
  start?: string;
  end?: string;
};

type CompressorSeed = {
  date: string;
  compressorId: string;
  installationId?: string;
  service?: string;
  description: string;
  runHours: number;
  downtimeHours?: number;
  standbyHours?: number;
  cumulativeHours?: number;
  inputGasVolume?: number;
  outputGasVolume?: number;
  fuelGasVolume?: number;
  suctionPressure?: number;
  dischargePressure?: number;
  dischargeTemp?: number;
  flowRate?: number;
  tripCount?: number;
  shutdownReason?: string;
  remarks?: string;
};

type ParsedDprBlock = {
  sourceFile: string;
  sourceIndex: number;
  reportType: string;
  installationId: string;
  service: string;
  section: string;
  date: string;
  lines: string[];
  text: string;
};

const maintenanceSeeds: MaintenanceSeed[] = [
  {
    id: 'dpr-apr-2026-elect-eps-motwan-oil-pump-dg',
    date: '2026-04-02',
    service: 'ST',
    section: 'Electrical',
    installationId: 'EPS MOTWAN',
    jobType: 'PM',
    notificationNo: '3800559841',
    description: 'PMS of oil pump motors and 160 kVA emergency DG set.',
    status: 'Closed',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-elect-e1400-17-generator-field-cable',
    date: '2026-04-02',
    service: 'DS',
    section: 'Electrical',
    installationId: 'E-1400-XVII',
    jobType: 'CM',
    description: 'Generator field cable multipin socket crimping and fitting at drilling rig.',
    status: 'Closed',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-elect-kim-dsa-dg-error-141',
    date: '2026-04-02',
    service: 'DS',
    section: 'Electrical',
    installationId: 'KIM DSA',
    jobType: 'BD',
    description: '250 kVA DG set non-functional since 08:00 hrs with Error Code 141.',
    status: 'Open',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-elect-ggs-iv-dahej-apfc',
    date: '2026-04-02',
    service: 'ST',
    section: 'Electrical',
    installationId: 'GGS-IV DAHEJ',
    jobType: 'PM',
    description: 'Preventive maintenance of APFC panel and capacitor bank.',
    status: 'Closed',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-elect-ptys-gandhar-accumulator-motor',
    date: '2026-04-02',
    service: 'ST',
    section: 'Electrical',
    installationId: 'PTYS GANDHAR',
    jobType: 'CM',
    description: 'Accumulator motor trial completed.',
    status: 'Closed',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-elect-ahwr-50-iii-pmcc-panel',
    date: '2026-04-02',
    service: 'WS',
    section: 'Electrical',
    installationId: 'AHWR-50-III',
    jobType: 'CM',
    description: 'PMCC panel received; trial pending due to DG unavailability.',
    status: 'Open',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-apr-2026-inst-e1400-17-rig-sense',
    date: '2026-04-01',
    service: 'DS',
    section: 'Instrumentation',
    installationId: 'E-1400-17',
    jobType: 'ERECTION',
    description: 'RIO, E-Spectrum, RigSense, LEL sensor, and tank level sensor erection work.',
    status: 'In Progress',
    remarks: 'Source: DPR HM April 2026. Time: 09:30 to 18:30.',
    start: '09:30',
    end: '18:30',
  },
  {
    id: 'dpr-apr-2026-inst-ahwr-50-iii-dismantling',
    date: '2026-04-01',
    service: 'WS',
    section: 'Instrumentation',
    installationId: 'AHWR-50-III',
    jobType: 'DISMANTLING',
    description: 'Instrumentation dismantling work.',
    status: 'Closed',
    remarks: 'Source: DPR HM April 2026. Time: 09:30 to 17:30.',
    start: '09:30',
    end: '17:30',
  },
  {
    id: 'dpr-apr-2026-inst-ng-1500-4-witsml-tds',
    date: '2026-04-01',
    service: 'DS',
    section: 'Instrumentation',
    installationId: 'NG-1500-4',
    jobType: 'CM',
    description: 'WITSML server configuration and TDS load sensing issue attended.',
    status: 'Open',
    remarks: 'Source: DPR HM April 2026.',
  },
  {
    id: 'dpr-may-2026-elect-mph-215hp-starter',
    date: '2026-05-01',
    service: 'ST',
    section: 'Electrical',
    installationId: 'MPH',
    jobType: 'CM',
    notificationNo: '3800561669',
    description: '215 HP starter panel work completed.',
    status: 'Closed',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-elect-eps-vi-11kv',
    date: '2026-05-01',
    service: 'ST',
    section: 'Electrical',
    installationId: 'EPS-VI',
    jobType: 'CM',
    description: '11 kV substation charging work.',
    status: 'Open',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-elect-e1400-v-route-dg',
    date: '2026-05-01',
    service: 'DS',
    section: 'Electrical',
    installationId: 'E-1400-V',
    jobType: 'CM',
    description: 'HT route survey, DG set, lighting, and trial run work.',
    status: 'Open',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-inst-e1400-7-e1400-5-ais',
    date: '2026-05-01',
    service: 'DS',
    section: 'Instrumentation',
    installationId: 'E-1400-7',
    jobType: 'CM',
    description: 'AIS, mini drillometer, H2S and LEL BN sensor cable work at E-1400-7 and E-1400-5.',
    status: 'Closed',
    remarks: 'Source: DPR HM May 2026. Time: 08:00 to 19:30.',
    start: '08:00',
    end: '19:30',
  },
  {
    id: 'dpr-may-2026-inst-ptys-fmp-zfc-dnft-level',
    date: '2026-05-01',
    service: 'ST',
    section: 'Instrumentation',
    installationId: 'PTYS INST FMP AREA-3',
    jobType: 'PM',
    description: 'GCP-1 ZFC-E DNFT issue attended and GCP-4 ZFC-C level switch PM for ME-1 and ME-2.',
    status: 'Closed',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-inst-ahwr-50-vi-pct-server-camera',
    date: '2026-05-01',
    service: 'WS',
    section: 'Instrumentation',
    installationId: 'AHWR-50-VI',
    jobType: 'CM',
    description: 'PCT laptop/server connectivity, camera cable, and breakout sequence acceleration attended.',
    status: 'Open',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-inst-qps-kim-flow-meter',
    date: '2026-05-01',
    service: 'ST',
    section: 'Instrumentation',
    installationId: 'QPS KIM ANK',
    jobType: 'CM',
    description: 'Gas flow meter and dispatch liquid mass flow meter issue attended; FT1373 calibration and MFM1727 communication check.',
    status: 'Closed',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-mech-nada-odp-vibration',
    date: '2026-05-01',
    service: 'ST',
    section: 'Mechanical',
    installationId: 'NADA EPS',
    jobType: 'CM',
    description: 'General inspection after ODP recirculation line installation; vibration observed in piping and supports required.',
    status: 'Open',
    remarks: 'Source: DPR HM May 2026.',
  },
  {
    id: 'dpr-may-2026-mech-gcp-pcv-calibration',
    date: '2026-05-01',
    service: 'ST',
    section: 'Mechanical',
    installationId: 'GGS-NG-GCP',
    jobType: 'PM',
    description: 'PM of PCV for consumer scrubber to consumer and LP gas to GCP; GCP area instrument calibration in progress.',
    status: 'In Progress',
    remarks: 'Source: DPR HM May 2026.',
  },
];

const compressorSeeds: CompressorSeed[] = [
  { date: '2026-05-01', compressorId: 'GGS-NG-GCP-MP-A', description: 'MP-A gas compressor', runHours: 24, cumulativeHours: 26734, inputGasVolume: 69629, outputGasVolume: 64701, fuelGasVolume: 2246, suctionPressure: 8.5, dischargePressure: 35.8, remarks: '10 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-01', compressorId: 'GGS-NG-GCP-MP-B', description: 'MP-B gas compressor', runHours: 16.75, downtimeHours: 7.25, cumulativeHours: 13203.75, inputGasVolume: 50000, outputGasVolume: 46502, suctionPressure: 8.5, dischargePressure: 35.7, tripCount: 3, shutdownReason: 'GEB power shutdown', remarks: 'Trips at 10:40, 14:00, and 15:15 hrs; loaded after GEB restoration.' },
  { date: '2026-05-01', compressorId: 'GGS-NG-GCP-LP-A', description: 'LP-A gas compressor', runHours: 24, cumulativeHours: 26938.17, inputGasVolume: 109444, outputGasVolume: 105082, fuelGasVolume: 5759, suctionPressure: 1.5, dischargePressure: 35.9, remarks: '05 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-01', compressorId: 'GGS-NG-GCP-LP-B', description: 'LP-B gas compressor', runHours: 16, downtimeHours: 8, cumulativeHours: 21446.83, inputGasVolume: 45630, outputGasVolume: 40847, suctionPressure: 1.5, dischargePressure: 35.8, tripCount: 3, shutdownReason: 'GEB power shutdown', remarks: 'Trips at 10:40, 14:00, and 15:15 hrs; all TT calibration done of LP-B by CMS team.' },
  { date: '2026-05-02', compressorId: 'GGS-NG-GCP-MP-A', description: 'MP-A gas compressor', runHours: 24, cumulativeHours: 26758, inputGasVolume: 57297, outputGasVolume: 53314, fuelGasVolume: 2261, suctionPressure: 8.5, dischargePressure: 36.2, remarks: '05 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-02', compressorId: 'GGS-NG-GCP-MP-B', description: 'MP-B gas compressor', runHours: 19, downtimeHours: 1.33, standbyHours: 3.67, cumulativeHours: 13222.75, inputGasVolume: 54809, outputGasVolume: 50203, suctionPressure: 8.5, dischargePressure: 36.1, tripCount: 1, shutdownReason: 'Compressor lubrication no flow and GEB shutdown', remarks: 'DNFT and battery replaced; GEB power resumed and package loaded.' },
  { date: '2026-05-02', compressorId: 'GGS-NG-GCP-LP-A', description: 'LP-A gas compressor', runHours: 24, cumulativeHours: 26962.17, inputGasVolume: 107406, outputGasVolume: 103977, fuelGasVolume: 5763, suctionPressure: 1.5, dischargePressure: 36.3, remarks: '05 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-02', compressorId: 'GGS-NG-GCP-LP-B', description: 'LP-B gas compressor', runHours: 20.67, downtimeHours: 3.33, cumulativeHours: 21467.5, inputGasVolume: 75384, outputGasVolume: 70769, suctionPressure: 1.5, dischargePressure: 36.4, tripCount: 2, shutdownReason: 'GEB power shutdown', remarks: 'Package tripped at 14:45 and 17:20 hrs; 02 ltr SS-220 oil top up.' },
  { date: '2026-05-10', compressorId: 'GGS-NG-GCP-MP-A', description: 'MP-A gas compressor', runHours: 24, cumulativeHours: 26939.5, inputGasVolume: 52034, outputGasVolume: 49926, fuelGasVolume: 2202, suctionPressure: 8.5, dischargePressure: 35.3, remarks: '05 ltr Servo NG-40 and 50 ltr Hycom C-220 oil top up.' },
  { date: '2026-05-10', compressorId: 'GGS-NG-GCP-MP-B', description: 'MP-B gas compressor', runHours: 23.67, downtimeHours: 0.17, standbyHours: 0.33, cumulativeHours: 13402.92, inputGasVolume: 65502, outputGasVolume: 62436, suctionPressure: 8.5, dischargePressure: 35.4, tripCount: 1, shutdownReason: 'GEB power shutdown', remarks: '35 ltr Hycom C-220 oil top up; restarted at 03:10 hrs.' },
  { date: '2026-05-10', compressorId: 'GGS-NG-GCP-LP-A', description: 'LP-A gas compressor', runHours: 24, cumulativeHours: 27154.17, inputGasVolume: 103836, outputGasVolume: 100713, fuelGasVolume: 5630, suctionPressure: 1.5, dischargePressure: 36.4, remarks: '10 ltr Servo NG-40 and 60 ltr Hycom C-220 oil top up.' },
  { date: '2026-05-10', compressorId: 'GGS-NG-GCP-LP-B', description: 'LP-B gas compressor', runHours: 23.33, downtimeHours: 0.17, standbyHours: 0.67, cumulativeHours: 21644.42, inputGasVolume: 83152, outputGasVolume: 80449, suctionPressure: 1.5, dischargePressure: 35.4, tripCount: 1, shutdownReason: 'GEB power shutdown', remarks: '20 ltr Hycom C-220 oil top up; restarted at 03:30 hrs.' },
  { date: '2026-05-11', compressorId: 'GGS-NG-GCP-MP-A', description: 'MP-A gas compressor', runHours: 24, cumulativeHours: 26963.5, inputGasVolume: 61139, outputGasVolume: 57486, fuelGasVolume: 2220, suctionPressure: 8.5, dischargePressure: 33.8, remarks: '05 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-11', compressorId: 'GGS-NG-GCP-MP-B', description: 'MP-B gas compressor', runHours: 23.33, downtimeHours: 0.42, standbyHours: 0.67, cumulativeHours: 13426.25, inputGasVolume: 62961, outputGasVolume: 59742, suctionPressure: 8.5, dischargePressure: 33.8, tripCount: 2, shutdownReason: 'GEB power shutdown', remarks: 'GEB shutdown at 09:00 and 03:40 hrs; package restarted and loaded.' },
  { date: '2026-05-11', compressorId: 'GGS-NG-GCP-LP-A', description: 'LP-A gas compressor', runHours: 24, cumulativeHours: 27178.17, inputGasVolume: 107763, outputGasVolume: 104529, fuelGasVolume: 5725, suctionPressure: 1.5, dischargePressure: 34.9, remarks: '05 ltr Servo NG-40 oil top up.' },
  { date: '2026-05-11', compressorId: 'GGS-NG-GCP-LP-B', description: 'LP-B gas compressor', runHours: 22.5, downtimeHours: 0.42, standbyHours: 1.5, cumulativeHours: 21666.92, inputGasVolume: 91896, outputGasVolume: 88320, suctionPressure: 1.5, dischargePressure: 34.2, tripCount: 2, shutdownReason: 'GEB power shutdown', remarks: 'DNFT battery replaced; package restarted after GEB power restoration.' },
];

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\u00a0/g, ' ');
}

function cleanLine(value: string) {
  return decodeXml(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([:;,.])/g, '$1')
    .trim();
}

function normalizeText(value: string) {
  return value.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
}

function slug(value: string) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function resolveReportFile(name: string) {
  const candidates = [
    path.resolve(process.cwd(), name),
    path.resolve(process.cwd(), '..', name),
    path.resolve(process.cwd(), '..', '..', name),
    path.resolve(process.cwd(), '..', '..', '..', name),
    path.resolve('/Users/chinnadurairamachandran/Downloads', name),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function extractDocxLines(filePath: string) {
  const xml = execFileSync('unzip', ['-p', filePath, 'word/document.xml'], {
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  });
  const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  return paragraphs
    .map((paragraph) => {
      const textRuns = paragraph.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [];
      return cleanLine(textRuns.map((run) => run.replace(/<[^>]+>/g, '')).join(''));
    })
    .filter(Boolean);
}

function detectReportHeading(line: string) {
  const normalized = normalizeText(line);
  if (/DPR.*GGS[-\s]?NG.*GCP/.test(normalized)) {
    return { reportType: 'DPR GGS-NG GCP', installationId: 'GGS-NG-GCP', service: 'ST', section: 'Mechanical' };
  }
  if (/DPR.*GCS.*MOTWAN/.test(normalized)) {
    return { reportType: 'DPR GCS MOTWAN', installationId: 'GCS MOTWAN', service: 'ST', section: 'Mechanical' };
  }
  if (/DPR.*GCP[-\s]?0?1/.test(normalized)) {
    return { reportType: 'DPR GCP-01', installationId: 'GCP-01', service: 'ST', section: 'Mechanical' };
  }
  if (/DPR.*GCP[-\s]?0?4/.test(normalized)) {
    return { reportType: 'DPR GCP-04', installationId: 'GCP-04', service: 'ST', section: 'Mechanical' };
  }
  if (/FMP.*ELECTRICAL.*DAILY.*PROGRESS/.test(normalized)) {
    return { reportType: 'FMP Electrical DPR', installationId: 'FMP AREA', service: 'ST', section: 'Electrical' };
  }
  return null;
}

function normalizeDate(raw: string | undefined, fallbackMonth: '04' | '05') {
  if (!raw) return `2026-${fallbackMonth}-01`;
  const cleaned = raw.replace(/\./g, '/').replace(/-/g, '/').trim();
  const parts = cleaned.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 3) return `2026-${fallbackMonth}-01`;
  if (parts[0].length === 4) {
    const [yyyy, mm, dd] = parts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const [dd, mm, yy] = parts;
  const yyyy = yy.length === 2 ? `20${yy}` : yy;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function dateFromLines(lines: string[], sourceFile: string) {
  const fallbackMonth = sourceFile.toLowerCase().includes('april') ? '04' : '05';
  const text = lines.join('\n');
  const explicitDate = text.match(/\bDATE\b\s*[:-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/i)?.[1]
    || text.match(/\bDate\b\s*[:-]?\s*([0-9]{1,4}[./-][0-9]{1,2}[./-][0-9]{1,4})/i)?.[1];
  const timestampDate = text.match(/\[(\d{1,2}\/\d{1,2}\/\d{2,4}),/)?.[1];
  return normalizeDate(explicitDate || timestampDate, fallbackMonth as '04' | '05');
}

function parseDprBlocks(filePath: string): ParsedDprBlock[] {
  const sourceFile = path.basename(filePath);
  const lines = extractDocxLines(filePath);
  const headings = lines
    .map((line, index) => ({ index, heading: detectReportHeading(line) }))
    .filter((item): item is { index: number; heading: NonNullable<ReturnType<typeof detectReportHeading>> } => Boolean(item.heading));

  return headings.map((item, sourceIndex) => {
    let start = item.index;
    for (let index = item.index - 1; index >= Math.max(0, item.index - 8); index -= 1) {
      if (/^\[\d{1,2}\/\d{1,2}\/\d{2,4},/.test(lines[index])) {
        start = index;
        break;
      }
    }
    const nextHeading = headings[sourceIndex + 1]?.index ?? lines.length;
    const nextMessage = lines.findIndex((line, index) => index > item.index && /^\[\d{1,2}\/\d{1,2}\/\d{2,4},/.test(line));
    const end = Math.min(nextHeading, nextMessage > item.index ? nextMessage : lines.length);
    const blockLines = lines.slice(start, end).filter(Boolean);
    return {
      sourceFile,
      sourceIndex,
      ...item.heading,
      date: dateFromLines(blockLines, sourceFile),
      lines: blockLines,
      text: blockLines.join('\n'),
    };
  });
}

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const match = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function parseHourValue(value: string | undefined) {
  if (!value) return undefined;
  const cleaned = value.trim().replace(',', '');
  const colon = cleaned.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) + Number(colon[2]) / 60;
  return parseNumber(cleaned);
}

function findNumber(lines: string[], pattern: RegExp) {
  const line = lines.find((entry) => pattern.test(entry));
  return parseNumber(line);
}

function findAfterLabel(lines: string[], pattern: RegExp) {
  const line = lines.find((entry) => pattern.test(entry));
  if (!line) return undefined;
  const after = line.split(/[:=-]/).slice(1).join('-');
  return parseNumber(after || line);
}

function cumulativeForUnit(lines: string[], unit: string) {
  const normalizedUnit = unit.replace('-', '[-\\s]?');
  const cumulativeIndex = lines.findIndex((line) => /Cumulative Running/i.test(line));
  const searchLines = cumulativeIndex >= 0 ? lines.slice(cumulativeIndex) : lines;
  const line = searchLines.find((entry) => new RegExp(`\\b${normalizedUnit}\\b`, 'i').test(entry));
  return parseHourValue(line?.match(/[:=-]\s*([0-9:.]+)/)?.[1]);
}

function extractUnitSection(lines: string[], unit: string, unitLabels: string[]) {
  const normalizedUnit = unit.replace('-', '[-\\s]?');
  const start = lines.findIndex((line) => new RegExp(`\\b${normalizedUnit}\\b`, 'i').test(line));
  if (start < 0) return [] as string[];
  const next = lines.findIndex((line, index) => {
    if (index <= start) return false;
    return unitLabels.some((candidate) => candidate !== unit && new RegExp(`\\b${candidate.replace('-', '[-\\s]?')}\\b`, 'i').test(line));
  });
  return lines.slice(start, next > start ? next : lines.length);
}

function parseGgsCompressorLogs(block: ParsedDprBlock): CompressorSeed[] {
  if (block.installationId !== 'GGS-NG-GCP') return [];
  const unitLabels = ['MP-A', 'MP-B', 'LP-A', 'LP-B'];
  return unitLabels.flatMap((unit) => {
    const sectionLines = extractUnitSection(block.lines, unit, unitLabels);
    const runHours = parseHourValue(sectionLines.find((line) => /R\/H/i.test(line))?.match(/R\/H\D*([0-9:.]+)/i)?.[1]);
    if (runHours === undefined) return [];
    const downtimeHours = parseHourValue(sectionLines.find((line) => /S\/D/i.test(line))?.match(/S\/D\D*([0-9:.]+)/i)?.[1]);
    const standbyHours = parseHourValue(sectionLines.find((line) => /S\/B/i.test(line))?.match(/S\/B\D*([0-9:.]+)/i)?.[1]);
    const inputGasVolume = findNumber(sectionLines, /Suction.*(Gas|Flow|SCM)/i);
    const outputGasVolume = findNumber(sectionLines, /(Discharge.*Compressed|Gas Compressed|SCM\/DAY)/i);
    const fuelGasVolume = findNumber(sectionLines, /Fuel Gas/i);
    const suctionPressure = findAfterLabel(sectionLines, /Suction.*Pr/i);
    const dischargePressure = findAfterLabel(sectionLines, /Discharge.*Pr/i);
    const tripCount = sectionLines.filter((line) => /trip/i.test(line)).length || undefined;

    return [{
      date: block.date,
      installationId: block.installationId,
      service: block.service,
      compressorId: `GGS-NG-GCP-${unit}`,
      description: `${unit} gas compressor`,
      runHours,
      downtimeHours,
      standbyHours,
      cumulativeHours: cumulativeForUnit(block.lines, unit),
      inputGasVolume,
      outputGasVolume,
      fuelGasVolume,
      suctionPressure,
      dischargePressure,
      tripCount,
      shutdownReason: downtimeHours ? 'See original DPR report' : undefined,
      remarks: block.text,
    }];
  });
}

function parseGcsMotwanCompressorLogs(block: ParsedDprBlock): CompressorSeed[] {
  if (block.installationId !== 'GCS MOTWAN') return [];
  const unitMatches = block.lines
    .map((line) => line.match(/\bUnit[-\s]?([123])\s*=\s*([0-9:]+)\s*\/\s*([0-9:]+)/i))
    .filter((match): match is RegExpMatchArray => Boolean(match));
  const unitRunHours = new Map<string, number>();
  unitMatches.forEach((match) => {
    unitRunHours.set(match[1], parseHourValue(match[3]) || 0);
  });
  const totalRunHours = Array.from(unitRunHours.values()).reduce((sum, value) => sum + value, 0);
  const gasCompressed = findNumber(block.lines, /Comp.*Approx|Compressed/i);
  const suctionPressure = findNumber(block.lines, /suction pressure/i);
  const dischargePressure = findNumber(block.lines, /final discharge pressure/i);
  const dischargeTemp = findNumber(block.lines, /final discharge temp/i);
  const flowRate = findNumber(block.lines, /flow rate/i);

  return ['1', '2', '3'].flatMap((unit) => {
    if (!unitRunHours.has(unit)) return [];
    const runHours = unitRunHours.get(unit) || 0;
    const fuelLine = block.lines.find((line) => new RegExp(`\\bUnit[-\\s]?${unit}\\b.*m`, 'i').test(line));
    const fuelGasVolume = parseNumber(fuelLine);
    const cumulativeIndex = block.lines.findIndex((line) => /Cumulative Running/i.test(line));
    const cumulativeLine = (cumulativeIndex >= 0 ? block.lines.slice(cumulativeIndex) : block.lines)
      .find((line) => new RegExp(`\\bUnit[-\\s]?${unit}\\b`, 'i').test(line));
    const cumulativeHours = parseHourValue(cumulativeLine?.match(/=\s*([0-9:.]+)/)?.[1]);
    const outputGasVolume = gasCompressed && totalRunHours > 0 ? Number(((gasCompressed * runHours) / totalRunHours).toFixed(2)) : undefined;
    const operatingRemark = block.lines.find((line) => new RegExp(`\\bUnit[-\\s]?${unit}\\b`, 'i').test(line) && /trip|stopp|runn|observe/i.test(line));

    return [{
      date: block.date,
      installationId: block.installationId,
      service: block.service,
      compressorId: `GCS-MOTWAN-UNIT-${unit}`,
      description: `GCS Motwan Unit-${unit} gas compressor`,
      runHours,
      downtimeHours: Math.max(24 - runHours, 0),
      cumulativeHours,
      outputGasVolume,
      fuelGasVolume,
      suctionPressure,
      dischargePressure,
      dischargeTemp,
      flowRate,
      tripCount: operatingRemark && /trip/i.test(operatingRemark) ? 1 : 0,
      shutdownReason: operatingRemark,
      remarks: block.text,
    }];
  });
}

function parseDprReports() {
  const reportFiles = ['DPR HM April 2026.docx', 'DPR HM May 2026.docx']
    .map(resolveReportFile)
    .filter((file): file is string => Boolean(file));
  const blocks = reportFiles.flatMap(parseDprBlocks);
  const parsedMaintenanceSeeds: MaintenanceSeed[] = blocks.map((block) => ({
    id: `dpr-full-${slug(block.sourceFile)}-${block.sourceIndex}-${slug(block.installationId)}-${block.date}`,
    date: block.date,
    service: block.service,
    section: block.section,
    installationId: block.installationId,
    jobType: 'DPR',
    criticality: 1,
    description: `${block.reportType} original report`,
    status: 'Closed',
    remarks: `Source: ${block.sourceFile}\n\n${block.text}`,
  }));

  const parsedCompressorSeeds = blocks.flatMap((block) => [
    ...parseGgsCompressorLogs(block),
    ...parseGcsMotwanCompressorLogs(block),
  ]);
  const compressorByKey = new Map<string, CompressorSeed>();
  [...compressorSeeds, ...parsedCompressorSeeds].forEach((seed) => {
    compressorByKey.set(`${seed.date}:${seed.compressorId}`, seed);
  });

  return {
    maintenanceSeeds: [...maintenanceSeeds, ...parsedMaintenanceSeeds],
    compressorSeeds: Array.from(compressorByKey.values()),
    parsedBlockCount: blocks.length,
    reportFileCount: reportFiles.length,
  };
}

function disciplineForSection(section: string): Discipline {
  if (section.toLowerCase().includes('instrument')) return Discipline.INSTRUMENTATION;
  if (section.toLowerCase().includes('elect')) return Discipline.ELECTRICAL;
  return Discipline.MECHANICAL;
}

function at(date: string, time = '09:00') {
  return new Date(`${date}T${time}:00.000Z`);
}

function durationHours(seed: MaintenanceSeed) {
  if (!seed.start || !seed.end) return seed.jobType === 'BD' ? 0 : 8;
  const start = at(seed.date, seed.start);
  const end = at(seed.date, seed.end);
  return Math.max((end.getTime() - start.getTime()) / 36e5, 0);
}

async function ensureInstallation(installationId: string, service: string, location = 'Ankleshwar') {
  return prisma.installation.upsert({
    where: { installationId },
    update: { type: service, location, isActive: true },
    create: { installationId, type: service, location, isActive: true },
  });
}

async function seedMaintenanceLogs(seeds: MaintenanceSeed[]) {
  for (const seed of seeds) {
    const installation = await ensureInstallation(seed.installationId, seed.service, seed.location);
    const primaryDiscipline = disciplineForSection(seed.section);

    await prisma.maintenanceLog.upsert({
      where: { id: seed.id },
      update: {
        date: toLogDate(seed.date),
        installationId: installation.id,
        primaryDiscipline,
        department: seed.service,
        section: seed.section,
        jobType: seed.jobType,
        reportCriticality: seed.criticality || 1,
        notificationNo: seed.notificationNo,
        description: seed.description,
        status: seed.status,
        startTime: at(seed.date, seed.start || '09:00'),
        endTime: at(seed.date, seed.end || '17:00'),
        durationHours: durationHours(seed),
        remarks: seed.remarks,
        createdBy: SEED_USER,
      },
      create: {
        id: seed.id,
        date: toLogDate(seed.date),
        installationId: installation.id,
        primaryDiscipline,
        department: seed.service,
        section: seed.section,
        jobType: seed.jobType,
        reportCriticality: seed.criticality || 1,
        notificationNo: seed.notificationNo,
        description: seed.description,
        status: seed.status,
        startTime: at(seed.date, seed.start || '09:00'),
        endTime: at(seed.date, seed.end || '17:00'),
        durationHours: durationHours(seed),
        remarks: seed.remarks,
        createdBy: SEED_USER,
      },
    });
  }
}

async function ensureCompressor(seed: CompressorSeed, installationId: string) {
  return prisma.runningEquipmentMaster.upsert({
    where: { equipmentTag: seed.compressorId },
    update: {
      category: 'RUNNING',
      description: seed.description,
      equipmentTypeName: 'Gas Compressor',
      serviceLine: 'Gas Compression',
      installationId,
      primaryDiscipline: Discipline.MECHANICAL,
    },
    create: {
      equipmentTag: seed.compressorId,
      category: 'RUNNING',
      description: seed.description,
      equipmentTypeName: 'Gas Compressor',
      serviceLine: 'Gas Compression',
      installationId,
      primaryDiscipline: Discipline.MECHANICAL,
    },
  });
}

async function seedCompressorLogs(seeds: CompressorSeed[]) {
  await ensureOperationalCatalog(prisma);

  for (const seed of seeds) {
    const installation = await ensureInstallation(seed.installationId || 'GGS-NG-GCP', seed.service || 'ST', 'Ankleshwar');
    const equipment = await ensureCompressor(seed, installation.id);
    const logDate = toLogDate(seed.date);
    const downtimeHours = seed.downtimeHours || 0;
    const standbyHours = seed.standbyHours || Math.max(24 - seed.runHours - downtimeHours, 0);
    const operatingState = seed.runHours > 0 ? 'RUNNING' : 'STOPPED';
    const availabilityStatus = seed.runHours > 0 ? 'AVAILABLE' : 'UNAVAILABLE';

    const operationalLog = await prisma.operationalLog.upsert({
      where: {
        logDate_shift_equipmentTag: {
          logDate,
          shift: 'GENERAL',
          equipmentTag: equipment.equipmentTag,
        },
      },
      update: {
        granularity: 'DAILY',
        sourceMode: 'HYBRID',
        sourceStatus: 'REVIEWED',
        assetClass: 'RUNNING_EQUIPMENT',
        profileCode: 'COMPRESSOR_STANDARD',
        installationId: installation.id,
        primaryDiscipline: Discipline.MECHANICAL,
        runtimeHours: seed.runHours,
        downtimeHours,
        standbyHours,
        cumulativeHours: seed.cumulativeHours,
        operatingState,
        availabilityStatus,
        enteredBy: SEED_USER,
        remarks: seed.remarks,
      },
      create: {
        logDate,
        shift: 'GENERAL',
        granularity: 'DAILY',
        sourceMode: 'HYBRID',
        sourceStatus: 'REVIEWED',
        assetClass: 'RUNNING_EQUIPMENT',
        profileCode: 'COMPRESSOR_STANDARD',
        installationId: installation.id,
        primaryDiscipline: Discipline.MECHANICAL,
        equipmentTag: equipment.equipmentTag,
        runtimeHours: seed.runHours,
        downtimeHours,
        standbyHours,
        cumulativeHours: seed.cumulativeHours,
        operatingState,
        availabilityStatus,
        enteredBy: SEED_USER,
        remarks: seed.remarks,
      },
    });

    await prisma.gasCompressionLog.upsert({
      where: {
        date_shift_compressorId: {
          date: logDate,
          shift: 'GENERAL',
          compressorId: equipment.equipmentTag,
        },
      },
      update: {
        sourceMode: 'HYBRID',
        installationId: installation.id,
        primaryDiscipline: Discipline.MECHANICAL,
        operationalLogId: operationalLog.id,
        inputGasVolume: seed.inputGasVolume,
        outputGasVolume: seed.outputGasVolume,
        fuelGasVolume: seed.fuelGasVolume,
        gasCompressed: seed.outputGasVolume || 0,
        runHours: seed.runHours,
        flowRate: seed.flowRate || 0,
        suctionPressure: seed.suctionPressure,
        dischargePressure: seed.dischargePressure,
        dischargeTemp: seed.dischargeTemp,
        tripCount: seed.tripCount || 0,
        shutdownReason: seed.shutdownReason,
        remarks: seed.remarks,
      },
      create: {
        date: logDate,
        shift: 'GENERAL',
        sourceMode: 'HYBRID',
        compressorId: equipment.equipmentTag,
        installationId: installation.id,
        primaryDiscipline: Discipline.MECHANICAL,
        operationalLogId: operationalLog.id,
        inputGasVolume: seed.inputGasVolume,
        outputGasVolume: seed.outputGasVolume,
        fuelGasVolume: seed.fuelGasVolume,
        gasCompressed: seed.outputGasVolume || 0,
        runHours: seed.runHours,
        flowRate: seed.flowRate || 0,
        suctionPressure: seed.suctionPressure,
        dischargePressure: seed.dischargePressure,
        dischargeTemp: seed.dischargeTemp,
        tripCount: seed.tripCount || 0,
        shutdownReason: seed.shutdownReason,
        remarks: seed.remarks,
      },
    });
  }
}

async function cleanupParsedDprData(currentCompressorSeeds: CompressorSeed[]) {
  await prisma.maintenanceLog.deleteMany({
    where: { id: { startsWith: 'dpr-full-' } },
  });

  const currentKeys = new Set(currentCompressorSeeds.map((seed) => `${seed.date}:${seed.compressorId}`));
  const dprCompressorLogs = await prisma.gasCompressionLog.findMany({
    where: {
      date: {
        gte: toLogDate('2026-04-01'),
        lte: toLogDate('2026-05-31'),
      },
      OR: [
        { compressorId: { startsWith: 'GGS-NG-GCP-' } },
        { compressorId: { startsWith: 'GCS-MOTWAN-' } },
      ],
      remarks: {
        contains: 'DPR',
      },
    },
    select: {
      id: true,
      date: true,
      compressorId: true,
      operationalLogId: true,
    },
  });
  const staleLogs = dprCompressorLogs.filter((log) => {
    const key = `${log.date.toISOString().slice(0, 10)}:${log.compressorId}`;
    return !currentKeys.has(key);
  });
  if (!staleLogs.length) return;

  await prisma.gasCompressionLog.deleteMany({
    where: { id: { in: staleLogs.map((log) => log.id) } },
  });
  const operationalLogIds = staleLogs.map((log) => log.operationalLogId).filter((id): id is string => Boolean(id));
  if (operationalLogIds.length) {
    await prisma.operationalLog.deleteMany({
      where: { id: { in: operationalLogIds } },
    });
  }
}

async function main() {
  const parsed = parseDprReports();
  await cleanupParsedDprData(parsed.compressorSeeds);
  await seedMaintenanceLogs(parsed.maintenanceSeeds);
  await seedCompressorLogs(parsed.compressorSeeds);
  console.log(`Loaded ${parsed.reportFileCount} DPR document(s) and parsed ${parsed.parsedBlockCount} original report block(s).`);
  console.log(`Seeded ${parsed.maintenanceSeeds.length} DPR maintenance entries.`);
  console.log(`Seeded ${parsed.compressorSeeds.length} compressor process log entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
