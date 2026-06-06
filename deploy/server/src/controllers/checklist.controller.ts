import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';

const prisma = new PrismaClient();

/**
 * Daily Checklist / DPR controller — template-driven, multi-discipline.
 *
 * Templates describe the structure (sections + items). Submissions store the
 * filled-in responses as JSON, so any checklist (Instrument DPR, Mechanical
 * DPR, etc.) is supported without code changes.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────
function currentUser(req: Request) {
  const u = (req as any).user;
  return { id: u?.id as string | undefined, username: u?.username as string | undefined, role: u?.role as string | undefined };
}

/**
 * Count items flagged as needing attention so history views can show a badge.
 * Walks the responses object looking for status values that aren't OK/NA.
 */
function countFlagged(responses: any): number {
  let count = 0;
  const ATTENTION = new Set(['ATTENTION', 'WARNING', 'CRITICAL', 'FAIL', 'NOT_OK', 'ABNORMAL']);
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.status === 'string' && ATTENTION.has(node.status.toUpperCase())) {
      count += 1;
    }
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (v && typeof v === 'object') walk(v);
    }
  };
  walk(responses);
  return count;
}

// ─── TEMPLATES ──────────────────────────────────────────────────────────────

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { discipline, active } = req.query;
    const where: Prisma.ChecklistTemplateWhereInput = {};
    if (discipline) where.discipline = discipline as any;
    if (active === 'true') where.isActive = true;

    const templates = await prisma.checklistTemplate.findMany({
      where,
      orderBy: [{ discipline: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { submissions: true } } },
    });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    res.status(500).json({ error: 'Failed to fetch checklist templates' });
  }
};

export const getTemplate = async (req: Request, res: Response) => {
  try {
    const template = await prisma.checklistTemplate.findUnique({
      where: { id: req.params.id },
    });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    console.error('Error fetching checklist template:', error);
    res.status(500).json({ error: 'Failed to fetch checklist template' });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { code, name, discipline, description, rigType, headerFields, sections, isActive } = req.body;
    if (!code || !name || !sections) {
      return res.status(400).json({ error: 'code, name, and sections are required' });
    }
    const { username } = currentUser(req);
    const template = await prisma.checklistTemplate.create({
      data: {
        code,
        name,
        discipline: discipline ?? 'INSTRUMENTATION',
        description: description ?? null,
        rigType: rigType ?? null,
        headerFields: headerFields ?? [],
        sections,
        isActive: isActive ?? true,
        createdBy: username ?? null,
      },
    });
    res.status(201).json(template);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'A template with this code already exists' });
    }
    console.error('Error creating checklist template:', error);
    res.status(500).json({ error: 'Failed to create checklist template' });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { name, description, rigType, headerFields, sections, isActive } = req.body;
    const template = await prisma.checklistTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(rigType !== undefined && { rigType }),
        ...(headerFields !== undefined && { headerFields }),
        ...(sections !== undefined && { sections }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(template);
  } catch (error) {
    console.error('Error updating checklist template:', error);
    res.status(500).json({ error: 'Failed to update checklist template' });
  }
};

// ─── SUBMISSIONS ────────────────────────────────────────────────────────────

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { templateId, status, from, to, limit } = req.query;
    const where: Prisma.ChecklistSubmissionWhereInput = {};
    if (templateId) where.templateId = templateId as string;
    if (status) where.status = status as string;
    if (from || to) {
      where.date = {};
      if (from) (where.date as any).gte = new Date(from as string);
      if (to) (where.date as any).lte = new Date(to as string);
    }

    const submissions = await prisma.checklistSubmission.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit ? Number(limit) : 100,
      include: { template: { select: { id: true, code: true, name: true, discipline: true } } },
    });
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching checklist submissions:', error);
    res.status(500).json({ error: 'Failed to fetch checklist submissions' });
  }
};

export const getSubmission = async (req: Request, res: Response) => {
  try {
    const submission = await prisma.checklistSubmission.findUnique({
      where: { id: req.params.id },
      include: { template: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json(submission);
  } catch (error) {
    console.error('Error fetching checklist submission:', error);
    res.status(500).json({ error: 'Failed to fetch checklist submission' });
  }
};

export const createSubmission = async (req: Request, res: Response) => {
  try {
    const { templateId, date, shift, header, responses, status, remarks, shiftInchargeSign, deptInchargeSign } = req.body;
    if (!templateId || !date) {
      return res.status(400).json({ error: 'templateId and date are required' });
    }
    const { username } = currentUser(req);
    const resolvedStatus = status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';

    const submission = await prisma.checklistSubmission.create({
      data: {
        templateId,
        date: new Date(date),
        shift: shift ?? null,
        header: header ?? {},
        responses: responses ?? {},
        status: resolvedStatus,
        flaggedCount: countFlagged(responses),
        remarks: remarks ?? null,
        shiftInchargeSign: shiftInchargeSign ?? null,
        deptInchargeSign: deptInchargeSign ?? null,
        submittedBy: username ?? null,
        submittedAt: resolvedStatus === 'SUBMITTED' ? new Date() : null,
      },
      include: { template: { select: { id: true, code: true, name: true } } },
    });
    res.status(201).json(submission);
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid templateId' });
    }
    console.error('Error creating checklist submission:', error);
    res.status(500).json({ error: 'Failed to create checklist submission' });
  }
};

export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { date, shift, header, responses, status, remarks, shiftInchargeSign, deptInchargeSign } = req.body;
    const { username } = currentUser(req);

    const existing = await prisma.checklistSubmission.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Submission not found' });

    const nextStatus = status ?? existing.status;
    const becameSubmitted = nextStatus === 'SUBMITTED' && existing.status !== 'SUBMITTED';

    const submission = await prisma.checklistSubmission.update({
      where: { id: req.params.id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(shift !== undefined && { shift }),
        ...(header !== undefined && { header }),
        ...(responses !== undefined && { responses, flaggedCount: countFlagged(responses) }),
        ...(status !== undefined && { status: nextStatus }),
        ...(remarks !== undefined && { remarks }),
        ...(shiftInchargeSign !== undefined && { shiftInchargeSign }),
        ...(deptInchargeSign !== undefined && { deptInchargeSign }),
        ...(becameSubmitted && { submittedAt: new Date(), submittedBy: username ?? existing.submittedBy }),
      },
      include: { template: { select: { id: true, code: true, name: true } } },
    });
    res.json(submission);
  } catch (error) {
    console.error('Error updating checklist submission:', error);
    res.status(500).json({ error: 'Failed to update checklist submission' });
  }
};

export const deleteSubmission = async (req: Request, res: Response) => {
  try {
    await prisma.checklistSubmission.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting checklist submission:', error);
    res.status(500).json({ error: 'Failed to delete checklist submission' });
  }
};

// ─── EXPORT (xlsx) ──────────────────────────────────────────────────────────
// Generic: renders any template's sections + the submission's responses into a
// formatted workbook that mirrors the field DPR layout.

const HEADER_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const SECTION_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const ATTENTION_FILL: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };

export const exportSubmission = async (req: Request, res: Response) => {
  try {
    const submission = await prisma.checklistSubmission.findUnique({
      where: { id: req.params.id },
      include: { template: true },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const template = submission.template;
    const sections = (template.sections as any[]) || [];
    const headerFields = (template.headerFields as any[]) || [];
    const header = (submission.header as Record<string, any>) || {};
    const responses = (submission.responses as Record<string, any>) || {};

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ONGC Maintenance Management';
    const ws = wb.addWorksheet('DPR', { properties: { defaultColWidth: 22 } });
    ws.columns = [{ width: 6 }, { width: 42 }, { width: 18 }, { width: 18 }, { width: 30 }];

    let r = 1;
    const titleRow = ws.getRow(r++);
    titleRow.getCell(1).value = template.name;
    ws.mergeCells(`A${titleRow.number}:E${titleRow.number}`);
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleRow.getCell(1).fill = HEADER_FILL;
    titleRow.height = 22;

    // Header block (well, rig, operation, section + date/shift/status)
    const meta: [string, string][] = [];
    headerFields.forEach((hf) => meta.push([hf.label, String(header[hf.key] ?? '')]));
    meta.push(['Date', submission.date ? new Date(submission.date).toLocaleDateString('en-IN') : '']);
    if (submission.shift) meta.push(['Shift', submission.shift]);
    meta.push(['Status', submission.status]);
    if (submission.submittedBy) meta.push(['Submitted By', submission.submittedBy]);
    r++;
    meta.forEach(([label, value]) => {
      const row = ws.getRow(r++);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true };
      row.getCell(2).value = value;
    });

    const sectionHeader = (title: string) => {
      r++;
      const row = ws.getRow(r++);
      row.getCell(1).value = title;
      ws.mergeCells(`A${row.number}:E${row.number}`);
      row.getCell(1).font = { bold: true, size: 12 };
      row.getCell(1).fill = SECTION_FILL;
    };
    const colHeader = (cells: string[]) => {
      const row = ws.getRow(r++);
      cells.forEach((c, i) => {
        row.getCell(i + 1).value = c;
        row.getCell(i + 1).font = { bold: true };
      });
    };
    const flagAttention = (row: ExcelJS.Row, status?: string) => {
      if (status && ['ATTENTION', 'WARNING', 'CRITICAL', 'FAIL'].includes(String(status).toUpperCase())) {
        for (let c = 1; c <= 5; c++) row.getCell(c).fill = ATTENTION_FILL;
      }
    };

    for (const section of sections) {
      sectionHeader(section.title || section.key);
      const sresp = responses[section.key] || {};

      if (section.type === 'PARAMETERS') {
        colHeader(['#', 'Parameter', 'Value', 'Unit', '']);
        (section.items || []).forEach((it: any, idx: number) => {
          const row = ws.getRow(r++);
          row.getCell(1).value = idx + 1;
          row.getCell(2).value = it.label;
          const v = sresp[it.key];
          if (it.cols) {
            row.getCell(3).value = it.cols.map((c: any) => `${c.label}: ${v?.[c.key] ?? ''}`).join('   ');
          } else {
            row.getCell(3).value = v?.value ?? '';
          }
          row.getCell(4).value = it.unit ?? '';
        });
      } else if (section.type === 'STATUS_LIST') {
        colHeader(['#', 'Name', 'Status', 'Value', '']);
        (section.items || []).forEach((it: any, idx: number) => {
          const row = ws.getRow(r++);
          row.getCell(1).value = idx + 1;
          row.getCell(2).value = it.label;
          row.getCell(3).value = sresp[it.key]?.status ?? '';
          row.getCell(4).value = sresp[it.key]?.value ?? '';
          flagAttention(row, sresp[it.key]?.status);
        });
      } else if (section.type === 'INSPECTION_GROUP') {
        colHeader(['', 'Check', 'Status', 'Remark', '']);
        (section.groups || []).forEach((g: any) => {
          const grow = ws.getRow(r++);
          grow.getCell(2).value = g.title;
          grow.getCell(2).font = { bold: true, italic: true };
          (g.items || []).forEach((it: any) => {
            const row = ws.getRow(r++);
            row.getCell(2).value = `   ${it.label}`;
            row.getCell(3).value = sresp[it.key]?.status ?? '';
            row.getCell(4).value = sresp[it.key]?.remark ?? '';
            flagAttention(row, sresp[it.key]?.status);
          });
        });
      } else if (section.type === 'WORK_LOG') {
        colHeader(['', 'Shift', 'Crew', 'Job Details', '']);
        (section.shifts || []).forEach((sh: any) => {
          const row = ws.getRow(r++);
          row.getCell(2).value = sh.label;
          row.getCell(2).font = { bold: true };
          row.getCell(3).value = sresp[sh.key]?.crew ?? '';
          row.getCell(4).value = sresp[sh.key]?.jobs ?? '';
          row.getCell(4).alignment = { wrapText: true };
        });
      } else if (section.type === 'SIGNOFF') {
        (section.items || []).forEach((it: any) => {
          const row = ws.getRow(r++);
          row.getCell(2).value = it.label;
          row.getCell(2).font = { bold: true };
          row.getCell(3).value = sresp[it.key] ?? '';
        });
      }
    }

    if (submission.remarks) {
      sectionHeader('Remarks');
      ws.getRow(r++).getCell(2).value = submission.remarks;
    }

    const safe = (header.rigName || template.code || 'DPR').toString().replace(/[^a-z0-9]+/gi, '_');
    const dateStr = submission.date ? new Date(submission.date).toISOString().slice(0, 10) : 'undated';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${safe}_${dateStr}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting checklist submission:', error);
    res.status(500).json({ error: 'Failed to export checklist submission' });
  }
};
